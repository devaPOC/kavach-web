import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { generateToken, generateRefreshToken, verifyToken } from './jwt-utils';
import { sessionRepository } from '../database/repositories/session-repository';
import { revokeJti } from './revocation-store';

// Session configuration
const SESSION_COOKIE_NAME = 'auth-session';
const REFRESH_COOKIE_NAME = 'auth-refresh';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const REFRESH_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

export interface SessionData {
  userId: string;
  email: string;
  role: 'customer' | 'expert' | 'trainer' | 'admin';
  isEmailVerified: boolean;
  isProfileCompleted: boolean;
  isApproved: boolean;
}

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  path?: string;
}


function getSecureCookieOptions(maxAge?: number): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true, // Prevent XSS attacks
    secure: isProduction, // HTTPS only in production
    sameSite: 'strict', // CSRF protection
    maxAge: maxAge || SESSION_DURATION / 1000, // Convert to seconds
    path: '/'
  };
}


export async function createSession(sessionData: SessionData): Promise<void> {
  try {
    // Generate JWT token
    const token = await generateToken(sessionData);

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, getSecureCookieOptions());

    // Generate and set refresh token (persist refresh only for durable revocation / audit)
    const refreshToken = await generateRefreshToken(sessionData);
    cookieStore.set(REFRESH_COOKIE_NAME, refreshToken, getSecureCookieOptions(REFRESH_DURATION / 1000));

    // Persist refresh token session with jti (best-effort; failures shouldn't block login)
    try {
      const refreshPayload = await verifyToken(refreshToken);
      if (refreshPayload?.exp) {
        await sessionRepository.create({
          userId: sessionData.userId,
          token: refreshToken,
          tokenType: 'refresh',
          jti: refreshPayload.jti,
          expiresAt: new Date(refreshPayload.exp * 1000)
        });
      }
    } catch (e) {
      console.error('Failed to persist refresh session', e);
    }
  } catch (error) {
    console.error('Failed to create session:', error);
    throw new Error('Session creation failed');
  }
}

export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return null;
    }

    // Verify and decode the token
    const payload = await verifyToken(sessionCookie.value);

    if (!payload) {
      return null;
    }

    // Ensure token type is access
    if (payload.tokenType && payload.tokenType !== 'access') {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      isEmailVerified: payload.isEmailVerified,
      isProfileCompleted: payload.isProfileCompleted ?? false,
      isApproved: payload.isApproved ?? false
    };
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
}


export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();

    // Clear session cookie
    cookieStore.set(SESSION_COOKIE_NAME, '', {
      ...getSecureCookieOptions(),
      maxAge: 0
    });

    // Clear refresh cookie if it exists (also delete stored session & revoke jti)
    const existingRefresh = cookieStore.get(REFRESH_COOKIE_NAME);
    if (existingRefresh?.value) {
      try {
        const payload = await verifyToken(existingRefresh.value);
        if (payload?.jti) revokeJti(payload.jti);
        await sessionRepository.deleteByToken(existingRefresh.value);
      } catch {/* ignore */ }
      cookieStore.set(REFRESH_COOKIE_NAME, '', {
        ...getSecureCookieOptions(),
        maxAge: 0
      });
    }
  } catch (error) {
    console.error('Failed to destroy session:', error);
    throw new Error('Session destruction failed');
  }
}

export async function updateSession(updates: Partial<SessionData>): Promise<void> {
  try {
    const currentSession = await getSession();

    if (!currentSession) {
      throw new Error('No active session to update');
    }

    const updatedSession = { ...currentSession, ...updates };
    await createSession(updatedSession);
  } catch (error) {
    console.error('Failed to update session:', error);
    throw new Error('Session update failed');
  }
}

/**
 * Rotate refresh token and issue new access token
 * Ensures refresh token use is single-use (basic rotation)
 */
export async function rotateRefreshToken(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const refreshCookie = cookieStore.get(REFRESH_COOKIE_NAME);
    if (!refreshCookie?.value) return null;
    const payload = await verifyToken(refreshCookie.value);
    if (!payload || payload.tokenType !== 'refresh') return null;
    // Revoke old refresh jti & delete persisted record
    try {
      if (payload.jti) revokeJti(payload.jti);
      await sessionRepository.deleteByToken(refreshCookie.value);
    } catch {/* ignore */ }
    const sessionData: SessionData = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      isEmailVerified: payload.isEmailVerified,
      isProfileCompleted: payload.isProfileCompleted ?? false,
      isApproved: payload.isApproved ?? false
    };
    // Issue new access & refresh tokens
    const newAccess = await generateToken(sessionData);
    const newRefresh = await generateRefreshToken(sessionData);
    cookieStore.set(SESSION_COOKIE_NAME, newAccess, getSecureCookieOptions());
    cookieStore.set(REFRESH_COOKIE_NAME, newRefresh, getSecureCookieOptions(REFRESH_DURATION / 1000));
    // Persist new refresh session
    try {
      const newPayload = await verifyToken(newRefresh);
      if (newPayload?.exp) {
        await sessionRepository.create({
          userId: sessionData.userId,
          token: newRefresh,
          tokenType: 'refresh',
          jti: newPayload.jti,
          expiresAt: new Date(newPayload.exp * 1000)
        });
      }
    } catch {/* ignore */ }
    return sessionData;
  } catch (e) {
    console.error('Failed to rotate refresh token', e);
    return null;
  }
}

/**
 * Check if user is authenticated
 * Utility function for middleware and API routes
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}


export async function hasRole(requiredRole: string | string[]): Promise<boolean> {
  const session = await getSession();

  if (!session) {
    return false;
  }

  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(session.role);
  }

  return session.role === requiredRole;
}


export async function isEmailVerified(): Promise<boolean> {
  const session = await getSession();
  return session?.isEmailVerified ?? false;
}

/**
 * Middleware helper functions for Next.js
 */

/**
 * Get session from request (for middleware)
 */
export async function getSessionFromRequest(request: NextRequest): Promise<SessionData | null> {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) {
      return null;
    }

    const payload = await verifyToken(sessionCookie.value);

    if (!payload) {
      return null;
    }

    if (payload.tokenType && payload.tokenType !== 'access') {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      isEmailVerified: payload.isEmailVerified,
      isProfileCompleted: payload.isProfileCompleted ?? false,
      isApproved: payload.isApproved ?? false
    };
  } catch (error) {
    console.error('Failed to get session from request:', error);
    return null;
  }
}

/**
 * Set session cookie in response (for middleware)
 */
export function setSessionCookie(response: NextResponse, token: string): void {
  const options = getSecureCookieOptions();

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    maxAge: options.maxAge,
    path: options.path
  });
}

/**
 * Clear session cookie in response (for middleware)
 */
export function clearSessionCookie(response: NextResponse): void {
  const options = getSecureCookieOptions();

  response.cookies.set(SESSION_COOKIE_NAME, '', {
    ...options,
    maxAge: 0
  });
}

/**
 * Session validation middleware helper
 * Returns session data if valid, null otherwise
 */
export async function validateSessionMiddleware(request: NextRequest): Promise<{
  isValid: boolean;
  session: SessionData | null;
  needsRefresh: boolean;
}> {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return {
      isValid: false,
      session: null,
      needsRefresh: false
    };
  }

  // Check if session needs refresh (implement token refresh logic here if needed)
  const needsRefresh = false; // Placeholder for refresh logic

  return {
    isValid: true,
    session,
    needsRefresh
  };
}
