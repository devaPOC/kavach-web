import { db } from '@/lib/database';
import {
	superAdmins,
	superAdminOtpCodes,
	superAdminSessions,
	type SuperAdmin,
	type NewSuperAdminSession
} from '@/lib/database/schema';
import { eq, and, gt, isNull, desc } from 'drizzle-orm';
import { emailService } from '@/lib/email/email-service';
import { emitAudit } from '@/lib/utils/audit-logger';
import crypto from 'crypto';

const OTP_EXPIRY_MINUTES = 10;
const SESSION_EXPIRY_HOURS = 24;

export class SuperAdminAuthService {
	/**
	 * Generate a 6-digit OTP code
	 */
	private generateOtpCode(): string {
		return Math.floor(100000 + Math.random() * 900000).toString();
	}

	/**
	 * Generate a secure session token
	 */
	private generateSessionToken(): string {
		return crypto.randomBytes(64).toString('hex');
	}

	/**
	 * Send OTP to super admin email
	 */
	async sendOtp(email: string): Promise<{ success: boolean; message: string }> {
		// Find super admin by email
		const [superAdmin] = await db
			.select()
			.from(superAdmins)
			.where(and(
				eq(superAdmins.email, email.toLowerCase()),
				eq(superAdmins.isActive, true)
			))
			.limit(1);

		if (!superAdmin) {
			// Don't reveal if email exists or not for security
			return { success: true, message: 'If the email is registered, an OTP has been sent.' };
		}

		// Generate OTP
		const code = this.generateOtpCode();
		const expiresAt = new Date();
		expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

		// Store OTP in database
		await db.insert(superAdminOtpCodes).values({
			superAdminId: superAdmin.id,
			code,
			expiresAt,
		});

		// Send OTP via email
		try {
			await emailService.sendSuperAdminOtp({
				email: superAdmin.email,
				name: `${superAdmin.firstName} ${superAdmin.lastName}`,
				otpCode: code,
				expiryMinutes: OTP_EXPIRY_MINUTES,
			});
		} catch (error) {
			console.error('Failed to send OTP email:', error);
			return { success: false, message: 'Failed to send OTP. Please try again.' };
		}



		return { success: true, message: 'OTP sent successfully.' };
	}

	/**
	 * Verify OTP and create session
	 */
	async verifyOtp(email: string, code: string): Promise<{
		success: boolean;
		message: string;
		token?: string;
		superAdmin?: Omit<SuperAdmin, 'id'> & { id: string };
	}> {
		// Find super admin by email
		const [superAdmin] = await db
			.select()
			.from(superAdmins)
			.where(and(
				eq(superAdmins.email, email.toLowerCase()),
				eq(superAdmins.isActive, true)
			))
			.limit(1);

		if (!superAdmin) {
			return { success: false, message: 'Invalid email or OTP.' };
		}

		// Find valid OTP
		const [otpRecord] = await db
			.select()
			.from(superAdminOtpCodes)
			.where(and(
				eq(superAdminOtpCodes.superAdminId, superAdmin.id),
				eq(superAdminOtpCodes.code, code),
				gt(superAdminOtpCodes.expiresAt, new Date()),
				isNull(superAdminOtpCodes.usedAt)
			))
			.orderBy(desc(superAdminOtpCodes.createdAt))
			.limit(1);

		if (!otpRecord) {
			emitAudit({
				event: 'auth.login.failed',
				userEmail: email,
				success: false,
				metadata: {
					action: 'super_admin_otp_invalid',
					reason: 'Invalid or expired OTP',
				}
			});
			return { success: false, message: 'Invalid or expired OTP.' };
		}

		// Mark OTP as used
		await db
			.update(superAdminOtpCodes)
			.set({ usedAt: new Date() })
			.where(eq(superAdminOtpCodes.id, otpRecord.id));

		// Create session
		const token = this.generateSessionToken();
		const expiresAt = new Date();
		expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRY_HOURS);

		await db.insert(superAdminSessions).values({
			superAdminId: superAdmin.id,
			token,
			expiresAt,
		});

		// Update last login
		await db
			.update(superAdmins)
			.set({ lastLoginAt: new Date(), updatedAt: new Date() })
			.where(eq(superAdmins.id, superAdmin.id));

		emitAudit({
			event: 'auth.login.success',
			userId: superAdmin.id,
			userEmail: superAdmin.email,
			success: true,
			metadata: {
				action: 'super_admin_login',
			}
		});

		return {
			success: true,
			message: 'Login successful.',
			token,
			superAdmin: {
				id: superAdmin.id,
				email: superAdmin.email,
				firstName: superAdmin.firstName,
				lastName: superAdmin.lastName,
				isActive: superAdmin.isActive,
				lastLoginAt: superAdmin.lastLoginAt,
				createdAt: superAdmin.createdAt,
				updatedAt: superAdmin.updatedAt,
			}
		};
	}

	/**
	 * Validate session token and get super admin
	 */
	async validateSession(token: string): Promise<SuperAdmin | null> {
		const [session] = await db
			.select()
			.from(superAdminSessions)
			.where(and(
				eq(superAdminSessions.token, token),
				gt(superAdminSessions.expiresAt, new Date())
			))
			.limit(1);

		if (!session) {
			return null;
		}

		const [superAdmin] = await db
			.select()
			.from(superAdmins)
			.where(and(
				eq(superAdmins.id, session.superAdminId),
				eq(superAdmins.isActive, true)
			))
			.limit(1);

		return superAdmin || null;
	}

	/**
	 * Logout - invalidate session
	 */
	async logout(token: string): Promise<boolean> {
		const result = await db
			.delete(superAdminSessions)
			.where(eq(superAdminSessions.token, token));

		return true;
	}

	/**
	 * Get super admin by ID
	 */
	async getSuperAdminById(id: string): Promise<SuperAdmin | null> {
		const [superAdmin] = await db
			.select()
			.from(superAdmins)
			.where(eq(superAdmins.id, id))
			.limit(1);

		return superAdmin || null;
	}
}

export const superAdminAuthService = new SuperAdminAuthService();
