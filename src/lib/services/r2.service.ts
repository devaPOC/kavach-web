/**
 * R2 Storage Service
 *
 * Provides functionality for uploading, deleting, and managing files
 * in Cloudflare R2 (S3-compatible storage).
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Allowed file types by category
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOCUMENT_TYPES = [
	'application/pdf',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/vnd.ms-powerpoint',
	'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

// Size limits
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB

// R2 Configuration from environment
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// Validate required environment variables
function validateConfig(): void {
	const missing: string[] = [];
	if (!R2_ACCOUNT_ID) missing.push('R2_ACCOUNT_ID');
	if (!R2_ACCESS_KEY_ID) missing.push('R2_ACCESS_KEY_ID');
	if (!R2_SECRET_ACCESS_KEY) missing.push('R2_SECRET_ACCESS_KEY');
	if (!R2_BUCKET_NAME) missing.push('R2_BUCKET_NAME');
	if (!R2_PUBLIC_URL) missing.push('R2_PUBLIC_URL');

	if (missing.length > 0) {
		throw new Error(`R2 configuration incomplete. Missing: ${missing.join(', ')}`);
	}
}

// Create S3-compatible client for R2
function createR2Client(): S3Client {
	validateConfig();

	return new S3Client({
		region: 'auto',
		endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: R2_ACCESS_KEY_ID!,
			secretAccessKey: R2_SECRET_ACCESS_KEY!,
		},
	});
}

// Lazy-loaded R2 client
let r2Client: S3Client | null = null;

function getClient(): S3Client {
	if (!r2Client) {
		r2Client = createR2Client();
	}
	return r2Client;
}

export interface UploadResult {
	success: boolean;
	key?: string;
	url?: string;
	error?: string;
}

export interface ValidationResult {
	valid: boolean;
	error?: string;
}

export type FileCategory = 'image' | 'document' | 'video';

/**
 * Get file category from MIME type
 */
export function getFileCategory(mimeType: string): FileCategory | null {
	if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return 'image';
	if (ALLOWED_DOCUMENT_TYPES.includes(mimeType)) return 'document';
	if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return 'video';
	return null;
}

/**
 * Get max file size for a category
 */
export function getMaxFileSize(category: FileCategory): number {
	switch (category) {
		case 'image': return MAX_IMAGE_SIZE;
		case 'document': return MAX_DOCUMENT_SIZE;
		case 'video': return MAX_VIDEO_SIZE;
	}
}

/**
 * Validate an image file before upload
 */
export function validateImageFile(
	buffer: Buffer,
	mimeType: string
): ValidationResult {
	// Check MIME type
	if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
		return {
			valid: false,
			error: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
		};
	}

	// Check file size
	if (buffer.length > MAX_IMAGE_SIZE) {
		return {
			valid: false,
			error: `File too large. Maximum size: ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`,
		};
	}

	return { valid: true };
}

/**
 * Validate any file type (image, document, or video)
 */
export function validateFile(
	buffer: Buffer,
	mimeType: string
): ValidationResult {
	const category = getFileCategory(mimeType);

	if (!category) {
		const allTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES, ...ALLOWED_VIDEO_TYPES];
		return {
			valid: false,
			error: `Invalid file type. Allowed types: ${allTypes.join(', ')}`,
		};
	}

	const maxSize = getMaxFileSize(category);
	if (buffer.length > maxSize) {
		return {
			valid: false,
			error: `File too large. Maximum size for ${category}s: ${maxSize / (1024 * 1024)}MB`,
		};
	}

	return { valid: true };
}

/**
 * Generate a unique key for an uploaded image
 */
export function generateImageKey(productId: string, originalFilename: string): string {
	const timestamp = Date.now();
	const randomSuffix = Math.random().toString(36).substring(2, 8);
	const extension = originalFilename.split('.').pop()?.toLowerCase() || 'jpg';
	return `products/${productId}/${timestamp}-${randomSuffix}.${extension}`;
}

