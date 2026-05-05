import { NextRequest, NextResponse } from 'next/server';
import { superAdminAuthService } from '@/lib/services/super-admin/super-admin-auth.service';
import { superAdminUserService } from '@/lib/services/super-admin/super-admin-user.service';

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

		// Parse query params
		const { searchParams } = new URL(request.url);
		const page = parseInt(searchParams.get('page') || '1');
		const limit = parseInt(searchParams.get('limit') || '20');
		const search = searchParams.get('search') || undefined;
		const role = searchParams.get('role') as any || 'all';
		const sortBy = (searchParams.get('sortBy') as any) || 'createdAt';
		const sortOrder = (searchParams.get('sortOrder') as any) || 'desc';

		const result = await superAdminUserService.listUsers({
			page,
			limit,
			search,
			role,
			sortBy,
			sortOrder,
		});

		return NextResponse.json({
			success: true,
			...result,
		});
	} catch (error) {
		console.error('Error listing users:', error);
		return NextResponse.json(
			{ success: false, message: 'Internal server error' },
			{ status: 500 }
		);
	}
}
