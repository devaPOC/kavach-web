/**
 * Client-side utilities for handling rate limit information
 */

export interface RateLimitInfo {
  isRateLimited: boolean;
  retryAfter?: number;
  retryAfterMinutes?: number;
  retryAfterSeconds?: number;
  formattedRetryTime?: string;
  blockedUntil?: number;
  resetTime?: number;
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit'?: string;
  'X-RateLimit-Remaining'?: string;
  'X-RateLimit-Reset'?: string;
  'Retry-After'?: string;
  'X-RateLimit-Blocked-Until'?: string;
}

/**
 * Extract rate limit information from HTTP response
 */
export function extractRateLimitInfo(response: Response): RateLimitInfo {
  const headers = response.headers;
  const retryAfter = parseInt(headers.get('Retry-After') || '0');
  const blockedUntil = headers.get('X-RateLimit-Blocked-Until')
    ? parseInt(headers.get('X-RateLimit-Blocked-Until')!) * 1000
    : undefined;
  const resetTime = headers.get('X-RateLimit-Reset')
    ? parseInt(headers.get('X-RateLimit-Reset')!) * 1000
    : undefined;

  const isRateLimited = response.status === 429 || retryAfter > 0;

  return {
    isRateLimited,
    retryAfter,
    retryAfterMinutes: Math.floor(retryAfter / 60),
    retryAfterSeconds: retryAfter % 60,
    formattedRetryTime: formatRetryTime(retryAfter),
    blockedUntil,
    resetTime
  };
}

/**
 * Extract rate limit information from API error response
 */
export function extractRateLimitFromError(error: any): RateLimitInfo {
  if (!error || typeof error !== 'object') {
    return { isRateLimited: false };
  }

  // Handle different error response formats
  const errorDetails = error.details || error;
  const retryAfter = errorDetails.retryAfter || 0;
  const blockedUntil = errorDetails.blockedUntil;
  const resetTime = errorDetails.resetTime;

  const isRateLimited =
    error.code === 'RATE_LIMIT_EXCEEDED' ||
    error.code === 'TOO_MANY_REQUESTS' ||
    retryAfter > 0;

  return {
    isRateLimited,
    retryAfter,
    retryAfterMinutes: Math.floor(retryAfter / 60),
    retryAfterSeconds: retryAfter % 60,
    formattedRetryTime: formatRetryTime(retryAfter),
    blockedUntil,
    resetTime
  };
}

/**
 * Format retry time into a human-readable string
 */
export function formatRetryTime(seconds: number): string {
  if (seconds <= 0) return '';

  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  if (minutes === 1 && remainingSeconds < 30) {
    return `about 1 minute`;
  }

  if (minutes < 5) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} and ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
  }

  return `about ${Math.ceil(seconds / 60)} minute${Math.ceil(seconds / 60) !== 1 ? 's' : ''}`;
}

/**
 * Calculate remaining time until retry is allowed
 */
export function calculateRemainingTime(blockedUntil?: number, resetTime?: number): number {
  if (!blockedUntil && !resetTime) return 0;

  const now = Date.now();
  const targetTime = blockedUntil || resetTime;

  if (!targetTime) return 0;

  const remaining = Math.max(0, Math.ceil((targetTime - now) / 1000));
  return remaining;
}

/**
 * Check if rate limit has expired
 */
export function isRateLimitExpired(blockedUntil?: number, resetTime?: number): boolean {
  const remaining = calculateRemainingTime(blockedUntil, resetTime);
  return remaining <= 0;
}

/**
 * Create a countdown timer that updates every second
 */
export function createRateLimitCountdown(
  initialSeconds: number,
  onUpdate: (remaining: number, formatted: string) => void,
  onComplete?: () => void
): () => void {
  let remaining = initialSeconds;

  const updateTimer = () => {
    if (remaining <= 0) {
      onUpdate(0, '');
      onComplete?.();
      return;
    }

    onUpdate(remaining, formatRetryTime(remaining));
    remaining--;
  };

  // Update immediately
  updateTimer();

  // Set up interval for subsequent updates
  const interval = setInterval(() => {
    updateTimer();
    if (remaining <= 0) {
      clearInterval(interval);
    }
  }, 1000);

  // Return cleanup function
  return () => clearInterval(interval);
}

/**
 * Get appropriate error message based on rate limit info
 */
export function getRateLimitMessage(info: RateLimitInfo, context?: string): string {
  if (!info.isRateLimited) return '';

  const action = context || 'try again';
  const timeText = info.formattedRetryTime || 'later';

  return `Too many attempts. Please ${action} in ${timeText}.`;
}

/**
 * Get button text based on rate limit state
 */
export function getRateLimitButtonText(
  info: RateLimitInfo,
  defaultText: string = 'Submit',
  waitingText: string = 'Wait'
): string {
  if (!info.isRateLimited || !info.retryAfter) {
    return defaultText;
  }

  if (info.retryAfter < 60) {
    return `${waitingText} ${info.retryAfter}s`;
  }

  const minutes = Math.floor(info.retryAfter / 60);
  const seconds = info.retryAfter % 60;

  if (seconds === 0) {
    return `${waitingText} ${minutes}m`;
  }

  return `${waitingText} ${minutes}m ${seconds}s`;
}
