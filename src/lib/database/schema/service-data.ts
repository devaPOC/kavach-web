import { pgTable, uuid, jsonb, timestamp, varchar, text, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const serviceData = pgTable('service_data', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    assignedExpertId: uuid('assigned_expert_id').references(() => users.id, { onDelete: 'set null' }),
    serviceType: varchar('service_type', { length: 100 }),
    status: varchar('status', { length: 50 }).notNull().default('pending').$type<'pending' | 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'pending_closure' | 'cancelled' | 'closed' | 'rejected'>(),
    priority: varchar('priority', { length: 20 }).default('normal').$type<'low' | 'normal' | 'high' | 'urgent'>(),
    title: varchar('title', { length: 255 }),
    description: text('description'),
    data: jsonb('data').notNull(),
    assignedAt: timestamp('assigned_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    deletedBy: uuid('deleted_by')
}, (table) => ({
    userIdIdx: index('service_data_user_id_idx').on(table.userId),
    assignedExpertIdIdx: index('service_data_assigned_expert_id_idx').on(table.assignedExpertId),
    statusIdx: index('service_data_status_idx').on(table.status),
    serviceTypeIdx: index('service_data_service_type_idx').on(table.serviceType),
    createdAtIdx: index('service_data_created_at_idx').on(table.createdAt),
    userStatusIdx: index('service_data_user_status_idx').on(table.userId, table.status),
    expertStatusIdx: index('service_data_expert_status_idx').on(table.assignedExpertId, table.status),
    statusCheck: check('service_data_status_check', sql`status IN ('pending', 'assigned', 'accepted', 'in_progress', 'completed', 'pending_closure', 'cancelled', 'closed', 'rejected')`),
    priorityCheck: check('service_data_priority_check', sql`priority IS NULL OR priority IN ('low', 'normal', 'high', 'urgent')`),
    deletedAtIdx: index('service_data_deleted_at_idx').on(table.deletedAt),
}))
