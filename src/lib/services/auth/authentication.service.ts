import { BaseService } from '../base.service';
import { sessionManager, type SessionData, type SessionResult } from '../../auth/unified-session-manager';
import { ValidationService } from '../../validation/service';
import { userRepository } from '../../database/repositories/user-repository';
import { emailVerificationRepository } from '../../database/repositories/email-verification-repository';
import { verifyPassword, hashPassword } from '../../auth/password-utils';
import { generateEmailVerificationToken, verifyEmailVerificationToken } from '../../auth/jwt-utils';
import { emailService } from '../../email/email-service';
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '../../auth/rate-limiter';
import { recordLoginFailure, recordLoginSuccess, shouldLockAccount } from '../../auth/anomaly-detector';
import { emitAudit, auditAuth, auditSecurity } from '../../utils/audit-logger';
import {
  securityMonitor,
  recordFailedLoginAttempt,
  recordTokenManipulation,
  recordUnauthorizedAccess,
  SecurityEventType,
  SecuritySeverity
} from '../../security/security-monitor';
import { legalAgreementsService, type LegalAgreementAcceptance } from '../legal-agreements.service';
import { type LegalDocumentType } from '../../constants/legal-documents';
import { createServiceSuccess, createServiceError, type ServiceResult } from '../../errors/response-utils';
import { ValidationError, AuthenticationError, ExternalServiceError } from '../../errors/custom-errors';
import { ErrorCode } from '../../errors/error-types';
import { withServiceErrorHandler } from '../../errors/error-handler';
import type { NextRequest } from 'next/server';
import type {
  SignupData,
  LoginData,
  VerifyEmailData,
  AuthResult,
  SignupResult,
  VerifyEmailResult,
  LogoutResult,
  RefreshTokenResult
} from './types';

/**
 * Request context for authentication operations
 */
export interface RequestContext {
  correlationId: string;
  clientIP: string;
  userAgent?: string;
  timestamp: Date;
}

/**
 * Authenticated request context
 */
export interface AuthenticatedContext extends RequestContext {
  session: {
    userId: string;
    email: string;
    role: 'customer' | 'expert' | 'trainer' | 'admin';
    isEmailVerified: boolean;
    isProfileCompleted: boolean;
    isApproved: boolean;
  };
}

/**
 * Main authentication service that orchestrates all auth operations
 * Uses unified session management, error handling, and validation
 */
export class AuthenticationService extends BaseService {
  /**
   * Create mock request for rate limiting
   */
  private createMockRequest(clientIP: string): NextRequest {
    return {
      headers: new Map([['x-real-ip', clientIP]])
    } as any;
  }

