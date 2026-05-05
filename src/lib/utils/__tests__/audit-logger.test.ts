import { describe, it, expect, vi, beforeEach } from 'vitest';
import { emitAudit } from '../audit-logger';
import * as transport from '../log-transport';

// Capture logs by spying on pino logger child emit (using transport ship mock)

describe('audit-logger', () => {
  const sink = vi.fn();
  beforeEach(() => {
    sink.mockReset();
    transport.clearSinks();
    transport.registerSink({ name: 'test', send: async (e) => { sink(e); } });
  });

  it('emits a sanitized success event and ships it', () => {
    emitAudit({ event: 'auth.login.success', userId: 'u1', email: 'user@example.com', success: true, password: 'secret' });
    expect(sink).toHaveBeenCalledTimes(1);
    const payload = sink.mock.calls[0][0];
    expect(payload.event).toBe('auth.login.success');
    expect(payload.password).toBeUndefined();
    expect(payload.success).toBe(true);
  });

  it('emits failure event with error code and scrubs sensitive fields', () => {
    emitAudit({ event: 'auth.login.failed', email: 'user@example.com', success: false, errorCode: 'INVALID_CREDENTIALS', password: 'secret' });
    const lastCall = sink.mock.calls[sink.mock.calls.length - 1];
    const payload = lastCall[0];
    expect(payload.event).toBe('auth.login.failed');
    expect(payload.password).toBeUndefined();
    expect(payload.errorCode).toBe('INVALID_CREDENTIALS');
  });
});
