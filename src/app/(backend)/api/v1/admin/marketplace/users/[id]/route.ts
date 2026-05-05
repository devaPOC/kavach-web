import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session-helpers';
import { marketplaceAdminService } from '@/lib/services/marketplace-admin.service';
import { z } from 'zod';

interface RouteParams {
	params: Promise<{ id: string }>;
}

const toggleStatusSchema = z.object({
	isActive: z.boolean(),
});

// PATCH /api/v1/admin/marketplace/users/[id] - Toggle user status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
	const authResult = await requireRole(request, 'admin');

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	try {
		const { id } = await params;
		const body = await request.json();

		const validation = toggleStatusSchema.safeParse(body);
		if (!validation.success) {
			return NextResponse.json(
				{ success: false, error: validation.error.issues[0]?.message || 'Validation error' },
				{ status: 400 }
			);
		}

		const result = await marketplaceAdminService.toggleUserStatus(id, validation.data.isActive);

		if (!result.success) {
			return NextResponse.json(
				{ success: false, error: result.error },
				{ status: 404 }
			);
		}

		return NextResponse.json({ success: true, user: result.data });
	} catch (error) {
		console.error('Error updating marketplace user:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to update user' },
			{ status: 500 }
		);
	}
}

// DELETE /api/v1/admin/marketplace/users/[id] - Delete user
export async function DELETE(request: NextRequest, { params }: RouteParams) {
	const authResult = await requireRole(request, 'admin');

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	try {
		const { id } = await params;
		const result = await marketplaceAdminService.deleteUser(id);

		if (!result.success) {
			return NextResponse.json(
				{ success: false, error: result.error },
				{ status: 400 }
			);
		}

		return NextResponse.json({ success: true, message: result.message });
	} catch (error) {
		console.error('Error deleting marketplace user:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to delete user' },
			{ status: 500 }
		);
	}
}