  /**
   * Create user response object without sensitive data
   */
  private createUserResponse(user: any) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isBanned: user.isBanned,
      isPaused: user.isPaused,
      isLocked: user.isLocked,
      bannedAt: user.bannedAt,
      pausedAt: user.pausedAt,
      lockedAt: user.lockedAt,
      lockReason: user.lockReason,
      isProfileCompleted: user.isProfileCompleted,
      isApproved: user.isApproved,
      approvedAt: user.approvedAt,
      isTrainer: user.isTrainer,
      promotedToTrainerAt: user.promotedToTrainerAt,
      promotedToTrainerBy: user.promotedToTrainerBy,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  /**
   * Register a new user
   */
  async signup(
    data: SignupData,
    context: RequestContext,
    legalAgreements?: Record<string, boolean>
  ): Promise<ServiceResult<SignupResult>> {
    return withServiceErrorHandler(async () => {
      // Validate input using unified validation
      const validationResult = ValidationService.validateSignup(data);
      if (!validationResult.success) {
        const validationError = ValidationError.invalidInput('Validation failed', validationResult.errors, context.correlationId);
        auditAuth({
          event: 'auth.signup.failed',
          email: data.email,
          ip: context.clientIP,
          requestId: context.correlationId,
          correlationId: context.correlationId,
          errorCode: validationError.code,
          severity: SecuritySeverity.LOW
        });
        return createServiceError(validationError);
      }

      const validatedData = validationResult.data!;

      // Check rate limit
      const mockRequest = this.createMockRequest(context.clientIP);
      const rateLimitResult = checkRateLimit(mockRequest, RATE_LIMIT_CONFIGS.SIGNUP, 'signup');
      if (!rateLimitResult.success) {
        const rateLimitError = AuthenticationError.rateLimited(
          'Too many signup attempts. Please try again later.',
          rateLimitResult.retryAfter,
          context.correlationId
        );
        auditAuth({
          event: 'auth.signup.failed',
          email: validatedData.email,
          ip: context.clientIP,
          requestId: context.correlationId,
          correlationId: context.correlationId,
          errorCode: rateLimitError.code,
          severity: SecuritySeverity.MEDIUM
        });

        // Record security event for rate limiting
        securityMonitor.recordEvent({
          type: SecurityEventType.RATE_LIMIT_EXCEEDED,
          severity: SecuritySeverity.MEDIUM,
          ip: context.clientIP,
          requestId: context.correlationId,
          details: { endpoint: 'signup', attempts: rateLimitResult.retryAfter }
        });
        return createServiceError(rateLimitError);
      }

      // Check if user already exists
      const existingUser = await userRepository.findByEmail(validatedData.email);
      if (existingUser) {
        const duplicateError = ValidationError.duplicateValue(
          'email',
          'An account with this email already exists.',
          context.correlationId
        );
        auditAuth({
          event: 'auth.signup.failed',
          email: validatedData.email,
          ip: context.clientIP,
          requestId: context.correlationId,
          errorCode: duplicateError.code
        });
        return createServiceError(duplicateError);
      }

      // Hash password
      const passwordHash = await hashPassword(validatedData.password);

      // Create user
      const user = await userRepository.create({
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        passwordHash,
        role: validatedData.role
      });

      // Handle legal agreements for both experts and customers
      if (legalAgreements) {
        const acceptedAgreements: LegalAgreementAcceptance[] = [];

        // Check which agreements were accepted
        Object.entries(legalAgreements).forEach(([agreementType, accepted]) => {
          if (accepted) {
            // Expert agreements
            if (validatedData.role === 'expert' && (
              agreementType === 'NDA' ||
              agreementType === 'CONTRACTOR_AGREEMENT' ||
              agreementType === 'BACKGROUND_CHECK_CONSENT' ||
              agreementType === 'DATA_PRIVACY_AGREEMENT' ||
              agreementType === 'TERMS_OF_SERVICE' ||
              agreementType === 'CODE_OF_CONDUCT'
            )) {
              acceptedAgreements.push({
                userId: user.id,
                agreementType: agreementType as LegalDocumentType,
                ipAddress: context.clientIP,
                userAgent: context.userAgent
              });
            }
            // Customer agreements
            else if (validatedData.role === 'customer' && (
              agreementType === 'CUSTOMER_SERVICES_AGREEMENT' ||
              agreementType === 'CUSTOMER_INFORMED_CONSENT'
            )) {
              acceptedAgreements.push({
                userId: user.id,
                agreementType: agreementType as LegalDocumentType,
                ipAddress: context.clientIP,
                userAgent: context.userAgent
              });
            }
          }
        });

        // Record the agreements
        if (acceptedAgreements.length > 0) {
          const agreementResult = await legalAgreementsService.recordAgreementAcceptances(
            acceptedAgreements,
            context
          );

          if (!agreementResult.success) {
            this.logger.error('Failed to record legal agreements', {
              userId: user.id,
              error: agreementResult.error,
              correlationId: context.correlationId
            });
            // Continue with signup even if agreement recording fails
          }
        }
      }

      // Generate verification token
      const { getExpirationTime, getDisplayExpirationMinutes } = await import('../../email/verification-config');
      const verificationType = 'magic_link';
      const verificationToken = await generateEmailVerificationToken(user.id, user.email);

      // Store verification token
      await emailVerificationRepository.create({
        userId: user.id,
        token: verificationToken,
        type: 'magic_link',
        expiresAt: getExpirationTime(verificationType)
      });

      // Send verification email
      try {
        await emailService.sendVerificationEmail({
          to: user.email,
          firstName: user.firstName,
          type: verificationType,
          token: verificationToken,
          expirationMinutes: getDisplayExpirationMinutes(verificationType)
        });
      } catch (emailError) {
        // Log error but don't fail signup
        this.logger.error('Failed to send verification email', {
          error: emailError,
          userId: user.id,
          requestId: context.correlationId
        });
      }

      auditAuth({
        event: 'auth.signup.success',
        userId: user.id,
        email: user.email,
        ip: context.clientIP,
        requestId: context.correlationId,
        correlationId: context.correlationId,
        role: user.role,
        severity: SecuritySeverity.LOW
      });

      this.recordMetric('signup', true);

      return createServiceSuccess({
        user: this.createUserResponse(user),
        requiresVerification: true
      });
    }, (context as any));
  }

