import { NextRequest, NextResponse } from 'next/server';
import { superAdminAuthService } from '@/lib/services/super-admin/super-admin-auth.service';
import { recycleBinService } from '@/lib/services/recycle-bin.service';

const COOKIE_NAME = 'super_admin_token';

export async function POST(request: NextRequest) {
	try {
		const token = request.cookies.get(COOKIE_NAME)?.value;
		if (!token) {
			return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
		}

		const superAdmin = await superAdminAuthService.validateSession(token);
		if (!superAdmin) {
			return NextResponse.json({ success: false, message: 'Session expired' }, { status: 401 });
		}

		const body = await request.json();
		const { type, id } = body;

		if (!id || !type) {
			return NextResponse.json({ success: false, message: 'Missing type or id' }, { status: 400 });
		}

		if (type === 'admin') {
			const result = await recycleBinService.restoreAdmin(id, superAdmin.id);
			return NextResponse.json(result, { status: result.success ? 200 : 400 });
		} else if (type === 'user') {
			const result = await recycleBinService.restoreUser(id, superAdmin.id);
			return NextResponse.json(result, { status: result.success ? 200 : 400 });
		} else {
			return NextResponse.json({ success: false, message: 'Invalid type parameter' }, { status: 400 });
		}
	} catch (error) {
		console.error('Error restoring item:', error);
		return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
	}
}
