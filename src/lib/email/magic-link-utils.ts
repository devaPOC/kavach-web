import { randomBytes } from 'crypto';

/**
 * Magic link token generation and validation utilities
 */

/**
 * Generate a secure magic link token
 */
export const generateMagicLinkToken = (): string => {
  return randomBytes(32).toString('hex');
};

/**
 * Create magic link URL
 */
export const createMagicLinkURL = (token: string, baseUrl?: string): string => {
  const appUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${appUrl}/verify-email?token=${token}&type=magic_link`;
};



/**
 * Calculate expiration date
 */
export const calculateExpirationDate = (hours: number = 24): Date => {
  const now = new Date();
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
};

/**
 * Check if verification has expired
 */
export const isExpired = (expirationDate: Date): boolean => {
  if (!(expirationDate instanceof Date) || isNaN(expirationDate.getTime())) return true;
  return Date.now() >= expirationDate.getTime();
};

/**
 * Generate verification data for database storage
 */
export interface VerificationData {
  token: string;
  type: 'magic_link';
  expiresAt: Date;
}

export const generateVerificationData = (
  expirationHours: number = 24
): VerificationData => {
  return {
    token: generateMagicLinkToken(),
    type: 'magic_link',
    expiresAt: calculateExpirationDate(expirationHours),
  };
};
