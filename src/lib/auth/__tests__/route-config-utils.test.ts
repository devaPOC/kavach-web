import { describe, it, expect } from 'vitest';
import { RouteChecker, getRedirectUrl, SPECIAL_ROUTES, matchesRoute, ROUTE_CONFIG } from '../route-config';

describe('route-config utilities', () => {
  it('RouteChecker classification', () => {
    expect(RouteChecker.isPublic('/login')).toBe(true);
    expect(RouteChecker.isProtected('/dashboard')).toBe(true);
    expect(RouteChecker.isAdmin('/admin')).toBe(true);
    expect(RouteChecker.isProtected('/api/private/thing')).toBe(true); // api non-public
  });

  it('role specific detection and required role', () => {
    ROUTE_CONFIG.roleSpecific.customer.forEach(p => expect(RouteChecker.getRequiredRole(p)).toBe('customer'));
    ROUTE_CONFIG.roleSpecific.expert.forEach(p => expect(RouteChecker.getRequiredRole(p)).toBe('expert'));
  });

  it('email verification required', () => {
    expect(RouteChecker.requiresEmailVerification('/dashboard')).toBe(true);
    expect(RouteChecker.requiresEmailVerification('/login')).toBe(false);
  });

  it('static file and api route detection', () => {
    expect(RouteChecker.isApiRoute('/api/v1/auth/login')).toBe(true);
    expect(RouteChecker.isStaticFile('/_next/static/chunk.js')).toBe(true);
    expect(RouteChecker.isStaticFile('/image.png')).toBe(true);
    expect(RouteChecker.isStaticFile('/api/v1/auth/login')).toBe(false);
  });

  it('matchesRoute handles exact and nested', () => {
    expect(matchesRoute('/admin/dashboard', ['/admin'])).toBe(true);
    expect(matchesRoute('/adminx', ['/admin'])).toBe(false);
  });

  it('getRedirectUrl respects context and role', () => {
    expect(getRedirectUrl('admin', 'login')).toBe(SPECIAL_ROUTES.ADMIN_DASHBOARD);
    expect(getRedirectUrl('customer', 'login')).toBe(SPECIAL_ROUTES.USER_DASHBOARD);
    expect(getRedirectUrl('admin', 'unauthorized')).toBe(SPECIAL_ROUTES.ADMIN_LOGIN);
    expect(getRedirectUrl('customer', 'unauthorized')).toBe(SPECIAL_ROUTES.LOGIN);
    expect(getRedirectUrl(undefined, 'email_verification')).toBe(SPECIAL_ROUTES.VERIFY_EMAIL);
  });
});
