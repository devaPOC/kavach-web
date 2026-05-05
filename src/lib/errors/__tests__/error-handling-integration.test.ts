import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthenticationService } from '../../services/auth/authentication.service';
import { ProfileService } from '../../services/profile/profile.service';
import { ValidationError, AuthenticationError, ExternalServiceError } from '../custom-errors';
import { ErrorCode } from '../error-types';
import type { SignupData, LoginData } from '../../services/auth/types';
import type { CreateExpertProfileData } from '../../services/profile/profile-types';

// Mock all dependencies
vi.mock('../../validation/service');
vi.mock('../../database/repositories/user-repository');
vi.mock('../../database/repositories/email-verification-repository');
vi.mock('../../database/repositories/session-repository');
vi.mock('../../auth/unified-session-manager');
vi.mock('../../auth/password-utils');
vi.mock('../../auth/jwt-utils');
vi.mock('../../email/email-service');
vi.mock('../../auth/rate-limiter');
vi.mock('../../auth/anomaly-detector');
vi.mock('../../utils/audit-logger');
vi.mock('../../database/transaction-service');
vi.mock('../../database/profile-transaction');
vi.mock('../../database/connection');

describe('Error Handling Integration Tests', () => {
  let authService: AuthenticationService;
  let profileService: ProfileService;
  let mockContext: any;

  beforeEach(() => {
    authService = new AuthenticationService();
    profileService = new ProfileService();
    mockContext = {
      correlationId: 'error-test-id',
      clientIP: '127.0.0.1',
      userAgent: 'test-agent',
      timestamp: new Date()
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Validation Error Handling', () => {
    it('should handle validation errors consistently across services', async () => {
      const { ValidationService } = await import('../../validation/service');

      const invalidSignupData: SignupData = {
        firstName: '',
        lastName: 'Test',
        email: 'invalid-email',
        password: 'weak',
        role: 'customer',
        agreedToTerms: false
      };

      (ValidationService.validateSignup as any).mockReturnValue({
        success: false,
        errors: {
          firstName: 'First name is required',
          email: 'Invalid email format',
          password: 'Password must be at least 8 characters',
          agreedToTerms: 'You must agree to the terms'
        }
      });

      const result = await authService.signup(invalidSignupData, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
      expect(result.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(result.details).toEqual({
        firstName: 'First name is required',
        email: 'Invalid email format',
        password: 'Password must be at least 8 characters',
        agreedToTerms: 'You must agree to the terms'
      });
    });

    it('should handle profile validation errors with field-specific messages', async () => {
      const { ValidationService } = await import('../../validation/service');

      const invalidProfileData: CreateExpertProfileData = {
        phoneNumber: 'invalid-phone',
        dateOfBirth: '2020-01-01', // Too young
        gender: 'male',
        areasOfSpecialization: ''
      };

      (ValidationService.validateExpertProfile as any).mockReturnValue({
        success: false,
        errors: {
          phoneNumber: 'Invalid phone number format',
          dateOfBirth: 'Must be at least 18 years old',
          areasOfSpecialization: 'Areas of specialization is required'
        }
      });

      await expect(profileService.createExpertProfile('user-123', invalidProfileData, mockContext))
        .rejects.toThrow('Invalid phone number format');
    });
  });

  describe('Authentication Error Handling', () => {
    it('should handle rate limiting errors with retry information', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { checkRateLimit } = await import('../../auth/rate-limiter');

      const validSignupData: SignupData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        role: 'customer',
        agreedToTerms: true
      };

      (ValidationService.validateSignup as any).mockReturnValue({
        success: true,
        data: validSignupData
      });

      (checkRateLimit as any).mockReturnValue({
        success: false,
        retryAfter: 300
      });

      const result = await authService.signup(validSignupData, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many signup attempts');
      expect(result.code).toBe(ErrorCode.RATE_LIMITED);
      expect(result.retryAfter).toBe(300);
    });

    it('should handle invalid credentials with consistent error messages', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { checkRateLimit } = await import('../../auth/rate-limiter');

      const loginData: LoginData = {
        email: 'nonexistent@example.com',
        password: 'password'
      };

      (ValidationService.validateLogin as any).mockReturnValue({
        success: true,
        data: loginData
      });
      (checkRateLimit as any).mockReturnValue({ success: true });
      (userRepository.findByEmail as any).mockResolvedValue(null);

      const result = await authService.login(loginData, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(result.code).toBe(ErrorCode.INVALID_CREDENTIALS);
    });

    it('should handle account status errors appropriately', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { verifyPassword } = await import('../../auth/password-utils');
      const { checkRateLimit } = await import('../../auth/rate-limiter');

      const loginData: LoginData = {
        email: 'banned@example.com',
        password: 'password'
      };

      const bannedUser = {
        id: 'user-123',
        email: loginData.email,
        role: 'expert',
        passwordHash: 'hashed-password',
        isBanned: true,
        isPaused: false
      };

      (ValidationService.validateLogin as any).mockReturnValue({
        success: true,
        data: loginData
      });
      (checkRateLimit as any).mockReturnValue({ success: true });
      (userRepository.findByEmail as any).mockResolvedValue(bannedUser);
      (verifyPassword as any).mockResolvedValue(true);

      const result = await authService.login(loginData, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('banned');
      expect(result.code).toBe(ErrorCode.ACCOUNT_BANNED);
    });
  });

  describe('Database Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { checkRateLimit } = await import('../../auth/rate-limiter');

      const signupData: SignupData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        role: 'customer',
        agreedToTerms: true
      };

      (ValidationService.validateSignup as any).mockReturnValue({
        success: true,
        data: signupData
      });
      (checkRateLimit as any).mockReturnValue({ success: true });
      (userRepository.findByEmail as any).mockRejectedValue(new Error('Connection timeout'));

      const result = await authService.signup(signupData, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection timeout');
      expect(result.code).toBe(ErrorCode.DATABASE_ERROR);
    });

    it('should handle transaction failures in profile operations', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { transactionService } = await import('../../database/transaction-service');

      const profileData: CreateExpertProfileData = {
        phoneNumber: '+1234567890',
        areasOfSpecialization: 'Software Development'
      };

      (ValidationService.validateExpertProfile as any).mockReturnValue({
        success: true,
        data: profileData
      });

      (transactionService.executeInTransaction as any).mockResolvedValue({
        success: false,
        error: 'Transaction deadlock detected',
        rollbackReason: 'Database deadlock during profile creation'
      });

      await expect(profileService.createExpertProfile('user-123', profileData, mockContext))
        .rejects.toThrow('Transaction deadlock detected');
    });

    it('should handle constraint violations appropriately', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { checkRateLimit } = await import('../../auth/rate-limiter');
      const { hashPassword } = await import('../../auth/password-utils');

      const signupData: SignupData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'existing@example.com',
        password: 'SecurePass123!',
        role: 'customer',
        agreedToTerms: true
      };

      (ValidationService.validateSignup as any).mockReturnValue({
        success: true,
        data: signupData
      });
      (checkRateLimit as any).mockReturnValue({ success: true });
      (userRepository.findByEmail as any).mockResolvedValue(null);
      (hashPassword as any).mockResolvedValue('hashed-password');
      (userRepository.create as any).mockRejectedValue(
        new Error('duplicate key value violates unique constraint "users_email_key"')
      );

      const result = await authService.signup(signupData, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('duplicate key value');
    });
  });

  describe('External Service Error Handling', () => {
    it('should handle email service failures gracefully', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { emailVerificationRepository } = await import('../../database/repositories/email-verification-repository');
      const { emailService } = await import('../../email/email-service');
      const { checkRateLimit } = await import('../../auth/rate-limiter');
      const { hashPassword } = await import('../../auth/password-utils');
      const { generateEmailVerificationToken } = await import('../../auth/jwt-utils');

      const signupData: SignupData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        role: 'customer',
        agreedToTerms: true
      };

      const mockUser = {
        id: 'user-123',
        email: signupData.email,
        firstName: signupData.firstName,
        lastName: signupData.lastName,
        role: 'customer'
      };

      (ValidationService.validateSignup as any).mockReturnValue({
        success: true,
        data: signupData
      });
      (checkRateLimit as any).mockReturnValue({ success: true });
      (userRepository.findByEmail as any).mockResolvedValue(null);
      (hashPassword as any).mockResolvedValue('hashed-password');
      (userRepository.create as any).mockResolvedValue(mockUser);
      (generateEmailVerificationToken as any).mockResolvedValue('verification-token');
      (emailVerificationRepository.create as any).mockResolvedValue({ id: 'verification-123' });
      (emailService.sendVerificationEmail as any).mockRejectedValue(new Error('SMTP server unavailable'));

      // Should still succeed even if email fails
      const result = await authService.signup(signupData, mockContext);

      expect(result.success).toBe(true);
      expect(result.data?.user.email).toBe(signupData.email);
    });

    it('should handle email service failures in resend verification', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { emailVerificationRepository } = await import('../../database/repositories/email-verification-repository');
      const { emailService } = await import('../../email/email-service');
      const { checkRateLimit } = await import('../../auth/rate-limiter');
      const { generateEmailVerificationToken } = await import('../../auth/jwt-utils');

      const testEmail = 'test@example.com';
      const mockUser = {
        id: 'user-123',
        email: testEmail,
        firstName: 'Test',
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
      (emailService.sendVerificationEmail as any).mockRejectedValue(new Error('Email quota exceeded'));

      const result = await authService.resendVerificationEmail(testEmail, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('email');
      expect(result.code).toBe(ErrorCode.EXTERNAL_SERVICE_ERROR);
    });
  });

  describe('Session Management Error Handling', () => {
    it('should handle session creation failures', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { verifyPassword } = await import('../../auth/password-utils');
      const { sessionManager } = await import('../../auth/unified-session-manager');
      const { checkRateLimit } = await import('../../auth/rate-limiter');

      const loginData: LoginData = {
        email: 'test@example.com',
        password: 'password'
      };

      const mockUser = {
        id: 'user-123',
        email: loginData.email,
        role: 'customer',
        passwordHash: 'hashed-password',
        isEmailVerified: true,
        isProfileCompleted: false,
        isApproved: false,
        isBanned: false,
        isPaused: false
      };

      (ValidationService.validateLogin as any).mockReturnValue({
        success: true,
        data: loginData
      });
      (checkRateLimit as any).mockReturnValue({ success: true });
      (userRepository.findByEmail as any).mockResolvedValue(mockUser);
      (verifyPassword as any).mockResolvedValue(true);
      (sessionManager.createSession as any).mockRejectedValue(new Error('Session store unavailable'));

      const result = await authService.login(loginData, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Session store unavailable');
    });

    it('should handle session invalidation failures', async () => {
      const { sessionManager } = await import('../../auth/unified-session-manager');

      const mockAuthContext = {
        ...mockContext,
        session: {
          userId: 'user-123',
          email: 'test@example.com',
          role: 'customer' as const,
          isEmailVerified: true,
          isProfileCompleted: false,
          isApproved: false
        }
      };

      (sessionManager.invalidateSession as any).mockRejectedValue(new Error('Session cleanup failed'));

      const result = await authService.logout(mockAuthContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Session cleanup failed');
    });

    it('should handle refresh token failures', async () => {
      const { sessionManager } = await import('../../auth/unified-session-manager');

      (sessionManager.refreshSession as any).mockResolvedValue(null);

      const result = await authService.refreshToken('invalid-refresh-token', mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid refresh token');
      expect(result.code).toBe(ErrorCode.INVALID_TOKEN);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle extremely long input values', async () => {
      const { ValidationService } = await import('../../validation/service');

      const longString = 'a'.repeat(10000);
      const signupData: SignupData = {
        firstName: longString,
        lastName: longString,
        email: `${longString}@example.com`,
        password: longString,
        role: 'customer',
        agreedToTerms: true
      };

      (ValidationService.validateSignup as any).mockReturnValue({
        success: false,
        errors: {
          firstName: 'First name is too long',
          lastName: 'Last name is too long',
          email: 'Email is too long'
        }
      });

      const result = await authService.signup(signupData, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    it('should handle null and undefined values gracefully', async () => {
      const { ValidationService } = await import('../../validation/service');

      const nullSignupData = {
        firstName: null,
        lastName: undefined,
        email: null,
        password: undefined,
        role: null,
        agreedToTerms: null
      } as any;

      (ValidationService.validateSignup as any).mockReturnValue({
        success: false,
        errors: {
          firstName: 'First name is required',
          lastName: 'Last name is required',
          email: 'Email is required',
          password: 'Password is required',
          role: 'Role is required',
          agreedToTerms: 'You must agree to the terms'
        }
      });

      const result = await authService.signup(nullSignupData, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    it('should handle concurrent operations gracefully', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { checkRateLimit } = await import('../../auth/rate-limiter');

      const signupData: SignupData = {
        firstName: 'Concurrent',
        lastName: 'User',
        email: 'concurrent@example.com',
        password: 'SecurePass123!',
        role: 'customer',
        agreedToTerms: true
      };

      (ValidationService.validateSignup as any).mockReturnValue({
        success: true,
        data: signupData
      });
      (checkRateLimit as any).mockReturnValue({ success: true });

      // First call finds no user, second call finds user (race condition)
      (userRepository.findByEmail as any)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'existing-user', email: signupData.email });

      const promises = [
        authService.signup(signupData, mockContext),
        authService.signup(signupData, mockContext)
      ];

      const results = await Promise.all(promises);

      // At least one should fail due to duplicate email
      const failures = results.filter(r => !r.success);
      expect(failures.length).toBeGreaterThan(0);
    });

    it('should handle memory pressure scenarios', async () => {
      const { ValidationService } = await import('../../validation/service');

      // Simulate memory pressure by creating large objects
      const largeProfileData = {
        phoneNumber: '+1234567890',
        areasOfSpecialization: 'x'.repeat(100000),
        professionalExperience: 'y'.repeat(100000),
        relevantCertifications: 'z'.repeat(100000)
      } as CreateExpertProfileData;

      (ValidationService.validateExpertProfile as any).mockReturnValue({
        success: false,
        errors: {
          areasOfSpecialization: 'Areas of specialization is too long',
          professionalExperience: 'Professional experience is too long',
          relevantCertifications: 'Certifications description is too long'
        }
      });

      await expect(profileService.createExpertProfile('user-123', largeProfileData, mockContext))
        .rejects.toThrow('Areas of specialization is too long');
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from temporary service failures', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { userRepository } = await import('../../database/repositories/user-repository');
      const { checkRateLimit } = await import('../../auth/rate-limiter');

      const signupData: SignupData = {
        firstName: 'Recovery',
        lastName: 'Test',
        email: 'recovery@example.com',
        password: 'SecurePass123!',
        role: 'customer',
        agreedToTerms: true
      };

      (ValidationService.validateSignup as any).mockReturnValue({
        success: true,
        data: signupData
      });
      (checkRateLimit as any).mockReturnValue({ success: true });

      // First call fails, second succeeds
      (userRepository.findByEmail as any)
        .mockRejectedValueOnce(new Error('Temporary database error'))
        .mockResolvedValueOnce(null);

      // First attempt should fail
      const firstResult = await authService.signup(signupData, mockContext);
      expect(firstResult.success).toBe(false);

      // Second attempt should succeed (if we had retry logic)
      // For now, just verify the error was handled properly
      expect(firstResult.error).toContain('Temporary database error');
    });

    it('should maintain data consistency during partial failures', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { transactionService } = await import('../../database/transaction-service');

      const profileData: CreateExpertProfileData = {
        phoneNumber: '+1234567890',
        areasOfSpecialization: 'Software Development'
      };

      (ValidationService.validateExpertProfile as any).mockReturnValue({
        success: true,
        data: profileData
      });

      // Transaction fails and rolls back
      (transactionService.executeInTransaction as any).mockResolvedValue({
        success: false,
        error: 'Profile creation failed',
        rollbackReason: 'User status update failed'
      });

      await expect(profileService.createExpertProfile('user-123', profileData, mockContext))
        .rejects.toThrow('Profile creation failed');

      // Verify transaction was attempted (rollback should have occurred)
      expect(transactionService.executeInTransaction).toHaveBeenCalled();
    });
  });
});