import { randomBytes } from 'crypto';

/**
 * Generate a secure random token for password reset
 * @param length - Length of the token in bytes (default: 32)
 * @returns A URL-safe base64 encoded token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('base64url');
}

/**
 * Generate a simple random string for verification codes
 * @param length - Length of the string (default: 6)
 * @returns A numeric string
 */
export function generateVerificationCode(length: number = 6): string {
  const digits = '0123456789';
  let result = '';
  const bytes = randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    result += digits[bytes[i] % digits.length];
  }
  
  return result;
}