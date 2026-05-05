import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session-helpers';
import { uploadFile, generateResourceKey, getFileCategory } from '@/lib/services/r2.service';

// POST - Upload a file for trainer resources
export async function POST(request: NextRequest) {
	const authResult = await requireRole(request, 'admin');

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	try {
		const formData = await request.formData();
		const file = formData.get('file') as File | null;

		if (!file) {
			return NextResponse.json(
				{ success: false, error: 'No file provided' },
				{ status: 400 }
			);
		}

		// Get file details
		const fileName = file.name;
		const fileType = file.type;
		const fileSize = file.size;

		// Validate file type
		const category = getFileCategory(fileType);
		if (!category) {
			return NextResponse.json(
				{
					success: false,
					error: 'Invalid file type. Allowed types: PDF, Word, PowerPoint, MP4, MOV, WebM'
				},
				{ status: 400 }
			);
		}

		// Convert file to buffer
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Generate storage key
		const r2Key = generateResourceKey(fileName);

		// Upload to R2
		const uploadResult = await uploadFile(buffer, r2Key, fileType, fileName);

		if (!uploadResult.success) {
			return NextResponse.json(
				{ success: false, error: uploadResult.error || 'Failed to upload file' },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			success: true,
			data: {
				fileName,
				fileSize,
				fileType,
				r2Key,
				contentUrl: uploadResult.url,
				category,
			}
		});
	} catch (error) {
		console.error('Failed to upload resource file:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to upload file' },
			{ status: 500 }
		);
	}
}

// Configure body size limit for file uploads (500MB for videos)
export const config = {
	api: {
		bodyParser: false,
	},
};
