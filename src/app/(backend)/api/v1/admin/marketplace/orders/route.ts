import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session-helpers';
import { marketplaceAdminService } from '@/lib/services/marketplace-admin.service';

// GET /api/v1/admin/marketplace/orders - List orders
export async function GET(request: NextRequest) {
	const authResult = await requireRole(request, 'admin');

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	try {
		const { searchParams } = new URL(request.url);

		const result = await marketplaceAdminService.getOrders({
			page: parseInt(searchParams.get('page') || '1', 10),
			limit: parseInt(searchParams.get('limit') || '20', 10),
			status: searchParams.get('status') || undefined,
			search: searchParams.get('search') || undefined,
		});

		if (!result.success) {
			return NextResponse.json({ success: false, error: result.error }, { status: 400 });
		}

		return NextResponse.json({ success: true, ...result.data });
	} catch (error) {
		console.error('Error listing marketplace orders:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to fetch orders' },
			{ status: 500 }
		);
	}
}
