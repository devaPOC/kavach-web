import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, type JWTPayload, isTokenExpired, shouldRenewToken } from './jwt-utils';
import { logger } from '../utils/logger';

// Edge-compatible session data interface
export interface SessionData {
  userId: string;
  email: string;
  role: 'customer' | 'expert' | 'trainer' | 'admin';
  isEmailVerified: boolean;
  isProfileCompleted: boolean;
  isApproved: boolean;
}

export interface RequestContext {
  requestId: string;
  clientIP: string;
  userAgent: string;
  timestamp: Date;
}

export interface AuthenticatedContext extends RequestContext {
  session: SessionData;
}

export interface SessionValidationResult {
  isValid: boolean;
  session: SessionData | null;
  needsRefresh: boolean;
  error?: string;
}

/**
 * Session Validation Middleware
 * Provides unified session validation for both API routes and middleware
 */
export class SessionValidationMiddleware {
  private static instance: SessionValidationMiddleware;

  private constructor() { }

  public static getInstance(): SessionValidationMiddleware {
    if (!SessionValidationMiddleware.instance) {
      SessionValidationMiddleware.instance = new SessionValidationMiddleware();
    }
    return SessionValidationMiddleware.instance;
  }

  /**
   * Create request context from NextRequest
   */
  createRequestContext(request: NextRequest, requestId?: string): RequestContext {
    return {
      requestId: requestId || this.generateRequestId(),
      clientIP: this.getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date()
    };
  }

