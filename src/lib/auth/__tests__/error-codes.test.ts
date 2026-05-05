import { describe, it, expect } from 'vitest';
import { AUTH_ERROR_CODES, authError, mergeMessages } from '../error-codes';

describe('error-codes helpers', () => {
  it('authError returns shape', () => {
    const err = authError(AUTH_ERROR_CODES.INVALID_CREDENTIALS, 'Invalid');
    expect(err).toEqual({ code: AUTH_ERROR_CODES.INVALID_CREDENTIALS, message: 'Invalid', details: undefined });
  });

  it('mergeMessages deduplicates and filters empty', () => {
    const merged = mergeMessages(['a', 'b', 'a', '', 'b']);
    expect(merged).toBe('a, b');
  });

  it('AUTH_ERROR_CODES contains expected keys', () => {
    expect(Object.values(AUTH_ERROR_CODES)).toContain('RATE_LIMITED');
    expect(Object.values(AUTH_ERROR_CODES)).toContain('UNKNOWN');
  });
});
