import pino from 'pino';
import { ship } from './log-transport';
import { db } from '@/lib/database/connection';
import { auditLogs } from '@/lib/database/schema';

// Dedicated structured audit logger. JSON output suitable for log pipelines.
export const auditLogger = pino({
  name: 'audit',
  level: process.env.AUDIT_LOG_LEVEL || 'info',
  messageKey: 'message',
  timestamp: pino.stdTimeFunctions.isoTime
});

export type AuditEventName =
  // Authentication events
  | 'auth.signup.success'
  | 'auth.signup.failed'
  | 'auth.login.success'
  | 'auth.login.failed'
  | 'auth.logout'
  | 'auth.refresh.success'
  | 'auth.refresh.failed'
  | 'auth.email.verify.success'
  | 'auth.email.verify.failed'
  | 'auth.verification.token.generated'
  | 'auth.session.created'
  | 'auth.session.invalidated'
  | 'auth.session.expired'
  | 'auth.password.changed'
  | 'auth.account.locked'
  | 'auth.account.unlocked'
  // Profile events
  | 'profile.created'
  | 'profile.updated'
  | 'profile.deleted'
  | 'profile.approved'
  | 'profile.rejected'
  // Security events
  | 'security.suspicious.activity'
  | 'security.rate.limit.exceeded'
  | 'security.multiple.failed.attempts'
  | 'security.token.manipulation'
  | 'security.session.hijack.attempt'
  | 'security.unauthorized.access'
  // System events
  | 'system.health.check'
  | 'system.performance.degraded'
  | 'system.error.critical'
  | 'system.database.connection.lost'
  | 'system.external.service.down'
  // Admin events
  | 'admin.user.created'
  | 'admin.user.updated'
  | 'admin.user.deleted'
  | 'admin.user.banned'
  | 'admin.user.unbanned'
  | 'admin.user.paused'
  | 'admin.user.unpaused'
  // Awareness Lab events
  | 'awareness.quiz.created'
  | 'awareness.quiz.updated'
  | 'awareness.quiz.deleted'
  | 'awareness.quiz.archived'
  | 'awareness.quiz.unarchived'
  | 'awareness.quiz.cleanup'
  | 'awareness.quiz.auto_archived'
  | 'awareness.quiz.published'
  | 'awareness.quiz.unpublished'
  | 'awareness.quiz.questions.reordered'
  | 'awareness.quiz.question.duplicated'
  | 'awareness.quiz.questions.bulk_updated'
  | 'awareness.quiz.attempt.started'
  | 'awareness.quiz.attempt.submitted'
  | 'awareness.quiz.attempt.completed'
  | 'awareness.quiz.attempt.abandoned'
  | 'awareness.quiz.attempt.timeout'
  | 'awareness.quiz.validation.failed'
  | 'awareness.quiz.validation.suspicious'
  | 'awareness.quiz.session.invalid'
  | 'awareness.quiz.cheating.detected'
  | 'awareness.template.created'
  | 'awareness.template.updated'
  | 'awareness.template.deleted'
  | 'awareness.template.used'
  | 'awareness.template.duplicated'
  | 'awareness.learning.module.created'
  | 'awareness.learning.module.updated'
  | 'awareness.learning.module.deleted'
  | 'awareness.learning.module.archived'
  | 'awareness.learning.module.published'
  | 'awareness.learning.module.unpublished'
  | 'awareness.learning.material.added'
  | 'awareness.learning.material.updated'
  | 'awareness.learning.material.deleted'
  | 'awareness.learning.material.completed'
  | 'awareness.learning.material.accessed'
  | 'awareness.external.link.validated'
  | 'awareness.external.link.blocked'
  | 'awareness.csp.violation'
  | 'awareness.rate.limit.exceeded'
  | 'awareness.security.alert';

export interface AuditBase {
  event: AuditEventName;
  userId?: string;
  email?: string;
  ip?: string;
  requestId?: string;
  correlationId?: string;
  role?: string;
  success?: boolean;
  errorCode?: string;
  error?: string;
  timestamp?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: 'authentication' | 'authorization' | 'profile' | 'security' | 'system' | 'admin';
  metadata?: Record<string, any>;
  [k: string]: any;
}

export function emitAudit(event: AuditBase) {
  const scrubbed = { ...event } as Record<string, any>;

  // Add timestamp if not provided
  if (!scrubbed.timestamp) {
    scrubbed.timestamp = new Date().toISOString();
  }

  // Scrub sensitive fields
  delete scrubbed.password;
  delete scrubbed.token;
  delete scrubbed.refreshToken;
  delete scrubbed.accessToken;
  delete scrubbed.sessionToken;

  // Log with appropriate level based on severity
  const severity = event.severity || 'medium';
  switch (severity) {
    case 'critical':
      auditLogger.fatal(scrubbed);
      break;
    case 'high':
      auditLogger.error(scrubbed);
      break;
    case 'medium':
      auditLogger.warn(scrubbed);
      break;
    case 'low':
    default:
      auditLogger.info(scrubbed);
      break;
  }

  // Fire-and-forget ship to external log pipeline
  ship(scrubbed).catch(() => { });

  // Fire-and-forget persist to database
  db.insert(auditLogs).values({
    event: event.event,
    category: event.category,
    severity: event.severity || 'medium',
    userId: event.userId,
    userEmail: event.email,
    userRole: event.role,
    ipAddress: event.ip,
    userAgent: event.userAgent,
    requestId: event.requestId,
    correlationId: event.correlationId,
    resource: event.resource,
    action: event.action,
    success: event.success,
    errorCode: event.errorCode,
    errorMessage: event.error,
    metadata: event.metadata,
  }).catch((err) => {
    auditLogger.error('Failed to persist audit log to database', { error: err?.message });
  });
}

// Convenience functions for different event categories
export const auditAuth = (event: Omit<AuditBase, 'category'> & { event: Extract<AuditEventName, `auth.${string}`> }) => {
  emitAudit({ ...event, category: 'authentication' });
};

export const auditSecurity = (event: Omit<AuditBase, 'category'> & { event: Extract<AuditEventName, `security.${string}`> }) => {
  emitAudit({ ...event, category: 'security', severity: event.severity || 'high' });
};

export const auditSystem = (event: Omit<AuditBase, 'category'> & { event: Extract<AuditEventName, `system.${string}`> }) => {
  emitAudit({ ...event, category: 'system' });
};

export const auditProfile = (event: Omit<AuditBase, 'category'> & { event: Extract<AuditEventName, `profile.${string}`> }) => {
  emitAudit({ ...event, category: 'profile' });
};

export const auditAdmin = (event: Omit<AuditBase, 'category'> & { event: Extract<AuditEventName, `admin.${string}`> }) => {
  emitAudit({ ...event, category: 'admin', severity: event.severity || 'medium' });
};

export const auditAwarenessLab = (event: Omit<AuditBase, 'category'> & { event: Extract<AuditEventName, `awareness.${string}`> }) => {
  emitAudit({ ...event, category: 'security', severity: event.severity || 'medium' });
};
