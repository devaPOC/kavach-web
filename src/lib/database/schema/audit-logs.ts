import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index, inet } from 'drizzle-orm/pg-core';

/**
 * Audit Logs Table
 * Persists all audit events for security, compliance, and debugging purposes.
 * Integrates with existing auditLogger to provide database-backed audit trail.
 */
export const auditLogs = pgTable('audit_logs', {
	id: uuid('id').primaryKey().defaultRandom(),

	// Event identification
	event: varchar('event', { length: 100 }).notNull(),
	category: varchar('category', { length: 50 }).$type<'authentication' | 'authorization' | 'profile' | 'security' | 'system' | 'admin'>(),
	severity: varchar('severity', { length: 20 }).default('medium').$type<'low' | 'medium' | 'high' | 'critical'>(),

	// Actor information
	userId: uuid('user_id'), // Nullable - some events are system-generated
	userEmail: varchar('user_email', { length: 255 }),
	userRole: varchar('user_role', { length: 50 }),
	ipAddress: inet('ip_address'),
	userAgent: varchar('user_agent', { length: 500 }),

	// Request context
	requestId: uuid('request_id'),
	correlationId: uuid('correlation_id'),

	// Event details
	resource: varchar('resource', { length: 100 }),
	action: varchar('action', { length: 100 }),
	success: boolean('success'),
	errorCode: varchar('error_code', { length: 50 }),
	errorMessage: text('error_message'),
	metadata: jsonb('metadata').$type<Record<string, any>>(),

	// Timestamps
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
	eventIdx: index('audit_logs_event_idx').on(table.event),
	categoryIdx: index('audit_logs_category_idx').on(table.category),
	severityIdx: index('audit_logs_severity_idx').on(table.severity),
	userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
	createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
	userEventIdx: index('audit_logs_user_event_idx').on(table.userId, table.event),
	categoryCreatedIdx: index('audit_logs_category_created_idx').on(table.category, table.createdAt),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
