import { NextRequest, NextResponse } from 'next/server';
import { cookieManager } from '@/lib/auth/unified-session-manager';
import { PricingService } from '@/lib/services/pricing/pricing.service';

// GET /api/v1/admin/service-types - List active service types
export async function GET(request: NextRequest) {
	try {
		const sessionResult = await cookieManager.getSessionFromCookies(request);
		if (!sessionResult) {
			return NextResponse.json(
				{ success: false, error: 'Unauthorized' },
				{ status: 401 }
			);
		}

		if (sessionResult.role !== 'admin') {
			return NextResponse.json(
				{ success: false, error: 'Admin access required' },
				{ status: 403 }
			);
		}

		const types = await PricingService.getAvailableServiceTypes();

		return NextResponse.json({
			success: true,
			data: types,
		});
	} catch (error) {
		return NextResponse.json(
			{ success: false, error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
