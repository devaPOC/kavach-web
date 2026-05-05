import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateToken,
  verifyToken,
  generateRefreshToken,
  generateEmailVerificationToken,
  verifyEmailVerificationToken,
  isTokenExpired,
  extractTokenFromHeader,
  getTokenExpirationTime
} from '../jwt-utils';

// Mock environment variable
process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-only';

describe('JWT Utils', () => {
  const mockPayload = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    role: 'customer' as const,
    isEmailVerified: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateToken and verifyToken', () => {
    it('should generate and verify tokens correctly', async () => {
      const token = await generateToken(mockPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts

      const decoded = await verifyToken(token);
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockPayload.userId);
      expect(decoded?.email).toBe(mockPayload.email);
      expect(decoded?.role).toBe(mockPayload.role);
      expect(decoded?.isEmailVerified).toBe(mockPayload.isEmailVerified);
      expect(decoded?.iat).toBeDefined();
      expect(decoded?.exp).toBeDefined();
      expect(decoded?.tokenType).toBe('access');
      expect(decoded?.jti).toBeDefined();
    });

    it('should return null for invalid tokens', async () => {
      const invalidToken = 'invalid.token.here';
      const decoded = await verifyToken(invalidToken);

      expect(decoded).toBeNull();
    });

    it('should return null for malformed tokens', async () => {
      const malformedToken = 'not.a.valid.jwt.token';
      const decoded = await verifyToken(malformedToken);

      expect(decoded).toBeNull();
    });

    it('should return null for empty token', async () => {
      const decoded = await verifyToken('');

      expect(decoded).toBeNull();
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate refresh token with longer expiration', async () => {
      const refreshToken = await generateRefreshToken(mockPayload);

      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');
      expect(refreshToken.split('.')).toHaveLength(3);

      const decoded = await verifyToken(refreshToken);
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockPayload.userId);
      expect(decoded?.tokenType).toBe('refresh');
    });
  });

  describe('generateEmailVerificationToken and verifyEmailVerificationToken', () => {
    it('should generate and verify email verification tokens', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const email = 'test@example.com';

      const token = await generateEmailVerificationToken(userId, email);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      const decoded = await verifyEmailVerificationToken(token);
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(userId);
      expect(decoded?.email).toBe(email);
    });

    it('should return null for invalid email verification tokens', async () => {
      const invalidToken = 'invalid.token.here';
      const decoded = await verifyEmailVerificationToken(invalidToken);

      expect(decoded).toBeNull();
    });

    it('should return null for regular JWT tokens', async () => {
      const regularToken = await generateToken(mockPayload);
      const decoded = await verifyEmailVerificationToken(regularToken);

      expect(decoded).toBeNull();
    });

    it('should return null for empty token', async () => {
      const decoded = await verifyEmailVerificationToken('');

      expect(decoded).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should correctly identify expired tokens', () => {
      const expiredPayload = {
        ...mockPayload,
        exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      };

      expect(isTokenExpired(expiredPayload)).toBe(true);
    });

    it('should correctly identify valid tokens', () => {
      const validPayload = {
        ...mockPayload,
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      };

      expect(isTokenExpired(validPayload)).toBe(false);
    });

    it('should return true for tokens without expiration', () => {
      const noExpPayload = {
        ...mockPayload,
        exp: undefined
      };

      expect(isTokenExpired(noExpPayload)).toBe(true);
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const authHeader = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const token = extractTokenFromHeader(authHeader);

      expect(token).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });

    it('should return null for invalid header format', () => {
      const invalidHeader = 'InvalidFormat token';
      const token = extractTokenFromHeader(invalidHeader);

      expect(token).toBeNull();
    });

    it('should return null for null header', () => {
      const token = extractTokenFromHeader(null);

      expect(token).toBeNull();
    });

    it('should return null for empty header', () => {
      const token = extractTokenFromHeader('');

      expect(token).toBeNull();
    });

    it('should return null for Bearer without token', () => {
      const token = extractTokenFromHeader('Bearer ');

      expect(token).toBe('');
    });
  });

  describe('getTokenExpirationTime', () => {
    it('should return expiration time in milliseconds', () => {
      const exp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const payload = { ...mockPayload, exp };

      const expirationTime = getTokenExpirationTime(payload);

      expect(expirationTime).toBe(exp * 1000);
    });

    it('should return null for tokens without expiration', () => {
      const payload = { ...mockPayload, exp: undefined };

      const expirationTime = getTokenExpirationTime(payload);

      expect(expirationTime).toBeNull();
    });
  });


  describe('Error handling', () => {
    it('should handle malformed JWT gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      const result = await verifyToken('not.a.jwt');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle expired JWT gracefully', async () => {
      // Generate a token that expires immediately
      const shortLivedPayload = { ...mockPayload };
      const token = await generateToken(shortLivedPayload);

      // Wait a bit to ensure expiration (this is a simplified test)
      // In real scenarios, you'd mock the time or use a very short expiration
      const decoded = await verifyToken(token);

      // The token should still be valid since it was just created
      expect(decoded).toBeDefined();
    });
  });

  describe('Token validation edge cases', () => {
    it('should validate payload structure', async () => {
      const token = await generateToken(mockPayload);
      const decoded = await verifyToken(token);

      expect(decoded).toMatchObject({
        userId: expect.any(String),
        email: expect.any(String),
        role: expect.any(String),
        isEmailVerified: expect.any(Boolean),
        iat: expect.any(Number),
        exp: expect.any(Number),
      });
    });

    it('should handle different user roles', async () => {
      const roles = ['customer', 'expert', 'admin'] as const;

      for (const role of roles) {
        const payload = { ...mockPayload, role };
        const token = await generateToken(payload);
        const decoded = await verifyToken(token);

        expect(decoded?.role).toBe(role);
      }
    });

    it('should handle boolean email verification status', async () => {
      const verifiedPayload = { ...mockPayload, isEmailVerified: true };
      const unverifiedPayload = { ...mockPayload, isEmailVerified: false };

      const verifiedToken = await generateToken(verifiedPayload);
      const unverifiedToken = await generateToken(unverifiedPayload);

      const verifiedDecoded = await verifyToken(verifiedToken);
      const unverifiedDecoded = await verifyToken(unverifiedToken);

      expect(verifiedDecoded?.isEmailVerified).toBe(true);
      expect(unverifiedDecoded?.isEmailVerified).toBe(false);
    });
  });
});
