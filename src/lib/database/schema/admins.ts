import { pgTable, uuid, varchar, boolean, timestamp, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Regular admins table - managed by super admin
export const admins = pgTable('admins', {
	id: uuid('id').primaryKey().defaultRandom(),
	email: varchar('email', { length: 255 }).notNull().unique(),
	passwordHash: varchar('password_hash', { length: 255 }).notNull(),
	firstName: varchar('first_name', { length: 100 }).notNull(),
	lastName: varchar('last_name', { length: 100 }).notNull(),
	role: varchar('role', { length: 20 }).notNull().default('admin').$type<'admin' | 'super_admin'>(),
	isActive: boolean('is_active').default(true).notNull(),
	mustChangePassword: boolean('must_change_password').default(false).notNull(),
	lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
	deletedAt: timestamp('deleted_at', { withTimezone: true }),
	deletedBy: uuid('deleted_by'),
}, (table) => ({
	emailIdx: index('admins_email_idx').on(table.email),
	isActiveIdx: index('admins_is_active_idx').on(table.isActive),
	roleIdx: index('admins_role_idx').on(table.role),
	deletedAtIdx: index('admins_deleted_at_idx').on(table.deletedAt),
	roleCheck: check('admins_role_check', sql`role IN ('admin', 'super_admin')`),
}));

// Admin sessions
export const adminSessions = pgTable('admin_sessions', {
	id: uuid('id').primaryKey().defaultRandom(),
	adminId: uuid('admin_id').notNull().references(() => admins.id, { onDelete: 'cascade' }),
	token: varchar('token', { length: 500 }).notNull().unique(),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
	adminIdIdx: index('admin_sessions_admin_id_idx').on(table.adminId),
	tokenIdx: index('admin_sessions_token_idx').on(table.token),
	expiresAtIdx: index('admin_sessions_expires_at_idx').on(table.expiresAt),
}));

// Type exports
export type Admin = typeof admins.$inferSelect;
export type NewAdmin = typeof admins.$inferInsert;
export type AdminSession = typeof adminSessions.$inferSelect;
export type NewAdminSession = typeof adminSessions.$inferInsert;
