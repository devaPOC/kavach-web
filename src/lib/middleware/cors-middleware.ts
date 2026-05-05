/**
 * CORS Middleware
 * Handles Cross-Origin Resource Sharing for the API
 * Enables mobile app and other clients to communicate with the backend
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Allowed origins for CORS requests
 * In development, we allow all localhost and Expo dev URLs
 * In production, we restrict to the production domains
 */
const ALLOWED_ORIGINS: string[] = [
	// Production domains
	'https://dashboard.kavachcyber.com',
	'https://kavachcyber.com',

	// Development and testing
	...(process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' ? [
		'http://localhost:3000',
		'http://localhost:8081',
		'http://127.0.0.1:3000',
		'http://127.0.0.1:8081',
		// Expo development URLs
		'exp://localhost:8081',
		'exp://127.0.0.1:8081',
	] : []),
];

/**
 * Patterns for dynamic origin matching (e.g., Expo dev on different IPs)
 */
const ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
	// Expo dev server on local network (e.g., exp://192.168.1.100:8081)
	/^exp:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/,
	// HTTP local network (e.g., http://192.168.1.100:8081)
	/^http:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/,
	// Android emulator
	/^http:\/\/10\.0\.2\.2:\d+$/,
];

/**
 * Check if an origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
	if (!origin) {
		// Allow requests with no origin (e.g., mobile apps, same-origin requests)
		return true;
	}

	// Check exact matches
	if (ALLOWED_ORIGINS.includes(origin)) {
		return true;
	}

	// Check pattern matches (only in development)
	if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
		return ALLOWED_ORIGIN_PATTERNS.some(pattern => pattern.test(origin));
	}

	return false;
}

/**
 * Get CORS headers for a request
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
	const headers: Record<string, string> = {
		'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
		'Access-Control-Allow-Headers':
			'Content-Type, Authorization, X-Requested-With, X-Request-ID, X-Correlation-ID, Accept',
		'Access-Control-Max-Age': '86400', // 24 hours
		'Access-Control-Expose-Headers': 'X-Request-ID, X-Correlation-ID, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset',
	};

	// Set Allow-Origin header
	if (origin && isOriginAllowed(origin)) {
		headers['Access-Control-Allow-Origin'] = origin;
		headers['Access-Control-Allow-Credentials'] = 'true';
	} else if (!origin) {
		// For requests without origin (mobile apps), allow all
		headers['Access-Control-Allow-Origin'] = '*';
	}

	return headers;
}

/**
 * Apply CORS headers to a response
 */
export function applyCorsHeaders(
	response: NextResponse,
	request: NextRequest
): NextResponse {
	const origin = request.headers.get('origin');
	const corsHeaders = getCorsHeaders(origin);

	Object.entries(corsHeaders).forEach(([key, value]) => {
		response.headers.set(key, value);
	});

	return response;
}

/**
 * Handle OPTIONS preflight request
 */
export function handleOptionsRequest(request: NextRequest): NextResponse {
	const origin = request.headers.get('origin');
	const corsHeaders = getCorsHeaders(origin);

	return new NextResponse(null, {
		status: 204,
		headers: corsHeaders,
	});
}

/**
 * Check if the request is a preflight OPTIONS request
 */
export function isPreflightRequest(request: NextRequest): boolean {
	return (
		request.method === 'OPTIONS' &&
		request.headers.has('access-control-request-method')
	);
}

/**
 * Check if the request is for an API route
 */
export function isApiRoute(pathname: string): boolean {
	return pathname.startsWith('/api/');
}
