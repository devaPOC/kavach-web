import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionManager, CookieManager, type SessionData } from '../unified-session-manager';
import { NextRequest, NextResponse } from 'next/server';

// Mock dependencies
vi.mock('../jwt-utils', () => ({
  generateToken: vi.fn(),
  generateRefreshToken: vi.fn(),
  verifyToken: vi.fn()
}));

vi.mock('../../database/repositories/session-repository', () => ({
  sessionRepository: {
    create: vi.fn(),
    deleteByToken: vi.fn(),
    deleteByUserId: vi.fn()
  }
}));

vi.mock('../revocation-store', () => ({
  revokeJti: vi.fn()
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  let mockSessionData: SessionData;

  beforeEach(() => {
    sessionManager = SessionManager.getInstance();
    mockSessionData = {
      userId: 'user-123',
      email: 'test@example.com',
      role: 'customer',
      isEmailVerified: true,
      isProfileCompleted: false,
      isApproved: false
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = SessionManager.getInstance();
      const instance2 = SessionManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('createSession', () => {
    it('should create session with access and refresh tokens', async () => {
      const { generateToken, generateRefreshToken, verifyToken } = await import('../jwt-utils');
      const { sessionRepository } = await import('../../database/repositories/session-repository');

      const mockAccessToken = 'access-token-123';
      const mockRefreshToken = 'refresh-token-123';
      const mockRefreshPayload = {
        userId: 'user-123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        jti: 'jti-123'
      };

      (generateToken as any).mockResolvedValue(mockAccessToken);
      (generateRefreshToken as any).mockResolvedValue(mockRefreshToken);
      (verifyToken as any).mockResolvedValue(mockRefreshPayload);
      (sessionRepository.create as any).mockResolvedValue({ id: 'session-123' });

      const result = await sessionManager.createSession(mockSessionData);

      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        user: mockSessionData,
        expiresAt: expect.any(Date)
      });

      expect(generateToken).toHaveBeenCalledWith(mockSessionData);
      expect(generateRefreshToken).toHaveBeenCalledWith(mockSessionData);
      expect(sessionRepository.create).toHaveBeenCalledWith({
        userId: mockSessionData.userId,
        token: mockRefreshToken,
        tokenType: 'refresh',
        jti: mockRefreshPayload.jti,
        expiresAt: expect.any(Date)
      });
    });

    it('should handle session persistence failure gracefully', async () => {
      const { generateToken, generateRefreshToken, verifyToken } = await import('../jwt-utils');
      const { sessionRepository } = await import('../../database/repositories/session-repository');

      const mockAccessToken = 'access-token-123';
      const mockRefreshToken = 'refresh-token-123';

      (generateToken as any).mockResolvedValue(mockAccessToken);
      (generateRefreshToken as any).mockResolvedValue(mockRefreshToken);
      (verifyToken as any).mockRejectedValue(new Error('Token verification failed'));
      (sessionRepository.create as any).mockRejectedValue(new Error('Database error'));

      const result = await sessionManager.createSession(mockSessionData);

      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        user: mockSessionData,
        expiresAt: expect.any(Date)
      });
    });

    it('should throw error when token generation fails', async () => {
      const { generateToken } = await import('../jwt-utils');
      
      (generateToken as any).mockRejectedValue(new Error('Token generation failed'));

      await expect(sessionManager.createSession(mockSessionData)).rejects.toThrow('Session creation failed');
    });
  });

  describe('validateSession', () => {
    it('should validate valid access token', async () => {
      const { verifyToken } = await import('../jwt-utils');
      
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer',
        isEmailVerified: true,
        isProfileCompleted: false,
        isApproved: false,
        tokenType: 'access',
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      (verifyToken as any).mockResolvedValue(mockPayload);

      const result = await sessionManager.validateSession('valid-token');

      expect(result).toEqual({
        isValid: true,
        session: {
          userId: mockPayload.userId,
          email: mockPayload.email,
          role: mockPayload.role,
          isEmailVerified: mockPayload.isEmailVerified,
          isProfileCompleted: mockPayload.isProfileCompleted,
          isApproved: mockPayload.isApproved
        },
        needsRefresh: expect.any(Boolean)
      });
    });

    it('should reject invalid token', async () => {
      const { verifyToken } = await import('../jwt-utils');
      
      (verifyToken as any).mockResolvedValue(null);

      const result = await sessionManager.validateSession('invalid-token');

      expect(result).toEqual({
        isValid: false,
        session: null,
        needsRefresh: false,
        error: 'Invalid token'
      });
    });

    it('should reject refresh token type', async () => {
      const { verifyToken } = await import('../jwt-utils');
      
      const mockPayload = {
        userId: 'user-123',
        tokenType: 'refresh'
      };

      (verifyToken as any).mockResolvedValue(mockPayload);

      const result = await sessionManager.validateSession('refresh-token');

      expect(result).toEqual({
        isValid: false,
        session: null,
        needsRefresh: false,
        error: 'Invalid token type'
      });
    });

    it('should handle token verification error', async () => {
      const { verifyToken } = await import('../jwt-utils');
      
      (verifyToken as any).mockRejectedValue(new Error('Verification failed'));

      const result = await sessionManager.validateSession('error-token');

      expect(result).toEqual({
        isValid: false,
        session: null,
        needsRefresh: false,
        error: 'Token verification failed'
      });
    });
  });

  describe('refreshSession', () => {
    it('should refresh session with valid refresh token', async () => {
      const { verifyToken, generateToken, generateRefreshToken } = await import('../jwt-utils');
      const { sessionRepository } = await import('../../database/repositories/session-repository');
      const { revokeJti } = await import('../revocation-store');

      const mockRefreshPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer',
        isEmailVerified: true,
        isProfileCompleted: false,
        isApproved: false,
        tokenType: 'refresh',
        jti: 'old-jti-123'
      };

      const mockNewAccessToken = 'new-access-token';
      const mockNewRefreshToken = 'new-refresh-token';
      const mockNewRefreshPayload = {
        userId: 'user-123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        jti: 'new-jti-123'
      };

      (verifyToken as any)
        .mockResolvedValueOnce(mockRefreshPayload) // First call for refresh token validation
        .mockResolvedValueOnce(mockNewRefreshPayload); // Second call for new refresh token
      (generateToken as any).mockResolvedValue(mockNewAccessToken);
      (generateRefreshToken as any).mockResolvedValue(mockNewRefreshToken);
      (sessionRepository.deleteByToken as any).mockResolvedValue(undefined);
      (sessionRepository.create as any).mockResolvedValue({ id: 'new-session-123' });

      const result = await sessionManager.refreshSession('old-refresh-token');

      expect(result).toEqual({
        accessToken: mockNewAccessToken,
        refreshToken: mockNewRefreshToken,
        user: {
          userId: mockRefreshPayload.userId,
          email: mockRefreshPayload.email,
          role: mockRefreshPayload.role,
          isEmailVerified: mockRefreshPayload.isEmailVerified,
          isProfileCompleted: mockRefreshPayload.isProfileCompleted,
          isApproved: mockRefreshPayload.isApproved
        },
        expiresAt: expect.any(Date)
      });

      expect(revokeJti).toHaveBeenCalledWith(mockRefreshPayload.jti);
      expect(sessionRepository.deleteByToken).toHaveBeenCalledWith('old-refresh-token');
    });

    it('should return null for invalid refresh token', async () => {
      const { verifyToken } = await import('../jwt-utils');
      
      (verifyToken as any).mockResolvedValue(null);

      const result = await sessionManager.refreshSession('invalid-refresh-token');

      expect(result).toBeNull();
    });

    it('should return null for access token type', async () => {
      const { verifyToken } = await import('../jwt-utils');
      
      const mockPayload = {
        userId: 'user-123',
        tokenType: 'access'
      };

      (verifyToken as any).mockResolvedValue(mockPayload);

      const result = await sessionManager.refreshSession('access-token');

      expect(result).toBeNull();
    });

    it('should handle refresh token revocation failure gracefully', async () => {
      const { verifyToken, generateToken, generateRefreshToken } = await import('../jwt-utils');
      const { sessionRepository } = await import('../../database/repositories/session-repository');
      const { revokeJti } = await import('../revocation-store');

      const mockRefreshPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer',
        isEmailVerified: true,
        tokenType: 'refresh',
        jti: 'old-jti-123'
      };

      (verifyToken as any).mockResolvedValue(mockRefreshPayload);
      (generateToken as any).mockResolvedValue('new-access-token');
      (generateRefreshToken as any).mockResolvedValue('new-refresh-token');
      (revokeJti as any).mockImplementation(() => { throw new Error('Revocation failed'); });
      (sessionRepository.deleteByToken as any).mockRejectedValue(new Error('Database error'));

      const result = await sessionManager.refreshSession('old-refresh-token');

      expect(result).toBeDefined();
      expect(result?.accessToken).toBe('new-access-token');
    });
  });

  describe('invalidateSession', () => {
    it('should invalidate session successfully', async () => {
      const { sessionRepository } = await import('../../database/repositories/session-repository');
      
      (sessionRepository.deleteByUserId as any).mockResolvedValue(undefined);

      await expect(sessionManager.invalidateSession('user-123')).resolves.not.toThrow();

      expect(sessionRepository.deleteByUserId).toHaveBeenCalledWith('user-123');
    });

    it('should throw error when invalidation fails', async () => {
      const { sessionRepository } = await import('../../database/repositories/session-repository');
      
      (sessionRepository.deleteByUserId as any).mockRejectedValue(new Error('Database error'));

      await expect(sessionManager.invalidateSession('user-123')).rejects.toThrow('Session invalidation failed');
    });
  });
});

