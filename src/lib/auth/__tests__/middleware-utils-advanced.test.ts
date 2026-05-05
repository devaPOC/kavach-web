import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mocks
// Mock dependencies BEFORE importing module under test
vi.mock('../session-manager', () => {
  // Provide only the functions needed; avoid importing next/headers inside session-manager
  return {
    getSessionFromRequest: vi.fn(),
    setSessionCookie: vi.fn(),
    clearSessionCookie: vi.fn()
  };
});

vi.mock('../jwt-utils', () => ({
  generateToken: vi.fn().mockResolvedValue('new-token'),
  verifyToken: vi.fn(),
  isTokenExpired: vi.fn()
}));

// Use explicit relative path resolution (ts extension not required but ensure correct folder)
// Import after mocks so middleware-utils picks up mocked session-manager & jwt-utils
import { renewSessionIfNeeded, addSecurityHeaders } from '../middleware-utils';
// Pull mocked implementations
import { getSessionFromRequest, setSessionCookie, clearSessionCookie } from '../session-manager';
import { verifyToken, isTokenExpired } from '../jwt-utils';

function buildRequest(cookie?: string, headers: Record<string, string> = {}) {
  const h: Record<string, string> = { ...headers };
  if (cookie) h['cookie'] = cookie;
  return new NextRequest(new URL('http://localhost:3000/').toString(), { headers: h });
}

describe('middleware-utils advanced', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renewSessionIfNeeded returns early when no session', async () => {
    getSessionFromRequest.mockResolvedValue(null);
    const req = buildRequest();
    const res = NextResponse.next();
    const out = await renewSessionIfNeeded(req, res);
    expect(out).toBe(res);
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it('clears cookie when token invalid', async () => {
    getSessionFromRequest.mockResolvedValue({ userId: 'u', email: 'e', role: 'customer', isEmailVerified: true });
    verifyToken.mockResolvedValue(null);
    const req = buildRequest('auth-session=abc');
    const res = NextResponse.next();
    const out = await renewSessionIfNeeded(req, res);
    expect(out).toBe(res);
    expect(clearSessionCookie).toHaveBeenCalled();
  });

  it('clears cookie when token expired', async () => {
    getSessionFromRequest.mockResolvedValue({ userId: 'u', email: 'e', role: 'customer', isEmailVerified: true });
    verifyToken.mockResolvedValue({ exp: Math.floor(Date.now() / 1000) - 10 });
    isTokenExpired.mockReturnValue(true);
    const req = buildRequest('auth-session=abc');
    const res = NextResponse.next();
    await renewSessionIfNeeded(req, res);
    expect(clearSessionCookie).toHaveBeenCalled();
  });

  it('renews when within threshold', async () => {
    getSessionFromRequest.mockResolvedValue({ userId: 'u', email: 'e', role: 'customer', isEmailVerified: true });
    const exp = Math.floor(Date.now() / 1000) + 60 * 60; // 1h ahead (within 24h threshold)
    verifyToken.mockResolvedValue({ exp });
    isTokenExpired.mockReturnValue(false);
    const req = buildRequest('auth-session=abc');
    const res = NextResponse.next();
    await renewSessionIfNeeded(req, res);
    expect(setSessionCookie).toHaveBeenCalled();
  });

  it('does not renew when far from expiry', async () => {
    getSessionFromRequest.mockResolvedValue({ userId: 'u', email: 'e', role: 'customer', isEmailVerified: true });
    const exp = Math.floor(Date.now() / 1000) + (3 * 24 * 60 * 60); // 3 days
    verifyToken.mockResolvedValue({ exp });
    isTokenExpired.mockReturnValue(false);
    const req = buildRequest('auth-session=abc');
    const res = NextResponse.next();
    await renewSessionIfNeeded(req, res);
    expect(setSessionCookie).not.toHaveBeenCalled();
  });

  it('addSecurityHeaders sets CSP with nonce', () => {
    const res = addSecurityHeaders(NextResponse.next());
    const nonce = res.headers.get('X-Request-Nonce');
    expect(nonce).toBeTruthy();
    const csp = res.headers.get('Content-Security-Policy') || '';
    expect(csp).toContain(`nonce-${nonce}`);
    expect(csp).toContain("frame-ancestors 'none'");
  });
});
