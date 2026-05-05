import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session-helpers';
import { resourcesService } from '@/lib/services/resources.service';
import { getSignedDownloadUrl, getPublicUrl } from '@/lib/services/r2.service';

// GET - Get download URL for a resource
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const authResult = await requireRole(request, ['trainer', 'admin']);

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	try {
		const { id } = await params;

		// Get the resource
		const result = await resourcesService.getResourceById(id);

		if (!result.success || !result.data) {
			return NextResponse.json(
				{ success: false, error: 'Resource not found' },
				{ status: 404 }
			);
		}

		const resource = result.data;

		// Check if resource is published (trainers can only download published resources)
		if (!resource.isPublished && authResult.session.role !== 'admin') {
			return NextResponse.json(
				{ success: false, error: 'Resource not found' },
				{ status: 404 }
			);
		}

		// If this is a file-based resource (has r2Key), generate signed URL
		if (resource.r2Key) {
			const signedUrlResult = await getSignedDownloadUrl(resource.r2Key);

			if (!signedUrlResult.success) {
				return NextResponse.json(
					{ success: false, error: 'Failed to generate download URL' },
					{ status: 500 }
				);
			}

			return NextResponse.json({
				success: true,
				data: {
					downloadUrl: signedUrlResult.url,
					fileName: resource.fileName,
					fileSize: resource.fileSize,
					fileType: resource.fileType,
					isFileDownload: true,
				}
			});
		}

		// If it's a URL-based resource, return the content URL
		if (resource.contentUrl) {
			return NextResponse.json({
				success: true,
				data: {
					downloadUrl: resource.contentUrl,
					isFileDownload: false,
				}
			});
		}

		return NextResponse.json(
			{ success: false, error: 'No downloadable content available' },
			{ status: 404 }
		);
	} catch (error) {
		console.error('Failed to get download URL:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to get download URL' },
			{ status: 500 }
		);
	}
}
