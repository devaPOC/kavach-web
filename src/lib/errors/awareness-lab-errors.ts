/**
 * Custom error classes for Awareness Lab specific errors
 */

import { BaseError } from './custom-errors';
import { ErrorCode, ErrorCategory } from './error-types';

// Awareness Lab specific error codes
export enum AwarenessLabErrorCode {
  // Quiz errors
  QUIZ_NOT_FOUND = 'QUIZ_NOT_FOUND',
  QUIZ_NOT_PUBLISHED = 'QUIZ_NOT_PUBLISHED',
  QUIZ_ALREADY_PUBLISHED = 'QUIZ_ALREADY_PUBLISHED',
  ATTEMPT_LIMIT_EXCEEDED = 'ATTEMPT_LIMIT_EXCEEDED',
  QUIZ_TIME_EXPIRED = 'QUIZ_TIME_EXPIRED',
  QUIZ_ALREADY_STARTED = 'QUIZ_ALREADY_STARTED',
  QUIZ_NOT_STARTED = 'QUIZ_NOT_STARTED',
  QUIZ_ALREADY_COMPLETED = 'QUIZ_ALREADY_COMPLETED',
  INVALID_QUIZ_ANSWERS = 'INVALID_QUIZ_ANSWERS',
  
  // Question errors
  INVALID_QUESTION_TYPE = 'INVALID_QUESTION_TYPE',
  INVALID_QUESTION_OPTIONS = 'INVALID_QUESTION_OPTIONS',
  MISSING_CORRECT_ANSWERS = 'MISSING_CORRECT_ANSWERS',
  INVALID_ANSWER_FORMAT = 'INVALID_ANSWER_FORMAT',
  
  // Template errors
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  TEMPLATE_IN_USE = 'TEMPLATE_IN_USE',
  INVALID_TEMPLATE_CONFIG = 'INVALID_TEMPLATE_CONFIG',
  
  // Learning module errors
  MODULE_NOT_FOUND = 'MODULE_NOT_FOUND',
  MODULE_NOT_PUBLISHED = 'MODULE_NOT_PUBLISHED',
  INVALID_MATERIAL_TYPE = 'INVALID_MATERIAL_TYPE',
  INVALID_MATERIAL_URL = 'INVALID_MATERIAL_URL',
  MATERIAL_NOT_FOUND = 'MATERIAL_NOT_FOUND',
  
  // Content validation errors
  INVALID_MULTILINGUAL_CONTENT = 'INVALID_MULTILINGUAL_CONTENT',
  CONTENT_TOO_LONG = 'CONTENT_TOO_LONG',
  UNSAFE_CONTENT = 'UNSAFE_CONTENT',
  INVALID_EMBED_CODE = 'INVALID_EMBED_CODE',
  
  // Progress tracking errors
  PROGRESS_NOT_FOUND = 'PROGRESS_NOT_FOUND',
  INVALID_PROGRESS_DATA = 'INVALID_PROGRESS_DATA',
  
  // Analytics errors
  ANALYTICS_DATA_UNAVAILABLE = 'ANALYTICS_DATA_UNAVAILABLE',
  INVALID_ANALYTICS_FILTER = 'INVALID_ANALYTICS_FILTER'
}

