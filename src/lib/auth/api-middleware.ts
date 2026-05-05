import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from './session-manager';
import { checkRateLimit, rateLimiters } from './rate-limiter';



export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string;
    email: string;
    role: 'customer' | 'expert' | 'admin';
    isEmailVerified: boolean;
    isProfileCompleted: boolean;
    isApproved: boolean;
  };
}

/**
 * Authentication middleware for API routes
 * Verifies user session and adds user data to request
 */
export async function withAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const session = await getSessionFromRequest(request);

      if (!session) {
        return NextResponse.json(
          { error: 'Authentication required', code: 'UNAUTHORIZED' },
          { status: 401 }
        );
      }

      // Add user data to request
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = {
        userId: session.userId,
        email: session.email,
        role: session.role,
        isEmailVerified: session.isEmailVerified,
        isProfileCompleted: session.isProfileCompleted,
        isApproved: session.isApproved
      } as AuthenticatedRequest['user'];

      return await handler(authenticatedRequest);
    } catch (error) {
      console.error('Authentication middleware error:', error);
      return NextResponse.json(
        { error: 'Authentication failed', code: 'AUTH_ERROR' },
        { status: 500 }
      );
    }
  };
}

/**
 * Role-based authorization middleware for API routes
 * Requires specific role(s) to access the endpoint
 */
export function withRole(
  roles: string | string[],
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(async (request: AuthenticatedRequest): Promise<NextResponse> => {
    const userRole = request.user?.role;

    if (!userRole) {
      return NextResponse.json(
        { error: 'User role not found', code: 'ROLE_ERROR' },
        { status: 403 }
      );
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        {
          error: `Access denied. Required role(s): ${allowedRoles.join(', ')}`,
          code: 'INSUFFICIENT_PERMISSIONS'
        },
        { status: 403 }
      );
    }

    return await handler(request);
  });
}

/**
 * Admin-only middleware for API routes
 * Shorthand for withRole('admin', handler)
 */
export function withAdmin(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withRole('admin', handler);
}

/**
 * Email verification middleware for API routes
 * Requires user to have verified email
 */
export function withEmailVerification(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(async (request: AuthenticatedRequest): Promise<NextResponse> => {
    if (!request.user?.isEmailVerified) {
      return NextResponse.json(
        { error: 'Email verification required', code: 'EMAIL_NOT_VERIFIED' },
        { status: 403 }
      );
    }

    return await handler(request);
  });
}

/**
 * Rate limiting middleware for API routes
 * Applies rate limiting based on IP address
 */
export function withRateLimit(
  config: { windowMs: number; maxAttempts: number } = { windowMs: 15 * 60 * 1000, maxAttempts: 100 },
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const result = checkRateLimit(request, { windowMs: config.windowMs, maxAttempts: config.maxAttempts }, 'api-generic');
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          resetTime: new Date(result.resetTime).toISOString(),
          remaining: result.remaining
        },
        {
          status: 429,
          headers: {
            'Retry-After': result.retryAfter ? result.retryAfter.toString() : Math.ceil((result.resetTime - Date.now()) / 1000).toString()
          }
        }
      );
    }
    return handler(request);
  };
}

/**
 * Combined middleware for common API route patterns
 */
export const apiMiddleware = {
  /**
   * Public API endpoint (no authentication required)
   */
  public: (handler: (request: NextRequest) => Promise<NextResponse>) => handler,

  /**
   * Authenticated API endpoint
   */
  auth: withAuth,

  /**
   * Admin-only API endpoint
   */
  admin: withAdmin,

  /**
   * Role-based API endpoint
   */
  role: withRole,

  /**
   * Email verification required API endpoint
   */
  verified: withEmailVerification,

  /**
   * Rate limited API endpoint
   */
  rateLimit: withRateLimit,

  /**
   * Authenticated + email verified API endpoint
   */
  authVerified: (handler: (request: AuthenticatedRequest) => Promise<NextResponse>) =>
    withEmailVerification(handler),

  /**
   * Admin + rate limited API endpoint
   */
  adminRateLimit: (
    handler: (request: AuthenticatedRequest) => Promise<NextResponse>
  ) => async (request: NextRequest) => {
    const rl = rateLimiters.adminLogin(request);
    if (!rl.success) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        resetTime: new Date(rl.resetTime).toISOString()
      }, { status: 429 });
    }
    const adminHandler = withAdmin(handler);
    return (adminHandler as any)(request as any);
  }
};

/**
 * Error response helpers for API routes
 */
export const apiErrors = {
  unauthorized: (message: string = 'Authentication required') =>
    NextResponse.json(
      { error: message, code: 'UNAUTHORIZED' },
      { status: 401 }
    ),

  forbidden: (message: string = 'Access denied') =>
    NextResponse.json(
      { error: message, code: 'FORBIDDEN' },
      { status: 403 }
    ),

  badRequest: (message: string = 'Bad request') =>
    NextResponse.json(
      { error: message, code: 'BAD_REQUEST' },
      { status: 400 }
    ),

  notFound: (message: string = 'Not found') =>
    NextResponse.json(
      { error: message, code: 'NOT_FOUND' },
      { status: 404 }
    ),

  rateLimit: (resetTime?: number) =>
    NextResponse.json(
      {
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        resetTime: resetTime ? new Date(resetTime).toISOString() : undefined
      },
      {
        status: 429,
        headers: resetTime ? {
          'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString()
        } : {}
      }
    ),

  internal: (message: string = 'Internal server error') =>
    NextResponse.json(
      { error: message, code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
};

/**
 * Success response helpers for API routes
 */
export const apiSuccess = {
  ok: (data?: any) =>
    NextResponse.json({ success: true, data }),

  created: (data?: any) =>
    NextResponse.json({ success: true, data }, { status: 201 }),

  noContent: () =>
    new NextResponse(null, { status: 204 })
};
