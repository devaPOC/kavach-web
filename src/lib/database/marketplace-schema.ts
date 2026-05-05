/**
 * Marketplace Database Schema (for Core App Admin)
 *
 * These are the schema definitions for the marketplace database,
 * used by admin APIs in the Core App.
 */

import { pgTable, uuid, varchar, text, decimal, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

// Products table
export const marketProducts = pgTable('products', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: varchar('name', { length: 255 }).notNull(),
	slug: varchar('slug', { length: 255 }).notNull().unique(),
	description: text('description'),
	shortDescription: varchar('short_description', { length: 500 }),
	price: decimal('price', { precision: 10, scale: 2 }).notNull(),
	compareAtPrice: decimal('compare_at_price', { precision: 10, scale: 2 }),
	currency: varchar('currency', { length: 3 }).notNull().default('USD'),
	status: varchar('status', { length: 20 }).notNull().default('draft'),
	stockQuantity: integer('stock_quantity').notNull().default(0),
	lowStockThreshold: integer('low_stock_threshold').default(5),
	trackInventory: boolean('track_inventory').notNull().default(true),
	categoryId: uuid('category_id'),
	isFeatured: boolean('is_featured').notNull().default(false),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Product images table
export const marketProductImages = pgTable('product_images', {
	id: uuid('id').primaryKey().defaultRandom(),
	productId: uuid('product_id').notNull(),
	url: varchar('url', { length: 1000 }).notNull(),
	altText: varchar('alt_text', { length: 255 }),
	isPrimary: boolean('is_primary').notNull().default(false),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Orders table
export const marketOrders = pgTable('orders', {
	id: uuid('id').primaryKey().defaultRandom(),
	orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
	marketUserId: uuid('market_user_id').notNull(),
	status: varchar('status', { length: 30 }).notNull().default('pending'),
	subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
	shippingCost: decimal('shipping_cost', { precision: 10, scale: 2 }).notNull().default('0'),
	tax: decimal('tax', { precision: 10, scale: 2 }).notNull().default('0'),
	discount: decimal('discount', { precision: 10, scale: 2 }).notNull().default('0'),
	total: decimal('total', { precision: 10, scale: 2 }).notNull(),
	currency: varchar('currency', { length: 3 }).notNull().default('USD'),
	shippingAddressId: uuid('shipping_address_id'),
	shippingName: varchar('shipping_name', { length: 255 }),
	shippingAddress1: varchar('shipping_address_1', { length: 255 }),
	shippingAddress2: varchar('shipping_address_2', { length: 255 }),
	shippingCity: varchar('shipping_city', { length: 100 }),
	shippingState: varchar('shipping_state', { length: 100 }),
	shippingPostalCode: varchar('shipping_postal_code', { length: 20 }),
	shippingCountry: varchar('shipping_country', { length: 100 }),
	shippingPhone: varchar('shipping_phone', { length: 30 }),
	trackingNumber: varchar('tracking_number', { length: 100 }),
	trackingUrl: varchar('tracking_url', { length: 500 }),
	shippedAt: timestamp('shipped_at'),
	deliveredAt: timestamp('delivered_at'),
	customerNotes: text('customer_notes'),
	adminNotes: text('admin_notes'),
	itemCount: integer('item_count').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Order items table
export const marketOrderItems = pgTable('order_items', {
	id: uuid('id').primaryKey().defaultRandom(),
	orderId: uuid('order_id').notNull(),
	productId: uuid('product_id').notNull(),
	productName: varchar('product_name', { length: 255 }).notNull(),
	productSlug: varchar('product_slug', { length: 255 }),
	unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
	quantity: integer('quantity').notNull(),
	subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Market users table
export const marketUsers = pgTable('market_users', {
	id: uuid('id').primaryKey().defaultRandom(),
	email: varchar('email', { length: 255 }).notNull().unique(),
	isActive: boolean('is_active').notNull().default(true),
	lastLoginAt: timestamp('last_login_at'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Type exports
export type MarketProduct = typeof marketProducts.$inferSelect;
export type NewMarketProduct = typeof marketProducts.$inferInsert;
export type MarketProductImage = typeof marketProductImages.$inferSelect;
export type NewMarketProductImage = typeof marketProductImages.$inferInsert;
export type MarketOrder = typeof marketOrders.$inferSelect;
export type MarketOrderItem = typeof marketOrderItems.$inferSelect;
export type MarketUser = typeof marketUsers.$inferSelect;
