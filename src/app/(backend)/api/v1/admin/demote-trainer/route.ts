import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session-helpers';
import { adminService } from '@/lib/services/admin/admin.service';

export async function POST(request: NextRequest) {
	const authResult = await requireRole(request, 'admin');

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	try {
		const { trainerId } = await request.json();

		if (!trainerId) {
			return NextResponse.json(
				{ success: false, error: 'Trainer ID is required' },
				{ status: 400 }
			);
		}

		const result = await adminService.demoteFromTrainer(
			trainerId,
			authResult.session.userId
		);

		if (!result.success) {
			return NextResponse.json(result, { status: 400 });
		}

		return NextResponse.json(result);
	} catch (error) {
		console.error('Failed to demote trainer:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to demote trainer' },
			{ status: 500 }
		);
	}
}
