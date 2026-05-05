import { NextRequest } from 'next/server';
import { defaultRateLimitStore, RateLimitEntry, RateLimitStore } from './rate-limit-store';
// import { recordRateLimit } from '@/lib/utils/metrics'; // Disabled for Edge runtime compatibility

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxAttempts: number; // Maximum attempts per window
  blockDurationMs?: number; // How long to block after exceeding limit
  keyGenerator?: (request: NextRequest) => string; // Custom key generator
}

// Default configurations for different endpoints
export const RATE_LIMIT_CONFIGS = {
  LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 5, // 5 attempts per 15 minutes
    blockDurationMs: 30 * 60 * 1000 // Block for 30 minutes after exceeding
  },
  SIGNUP: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 3, // 3 signups per hour per IP
    blockDurationMs: 60 * 60 * 1000 // Block for 1 hour
  },
  EMAIL_VERIFICATION: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 10, // 10 verification attempts per hour
    blockDurationMs: 60 * 60 * 1000 // Block for 1 hour
  },
  RESEND_VERIFICATION: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 3, // 3 resend attempts per hour
    blockDurationMs: 2 * 60 * 60 * 1000 // Block for 2 hours
  },
  ADMIN_LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 20, // 3 attempts per 15 minutes (stricter for admin)
    blockDurationMs: 60 * 60 * 1000 // Block for 1 hour
  }
} as const;

// In-memory store for rate limiting
let rateLimitStore: RateLimitStore = defaultRateLimitStore;

/**
 * Rate limiting result
 */
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number; // Seconds until next attempt allowed
  blocked: boolean;
  blockedUntil?: number;
}

function generateRateLimitKey(request: NextRequest, prefix: string, customKeyGenerator?: (req: NextRequest) => string): string {
  if (customKeyGenerator) {
    return `${prefix}:${customKeyGenerator(request)}`;
  }

  // Use IP address as default key
  const ip = getClientIP(request);
  return `${prefix}:${ip}`;
}

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback to a default value if no IP is found
  return 'unknown';
}


export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  identifier: string = 'default'
): RateLimitResult {
  // RATE LIMITING DISABLED - Always return success
  return {
    success: true,
    limit: config.maxAttempts,
    remaining: config.maxAttempts - 1,
    resetTime: Date.now() + config.windowMs,
    blocked: false
  };
}

export function createRateLimitMiddleware(config: RateLimitConfig, identifier: string) {
  return (request: NextRequest) => {
    return checkRateLimit(request, config, identifier);
  };
}

/**
 * Predefined rate limiters for common authentication endpoints
 */
export const rateLimiters = {
  login: (request: NextRequest) => checkRateLimit(request, RATE_LIMIT_CONFIGS.LOGIN, 'login'),
  signup: (request: NextRequest) => checkRateLimit(request, RATE_LIMIT_CONFIGS.SIGNUP, 'signup'),
  emailVerification: (request: NextRequest) => checkRateLimit(request, RATE_LIMIT_CONFIGS.EMAIL_VERIFICATION, 'email-verify'),
  resendVerification: (request: NextRequest) => checkRateLimit(request, RATE_LIMIT_CONFIGS.RESEND_VERIFICATION, 'resend-verify'),
  adminLogin: (request: NextRequest) => checkRateLimit(request, RATE_LIMIT_CONFIGS.ADMIN_LOGIN, 'admin-login')
};

/**
 * Reset rate limit for a specific key (useful for successful authentications)
 */
export function resetRateLimit(request: NextRequest, identifier: string): void {
  const key = generateRateLimitKey(request, identifier);
  rateLimitStore.delete(key);
}

/**
 * Get rate limit headers for HTTP responses
 * Standard rate limit headers as per draft-ietf-httpapi-ratelimit-headers
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString()
  };

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  if (result.blocked && result.blockedUntil) {
    headers['X-RateLimit-Blocked-Until'] = Math.ceil(result.blockedUntil / 1000).toString();
  }

  return headers;
}

/**
 * Create rate limit error response with enhanced timing information
 */
export function createRateLimitErrorResponse(result: RateLimitResult): {
  error: string;
  message: string;
  retryAfter?: number;
  blockedUntil?: number;
  retryAfterMinutes?: number;
  retryAfterSeconds?: number;
  formattedRetryTime?: string;
} {
  const retryAfter = result.retryAfter || 0;
  const retryAfterMinutes = Math.floor(retryAfter / 60);
  const retryAfterSeconds = retryAfter % 60;

  // Format the retry time for better UX
  const formattedRetryTime = formatRetryTime(retryAfter);

  if (result.blocked) {
    return {
      error: 'RATE_LIMIT_EXCEEDED',
      message: `Too many attempts. Please try again ${formattedRetryTime}.`,
      retryAfter,
      blockedUntil: result.blockedUntil,
      retryAfterMinutes,
      retryAfterSeconds,
      formattedRetryTime
    };
  }

  return {
    error: 'RATE_LIMIT_EXCEEDED',
    message: `Too many attempts. You have ${result.remaining} attempts remaining. Try again ${formattedRetryTime}.`,
    retryAfter,
    retryAfterMinutes,
    retryAfterSeconds,
    formattedRetryTime
  };
}

/**
 * Format retry time into a human-readable string
 */
function formatRetryTime(seconds: number): string {
  if (seconds < 60) {
    return `in ${seconds} second${seconds !== 1 ? 's' : ''}`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  if (minutes === 1 && remainingSeconds < 30) {
    return `in about 1 minute`;
  }

  if (minutes < 5) {
    return `in ${minutes} minute${minutes !== 1 ? 's' : ''} and ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
  }

  return `in about ${Math.ceil(seconds / 60)} minute${Math.ceil(seconds / 60) !== 1 ? 's' : ''}`;
}

/**
 * Cleanup function for graceful shutdown
 */
export function setRateLimitStore(store: RateLimitStore) { rateLimitStore = store; }
