import { pgTable, uuid, varchar, text, timestamp, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Device tokens for push notifications
 * Stores Expo Push Tokens and device information for authenticated users
 */
export const deviceTokens = pgTable('device_tokens', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),

	// Push notification token (Expo Push Token)
	expoPushToken: varchar('expo_push_token', { length: 255 }).notNull(),

	// Device information
	deviceType: varchar('device_type', { length: 20 }).notNull(), // 'ios', 'android'
	deviceName: varchar('device_name', { length: 255 }),
	deviceModel: varchar('device_model', { length: 255 }),
	osVersion: varchar('os_version', { length: 50 }),
	appVersion: varchar('app_version', { length: 50 }),

	// Status
	isActive: boolean('is_active').notNull().default(true),
	lastUsedAt: timestamp('last_used_at', { withTimezone: true }),

	// Timestamps
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
	// Index for quick lookups by user
	userIdIdx: index('device_tokens_user_id_idx').on(table.userId),

	// Unique constraint: one token per user-device combination
	uniqueTokenIdx: uniqueIndex('device_tokens_unique_token_idx').on(table.expoPushToken),

	// Index for active tokens only
	activeTokensIdx: index('device_tokens_active_idx').on(table.userId, table.isActive),
}));

export type DeviceToken = typeof deviceTokens.$inferSelect;
export type NewDeviceToken = typeof deviceTokens.$inferInsert;