  /**
   * Authenticate user login
   */
  async login(data: LoginData, context: RequestContext): Promise<ServiceResult<AuthResult>> {
    return withServiceErrorHandler(async () => {
      // Validate input using unified validation
      const validationResult = ValidationService.validateLogin(data);
      if (!validationResult.success) {
        const validationError = ValidationError.invalidInput('Validation failed', validationResult.errors, context.correlationId);
        auditAuth({
          event: 'auth.login.failed',
          email: data.email,
          ip: context.clientIP,
          requestId: context.correlationId,
          correlationId: context.correlationId,
          errorCode: validationError.code,
          severity: SecuritySeverity.LOW
        });
        return createServiceError(validationError);
      }

      const validatedData = validationResult.data!;

      // Check rate limit
      const mockRequest = this.createMockRequest(context.clientIP);
      const rateLimitResult = checkRateLimit(mockRequest, RATE_LIMIT_CONFIGS.LOGIN, 'login');
      if (!rateLimitResult.success) {
        const rateLimitError = AuthenticationError.rateLimited(
          'Too many login attempts. Please try again later.',
          rateLimitResult.retryAfter,
          context.correlationId
        );
        auditAuth({
          event: 'auth.login.failed',
          email: validatedData.email,
          ip: context.clientIP,
          requestId: context.correlationId,
          correlationId: context.correlationId,
          errorCode: rateLimitError.code,
          severity: SecuritySeverity.MEDIUM
        });

        // Record security event for rate limiting
        securityMonitor.recordEvent({
          type: SecurityEventType.RATE_LIMIT_EXCEEDED,
          severity: SecuritySeverity.MEDIUM,
          ip: context.clientIP,
          requestId: context.correlationId,
          details: { endpoint: 'login', attempts: rateLimitResult.retryAfter, email: validatedData.email }
        });
        return createServiceError(rateLimitError);
      }

      // Find user
      const user = await userRepository.findByEmail(validatedData.email);
      if (!user) {
        await recordLoginFailure(context.clientIP, validatedData.email, context.correlationId);
        const authError = AuthenticationError.invalidCredentials(context.correlationId);
        auditAuth({
          event: 'auth.login.failed',
          email: validatedData.email,
          ip: context.clientIP,
          requestId: context.correlationId,
          correlationId: context.correlationId,
          errorCode: authError.code,
          severity: SecuritySeverity.MEDIUM
        });

        // Record failed login attempt for security monitoring
        recordFailedLoginAttempt({
          email: validatedData.email,
          ip: context.clientIP,
          requestId: context.correlationId,
          details: { reason: 'invalid_credentials' }
        });
        return createServiceError(authError);
      }

      // Check account status BEFORE password verification
      if (user.isLocked && user.role !== 'admin') {
        const lockedError = AuthenticationError.accountLocked(user.lockReason || 'Account locked for security reasons', context.correlationId);
        auditAuth({
          event: 'auth.login.failed',
          userId: user.id,
          email: user.email,
          ip: context.clientIP,
          requestId: context.correlationId,
          correlationId: context.correlationId,
          errorCode: lockedError.code,
          severity: SecuritySeverity.HIGH
        });

        // Record unauthorized access attempt for locked account
        recordUnauthorizedAccess({
          userId: user.id,
          email: user.email,
          ip: context.clientIP,
          requestId: context.correlationId,
          details: { reason: 'account_locked', lockReason: user.lockReason }
        });
        return createServiceError(lockedError);
      }

      // Verify password
      const isValidPassword = await verifyPassword(validatedData.password, user.passwordHash);
      if (!isValidPassword) {
        await recordLoginFailure(context.clientIP, validatedData.email, context.correlationId);

        // Check if account should be automatically locked due to excessive failures
        if (shouldLockAccount(validatedData.email) && user.role !== 'admin' && !user.isLocked) {
          const lockReason = `Account automatically locked due to excessive failed login attempts`;
          await this.lockAccount(user.id, lockReason, context);

          const lockedError = AuthenticationError.accountLocked(lockReason, context.correlationId);
          auditAuth({
            event: 'auth.account.locked',
            userId: user.id,
            email: user.email,
            ip: context.clientIP,
            requestId: context.correlationId,
            correlationId: context.correlationId,
            errorCode: lockedError.code,
            severity: SecuritySeverity.HIGH,
            metadata: { autoLocked: true, lockReason }
          });
          return createServiceError(lockedError);
        }

        const authError = AuthenticationError.invalidCredentials(context.correlationId);
        auditAuth({
          event: 'auth.login.failed',
          userId: user.id,
          email: user.email,
          ip: context.clientIP,
          requestId: context.correlationId,
          correlationId: context.correlationId,
          errorCode: authError.code,
          severity: SecuritySeverity.MEDIUM
        });

        // Record failed login attempt for security monitoring
        recordFailedLoginAttempt({
          userId: user.id,
          email: user.email,
          ip: context.clientIP,
          requestId: context.correlationId,
          details: { reason: 'unverified_email' }
        });
        return createServiceError(authError);
      }

      // Validate role access (skip for admin users or when no role specified)
      // Allow trainers to login through expert endpoint (role inheritance)
      if (validatedData.role && user.role !== 'admin') {
        const isRoleMismatch = user.role !== validatedData.role;
        const isTrainerUsingExpertLogin = user.role === 'trainer' && validatedData.role === 'expert';

        if (isRoleMismatch && !isTrainerUsingExpertLogin) {
          const authError = AuthenticationError.invalidCredentials(context.correlationId);
          auditAuth({
            event: 'auth.login.failed',
            userId: user.id,
            email: user.email,
            ip: context.clientIP,
            requestId: context.correlationId,
            correlationId: context.correlationId,
            errorCode: authError.code,
            role: validatedData.role,
            severity: SecuritySeverity.MEDIUM,
            metadata: { userRole: user.role, expectedRole: validatedData.role }
          });

          // Record unauthorized access attempt
          recordUnauthorizedAccess({
            userId: user.id,
            email: user.email,
            ip: context.clientIP,
            requestId: context.correlationId,
            details: { reason: 'role_mismatch', expectedRole: validatedData.role, actualRole: user.role }
          });
          return createServiceError(authError);
        }
      }

      if (user.role === 'expert' && user.isBanned) {
        const bannedError = AuthenticationError.accountBanned(context.correlationId);
        auditAuth({
          event: 'auth.login.failed',
          userId: user.id,
          email: user.email,
          ip: context.clientIP,
          requestId: context.correlationId,
          correlationId: context.correlationId,
          errorCode: bannedError.code,
          severity: SecuritySeverity.HIGH
        });

        // Record unauthorized access attempt for banned account
        recordUnauthorizedAccess({
          userId: user.id,
          email: user.email,
          ip: context.clientIP,
          requestId: context.correlationId,
          details: { reason: 'account_banned', role: user.role }
        });
        return createServiceError(bannedError);
      }

      if (user.role === 'customer' && user.isPaused) {
        const pausedError = AuthenticationError.accountPaused(context.correlationId);
        auditAuth({
          event: 'auth.login.failed',
          userId: user.id,
          email: user.email,
          ip: context.clientIP,
          requestId: context.correlationId,
          correlationId: context.correlationId,
          errorCode: pausedError.code,
          severity: SecuritySeverity.MEDIUM
        });

        // Record unauthorized access attempt for paused account
        recordUnauthorizedAccess({
          userId: user.id,
          email: user.email,
          ip: context.clientIP,
          requestId: context.correlationId,
          details: { reason: 'account_paused', role: user.role }
        });
        return createServiceError(pausedError);
      }

      // Create session using unified session manager
      const sessionData: SessionData = {
        userId: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isProfileCompleted: user.isProfileCompleted ?? false,
        isApproved: user.isApproved ?? false
      };

      const session = await sessionManager.createSession(sessionData);
      await recordLoginSuccess(context.clientIP, validatedData.email);

      auditAuth({
        event: 'auth.login.success',
        userId: user.id,
        email: user.email,
        ip: context.clientIP,
        requestId: context.correlationId,
        correlationId: context.correlationId,
        role: user.role,
        severity: SecuritySeverity.LOW
      });

      this.recordMetric('login', true);

      return createServiceSuccess({
        user: this.createUserResponse(user),
        accessToken: session.accessToken,
        refreshToken: session.refreshToken
      });
    }, (context as any));
  }

