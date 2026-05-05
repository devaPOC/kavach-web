import { NextRequest, NextResponse } from 'next/server';
import { superAdminAuthService } from '@/lib/services/super-admin/super-admin-auth.service';
import { recycleBinService } from '@/lib/services/recycle-bin.service';

const COOKIE_NAME = 'super_admin_token';

export async function GET(request: NextRequest) {
	try {
		const token = request.cookies.get(COOKIE_NAME)?.value;
		if (!token) {
			return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
		}

		const superAdmin = await superAdminAuthService.validateSession(token);
		if (!superAdmin) {
			return NextResponse.json({ success: false, message: 'Session expired' }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const type = searchParams.get('type');
		const page = parseInt(searchParams.get('page') || '1');
		const limit = parseInt(searchParams.get('limit') || '10');
		const search = searchParams.get('search') || undefined;

		if (type === 'admin') {
			const result = await recycleBinService.listDeletedAdmins({ page, limit, search });
			return NextResponse.json({ success: true, ...result });
		} else if (type === 'user') {
			const result = await recycleBinService.listDeletedUsers({ page, limit, search });
			return NextResponse.json({ success: true, ...result });
		} else {
			return NextResponse.json({ success: false, message: 'Invalid or missing type parameter' }, { status: 400 });
		}
	} catch (error) {
		console.error('Error listing deleted items:', error);
		return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
	}
}
