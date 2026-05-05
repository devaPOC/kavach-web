import { NextRequest, NextResponse } from 'next/server';
import { superAdminAuthService } from '@/lib/services/super-admin/super-admin-auth.service';
import { superAdminUserService } from '@/lib/services/super-admin/super-admin-user.service';
import { superAdminAdminService } from '@/lib/services/super-admin/super-admin-admin.service';

const COOKIE_NAME = 'super_admin_token';

export async function GET(request: NextRequest) {
	try {
		// Verify super admin session
		const token = request.cookies.get(COOKIE_NAME)?.value;
		if (!token) {
			return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
		}

		const superAdmin = await superAdminAuthService.validateSession(token);
		if (!superAdmin) {
			return NextResponse.json({ success: false, message: 'Session expired' }, { status: 401 });
		}

		const [userStats, adminCount] = await Promise.all([
			superAdminUserService.getDashboardStats(),
			superAdminAdminService.getAdminCount()
		]);

		return NextResponse.json({
			success: true,
			stats: {
				...userStats,
				totalAdmins: adminCount,
			},
		});
	} catch (error) {
		console.error('Error getting stats:', error);
		return NextResponse.json(
			{ success: false, message: 'Internal server error' },
			{ status: 500 }
		);
	}
}
