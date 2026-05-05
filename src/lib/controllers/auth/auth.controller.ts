import { NextRequest, NextResponse } from 'next/server';
import { authenticationService, type RequestContext, type AuthenticatedContext } from '@/lib/services/auth';
import { userRepository } from '@/lib/database/repositories/user-repository';
import { getClientIP } from '@/lib/auth/middleware-utils';
import { cookieManager, sessionManager, type SessionResult } from '@/lib/auth/unified-session-manager';
import { createSuccessNextResponse, createErrorNextResponse, createGenericErrorNextResponse, serviceResultToNextResponse } from '@/lib/errors/response-utils';
import { getCurrentCorrelationId, setCorrelationId } from '@/lib/errors/correlation';
import { ValidationError, AuthenticationError } from '@/lib/errors/custom-errors';
import { UserRole } from '@/lib/validation/types';
import { logger } from '@/lib/utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Base controller class with common functionality
 */
export abstract class BaseController {
  /**
   * Create request context for service calls with proper correlation ID handling
   */
  protected createRequestContext(request: NextRequest): RequestContext {
    // Generate or get correlation ID
    let correlationId = getCurrentCorrelationId();
    if (!correlationId) {
      correlationId = uuidv4();
      setCorrelationId(correlationId);
    }

    const context: RequestContext = {
      correlationId,
      clientIP: getClientIP(request),
      userAgent: request.headers.get('user-agent') || undefined,
      timestamp: new Date()
    };

    // Log context creation for debugging
    logger.info('Request context created', {
      correlationId: context.correlationId,
      clientIP: context.clientIP,
      userAgent: context.userAgent
    });

    return context;
  }

  /**
   * Create authenticated request context with proper session validation
   */
  protected async createAuthenticatedContext(request: NextRequest): Promise<AuthenticatedContext | null> {
    try {
      const session = await cookieManager.getSessionFromCookies(request);
      if (!session) {
        logger.info('No session found in cookies');
        return null;
      }

      const baseContext = this.createRequestContext(request);
      const authContext: AuthenticatedContext = {
        ...baseContext,
        session
      };

      logger.info('Authenticated context created', {
        correlationId: authContext.correlationId,
        userId: session.userId,
        email: session.email
      });

      return authContext;
    } catch (error) {
      logger.error('Failed to create authenticated context', { error });
      return null;
    }
  }

  /**
   * Parse JSON request body safely with proper error logging
   */
  protected async parseBody<T>(request: NextRequest): Promise<T | null> {
    try {
      const body = await request.json();
      logger.info('Request body parsed successfully');
      return body;
    } catch (error) {
      logger.warn('Failed to parse request body', { error });
      return null;
    }
  }

  /**
   * Extract query parameters
   */
  protected getQueryParams(request: NextRequest): URLSearchParams {
    const { searchParams } = new URL(request.url);
    return searchParams;
  }

  /**
   * Handle unsupported HTTP methods with proper error handling
   */
  methodNotAllowed(): NextResponse {
    const correlationId = getCurrentCorrelationId() || uuidv4();
    const error = ValidationError.invalidInput('Method not allowed', undefined, correlationId);

    logger.warn('Method not allowed', { correlationId });

    return createErrorNextResponse(error, correlationId);
  }

  /**
   * Create success response with proper data handling
   */
  protected success(data: any, message?: string, statusCode: number = 200): NextResponse {
    const correlationId = getCurrentCorrelationId() || uuidv4();

    logger.info('Controller success', { statusCode, correlationId });

    return NextResponse.json({
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
      correlationId
    }, { status: statusCode });
  }

  /**
   * Create error response with proper error handling
   */
  protected error(message: string, code?: string, statusCode: number = 400): NextResponse {
    const correlationId = getCurrentCorrelationId() || uuidv4();

    logger.error('Controller error', { message, code, statusCode, correlationId });

    return createGenericErrorNextResponse(message, code as any, statusCode, correlationId);
  }

  /**
   * Validate user session from cookies using unified session management
   */
  protected async validateSession(request: NextRequest): Promise<{
    success: boolean;
    userId?: string;
    email?: string;
    role?: 'customer' | 'expert' | 'trainer' | 'admin';
    isEmailVerified?: boolean;
  }> {
    try {
      const session = await cookieManager.getSessionFromCookies(request);
      if (!session) {
        logger.info('Session validation failed: no session found');
        return { success: false };
      }

      logger.info('Session validation successful', {
        userId: session.userId,
        email: session.email,
        role: session.role
      });

      return {
        success: true,
        userId: session.userId,
        email: session.email,
        role: session.role,
        isEmailVerified: session.isEmailVerified
      };
    } catch (error) {
      logger.error('Session validation error', { error });
      return { success: false };
    }
  }