  /**
   * Verify email address
   */
  async verifyEmail(data: VerifyEmailData, context: RequestContext): Promise<ServiceResult<VerifyEmailResult>> {
    return withServiceErrorHandler(async () => {
      // Validate input
      const validationResult = ValidationService.validateEmailVerification(data);
      if (!validationResult.success) {
        const validationError = ValidationError.invalidInput('Validation failed', validationResult.errors, context.correlationId);
        return createServiceError(validationError);
      }

      const validatedData = validationResult.data!;

      // Find verification record
      const verification = await emailVerificationRepository.findByToken(validatedData.token);
      if (!verification) {
        const tokenError = AuthenticationError.invalidToken('Invalid or expired verification token.', context.correlationId);
        auditAuth({
          event: 'auth.email.verify.failed',
          ip: context.clientIP,
          requestId: context.correlationId,
          correlationId: context.correlationId,
          errorCode: tokenError.code,
          severity: SecuritySeverity.MEDIUM
        });

        // Record potential token manipulation
        recordTokenManipulation({
          ip: context.clientIP,
          requestId: context.correlationId,
          details: { reason: 'invalid_verification_token' }
        });
        return createServiceError(tokenError);
      }

      // Check if token is expired
      if (verification.expiresAt < new Date()) {
        const expiredError = AuthenticationError.tokenExpired(context.correlationId);
        auditAuth({
          event: 'auth.email.verify.failed',
          userId: verification.userId,
          ip: context.clientIP,
          requestId: context.correlationId,
          correlationId: context.correlationId,
          errorCode: expiredError.code,
          severity: SecuritySeverity.LOW
        });
        return createServiceError(expiredError);
      }

      // For JWT tokens (magic links), verify the token signature and payload
      if (verification.type === 'magic_link' && verification.token.includes('.')) {
        try {
          const jwtPayload = await verifyEmailVerificationToken(verification.token);

          if (!jwtPayload || jwtPayload.userId !== verification.userId) {
            const invalidError = AuthenticationError.invalidToken('Invalid verification token.', context.correlationId);
            auditAuth({
              event: 'auth.email.verify.failed',
              userId: verification.userId,
              ip: context.clientIP,
              requestId: context.correlationId,
              correlationId: context.correlationId,
              errorCode: invalidError.code,
              severity: SecuritySeverity.HIGH
            });

            // Record token manipulation attempt
            recordTokenManipulation({
              userId: verification.userId,
              ip: context.clientIP,
              requestId: context.correlationId,
              details: { reason: 'jwt_payload_mismatch', tokenType: 'email_verification' }
            });
            return createServiceError(invalidError);
          }
        } catch (jwtError) {
          const jwtInvalidError = AuthenticationError.invalidToken('Invalid verification token.', context.correlationId);
          auditAuth({
            event: 'auth.email.verify.failed',
            userId: verification.userId,
            ip: context.clientIP,
            requestId: context.correlationId,
            correlationId: context.correlationId,
            errorCode: jwtInvalidError.code,
            severity: SecuritySeverity.HIGH
          });

          // Record token manipulation attempt
          recordTokenManipulation({
            userId: verification.userId,
            ip: context.clientIP,
            requestId: context.correlationId,
            details: { reason: 'jwt_verification_failed', tokenType: 'email_verification' }
          });
          return createServiceError(jwtInvalidError);
        }
      }

      // Update user verification status
      await userRepository.verifyEmail(verification.userId);

      // Delete verification record
      await emailVerificationRepository.delete(verification.id);

      auditAuth({
        event: 'auth.email.verify.success',
        userId: verification.userId,
        ip: context.clientIP,
        requestId: context.correlationId,
        correlationId: context.correlationId,
        severity: SecuritySeverity.LOW
      });

      this.recordMetric('email_verify', true);

      return createServiceSuccess({ message: 'Email verified successfully.' });
    }, (context as any));
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string, context: RequestContext): Promise<ServiceResult<VerifyEmailResult>> {
    return withServiceErrorHandler(async () => {
      // Validate email
      const validationResult = ValidationService.validateEmailCheck({ email });
      if (!validationResult.success) {
        const validationError = ValidationError.invalidInput('Validation failed', validationResult.errors, context.correlationId);
        return createServiceError(validationError);
      }

      const validatedEmail = validationResult.data!.email;

      // Check rate limit
      const mockRequest = this.createMockRequest(context.clientIP);
      const rateLimitResult = checkRateLimit(mockRequest, RATE_LIMIT_CONFIGS.RESEND_VERIFICATION, 'resend-verify');
      if (!rateLimitResult.success) {
        const rateLimitError = AuthenticationError.rateLimited(
          'Too many verification requests. Please try again later.',
          rateLimitResult.retryAfter,
          context.correlationId
        );
        return createServiceError(rateLimitError);
      }

      // Find user
      const user = await userRepository.findByEmail(validatedEmail);
      if (!user) {
        // Don't reveal if email exists - return success anyway
        return createServiceSuccess({ message: 'If the email exists, a verification email has been sent.' });
      }

      // Check if already verified
      if (user.isEmailVerified) {
        const alreadyVerifiedError = ValidationError.invalidInput(
          'Email is already verified.',
          { email: 'Email is already verified.' },
          context.correlationId
        );
        return createServiceError(alreadyVerifiedError);
      }

      // Delete existing verification tokens
      await emailVerificationRepository.deleteByUserId(user.id);

      // Generate new verification token
      const { getExpirationTime, getDisplayExpirationMinutes } = await import('../../email/verification-config');
      const verificationType = 'magic_link';
      const verificationToken = await generateEmailVerificationToken(user.id, user.email);

      // Store verification token
      await emailVerificationRepository.create({
        userId: user.id,
        token: verificationToken,
        type: 'magic_link',
        expiresAt: getExpirationTime(verificationType)
      });

      // Send verification email
      try {
        await emailService.sendVerificationEmail({
          to: user.email,
          firstName: user.firstName,
          type: verificationType,
          token: verificationToken,
          expirationMinutes: getDisplayExpirationMinutes(verificationType)
        });
      } catch (emailError: any) {
        const serviceError = ExternalServiceError.externalApiError(
          'email',
          emailError,
          context.correlationId
        );
        this.logger.error('Failed to send verification email', {
          error: emailError,
          userId: user.id,
          requestId: context.correlationId
        });
        return createServiceError(serviceError);
      }

      auditAuth({
        event: 'auth.verification.token.generated',
        userId: user.id,
        email: user.email,
        ip: context.clientIP,
        requestId: context.correlationId,
        correlationId: context.correlationId,
        severity: SecuritySeverity.LOW
      });

      return createServiceSuccess({ message: 'Verification email sent.' });
    }, (context as any));
  }

