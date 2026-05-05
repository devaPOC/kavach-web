import { pgTable, uuid, varchar, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const emailVerifications = pgTable('email_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: varchar('token', { length: 512 }).notNull().unique(),
  type: varchar('type', { length: 20 }).notNull().$type<'magic_link'>(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  isUsed: boolean('is_used').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('email_verifications_user_id_idx').on(table.userId),
  expiresAtIdx: index('email_verifications_expires_at_idx').on(table.expiresAt),
  isUsedExpiresAtIdx: index('email_verifications_is_used_expires_at_idx').on(table.isUsed, table.expiresAt),
}));