  /**
   * Validate required fields in request body
   */
  protected validateRequired<T extends Record<string, any>>(
    body: T | null,
    requiredFields: string[]
  ): { isValid: boolean; missingFields?: string[] } {
    if (!body) {
      return { isValid: false, missingFields: requiredFields };
    }

    const missingFields = requiredFields.filter(field =>
      body[field] === undefined || body[field] === null || body[field] === ''
    );

    return {
      isValid: missingFields.length === 0,
      missingFields: missingFields.length > 0 ? missingFields : undefined
    };
  }
}

/**
 * Authentication controller handling auth-related endpoints
 */
export class AuthController extends BaseController {
  /**
   * Handle user signup with proper validation and error handling
   */
  async signup(request: NextRequest): Promise<NextResponse> {
    const context = this.createRequestContext(request);

    try {
      logger.info('Signup request received', { correlationId: context.correlationId });

      const body = await this.parseBody<{
        email: string;
        firstName: string;
        lastName: string;
        password: string;
        role?: UserRole;
        agreedToTerms: boolean;
        legalAgreements?: Record<string, boolean>;
      }>(request);

      if (!body) {
        const error = ValidationError.invalidInput('Invalid request body', undefined, context.correlationId);
        logger.warn('Signup failed: invalid request body', { correlationId: context.correlationId });
        return createErrorNextResponse(error, context.correlationId);
      }

      // Ensure role is set, preserving the provided role
      const signupData = {
        ...body,
        role: body.role as UserRole
      };

      const result = await authenticationService.signup(signupData, context, body.legalAgreements);

      if (result.success) {
        logger.info('Signup successful', {
          correlationId: context.correlationId,
          email: signupData.email,
          role: signupData.role
        });
      } else {
        logger.warn('Signup failed', {
          correlationId: context.correlationId,
          error: result.error?.message
        });
      }

      return serviceResultToNextResponse(result, context.correlationId, 201);
    } catch (error) {
      logger.error('Signup error', { error, correlationId: context.correlationId });
      const internalError = ValidationError.invalidInput('Internal server error', undefined, context.correlationId);
      return createErrorNextResponse(internalError, context.correlationId);
    }
  }

  /**
   * Handle user login with unified session management and proper cookie handling
   */
  async login(request: NextRequest): Promise<NextResponse> {
    const context = this.createRequestContext(request);

    try {
      logger.info('Login request received', { correlationId: context.correlationId });

      const body = await this.parseBody<{
        email: string;
        password: string;
        role?: UserRole;
      }>(request);

      if (!body) {
        const error = ValidationError.invalidInput('Invalid request body', undefined, context.correlationId);
        logger.warn('Login failed: invalid request body', { correlationId: context.correlationId });
        return createErrorNextResponse(error, context.correlationId);
      }

      const result = await authenticationService.login(body, context);

      if (!result.success) {
        logger.warn('Login failed', {
          correlationId: context.correlationId,
          email: body.email,
          error: result.error?.message
        });
        return serviceResultToNextResponse(result, context.correlationId);
      }

      // Create response with session data
      const response = serviceResultToNextResponse(result, context.correlationId);

      // Set auth cookies using unified cookie manager
      if (result.data) {
        const sessionResult: SessionResult = {
          accessToken: result.data.accessToken,
          refreshToken: result.data.refreshToken,
          user: {
            userId: result.data.user.id,
            email: result.data.user.email,
            role: result.data.user.role,
            isEmailVerified: result.data.user.isEmailVerified,
            isProfileCompleted: result.data.user.isProfileCompleted,
            isApproved: result.data.user.isApproved
          },
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        };

        cookieManager.setAuthCookies(response, sessionResult);

        logger.info('Login successful, cookies set', {
          correlationId: context.correlationId,
          userId: result.data.user.id,
          email: result.data.user.email
        });
      }

      return response;
    } catch (error) {
      logger.error('Login error', { error, correlationId: context.correlationId });
      const internalError = ValidationError.invalidInput('Internal server error', undefined, context.correlationId);
      return createErrorNextResponse(internalError, context.correlationId);
    }
  }

  /**
   * Handle email verification with proper error handling
   */
  async verifyEmail(request: NextRequest): Promise<NextResponse> {
    const context = this.createRequestContext(request);

    try {
      logger.info('Email verification request received', { correlationId: context.correlationId });

      const body = await this.parseBody<{ token: string }>(request);

      if (!body || !body.token) {
        const error = ValidationError.invalidInput('Invalid request body or missing token', undefined, context.correlationId);
        logger.warn('Email verification failed: invalid request body', { correlationId: context.correlationId });
        return createErrorNextResponse(error, context.correlationId);
      }

      const result = await authenticationService.verifyEmail(body, context);

      if (result.success) {
        logger.info('Email verification successful', { correlationId: context.correlationId });
      } else {
        logger.warn('Email verification failed', {
          correlationId: context.correlationId,
          error: result.error?.message
        });
      }

      return serviceResultToNextResponse(result, context.correlationId);
    } catch (error) {
      logger.error('Email verification error', { error, correlationId: context.correlationId });
      const internalError = ValidationError.invalidInput('Internal server error', undefined, context.correlationId);
      return createErrorNextResponse(internalError, context.correlationId);
    }
  }

