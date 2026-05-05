import { db } from '@/lib/database';
import { admins } from '@/lib/database/schema/admins';
import { users } from '@/lib/database/schema/users';
import { eq, isNotNull, desc, and, ilike, or } from 'drizzle-orm';
import { emitAudit } from '@/lib/utils/audit-logger';

export interface DeletedItem {
	id: string;
	type: 'admin' | 'user';
	name: string;
	email: string;
	role: string;
	deletedAt: Date;
	deletedBy?: string;
}

export class RecycleBinService {
	/**
	 * List deleted admins (Super Admin only)
	 */
	async listDeletedAdmins(filters: { search?: string; page?: number; limit?: number } = {}): Promise<{
		items: DeletedItem[];
		total: number;
		pages: number;
	}> {
		const page = filters.page || 1;
		const limit = filters.limit || 10;
		const offset = (page - 1) * limit;

		const whereConditions = and(
			isNotNull(admins.deletedAt),
			filters.search ? or(
				ilike(admins.email, `%${filters.search}%`),
				ilike(admins.firstName, `%${filters.search}%`),
				ilike(admins.lastName, `%${filters.search}%`)
			) : undefined
		);

		const data = await db
			.select({
				id: admins.id,
				email: admins.email,
				firstName: admins.firstName,
				lastName: admins.lastName,
				role: admins.role,
				deletedAt: admins.deletedAt,
				deletedBy: admins.deletedBy,
			})
			.from(admins)
			.where(whereConditions)
			.limit(limit)
			.offset(offset)
			.orderBy(desc(admins.deletedAt));

		const [countResult] = await db
			.select({ count: sql<number>`count(*)` })
			.from(admins)
			.where(whereConditions);

		const total = Number(countResult?.count || 0);

		return {
			items: data.map(admin => ({
				id: admin.id,
				type: 'admin',
				name: `${admin.firstName} ${admin.lastName}`,
				email: admin.email,
				role: admin.role,
				deletedAt: admin.deletedAt!,
				deletedBy: admin.deletedBy || undefined,
			})),
			total,
			pages: Math.ceil(total / limit),
		};
	}

	/**
	 * List deleted users (Admin & Super Admin)
	 */
	async listDeletedUsers(filters: { search?: string; page?: number; limit?: number } = {}): Promise<{
		items: DeletedItem[];
		total: number;
		pages: number;
	}> {
		const page = filters.page || 1;
		const limit = filters.limit || 10;
		const offset = (page - 1) * limit;

		const whereConditions = and(
			isNotNull(users.deletedAt),
			filters.search ? or(
				ilike(users.email, `%${filters.search}%`),
				ilike(users.firstName, `%${filters.search}%`),
				ilike(users.lastName, `%${filters.search}%`)
			) : undefined
		);

		const data = await db
			.select({
				id: users.id,
				email: users.email,
				firstName: users.firstName,
				lastName: users.lastName,
				role: users.role,
				deletedAt: users.deletedAt,
				deletedBy: users.deletedBy,
			})
			.from(users)
			.where(whereConditions)
			.limit(limit)
			.offset(offset)
			.orderBy(desc(users.deletedAt));

		const [countResult] = await db
			.select({ count: sql<number>`count(*)` })
			.from(users)
			.where(whereConditions);

		const total = Number(countResult?.count || 0);

		return {
			items: data.map(user => ({
				id: user.id,
				type: 'user',
				name: `${user.firstName} ${user.lastName}`,
				email: user.email,
				role: user.role,
				deletedAt: user.deletedAt!,
				deletedBy: user.deletedBy || undefined,
			})),
			total,
			pages: Math.ceil(total / limit),
		};
	}

	/**
	 * Restore an admin
	 */
	async restoreAdmin(id: string, restoredBySuperAdminId: string): Promise<{ success: boolean; error?: string }> {
		try {
			const [admin] = await db
				.update(admins)
				.set({ deletedAt: null, deletedBy: null })
				.where(eq(admins.id, id))
				.returning();

			if (!admin) {
				return { success: false, error: 'Admin not found' };
			}

			emitAudit({
				event: 'admin.user.updated',
				userId: restoredBySuperAdminId,
				success: true,
				metadata: {
					action: 'admin_restored',
					adminId: id,
				}
			});

			return { success: true };
		} catch (error) {
			console.error('Error restoring admin:', error);
			return { success: false, error: 'Failed to restore admin' };
		}
	}

	/**
	 * Restore a user
	 */
	async restoreUser(id: string, restoredById: string): Promise<{ success: boolean; error?: string }> {
		try {
			const [user] = await db
				.update(users)
				.set({ deletedAt: null, deletedBy: null })
				.where(eq(users.id, id))
				.returning();

			if (!user) {
				return { success: false, error: 'User not found' };
			}

			emitAudit({
				event: 'admin.user.updated',
				userId: restoredById,
				success: true,
				metadata: {
					action: 'user_restored',
					restoredUserId: id,
				}
			});

			return { success: true };
		} catch (error) {
			console.error('Error restoring user:', error);
			return { success: false, error: 'Failed to restore user' };
		}
	}
}

export const recycleBinService = new RecycleBinService();
import { sql } from 'drizzle-orm';
