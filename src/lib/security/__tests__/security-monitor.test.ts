import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  securityMonitor, 
  SecurityEventType, 
  SecuritySeverity,
  recordSuspiciousActivity,
  recordFailedLoginAttempt,
  recordTokenManipulation,
  recordUnauthorizedAccess
} from '../security-monitor';

// Mock audit logger
vi.mock('../../utils/audit-logger', () => ({
  auditSecurity: vi.fn()
}));

// Mock metrics
vi.mock('../../utils/metrics', () => ({
  recordSecurityEvent: vi.fn()
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}));

describe('SecurityMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear any existing state
    securityMonitor['eventHistory'].clear();
    securityMonitor['activeAlerts'].clear();
    securityMonitor['blockedIPs'].clear();
    securityMonitor['lockedAccounts'].clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('recordEvent', () => {
    it('should record a security event', () => {
      const event = {
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.MEDIUM,
        userId: 'user123',
        ip: '192.168.1.1',
        requestId: 'req123',
        details: { reason: 'test' }
      };

      securityMonitor.recordEvent(event);

      const stats = securityMonitor.getSecurityStats();
      expect(stats.eventCounts[SecurityEventType.SUSPICIOUS_ACTIVITY]).toBe(1);
    });

    it('should trigger alert when threshold is exceeded', () => {
      const event = {
        type: SecurityEventType.MULTIPLE_FAILED_ATTEMPTS,
        severity: SecuritySeverity.HIGH,
        userId: 'user123',
        email: 'test@example.com',
        ip: '192.168.1.1',
        requestId: 'req123'
      };

      // Record multiple events to trigger threshold
      for (let i = 0; i < 6; i++) {
        securityMonitor.recordEvent({ ...event, requestId: `req${i}` });
      }

      const alerts = securityMonitor.getActiveAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].eventType).toBe(SecurityEventType.MULTIPLE_FAILED_ATTEMPTS);
    });

    it('should block IP when rate limit threshold is exceeded', () => {
      const event = {
        type: SecurityEventType.RATE_LIMIT_EXCEEDED,
        severity: SecuritySeverity.MEDIUM,
        ip: '192.168.1.1',
        requestId: 'req123'
      };

      // Record multiple events to trigger IP block
      for (let i = 0; i < 11; i++) {
        securityMonitor.recordEvent({ ...event, requestId: `req${i}` });
      }

      expect(securityMonitor.isIPBlocked('192.168.1.1')).toBe(true);
    });

    it('should lock account when failed attempts threshold is exceeded', () => {
      const event = {
        type: SecurityEventType.MULTIPLE_FAILED_ATTEMPTS,
        severity: SecuritySeverity.HIGH,
        userId: 'user123',
        email: 'test@example.com',
        ip: '192.168.1.1',
        requestId: 'req123'
      };

      // Record multiple events to trigger account lock
      for (let i = 0; i < 6; i++) {
        securityMonitor.recordEvent({ ...event, requestId: `req${i}` });
      }

      expect(securityMonitor.isAccountLocked('user123')).toBe(true);
    });
  });

  describe('IP blocking', () => {
    it('should block and unblock IP addresses', () => {
      const ip = '192.168.1.1';
      
      expect(securityMonitor.isIPBlocked(ip)).toBe(false);
      
      securityMonitor.blockIP(ip, 'Test block');
      expect(securityMonitor.isIPBlocked(ip)).toBe(true);
      
      securityMonitor.unblockIP(ip);
      expect(securityMonitor.isIPBlocked(ip)).toBe(false);
    });

    it('should auto-unblock IP after duration', (done) => {
      const ip = '192.168.1.1';
      
      securityMonitor.blockIP(ip, 'Test block', 100); // 100ms duration
      expect(securityMonitor.isIPBlocked(ip)).toBe(true);
      
      setTimeout(() => {
        expect(securityMonitor.isIPBlocked(ip)).toBe(false);
        done();
      }, 150);
    });
  });

  describe('Account locking', () => {
    it('should lock and unlock accounts', () => {
      const userId = 'user123';
      
      expect(securityMonitor.isAccountLocked(userId)).toBe(false);
      
      securityMonitor.lockAccount(userId, 'Test lock');
      expect(securityMonitor.isAccountLocked(userId)).toBe(true);
      
      securityMonitor.unlockAccount(userId);
      expect(securityMonitor.isAccountLocked(userId)).toBe(false);
    });

    it('should auto-unlock account after duration', (done) => {
      const userId = 'user123';
      
      securityMonitor.lockAccount(userId, 'Test lock', 100); // 100ms duration
      expect(securityMonitor.isAccountLocked(userId)).toBe(true);
      
      setTimeout(() => {
        expect(securityMonitor.isAccountLocked(userId)).toBe(false);
        done();
      }, 150);
    });
  });

  describe('Alert management', () => {
    it('should resolve alerts', () => {
      const event = {
        type: SecurityEventType.TOKEN_MANIPULATION,
        severity: SecuritySeverity.CRITICAL,
        userId: 'user123',
        ip: '192.168.1.1',
        requestId: 'req123'
      };

      securityMonitor.recordEvent(event);
      
      const alerts = securityMonitor.getActiveAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      
      const alertId = alerts[0].id;
      securityMonitor.resolveAlert(alertId);
      
      const activeAlerts = securityMonitor.getActiveAlerts();
      expect(activeAlerts.length).toBe(0);
    });
  });

  describe('Security statistics', () => {
    it('should return accurate security statistics', () => {
      securityMonitor.blockIP('192.168.1.1', 'Test');
      securityMonitor.lockAccount('user123', 'Test');
      
      securityMonitor.recordEvent({
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.MEDIUM,
        userId: 'user123',
        ip: '192.168.1.1',
        requestId: 'req123'
      });

      const stats = securityMonitor.getSecurityStats();
      
      expect(stats.blockedIPs).toBe(1);
      expect(stats.lockedAccounts).toBe(1);
      expect(stats.eventCounts[SecurityEventType.SUSPICIOUS_ACTIVITY]).toBe(1);
    });
  });

  describe('Convenience functions', () => {
    it('should record suspicious activity', () => {
      recordSuspiciousActivity({
        userId: 'user123',
        ip: '192.168.1.1',
        requestId: 'req123',
        details: { reason: 'test' }
      });

      const stats = securityMonitor.getSecurityStats();
      expect(stats.eventCounts[SecurityEventType.SUSPICIOUS_ACTIVITY]).toBe(1);
    });

    it('should record failed login attempt', () => {
      recordFailedLoginAttempt({
        userId: 'user123',
        email: 'test@example.com',
        ip: '192.168.1.1',
        requestId: 'req123'
      });

      const stats = securityMonitor.getSecurityStats();
      expect(stats.eventCounts[SecurityEventType.MULTIPLE_FAILED_ATTEMPTS]).toBe(1);
    });

    it('should record token manipulation', () => {
      recordTokenManipulation({
        userId: 'user123',
        ip: '192.168.1.1',
        requestId: 'req123',
        details: { tokenType: 'access' }
      });

      const stats = securityMonitor.getSecurityStats();
      expect(stats.eventCounts[SecurityEventType.TOKEN_MANIPULATION]).toBe(1);
    });

    it('should record unauthorized access', () => {
      recordUnauthorizedAccess({
        userId: 'user123',
        ip: '192.168.1.1',
        requestId: 'req123',
        details: { resource: 'admin' }
      });

      const stats = securityMonitor.getSecurityStats();
      expect(stats.eventCounts[SecurityEventType.UNAUTHORIZED_ACCESS]).toBe(1);
    });
  });
});