  /**
   * Handle resend verification email with proper validation
   */
  async resendVerificationEmail(request: NextRequest): Promise<NextResponse> {
    const context = this.createRequestContext(request);

    try {
      logger.info('Resend verification email request received', { correlationId: context.correlationId });

      const body = await this.parseBody<{ email: string }>(request);

      if (!body || !body.email) {
        const error = ValidationError.invalidInput('Invalid request body or missing email', undefined, context.correlationId);
        logger.warn('Resend verification failed: invalid request body', { correlationId: context.correlationId });
        return createErrorNextResponse(error, context.correlationId);
      }

      const result = await authenticationService.resendVerificationEmail(body.email, context);

      if (result.success) {
        logger.info('Resend verification email successful', {
          correlationId: context.correlationId,
          email: body.email
        });
      } else {
        logger.warn('Resend verification email failed', {
          correlationId: context.correlationId,
          email: body.email,
          error: result.error?.message
        });
      }

      return serviceResultToNextResponse(result, context.correlationId);
    } catch (error) {
      logger.error('Resend verification email error', { error, correlationId: context.correlationId });
      const internalError = ValidationError.invalidInput('Internal server error', undefined, context.correlationId);
      return createErrorNextResponse(internalError, context.correlationId);
    }
  }

  /**
   * Handle user logout with unified session invalidation and proper cookie clearing
   */
  async logout(request: NextRequest): Promise<NextResponse> {
    const context = this.createRequestContext(request);

    try {
      logger.info('Logout request received', { correlationId: context.correlationId });

      // Create authenticated context
      const authContext = await this.createAuthenticatedContext(request);
      if (!authContext) {
        const error = AuthenticationError.invalidCredentials(context.correlationId);
        logger.warn('Logout failed: authentication required', { correlationId: context.correlationId });
        return createErrorNextResponse(error, context.correlationId);
      }

      const result = await authenticationService.logout(authContext);

      if (!result.success) {
        logger.warn('Logout failed', {
          correlationId: context.correlationId,
          userId: authContext.session.userId,
          error: result.error?.message
        });
        return serviceResultToNextResponse(result, context.correlationId);
      }

      // Create response and clear auth cookies using unified cookie manager
      const response = serviceResultToNextResponse(result, context.correlationId);
      cookieManager.clearAuthCookies(response);

      logger.info('Logout successful, cookies cleared', {
        correlationId: context.correlationId,
        userId: authContext.session.userId
      });

      return response;
    } catch (error) {
      logger.error('Logout error', { error, correlationId: context.correlationId });

      // Even if logout fails, clear cookies for security
      const internalError = ValidationError.invalidInput('Internal server error', undefined, context.correlationId);
      const response = createErrorNextResponse(internalError, context.correlationId);
      cookieManager.clearAuthCookies(response);

      return response;
    }
  }

  /**
   * Handle token refresh using unified session management with proper cookie handling
   */
  async refreshToken(request: NextRequest): Promise<NextResponse> {
    const context = this.createRequestContext(request);

    try {
      logger.info('Token refresh request received', { correlationId: context.correlationId });

      // Get refresh token from cookies using unified cookie manager
      const refreshToken = cookieManager.getRefreshTokenFromCookies(request);

      if (!refreshToken) {
        const error = AuthenticationError.invalidToken('Refresh token required', context.correlationId);
        logger.warn('Token refresh failed: no refresh token', { correlationId: context.correlationId });
        return createErrorNextResponse(error, context.correlationId);
      }

      const result = await authenticationService.refreshToken(refreshToken, context);

      if (!result.success) {
        logger.warn('Token refresh failed', {
          correlationId: context.correlationId,
          error: result.error?.message
        });

        // Clear cookies on refresh failure for security
        const response = serviceResultToNextResponse(result, context.correlationId);
        cookieManager.clearAuthCookies(response);
        return response;
      }

      // Create response and set new cookies
      const response = serviceResultToNextResponse(result, context.correlationId);

      // Set new auth cookies using unified cookie manager
      if (result.data) {
        const sessionResult: SessionResult = {
          accessToken: result.data.accessToken,
          refreshToken: result.data.refreshToken,
          user: {
            userId: result.data.user.id,
            email: result.data.user.email,
            role: result.data.user.role,
            isEmailVerified: result.data.user.isEmailVerified,
            isProfileCompleted: result.data.user.isProfileCompleted,
            isApproved: result.data.user.isApproved
          },
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        };

        cookieManager.setAuthCookies(response, sessionResult);

        logger.info('Token refresh successful, new cookies set', {
          correlationId: context.correlationId,
          userId: result.data.user.id
        });
      }

      return response;
    } catch (error) {
      logger.error('Token refresh error', { error, correlationId: context.correlationId });

      // Clear cookies on error for security
      const internalError = ValidationError.invalidInput('Internal server error', undefined, context.correlationId);
      const response = createErrorNextResponse(internalError, context.correlationId);
      cookieManager.clearAuthCookies(response);

      return response;
    }
  }

