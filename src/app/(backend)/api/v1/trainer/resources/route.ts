import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session-helpers';
import { resourcesService } from '@/lib/services/resources.service';

// GET - Trainer access to published resources
export async function GET(request: NextRequest) {
	const authResult = await requireRole(request, ['trainer', 'admin']);

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	try {
		const result = await resourcesService.getPublishedResources();

		if (!result.success) {
			return NextResponse.json(result, { status: 400 });
		}

		return NextResponse.json(result);
	} catch (error) {
		console.error('Failed to fetch resources:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to fetch resources' },
			{ status: 500 }
		);
	}
}
