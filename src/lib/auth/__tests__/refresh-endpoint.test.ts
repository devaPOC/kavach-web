import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as refreshHandler } from '@/app/(backend)/api/v1/auth/refresh/route';
import { generateToken, generateRefreshToken, verifyToken } from '../jwt-utils';
import { revokeJti } from '../revocation-store';
import { userRepository } from '@/lib/database/repositories/user-repository';
import { hashPassword } from '../password-utils';

// Helper to build a NextRequest with optional cookies
function buildRequest(url: string, cookies?: Record<string, string>) {
  const headers: Record<string, string> = {};
  if (cookies) {
    const cookieHeader = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    headers['cookie'] = cookieHeader;
  }
  return new NextRequest(new URL(url, 'http://localhost:3000').toString(), { headers });
}

const REFRESH_COOKIE = 'auth-refresh';

describe('Refresh API endpoint', () => {
  let testUser: any;
  let baseSession: any;

  // Setup test user before running tests
  beforeAll(async () => {
    try {
      // Create test user with unique email
      const hashedPassword = await hashPassword('testPassword123!');
      const uniqueEmail = `refresh-test-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;
      testUser = await userRepository.create({
        email: uniqueEmail,
        firstName: 'Test',
        lastName: 'User',
        passwordHash: hashedPassword,
        role: 'customer'
      });

      baseSession = {
        userId: testUser.id,
        email: testUser.email,
        role: testUser.role,
        isEmailVerified: true
      };
    } catch (error) {
      console.error('Test user setup error:', error);
      // If database isn't available, skip the tests
      if (error instanceof Error && (
        error.message.includes('connect') ||
        error.message.includes('database') ||
        error.message.includes('connection')
      )) {
        console.warn('Database not available - some tests may be skipped');
        testUser = null;
        baseSession = {
          userId: '123e4567-e89b-12d3-a456-426614174222',
          email: 'fallback@test.com',
          role: 'customer' as const,
          isEmailVerified: true
        };
      } else {
        throw error;
      }
    }
  });

  // Clean up test user after tests
  afterAll(async () => {
    try {
      if (testUser?.id) {
        await userRepository.delete(testUser.id);
      }
    } catch (error) {
      console.log('Test user cleanup error (may be expected):', error);
    }
  });

  it('returns REFRESH_INVALID for missing refresh cookie', async () => {
    const req = buildRequest('/api/v1/auth/refresh');
    const res = await refreshHandler(req);
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.errorCode).toBe('REFRESH_INVALID');
  });

  it('returns REFRESH_INVALID when access token supplied in refresh cookie', async () => {
    const access = await generateToken(baseSession);
    const req = buildRequest('/api/v1/auth/refresh', { [REFRESH_COOKIE]: access });
    const res = await refreshHandler(req);
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.errorCode).toBe('REFRESH_INVALID');
  });

  it('successfully rotates valid refresh token producing new jti', async () => {
    if (!testUser) {
      console.warn('Skipping test - no test user available');
      return;
    }

    const refresh = await generateRefreshToken(baseSession);
    const oldPayload = await verifyToken(refresh);
    const req = buildRequest('/api/v1/auth/refresh', { [REFRESH_COOKIE]: refresh });
    const res = await refreshHandler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    expect(setCookie).toMatch(/auth-refresh=/);
    const match = setCookie?.match(/auth-refresh=([^;]+)/);
    expect(match?.[1]).toBeTruthy();
    const newPayload = await verifyToken(match![1]);
    expect(newPayload?.jti).toBeDefined();
    expect(newPayload?.jti).not.toBe(oldPayload?.jti);
  });

  it('rejects revoked refresh token', async () => {
    const refresh = await generateRefreshToken(baseSession);
    const payload = await verifyToken(refresh);
    if (payload?.jti) await revokeJti(payload.jti); // simulate prior use
    const req = buildRequest('/api/v1/auth/refresh', { [REFRESH_COOKIE]: refresh });
    const res = await refreshHandler(req);
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.errorCode).toBe('REFRESH_INVALID');
  });
});
