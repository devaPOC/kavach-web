import { pgTable, uuid, varchar, text, timestamp, inet, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const legalAgreements = pgTable('legal_agreements', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Agreement details
  agreementName: varchar('agreement_name', { length: 255 }).notNull(),
  agreementVersion: varchar('agreement_version', { length: 50 }).notNull().default('1.0'),
  agreementContent: text('agreement_content').notNull(),

  // Acceptance tracking
  ipAddress: inet('ip_address').notNull(),
  userAgent: varchar('user_agent', { length: 500 }),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }).defaultNow().notNull(),

  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('legal_agreements_user_id_idx').on(table.userId),
  agreementNameIdx: index('legal_agreements_agreement_name_idx').on(table.agreementName),
  acceptedAtIdx: index('legal_agreements_accepted_at_idx').on(table.acceptedAt),
}));

export type LegalAgreement = typeof legalAgreements.$inferSelect;
export type NewLegalAgreement = typeof legalAgreements.$inferInsert;
