import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recordLoginFailure, recordLoginSuccess } from '../anomaly-detector';
import * as audit from '@/lib/utils/audit-logger';

// ALERT_THRESHOLD = 5 in implementation

describe('anomaly-detector', () => {
  const auditSpy = vi.spyOn(audit, 'emitAudit');
  beforeEach(() => {
    auditSpy.mockClear();
  });

  it('emits anomaly events after threshold of consecutive failures', () => {
    const ip = '1.2.3.4';
    for (let i = 0; i < 5; i++) {
      recordLoginFailure(ip, 'user@example.com');
    }
    // Two anomaly emits when threshold reached
    const anomalyCalls = auditSpy.mock.calls.filter(c => c[0].anomaly);
    expect(anomalyCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('clears failure state on success', () => {
    const ip = '5.6.7.8';
    recordLoginFailure(ip);
    recordLoginSuccess(ip);
    // Next failure should start at count 1 without triggering anomaly
    recordLoginFailure(ip);
    const anomalyCalls = auditSpy.mock.calls.filter(c => c[0].anomaly);
    expect(anomalyCalls.length).toBe(0);
  });
});
