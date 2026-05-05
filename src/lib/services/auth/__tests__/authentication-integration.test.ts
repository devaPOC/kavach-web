import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthenticationService } from '../authentication.service';
import type { SignupData, LoginData } from '../types';

// Integration test setup - mock external dependencies but test real flow
vi.mock('../../database/repositories/user-repository');
vi.mock('../../database/repositories/email-verification-repository');
vi.mock('../../email/email-service');
vi.mock('../../auth/rate-limiter');
vi.mock('../../auth/anomaly-detector');
vi.mock('../../utils/audit-logger');

describe('Authentication Integration Tests', () => {
  let authService: AuthenticationService;
  let mockContext: any;

  beforeEach(() => {
    authService = new AuthenticationService();
    mockContext = {
      correlationId: 'integration-test-id',
      clientIP: '127.0.0.1',
      userAgent: 'test-agent',
      timestamp: new Date()
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Complete Signup Flow', () => {
    it('should handle complete signup to login flow', async () => {
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { emailVerificationRepository } = await import('../../database/repositories/email-verification-repository');
      const { emailService } = await import('../../email/email-service');
      const { checkRateLimit } = await import('../../auth/rate-limiter');
      const { hashPassword, verifyPassword } = await import('../../auth/password-utils');
      const { generateEmailVerificationToken, verifyEmailVerificationToken } = await import('../../auth/jwt-utils');
      const { sessionManager } = await import('../../auth/unified-session-manager');

      // Mock all dependencies for successful flow
      (checkRateLimit as any).mockReturnValue({ success: true });
      (hashPassword as any).mockResolvedValue('hashed-password-123');
      (verifyPassword as any).mockResolvedValue(true);
      (generateEmailVerificationToken as any).mockResolvedValue('verification-token-123');
      (verifyEmailVerificationToken as any).mockResolvedValue({
        userId: 'user-123',
        email: 'integration@example.com'
      });
      (emailService.sendVerificationEmail as any).mockResolvedValue(undefined);

      const mockUser = {
        id: 'user-123',
        email: 'integration@example.com',
        firstName: 'Integration',
        lastName: 'Test',
        role: 'customer',
        passwordHash: 'hashed-password-123',
        isEmailVerified: false,
        isProfileCompleted: false,
        isApproved: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockVerifiedUser = {
        ...mockUser,
        isEmailVerified: true
      };

      const mockSession = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        user: {
          userId: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          isEmailVerified: true,
          isProfileCompleted: false,
          isApproved: false
        },
        expiresAt: new Date()
      };

      const mockVerification = {
        id: 'verification-123',
        userId: mockUser.id,
        token: 'verification-token-123',
        type: 'magic_link',
        expiresAt: new Date(Date.now() + 3600000)
      };

      // Setup repository mocks for signup
      (userRepository.findByEmail as any).mockResolvedValueOnce(null); // No existing user
      (userRepository.create as any).mockResolvedValue(mockUser);
      (emailVerificationRepository.create as any).mockResolvedValue(mockVerification);

      const signupData: SignupData = {
        firstName: 'Integration',
        lastName: 'Test',
        email: 'integration@example.com',
        password: 'SecurePass123!',
        role: 'customer',
        agreedToTerms: true
      };

      // Step 1: Signup
      const signupResult = await authService.signup(signupData, mockContext);

      expect(signupResult.success).toBe(true);
      expect(signupResult.data?.user.email).toBe(signupData.email);
      expect(signupResult.data?.requiresVerification).toBe(true);

      // Step 2: Email Verification
      (emailVerificationRepository.findByToken as any).mockResolvedValue(mockVerification);
      (userRepository.verifyEmail as any).mockResolvedValue(undefined);
      (emailVerificationRepository.delete as any).mockResolvedValue(undefined);

      const verifyResult = await authService.verifyEmail(
        { token: 'verification-token-123' },
        mockContext
      );

      expect(verifyResult.success).toBe(true);
      expect(verifyResult.data?.message).toBe('Email verified successfully.');

      // Step 3: Login after verification
      (userRepository.findByEmail as any).mockResolvedValue(mockVerifiedUser);
      (sessionManager.createSession as any).mockResolvedValue(mockSession);

      const loginData: LoginData = {
        email: signupData.email,
        password: signupData.password
      };

      const loginResult = await authService.login(loginData, mockContext);

      expect(loginResult.success).toBe(true);
      expect(loginResult.data?.user.email).toBe(signupData.email);
      expect(loginResult.data?.user.isEmailVerified).toBe(true);
      expect(loginResult.data?.accessToken).toBe(mockSession.accessToken);
      expect(loginResult.data?.refreshToken).toBe(mockSession.refreshToken);

      // Verify the complete flow called all expected methods
      expect(userRepository.create).toHaveBeenCalledWith({
        email: signupData.email,
        firstName: signupData.firstName,
        lastName: signupData.lastName,
        passwordHash: 'hashed-password-123',
        role: 'customer'
      });
      expect(emailVerificationRepository.create).toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).toHaveBeenCalled();
      expect(userRepository.verifyEmail).toHaveBeenCalledWith(mockUser.id);
      expect(sessionManager.createSession).toHaveBeenCalled();
    });

    it('should handle signup with email sending failure gracefully', async () => {
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { emailVerificationRepository } = await import('../../database/repositories/email-verification-repository');
      const { emailService } = await import('../../email/email-service');
      const { checkRateLimit } = await import('../../auth/rate-limiter');
      const { hashPassword } = await import('../../auth/password-utils');
      const { generateEmailVerificationToken } = await import('../../auth/jwt-utils');

      (checkRateLimit as any).mockReturnValue({ success: true });
      (hashPassword as any).mockResolvedValue('hashed-password-123');
      (generateEmailVerificationToken as any).mockResolvedValue('verification-token-123');
      (emailService.sendVerificationEmail as any).mockRejectedValue(new Error('Email service unavailable'));

      const mockUser = {
        id: 'user-123',
        email: 'integration@example.com',
        firstName: 'Integration',
        lastName: 'Test',
        role: 'customer',
        isEmailVerified: false
      };

      (userRepository.findByEmail as any).mockResolvedValue(null);
      (userRepository.create as any).mockResolvedValue(mockUser);
      (emailVerificationRepository.create as any).mockResolvedValue({ id: 'verification-123' });

      const signupData: SignupData = {
        firstName: 'Integration',
        lastName: 'Test',
        email: 'integration@example.com',
        password: 'SecurePass123!',
        role: 'customer',
        agreedToTerms: true
      };

      const result = await authService.signup(signupData, mockContext);

      // Should still succeed even if email fails
      expect(result.success).toBe(true);
      expect(result.data?.user.email).toBe(signupData.email);
      expect(result.data?.requiresVerification).toBe(true);
    });
  });

  describe('Token Refresh Flow', () => {
    it('should handle complete token refresh flow', async () => {
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { sessionManager } = await import('../../auth/unified-session-manager');

      const mockUser = {
        id: 'user-123',
        email: 'refresh@example.com',
        firstName: 'Refresh',
        lastName: 'Test',
        role: 'customer',
        isEmailVerified: true,
        isProfileCompleted: true,
        isApproved: true
      };

      const mockNewSession = {
        accessToken: 'new-access-token-123',
        refreshToken: 'new-refresh-token-123',
        user: {
          userId: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          isEmailVerified: mockUser.isEmailVerified,
          isProfileCompleted: mockUser.isProfileCompleted,
          isApproved: mockUser.isApproved
        },
        expiresAt: new Date()
      };

      (sessionManager.refreshSession as any).mockResolvedValue(mockNewSession);
      (userRepository.findById as any).mockResolvedValue(mockUser);

      const result = await authService.refreshToken('old-refresh-token', mockContext);

      expect(result.success).toBe(true);
      expect(result.data?.accessToken).toBe(mockNewSession.accessToken);
      expect(result.data?.refreshToken).toBe(mockNewSession.refreshToken);
      expect(result.data?.user.email).toBe(mockUser.email);
      expect(result.data?.user.isProfileCompleted).toBe(true);
      expect(result.data?.user.isApproved).toBe(true);
    });

    it('should handle refresh token invalidation', async () => {
      const { sessionManager } = await import('../../auth/unified-session-manager');

      (sessionManager.refreshSession as any).mockResolvedValue(null);

      const result = await authService.refreshToken('invalid-refresh-token', mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid refresh token');
    });
  });

  describe('User Session Refresh Flow', () => {
    it('should refresh user session with updated profile data', async () => {
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { sessionManager } = await import('../../auth/unified-session-manager');

      const mockUpdatedUser = {
        id: 'user-123',
        email: 'updated@example.com',
        firstName: 'Updated',
        lastName: 'User',
        role: 'expert',
        isEmailVerified: true,
        isProfileCompleted: true,
        isApproved: true
      };

      const mockNewSession = {
        accessToken: 'updated-access-token',
        refreshToken: 'updated-refresh-token',
        user: {
          userId: mockUpdatedUser.id,
          email: mockUpdatedUser.email,
          role: mockUpdatedUser.role,
          isEmailVerified: mockUpdatedUser.isEmailVerified,
          isProfileCompleted: mockUpdatedUser.isProfileCompleted,
          isApproved: mockUpdatedUser.isApproved
        },
        expiresAt: new Date()
      };

      (userRepository.findById as any).mockResolvedValue(mockUpdatedUser);
      (sessionManager.createSession as any).mockResolvedValue(mockNewSession);

      const result = await authService.refreshUserSession('user-123', mockContext);

      expect(result.success).toBe(true);
      expect(result.data?.user.isProfileCompleted).toBe(true);
      expect(result.data?.user.isApproved).toBe(true);
      expect(result.data?.user.role).toBe('expert');
      expect(result.data?.accessToken).toBe(mockNewSession.accessToken);

      expect(sessionManager.createSession).toHaveBeenCalledWith({
        userId: mockUpdatedUser.id,
        email: mockUpdatedUser.email,
        role: mockUpdatedUser.role,
        isEmailVerified: mockUpdatedUser.isEmailVerified,
        isProfileCompleted: mockUpdatedUser.isProfileCompleted,
        isApproved: mockUpdatedUser.isApproved
      });
    });
  });

  describe('Logout Flow', () => {
    it('should handle complete logout flow', async () => {
      const { sessionManager } = await import('../../auth/unified-session-manager');

      const mockAuthContext = {
        ...mockContext,
        session: {
          userId: 'user-123',
          email: 'logout@example.com',
          role: 'customer' as const,
          isEmailVerified: true,
          isProfileCompleted: true,
          isApproved: true
        }
      };

      (sessionManager.invalidateSession as any).mockResolvedValue(undefined);

      const result = await authService.logout(mockAuthContext);

      expect(result.success).toBe(true);
      expect(result.data?.message).toBe('Logged out successfully.');
      expect(sessionManager.invalidateSession).toHaveBeenCalledWith('user-123');
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should enforce rate limits across multiple operations', async () => {
      const { checkRateLimit } = await import('../../auth/rate-limiter');

      // First call succeeds
      (checkRateLimit as any).mockReturnValueOnce({ success: true });

      const signupData: SignupData = {
        firstName: 'Rate',
        lastName: 'Limited',
        email: 'ratelimited@example.com',
        password: 'SecurePass123!',
        role: 'customer',
        agreedToTerms: true
      };

      const firstResult = await authService.signup(signupData, mockContext);
      expect(firstResult.success).toBe(true);

      // Second call is rate limited
      (checkRateLimit as any).mockReturnValueOnce({
        success: false,
        retryAfter: 300
      });

      const secondResult = await authService.signup(signupData, mockContext);
      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toContain('Too many signup attempts');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle database errors gracefully', async () => {
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { checkRateLimit } = await import('../../auth/rate-limiter');

      (checkRateLimit as any).mockReturnValue({ success: true });
      (userRepository.findByEmail as any).mockRejectedValue(new Error('Database connection failed'));

      const signupData: SignupData = {
        firstName: 'Database',
        lastName: 'Error',
        email: 'dberror@example.com',
        password: 'SecurePass123!',
        role: 'customer',
        agreedToTerms: true
      };

      const result = await authService.signup(signupData, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });

    it('should handle validation errors consistently', async () => {
      const invalidSignupData = {
        firstName: '',
        lastName: 'Test',
        email: 'invalid-email',
        password: 'weak',
        role: 'customer',
        agreedToTerms: false
      } as SignupData;

      const result = await authService.signup(invalidSignupData, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });
  });

  describe('Security Integration', () => {
    it('should handle account status checks during login', async () => {
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { verifyPassword } = await import('../../auth/password-utils');
      const { checkRateLimit } = await import('../../auth/rate-limiter');

      (checkRateLimit as any).mockReturnValue({ success: true });
      (verifyPassword as any).mockResolvedValue(true);

      // Test banned expert account
      const bannedExpert = {
        id: 'expert-123',
        email: 'banned@example.com',
        role: 'expert',
        passwordHash: 'hashed-password',
        isBanned: true,
        isPaused: false
      };

      (userRepository.findByEmail as any).mockResolvedValue(bannedExpert);

      const loginData: LoginData = {
        email: 'banned@example.com',
        password: 'password'
      };

      const bannedResult = await authService.login(loginData, mockContext);

      expect(bannedResult.success).toBe(false);
      expect(bannedResult.error).toContain('banned');

      // Test paused customer account
      const pausedCustomer = {
        id: 'customer-123',
        email: 'paused@example.com',
        role: 'customer',
        passwordHash: 'hashed-password',
        isBanned: false,
        isPaused: true
      };

      (userRepository.findByEmail as any).mockResolvedValue(pausedCustomer);

      const pausedResult = await authService.login(loginData, mockContext);

      expect(pausedResult.success).toBe(false);
      expect(pausedResult.error).toContain('paused');
    });

    it('should handle role-based access control', async () => {
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { verifyPassword } = await import('../../auth/password-utils');
      const { checkRateLimit } = await import('../../auth/rate-limiter');

      (checkRateLimit as any).mockReturnValue({ success: true });
      (verifyPassword as any).mockResolvedValue(true);

      const customerUser = {
        id: 'customer-123',
        email: 'customer@example.com',
        role: 'customer',
        passwordHash: 'hashed-password',
        isBanned: false,
        isPaused: false
      };

      (userRepository.findByEmail as any).mockResolvedValue(customerUser);

      // Try to login as expert when user is customer
      const loginData: LoginData = {
        email: 'customer@example.com',
        password: 'password',
        role: 'expert'
      };

      const result = await authService.login(loginData, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid credentials');
    });
  });
});