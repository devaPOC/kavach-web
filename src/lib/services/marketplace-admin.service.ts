/**
 * Marketplace Admin Service
 *
 * Provides admin functionality for managing the marketplace
 * from within the Core App.
 */

import { getMarketplaceDb } from '@/lib/database/marketplace-connection';
import {
	marketProducts,
	marketProductImages,
	marketOrders,
	marketOrderItems,
	marketUsers,
	type MarketProduct,
	type NewMarketProduct,
	type MarketOrder,
	type MarketUser,
} from '@/lib/database/marketplace-schema';
import { eq, desc, asc, like, or, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import { noHtmlTagsRegex, noHtmlTagsErrorMessage, sanitizeSearchInput } from '@/lib/validation/utils';

// Validation schemas
export const createProductSchema = z.object({
	name: z.string()
		.min(1, 'Name is required')
		.max(255)
		.regex(noHtmlTagsRegex, noHtmlTagsErrorMessage),
	slug: z.string().min(1, 'Slug is required').max(255).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
	description: z.string()
		.regex(noHtmlTagsRegex, noHtmlTagsErrorMessage)
		.optional()
		.or(z.literal('')),
	shortDescription: z.string()
		.max(500)
		.regex(noHtmlTagsRegex, noHtmlTagsErrorMessage)
		.optional()
		.or(z.literal('')),
	price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format'),
	compareAtPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(),
	currency: z.string().length(3).default('USD'),
	status: z.enum(['draft', 'active', 'archived']).default('draft'),
	stockQuantity: z.number().int().min(0).default(0),
	lowStockThreshold: z.number().int().min(0).default(5),
	trackInventory: z.boolean().default(true),
	isFeatured: z.boolean().default(false),
	sortOrder: z.number().int().default(0),
});

export const updateProductSchema = createProductSchema.partial();

export const updateOrderStatusSchema = z.object({
	status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']),
	trackingNumber: z.string().max(100).optional(),
	trackingUrl: z.string().url().max(500).optional(),
	adminNotes: z.string().max(2000).optional(),
});

class MarketplaceAdminService {
	// ==================== PRODUCTS ====================

	async getProducts(options: {
		page?: number;
		limit?: number;
		search?: string;
		status?: string;
		sortBy?: string;
		sortOrder?: 'asc' | 'desc';
	} = {}) {
		const db = getMarketplaceDb();
		const { page = 1, limit = 20, search: rawSearch, status, sortBy = 'createdAt', sortOrder = 'desc' } = options;
		const search = sanitizeSearchInput(rawSearch); // Sanitize search input
		const offset = (page - 1) * limit;

		try {
			// Build conditions
			const conditions = [];

			if (search) {
				conditions.push(
					or(
						like(marketProducts.name, `%${search}%`),
						like(marketProducts.slug, `%${search}%`)
					)
				);
			}

			if (status) {
				conditions.push(eq(marketProducts.status, status));
			}

			// Get products
			let query = db.select().from(marketProducts);

			if (conditions.length > 0) {
				query = query.where(and(...conditions)) as typeof query;
			}

			const products = await query
				.orderBy(
					sortBy === 'name'
						? (sortOrder === 'asc' ? asc(marketProducts.name) : desc(marketProducts.name))
						: sortBy === 'price'
							? (sortOrder === 'asc' ? asc(marketProducts.price) : desc(marketProducts.price))
							: sortOrder === 'asc' ? asc(marketProducts.createdAt) : desc(marketProducts.createdAt)
				)
				.limit(limit)
				.offset(offset);

			// Get total count
			const countResult = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(marketProducts)
				.where(conditions.length > 0 ? and(...conditions) : undefined);

			const total = countResult[0]?.count || 0;

			return {
				success: true,
				data: {
					products,
					pagination: {
						page,
						limit,
						total,
						totalPages: Math.ceil(total / limit),
					},
				},
			};
		} catch (error) {
			console.error('Error fetching products:', error);
			return { success: false, error: 'Failed to fetch products' };
		}
	}

	async getProductById(productId: string) {
		const db = getMarketplaceDb();

		try {
			const products = await db
				.select()
				.from(marketProducts)
				.where(eq(marketProducts.id, productId))
				.limit(1);

			if (products.length === 0) {
				return { success: false, error: 'Product not found' };
			}

			// Get images
			const images = await db
				.select()
				.from(marketProductImages)
				.where(eq(marketProductImages.productId, productId))
				.orderBy(asc(marketProductImages.sortOrder));

			return {
				success: true,
				data: {
					...products[0],
					images,
				},
			};
		} catch (error) {
			console.error('Error fetching product:', error);
			return { success: false, error: 'Failed to fetch product' };
		}
	}

	async createProduct(data: z.infer<typeof createProductSchema>) {
		const db = getMarketplaceDb();

		try {
			// Check for duplicate slug
			const existing = await db
				.select({ id: marketProducts.id })
				.from(marketProducts)
				.where(eq(marketProducts.slug, data.slug))
				.limit(1);

			if (existing.length > 0) {
				return { success: false, error: 'A product with this slug already exists' };
			}

			const [product] = await db
				.insert(marketProducts)
				.values(data)
				.returning();

			return { success: true, data: product };
		} catch (error) {
			console.error('Error creating product:', error);
			return { success: false, error: 'Failed to create product' };
		}
	}

	async updateProduct(productId: string, data: z.infer<typeof updateProductSchema>) {
		const db = getMarketplaceDb();

		try {
			// Check product exists
			const existing = await db
				.select({ id: marketProducts.id, slug: marketProducts.slug })
				.from(marketProducts)
				.where(eq(marketProducts.id, productId))
				.limit(1);

			if (existing.length === 0) {
				return { success: false, error: 'Product not found' };
			}

			// Check for duplicate slug if changing
			if (data.slug && data.slug !== existing[0].slug) {
				const slugCheck = await db
					.select({ id: marketProducts.id })
					.from(marketProducts)
					.where(eq(marketProducts.slug, data.slug))
					.limit(1);

				if (slugCheck.length > 0) {
					return { success: false, error: 'A product with this slug already exists' };
				}
			}

			const [product] = await db
				.update(marketProducts)
				.set({ ...data, updatedAt: new Date() })
				.where(eq(marketProducts.id, productId))
				.returning();

			return { success: true, data: product };
		} catch (error) {
			console.error('Error updating product:', error);
			return { success: false, error: 'Failed to update product' };
		}
	}

	async deleteProduct(productId: string) {
		const db = getMarketplaceDb();

		try {
			// First, get all images for this product to delete from R2
			const images = await db
				.select({ url: marketProductImages.url })
				.from(marketProductImages)
				.where(eq(marketProductImages.productId, productId));

			// Delete images from R2 storage
			if (images.length > 0) {
				const { deleteImage, extractKeyFromUrl } = await import('@/lib/services/r2.service');
				for (const image of images) {
					const key = extractKeyFromUrl(image.url);
					if (key) {
						const result = await deleteImage(key);
						if (!result.success) {
							console.warn('Failed to delete product image from R2:', result.error);
							// Continue anyway - we still want to clean up the database
						}
					}
				}
			}

			// Delete images from database
			await db
				.delete(marketProductImages)
				.where(eq(marketProductImages.productId, productId));

			// Delete product
			const result = await db
				.delete(marketProducts)
				.where(eq(marketProducts.id, productId))
				.returning({ id: marketProducts.id });

			if (result.length === 0) {
				return { success: false, error: 'Product not found' };
			}

			return { success: true, message: 'Product deleted' };
		} catch (error) {
			console.error('Error deleting product:', error);
			return { success: false, error: 'Failed to delete product' };
		}
	}

	// ==================== ORDERS ====================

	async getOrders(options: {
		page?: number;
		limit?: number;
		status?: string;
		search?: string;
	} = {}) {
		const db = getMarketplaceDb();
		const { page = 1, limit = 20, status, search } = options;
		const offset = (page - 1) * limit;

		try {
			const conditions = [];

			if (status) {
				conditions.push(eq(marketOrders.status, status));
			}

			if (search) {
				conditions.push(
					or(
						like(marketOrders.orderNumber, `%${search}%`),
						like(marketOrders.shippingName, `%${search}%`)
					)
				);
			}

			let query = db.select().from(marketOrders);

			if (conditions.length > 0) {
				query = query.where(and(...conditions)) as typeof query;
			}

			const orders = await query
				.orderBy(desc(marketOrders.createdAt))
				.limit(limit)
				.offset(offset);

			// Get total count
			const countResult = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(marketOrders)
				.where(conditions.length > 0 ? and(...conditions) : undefined);

			const total = countResult[0]?.count || 0;

			return {
				success: true,
				data: {
					orders,
					pagination: {
						page,
						limit,
						total,
						totalPages: Math.ceil(total / limit),
					},
				},
			};
		} catch (error) {
			console.error('Error fetching orders:', error);
			return { success: false, error: 'Failed to fetch orders' };
		}
	}

	async getOrderById(orderId: string) {
		const db = getMarketplaceDb();

		try {
			const orders = await db
				.select()
				.from(marketOrders)
				.where(eq(marketOrders.id, orderId))
				.limit(1);

			if (orders.length === 0) {
				return { success: false, error: 'Order not found' };
			}

			// Get order items
			const items = await db
				.select()
				.from(marketOrderItems)
				.where(eq(marketOrderItems.orderId, orderId));

			// Get customer info
			const users = await db
				.select()
				.from(marketUsers)
				.where(eq(marketUsers.id, orders[0].marketUserId))
				.limit(1);

			return {
				success: true,
				data: {
					...orders[0],
					items,
					customer: users[0] || null,
				},
			};
		} catch (error) {
			console.error('Error fetching order:', error);
			return { success: false, error: 'Failed to fetch order' };
		}
	}

	async updateOrderStatus(orderId: string, data: z.infer<typeof updateOrderStatusSchema>) {
		const db = getMarketplaceDb();

		try {
			const updateData: Record<string, unknown> = {
				status: data.status,
				updatedAt: new Date(),
			};

			if (data.trackingNumber !== undefined) {
				updateData.trackingNumber = data.trackingNumber;
			}

			if (data.trackingUrl !== undefined) {
				updateData.trackingUrl = data.trackingUrl;
			}

			if (data.adminNotes !== undefined) {
				updateData.adminNotes = data.adminNotes;
			}

			// Set shipped/delivered timestamps
			if (data.status === 'shipped') {
				updateData.shippedAt = new Date();
			} else if (data.status === 'delivered') {
				updateData.deliveredAt = new Date();
			}

			const [order] = await db
				.update(marketOrders)
				.set(updateData)
				.where(eq(marketOrders.id, orderId))
				.returning();

			if (!order) {
				return { success: false, error: 'Order not found' };
			}

			return { success: true, data: order };
		} catch (error) {
			console.error('Error updating order:', error);
			return { success: false, error: 'Failed to update order' };
		}
	}

	// ==================== USERS ====================

	async getMarketUsers(options: {
		page?: number;
		limit?: number;
		search?: string;
	} = {}) {
		const db = getMarketplaceDb();
		const { page = 1, limit = 20, search } = options;
		const offset = (page - 1) * limit;

		try {
			let query = db.select().from(marketUsers);

			if (search) {
				query = query.where(like(marketUsers.email, `%${search}%`)) as typeof query;
			}

			const users = await query
				.orderBy(desc(marketUsers.createdAt))
				.limit(limit)
				.offset(offset);

			// Get total count
			const countResult = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(marketUsers)
				.where(search ? like(marketUsers.email, `%${search}%`) : undefined);

			const total = countResult[0]?.count || 0;

			return {
				success: true,
				data: {
					users,
					pagination: {
						page,
						limit,
						total,
						totalPages: Math.ceil(total / limit),
					},
				},
			};
		} catch (error) {
			console.error('Error fetching market users:', error);
			return { success: false, error: 'Failed to fetch users' };
		}
	}

	async toggleUserStatus(userId: string, isActive: boolean) {
		const db = getMarketplaceDb();

		try {
			const [user] = await db
				.update(marketUsers)
				.set({ isActive, updatedAt: new Date() })
				.where(eq(marketUsers.id, userId))
				.returning();

			if (!user) {
				return { success: false, error: 'User not found' };
			}

			return { success: true, data: user };
		} catch (error) {
			console.error('Error updating user status:', error);
			return { success: false, error: 'Failed to update user' };
		}
	}

	async deleteOrder(orderId: string) {
		const db = getMarketplaceDb();

		try {
			// Delete order items first
			await db
				.delete(marketOrderItems)
				.where(eq(marketOrderItems.orderId, orderId));

			// Delete order
			const result = await db
				.delete(marketOrders)
				.where(eq(marketOrders.id, orderId))
				.returning({ id: marketOrders.id });

			if (result.length === 0) {
				return { success: false, error: 'Order not found' };
			}

			return { success: true, message: 'Order deleted' };
		} catch (error) {
			console.error('Error deleting order:', error);
			return { success: false, error: 'Failed to delete order' };
		}
	}

	async deleteUser(userId: string) {
		const db = getMarketplaceDb();

		try {
			// Check if user has any orders
			const orderCheck = await db
				.select({ id: marketOrders.id })
				.from(marketOrders)
				.where(eq(marketOrders.marketUserId, userId))
				.limit(1);

			if (orderCheck.length > 0) {
				return { success: false, error: 'Cannot delete user with existing orders. Delete their orders first.' };
			}

			// Delete user
			const result = await db
				.delete(marketUsers)
				.where(eq(marketUsers.id, userId))
				.returning({ id: marketUsers.id });

			if (result.length === 0) {
				return { success: false, error: 'User not found' };
			}

			return { success: true, message: 'User deleted' };
		} catch (error) {
			console.error('Error deleting user:', error);
			return { success: false, error: 'Failed to delete user' };
		}
	}

	// ==================== ANALYTICS ====================

	async getOverviewStats() {
		const db = getMarketplaceDb();

		try {
			const [productCount] = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(marketProducts);

			const [activeProductCount] = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(marketProducts)
				.where(eq(marketProducts.status, 'active'));

			const [orderCount] = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(marketOrders);

			const [pendingOrderCount] = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(marketOrders)
				.where(eq(marketOrders.status, 'pending'));

			const [userCount] = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(marketUsers);

			const [revenueResult] = await db
				.select({ total: sql<string>`COALESCE(SUM(total::numeric), 0)::text` })
				.from(marketOrders)
				.where(eq(marketOrders.status, 'delivered'));

			return {
				success: true,
				data: {
					totalProducts: productCount?.count || 0,
					activeProducts: activeProductCount?.count || 0,
					totalOrders: orderCount?.count || 0,
					pendingOrders: pendingOrderCount?.count || 0,
					totalUsers: userCount?.count || 0,
					totalRevenue: revenueResult?.total || '0',
				},
			};
		} catch (error) {
			console.error('Error fetching marketplace stats:', error);
			return { success: false, error: 'Failed to fetch stats' };
		}
	}
}

export const marketplaceAdminService = new MarketplaceAdminService();
