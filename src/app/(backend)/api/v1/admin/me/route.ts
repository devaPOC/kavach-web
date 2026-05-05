import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { admins } from '@/lib/database/schema/admins';
import { eq, isNull } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth/jwt-utils';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
	try {
		// Get token from cookies (matching unified-session-manager cookie names)
		const cookieStore = await cookies();
		const accessToken = cookieStore.get('auth-session')?.value ||
			request.headers.get('authorization')?.replace('Bearer ', '');

		if (!accessToken) {
			return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
		}

		// Verify JWT token
		const payload = await verifyToken(accessToken);
		if (!payload || payload.role !== 'admin') {
			return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
		}

		// Get admin from admins table
		const [admin] = await db
			.select({
				id: admins.id,
				email: admins.email,
				firstName: admins.firstName,
				lastName: admins.lastName,
				role: admins.role,
				isActive: admins.isActive,
				createdAt: admins.createdAt,
				lastLoginAt: admins.lastLoginAt,
			})
			.from(admins)
			.where(eq(admins.id, payload.userId))
			.limit(1);

		if (!admin || !admin.isActive) {
			return NextResponse.json({ success: false, message: 'Admin not found' }, { status: 404 });
		}

		return NextResponse.json({
			success: true,
			data: {
				user: {
					id: admin.id,
					email: admin.email,
					firstName: admin.firstName,
					lastName: admin.lastName,
					role: admin.role,
					isEmailVerified: true,
					isProfileCompleted: true,
					isApproved: true,
					createdAt: admin.createdAt,
					lastLoginAt: admin.lastLoginAt,
				}
			}
		});
	} catch (error) {
		console.error('Error getting admin profile:', error);
		return NextResponse.json(
			{ success: false, message: 'Internal server error' },
			{ status: 500 }
		);
	}
}
