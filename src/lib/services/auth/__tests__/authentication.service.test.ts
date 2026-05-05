import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthenticationService, type RequestContext, type AuthenticatedContext } from '../authentication.service';
import type { SignupData, LoginData, VerifyEmailData } from '../types';

// Mock all dependencies
vi.mock('../../validation/service', () => ({
  ValidationService: {
    validateSignup: vi.fn(),
    validateLogin: vi.fn(),
    validateEmailVerification: vi.fn(),
    validateEmailCheck: vi.fn()
  }
}));

vi.mock('../../database/repositories/user-repository', () => ({
  userRepository: {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    verifyEmail: vi.fn()
  }
}));

vi.mock('../../database/repositories/email-verification-repository', () => ({
  emailVerificationRepository: {
    create: vi.fn(),
    findByToken: vi.fn(),
    delete: vi.fn(),
    deleteByUserId: vi.fn()
  }
}));

vi.mock('../../auth/unified-session-manager', () => ({
  sessionManager: {
    createSession: vi.fn(),
    invalidateSession: vi.fn(),
    refreshSession: vi.fn()
  }
}));

vi.mock('../../auth/password-utils', () => ({
  verifyPassword: vi.fn(),
  hashPassword: vi.fn()
}));

vi.mock('../../auth/jwt-utils', () => ({
  generateEmailVerificationToken: vi.fn(),
  verifyEmailVerificationToken: vi.fn()
}));

vi.mock('../../email/email-service', () => ({
  emailService: {
    sendVerificationEmail: vi.fn()
  }
}));

vi.mock('../../auth/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
  RATE_LIMIT_CONFIGS: {
    SIGNUP: { windowMs: 900000, max: 5 },
    LOGIN: { windowMs: 900000, max: 10 },
    RESEND_VERIFICATION: { windowMs: 300000, max: 3 }
  }
}));

vi.mock('../../auth/anomaly-detector', () => ({
  recordLoginFailure: vi.fn(),
  recordLoginSuccess: vi.fn()
}));

vi.mock('../../utils/audit-logger', () => ({
  emitAudit: vi.fn()
}));

vi.mock('../../email/verification-config', () => ({
  getExpirationTime: vi.fn().mockReturnValue(new Date(Date.now() + 3600000)),
  getDisplayExpirationMinutes: vi.fn().mockReturnValue(60)
}));

