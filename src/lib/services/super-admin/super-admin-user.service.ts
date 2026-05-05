import { db } from '@/lib/database';
import { users } from '@/lib/database/schema';
import { eq, ilike, or, and, desc, asc, sql, isNull } from 'drizzle-orm';

export interface ListUsersFilters {
	page?: number;
	limit?: number;
	search?: string;
	role?: 'customer' | 'expert' | 'trainer' | 'admin' | 'all';
	isApproved?: boolean;
	isDeleted?: boolean;
	sortBy?: 'createdAt' | 'email' | 'firstName';
	sortOrder?: 'asc' | 'desc';
}

export interface UserSummary {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	role: string;
	isApproved: boolean;
	isEmailVerified: boolean;
	isBanned: boolean;
	isPaused: boolean;
	createdAt: Date;
	deletedAt: Date | null;
}

export class SuperAdminUserService {
	/**
	 * List users with filters and pagination
	 */
	async listUsers(filters: ListUsersFilters = {}): Promise<{
		users: UserSummary[];
		total: number;
		page: number;
		totalPages: number;
	}> {
		const {
			page = 1,
			limit = 20,
			search,
			role = 'all',
			isApproved,
			isDeleted = false,
			sortBy = 'createdAt',
			sortOrder = 'desc',
		} = filters;

		const offset = (page - 1) * limit;
		const whereConditions = [];

		// Filter by role
		if (role !== 'all') {
			whereConditions.push(eq(users.role, role));
		}

		// Filter by approval status
		if (isApproved !== undefined) {
			whereConditions.push(eq(users.isApproved, isApproved));
		}

		// Filter by deleted status
		if (isDeleted) {
			whereConditions.push(sql`${users.deletedAt} IS NOT NULL`);
		} else {
			whereConditions.push(isNull(users.deletedAt));
		}

		// Search by email, first name, or last name
		if (search) {
			whereConditions.push(
				or(
					ilike(users.email, `%${search}%`),
					ilike(users.firstName, `%${search}%`),
					ilike(users.lastName, `%${search}%`)
				)!
			);
		}

		// Build order clause
		const orderClause = sortOrder === 'asc'
			? asc(users[sortBy as keyof typeof users] as any)
			: desc(users[sortBy as keyof typeof users] as any);

		// Get users
		const userResults = await db
			.select({
				id: users.id,
				email: users.email,
				firstName: users.firstName,
				lastName: users.lastName,
				role: users.role,
				isApproved: users.isApproved,
				isEmailVerified: users.isEmailVerified,
				isBanned: users.isBanned,
				isPaused: users.isPaused,
				createdAt: users.createdAt,
				deletedAt: users.deletedAt,
			})
			.from(users)
			.where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
			.orderBy(orderClause)
			.limit(limit)
			.offset(offset);

		// Get total count
		const [{ count }] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(users)
			.where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

		const total = count;
		const totalPages = Math.ceil(total / limit);

		return {
			users: userResults,
			total,
			page,
			totalPages,
		};
	}

	/**
	 * Get user by ID
	 */
	async getUserById(userId: string): Promise<UserSummary | null> {
		const [user] = await db
			.select({
				id: users.id,
				email: users.email,
				firstName: users.firstName,
				lastName: users.lastName,
				role: users.role,
				isApproved: users.isApproved,
				isEmailVerified: users.isEmailVerified,
				isBanned: users.isBanned,
				isPaused: users.isPaused,
				createdAt: users.createdAt,
				deletedAt: users.deletedAt,
			})
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		return user || null;
	}

	/**
	 * Get dashboard statistics
	 */
	async getDashboardStats(): Promise<{
		totalUsers: number;
		totalCustomers: number;
		totalExperts: number;
		totalTrainers: number;
		approvedUsers: number;
	}> {
		const [stats] = await db
			.select({
				totalUsers: sql<number>`count(*)::int`,
				totalCustomers: sql<number>`count(*) filter (where role = 'customer')::int`,
				totalExperts: sql<number>`count(*) filter (where role = 'expert')::int`,
				totalTrainers: sql<number>`count(*) filter (where role = 'trainer')::int`,
				approvedUsers: sql<number>`count(*) filter (where is_approved = true)::int`,
			})
			.from(users)
			.where(isNull(users.deletedAt));

		return stats;
	}
}

export const superAdminUserService = new SuperAdminUserService();