  /**
   * Logout user (invalidate session)
   */
  async logout(context: AuthenticatedContext): Promise<ServiceResult<LogoutResult>> {
    return withServiceErrorHandler(async () => {
      // Invalidate session using unified session manager
      await sessionManager.invalidateSession(context.session.userId);

      auditAuth({
        event: 'auth.logout',
        userId: context.session.userId,
        ip: context.clientIP,
        requestId: context.correlationId,
        correlationId: context.correlationId,
        severity: SecuritySeverity.LOW
      });

      this.recordMetric('logout', true);

      return createServiceSuccess({ message: 'Logged out successfully.' });
    }, (context as any));
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string, context: RequestContext): Promise<ServiceResult<RefreshTokenResult>> {
    return withServiceErrorHandler(async () => {
      // Use unified session manager for token refresh
      const newSession = await sessionManager.refreshSession(refreshToken);

      if (!newSession) {
        const invalidError = AuthenticationError.invalidToken('Invalid refresh token', context.correlationId);
        auditAuth({
          event: 'auth.refresh.failed',
          ip: context.clientIP,
          requestId: context.correlationId,
          correlationId: context.correlationId,
          errorCode: invalidError.code,
          severity: SecuritySeverity.MEDIUM
        });

        // Record potential token manipulation
        recordTokenManipulation({
          ip: context.clientIP,
          requestId: context.correlationId,
          details: { reason: 'invalid_refresh_token' }
        });
        return createServiceError(invalidError);
      }

      // Get updated user data
      const user = await userRepository.findById(newSession.user.userId);
      if (!user) {
        const userNotFoundError = AuthenticationError.invalidCredentials(context.correlationId);
        return createServiceError(userNotFoundError);
      }

      auditAuth({
        event: 'auth.refresh.success',
        userId: newSession.user.userId,
        ip: context.clientIP,
        requestId: context.correlationId,
        correlationId: context.correlationId,
        severity: SecuritySeverity.LOW
      });

      this.recordMetric('refresh', true);

      return createServiceSuccess({
        accessToken: newSession.accessToken,
        refreshToken: newSession.refreshToken,
        user: this.createUserResponse(user)
      });
    }, (context as any));
  }

