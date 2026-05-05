import { pgTable, uuid, varchar, timestamp, integer, text, index, foreignKey, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';
import { admins } from './admins';

export const awarenessSessionRequests = pgTable('awareness_session_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  requesterId: uuid('requester_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Session Details
  sessionDate: timestamp('session_date', { withTimezone: true }).notNull(),
  location: varchar('location', { length: 500 }).notNull(),
  duration: varchar('duration', { length: 50 }).notNull(), // '1_hour', '2_hours', 'half_day', 'full_day'
  subject: varchar('subject', { length: 500 }).notNull(),
  audienceSize: integer('audience_size').notNull(),
  audienceTypes: jsonb('audience_types').notNull().$type<string[]>(), // Array of audience type strings
  sessionMode: varchar('session_mode', { length: 20 }).notNull(), // 'on_site', 'online'
  specialRequirements: text('special_requirements'),

  // Organization Details
  organizationName: varchar('organization_name', { length: 200 }).notNull(),
  contactEmail: varchar('contact_email', { length: 255 }).notNull(),
  contactPhone: varchar('contact_phone', { length: 50 }).notNull(),

  // Workflow Management
  status: varchar('status', { length: 50 }).notNull().$type<'pending_admin_review' | 'forwarded_to_expert' | 'confirmed' | 'rejected' | 'expert_declined'>(),
  assignedExpertId: uuid('assigned_expert_id').references(() => users.id, { onDelete: 'set null' }),
  adminNotes: text('admin_notes'),
  expertNotes: text('expert_notes'),
  rejectionReason: text('rejection_reason'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
}, (table) => ({
  // Indexes for performance
  requesterIdIdx: index('awareness_session_requests_requester_id_idx').on(table.requesterId),
  statusIdx: index('awareness_session_requests_status_idx').on(table.status),
  assignedExpertIdIdx: index('awareness_session_requests_assigned_expert_id_idx').on(table.assignedExpertId),
  sessionDateIdx: index('awareness_session_requests_session_date_idx').on(table.sessionDate),
  createdAtIdx: index('awareness_session_requests_created_at_idx').on(table.createdAt),
  statusCreatedAtIdx: index('awareness_session_requests_status_created_at_idx').on(table.status, table.createdAt),
}));

export const awarenessSessionStatusHistory = pgTable('awareness_session_status_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionRequestId: uuid('session_request_id').notNull(),
  previousStatus: varchar('previous_status', { length: 50 }),
  newStatus: varchar('new_status', { length: 50 }).notNull(),
  changedBy: uuid('changed_by').references(() => admins.id, { onDelete: 'set null' }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // Indexes for performance
  sessionRequestIdIdx: index('awareness_session_status_history_session_request_id_idx').on(table.sessionRequestId),
  changedByIdx: index('awareness_session_status_history_changed_by_idx').on(table.changedBy),
  createdAtIdx: index('awareness_session_status_history_created_at_idx').on(table.createdAt),
  // Foreign key with custom name
  sessionRequestFk: foreignKey({
    columns: [table.sessionRequestId],
    foreignColumns: [awarenessSessionRequests.id],
    name: 'fk_session_status_history_request_id'
  }),
}));
