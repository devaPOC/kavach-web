import { z } from 'zod';

// Common validation result interface
export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  errors: Record<string, string>;
  fieldErrors?: Record<string, string[]>;
}

// Validation context for enhanced validation
export interface ValidationContext {
  isClient?: boolean;
  userId?: string;
  requestId?: string;
  skipAsyncValidation?: boolean;
}

// Common enums used across validation schemas
export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  PREFER_NOT_TO_SAY = 'prefer-not-to-say'
}

export enum UserRole {
  CUSTOMER = 'customer',
  EXPERT = 'expert',
  TRAINER = 'trainer',
  ADMIN = 'admin'
}

export enum EmploymentStatus {
  EMPLOYED = 'employed',
  SELF_EMPLOYED = 'self-employed',
  UNEMPLOYED = 'unemployed',
  STUDENT = 'student'
}

export enum Availability {
  FULL_TIME = 'full-time',
  PART_TIME = 'part-time',
  FLEXIBLE = 'flexible'
}

export enum WorkArrangement {
  REMOTE = 'remote',
  ON_SITE = 'on-site',
  HYBRID = 'hybrid'
}

export enum VerificationType {
  MAGIC_LINK = 'magic_link'
}

// Password strength levels
export enum PasswordStrength {
  WEAK = 'weak',
  FAIR = 'fair',
  GOOD = 'good',
  STRONG = 'strong'
}

// Validation error types
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AsyncValidationError extends ValidationError {
  constructor(
    message: string,
    field?: string,
    public retryable: boolean = true
  ) {
    super(message, field, 'ASYNC_VALIDATION_ERROR');
    this.name = 'AsyncValidationError';
  }
}
