import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock the middleware dependencies
vi.mock('../session-validation-middleware', () => ({
  sessionValidationMiddleware: {
    createRequestContext: vi.fn(() => ({
      requestId: 'test-request-id',
      clientIP: '127.0.0.1',
      userAgent: 'test-agent',
      timestamp: new Date()
    })),
    processSessionMiddleware: vi.fn(() => Promise.resolve({
      response: NextResponse.next(),
      session: null,
      isValid: false
    })),
    isEmailVerified: vi.fn(() => false),
    isProfileCompleted: vi.fn(() => false),
    isApproved: vi.fn(() => false)
  }
}));

vi.mock('../rate-limiter', () => ({
  rateLimiters: {
    login: vi.fn(() => ({ success: true, remaining: 5, resetTime: Date.now() + 900000 })),
    signup: vi.fn(() => ({ success: true, remaining: 3, resetTime: Date.now() + 3600000 })),
    adminLogin: vi.fn(() => ({ success: true, remaining: 3, resetTime: Date.now() + 900000 }))
  },
  getRateLimitHeaders: vi.fn(() => ({})),
  createRateLimitErrorResponse: vi.fn(() => ({ error: 'RATE_LIMIT_EXCEEDED', message: 'Too many attempts' }))
}));

vi.mock('../middleware-utils', () => ({
  addSecurityHeaders: vi.fn((response) => response)
}));

vi.mock('../middleware-config', () => ({
  getMiddlewareConfig: vi.fn(() => ({
    rateLimiting: { enabled: true, endpoints: ['/api/v1/auth/'] },
    logging: { logRequests: true, logSecurity: true, logLevel: 'info' },
    redirects: { preventLoops: true, maxRedirects: 3, preserveQuery: true }
  })),
  meetsRouteRequirements: vi.fn(() => ({ allowed: true }))
}));

vi.mock('../route-config', () => ({
  RouteChecker: {
    isStaticFile: vi.fn(() => false),
    isApiRoute: vi.fn(() => false)
  },
  SPECIAL_ROUTES: {
    LOGIN: '/login',
    SIGNUP: '/signup',
    ADMIN_LOGIN: '/admin/login'
  },
  getProfileRedirectUrl: vi.fn(() => '/dashboard')
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('Enhanced Middleware Security and Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add correlation headers to responses', async () => {
    const request = new NextRequest('http://localhost:3000/dashboard');
    const { middleware } = await import('../../../middleware');
    
    const response = await middleware(request);
    
    expect(response.headers.get('x-request-id')).toBeTruthy();
    expect(response.headers.get('x-correlation-id')).toBeTruthy();
    expect(response.headers.get('x-timestamp')).toBeTruthy();
  });

  it('should handle static files without processing', async () => {
    const { RouteChecker } = await import('../route-config');
    const { addSecurityHeaders } = await import('../middleware-utils');
    
    vi.mocked(RouteChecker.isStaticFile).mockReturnValue(true);
    
    const request = new NextRequest('http://localhost:3000/_next/static/test.js');
    const { middleware } = await import('../../../middleware');
    
    const response = await middleware(request);
    
    expect(response.headers.get('x-request-id')).toBeTruthy();
    expect(addSecurityHeaders).not.toHaveBeenCalled();
  });

  it('should prevent redirect loops', async () => {
    const request = new NextRequest('http://localhost:3000/login', {
      headers: { 'x-redirect-count': '3' }
    });
    
    const { middleware } = await import('../../../middleware');
    const response = await middleware(request);
    
    // Should not create additional redirects when max is reached
    expect(response.status).not.toBe(307); // Not a redirect
  });

  it('should apply rate limiting to auth endpoints', async () => {
    const { rateLimiters } = await import('../rate-limiter');
    const { getMiddlewareConfig } = await import('../middleware-config');
    
    vi.mocked(getMiddlewareConfig).mockReturnValue({
      rateLimiting: { enabled: true, endpoints: ['/api/v1/auth/'] },
      logging: { logRequests: false, logSecurity: false, logLevel: 'info' },
      redirects: { preventLoops: true, maxRedirects: 3, preserveQuery: true }
    } as any);
    
    const request = new NextRequest('http://localhost:3000/api/v1/auth/login');
    const { middleware } = await import('../../../middleware');
    
    await middleware(request);
    
    expect(rateLimiters.login).toHaveBeenCalledWith(request);
  });

  it('should handle session validation errors gracefully', async () => {
    const { sessionValidationMiddleware } = await import('../session-validation-middleware');
    
    vi.mocked(sessionValidationMiddleware.processSessionMiddleware).mockRejectedValue(
      new Error('Session validation failed')
    );
    
    const request = new NextRequest('http://localhost:3000/dashboard');
    const { middleware } = await import('../../../middleware');
    
    const response = await middleware(request);
    
    // Should not throw and should return a response
    expect(response).toBeDefined();
    expect(response.headers.get('x-request-id')).toBeTruthy();
  });

  it('should add enhanced security headers', async () => {
    const { addSecurityHeaders } = await import('../middleware-utils');
    
    const request = new NextRequest('http://localhost:3000/dashboard');
    const { middleware } = await import('../../../middleware');
    
    await middleware(request);
    
    expect(addSecurityHeaders).toHaveBeenCalled();
  });
});