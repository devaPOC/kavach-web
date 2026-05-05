import { describe, it, expect, beforeEach } from 'vitest';
import { resetMetrics, increment, getCounter, recordAuthEvent, recordRateLimit } from '../metrics';

describe('metrics', () => {
  beforeEach(() => resetMetrics());

  it('increments generic counters', () => {
    increment('test_counter');
    increment('test_counter', 2);
    expect(getCounter('test_counter')).toBe(3);
  });

  it('records auth events', () => {
    recordAuthEvent('login', true);
    recordAuthEvent('login', false);
    expect(getCounter('auth_login_success_total')).toBe(1);
    expect(getCounter('auth_login_failed_total')).toBe(1);
  });

  it('records rate limit events', () => {
    recordRateLimit('login', { blocked: false, success: true });
    recordRateLimit('login', { blocked: true, success: false });
    expect(getCounter('ratelimit_allowed_total', { id: 'login' })).toBe(1);
    expect(getCounter('ratelimit_blocked_total', { id: 'login' })).toBe(1);
  });
});
