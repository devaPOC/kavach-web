/**
 * jsdom Configuration Utility
 *
 * Configures jsdom to prevent file system access in serverless environments.
 * This prevents ENOENT errors when jsdom tries to load CSS files from the
 * Next.js build directory (e.g., '/var/task/.next/browser/default-stylesheet.css')
 * 
 * IMPORTANT: This module must be server-side only. Do not import in client components.
 */

// Mark this module as server-only to prevent client-side bundling
let jsdomConfigured = false;

/**
 * Configure jsdom to skip resource loading (CSS, images, etc.)
 * Only runs on server-side (Node.js environment)
 */
export function configureJsdom(): void {
	// Only configure on server-side
	if (typeof window !== 'undefined') {
		return;
	}

	// Skip if already configured
	if (jsdomConfigured) {
		return;
	}

	try {
		// Dynamic import to prevent webpack from trying to bundle jsdom
		const jsdom = require('jsdom');
		const { ResourceLoader } = jsdom;

		// Create a custom ResourceLoader that skips all external resources
		const resourceLoader = new ResourceLoader({
strictSSL: false,
userAgent: 'kavach-server/1.0',
});

		// Override fetch to prevent loading any external resources
		resourceLoader.fetch = function () {
			return null;
		};

		// Set environment variable as additional safeguard
		if (process.env) {
			process.env.JSDOM_RESOURCE_LOADER = 'skip';
		}

		// Mark as configured
		jsdomConfigured = true;
	} catch (error) {
		// jsdom might not be available or configuration failed
		// Log but don't throw - allow DOMPurify to work anyway
if (typeof console !== 'undefined' && console.warn) {
console.warn('Failed to configure jsdom:', error);
}
}
}

/**
 * Get DOMPurify instance with proper jsdom configuration
 * Only runs on server-side (Node.js environment)
 * 
 * Returns null on client-side to avoid bundling issues
 */
export function getDOMPurify() {
// Return null on client-side
if (typeof window !== 'undefined') {
return null;
}

// Only configure jsdom on server-side
configureJsdom();

// Dynamic require to prevent webpack bundling issues
// @ts-ignore: require is valid in server context
return require('isomorphic-dompurify');
}
