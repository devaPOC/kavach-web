import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session-helpers';
import { marketplaceAdminService, updateOrderStatusSchema } from '@/lib/services/marketplace-admin.service';

interface RouteParams {
	params: Promise<{ id: string }>;
}

// GET /api/v1/admin/marketplace/orders/[id] - Get order details
export async function GET(request: NextRequest, { params }: RouteParams) {
	const authResult = await requireRole(request, 'admin');

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	try {
		const { id } = await params;
		const result = await marketplaceAdminService.getOrderById(id);

		if (!result.success) {
			return NextResponse.json(
				{ success: false, error: result.error },
				{ status: 404 }
			);
		}

		return NextResponse.json({ success: true, order: result.data });
	} catch (error) {
		console.error('Error fetching marketplace order:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to fetch order' },
			{ status: 500 }
		);
	}
}

// PATCH /api/v1/admin/marketplace/orders/[id] - Update order status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
	const authResult = await requireRole(request, 'admin');

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	try {
		const { id } = await params;
		const body = await request.json();

		const validation = updateOrderStatusSchema.safeParse(body);
		if (!validation.success) {
			return NextResponse.json(
				{ success: false, error: validation.error.issues[0]?.message || 'Validation error' },
				{ status: 400 }
			);
		}

		const result = await marketplaceAdminService.updateOrderStatus(id, validation.data);

		if (!result.success) {
			return NextResponse.json(
				{ success: false, error: result.error },
				{ status: 404 }
			);
		}

		return NextResponse.json({ success: true, order: result.data });
	} catch (error) {
		console.error('Error updating marketplace order:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to update order' },
			{ status: 500 }
		);
	}
}

// DELETE /api/v1/admin/marketplace/orders/[id] - Delete order
export async function DELETE(request: NextRequest, { params }: RouteParams) {
	const authResult = await requireRole(request, 'admin');

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	try {
		const { id } = await params;
		const result = await marketplaceAdminService.deleteOrder(id);

		if (!result.success) {
			return NextResponse.json(
				{ success: false, error: result.error },
				{ status: 404 }
			);
		}

		return NextResponse.json({ success: true, message: result.message });
	} catch (error) {
		console.error('Error deleting marketplace order:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to delete order' },
			{ status: 500 }
		);
	}
}
