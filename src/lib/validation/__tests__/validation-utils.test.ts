import { describe, it, expect } from 'vitest';
import {
  calculateAge,
  validateDateOfBirth,
  validatePhoneNumber,
  assessPasswordStrength,
  validateField,
  validateForm,
  isValidNameFormat,
  normalizeEmail,
  isValidEmailFormat
} from '../utils';
import { PasswordStrength } from '../types';
import { z } from 'zod';

describe('Validation Utils', () => {
  describe('calculateAge', () => {
    it('should calculate age correctly from string date', () => {
      const birthDate = '1990-01-01';
      const age = calculateAge(birthDate);
      const expectedAge = new Date().getFullYear() - 1990;
      expect(age).toBeGreaterThanOrEqual(expectedAge - 1);
      expect(age).toBeLessThanOrEqual(expectedAge);
    });

    it('should calculate age correctly from Date object', () => {
      const birthDate = new Date('1985-06-15');
      const age = calculateAge(birthDate);
      const expectedAge = new Date().getFullYear() - 1985;
      expect(age).toBeGreaterThanOrEqual(expectedAge - 1);
      expect(age).toBeLessThanOrEqual(expectedAge);
    });
  });

  describe('validateDateOfBirth', () => {
    it('should accept valid date of birth for adult', () => {
      const validDate = '1990-01-01';
      const result = validateDateOfBirth(validDate);
      expect(result).toBeNull();
    });

    it('should reject empty date', () => {
      const result = validateDateOfBirth('');
      expect(result).toBe('Date of birth is required');
    });

    it('should reject invalid date format', () => {
      const result = validateDateOfBirth('invalid-date');
      expect(result).toBe('Please enter a valid date');
    });

    it('should reject future date', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const result = validateDateOfBirth(futureDate.toISOString().split('T')[0]);
      expect(result).toBe('Date of birth cannot be in the future');
    });

    it('should reject date for underage person', () => {
      const underageDate = new Date();
      underageDate.setFullYear(underageDate.getFullYear() - 10);
      const result = validateDateOfBirth(underageDate.toISOString().split('T')[0]);
      expect(result).toBe('You must be at least 15 years old to register');
    });

    it('should accept custom minimum age', () => {
      const date = new Date();
      date.setFullYear(date.getFullYear() - 20);
      const result = validateDateOfBirth(date.toISOString().split('T')[0], 25);
      expect(result).toBe('You must be at least 25 years old to register');
    });
  });

  describe('validatePhoneNumber', () => {
    it('should accept valid phone numbers', () => {
      expect(validatePhoneNumber('+1234567890')).toBeNull();
      expect(validatePhoneNumber('123-456-7890')).toBeNull();
      expect(validatePhoneNumber('(123) 456-7890')).toBeNull();
      expect(validatePhoneNumber('+44 20 7946 0958')).toBeNull();
    });

    it('should accept empty phone number (optional field)', () => {
      expect(validatePhoneNumber('')).toBeNull();
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhoneNumber('abc')).toBe('Phone number must be between 7 and 15 digits');
      expect(validatePhoneNumber('123')).toBe('Phone number must be between 7 and 15 digits');
      expect(validatePhoneNumber('12345678901234567890')).toBe('Phone number must be between 7 and 15 digits');
    });
  });

  describe('assessPasswordStrength', () => {
    it('should assess weak passwords', () => {
      expect(assessPasswordStrength('123')).toBe(PasswordStrength.WEAK);
      expect(assessPasswordStrength('password')).toBe(PasswordStrength.WEAK);
    });

    it('should assess fair passwords', () => {
      expect(assessPasswordStrength('Password1')).toBe(PasswordStrength.FAIR);
      expect(assessPasswordStrength('password123')).toBe(PasswordStrength.WEAK);
    });

    it('should assess good passwords', () => {
      expect(assessPasswordStrength('Password123')).toBe(PasswordStrength.FAIR);
      expect(assessPasswordStrength('MyPassword1!')).toBe(PasswordStrength.STRONG);
    });

    it('should assess strong passwords', () => {
      expect(assessPasswordStrength('MySecurePassword123!')).toBe(PasswordStrength.STRONG);
      expect(assessPasswordStrength('ComplexP@ssw0rd')).toBe(PasswordStrength.STRONG);
    });
  });

  describe('validateField', () => {
    it('should validate field with valid data', () => {
      const schema = z.string().min(1, 'Required');
      const result = validateField(schema, 'valid data');
      expect(result).toBeNull();
    });

    it('should return error for invalid data', () => {
      const schema = z.string().min(5, 'Must be at least 5 characters');
      const result = validateField(schema, 'abc');
      expect(result).toBe('Must be at least 5 characters');
    });

    it('should handle non-Zod errors', () => {
      const schema = z.string();
      // Mock a schema that throws a non-Zod error
      const mockSchema = {
        parse: () => {
          throw new Error('Custom error');
        }
      } as any;
      const result = validateField(mockSchema, 'test');
      expect(result).toBe('Validation error');
    });
  });

  describe('validateForm', () => {
    it('should validate form with valid data', () => {
      const schema = z.object({
        name: z.string().min(1, 'Name required'),
        email: z.string().email('Invalid email')
      });
      
      const validData = {
        name: 'John Doe',
        email: 'john@example.com'
      };

      const result = validateForm(schema, validData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
      expect(result.errors).toEqual({});
    });

    it('should return errors for invalid data', () => {
      const schema = z.object({
        name: z.string().min(1, 'Name required'),
        email: z.string().email('Invalid email')
      });
      
      const invalidData = {
        name: '',
        email: 'invalid-email'
      };

      const result = validateForm(schema, invalidData);
      expect(result.success).toBe(false);
      expect(result.errors).toHaveProperty('name', 'Name required');
      expect(result.errors).toHaveProperty('email', 'Invalid email');
      expect(result.fieldErrors).toHaveProperty('name');
      expect(result.fieldErrors).toHaveProperty('email');
    });

    it('should handle non-Zod errors', () => {
      const mockSchema = {
        parse: () => {
          throw new Error('Custom error');
        }
      } as any;

      const result = validateForm(mockSchema, {});
      expect(result.success).toBe(false);
      expect(result.errors).toEqual({ general: 'Validation failed' });
    });
  });

  describe('isValidNameFormat', () => {
    it('should accept valid name formats', () => {
      expect(isValidNameFormat('John Doe')).toBe(true);
      expect(isValidNameFormat("O'Connor")).toBe(true);
      expect(isValidNameFormat('Mary-Jane')).toBe(true);
      expect(isValidNameFormat('José')).toBe(false); // Only ASCII letters allowed
    });

    it('should reject invalid name formats', () => {
      expect(isValidNameFormat('John123')).toBe(false);
      expect(isValidNameFormat('John@Doe')).toBe(false);
      expect(isValidNameFormat('')).toBe(false);
    });
  });

  describe('normalizeEmail', () => {
    it('should normalize email addresses', () => {
      expect(normalizeEmail('  JOHN@EXAMPLE.COM  ')).toBe('john@example.com');
      expect(normalizeEmail('Test@Domain.org')).toBe('test@domain.org');
    });
  });

  describe('isValidEmailFormat', () => {
    it('should validate email formats', () => {
      expect(isValidEmailFormat('test@example.com')).toBe(true);
      expect(isValidEmailFormat('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmailFormat('invalid-email')).toBe(false);
      expect(isValidEmailFormat('@domain.com')).toBe(false);
      expect(isValidEmailFormat('user@')).toBe(false);
    });
  });
});