/**
 * Generate a unique key for a trainer resource file
 */
export function generateResourceKey(originalFilename: string): string {
	const timestamp = Date.now();
	const randomSuffix = Math.random().toString(36).substring(2, 8);
	const extension = originalFilename.split('.').pop()?.toLowerCase() || 'file';
	return `trainer-resources/${timestamp}-${randomSuffix}.${extension}`;
}

/**
 * Get the public URL for an uploaded file
 */
export function getPublicUrl(key: string): string {
	// Remove trailing slash from R2_PUBLIC_URL if present
	const baseUrl = R2_PUBLIC_URL?.replace(/\/$/, '') || '';
	return `${baseUrl}/${key}`;
}

/**
 * Upload an image to R2
 */
export async function uploadImage(
	buffer: Buffer,
	key: string,
	mimeType: string
): Promise<UploadResult> {
	try {
		// Validate the image
		const validation = validateImageFile(buffer, mimeType);
		if (!validation.valid) {
			return { success: false, error: validation.error };
		}

		const client = getClient();

		const command = new PutObjectCommand({
			Bucket: R2_BUCKET_NAME!,
			Key: key,
			Body: buffer,
			ContentType: mimeType,
		});

		await client.send(command);

		return {
			success: true,
			key,
			url: getPublicUrl(key),
		};
	} catch (error) {
		console.error('R2 upload error:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to upload image',
		};
	}
}

/**
 * Upload any file to R2 (image, document, or video)
 */
export async function uploadFile(
	buffer: Buffer,
	key: string,
	mimeType: string,
	originalFilename: string
): Promise<UploadResult> {
	try {
		// Validate the file
		const validation = validateFile(buffer, mimeType);
		if (!validation.valid) {
			return { success: false, error: validation.error };
		}

		const client = getClient();

		// Encode filename for Content-Disposition header (RFC 5987)
		// This handles special characters and non-ASCII characters safely
		const safeFilename = originalFilename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
		const encodedFilename = encodeURIComponent(originalFilename);

		const command = new PutObjectCommand({
			Bucket: R2_BUCKET_NAME!,
			Key: key,
			Body: buffer,
			ContentType: mimeType,
			ContentDisposition: `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
		});

		await client.send(command);

		return {
			success: true,
			key,
			url: getPublicUrl(key),
		};
	} catch (error) {
		console.error('R2 upload error:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to upload file',
		};
	}
}

/**
 * Delete an image from R2
 */
export async function deleteImage(key: string): Promise<{ success: boolean; error?: string }> {
	try {
		const client = getClient();

		const command = new DeleteObjectCommand({
			Bucket: R2_BUCKET_NAME!,
			Key: key,
		});

		await client.send(command);

		return { success: true };
	} catch (error) {
		console.error('R2 delete error:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to delete image',
		};
	}
}

/**
 * Delete any file from R2
 */
export async function deleteFile(key: string): Promise<{ success: boolean; error?: string }> {
	return deleteImage(key); // Same implementation
}

/**
 * Generate a signed download URL for a file
 */
export async function getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<{ success: boolean; url?: string; error?: string }> {
	try {
		const client = getClient();

		const command = new GetObjectCommand({
			Bucket: R2_BUCKET_NAME!,
			Key: key,
		});

		const signedUrl = await getSignedUrl(client, command, { expiresIn });

		return {
			success: true,
			url: signedUrl,
		};
	} catch (error) {
		console.error('R2 signed URL error:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to generate download URL',
		};
	}
}

/**
 * Extract the key from a full R2 URL
 */
export function extractKeyFromUrl(url: string): string | null {
	if (!R2_PUBLIC_URL) return null;

	const baseUrl = R2_PUBLIC_URL.replace(/\/$/, '');
	if (url.startsWith(baseUrl)) {
		return url.substring(baseUrl.length + 1); // +1 for the slash
	}

	return null;
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// Export types
export type { S3Client };
