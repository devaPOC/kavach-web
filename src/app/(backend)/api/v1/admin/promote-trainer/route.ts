import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session-helpers';
import { adminService } from '@/lib/services/admin/admin.service';

export async function POST(request: NextRequest) {
	const authResult = await requireRole(request, 'admin');

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	try {
		const { expertId } = await request.json();

		if (!expertId) {
			return NextResponse.json(
				{ success: false, error: 'Expert ID is required' },
				{ status: 400 }
			);
		}

		const result = await adminService.promoteToTrainer(
			expertId,
			authResult.session.userId
		);

		if (!result.success) {
			return NextResponse.json(result, { status: 400 });
		}

		return NextResponse.json(result);
	} catch (error) {
		console.error('Failed to promote expert to trainer:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to promote expert to trainer' },
			{ status: 500 }
		);
	}
}
