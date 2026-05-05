import { emitAudit } from '../utils/audit-logger';

interface FailRecord { count: number; first: number; last: number; email?: string; }
const loginFailMap = new Map<string, FailRecord>();
const userFailMap = new Map<string, FailRecord>(); // Track failures by email

const WINDOW_MS = 15 * 60 * 1000; // 15m window
const ALERT_THRESHOLD = 5; // consecutive failures before alert
const LOCK_THRESHOLD = 10; // consecutive failures before account lock

// Store for pending account locks to avoid circular imports
const pendingAccountLocks = new Set<string>();

export function recordLoginFailure(ip: string, email?: string, requestId?: string) {
  const now = Date.now();
  const key = ip || 'unknown';

  // Track IP-based failures
  const existing = loginFailMap.get(key);
  if (!existing || existing.first + WINDOW_MS < now) {
    loginFailMap.set(key, { count: 1, first: now, last: now, email });
  } else {
    existing.count += 1;
    existing.last = now;
    existing.email = email || existing.email;
    loginFailMap.set(key, existing);

    if (existing.count === ALERT_THRESHOLD) {
      emitAudit({ event: 'auth.login.failed', ip: key, email, success: false, error: 'threshold_reached', anomaly: true, failCount: existing.count, requestId });
      emitAudit({ event: 'auth.login.failed', ip: key, email, success: false, error: 'possible_bruteforce', anomaly: true, failCount: existing.count, requestId });
    }
  }

  // Track email-based failures for account locking
  if (email) {
    const userExisting = userFailMap.get(email);
    if (!userExisting || userExisting.first + WINDOW_MS < now) {
      userFailMap.set(email, { count: 1, first: now, last: now, email });
    } else {
      userExisting.count += 1;
      userExisting.last = now;
      userFailMap.set(email, userExisting);

      // Check if we should lock the account
      if (userExisting.count >= LOCK_THRESHOLD && !pendingAccountLocks.has(email)) {
        pendingAccountLocks.add(email);
        emitAudit({
          event: 'auth.account.locked',
          email,
          ip: key,
          success: false,
          error: 'excessive_failed_attempts',
          anomaly: true,
          failCount: userExisting.count,
          requestId
        });

        // Queue account lock (will be processed by middleware or background job)
        queueAccountLock(email, `Account locked due to ${userExisting.count} failed login attempts`);
      }
    }
  }
}

export function recordLoginSuccess(ip: string, email?: string) {
  loginFailMap.delete(ip || 'unknown');
  if (email) {
    userFailMap.delete(email);
    pendingAccountLocks.delete(email);
  }
}

export function getLoginFailureCount(ip: string): number {
  return loginFailMap.get(ip || 'unknown')?.count || 0;
}

export function getUserFailureCount(email: string): number {
  return userFailMap.get(email)?.count || 0;
}

export function shouldLockAccount(email: string): boolean {
  const failures = getUserFailureCount(email);
  return failures >= ALERT_THRESHOLD; // Lock after 5 failed attempts
}

export function cleanupAnomalies() {
  const now = Date.now();
  for (const [ip, rec] of loginFailMap.entries()) {
    if (rec.first + WINDOW_MS < now) loginFailMap.delete(ip);
  }
  for (const [email, rec] of userFailMap.entries()) {
    if (rec.first + WINDOW_MS < now) {
      userFailMap.delete(email);
      pendingAccountLocks.delete(email);
    }
  }
}

// Queue account lock function (to be called by async processes)
function queueAccountLock(email: string, reason: string) {
  // This would typically queue a background job or trigger immediate action
  // For now, we'll just emit an audit event
  emitAudit({
    event: 'auth.account.locked',
    email,
    success: false,
    error: 'excessive_failed_attempts',
    metadata: { reason, failureCount: getUserFailureCount(email) }
  });
}

setInterval(cleanupAnomalies, 5 * 60 * 1000).unref?.();
