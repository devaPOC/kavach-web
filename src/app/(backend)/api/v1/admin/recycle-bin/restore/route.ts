import { NextRequest, NextResponse } from 'next/server';
import { cookieManager } from '@/lib/auth/unified-session-manager';
import { recycleBinService } from '@/lib/services/recycle-bin.service';

export async function POST(request: NextRequest) {
	try {
		const session = await cookieManager.getSessionFromCookies(request);

		if (!session || session.role !== 'admin') {
			return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const { type, id } = body;

		if (!id || type !== 'user') {
			return NextResponse.json({ success: false, message: 'Invalid request. Admins can only restore users.' }, { status: 400 });
		}

		const result = await recycleBinService.restoreUser(id, session.userId);
		return NextResponse.json(result, { status: result.success ? 200 : 400 });

	} catch (error) {
		console.error('Error restoring item:', error);
		return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
	}
}