  /**
   * Check if email is available for registration with proper error handling
   */
  async checkEmailAvailability(request: NextRequest): Promise<NextResponse> {
    const context = this.createRequestContext(request);

    try {
      logger.info('Email availability check request received', { correlationId: context.correlationId });

      const body = await this.parseBody<{ email: string }>(request);

      if (!body || !body.email || typeof body.email !== 'string') {
        const error = ValidationError.invalidInput('Valid email is required', undefined, context.correlationId);
        logger.warn('Email availability check failed: invalid email', { correlationId: context.correlationId });
        return createErrorNextResponse(error, context.correlationId);
      }

      // Check if email already exists
      const emailExists = await userRepository.emailExists(body.email);

      logger.info('Email availability check completed', {
        correlationId: context.correlationId,
        email: body.email,
        available: !emailExists
      });

      return createSuccessNextResponse({
        available: !emailExists,
        email: body.email
      }, undefined, context.correlationId);
    } catch (error) {
      logger.error('Email availability check error', { error, correlationId: context.correlationId });
      const internalError = ValidationError.invalidInput('Internal server error', undefined, context.correlationId);
      return createErrorNextResponse(internalError, context.correlationId);
    }
  }

  /**
   * Get current user information from session
   */
  async getCurrentUser(request: NextRequest): Promise<NextResponse> {
    const context = this.createRequestContext(request);

    try {
      logger.info('Get current user request received', { correlationId: context.correlationId });

      // Create authenticated context
      const authContext = await this.createAuthenticatedContext(request);
      if (!authContext) {
        const error = AuthenticationError.invalidCredentials(context.correlationId);
        logger.warn('Get current user failed: authentication required', { correlationId: context.correlationId });
        return createErrorNextResponse(error, context.correlationId);
      }

      // Get updated user data from database
      const user = await userRepository.findById(authContext.session.userId);
      if (!user) {
        const error = AuthenticationError.invalidCredentials(context.correlationId);
        logger.warn('Get current user failed: user not found', {
          correlationId: context.correlationId,
          userId: authContext.session.userId
        });
        return createErrorNextResponse(error, context.correlationId);
      }

      // Create user response without sensitive data
      const userResponse = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isBanned: user.isBanned,
        isPaused: user.isPaused,
        bannedAt: user.bannedAt,
        pausedAt: user.pausedAt,
        isProfileCompleted: user.isProfileCompleted,
        isApproved: user.isApproved,
        approvedAt: user.approvedAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      logger.info('Get current user successful', {
        correlationId: context.correlationId,
        userId: user.id,
        email: user.email
      });

      return createSuccessNextResponse(userResponse, undefined, context.correlationId);
    } catch (error) {
      logger.error('Get current user error', { error, correlationId: context.correlationId });
      const internalError = ValidationError.invalidInput('Internal server error', undefined, context.correlationId);
      return createErrorNextResponse(internalError, context.correlationId);
    }
  }

  /**
   * Unlock a user account (admin only)
   */
  async unlockAccount(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
      const context = await this.createAuthenticatedContext(request);
      if (!context) {
        const authError = AuthenticationError.invalidCredentials();
        logger.warn('Unlock account failed: no valid session');
        return createErrorNextResponse(authError);
      }

      logger.info('Unlock account request received', {
        correlationId: context.correlationId,
        targetUserId: userId,
        adminUserId: context.session.userId
      });

      const result = await authenticationService.unlockAccount(userId, context);

      if (!result.success) {
        logger.warn('Unlock account failed', {
          correlationId: context.correlationId,
          targetUserId: userId,
          adminUserId: context.session.userId,
          error: result.error?.message
        });
        return serviceResultToNextResponse(result, context.correlationId);
      }

      logger.info('Account unlocked successfully', {
        correlationId: context.correlationId,
        targetUserId: userId,
        unlockedBy: context.session.userId
      });

      return serviceResultToNextResponse(result, context.correlationId);
    } catch (error) {
      logger.error('Unlock account error', { error, targetUserId: userId });
      const internalError = ValidationError.invalidInput('Internal server error');
      return createErrorNextResponse(internalError);
    }
  }
}

// Export singleton instance
export const authController = new AuthController();