describe('AuthenticationService', () => {
  let authService: AuthenticationService;
  let mockContext: RequestContext;
  let mockAuthContext: AuthenticatedContext;

  beforeEach(() => {
    authService = new AuthenticationService();
    mockContext = {
      correlationId: 'test-correlation-id',
      clientIP: '127.0.0.1',
      userAgent: 'test-agent',
      timestamp: new Date()
    };
    mockAuthContext = {
      ...mockContext,
      session: {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer',
        isEmailVerified: true,
        isProfileCompleted: false,
        isApproved: false
      }
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('signup', () => {
    const mockSignupData: SignupData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'SecurePass123!',
      role: 'customer',
      agreedToTerms: true
    };

    it('should successfully register a new user', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { emailVerificationRepository } = await import('../../database/repositories/email-verification-repository');
      const { hashPassword } = await import('../../auth/password-utils');
      const { generateEmailVerificationToken } = await import('../../auth/jwt-utils');
      const { emailService } = await import('../../email/email-service');
      const { checkRateLimit } = await import('../../auth/rate-limiter');

      const mockUser = {
        id: 'user-123',
        email: mockSignupData.email,
        firstName: mockSignupData.firstName,
        lastName: mockSignupData.lastName,
        role: 'customer',
        isEmailVerified: false,
        createdAt: new Date()
      };

      (ValidationService.validateSignup as any).mockReturnValue({
        success: true,
        data: mockSignupData
      });
      (checkRateLimit as any).mockReturnValue({ success: true });
      (userRepository.findByEmail as any).mockResolvedValue(null);
      (hashPassword as any).mockResolvedValue('hashed-password');
      (userRepository.create as any).mockResolvedValue(mockUser);
      (generateEmailVerificationToken as any).mockResolvedValue('verification-token');
      (emailVerificationRepository.create as any).mockResolvedValue({ id: 'verification-123' });
      (emailService.sendVerificationEmail as any).mockResolvedValue(undefined);

      const result = await authService.signup(mockSignupData, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName
        }),
        requiresVerification: true
      });

      expect(userRepository.create).toHaveBeenCalledWith({
        email: mockSignupData.email,
        firstName: mockSignupData.firstName,
        lastName: mockSignupData.lastName,
        passwordHash: 'hashed-password',
        role: 'customer'
      });
    });

    it('should fail validation with invalid data', async () => {
      const { ValidationService } = await import('../../validation/service');

      (ValidationService.validateSignup as any).mockReturnValue({
        success: false,
        errors: { email: 'Invalid email format' }
      });

      const result = await authService.signup(mockSignupData, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    it('should fail when rate limited', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { checkRateLimit } = await import('../../auth/rate-limiter');

      (ValidationService.validateSignup as any).mockReturnValue({
        success: true,
        data: mockSignupData
      });
      (checkRateLimit as any).mockReturnValue({
        success: false,
        retryAfter: 300
      });

      const result = await authService.signup(mockSignupData, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many signup attempts');
    });

    it('should fail when user already exists', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { checkRateLimit } = await import('../../auth/rate-limiter');

      const existingUser = { id: 'existing-user', email: mockSignupData.email };

      (ValidationService.validateSignup as any).mockReturnValue({
        success: true,
        data: mockSignupData
      });
      (checkRateLimit as any).mockReturnValue({ success: true });
      (userRepository.findByEmail as any).mockResolvedValue(existingUser);

      const result = await authService.signup(mockSignupData, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('An account with this email already exists');
    });

    it('should continue when email sending fails', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { emailVerificationRepository } = await import('../../database/repositories/email-verification-repository');
      const { hashPassword } = await import('../../auth/password-utils');
      const { generateEmailVerificationToken } = await import('../../auth/jwt-utils');
      const { emailService } = await import('../../email/email-service');
      const { checkRateLimit } = await import('../../auth/rate-limiter');

      const mockUser = {
        id: 'user-123',
        email: mockSignupData.email,
        firstName: mockSignupData.firstName,
        lastName: mockSignupData.lastName,
        role: 'customer',
        isEmailVerified: false
      };

      (ValidationService.validateSignup as any).mockReturnValue({
        success: true,
        data: mockSignupData
      });
      (checkRateLimit as any).mockReturnValue({ success: true });
      (userRepository.findByEmail as any).mockResolvedValue(null);
      (hashPassword as any).mockResolvedValue('hashed-password');
      (userRepository.create as any).mockResolvedValue(mockUser);
      (generateEmailVerificationToken as any).mockResolvedValue('verification-token');
      (emailVerificationRepository.create as any).mockResolvedValue({ id: 'verification-123' });
      (emailService.sendVerificationEmail as any).mockRejectedValue(new Error('Email service error'));

      const result = await authService.signup(mockSignupData, mockContext);

      expect(result.success).toBe(true);
      expect(result.data?.requiresVerification).toBe(true);
    });
  });

  describe('login', () => {
    const mockLoginData: LoginData = {
      email: 'john.doe@example.com',
      password: 'SecurePass123!'
    };

    it('should successfully authenticate user', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { verifyPassword } = await import('../../auth/password-utils');
      const { sessionManager } = await import('../../auth/unified-session-manager');
      const { checkRateLimit } = await import('../../auth/rate-limiter');
      const { recordLoginSuccess } = await import('../../auth/anomaly-detector');

      const mockUser = {
        id: 'user-123',
        email: mockLoginData.email,
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer',
        passwordHash: 'hashed-password',
        isEmailVerified: true,
        isProfileCompleted: false,
        isApproved: false,
        isBanned: false,
        isPaused: false
      };

      const mockSession = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
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

      (ValidationService.validateLogin as any).mockReturnValue({
        success: true,
        data: mockLoginData
      });
      (checkRateLimit as any).mockReturnValue({ success: true });
      (userRepository.findByEmail as any).mockResolvedValue(mockUser);
      (verifyPassword as any).mockResolvedValue(true);
      (sessionManager.createSession as any).mockResolvedValue(mockSession);

      const result = await authService.login(mockLoginData, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName
        }),
        accessToken: mockSession.accessToken,
        refreshToken: mockSession.refreshToken
      });

      expect(recordLoginSuccess).toHaveBeenCalledWith(mockLoginData.email);
    });

    it('should fail with invalid credentials - user not found', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { checkRateLimit } = await import('../../auth/rate-limiter');
      const { recordLoginFailure } = await import('../../auth/anomaly-detector');

      (ValidationService.validateLogin as any).mockReturnValue({
        success: true,
        data: mockLoginData
      });
      (checkRateLimit as any).mockReturnValue({ success: true });
      (userRepository.findByEmail as any).mockResolvedValue(null);

      const result = await authService.login(mockLoginData, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid credentials');
      expect(recordLoginFailure).toHaveBeenCalledWith(mockLoginData.email);
    });

    it('should fail with invalid credentials - wrong password', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { verifyPassword } = await import('../../auth/password-utils');
      const { checkRateLimit } = await import('../../auth/rate-limiter');
      const { recordLoginFailure } = await import('../../auth/anomaly-detector');

      const mockUser = {
        id: 'user-123',
        email: mockLoginData.email,
        passwordHash: 'hashed-password',
        role: 'customer'
      };

      (ValidationService.validateLogin as any).mockReturnValue({
        success: true,
        data: mockLoginData
      });
      (checkRateLimit as any).mockReturnValue({ success: true });
      (userRepository.findByEmail as any).mockResolvedValue(mockUser);
      (verifyPassword as any).mockResolvedValue(false);

      const result = await authService.login(mockLoginData, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid credentials');
      expect(recordLoginFailure).toHaveBeenCalledWith(mockLoginData.email);
    });

    it('should fail when expert account is banned', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { verifyPassword } = await import('../../auth/password-utils');
      const { checkRateLimit } = await import('../../auth/rate-limiter');

      const mockUser = {
        id: 'user-123',
        email: mockLoginData.email,
        passwordHash: 'hashed-password',
        role: 'expert',
        isBanned: true,
        isPaused: false
      };

      (ValidationService.validateLogin as any).mockReturnValue({
        success: true,
        data: mockLoginData
      });
      (checkRateLimit as any).mockReturnValue({ success: true });
      (userRepository.findByEmail as any).mockResolvedValue(mockUser);
      (verifyPassword as any).mockResolvedValue(true);

      const result = await authService.login(mockLoginData, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('banned');
    });

    it('should fail when customer account is paused', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { verifyPassword } = await import('../../auth/password-utils');
      const { checkRateLimit } = await import('../../auth/rate-limiter');

      const mockUser = {
        id: 'user-123',
        email: mockLoginData.email,
        passwordHash: 'hashed-password',
        role: 'customer',
        isBanned: false,
        isPaused: true
      };

      (ValidationService.validateLogin as any).mockReturnValue({
        success: true,
        data: mockLoginData
      });
      (checkRateLimit as any).mockReturnValue({ success: true });
      (userRepository.findByEmail as any).mockResolvedValue(mockUser);
      (verifyPassword as any).mockResolvedValue(true);

      const result = await authService.login(mockLoginData, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('paused');
    });

    it('should fail when rate limited', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { checkRateLimit } = await import('../../auth/rate-limiter');

      (ValidationService.validateLogin as any).mockReturnValue({
        success: true,
        data: mockLoginData
      });
      (checkRateLimit as any).mockReturnValue({
        success: false,
        retryAfter: 300
      });

      const result = await authService.login(mockLoginData, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many login attempts');
    });

    it('should validate role access for role-specific login', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { verifyPassword } = await import('../../auth/password-utils');
      const { checkRateLimit } = await import('../../auth/rate-limiter');

      const mockUser = {
        id: 'user-123',
        email: mockLoginData.email,
        passwordHash: 'hashed-password',
        role: 'customer'
      };

      const loginDataWithRole = { ...mockLoginData, role: 'expert' };

      (ValidationService.validateLogin as any).mockReturnValue({
        success: true,
        data: loginDataWithRole
      });
      (checkRateLimit as any).mockReturnValue({ success: true });
      (userRepository.findByEmail as any).mockResolvedValue(mockUser);
      (verifyPassword as any).mockResolvedValue(true);

      const result = await authService.login(loginDataWithRole, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid credentials');
    });
  });

  describe('verifyEmail', () => {
    const mockVerifyData: VerifyEmailData = {
      token: 'verification-token-123'
    };

    it('should successfully verify email', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { emailVerificationRepository } = await import('../../database/repositories/email-verification-repository');
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { verifyEmailVerificationToken } = await import('../../auth/jwt-utils');

      const mockVerification = {
        id: 'verification-123',
        userId: 'user-123',
        token: mockVerifyData.token,
        type: 'magic_link',
        expiresAt: new Date(Date.now() + 3600000) // 1 hour from now
      };

      const mockJwtPayload = {
        userId: 'user-123',
        email: 'test@example.com'
      };

      (ValidationService.validateEmailVerification as any).mockReturnValue({
        success: true,
        data: mockVerifyData
      });
      (emailVerificationRepository.findByToken as any).mockResolvedValue(mockVerification);
      (verifyEmailVerificationToken as any).mockResolvedValue(mockJwtPayload);
      (userRepository.verifyEmail as any).mockResolvedValue(undefined);
      (emailVerificationRepository.delete as any).mockResolvedValue(undefined);

      const result = await authService.verifyEmail(mockVerifyData, mockContext);

      expect(result.success).toBe(true);
      expect(result.data?.message).toBe('Email verified successfully.');
      expect(userRepository.verifyEmail).toHaveBeenCalledWith(mockVerification.userId);
      expect(emailVerificationRepository.delete).toHaveBeenCalledWith(mockVerification.id);
    });

    it('should fail with invalid token', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { emailVerificationRepository } = await import('../../database/repositories/email-verification-repository');

      (ValidationService.validateEmailVerification as any).mockReturnValue({
        success: true,
        data: mockVerifyData
      });
      (emailVerificationRepository.findByToken as any).mockResolvedValue(null);

      const result = await authService.verifyEmail(mockVerifyData, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid or expired verification token');
    });

    it('should fail with expired token', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { emailVerificationRepository } = await import('../../database/repositories/email-verification-repository');

      const mockVerification = {
        id: 'verification-123',
        userId: 'user-123',
        token: mockVerifyData.token,
        type: 'magic_link',
        expiresAt: new Date(Date.now() - 3600000) // 1 hour ago
      };

      (ValidationService.validateEmailVerification as any).mockReturnValue({
        success: true,
        data: mockVerifyData
      });
      (emailVerificationRepository.findByToken as any).mockResolvedValue(mockVerification);

      const result = await authService.verifyEmail(mockVerifyData, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should fail with invalid JWT signature', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { emailVerificationRepository } = await import('../../database/repositories/email-verification-repository');
      const { verifyEmailVerificationToken } = await import('../../auth/jwt-utils');

      const mockVerification = {
        id: 'verification-123',
        userId: 'user-123',
        token: 'jwt.token.here',
        type: 'magic_link',
        expiresAt: new Date(Date.now() + 3600000)
      };

      (ValidationService.validateEmailVerification as any).mockReturnValue({
        success: true,
        data: mockVerifyData
      });
      (emailVerificationRepository.findByToken as any).mockResolvedValue(mockVerification);
      (verifyEmailVerificationToken as any).mockResolvedValue(null);

      const result = await authService.verifyEmail(mockVerifyData, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid verification token');
    });
  });

  describe('resendVerificationEmail', () => {
    const testEmail = 'test@example.com';

    it('should successfully resend verification email', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { emailVerificationRepository } = await import('../../database/repositories/email-verification-repository');
      const { generateEmailVerificationToken } = await import('../../auth/jwt-utils');
      const { emailService } = await import('../../email/email-service');
      const { checkRateLimit } = await import('../../auth/rate-limiter');

      const mockUser = {
        id: 'user-123',
        email: testEmail,
        firstName: 'John',
        isEmailVerified: false
      };

      (ValidationService.validateEmailCheck as any).mockReturnValue({
        success: true,
        data: { email: testEmail }
      });
      (checkRateLimit as any).mockReturnValue({ success: true });
      (userRepository.findByEmail as any).mockResolvedValue(mockUser);
      (emailVerificationRepository.deleteByUserId as any).mockResolvedValue(undefined);
      (generateEmailVerificationToken as any).mockResolvedValue('new-verification-token');
      (emailVerificationRepository.create as any).mockResolvedValue({ id: 'verification-123' });
      (emailService.sendVerificationEmail as any).mockResolvedValue(undefined);

      const result = await authService.resendVerificationEmail(testEmail, mockContext);

      expect(result.success).toBe(true);
      expect(result.data?.message).toBe('Verification email sent.');
      expect(emailVerificationRepository.deleteByUserId).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return success even if user does not exist', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { checkRateLimit } = await import('../../auth/rate-limiter');

      (ValidationService.validateEmailCheck as any).mockReturnValue({
        success: true,
        data: { email: testEmail }
      });
      (checkRateLimit as any).mockReturnValue({ success: true });
      (userRepository.findByEmail as any).mockResolvedValue(null);

      const result = await authService.resendVerificationEmail(testEmail, mockContext);

      expect(result.success).toBe(true);
      expect(result.data?.message).toBe('If the email exists, a verification email has been sent.');
    });

    it('should fail if email is already verified', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { checkRateLimit } = await import('../../auth/rate-limiter');

      const mockUser = {
        id: 'user-123',
        email: testEmail,
        isEmailVerified: true
      };

      (ValidationService.validateEmailCheck as any).mockReturnValue({
        success: true,
        data: { email: testEmail }
      });
      (checkRateLimit as any).mockReturnValue({ success: true });
      (userRepository.findByEmail as any).mockResolvedValue(mockUser);

      const result = await authService.resendVerificationEmail(testEmail, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Email is already verified');
    });

    it('should fail when rate limited', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { checkRateLimit } = await import('../../auth/rate-limiter');

      (ValidationService.validateEmailCheck as any).mockReturnValue({
        success: true,
        data: { email: testEmail }
      });
      (checkRateLimit as any).mockReturnValue({
        success: false,
        retryAfter: 300
      });

      const result = await authService.resendVerificationEmail(testEmail, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many verification requests');
    });

    it('should fail when email service fails', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { emailVerificationRepository } = await import('../../database/repositories/email-verification-repository');
      const { generateEmailVerificationToken } = await import('../../auth/jwt-utils');
      const { emailService } = await import('../../email/email-service');
      const { checkRateLimit } = await import('../../auth/rate-limiter');

      const mockUser = {
        id: 'user-123',
        email: testEmail,
        firstName: 'John',
        isEmailVerified: false
      };

      (ValidationService.validateEmailCheck as any).mockReturnValue({
        success: true,
        data: { email: testEmail }
      });
      (checkRateLimit as any).mockReturnValue({ success: true });
      (userRepository.findByEmail as any).mockResolvedValue(mockUser);
      (emailVerificationRepository.deleteByUserId as any).mockResolvedValue(undefined);
      (generateEmailVerificationToken as any).mockResolvedValue('new-verification-token');
      (emailVerificationRepository.create as any).mockResolvedValue({ id: 'verification-123' });
      (emailService.sendVerificationEmail as any).mockRejectedValue(new Error('Email service error'));

      const result = await authService.resendVerificationEmail(testEmail, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('email');
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      const { sessionManager } = await import('../../auth/unified-session-manager');

      (sessionManager.invalidateSession as any).mockResolvedValue(undefined);

      const result = await authService.logout(mockAuthContext);

      expect(result.success).toBe(true);
      expect(result.data?.message).toBe('Logged out successfully.');
      expect(sessionManager.invalidateSession).toHaveBeenCalledWith(mockAuthContext.session.userId);
    });

    it('should handle session invalidation failure', async () => {
      const { sessionManager } = await import('../../auth/unified-session-manager');

      (sessionManager.invalidateSession as any).mockRejectedValue(new Error('Session invalidation failed'));

      const result = await authService.logout(mockAuthContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Session invalidation failed');
    });
  });

  describe('refreshToken', () => {
    const mockRefreshToken = 'refresh-token-123';

    it('should successfully refresh token', async () => {
      const { sessionManager } = await import('../../auth/unified-session-manager');
      const { userRepository } = await import('../../database/repositories/user-repository');

      const mockNewSession = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: {
          userId: 'user-123',
          email: 'test@example.com',
          role: 'customer',
          isEmailVerified: true,
          isProfileCompleted: false,
          isApproved: false
        },
        expiresAt: new Date()
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer',
        isEmailVerified: true,
        isProfileCompleted: false,
        isApproved: false
      };

      (sessionManager.refreshSession as any).mockResolvedValue(mockNewSession);
      (userRepository.findById as any).mockResolvedValue(mockUser);

      const result = await authService.refreshToken(mockRefreshToken, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        accessToken: mockNewSession.accessToken,
        refreshToken: mockNewSession.refreshToken,
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName
        })
      });
    });

    it('should fail with invalid refresh token', async () => {
      const { sessionManager } = await import('../../auth/unified-session-manager');

      (sessionManager.refreshSession as any).mockResolvedValue(null);

      const result = await authService.refreshToken(mockRefreshToken, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid refresh token');
    });

    it('should fail when user not found after refresh', async () => {
      const { sessionManager } = await import('../../auth/unified-session-manager');
      const { userRepository } = await import('../../database/repositories/user-repository');

      const mockNewSession = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: {
          userId: 'user-123',
          email: 'test@example.com',
          role: 'customer',
          isEmailVerified: true,
          isProfileCompleted: false,
          isApproved: false
        },
        expiresAt: new Date()
      };

      (sessionManager.refreshSession as any).mockResolvedValue(mockNewSession);
      (userRepository.findById as any).mockResolvedValue(null);

      const result = await authService.refreshToken(mockRefreshToken, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid credentials');
    });
  });

  describe('refreshUserSession', () => {
    const userId = 'user-123';

    it('should successfully refresh user session', async () => {
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { sessionManager } = await import('../../auth/unified-session-manager');

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer',
        isEmailVerified: true,
        isProfileCompleted: true,
        isApproved: true
      };

      const mockSession = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
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

      (userRepository.findById as any).mockResolvedValue(mockUser);
      (sessionManager.createSession as any).mockResolvedValue(mockSession);

      const result = await authService.refreshUserSession(userId, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          isProfileCompleted: mockUser.isProfileCompleted,
          isApproved: mockUser.isApproved
        }),
        accessToken: mockSession.accessToken,
        refreshToken: mockSession.refreshToken
      });
    });

    it('should fail when user not found', async () => {
      const { userRepository } = await import('../../database/repositories/user-repository');

      (userRepository.findById as any).mockResolvedValue(null);

      const result = await authService.refreshUserSession(userId, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid credentials');
    });
  });
});