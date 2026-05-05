import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, setSessionCookie, clearSessionCookie } from './edge-session';
import { generateToken, verifyToken, isTokenExpired } from './jwt-utils';

// Edge runtime: use Web Crypto instead of Node 'crypto' module
function generateNonce(size: number = 16): string {
  // Use Uint8Array + crypto.getRandomValues (Edge-compatible)
  const bytes = new Uint8Array(size);
  globalThis.crypto.getRandomValues(bytes);
  // Convert to base64 (strip padding for CSP nonce aesthetics)
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/=+$/, '');
}

/**
 * Enhanced security configuration interface
 */
interface SecurityConfig {
  enableHSTS: boolean;
  enableCSP: boolean;
  strictCSP: boolean;
  enablePermissionsPolicy: boolean;
  enableReferrerPolicy: boolean;
}

/**
 * Get security configuration based on environment
 */
function getSecurityConfig(): SecurityConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    enableHSTS: isProduction,
    enableCSP: true,
    strictCSP: isProduction && !process.env.CSP_DISABLE_STRICT, // Allow disabling strict CSP with env var
    enablePermissionsPolicy: true,
    enableReferrerPolicy: true
  };
}

// Legacy session renewal functions removed - now handled by unified session manager

export function addSecurityHeaders(response: NextResponse): NextResponse {
  const config = getSecurityConfig();

  // Core security headers - always applied
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer Policy
  if (config.enableReferrerPolicy) {
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  }

  // Enhanced Permissions Policy
  if (config.enablePermissionsPolicy) {
    const permissionsPolicy = [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
      'fullscreen=(self)',
      'picture-in-picture=()'
    ].join(', ');

    response.headers.set('Permissions-Policy', permissionsPolicy);
  }

  // Content Security Policy
  if (config.enableCSP) {
    const { csp, nonce } = generateCSP(config.strictCSP);

    // Use report-only in production temporarily to avoid blocking
    const headerName = process.env.VERCEL === '1'
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy';

    response.headers.set(headerName, csp);
    response.headers.set('X-Request-Nonce', nonce);
  }

  // HSTS in production
  if (config.enableHSTS) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Additional security headers
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

  return response;
}

/**
 * Generate Content Security Policy with nonce
 */
function generateCSP(strict: boolean): { csp: string; nonce: string } {
  const nonce = generateNonce(16);
  const isVercel = process.env.VERCEL === '1';
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Base CSP directives
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`],
    "style-src": ["'self'", "'unsafe-inline'"], // Keep unsafe-inline for compatibility
    "img-src": ["'self'", 'data:', 'https:'],
    "font-src": ["'self'", 'data:', 'https:'], // Allow https for external fonts
    "connect-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    "manifest-src": ["'self'"],
    "media-src": ["'self'"]
  };

  // Production and Vercel specific configurations
  if (strict && !isDevelopment) {
    // Add known Next.js hashes from your error messages
    const nextJsHashes = [
      "'sha256-P8egQZSlBYcb/ZTwPMr/xxxEP9Vq0i04dHT+n6dLiKc='",
      "'sha256-2PveyQ+xNbz50HdYhKX+UywFOKrAEK8hBLkTFI0vlz0='",
      "'sha256-slRYTruhqybzgWr4CcQmgk0WgZQQLrzNbA8Og7Qnww4='",
      "'sha256-rKaWPkVrDd5JMf1IGwsWyODqMy26w5UKE7ZfhSh0Mas='",
      "'sha256-ZQtaLTVJBVbpEzKEj5mHBDi74TqSpi3tlUF2Au1OoQY='",
      "'sha256-FhLHRUQz4c4ntLU9VkfEesX7PnzNLENSe/16Hi523Kk='",
      "'sha256-LW8X/gEPDDuhKlzQIYHF1MnSmQtvIi0BrO6mtgBRg74='",
      "'sha256-bg+CWjI8RppcgHYH6RuW4z4OnLAUEUPDXRoYUo9Tyok='"
    ];

    directives['script-src'].push(...nextJsHashes);
    directives['upgrade-insecure-requests'] = [];

    // Vercel specific domains
    if (isVercel) {
      directives['connect-src'].push('https://*.vercel.app', 'https://*.vercel.com');
    }
  } else {
    // Development-specific relaxations
    directives['script-src'].push("'unsafe-eval'");
    directives['connect-src'].push('ws:', 'wss:', 'http://localhost:*', 'https://localhost:*');

    // More permissive for development
    if (isDevelopment) {
      directives['script-src'].push("'unsafe-inline'"); // Only for development
    }
  }

  const csp = Object.entries(directives)
    .map(([key, values]) => values.length > 0 ? `${key} ${values.join(' ')}` : key)
    .join('; ');

  return { csp, nonce };
}

export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP;
  const cf = request.headers.get('cf-connecting-ip');
  if (cf) return cf;
  return (request as any).ip || 'unknown';
}

// Local rate limiting removed; unified implementation lives in rate-limiter.ts
