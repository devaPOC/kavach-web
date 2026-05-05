import { pgTable, uuid, varchar, numeric, boolean, text, timestamp, index } from 'drizzle-orm/pg-core';
import { admins } from './admins';

// NOTE: Remember to run db:generate and db:push to materialize new columns/indexes.
export const servicePricing = pgTable('service_pricing', {
  id: uuid('id').primaryKey().defaultRandom(),
  serviceType: varchar('service_type', { length: 100 }).notNull().unique(),
  pricingType: varchar('pricing_type', { length: 20 }).notNull(), // 'fixed', 'variable', 'quote_required'
  fixedPrice: numeric('fixed_price', { precision: 10, scale: 2 }),
  minPrice: numeric('min_price', { precision: 10, scale: 2 }),
  maxPrice: numeric('max_price', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 3 }).notNull().default('OMR'),
  isActive: boolean('is_active').notNull().default(true),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => admins.id, { onDelete: 'set null' }),
  updatedBy: uuid('updated_by').references(() => admins.id, { onDelete: 'set null' }),
}, (table) => {
  return {
    // Unique on serviceType already exists; index on isActive helps list queries
    isActiveIdx: index('service_pricing_is_active_idx').on(table.isActive),
    // Optional: index serviceType for faster lookups (in addition to unique constraint)
    serviceTypeIdx: index('service_pricing_service_type_idx').on(table.serviceType),
  };
});

export type ServicePricing = typeof servicePricing.$inferSelect;
export type NewServicePricing = typeof servicePricing.$inferInsert;
