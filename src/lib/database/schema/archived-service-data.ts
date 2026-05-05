import { pgTable, uuid, jsonb, timestamp, varchar, text, boolean, index } from "drizzle-orm/pg-core";

export const archivedServiceData = pgTable('archived_service_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  originalId: uuid('original_id').notNull(), // Original service request ID
  userId: uuid('user_id').notNull(), // Keep user ID for reference even if user deleted
  assignedExpertId: uuid('assigned_expert_id'), // Keep expert ID for reference
  serviceType: varchar('service_type', { length: 100 }),
  status: varchar('status', { length: 50 }).notNull(),
  priority: varchar('priority', { length: 20 }),
  title: varchar('title', { length: 255 }),
  description: text('description'),
  data: jsonb('data').notNull(),
  assignedAt: timestamp('assigned_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(), // Original creation time
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(), // Original update time
  archivedAt: timestamp('archived_at', { withTimezone: true }).defaultNow().notNull(), // When it was archived
  archiveReason: varchar('archive_reason', { length: 100 }).notNull(), // 'user_deleted' or 'auto_completed'

  // User information at time of archiving (in case user is deleted)
  customerName: varchar('customer_name', { length: 255 }),
  customerEmail: varchar('customer_email', { length: 255 }),
  expertName: varchar('expert_name', { length: 255 }),
  expertEmail: varchar('expert_email', { length: 255 })
}, (table) => ({
  originalIdIdx: index('archived_service_data_original_id_idx').on(table.originalId),
  userIdIdx: index('archived_service_data_user_id_idx').on(table.userId),
  archiveReasonIdx: index('archived_service_data_archive_reason_idx').on(table.archiveReason),
  archivedAtIdx: index('archived_service_data_archived_at_idx').on(table.archivedAt),
  serviceTypeIdx: index('archived_service_data_service_type_idx').on(table.serviceType),
}));
