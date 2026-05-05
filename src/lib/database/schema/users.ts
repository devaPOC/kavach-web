import { pgTable, uuid, varchar, boolean, timestamp, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().$type<'customer' | 'expert' | 'trainer' | 'admin'>(),
  isEmailVerified: boolean('is_email_verified').default(false).notNull(),
  isProfileCompleted: boolean('is_profile_completed').default(false).notNull(),
  isApproved: boolean('is_approved').default(true).notNull(), // Auto-approved for customers/admins, manual for experts
  isBanned: boolean('is_banned').default(false).notNull(), // For experts
  isPaused: boolean('is_paused').default(false).notNull(), // For customers
  isLocked: boolean('is_locked').default(false).notNull(), // Account locked due to security issues
  isTrainer: boolean('is_trainer').default(false).notNull(), // Trainer status
  bannedAt: timestamp('banned_at', { withTimezone: true }),
  pausedAt: timestamp('paused_at', { withTimezone: true }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  lockReason: varchar('lock_reason', { length: 255 }), // Reason for account lock
  promotedToTrainerAt: timestamp('promoted_to_trainer_at', { withTimezone: true }),
  promotedToTrainerBy: uuid('promoted_to_trainer_by'),
  passwordResetToken: varchar('password_reset_token', { length: 255 }),
  passwordResetExpires: timestamp('password_reset_expires', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by'),
}, (table) => ({
  roleIdx: index('users_role_idx').on(table.role),
  isApprovedIdx: index('users_is_approved_idx').on(table.isApproved),
  isBannedIdx: index('users_is_banned_idx').on(table.isBanned),
  isEmailVerifiedIdx: index('users_is_email_verified_idx').on(table.isEmailVerified),
  createdAtIdx: index('users_created_at_idx').on(table.createdAt),
  roleApprovedIdx: index('users_role_approved_idx').on(table.role, table.isApproved),
  deletedAtIdx: index('users_deleted_at_idx').on(table.deletedAt),
  roleCheck: check('users_role_check', sql`role IN ('customer', 'expert', 'trainer', 'admin')`),
}));
