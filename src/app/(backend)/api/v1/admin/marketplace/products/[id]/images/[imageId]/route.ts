import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session-helpers';
import { getMarketplaceDb } from '@/lib/database/marketplace-connection';
import { marketProductImages } from '@/lib/database/marketplace-schema';
import { eq, and } from 'drizzle-orm';
import { deleteImage, extractKeyFromUrl } from '@/lib/services/r2.service';

interface RouteContext {
	params: Promise<{ id: string; imageId: string }>;
}

// PATCH /api/v1/admin/marketplace/products/[id]/images/[imageId] - Update image
export async function PATCH(request: NextRequest, context: RouteContext) {
	const authResult = await requireRole(request, 'admin');

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	try {
		const { id: productId, imageId } = await context.params;
		const db = await getMarketplaceDb();
		const body = await request.json();

		// Find the image
		const existingImage = await db
			.select()
			.from(marketProductImages)
			.where(
				and(
					eq(marketProductImages.id, imageId),
					eq(marketProductImages.productId, productId)
				)
			)
			.limit(1);

		if (existingImage.length === 0) {
			return NextResponse.json(
				{ success: false, error: 'Image not found' },
				{ status: 404 }
			);
		}

		// Build update object
		const updates: Partial<{
			altText: string | null;
			isPrimary: boolean;
			sortOrder: number;
		}> = {};

		if (typeof body.altText === 'string') {
			updates.altText = body.altText || null;
		}

		if (typeof body.sortOrder === 'number') {
			updates.sortOrder = body.sortOrder;
		}

		// Handle primary image update
		if (typeof body.isPrimary === 'boolean' && body.isPrimary) {
			// Unset other primary images first
			await db
				.update(marketProductImages)
				.set({ isPrimary: false })
				.where(eq(marketProductImages.productId, productId));

			updates.isPrimary = true;
		}

		// Apply updates
		const [updatedImage] = await db
			.update(marketProductImages)
			.set(updates)
			.where(eq(marketProductImages.id, imageId))
			.returning();

		return NextResponse.json({ success: true, image: updatedImage });
	} catch (error) {
		console.error('Error updating product image:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to update image' },
			{ status: 500 }
		);
	}
}

// DELETE /api/v1/admin/marketplace/products/[id]/images/[imageId] - Delete image
export async function DELETE(request: NextRequest, context: RouteContext) {
	const authResult = await requireRole(request, 'admin');

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	try {
		const { id: productId, imageId } = await context.params;
		const db = await getMarketplaceDb();

		// Find the image
		const existingImage = await db
			.select()
			.from(marketProductImages)
			.where(
				and(
					eq(marketProductImages.id, imageId),
					eq(marketProductImages.productId, productId)
				)
			)
			.limit(1);

		if (existingImage.length === 0) {
			return NextResponse.json(
				{ success: false, error: 'Image not found' },
				{ status: 404 }
			);
		}

		const image = existingImage[0];
		const wasPrimary = image.isPrimary;

		// Delete from R2
		const key = extractKeyFromUrl(image.url);
		if (key) {
			const deleteResult = await deleteImage(key);
			if (!deleteResult.success) {
				console.error('Warning: Failed to delete image from R2:', deleteResult.error);
				// Continue anyway - we still want to remove the database record
			}
		}

		// Delete from database
		await db
			.delete(marketProductImages)
			.where(eq(marketProductImages.id, imageId));

		// If this was the primary image, set another image as primary
		if (wasPrimary) {
			const remainingImages = await db
				.select({ id: marketProductImages.id })
				.from(marketProductImages)
				.where(eq(marketProductImages.productId, productId))
				.orderBy(marketProductImages.sortOrder)
				.limit(1);

			if (remainingImages.length > 0) {
				await db
					.update(marketProductImages)
					.set({ isPrimary: true })
					.where(eq(marketProductImages.id, remainingImages[0].id));
			}
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error deleting product image:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to delete image' },
			{ status: 500 }
		);
	}
}
