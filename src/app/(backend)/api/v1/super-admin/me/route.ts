import { NextRequest, NextResponse } from 'next/server';
import { superAdminAuthService } from '@/lib/services/super-admin/super-admin-auth.service';

const COOKIE_NAME = 'super_admin_token';

export async function GET(request: NextRequest) {
	try {
		const token = request.cookies.get(COOKIE_NAME)?.value;

		if (!token) {
			return NextResponse.json(
				{ success: false, message: 'Not authenticated' },
				{ status: 401 }
			);
		}

		const superAdmin = await superAdminAuthService.validateSession(token);

		if (!superAdmin) {
			return NextResponse.json(
				{ success: false, message: 'Session expired or invalid' },
				{ status: 401 }
			);
		}

		return NextResponse.json({
			success: true,
			superAdmin: {
				id: superAdmin.id,
				email: superAdmin.email,
				firstName: superAdmin.firstName,
				lastName: superAdmin.lastName,
				isActive: superAdmin.isActive,
				lastLoginAt: superAdmin.lastLoginAt,
			},
		});
	} catch (error) {
		console.error('Error getting current super admin:', error);
		return NextResponse.json(
			{ success: false, message: 'Internal server error' },
			{ status: 500 }
		);
	}
}