  /**
   * Refresh user session with updated profile data
   */
  async refreshUserSession(userId: string, context: RequestContext): Promise<ServiceResult<AuthResult>> {
    return withServiceErrorHandler(async () => {
      // Get updated user data
      const user = await userRepository.findById(userId);
      if (!user) {
        const userNotFoundError = AuthenticationError.invalidCredentials(context.correlationId);
        return createServiceError(userNotFoundError);
      }

      // Create new session with updated data
      const sessionData: SessionData = {
        userId: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isProfileCompleted: user.isProfileCompleted ?? false,
        isApproved: user.isApproved ?? false
      };

      const session = await sessionManager.createSession(sessionData);

      auditAuth({
        event: 'auth.refresh.success',
        userId: user.id,
        email: user.email,
        requestId: context.correlationId,
        correlationId: context.correlationId,
        severity: SecuritySeverity.LOW
      });

      return createServiceSuccess({
        user: this.createUserResponse(user),
        accessToken: session.accessToken,
        refreshToken: session.refreshToken
      });
    }, (context as any));
  }

  /**
   * Lock a user account for security reasons
   */
  async lockAccount(userId: string, reason: string, context: RequestContext): Promise<ServiceResult<{ message: string }>> {
    return withServiceErrorHandler(async () => {
      // Get user to verify they exist
      const user = await userRepository.findById(userId);
      if (!user) {
        const userNotFoundError = ValidationError.invalidInput('User not found', { userId: 'User not found' }, context.correlationId);
        return createServiceError(userNotFoundError);
      }

      // Don't lock admin accounts
      if (user.role === 'admin') {
        const adminError = ValidationError.invalidInput('Cannot lock admin accounts', { userId: 'Admin accounts cannot be locked' }, context.correlationId);
        return createServiceError(adminError);
      }

      // Update user to locked status
      await userRepository.update(userId, {
        isLocked: true,
        lockedAt: new Date(),
        lockReason: reason
      });

      // Invalidate all sessions for this user
      await sessionManager.invalidateSession(userId);

      // Send account lock notification email
      try {
        await emailService.sendAccountLockEmail({
          to: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          reason: reason,
          lockedAt: new Date(),
          supportEmail: process.env.SUPPORT_EMAIL || 'support@kavach.com'
        });
      } catch (emailError) {
        // Log email error but don't fail the account lock operation
        console.error('Failed to send account lock notification email:', emailError);

        auditAuth({
          event: 'auth.account.locked',
          userId: user.id,
          email: user.email,
          ip: context.clientIP,
          requestId: context.correlationId,
          correlationId: context.correlationId,
          severity: SecuritySeverity.MEDIUM,
          metadata: {
            lockReason: reason,
            emailNotificationFailed: true,
            emailError: emailError instanceof Error ? emailError.message : 'Unknown email error'
          }
        });
      }

      auditAuth({
        event: 'auth.account.locked',
        userId: user.id,
        email: user.email,
        ip: context.clientIP,
        requestId: context.correlationId,
        correlationId: context.correlationId,
        severity: SecuritySeverity.HIGH,
        metadata: { lockReason: reason }
      });

      return createServiceSuccess({ message: 'Account locked successfully' });
    }, (context as any));
  }

