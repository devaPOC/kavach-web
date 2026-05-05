import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session-helpers';
import { getMarketplaceDb } from '@/lib/database/marketplace-connection';
import { marketProductImages, marketProducts } from '@/lib/database/marketplace-schema';
import { eq, desc } from 'drizzle-orm';
import { uploadImage, generateImageKey, validateImageFile } from '@/lib/services/r2.service';

interface RouteContext {
	params: Promise<{ id: string }>;
}

// GET /api/v1/admin/marketplace/products/[id]/images - List product images
export async function GET(request: NextRequest, context: RouteContext) {
	const authResult = await requireRole(request, 'admin');

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	try {
		const { id: productId } = await context.params;
		const db = await getMarketplaceDb();

		// Verify product exists
		const product = await db
			.select({ id: marketProducts.id })
			.from(marketProducts)
			.where(eq(marketProducts.id, productId))
			.limit(1);

		if (product.length === 0) {
			return NextResponse.json(
				{ success: false, error: 'Product not found' },
				{ status: 404 }
			);
		}

		// Get all images for the product
		const images = await db
			.select()
			.from(marketProductImages)
			.where(eq(marketProductImages.productId, productId))
			.orderBy(desc(marketProductImages.isPrimary), marketProductImages.sortOrder);

		return NextResponse.json({ success: true, images });
	} catch (error) {
		console.error('Error fetching product images:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to fetch images' },
			{ status: 500 }
		);
	}
}

// POST /api/v1/admin/marketplace/products/[id]/images - Upload new image
export async function POST(request: NextRequest, context: RouteContext) {
	const authResult = await requireRole(request, 'admin');

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	try {
		const { id: productId } = await context.params;
		const db = await getMarketplaceDb();

		// Verify product exists
		const product = await db
			.select({ id: marketProducts.id })
			.from(marketProducts)
			.where(eq(marketProducts.id, productId))
			.limit(1);

		if (product.length === 0) {
			return NextResponse.json(
				{ success: false, error: 'Product not found' },
				{ status: 404 }
			);
		}

		// Parse multipart form data
		const formData = await request.formData();
		const file = formData.get('image') as File | null;
		const altText = formData.get('altText') as string | null;
		const isPrimary = formData.get('isPrimary') === 'true';

		if (!file) {
			return NextResponse.json(
				{ success: false, error: 'No image file provided' },
				{ status: 400 }
			);
		}

		// Convert file to buffer
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Validate image
		const validation = validateImageFile(buffer, file.type);
		if (!validation.valid) {
			return NextResponse.json(
				{ success: false, error: validation.error },
				{ status: 400 }
			);
		}

		// Generate unique key and upload to R2
		const key = generateImageKey(productId, file.name);
		const uploadResult = await uploadImage(buffer, key, file.type);

		if (!uploadResult.success) {
			return NextResponse.json(
				{ success: false, error: uploadResult.error },
				{ status: 500 }
			);
		}

		// If this is set as primary, unset other primary images
		if (isPrimary) {
			await db
				.update(marketProductImages)
				.set({ isPrimary: false })
				.where(eq(marketProductImages.productId, productId));
		}

		// Get current max sort order
		const existingImages = await db
			.select({ sortOrder: marketProductImages.sortOrder })
			.from(marketProductImages)
			.where(eq(marketProductImages.productId, productId))
			.orderBy(desc(marketProductImages.sortOrder))
			.limit(1);

		const nextSortOrder = existingImages.length > 0 ? existingImages[0].sortOrder + 1 : 0;

		// Check if this is the first image (should be primary by default)
		const imageCount = await db
			.select({ id: marketProductImages.id })
			.from(marketProductImages)
			.where(eq(marketProductImages.productId, productId));

		const shouldBePrimary = isPrimary || imageCount.length === 0;

		// Insert image record
		const [newImage] = await db
			.insert(marketProductImages)
			.values({
				productId,
				url: uploadResult.url!,
				altText: altText || null,
				isPrimary: shouldBePrimary,
				sortOrder: nextSortOrder,
			})
			.returning();

		return NextResponse.json(
			{ success: true, image: newImage },
			{ status: 201 }
		);
	} catch (error) {
		console.error('Error uploading product image:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to upload image' },
			{ status: 500 }
		);
	}
}
