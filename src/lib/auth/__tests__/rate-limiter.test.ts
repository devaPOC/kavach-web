import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, setRateLimitStore } from '../rate-limiter';
import { createRateLimitStore, buildMockRequest } from '../rate-limit-store';

// Focused unit tests to exercise success, block, and reset paths for checkRateLimit to raise coverage

describe('checkRateLimit (memory store)', () => {
  beforeEach(() => {
    // fresh in-memory store each test
    setRateLimitStore(createRateLimitStore());
  });

  it('allows first attempt and decrements remaining', () => {
    const req = buildMockRequest({ 'x-forwarded-for': '1.1.1.1' });
    const res = checkRateLimit(req as any, { windowMs: 1000, maxAttempts: 2 }, 'unit');
    expect(res.success).toBe(true);
    expect(res.limit).toBe(2);
    expect(res.remaining).toBe(1);
    expect(res.blocked).toBe(false);
  });

  it('blocks after exceeding attempts and sets blockedUntil when blockDurationMs provided', () => {
    const req = buildMockRequest({ 'x-forwarded-for': '2.2.2.2' });
    const cfg = { windowMs: 10_000, maxAttempts: 1, blockDurationMs: 5_000 };
    const first = checkRateLimit(req as any, cfg, 'unit');
    expect(first.success).toBe(true);
    const second = checkRateLimit(req as any, cfg, 'unit');
    expect(second.success).toBe(false);
    expect(second.blocked).toBe(true);
    expect(second.blockedUntil).toBeDefined();
    // subsequent call while blocked should keep blocked state
    const third = checkRateLimit(req as any, cfg, 'unit');
    expect(third.blocked).toBe(true);
  });

  it('resets after window passes', async () => {
    const req = buildMockRequest({ 'x-forwarded-for': '3.3.3.3' });
    const cfg = { windowMs: 30, maxAttempts: 1 };
    checkRateLimit(req as any, cfg, 'unit');
    // Wait for window to expire
    await new Promise(r => setTimeout(r, 35));
    const after = checkRateLimit(req as any, cfg, 'unit');
    expect(after.success).toBe(true);
    expect(after.remaining).toBe(0);
  });
});
