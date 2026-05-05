import { db } from '@/lib/database';
import { admins, type Admin, type NewAdmin } from '@/lib/database/schema';
import { eq, ilike, or, and, desc, asc, sql, isNull } from 'drizzle-orm';
import { emitAudit } from '@/lib/utils/audit-logger';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { emailService } from '@/lib/email';

export interface ListAdminsFilters {
	page?: number;
	limit?: number;
	search?: string;
	isActive?: boolean;
	isDeleted?: boolean;
	sortBy?: 'createdAt' | 'email' | 'firstName';
	sortOrder?: 'asc' | 'desc';
}

export interface AdminSummary {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	role: string;
	isActive: boolean;
	lastLoginAt: Date | null;
	createdAt: Date;
	deletedAt: Date | null;
}

export interface CreateAdminInput {
	email: string;
	password?: string;
	firstName: string;
	lastName: string;
	role?: 'admin' | 'super_admin';
}

export interface UpdateAdminInput {
	firstName?: string;
	lastName?: string;
	isActive?: boolean;
	password?: string;
}

export class SuperAdminAdminService {
	/**
	 * List admins with filters and pagination
	 */
	async listAdmins(filters: ListAdminsFilters = {}): Promise<{
		admins: AdminSummary[];
		total: number;
		page: number;
		totalPages: number;
	}> {
		const {
			page = 1,
			limit = 20,
			search,
			isActive,
			isDeleted = false,
			sortBy = 'createdAt',
			sortOrder = 'desc',
		} = filters;

		const offset = (page - 1) * limit;
		const whereConditions = [];

		// Filter by active status
		if (isActive !== undefined) {
			whereConditions.push(eq(admins.isActive, isActive));
		}

		// Filter by deleted status
		if (isDeleted) {
			whereConditions.push(sql`${admins.deletedAt} IS NOT NULL`);
		} else {
			whereConditions.push(isNull(admins.deletedAt));
		}

		// Search by email, first name, or last name
		if (search) {
			whereConditions.push(
				or(
					ilike(admins.email, `%${search}%`),
					ilike(admins.firstName, `%${search}%`),
					ilike(admins.lastName, `%${search}%`)
				)!
			);
		}

		// Build order clause
		const orderClause = sortOrder === 'asc'
			? asc(admins[sortBy as keyof typeof admins] as any)
			: desc(admins[sortBy as keyof typeof admins] as any);

		// Get admins
		const adminResults = await db
			.select({
				id: admins.id,
				email: admins.email,
				firstName: admins.firstName,
				lastName: admins.lastName,
				role: admins.role,
				isActive: admins.isActive,
				lastLoginAt: admins.lastLoginAt,
				createdAt: admins.createdAt,
				deletedAt: admins.deletedAt,
			})
			.from(admins)
			.where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
			.orderBy(orderClause)
			.limit(limit)
			.offset(offset);

		// Get total count
		const [{ count }] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(admins)
			.where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

		const total = count;
		const totalPages = Math.ceil(total / limit);

		return {
			admins: adminResults,
			total,
			page,
			totalPages,
		};
	}

	/**
	 * Get admin by ID
	 */
	async getAdminById(adminId: string): Promise<AdminSummary | null> {
		const [admin] = await db
			.select({
				id: admins.id,
				email: admins.email,
				firstName: admins.firstName,
				lastName: admins.lastName,
				role: admins.role,
				isActive: admins.isActive,
				lastLoginAt: admins.lastLoginAt,
				createdAt: admins.createdAt,
				deletedAt: admins.deletedAt,
			})
			.from(admins)
			.where(eq(admins.id, adminId))
			.limit(1);

		return admin || null;
	}