// Error mappings for Awareness Lab errors
export const AWARENESS_LAB_ERROR_MAPPINGS: Record<AwarenessLabErrorCode, {
  category: ErrorCategory;
  message: string;
  statusCode: number;
  retryable: boolean;
}> = {
  // Quiz errors
  [AwarenessLabErrorCode.QUIZ_NOT_FOUND]: {
    category: ErrorCategory.VALIDATION,
    message: 'Quiz not found',
    statusCode: 404,
    retryable: false
  },
  [AwarenessLabErrorCode.QUIZ_NOT_PUBLISHED]: {
    category: ErrorCategory.VALIDATION,
    message: 'Quiz is not published and cannot be accessed',
    statusCode: 403,
    retryable: false
  },
  [AwarenessLabErrorCode.QUIZ_ALREADY_PUBLISHED]: {
    category: ErrorCategory.VALIDATION,
    message: 'Quiz is already published and cannot be modified',
    statusCode: 409,
    retryable: false
  },
  [AwarenessLabErrorCode.ATTEMPT_LIMIT_EXCEEDED]: {
    category: ErrorCategory.VALIDATION,
    message: 'Maximum number of quiz attempts exceeded',
    statusCode: 429,
    retryable: false
  },
  [AwarenessLabErrorCode.QUIZ_TIME_EXPIRED]: {
    category: ErrorCategory.VALIDATION,
    message: 'Quiz time limit has expired',
    statusCode: 410,
    retryable: false
  },
  [AwarenessLabErrorCode.QUIZ_ALREADY_STARTED]: {
    category: ErrorCategory.VALIDATION,
    message: 'Quiz attempt has already been started',
    statusCode: 409,
    retryable: false
  },
  [AwarenessLabErrorCode.QUIZ_NOT_STARTED]: {
    category: ErrorCategory.VALIDATION,
    message: 'Quiz attempt has not been started',
    statusCode: 400,
    retryable: false
  },
  [AwarenessLabErrorCode.QUIZ_ALREADY_COMPLETED]: {
    category: ErrorCategory.VALIDATION,
    message: 'Quiz attempt has already been completed',
    statusCode: 409,
    retryable: false
  },
  [AwarenessLabErrorCode.INVALID_QUIZ_ANSWERS]: {
    category: ErrorCategory.VALIDATION,
    message: 'Invalid quiz answers provided',
    statusCode: 400,
    retryable: false
  },
  
  // Question errors
  [AwarenessLabErrorCode.INVALID_QUESTION_TYPE]: {
    category: ErrorCategory.VALIDATION,
    message: 'Invalid question type specified',
    statusCode: 400,
    retryable: false
  },
  [AwarenessLabErrorCode.INVALID_QUESTION_OPTIONS]: {
    category: ErrorCategory.VALIDATION,
    message: 'Invalid question options provided',
    statusCode: 400,
    retryable: false
  },
  [AwarenessLabErrorCode.MISSING_CORRECT_ANSWERS]: {
    category: ErrorCategory.VALIDATION,
    message: 'Correct answers are required for this question type',
    statusCode: 400,
    retryable: false
  },
  [AwarenessLabErrorCode.INVALID_ANSWER_FORMAT]: {
    category: ErrorCategory.VALIDATION,
    message: 'Answer format is invalid for this question type',
    statusCode: 400,
    retryable: false
  },
  
  // Template errors
  [AwarenessLabErrorCode.TEMPLATE_NOT_FOUND]: {
    category: ErrorCategory.VALIDATION,
    message: 'Quiz template not found',
    statusCode: 404,
    retryable: false
  },
  [AwarenessLabErrorCode.TEMPLATE_IN_USE]: {
    category: ErrorCategory.VALIDATION,
    message: 'Template is currently in use and cannot be deleted',
    statusCode: 409,
    retryable: false
  },
  [AwarenessLabErrorCode.INVALID_TEMPLATE_CONFIG]: {
    category: ErrorCategory.VALIDATION,
    message: 'Invalid template configuration',
    statusCode: 400,
    retryable: false
  },
  
  // Learning module errors
  [AwarenessLabErrorCode.MODULE_NOT_FOUND]: {
    category: ErrorCategory.VALIDATION,
    message: 'Learning module not found',
    statusCode: 404,
    retryable: false
  },
  [AwarenessLabErrorCode.MODULE_NOT_PUBLISHED]: {
    category: ErrorCategory.VALIDATION,
    message: 'Learning module is not published and cannot be accessed',
    statusCode: 403,
    retryable: false
  },
  [AwarenessLabErrorCode.INVALID_MATERIAL_TYPE]: {
    category: ErrorCategory.VALIDATION,
    message: 'Invalid material type specified',
    statusCode: 400,
    retryable: false
  },
  [AwarenessLabErrorCode.INVALID_MATERIAL_URL]: {
    category: ErrorCategory.VALIDATION,
    message: 'Invalid or unsafe material URL provided',
    statusCode: 400,
    retryable: false
  },
  [AwarenessLabErrorCode.MATERIAL_NOT_FOUND]: {
    category: ErrorCategory.VALIDATION,
    message: 'Learning material not found',
    statusCode: 404,
    retryable: false
  },
  
  // Content validation errors
  [AwarenessLabErrorCode.INVALID_MULTILINGUAL_CONTENT]: {
    category: ErrorCategory.VALIDATION,
    message: 'Content contains invalid characters or formatting',
    statusCode: 400,
    retryable: false
  },
  [AwarenessLabErrorCode.CONTENT_TOO_LONG]: {
    category: ErrorCategory.VALIDATION,
    message: 'Content exceeds maximum length limit',
    statusCode: 400,
    retryable: false
  },
  [AwarenessLabErrorCode.UNSAFE_CONTENT]: {
    category: ErrorCategory.VALIDATION,
    message: 'Content contains unsafe or malicious elements',
    statusCode: 400,
    retryable: false
  },
  [AwarenessLabErrorCode.INVALID_EMBED_CODE]: {
    category: ErrorCategory.VALIDATION,
    message: 'Embed code is invalid or contains unsafe elements',
    statusCode: 400,
    retryable: false
  },
  
  // Progress tracking errors
  [AwarenessLabErrorCode.PROGRESS_NOT_FOUND]: {
    category: ErrorCategory.VALIDATION,
    message: 'Progress record not found',
    statusCode: 404,
    retryable: false
  },
  [AwarenessLabErrorCode.INVALID_PROGRESS_DATA]: {
    category: ErrorCategory.VALIDATION,
    message: 'Invalid progress data provided',
    statusCode: 400,
    retryable: false
  },
  
  // Analytics errors
  [AwarenessLabErrorCode.ANALYTICS_DATA_UNAVAILABLE]: {
    category: ErrorCategory.EXTERNAL_SERVICE,
    message: 'Analytics data is temporarily unavailable',
    statusCode: 503,
    retryable: true
  },
  [AwarenessLabErrorCode.INVALID_ANALYTICS_FILTER]: {
    category: ErrorCategory.VALIDATION,
    message: 'Invalid analytics filter parameters',
    statusCode: 400,
    retryable: false
  }
};

