import { pgTable, uuid, varchar, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

/**
 * Service Types Table
 * Stores all available service types in the system
 * This eliminates the circular dependency of backend importing from frontend
 */
export const serviceTypes = pgTable('service_types', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: varchar('name', { length: 255 }).notNull().unique(),
	category: varchar('category', { length: 100 }).notNull(), // 'personal', 'business', 'enterprise', etc.
	description: text('description'),
	isActive: boolean('is_active').notNull().default(true),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Quote Number Sequence Table
 * Tracks the next quote number to generate for each day
 * Using a database-backed sequence ensures atomic increment and prevents race conditions
 */
export const quoteNumberSequence = pgTable('quote_number_sequence', {
	id: uuid('id').primaryKey().defaultRandom(),
	sequenceDate: varchar('sequence_date', { length: 10 }).notNull().unique(), // Format: YYYYMMDD
	nextSequenceNumber: integer('next_sequence_number').notNull().default(1),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ServiceType = typeof serviceTypes.$inferSelect;
export type NewServiceType = typeof serviceTypes.$inferInsert;
export type QuoteNumberSequence = typeof quoteNumberSequence.$inferSelect;
export type NewQuoteNumberSequence = typeof quoteNumberSequence.$inferInsert;
