import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session-helpers';
import { marketplaceAdminService, updateProductSchema } from '@/lib/services/marketplace-admin.service';

interface RouteParams {
	params: Promise<{ id: string }>;
}

// GET /api/v1/admin/marketplace/products/[id] - Get product details
export async function GET(request: NextRequest, { params }: RouteParams) {
	const authResult = await requireRole(request, 'admin');

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	try {
		const { id } = await params;
		const result = await marketplaceAdminService.getProductById(id);

		if (!result.success) {
			return NextResponse.json(
				{ success: false, error: result.error },
				{ status: 404 }
			);
		}

		return NextResponse.json({ success: true, product: result.data });
	} catch (error) {
		console.error('Error fetching marketplace product:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to fetch product' },
			{ status: 500 }
		);
	}
}

// PATCH /api/v1/admin/marketplace/products/[id] - Update product
export async function PATCH(request: NextRequest, { params }: RouteParams) {
	const authResult = await requireRole(request, 'admin');

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	try {
		const { id } = await params;
		const body = await request.json();

		const validation = updateProductSchema.safeParse(body);
		if (!validation.success) {
			return NextResponse.json(
				{ success: false, error: validation.error.issues[0]?.message || 'Validation error' },
				{ status: 400 }
			);
		}

		const result = await marketplaceAdminService.updateProduct(id, validation.data);

		if (!result.success) {
			return NextResponse.json(
				{ success: false, error: result.error },
				{ status: result.error === 'Product not found' ? 404 : 400 }
			);
		}

		return NextResponse.json({ success: true, product: result.data });
	} catch (error) {
		console.error('Error updating marketplace product:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to update product' },
			{ status: 500 }
		);
	}
}

// DELETE /api/v1/admin/marketplace/products/[id] - Delete product
export async function DELETE(request: NextRequest, { params }: RouteParams) {
	const authResult = await requireRole(request, 'admin');

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	try {
		const { id } = await params;
		const result = await marketplaceAdminService.deleteProduct(id);

		if (!result.success) {
			return NextResponse.json(
				{ success: false, error: result.error },
				{ status: 404 }
			);
		}

		return NextResponse.json({ success: true, message: 'Product deleted' });
	} catch (error) {
		console.error('Error deleting marketplace product:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to delete product' },
			{ status: 500 }
		);
	}
}
