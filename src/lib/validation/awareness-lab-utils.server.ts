/**
 * Server-only validation utilities for Awareness Lab
 * These utilities use DOMPurify and should ONLY be imported in server-side code
 *
 * DO NOT import this file in client components or schemas used by client code
 */

import { getDOMPurify } from '@/lib/utils/jsdom-config';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Uses DOMPurify to clean HTML while preserving safe formatting
 *
 * SERVER-SIDE ONLY - throws error if called on client
 */
export function sanitizeHtml(content: string): string {
	if (!content) return content;

	// Ensure this only runs on server
	if (typeof window !== 'undefined') {
		throw new Error('sanitizeHtml() must only be called server-side');
	}

	// Get DOMPurify with proper jsdom configuration
	const DOMPurify = getDOMPurify();

	if (!DOMPurify) {
		console.warn('DOMPurify not available, returning unsanitized content');
		return content;
	}

	// Configure DOMPurify for awareness lab content
	const config = {
		ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li'],
		ALLOWED_ATTR: [],
		KEEP_CONTENT: true,
		RETURN_DOM: false,
		RETURN_DOM_FRAGMENT: false,
		RETURN_DOM_IMPORT: false
	};

	return DOMPurify.sanitize(content.trim(), config);
}

/**
 * Sanitize question options for quiz questions
 * SERVER-SIDE ONLY
 */
export function sanitizeQuestionOptions(options: string[]): string[] {
	return options.map(opt => sanitizeHtml(opt));
}

/**
 * Validate embed code structure and sanitize
 * SERVER-SIDE ONLY
 */
export function validateEmbedCode(embedCode: string): boolean {
	if (!embedCode || typeof embedCode !== 'string') return false;

	// Basic structure validation
	const hasIframe = /<iframe[^>]*>/i.test(embedCode);
	const hasEmbed = /<embed[^>]*>/i.test(embedCode);

	if (!hasIframe && !hasEmbed) return false;

	// Check for dangerous patterns
	if (/javascript:|data:|vbscript:|on\w+=/i.test(embedCode)) {
		return false;
	}

	// Validate trusted domains
	const trustedDomains = [
		'youtube.com',
		'youtu.be',
		'vimeo.com',
		'player.vimeo.com',
		'dailymotion.com'
	];

	const srcMatch = embedCode.match(/src=["']([^"']+)["']/i);
	if (!srcMatch) return false;

	const url = srcMatch[1];
	return trustedDomains.some(domain => url.includes(domain));
}

/**
 * Sanitize learning module category
 * Ensures category names are safe and consistent
 * SERVER-SIDE ONLY
 */
export function sanitizeCategory(category: string): string {
	if (!category) return '';

	return sanitizeHtml(category)
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
		.replace(/\s+/g, '-') // Replace spaces with hyphens
		.replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
		.replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}
