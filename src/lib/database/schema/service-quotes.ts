import { pgTable, uuid, varchar, numeric, text, timestamp, boolean, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { admins } from './admins';
import { serviceData } from './service-data';

export const serviceQuotes = pgTable('service_quotes', {
  id: uuid('id').primaryKey().defaultRandom(),
  serviceRequestId: uuid('service_request_id').notNull().references(() => serviceData.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'set null' }),
  quoteNumber: varchar('quote_number', { length: 50 }).notNull().unique(),
  quotedPrice: numeric('quoted_price', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('INR'),
  status: varchar('status', { length: 30 }).notNull().default('pending').$type<'draft' | 'sent' | 'pending' | 'accepted' | 'rejected' | 'expired' | 'superseded'>(),
  description: text('description'),
  validUntil: timestamp('valid_until', { withTimezone: true }),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  rejectedAt: timestamp('rejected_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  serviceRequestIdIdx: index('service_quotes_service_request_id_idx').on(table.serviceRequestId),
  customerIdIdx: index('service_quotes_customer_id_idx').on(table.customerId),
  adminIdIdx: index('service_quotes_admin_id_idx').on(table.adminId),
  statusIdx: index('service_quotes_status_idx').on(table.status),
  createdAtIdx: index('service_quotes_created_at_idx').on(table.createdAt),
  customerStatusIdx: index('service_quotes_customer_status_idx').on(table.customerId, table.status),
  statusCheck: check('service_quotes_status_check', sql`status IN ('draft', 'sent', 'pending', 'accepted', 'rejected', 'expired', 'superseded')`),
}));

export const quoteNegotiations = pgTable('quote_negotiations', {
  id: uuid('id').primaryKey().defaultRandom(),
  quoteId: uuid('quote_id').notNull().references(() => serviceQuotes.id, { onDelete: 'cascade' }),
  serviceRequestId: uuid('service_request_id').notNull().references(() => serviceData.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id').notNull(), // No FK - polymorphic field (can be user or admin, determined by isFromCustomer)
  message: text('message').notNull(),
  isFromCustomer: boolean('is_from_customer').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('INR'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  quoteIdIdx: index('quote_negotiations_quote_id_idx').on(table.quoteId),
  serviceRequestIdIdx: index('quote_negotiations_service_request_id_idx').on(table.serviceRequestId),
  senderIdIdx: index('quote_negotiations_sender_id_idx').on(table.senderId),
  createdAtIdx: index('quote_negotiations_created_at_idx').on(table.createdAt),
}));

export const servicePayments = pgTable('service_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  serviceRequestId: uuid('service_request_id').notNull().references(() => serviceData.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  quoteId: uuid('quote_id').references(() => serviceQuotes.id),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('INR'),
  status: varchar('status', { length: 20 }).notNull().default('pending').$type<'pending' | 'completed' | 'failed' | 'refunded'>(),
  paymentMethod: varchar('payment_method', { length: 50 }),
  transactionId: varchar('transaction_id', { length: 100 }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  serviceRequestIdIdx: index('service_payments_service_request_id_idx').on(table.serviceRequestId),
  customerIdIdx: index('service_payments_customer_id_idx').on(table.customerId),
  quoteIdIdx: index('service_payments_quote_id_idx').on(table.quoteId),
  statusIdx: index('service_payments_status_idx').on(table.status),
  paidAtIdx: index('service_payments_paid_at_idx').on(table.paidAt),
  statusCheck: check('service_payments_status_check', sql`status IN ('pending', 'completed', 'failed', 'refunded')`),
}));

export type ServiceQuote = typeof serviceQuotes.$inferSelect;
export type NewServiceQuote = typeof serviceQuotes.$inferInsert;
export type QuoteNegotiation = typeof quoteNegotiations.$inferSelect;
export type NewQuoteNegotiation = typeof quoteNegotiations.$inferInsert;
export type ServicePayment = typeof servicePayments.$inferSelect;
export type NewServicePayment = typeof servicePayments.$inferInsert;