/**
 * Base class for all Awareness Lab errors
 */
export class AwarenessLabError extends Error {
  public readonly code: AwarenessLabErrorCode
  public readonly category: ErrorCategory
  public statusCode: number
  public readonly retryable: boolean
  public readonly field?: string
  public readonly details?: Record<string, any>
  public readonly requestId?: string

  constructor(
    code: AwarenessLabErrorCode,
    message?: string,
    field?: string,
    details?: Record<string, any>,
    requestId?: string
  ) {
    const errorMapping = AWARENESS_LAB_ERROR_MAPPINGS[code];
    
    super(message || errorMapping.message);
    
    this.name = this.constructor.name;
    this.code = code;
    this.category = errorMapping.category;
    this.statusCode = errorMapping.statusCode;
    this.retryable = errorMapping.retryable;
    this.field = field;
    this.details = details;
    this.requestId = requestId;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Quiz-specific error class
 */
export class QuizError extends AwarenessLabError {
  constructor(
    code: AwarenessLabErrorCode,
    message?: string,
    quizId?: string,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(code, message, undefined, { ...details, quizId }, requestId);
  }

  static notFound(quizId: string, requestId?: string): QuizError {
    return new QuizError(
      AwarenessLabErrorCode.QUIZ_NOT_FOUND,
      `Quiz with ID ${quizId} not found`,
      quizId,
      undefined,
      requestId
    );
  }

  static notPublished(quizId: string, requestId?: string): QuizError {
    return new QuizError(
      AwarenessLabErrorCode.QUIZ_NOT_PUBLISHED,
      undefined,
      quizId,
      undefined,
      requestId
    );
  }

  static attemptLimitExceeded(
    quizId: string,
    maxAttempts: number,
    currentAttempts: number,
    requestId?: string
  ): QuizError {
    return new QuizError(
      AwarenessLabErrorCode.ATTEMPT_LIMIT_EXCEEDED,
      `Quiz attempt limit exceeded. Maximum ${maxAttempts} attempts allowed, ${currentAttempts} already made.`,
      quizId,
      { maxAttempts, currentAttempts },
      requestId
    );
  }

  static timeExpired(quizId: string, timeLimitMinutes: number, requestId?: string): QuizError {
    return new QuizError(
      AwarenessLabErrorCode.QUIZ_TIME_EXPIRED,
      `Quiz time limit of ${timeLimitMinutes} minutes has expired`,
      quizId,
      { timeLimitMinutes },
      requestId
    );
  }

  static alreadyCompleted(quizId: string, attemptId: string, requestId?: string): QuizError {
    return new QuizError(
      AwarenessLabErrorCode.QUIZ_ALREADY_COMPLETED,
      undefined,
      quizId,
      { attemptId },
      requestId
    );
  }

  static invalidAnswers(quizId: string, errors: string[], requestId?: string): QuizError {
    return new QuizError(
      AwarenessLabErrorCode.INVALID_QUIZ_ANSWERS,
      `Invalid answers: ${errors.join(', ')}`,
      quizId,
      { validationErrors: errors },
      requestId
    );
  }
}

/**
 * Question-specific error class
 */
export class QuestionError extends AwarenessLabError {
  constructor(
    code: AwarenessLabErrorCode,
    message?: string,
    questionId?: string,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(code, message, undefined, { ...details, questionId }, requestId);
  }

  static invalidType(questionType: string, requestId?: string): QuestionError {
    return new QuestionError(
      AwarenessLabErrorCode.INVALID_QUESTION_TYPE,
      `Invalid question type: ${questionType}`,
      undefined,
      { questionType },
      requestId
    );
  }

  static invalidOptions(questionId: string, reason: string, requestId?: string): QuestionError {
    return new QuestionError(
      AwarenessLabErrorCode.INVALID_QUESTION_OPTIONS,
      `Invalid question options: ${reason}`,
      questionId,
      { reason },
      requestId
    );
  }

  static missingCorrectAnswers(questionId: string, requestId?: string): QuestionError {
    return new QuestionError(
      AwarenessLabErrorCode.MISSING_CORRECT_ANSWERS,
      undefined,
      questionId,
      undefined,
      requestId
    );
  }
}

/**
 * Template-specific error class
 */
export class TemplateError extends AwarenessLabError {
  constructor(
    code: AwarenessLabErrorCode,
    message?: string,
    templateId?: string,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(code, message, undefined, { ...details, templateId }, requestId);
  }

  static notFound(templateId: string, requestId?: string): TemplateError {
    return new TemplateError(
      AwarenessLabErrorCode.TEMPLATE_NOT_FOUND,
      `Template with ID ${templateId} not found`,
      templateId,
      undefined,
      requestId
    );
  }

  static inUse(templateId: string, usageCount: number, requestId?: string): TemplateError {
    return new TemplateError(
      AwarenessLabErrorCode.TEMPLATE_IN_USE,
      `Template is used by ${usageCount} quiz(es) and cannot be deleted`,
      templateId,
      { usageCount },
      requestId
    );
  }
}

/**
 * Learning module specific error class
 */
export class LearningModuleError extends AwarenessLabError {
  constructor(
    code: AwarenessLabErrorCode,
    message?: string,
    moduleId?: string,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(code, message, undefined, { ...details, moduleId }, requestId);
  }

  static notFound(moduleId: string, requestId?: string): LearningModuleError {
    return new LearningModuleError(
      AwarenessLabErrorCode.MODULE_NOT_FOUND,
      `Learning module with ID ${moduleId} not found`,
      moduleId,
      undefined,
      requestId
    );
  }

  static notPublished(moduleId: string, requestId?: string): LearningModuleError {
    return new LearningModuleError(
      AwarenessLabErrorCode.MODULE_NOT_PUBLISHED,
      undefined,
      moduleId,
      undefined,
      requestId
    );
  }

  static invalidMaterialUrl(url: string, reason: string, requestId?: string): LearningModuleError {
    return new LearningModuleError(
      AwarenessLabErrorCode.INVALID_MATERIAL_URL,
      `Invalid material URL: ${reason}`,
      undefined,
      { url, reason },
      requestId
    );
  }
}

/**
 * Content validation error class
 */
export class ContentValidationError extends AwarenessLabError {
  constructor(
    code: AwarenessLabErrorCode,
    message?: string,
    field?: string,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(code, message, field, details, requestId);
  }

  static invalidMultilingualContent(field: string, content: string, requestId?: string): ContentValidationError {
    return new ContentValidationError(
      AwarenessLabErrorCode.INVALID_MULTILINGUAL_CONTENT,
      `Content in field '${field}' contains invalid characters or formatting`,
      field,
      { content: content.substring(0, 100) }, // Only include first 100 chars for security
      requestId
    );
  }

  static contentTooLong(field: string, maxLength: number, actualLength: number, requestId?: string): ContentValidationError {
    return new ContentValidationError(
      AwarenessLabErrorCode.CONTENT_TOO_LONG,
      `Content in field '${field}' exceeds maximum length of ${maxLength} characters (${actualLength} provided)`,
      field,
      { maxLength, actualLength },
      requestId
    );
  }

  static unsafeContent(field: string, reason: string, requestId?: string): ContentValidationError {
    return new ContentValidationError(
      AwarenessLabErrorCode.UNSAFE_CONTENT,
      `Unsafe content detected in field '${field}': ${reason}`,
      field,
      { reason },
      requestId
    );
  }

  static invalidEmbedCode(embedCode: string, requestId?: string): ContentValidationError {
    return new ContentValidationError(
      AwarenessLabErrorCode.INVALID_EMBED_CODE,
      'Embed code contains invalid or unsafe elements',
      'embedCode',
      { embedCode: embedCode.substring(0, 100) }, // Only include first 100 chars for security
      requestId
    );
  }
}

/**
 * Progress tracking error class
 */
export class ProgressError extends AwarenessLabError {
  constructor(
    code: AwarenessLabErrorCode,
    message?: string,
    userId?: string,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(code, message, undefined, { ...details, userId }, requestId);
  }

  static notFound(userId: string, moduleId: string, requestId?: string): ProgressError {
    return new ProgressError(
      AwarenessLabErrorCode.PROGRESS_NOT_FOUND,
      `Progress record not found for user ${userId} and module ${moduleId}`,
      userId,
      { moduleId },
      requestId
    );
  }

  static invalidData(field: string, value: any, requestId?: string): ProgressError {
    return new ProgressError(
      AwarenessLabErrorCode.INVALID_PROGRESS_DATA,
      `Invalid progress data in field '${field}'`,
      undefined,
      { field, value },
      requestId
    );
  }
}