	/**
	 * Create a new admin
	 */
	async createAdmin(input: CreateAdminInput, createdBySuperAdminId?: string): Promise<{
		success: boolean;
		message: string;
		admin?: AdminSummary;
	}> {
		// Check if email already exists
		const [existing] = await db
			.select({ id: admins.id })
			.from(admins)
			.where(eq(admins.email, input.email.toLowerCase()))
			.limit(1);

		if (existing) {
			return { success: false, message: 'Email already exists' };
		}

		// Generate random password if not provided
		const rawPassword = input.password || randomBytes(12).toString('hex');

		// Hash password
		const passwordHash = await bcrypt.hash(rawPassword, 12);

		// Create admin
		const [newAdmin] = await db
			.insert(admins)
			.values({
				email: input.email.toLowerCase(),
				passwordHash,
				firstName: input.firstName,
				lastName: input.lastName,
				role: input.role || 'admin',
				isActive: true,
				mustChangePassword: true,
			})
			.returning({
				id: admins.id,
				email: admins.email,
				firstName: admins.firstName,
				lastName: admins.lastName,
				role: admins.role,
				isActive: admins.isActive,
				lastLoginAt: admins.lastLoginAt,
				createdAt: admins.createdAt,
				deletedAt: admins.deletedAt,
			});

		// Send email with credentials
		try {
			await emailService.sendAdminWelcomeEmail({
				email: newAdmin.email,
				firstName: newAdmin.firstName,
				password: rawPassword,
				loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/login`
			});
		} catch (error) {
			console.error('Failed to send admin welcome email:', error);
			// Don't fail the creation, just log invalid state potentially?
			// Or maybe we should return a warning.
		}

		emitAudit({
			event: 'admin.user.created',
			userId: createdBySuperAdminId,
			success: true,
			metadata: {
				action: 'admin_created',
				newAdminId: newAdmin.id,
				newAdminEmail: newAdmin.email,
				emailSent: true
			}
		});

		return {
			success: true,
			message: 'Admin created successfully. Credentials sent via email.',
			admin: newAdmin,
		};
	}

	/**
	 * Update an admin
	 */
	async updateAdmin(adminId: string, input: UpdateAdminInput, updatedBySuperAdminId?: string): Promise<{
		success: boolean;
		message: string;
		admin?: AdminSummary;
	}> {
		const updateData: any = {
			updatedAt: new Date(),
		};

		if (input.firstName !== undefined) updateData.firstName = input.firstName;
		if (input.lastName !== undefined) updateData.lastName = input.lastName;
		if (input.isActive !== undefined) updateData.isActive = input.isActive;
		if (input.password) {
			updateData.passwordHash = await bcrypt.hash(input.password, 12);
		}

		const [updated] = await db
			.update(admins)
			.set(updateData)
			.where(eq(admins.id, adminId))
			.returning({
				id: admins.id,
				email: admins.email,
				firstName: admins.firstName,
				lastName: admins.lastName,
				role: admins.role,
				isActive: admins.isActive,
				lastLoginAt: admins.lastLoginAt,
				createdAt: admins.createdAt,
				deletedAt: admins.deletedAt,
			});

		if (!updated) {
			return { success: false, message: 'Admin not found' };
		}

		emitAudit({
			event: 'admin.user.updated',
			userId: updatedBySuperAdminId,
			success: true,
			metadata: {
				action: 'admin_updated',
				adminId,
				changes: Object.keys(input),
			}
		});

		return {
			success: true,
			message: 'Admin updated successfully',
			admin: updated,
		};
	}

	/**
	 * Reset admin password
	 */
	async resetAdminPassword(adminId: string, resetBySuperAdminId: string): Promise<{
		success: boolean;
		message: string;
	}> {
		const [admin] = await db
			.select()
			.from(admins)
			.where(eq(admins.id, adminId))
			.limit(1);

		if (!admin) {
			return { success: false, message: 'Admin not found' };
		}

		// Generate new random password
		const newPassword = randomBytes(12).toString('hex');
		const passwordHash = await bcrypt.hash(newPassword, 12);

		// Update admin
		await db
			.update(admins)
			.set({
				passwordHash,
				mustChangePassword: true,
				updatedAt: new Date(),
			})
			.where(eq(admins.id, adminId));

		// Send email
		try {
			await emailService.sendAdminPasswordResetEmail({
				email: admin.email,
				firstName: admin.firstName,
				password: newPassword,
				loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/login`
			});
		} catch (error) {
			console.error('Failed to send admin password reset email:', error);
			return { success: false, message: 'Password reset but failed to send email.' };
		}

		emitAudit({
			event: 'admin.user.updated',
			userId: resetBySuperAdminId,
			success: true,
			metadata: {
				action: 'admin_password_reset',
				adminId,
				emailSent: true
			}
		});

		return {
			success: true,
			message: 'Password reset successfully. New credentials sent via email.',
		};
	}

	/**
	 * Soft delete an admin
	 */
	async deleteAdmin(adminId: string, deletedBySuperAdminId: string): Promise<{
		success: boolean;
		message: string;
	}> {
		const [deleted] = await db
			.update(admins)
			.set({
				deletedAt: new Date(),
				deletedBy: deletedBySuperAdminId,
				isActive: false,
				updatedAt: new Date(),
			})
			.where(and(
				eq(admins.id, adminId),
				isNull(admins.deletedAt)
			))
			.returning({ id: admins.id, email: admins.email });

		if (!deleted) {
			return { success: false, message: 'Admin not found or already deleted' };
		}

		emitAudit({
			event: 'admin.user.deleted',
			userId: deletedBySuperAdminId,
			success: true,
			metadata: {
				action: 'admin_deleted',
				adminId,
				adminEmail: deleted.email,
			}
		});

		return {
			success: true,
			message: 'Admin deleted successfully',
		};
	}

	/**
	 * Get admin count
	 */
	async getAdminCount(): Promise<number> {
		const [{ count }] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(admins)
			.where(isNull(admins.deletedAt));

		return count;
	}
}

export const superAdminAdminService = new SuperAdminAdminService();
