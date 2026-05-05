import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session-helpers';
import { marketplaceAdminService, createProductSchema } from '@/lib/services/marketplace-admin.service';

// GET /api/v1/admin/marketplace/products - List products
export async function GET(request: NextRequest) {
	const authResult = await requireRole(request, 'admin');

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	try {
		const { searchParams } = new URL(request.url);

		const result = await marketplaceAdminService.getProducts({
			page: parseInt(searchParams.get('page') || '1', 10),
			limit: parseInt(searchParams.get('limit') || '20', 10),
			search: searchParams.get('search') || undefined,
			status: searchParams.get('status') || undefined,
			sortBy: searchParams.get('sortBy') || 'createdAt',
			sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
		});

		if (!result.success) {
			return NextResponse.json({ success: false, error: result.error }, { status: 400 });
		}

		return NextResponse.json({ success: true, ...result.data });
	} catch (error) {
		console.error('Error listing marketplace products:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to fetch products' },
			{ status: 500 }
		);
	}
}

// POST /api/v1/admin/marketplace/products - Create product
export async function POST(request: NextRequest) {
	const authResult = await requireRole(request, 'admin');

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	try {
		const body = await request.json();

		const validation = createProductSchema.safeParse(body);
		if (!validation.success) {
			return NextResponse.json(
				{ success: false, error: validation.error.issues[0]?.message || 'Validation error' },
				{ status: 400 }
			);
		}

		const result = await marketplaceAdminService.createProduct(validation.data);

		if (!result.success) {
			return NextResponse.json({ success: false, error: result.error }, { status: 400 });
		}

		return NextResponse.json({ success: true, product: result.data }, { status: 201 });
	} catch (error) {
		console.error('Error creating marketplace product:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to create product' },
			{ status: 500 }
		);
	}
}
