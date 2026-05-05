import { z } from 'zod';
import { ValidationResult, PasswordStrength } from './types';

// Re-export PasswordStrength for convenience
export { PasswordStrength };

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: string | Date): number {
  const today = new Date();
  const birthDate = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Validate date of birth with age requirements
 */
export function validateDateOfBirth(dateString: string, minAge: number = 15): string | null {
  if (!dateString) return 'Date of birth is required';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return 'Please enter a valid date';
  }

  const today = new Date();
  if (date > today) {
    return 'Date of birth cannot be in the future';
  }

  const age = calculateAge(dateString);
  if (age < minAge) {
    return `You must be at least ${minAge} years old to register`;
  }

  return null;
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phone: string): string | null {
  if (!phone) return null; // Optional field

  // Check for minimum digits first (excluding formatting characters)
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return 'Phone number must be between 7 and 15 digits';
  }

  // Basic international phone number validation
  const phoneRegex = /^\+?[\d\s\-\(\)]{7,15}$/;
  if (!phoneRegex.test(phone)) {
    return 'Please enter a valid phone number';
  }

  return null;
}

/**
 * Assess password strength
 */
export function assessPasswordStrength(password: string): PasswordStrength {
  let score = 0;

  // Length criteria
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  // Character type criteria
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

  // Bonus for variety (all character types present)
  if (/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/.test(password)) {
    score += 1;
  }

  if (score <= 3) return PasswordStrength.WEAK;
  if (score <= 4) return PasswordStrength.FAIR;
  if (score <= 6) return PasswordStrength.GOOD;
  return PasswordStrength.STRONG;
}

/**
 * Validate a single field using a Zod schema
 */
export function validateField<T>(schema: z.ZodSchema<T>, value: unknown): string | null {
  try {
    schema.parse(value);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues || [];
      return issues[0]?.message || 'Invalid input';
    }
    return 'Validation error';
  }
}

/**
 * Validate an entire form using a Zod schema
 */
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const validatedData = schema.parse(data);
    return {
      success: true,
      data: validatedData,
      errors: {}
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      const fieldErrors: Record<string, string[]> = {};

      error.issues.forEach((issue) => {
        const path = Array.isArray(issue.path) ? issue.path.join('.') : 'form';

        // Store first error for each field in errors object
        if (!errors[path]) {
          errors[path] = issue.message;
        }

        // Store all errors for each field in fieldErrors object
        if (!fieldErrors[path]) {
          fieldErrors[path] = [];
        }
        fieldErrors[path].push(issue.message);
      });

      return {
        success: false,
        errors,
        fieldErrors
      };
    }
    return {
      success: false,
      errors: { general: 'Validation failed' }
    };
  }
}

/**
 * Safe parse with detailed error information
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
) {
  return schema.safeParse(data);
}

/**
 * Transform Zod errors to a more user-friendly format
 */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};

  error.issues.forEach((issue) => {
    const path = Array.isArray(issue.path) ? issue.path.join('.') : 'form';
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  });

  return errors;
}

/**
 * Check if a string contains only letters, spaces, hyphens, and apostrophes
 */
export function isValidNameFormat(name: string): boolean {
  return /^[a-zA-Z\s'-]+$/.test(name);
}

/**
 * Normalize email address (lowercase, trim)
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Check if email has valid format (basic check)
 */
export function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if text contains HTML tags (for XSS prevention)
 */
export function containsHtmlTags(text: string): boolean {
  return /<[^>]*>/g.test(text);
}

/**
 * Strip HTML tags from text
 */
export function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

/**
 * Validate that text does not contain HTML tags
 * Returns error message if HTML found, null if valid
 */
export function validateNoHtmlTags(text: string): string | null {
  if (containsHtmlTags(text)) {
    return 'HTML tags are not allowed. Please use plain text only.';
  }
  return null;
}

/**
 * Regex pattern for Zod validation - rejects strings with HTML tags
 */
export const noHtmlTagsRegex = /^(?![\s\S]*<[^>]*>)[\s\S]*$/;
export const noHtmlTagsErrorMessage = 'HTML tags are not allowed. Please use plain text only.';

/**
 * SQL Search Input Sanitization Utilities
 *
 * These utilities help prevent:
 * - LIKE pattern injection (using % or _ wildcards)
 * - DoS via extremely long search strings
 * - Special character abuse
 */

/**
 * Maximum allowed length for search queries
 */
export const MAX_SEARCH_LENGTH = 100;

/**
 * Escape SQL LIKE wildcards in a search string
 * This prevents users from using % or _ to manipulate LIKE queries
 */
export function escapeLikeWildcards(search: string): string {
  return search
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/%/g, '\\%')    // Escape percent signs
    .replace(/_/g, '\\_');   // Escape underscores
}

/**
 * Sanitize search input for safe use in database queries
 * - Trims whitespace
 * - Limits length
 * - Escapes LIKE wildcards
 * - Removes control characters
 */
export function sanitizeSearchInput(search: string | null | undefined): string {
  if (!search) return '';

  // Trim and limit length
  let sanitized = search.trim().slice(0, MAX_SEARCH_LENGTH);

  // Remove control characters (except spaces)
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  // Escape LIKE wildcards
  sanitized = escapeLikeWildcards(sanitized);

  return sanitized;
}

/**
 * Validate search input and return error message if invalid
 * Returns null if valid
 */
export function validateSearchInput(search: string): string | null {
  if (search.length > MAX_SEARCH_LENGTH) {
    return `Search query must be less than ${MAX_SEARCH_LENGTH} characters`;
  }

  // Check for HTML tags
  if (containsHtmlTags(search)) {
    return noHtmlTagsErrorMessage;
  }

  return null;
}
