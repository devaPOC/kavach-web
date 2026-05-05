import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: varchar('token', { length: 1000 }).notNull().unique(),
  tokenType: varchar('token_type', { length: 20 }).notNull().default('access'),
  // Persist JWT jti for durable revocation and correlation
  jti: uuid('jti'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('sessions_user_id_idx').on(table.userId),
  expiresAtIdx: index('sessions_expires_at_idx').on(table.expiresAt),
  userIdExpiresAtIdx: index('sessions_user_id_expires_at_idx').on(table.userId, table.expiresAt),
}));
