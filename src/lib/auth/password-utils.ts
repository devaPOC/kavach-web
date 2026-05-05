import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { z } from 'zod';

// Password validation schema based on requirements 2.1 and 2.4
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

// Password strength levels
export enum PasswordStrength {
  WEAK = 'weak',
  FAIR = 'fair',
  GOOD = 'good',
  STRONG = 'strong'
}

export interface PasswordValidationResult {
  isValid: boolean;
  strength: PasswordStrength;
  errors: string[];
  score: number;
}


export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12; // Secure salt rounds for production
  return await bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}


export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // Check minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else {
    score += 1;
  }

  // Check for lowercase letters
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }

  // Check for uppercase letters
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }

  // Check for numbers
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 1;
  }

  // Check for special characters
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else {
    score += 1;
  }

  // Additional strength checks
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>]{2,}/.test(password)) score += 1; // Multiple special chars

  // Determine strength based on score
  let strength: PasswordStrength;
  if (score <= 2) {
    strength = PasswordStrength.WEAK;
  } else if (score <= 4) {
    strength = PasswordStrength.FAIR;
  } else if (score <= 6) {
    strength = PasswordStrength.GOOD;
  } else {
    strength = PasswordStrength.STRONG;
  }

  return {
    isValid: errors.length === 0,
    strength,
    errors,
    score
  };
}

/**
 * Generate a secure random password
 * Utility function for admin user creation
 */
export function generateSecurePassword(length: number = 16): string {
  if (length < 8) length = 8; // enforce minimum

  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*(),.?":{}|<>';
  const categories = [lowercase, uppercase, numbers, special];

  const all = categories.join('');
  const bytes = randomBytes(length);
  const chars: string[] = [];

  // Ensure at least one from each category
  categories.forEach((set, i) => {
    chars[i] = set[bytes[i] % set.length];
  });

  for (let i = categories.length; i < length; i++) {
    chars[i] = all[bytes[i] % all.length];
  }

  // Fisher-Yates shuffle using cryptographically random order (reuse bytes)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = bytes[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}
