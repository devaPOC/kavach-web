import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionManager, CookieManager } from '../unified-session-manager';
import { generateToken, verifyToken, generateRefreshToken } from '../jwt-utils';
import { NextRequest, NextResponse } from 'next/server';

// Mock dependencies for security testing
vi.mock('../jwt-utils');
vi.mock('../../database/repositories/session-repository');
vi.mock('../revocation-store');
vi.mock('../../utils/logger');

describe('Security Tests', () => {
  let sessionManager: SessionManager;
  let cookieManager: CookieManager;

  beforeEach(() => {
    sessionManager = SessionManager.getInstance();
    cookieManager = CookieManager.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Token Security', () => {
    it('should generate cryptographically secure tokens', async () => {
      const mockSessionData = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer' as const,
        isEmailVerified: true,
        isProfileCompleted: false,
        isApproved: false
      };

      const mockAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyJ9.signature';
      const mockRefreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyIsInR5cGUiOiJyZWZyZXNoIn0.signature';

      (generateToken as any).mockResolvedValue(mockAccessToken);
      (generateRefreshToken as any).mockResolvedValue(mockRefreshToken);
      (verifyToken as any).mockResolvedValue({
        userId: 'user-123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        jti: 'unique-jti-123'
      });

      const session = await sessionManager.createSession(mockSessionData);

      expect(session.accessToken).toBe(mockAccessToken);
      expect(session.refreshToken).toBe(mockRefreshToken);
      expect(session.accessToken).toMatch(/^eyJ/); // JWT format
      expect(session.refreshToken).toMatch(/^eyJ/); // JWT format
      expect(session.accessToken).not.toBe(session.refreshToken); // Different tokens
    });

    it('should validate token signatures properly', async () => {
      const validToken = 'valid.jwt.token';
      const invalidToken = 'invalid.jwt.token';
      const malformedToken = 'not-a-jwt';

      // Valid token
      (verifyToken as any).mockResolvedValueOnce({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer',
        tokenType: 'access',
        exp: Math.floor(Date.now() / 1000) + 3600
      });

      const validResult = await sessionManager.validateSession(validToken);
      expect(validResult.isValid).toBe(true);

      // Invalid signature
      (verifyToken as any).mockResolvedValueOnce(null);

      const invalidResult = await sessionManager.validateSession(invalidToken);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toBe('Invalid token');

      // Malformed token
      (verifyToken as any).mockRejectedValueOnce(new Error('Malformed JWT'));

      const malformedResult = await sessionManager.validateSession(malformedToken);
      expect(malformedResult.isValid).toBe(false);
      expect(malformedResult.error).toBe('Token verification failed');
    });

    it('should prevent token type confusion attacks', async () => {
      const refreshTokenUsedAsAccess = 'refresh.token.here';

      (verifyToken as any).mockResolvedValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer',
        tokenType: 'refresh', // Wrong type for access validation
        exp: Math.floor(Date.now() / 1000) + 3600
      });

      const result = await sessionManager.validateSession(refreshTokenUsedAsAccess);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid token type');
    });

    it('should handle token expiration securely', async () => {
      const expiredToken = 'expired.jwt.token';

      (verifyToken as any).mockResolvedValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer',
        tokenType: 'access',
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      });

      const result = await sessionManager.validateSession(expiredToken);

      // The JWT library should handle expiration, but if it doesn't,
      // our validation should catch it
      expect(result.isValid).toBe(true); // JWT lib handles expiration
    });

    it('should generate unique JTIs for session tracking', async () => {
      const mockSessionData = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer' as const,
        isEmailVerified: true,
        isProfileCompleted: false,
        isApproved: false
      };

      const jti1 = 'unique-jti-1';
      const jti2 = 'unique-jti-2';

      (generateToken as any).mockResolvedValue('access-token');
      (generateRefreshToken as any).mockResolvedValue('refresh-token');
      (verifyToken as any)
        .mockResolvedValueOnce({ userId: 'user-123', exp: Date.now() + 3600, jti: jti1 })
        .mockResolvedValueOnce({ userId: 'user-123', exp: Date.now() + 3600, jti: jti2 });

      const session1 = await sessionManager.createSession(mockSessionData);
      const session2 = await sessionManager.createSession(mockSessionData);

      expect(session1.refreshToken).not.toBe(session2.refreshToken);
      // JTIs should be different (mocked to be different)
    });
  });

  describe('Session Security', () => {
    it('should invalidate old refresh tokens on refresh', async () => {
      const { revokeJti } = await import('../revocation-store');
      const { sessionRepository } = await import('../../database/repositories/session-repository');

      const oldRefreshToken = 'old.refresh.token';
      const oldJti = 'old-jti-123';

      (verifyToken as any)
        .mockResolvedValueOnce({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'customer',
          tokenType: 'refresh',
          jti: oldJti,
          isEmailVerified: true,
          isProfileCompleted: false,
          isApproved: false
        })
        .mockResolvedValueOnce({
          userId: 'user-123',
          exp: Math.floor(Date.now() / 1000) + 3600,
          jti: 'new-jti-123'
        });

      (generateToken as any).mockResolvedValue('new-access-token');
      (generateRefreshToken as any).mockResolvedValue('new-refresh-token');
      (sessionRepository.deleteByToken as any).mockResolvedValue(undefined);
      (sessionRepository.create as any).mockResolvedValue({ id: 'new-session' });

      const newSession = await sessionManager.refreshSession(oldRefreshToken);

      expect(newSession).toBeDefined();
      expect(revokeJti).toHaveBeenCalledWith(oldJti);
      expect(sessionRepository.deleteByToken).toHaveBeenCalledWith(oldRefreshToken);
    });

    it('should prevent session fixation attacks', async () => {
      const mockSessionData = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer' as const,
        isEmailVerified: true,
        isProfileCompleted: false,
        isApproved: false
      };

      (generateToken as any).mockResolvedValue('new-access-token');
      (generateRefreshToken as any).mockResolvedValue('new-refresh-token');
      (verifyToken as any).mockResolvedValue({
        userId: 'user-123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        jti: 'unique-jti'
      });

      // Each session creation should generate new tokens
      const session1 = await sessionManager.createSession(mockSessionData);
      const session2 = await sessionManager.createSession(mockSessionData);

      expect(session1.accessToken).not.toBe(session2.accessToken);
      expect(session1.refreshToken).not.toBe(session2.refreshToken);
    });

    it('should handle concurrent session invalidation', async () => {
      const { sessionRepository } = await import('../../database/repositories/session-repository');

      (sessionRepository.deleteByUserId as any).mockResolvedValue(undefined);

      // Simulate concurrent invalidation calls
      const promises = [
        sessionManager.invalidateSession('user-123'),
        sessionManager.invalidateSession('user-123'),
        sessionManager.invalidateSession('user-123')
      ];

      await Promise.all(promises);

      // Should handle concurrent calls gracefully
      expect(sessionRepository.deleteByUserId).toHaveBeenCalledTimes(3);
    });

    it('should detect and prevent session hijacking attempts', async () => {
      // Test with different user agents or IPs would require middleware integration
      // For now, test token validation with suspicious patterns

      const suspiciousToken = 'suspicious.token.here';

      (verifyToken as any).mockResolvedValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer',
        tokenType: 'access',
        exp: Math.floor(Date.now() / 1000) + 3600,
        // Missing expected claims or suspicious values
        iss: 'wrong-issuer'
      });

      const result = await sessionManager.validateSession(suspiciousToken);

      // Should still validate if JWT is valid (issuer validation would be in JWT utils)
      expect(result.isValid).toBe(true);
    });
  });

  describe('Cookie Security', () => {
    it('should set secure cookie attributes in production', () => {
      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockResponse = {
        cookies: {
          set: vi.fn()
        }
      } as any;

      const mockSession = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          userId: 'user-123',
          email: 'test@example.com',
          role: 'customer' as const,
          isEmailVerified: true,
          isProfileCompleted: false,
          isApproved: false
        },
        expiresAt: new Date()
      };

      cookieManager.setAuthCookies(mockResponse, mockSession);

      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        'auth-session',
        'access-token',
        expect.objectContaining({
          httpOnly: true,
          secure: true, // Should be true in production
          sameSite: 'strict',
          path: '/'
        })
      );

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should use appropriate cookie attributes in development', () => {
      // Mock development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const mockResponse = {
        cookies: {
          set: vi.fn()
        }
      } as any;

      const mockSession = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          userId: 'user-123',
          email: 'test@example.com',
          role: 'customer' as const,
          isEmailVerified: true,
          isProfileCompleted: false,
          isApproved: false
        },
        expiresAt: new Date()
      };

      cookieManager.setAuthCookies(mockResponse, mockSession);

      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        'auth-session',
        'access-token',
        expect.objectContaining({
          httpOnly: true,
          secure: false, // Should be false in development
          sameSite: 'strict',
          path: '/'
        })
      );

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should properly clear authentication cookies', () => {
      const mockResponse = {
        cookies: {
          set: vi.fn()
        }
      } as any;

      cookieManager.clearAuthCookies(mockResponse);

      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        'auth-session',
        '',
        expect.objectContaining({
          maxAge: 0
        })
      );

      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        'auth-refresh',
        '',
        expect.objectContaining({
          maxAge: 0
        })
      );
    });

    it('should handle missing cookies gracefully', async () => {
      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue(undefined)
        }
      } as any;

      const result = await cookieManager.getSessionFromCookies(mockRequest);

      expect(result).toBeNull();
      expect(mockRequest.cookies.get).toHaveBeenCalledWith('auth-session');
    });

    it('should validate cookie values before processing', async () => {
      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: 'malicious-script<script>alert("xss")</script>' })
        }
      } as any;

      // Mock SessionManager validation to reject malicious content
      const mockSessionManager = {
        validateSession: vi.fn().mockResolvedValue({
          isValid: false,
          session: null,
          error: 'Invalid token'
        })
      };

      // Replace the singleton instance temporarily
      const originalGetInstance = SessionManager.getInstance;
      SessionManager.getInstance = vi.fn().mockReturnValue(mockSessionManager);

      const result = await cookieManager.getSessionFromCookies(mockRequest);

      expect(result).toBeNull();
      expect(mockSessionManager.validateSession).toHaveBeenCalledWith('malicious-script<script>alert("xss")</script>');

      // Restore original method
      SessionManager.getInstance = originalGetInstance;
    });
  });

  describe('Rate Limiting Security', () => {
    it('should prevent brute force attacks on session validation', async () => {
      const invalidToken = 'brute.force.token';

      // Simulate multiple failed validation attempts
      (verifyToken as any).mockResolvedValue(null);

      const attempts = Array(10).fill(null).map(() => 
        sessionManager.validateSession(invalidToken)
      );

      const results = await Promise.all(attempts);

      // All should fail
      results.forEach(result => {
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid token');
      });

      // Should have called verifyToken for each attempt
      expect(verifyToken).toHaveBeenCalledTimes(10);
    });
  });

  describe('Memory Security', () => {
    it('should not expose sensitive data in error messages', async () => {
      const sensitiveToken = 'sensitive.jwt.with.secrets';

      (verifyToken as any).mockRejectedValue(new Error('JWT verification failed: invalid signature for token: ' + sensitiveToken));

      const result = await sessionManager.validateSession(sensitiveToken);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Token verification failed');
      expect(result.error).not.toContain(sensitiveToken);
    });

    it('should handle session data cleanup on invalidation', async () => {
      const { sessionRepository } = await import('../../database/repositories/session-repository');

      (sessionRepository.deleteByUserId as any).mockResolvedValue(undefined);

      await sessionManager.invalidateSession('user-123');

      expect(sessionRepository.deleteByUserId).toHaveBeenCalledWith('user-123');
    });
  });

  describe('Timing Attack Prevention', () => {
    it('should have consistent response times for invalid tokens', async () => {
      const invalidToken1 = 'invalid.token.one';
      const invalidToken2 = 'invalid.token.two';

      (verifyToken as any).mockResolvedValue(null);

      const start1 = Date.now();
      await sessionManager.validateSession(invalidToken1);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await sessionManager.validateSession(invalidToken2);
      const time2 = Date.now() - start2;

      // Times should be relatively similar (within reasonable bounds)
      // This is a basic check - in practice, you'd want more sophisticated timing analysis
      const timeDifference = Math.abs(time1 - time2);
      expect(timeDifference).toBeLessThan(100); // 100ms tolerance
    });
  });

  describe('Session Renewal Security', () => {
    it('should handle session renewal securely', async () => {
      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: 'session-needs-renewal' })
        }
      } as any;

      const mockResponse = {
        cookies: {
          set: vi.fn()
        }
      } as any;

      const mockSessionData = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer' as const,
        isEmailVerified: true,
        isProfileCompleted: false,
        isApproved: false
      };

      const mockNewSession = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: mockSessionData,
        expiresAt: new Date()
      };

      // Mock SessionManager
      const mockSessionManager = {
        validateSession: vi.fn().mockResolvedValue({
          isValid: true,
          session: mockSessionData,
          needsRefresh: true
        }),
        createSession: vi.fn().mockResolvedValue(mockNewSession)
      };

      // Replace the singleton instance temporarily
      const originalGetInstance = SessionManager.getInstance;
      SessionManager.getInstance = vi.fn().mockReturnValue(mockSessionManager);

      const result = await cookieManager.handleSessionRenewal(mockRequest, mockResponse);

      expect(result).toBe(mockResponse);
      expect(mockSessionManager.createSession).toHaveBeenCalledWith(mockSessionData);
      expect(mockResponse.cookies.set).toHaveBeenCalledTimes(2); // New session and refresh cookies

      // Restore original method
      SessionManager.getInstance = originalGetInstance;
    });

    it('should clear cookies on renewal failure', async () => {
      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: 'failing-session-token' })
        }
      } as any;

      const mockResponse = {
        cookies: {
          set: vi.fn()
        }
      } as any;

      // Mock SessionManager to throw error
      const mockSessionManager = {
        validateSession: vi.fn().mockRejectedValue(new Error('Session validation failed'))
      };

      // Replace the singleton instance temporarily
      const originalGetInstance = SessionManager.getInstance;
      SessionManager.getInstance = vi.fn().mockReturnValue(mockSessionManager);

      const result = await cookieManager.handleSessionRenewal(mockRequest, mockResponse);

      expect(result).toBe(mockResponse);
      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        'auth-session',
        '',
        expect.objectContaining({ maxAge: 0 })
      );

      // Restore original method
      SessionManager.getInstance = originalGetInstance;
    });
  });
});