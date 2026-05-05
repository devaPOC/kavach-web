import { pgTable, uuid, varchar, boolean, timestamp, index, unique } from 'drizzle-orm/pg-core';

// Super Admin users - separate from regular admins
export const superAdmins = pgTable('super_admins', {
	id: uuid('id').primaryKey().defaultRandom(),
	email: varchar('email', { length: 255 }).notNull().unique(),
	firstName: varchar('first_name', { length: 100 }).notNull(),
	lastName: varchar('last_name', { length: 100 }).notNull(),
	isActive: boolean('is_active').default(true).notNull(),
	lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
	emailIdx: index('super_admins_email_idx').on(table.email),
	isActiveIdx: index('super_admins_is_active_idx').on(table.isActive),
}));

// OTP codes for super admin authentication
export const superAdminOtpCodes = pgTable('super_admin_otp_codes', {
	id: uuid('id').primaryKey().defaultRandom(),
	superAdminId: uuid('super_admin_id').notNull().references(() => superAdmins.id, { onDelete: 'cascade' }),
	code: varchar('code', { length: 6 }).notNull(),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	usedAt: timestamp('used_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
	superAdminIdIdx: index('super_admin_otp_codes_super_admin_id_idx').on(table.superAdminId),
	expiresAtIdx: index('super_admin_otp_codes_expires_at_idx').on(table.expiresAt),
}));

// Sessions for super admin
export const superAdminSessions = pgTable('super_admin_sessions', {
	id: uuid('id').primaryKey().defaultRandom(),
	superAdminId: uuid('super_admin_id').notNull().references(() => superAdmins.id, { onDelete: 'cascade' }),
	token: varchar('token', { length: 500 }).notNull().unique(),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
	superAdminIdIdx: index('super_admin_sessions_super_admin_id_idx').on(table.superAdminId),
	tokenIdx: index('super_admin_sessions_token_idx').on(table.token),
	expiresAtIdx: index('super_admin_sessions_expires_at_idx').on(table.expiresAt),
}));

// Type exports
export type SuperAdmin = typeof superAdmins.$inferSelect;
export type NewSuperAdmin = typeof superAdmins.$inferInsert;
export type SuperAdminOtpCode = typeof superAdminOtpCodes.$inferSelect;
export type NewSuperAdminOtpCode = typeof superAdminOtpCodes.$inferInsert;
export type SuperAdminSession = typeof superAdminSessions.$inferSelect;
export type NewSuperAdminSession = typeof superAdminSessions.$inferInsert;
