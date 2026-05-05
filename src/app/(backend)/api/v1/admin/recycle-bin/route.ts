import { NextRequest, NextResponse } from 'next/server';
import { cookieManager } from '@/lib/auth/unified-session-manager';
import { recycleBinService } from '@/lib/services/recycle-bin.service';

export async function GET(request: NextRequest) {
	try {
		const session = await cookieManager.getSessionFromCookies(request);

		if (!session || session.role !== 'admin') {
			return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const page = parseInt(searchParams.get('page') || '1');
		const limit = parseInt(searchParams.get('limit') || '10');
		const search = searchParams.get('search') || undefined;

		// Admin can strictly only list deleted users
		const result = await recycleBinService.listDeletedUsers({ page, limit, search });
		return NextResponse.json({ success: true, ...result });

	} catch (error) {
		console.error('Error listing deleted items:', error);
		return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
	}
}
