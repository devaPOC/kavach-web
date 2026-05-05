import { describe, it, expect, beforeEach } from 'vitest';
import { revokeJti, isJtiRevoked, clearRevoked, isJtiRevokedAsync } from '../revocation-store';

describe('revocation-store (memory)', () => {
  beforeEach(() => clearRevoked());

  it('returns false for unknown jti', () => {
    expect(isJtiRevoked('abc')).toBe(false);
  });

  it('marks jti revoked after revokeJti', async () => {
    await revokeJti('deadbeef');
    expect(isJtiRevoked('deadbeef')).toBe(true);
    expect(await isJtiRevokedAsync('deadbeef')).toBe(true);
  });

  it('ignores undefined/null', async () => {
    expect(isJtiRevoked()).toBe(false);
    expect(await isJtiRevokedAsync(undefined)).toBe(false);
  });
});