describe('CookieManager', () => {
  let cookieManager: CookieManager;
  let mockResponse: NextResponse;
  let mockRequest: NextRequest;

  beforeEach(() => {
    cookieManager = CookieManager.getInstance();
    
    mockResponse = {
      cookies: {
        set: vi.fn(),
        delete: vi.fn()
      }
    } as any;

    mockRequest = {
      cookies: {
        get: vi.fn()
      }
    } as any;

    vi.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = CookieManager.getInstance();
      const instance2 = CookieManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('setAuthCookies', () => {
    it('should set session and refresh cookies', () => {
      const mockSessionData = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer' as const,
        isEmailVerified: true,
        isProfileCompleted: false,
        isApproved: false
      };

      const mockSession = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        user: mockSessionData,
        expiresAt: new Date()
      };

      cookieManager.setAuthCookies(mockResponse, mockSession);

      expect(mockResponse.cookies.set).toHaveBeenCalledTimes(2);
      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        'auth-session',
        mockSession.accessToken,
        expect.objectContaining({
          httpOnly: true,
          secure: false, // In test environment
          sameSite: 'strict',
          path: '/'
        })
      );
      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        'auth-refresh',
        mockSession.refreshToken,
        expect.objectContaining({
          httpOnly: true,
          secure: false, // In test environment
          sameSite: 'strict',
          path: '/'
        })
      );
    });
  });

  describe('clearAuthCookies', () => {
    it('should clear session and refresh cookies', () => {
      cookieManager.clearAuthCookies(mockResponse);

      expect(mockResponse.cookies.set).toHaveBeenCalledTimes(2);
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
  });

  describe('getSessionFromCookies', () => {
    it('should return session data from valid cookie', async () => {
      const mockSessionCookie = { value: 'valid-session-token' };
      const mockSessionData = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer' as const,
        isEmailVerified: true,
        isProfileCompleted: false,
        isApproved: false
      };

      (mockRequest.cookies.get as any).mockReturnValue(mockSessionCookie);

      // Mock SessionManager validation
      const mockSessionManager = {
        validateSession: vi.fn().mockResolvedValue({
          isValid: true,
          session: mockSessionData
        })
      };

      // Replace the singleton instance temporarily
      const originalGetInstance = SessionManager.getInstance;
      SessionManager.getInstance = vi.fn().mockReturnValue(mockSessionManager);

      const result = await cookieManager.getSessionFromCookies(mockRequest);

      expect(result).toEqual(mockSessionData);
      expect(mockRequest.cookies.get).toHaveBeenCalledWith('auth-session');
      expect(mockSessionManager.validateSession).toHaveBeenCalledWith('valid-session-token');

      // Restore original method
      SessionManager.getInstance = originalGetInstance;
    });

    it('should return null when no session cookie', async () => {
      (mockRequest.cookies.get as any).mockReturnValue(undefined);

      const result = await cookieManager.getSessionFromCookies(mockRequest);

      expect(result).toBeNull();
    });

    it('should return null when session validation fails', async () => {
      const mockSessionCookie = { value: 'invalid-session-token' };

      (mockRequest.cookies.get as any).mockReturnValue(mockSessionCookie);

      // Mock SessionManager validation failure
      const mockSessionManager = {
        validateSession: vi.fn().mockResolvedValue({
          isValid: false,
          session: null
        })
      };

      // Replace the singleton instance temporarily
      const originalGetInstance = SessionManager.getInstance;
      SessionManager.getInstance = vi.fn().mockReturnValue(mockSessionManager);

      const result = await cookieManager.getSessionFromCookies(mockRequest);

      expect(result).toBeNull();

      // Restore original method
      SessionManager.getInstance = originalGetInstance;
    });
  });

  describe('getRefreshTokenFromCookies', () => {
    it('should return refresh token from cookie', () => {
      const mockRefreshCookie = { value: 'refresh-token-123' };

      (mockRequest.cookies.get as any).mockReturnValue(mockRefreshCookie);

      const result = cookieManager.getRefreshTokenFromCookies(mockRequest);

      expect(result).toBe('refresh-token-123');
      expect(mockRequest.cookies.get).toHaveBeenCalledWith('auth-refresh');
    });

    it('should return null when no refresh cookie', () => {
      (mockRequest.cookies.get as any).mockReturnValue(undefined);

      const result = cookieManager.getRefreshTokenFromCookies(mockRequest);

      expect(result).toBeNull();
    });
  });

  describe('handleSessionRenewal', () => {
    it('should renew session when needed', async () => {
      const mockSessionCookie = { value: 'session-token-needs-renewal' };
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

      (mockRequest.cookies.get as any).mockReturnValue(mockSessionCookie);

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

    it('should clear cookies for invalid session', async () => {
      const mockSessionCookie = { value: 'invalid-session-token' };

      (mockRequest.cookies.get as any).mockReturnValue(mockSessionCookie);

      // Mock SessionManager validation failure
      const mockSessionManager = {
        validateSession: vi.fn().mockResolvedValue({
          isValid: false,
          session: null
        })
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

    it('should handle renewal errors gracefully', async () => {
      const mockSessionCookie = { value: 'session-token' };

      (mockRequest.cookies.get as any).mockReturnValue(mockSessionCookie);

      // Mock SessionManager to throw error
      const mockSessionManager = {
        validateSession: vi.fn().mockRejectedValue(new Error('Validation error'))
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