import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { sessionManager, cookieManager, type SessionData, type SessionResult } from './unified-session-manager';
import { sessionValidationMiddleware, type AuthenticatedContext, type RequestContext } from './session-validation-middleware';
import { logger } from '../utils/logger';

/**
 * Server-side session helpers for API routes and server components
 */

/**
 * Get current session from server-side cookies
 */
export async function getCurrentSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('auth-session');
    
    if (!sessionCookie?.value) {
      return null;
    }

    const validation = await sessionManager.validateSession(sessionCookie.value);
    return validation.isValid ? validation.session : null;
  } catch (error) {
    logger.error('Failed to get current session', { error });
    return null;
  }
}

/**
 * Create session and set cookies (for login/signup)
 */
export async function createSessionWithCookies(sessionData: SessionData): Promise<SessionResult> {
  try {
    const session = await sessionManager.createSession(sessionData);
    
    // Set cookies using Next.js cookies API
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';
    
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict' as const,
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/'
    };

    const refreshCookieOptions = {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 // 30 days in seconds
    };

    cookieStore.set('auth-session', session.accessToken, cookieOptions);
    cookieStore.set('auth-refresh', session.refreshToken, refreshCookieOptions);

    return session;
  } catch (error) {
    logger.error('Failed to create session with cookies', { error });
    throw error;
  }
}

/**
 * Update session data and refresh cookies
 */
export async function updateCurrentSession(updates: Partial<SessionData>): Promise<SessionResult | null> {
  try {
    const currentSession = await getCurrentSession();
    
    if (!currentSession) {
      throw new Error('No active session to update');
    }

    const updatedSessionData = { ...currentSession, ...updates };
    return await createSessionWithCookies(updatedSessionData);
  } catch (error) {
    logger.error('Failed to update current session', { error });
    return null;
  }
}

/**
 * Destroy current session and clear cookies
 */
export async function destroyCurrentSession(): Promise<void> {
  try {
    const currentSession = await getCurrentSession();
    
    if (currentSession) {
      await sessionManager.invalidateSession(currentSession.userId);
    }

    // Clear cookies
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';
    
    const clearOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict' as const,
      maxAge: 0,
      path: '/'
    };

    cookieStore.set('auth-session', '', clearOptions);
    cookieStore.set('auth-refresh', '', clearOptions);
  } catch (error) {
    logger.error('Failed to destroy current session', { error });
    throw error;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getCurrentSession();
  return session !== null;
}

/**
 * Check if user has required role
 */
export async function hasRole(requiredRole: string | string[]): Promise<boolean> {
  const session = await getCurrentSession();
  return sessionValidationMiddleware.hasRole(session, requiredRole);
}

/**
 * Check if user's email is verified
 */
export async function isEmailVerified(): Promise<boolean> {
  const session = await getCurrentSession();
  return sessionValidationMiddleware.isEmailVerified(session);
}

/**
 * Check if user's profile is completed
 */
export async function isProfileCompleted(): Promise<boolean> {
  const session = await getCurrentSession();
  return sessionValidationMiddleware.isProfileCompleted(session);
}

/**
 * Check if user is approved (for experts)
 */
export async function isApproved(): Promise<boolean> {
  const session = await getCurrentSession();
  return sessionValidationMiddleware.isApproved(session);
}

/**
 * API route helpers
 */

/**
 * Validate API request and return session with context
 */
export async function validateApiRequest(request: NextRequest): Promise<{
  isValid: boolean;
  session: SessionData | null;
  context: RequestContext;
  error?: string;
}> {
  return await sessionValidationMiddleware.validateApiRequest(request);
}

/**
 * Require authentication for API route
 */
export async function requireAuth(request: NextRequest): Promise<{
  session: SessionData;
  context: AuthenticatedContext;
} | NextResponse> {
  const validation = await validateApiRequest(request);
  
  if (!validation.isValid || !validation.session) {
    return NextResponse.json(
      {
        success: false,
        error: validation.error || 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED',
        timestamp: new Date().toISOString()
      },
      { status: 401 }
    );
  }

  const context = sessionValidationMiddleware.createAuthenticatedContext(
    request,
    validation.session,
    validation.context.requestId
  );

  return {
    session: validation.session,
    context
  };
}

/**
 * Require specific role for API route
 */
export async function requireRole(
  request: NextRequest,
  requiredRole: string | string[]
): Promise<{
  session: SessionData;
  context: AuthenticatedContext;
} | NextResponse> {
  const authResult = await requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  if (!sessionValidationMiddleware.hasRole(authResult.session, requiredRole)) {
    const roleText = Array.isArray(requiredRole) ? requiredRole.join(' or ') : requiredRole;
    
    return NextResponse.json(
      {
        success: false,
        error: `${roleText} role required`,
        code: 'INSUFFICIENT_PERMISSIONS',
        timestamp: new Date().toISOString()
      },
      { status: 403 }
    );
  }

  return authResult;
}

/**
 * Require email verification for API route
 */
export async function requireEmailVerification(request: NextRequest): Promise<{
  session: SessionData;
  context: AuthenticatedContext;
} | NextResponse> {
  const authResult = await requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  if (!sessionValidationMiddleware.isEmailVerified(authResult.session)) {
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

  return authResult;
}

/**
 * Require profile completion for API route
 */
export async function requireProfileCompletion(request: NextRequest): Promise<{
  session: SessionData;
  context: AuthenticatedContext;
} | NextResponse> {
  const authResult = await requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  if (!sessionValidationMiddleware.isProfileCompleted(authResult.session)) {
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

  return authResult;
}

/**
 * Middleware helpers for Next.js middleware
 */

/**
 * Process session in middleware with automatic renewal
 */
export async function processSessionInMiddleware(
  request: NextRequest,
  response: NextResponse,
  requestId?: string
): Promise<{
  response: NextResponse;
  session: SessionData | null;
  isValid: boolean;
}> {
  return await sessionValidationMiddleware.processSessionMiddleware(request, response, requestId);
}

/**
 * Get session from request (for middleware)
 */
export async function getSessionFromRequest(request: NextRequest): Promise<SessionData | null> {
  return await cookieManager.getSessionFromCookies(request);
}

/**
 * Set session cookies in response (for middleware)
 */
export function setSessionCookies(response: NextResponse, session: SessionResult): void {
  cookieManager.setAuthCookies(response, session);
}

/**
 * Clear session cookies in response (for middleware)
 */
export function clearSessionCookies(response: NextResponse): void {
  cookieManager.clearAuthCookies(response);
}

/**
 * Handle session renewal in middleware
 */
export async function handleSessionRenewal(request: NextRequest, response: NextResponse): Promise<NextResponse> {
  return await cookieManager.handleSessionRenewal(request, response);
}