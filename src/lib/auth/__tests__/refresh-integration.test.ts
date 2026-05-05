import { describe, it, expect } from 'vitest';
import { generateToken, generateRefreshToken } from '../jwt-utils';
// NOTE: This is a lightweight integration-style test focusing on negative paths for refresh semantics.
// In a full environment we'd simulate NextRequest/Response; here we validate helper behavior and token type enforcement.

describe('Refresh route negative semantics', () => {
  const baseSession = {
    userId: '123e4567-e89b-12d3-a456-426614174111',
    email: 'neg@example.com',
    role: 'customer' as const,
    isEmailVerified: true
  };

  it('should not treat access token as refresh (simulate rotateRefreshToken guard)', async () => {
    const access = await generateToken(baseSession);
    // rotateRefreshToken fetches cookie internally; here we just ensure access token has correct claim
    // since direct invocation relies on cookie store, we focus on claim difference
    const parts = access.split('.');
    expect(parts.length).toBe(3);
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    expect(payload.tokenType).toBe('access');
  });

  it('refresh token has refresh tokenType', async () => {
    const refresh = await generateRefreshToken(baseSession);
    const payload = JSON.parse(Buffer.from(refresh.split('.')[1], 'base64url').toString('utf8'));
    expect(payload.tokenType).toBe('refresh');
  });
});
