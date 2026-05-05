import { db } from '@/lib/database';
import { admins, adminSessions } from '@/lib/database/schema/admins';
import { eq, and, gt, isNull } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { generateToken, generateRefreshToken } from '@/lib/auth/jwt-utils';
import { emitAudit } from '@/lib/utils/audit-logger';

export interface AdminLoginResult {
	success: boolean;
	error?: string;
	admin?: {
		id: string;
		email: string;
		firstName: string;
		lastName: string;
		role: string;
		mustChangePassword?: boolean;
	};
	accessToken?: string;
	refreshToken?: string;
}

export class AdminAuthService {
	/**
	 * Authenticate admin with email and password
	 * Uses the `admins` table instead of `users` table
	 */
	async login(email: string, password: string, context?: { clientIP?: string; userAgent?: string }): Promise<AdminLoginResult> {
		try {
			// Find admin by email
			const [admin] = await db
				.select()
				.from(admins)
				.where(and(
					eq(admins.email, email.toLowerCase()),
					isNull(admins.deletedAt)
				))
				.limit(1);

			if (!admin) {
				emitAudit({
					event: 'auth.login.failed',
					userEmail: email,
					success: false,
					metadata: {
						action: 'admin_login_failed',
						reason: 'admin_not_found',
						clientIP: context?.clientIP,
					}
				});
				return { success: false, error: 'Invalid email or password' };
			}

			// Check if admin is active
			if (!admin.isActive) {
				emitAudit({
					event: 'auth.login.failed',
					userEmail: email,
					success: false,
					metadata: {
						action: 'admin_login_failed',
						reason: 'admin_inactive',
						adminId: admin.id,
					}
				});
				return { success: false, error: 'Account is deactivated. Contact super admin.' };
			}

			// Verify password
			const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);

			if (!isPasswordValid) {
				emitAudit({
					event: 'auth.login.failed',
					userEmail: email,
					success: false,
					metadata: {
						action: 'admin_login_failed',
						reason: 'invalid_password',
						adminId: admin.id,
					}
				});
				return { success: false, error: 'Invalid email or password' };
			}

			// Generate proper JWT tokens using existing utilities
			const tokenPayload = {
				userId: admin.id,
				email: admin.email,
				role: 'admin' as const,
				isEmailVerified: true,
				isProfileCompleted: true,
				isApproved: true,
			};

			const [accessToken, refreshToken] = await Promise.all([
				generateToken(tokenPayload),
				generateRefreshToken(tokenPayload)
			]);

			// Update last login
			await db
				.update(admins)
				.set({ lastLoginAt: new Date() })
				.where(eq(admins.id, admin.id));

			emitAudit({
				event: 'auth.login.success',
				userId: admin.id,
				userEmail: admin.email,
				success: true,
				metadata: {
					action: 'admin_login_success',
					adminId: admin.id,
					clientIP: context?.clientIP,
				}
			});

			return {
				success: true,
				admin: {
					id: admin.id,
					email: admin.email,
					firstName: admin.firstName,
					lastName: admin.lastName,
					role: admin.role,
					mustChangePassword: admin.mustChangePassword,
				},
				accessToken,
				refreshToken,
			};
		} catch (error) {
			console.error('Admin login error:', error);
			return { success: false, error: 'Login failed' };
		}
	}

	/**
	 * Validate admin session token
	 */
	async validateSession(token: string): Promise<{
		id: string;
		email: string;
		firstName: string;
		lastName: string;
		role: string;
		mustChangePassword?: boolean;
	} | null> {
		try {
			const [session] = await db
				.select({
					adminId: adminSessions.adminId,
					expiresAt: adminSessions.expiresAt,
					admin: {
						id: admins.id,
						email: admins.email,
						firstName: admins.firstName,
						lastName: admins.lastName,
						role: admins.role,
						isActive: admins.isActive,
						deletedAt: admins.deletedAt,
						mustChangePassword: admins.mustChangePassword,
					}
				})
				.from(adminSessions)
				.innerJoin(admins, eq(adminSessions.adminId, admins.id))
				.where(and(
					eq(adminSessions.token, token),
					gt(adminSessions.expiresAt, new Date())
				))
				.limit(1);

			if (!session || !session.admin.isActive || session.admin.deletedAt) {
				return null;
			}

			return {
				id: session.admin.id,
				email: session.admin.email,
				firstName: session.admin.firstName,
				lastName: session.admin.lastName,
				role: session.admin.role,
				mustChangePassword: session.admin.mustChangePassword,
			};
		} catch (error) {
			console.error('Session validation error:', error);
			return null;
		}
	}

	/**
	 * Logout admin by invalidating session
	 */
	async logout(token: string): Promise<boolean> {
		try {
			await db
				.delete(adminSessions)
				.where(eq(adminSessions.token, token));

			return true;
		} catch (error) {
			console.error('Logout error:', error);
			return false;
		}
	}

	/**
	 * Change admin password
	 */
	async changePassword(adminId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
		try {
			// Get admin
			const [admin] = await db
				.select()
				.from(admins)
				.where(eq(admins.id, adminId))
				.limit(1);

			if (!admin) {
				return { success: false, error: 'Admin not found' };
			}

			// Verify current password
			const isPasswordValid = await bcrypt.compare(currentPassword, admin.passwordHash);
			if (!isPasswordValid) {
				return { success: false, error: 'Current password is incorrect' };
			}

			// Hash new password
			const passwordHash = await bcrypt.hash(newPassword, 12);

			// Update admin
			await db
				.update(admins)
				.set({
					passwordHash,
					mustChangePassword: false,
					updatedAt: new Date(),
				})
				.where(eq(admins.id, adminId));

			emitAudit({
				event: 'auth.password.changed',
				userId: admin.id,
				userEmail: admin.email,
				success: true,
				metadata: {
					action: 'admin_password_changed',
					adminId: admin.id,
				}
			});

			return { success: true };
		} catch (error) {
			console.error('Change password error:', error);
			return { success: false, error: 'Failed to change password' };
		}
	}
}

export const adminAuthService = new AdminAuthService();
