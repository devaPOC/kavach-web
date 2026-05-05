/**
 * Awareness Lab validation exports
 * Centralized exports for all awareness lab validation schemas, utilities, and error classes
 *
 * Note: sanitizeHtml() is NOT exported here to avoid bundling DOMPurify on client-side.
 * Import directly from './awareness-lab-utils' in server-side code if needed.
 */

// Schemas
export * from './awareness-lab-schemas';

// Export only client-safe utilities (no DOMPurify dependencies)
export {
  validateMultilingualContent,
  isValidUrl,
  validateVideoUrl,
  calculateQuizScore,
  validateQuizTime
} from './awareness-lab-utils';

// Error classes
export * from '../errors/awareness-lab-errors';

// Re-export commonly used validation utilities
export { validateForm, validateField, formatZodErrors } from './utils';
export type { ValidationResult, ValidationContext } from './types';

// Convenience exports for common validation patterns
export {
  awarenessLabSchemas,
  AwarenessLabLanguage,
  QuestionType,
  MaterialType
} from './awareness-lab-schemas';

export {
  AwarenessLabError,
  QuizError,
  QuestionError,
  TemplateError,
  LearningModuleError,
  ContentValidationError,
  ProgressError,
  AwarenessLabErrorCode
} from '../errors/awareness-lab-errors';
