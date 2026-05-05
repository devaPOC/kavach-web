// Centralized authentication error codes and helpers
export const AUTH_ERROR_CODES = {
  RATE_LIMITED: 'RATE_LIMITED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCESS_DENIED: 'ACCESS_DENIED',
  ROLE_MISMATCH: 'ROLE_MISMATCH',
  NOT_VERIFIED: 'NOT_VERIFIED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  REFRESH_INVALID: 'REFRESH_INVALID',
  ACCOUNT_BANNED: 'ACCOUNT_BANNED',
  ACCOUNT_PAUSED: 'ACCOUNT_PAUSED',
  UNKNOWN: 'UNKNOWN'
} as const;

export type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES];

export interface AuthErrorShape {
  code: AuthErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export function authError(code: AuthErrorCode, message: string, details?: Record<string, unknown>): AuthErrorShape {
  return { code, message, details };
}

export function mergeMessages(messages: string[]): string {
  return Array.from(new Set(messages.filter(Boolean))).join(', ');
}