  /**
   * Unlock a user account (admin only)
   */
  async unlockAccount(userId: string, context: AuthenticatedContext): Promise<ServiceResult<{ message: string }>> {
    return withServiceErrorHandler(async () => {
      // Verify admin permissions
      if (context.session.role !== 'admin') {
        const permissionError = ValidationError.invalidInput('Insufficient permissions', { role: 'Admin role required' }, context.correlationId);
        return createServiceError(permissionError);
      }

      // Get user to verify they exist
      const user = await userRepository.findById(userId);
      if (!user) {
        const userNotFoundError = ValidationError.invalidInput('User not found', { userId: 'User not found' }, context.correlationId);
        return createServiceError(userNotFoundError);
      }

      // Check if account is actually locked
      if (!user.isLocked) {
        const notLockedError = ValidationError.invalidInput('Account is not locked', { userId: 'Account is not currently locked' }, context.correlationId);
        return createServiceError(notLockedError);
      }

      // Update user to unlocked status
      await userRepository.update(userId, {
        isLocked: false,
        lockedAt: null,
        lockReason: null
      });

      auditAuth({
        event: 'auth.account.unlocked',
        userId: user.id,
        email: user.email,
        ip: context.clientIP,
        requestId: context.correlationId,
        correlationId: context.correlationId,
        severity: SecuritySeverity.MEDIUM,
        metadata: {
          unlockedBy: context.session.userId,
          unlockedByEmail: context.session.email,
          previousLockReason: user.lockReason
        }
      });

      return createServiceSuccess({ message: 'Account unlocked successfully' });
    }, (context as any));
  }
}

// Export singleton instance
export const authenticationService = new AuthenticationService();
