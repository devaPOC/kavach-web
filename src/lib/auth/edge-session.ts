// Edge-safe session helpers that avoid importing database code.
// Used only by middleware path which runs on the Edge runtime.
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from './session-manager';
import { verifyToken, generateToken, isTokenExpired, shouldRenewToken } from './jwt-utils';

const SESSION_COOKIE_NAME = 'auth-session';

export interface EdgeSessionData {
  userId: string;
  email: string;
  role: 'customer' | 'expert' | 'trainer' | 'admin';
  isEmailVerified: boolean;
  isProfileCompleted: boolean;
  isApproved: boolean;
}

function getSecureCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60, // seconds
    path: '/'
  };
}

export async function getSessionFromRequest(request: NextRequest): Promise<EdgeSessionData | null> {
  try {
    const cookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!cookie?.value) return null;
    const payload = await verifyToken(cookie.value);
    if (!payload || (payload.tokenType && payload.tokenType !== 'access')) return null;
    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      isEmailVerified: payload.isEmailVerified,
      isProfileCompleted: payload.isProfileCompleted ?? false,
      isApproved: payload.isApproved ?? false
    };
  } catch {
    return null;
  }
}

export function setSessionCookie(response: NextResponse, token: string) {
  const opts = getSecureCookieOptions();
  response.cookies.set(SESSION_COOKIE_NAME, token, opts);
}

export function clearSessionCookie(response: NextResponse) {
  const opts = getSecureCookieOptions();
  response.cookies.set(SESSION_COOKIE_NAME, '', { ...opts, maxAge: 0 });
}

export async function renewEdgeSessionIfNeeded(request: NextRequest, response: NextResponse): Promise<NextResponse> {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return response;
    const cookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!cookie?.value) return response;
    const payload = await verifyToken(cookie.value);
    if (!payload) { clearSessionCookie(response); return response; }

    // Check if token is expired
    if (isTokenExpired(payload)) {
      clearSessionCookie(response);
      return response;
    }

    // Check if token should be renewed (2 days threshold)
    if (shouldRenewToken(payload, 2 * 24 * 60 * 60 * 1000)) {
      const newToken = await generateToken({
        userId: session.userId,
        email: session.email,
        role: session.role,
        isEmailVerified: session.isEmailVerified,
        isProfileCompleted: session.isProfileCompleted,
        isApproved: session.isApproved
      });
      setSessionCookie(response, newToken);
    }
    return response;
  } catch {
    clearSessionCookie(response); return response;
  }
}
