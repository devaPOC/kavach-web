import { describe, it, expect } from 'vitest';
import { generateToken, generateRefreshToken, verifyToken } from '../jwt-utils';

// Placeholder unit-level test for refresh token semantics.

describe('Refresh token semantics', () => {
  const baseSession = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    email: 'rot@example.com',
    role: 'customer' as const,
    isEmailVerified: true
  };

  it('should generate distinct access and refresh tokens with appropriate tokenType claims', async () => {
    const access = await generateToken(baseSession);
    const refresh = await generateRefreshToken(baseSession);
    expect(access).not.toBe(refresh);
    const aDec = await verifyToken(access);
    const rDec = await verifyToken(refresh);
    expect(aDec?.tokenType).toBe('access');
    expect(rDec?.tokenType).toBe('refresh');
    expect(aDec?.jti).toBeDefined();
    expect(rDec?.jti).toBeDefined();
  });
});
