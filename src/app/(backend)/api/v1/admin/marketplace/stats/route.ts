import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session-helpers';
import { marketplaceAdminService } from '@/lib/services/marketplace-admin.service';

// GET /api/v1/admin/marketplace/stats - Get marketplace overview statistics
export async function GET(request: NextRequest) {
	const authResult = await requireRole(request, 'admin');

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	try {
		const result = await marketplaceAdminService.getOverviewStats();

		if (!result.success) {
			return NextResponse.json({ success: false, error: result.error }, { status: 400 });
		}

		return NextResponse.json({ success: true, stats: result.data });
	} catch (error) {
		console.error('Error fetching marketplace stats:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to fetch stats' },
			{ status: 500 }
		);
	}
}