  /**
   * Validate session from request and return validation result (Edge-compatible)
   */
  async validateSessionFromRequest(request: NextRequest): Promise<SessionValidationResult> {
    try {
      const sessionCookie = request.cookies.get('auth-session');

      if (!sessionCookie?.value) {
        return {
          isValid: false,
          session: null,
          needsRefresh: false,
          error: 'No session cookie found'
        };
      }

      // Verify token directly without database calls (Edge-compatible)
      const payload = await verifyToken(sessionCookie.value);

      if (!payload) {
        return {
          isValid: false,
          session: null,
          needsRefresh: false,
          error: 'Invalid token'
        };
      }

      // Check if token is expired
      if (isTokenExpired(payload)) {
        return {
          isValid: false,
          session: null,
          needsRefresh: true,
          error: 'Token expired'
        };
      }

      // Check if token needs renewal
      const needsRefresh = shouldRenewToken(payload, 2 * 24 * 60 * 60 * 1000); // 2 days threshold

      // Ensure token type is access
      if (payload.tokenType && payload.tokenType !== 'access') {
        return {
          isValid: false,
          session: null,
          needsRefresh: false,
          error: 'Invalid token type'
        };
      }

      const sessionData: SessionData = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        isEmailVerified: payload.isEmailVerified,
        isProfileCompleted: payload.isProfileCompleted ?? false,
        isApproved: payload.isApproved ?? false
      };



      return {
        isValid: true,
        session: sessionData,
        needsRefresh
      };
    } catch (error) {
      logger.error('Session validation failed', { error });
      return {
        isValid: false,
        session: null,
        needsRefresh: false,
        error: 'Session validation error'
      };
    }
  }

  /**
   * Middleware function for session validation and renewal (Edge-compatible)
   */
  async processSessionMiddleware(
    request: NextRequest,
    response: NextResponse,
    requestId?: string
  ): Promise<{
    response: NextResponse;
    session: SessionData | null;
    isValid: boolean;
  }> {
    const context = this.createRequestContext(request, requestId);

    try {
      const validation = await this.validateSessionFromRequest(request);

      // Handle session renewal if needed (simplified for Edge runtime)
      let processedResponse = response;
      if (validation.isValid && validation.needsRefresh) {
        // In Edge runtime, we can't perform database operations
        // Session renewal will be handled by API routes
        logger.info('Session needs refresh', {
          userId: validation.session?.userId,
          requestId: context.requestId
        });
      } else if (!validation.isValid) {
        // Clear invalid cookies
        this.clearAuthCookies(processedResponse);
      }

      // Add request context to response headers
      processedResponse.headers.set('x-request-id', context.requestId);
      processedResponse.headers.set('x-timestamp', context.timestamp.toISOString());

      return {
        response: processedResponse,
        session: validation.session,
        isValid: validation.isValid
      };
    } catch (error) {
      logger.error('Session middleware processing failed', {
        error,
        requestId: context.requestId
      });

      // Clear cookies on error
      this.clearAuthCookies(response);
      response.headers.set('x-request-id', context.requestId);

      return {
        response,
        session: null,
        isValid: false
      };
    }
  }

  /**
   * API route helper for session validation
   */
  async validateApiRequest(request: NextRequest): Promise<{
    isValid: boolean;
    session: SessionData | null;
    context: RequestContext;
    error?: string;
  }> {
    const context = this.createRequestContext(request);

    try {
      const validation = await this.validateSessionFromRequest(request);

      return {
        isValid: validation.isValid,
        session: validation.session,
        context,
        error: validation.error
      };
    } catch (error) {
      logger.error('API session validation failed', {
        error,
        requestId: context.requestId
      });

      return {
        isValid: false,
        session: null,
        context,
        error: 'Session validation failed'
      };
    }
  }

  /**
   * Check if user has required role
   * Supports role inheritance: trainer role includes all expert permissions
   */
  hasRole(session: SessionData | null, requiredRole: string | string[]): boolean {
    if (!session) {
      return false;
    }

    const userRole = session.role;

    // Convert to array for consistent handling
    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

    // Direct role match
    if (requiredRoles.includes(userRole)) {
      return true;
    }

    // Role inheritance: trainer has all expert permissions
    if (userRole === 'trainer' && requiredRoles.includes('expert')) {
      return true;
    }

    return false;
  }

  /**
   * Check if user's email is verified
   */
  isEmailVerified(session: SessionData | null): boolean {
    return session?.isEmailVerified ?? false;
  }

  /**
   * Check if user's profile is completed
   */
  isProfileCompleted(session: SessionData | null): boolean {
    return session?.isProfileCompleted ?? false;
  }

  /**
   * Check if user is approved (for experts)
   */
  isApproved(session: SessionData | null): boolean {
    return session?.isApproved ?? false;
  }

  /**
   * Create authenticated context from session and request
   */
  createAuthenticatedContext(
    request: NextRequest,
    session: SessionData,
    requestId?: string
  ): AuthenticatedContext {
    const baseContext = this.createRequestContext(request, requestId);

    return {
      ...baseContext,
      session
    };
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }

    // Fallback for environments without crypto.randomUUID
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Extract client IP from request
   */
  private getClientIP(request: NextRequest): string {
    // Check various headers for client IP
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
      return realIP;
    }

    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    if (cfConnectingIP) {
      return cfConnectingIP;
    }

    // Fallback to unknown (request.ip not available in Edge runtime)
    return 'unknown';
  }

  /**
   * Check if token should be renewed based on expiration time
   * @deprecated Use shouldRenewToken from jwt-utils instead
   */
  private shouldRenewToken(payload: JWTPayload): boolean {
    // Use the utility function from jwt-utils
    return shouldRenewToken(payload, 2 * 24 * 60 * 60 * 1000);
  }

  /**
   * Clear authentication cookies (Edge-compatible)
   */
  private clearAuthCookies(response: NextResponse): void {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 0,
      path: '/'
    };

    response.cookies.set('auth-session', '', cookieOptions);
    response.cookies.set('auth-refresh', '', cookieOptions);
  }
}

/**
 * Utility functions for common session operations
 */

/**
 * Create unauthorized response for API routes
 */
export function createUnauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: 'UNAUTHORIZED',
      timestamp: new Date().toISOString()
    },
    { status: 401 }
  );
}

/**
 * Create forbidden response for API routes
 */
export function createForbiddenResponse(message: string = 'Forbidden'): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: 'FORBIDDEN',
      timestamp: new Date().toISOString()
    },
    { status: 403 }
  );
}

/**
 * Create session required response
 */
export function createSessionRequiredResponse(message: string = 'Authentication required'): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: 'SESSION_REQUIRED',
      timestamp: new Date().toISOString()
    },
    { status: 401 }
  );
}

/**
 * Create email verification required response
 */
export function createEmailVerificationRequiredResponse(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Email verification required',
      code: 'EMAIL_VERIFICATION_REQUIRED',
      timestamp: new Date().toISOString()
    },
    { status: 403 }
  );
}

/**
 * Create profile completion required response
 */
export function createProfileCompletionRequiredResponse(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Profile completion required',
      code: 'PROFILE_COMPLETION_REQUIRED',
      timestamp: new Date().toISOString()
    },
    { status: 403 }
  );
}

// Export singleton instance
export const sessionValidationMiddleware = SessionValidationMiddleware.getInstance();
