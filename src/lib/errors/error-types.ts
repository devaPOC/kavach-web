/**
 * Error classification system for consistent error handling
 */

export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  RATE_LIMIT = 'RATE_LIMIT',
  DATABASE = 'DATABASE',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorCode {
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',

  // Authentication errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  UNAUTHORIZED = 'UNAUTHORIZED',

  // Authorization errors
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  ACCESS_DENIED = 'ACCESS_DENIED',

  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',

  // Database errors
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_OPERATION_FAILED = 'DATABASE_OPERATION_FAILED',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',

  // External service errors
  EMAIL_SERVICE_ERROR = 'EMAIL_SERVICE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',

  // Awareness Lab specific errors
  QUIZ_NOT_FOUND = 'QUIZ_NOT_FOUND',
  QUIZ_NOT_PUBLISHED = 'QUIZ_NOT_PUBLISHED',
  ATTEMPT_LIMIT_EXCEEDED = 'ATTEMPT_LIMIT_EXCEEDED',
  QUIZ_TIME_EXPIRED = 'QUIZ_TIME_EXPIRED',
  INVALID_QUESTION_TYPE = 'INVALID_QUESTION_TYPE',
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  MODULE_NOT_FOUND = 'MODULE_NOT_FOUND',
  INVALID_MATERIAL_TYPE = 'INVALID_MATERIAL_TYPE',
  INVALID_MULTILINGUAL_CONTENT = 'INVALID_MULTILINGUAL_CONTENT',
  UNSAFE_CONTENT = 'UNSAFE_CONTENT',

  // Unknown errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface ErrorDetails {
  category: ErrorCategory
  code: ErrorCode
  message: string
  field?: string
  retryable: boolean
  retryAfter?: number
  statusCode: number
}

export const ERROR_MAPPINGS: Record<ErrorCode, ErrorDetails> = {
  // Validation errors (400)
  [ErrorCode.VALIDATION_ERROR]: {
    category: ErrorCategory.VALIDATION,
    code: ErrorCode.VALIDATION_ERROR,
    message: 'Validation error',
    retryable: false,
    statusCode: 400
  },
  [ErrorCode.INVALID_INPUT]: {
    category: ErrorCategory.VALIDATION,
    code: ErrorCode.INVALID_INPUT,
    message: 'Invalid input provided',
    retryable: false,
    statusCode: 400
  },
  [ErrorCode.MISSING_REQUIRED_FIELD]: {
    category: ErrorCategory.VALIDATION,
    code: ErrorCode.MISSING_REQUIRED_FIELD,
    message: 'Required field is missing',
    retryable: false,
    statusCode: 400
  },
  [ErrorCode.INVALID_FORMAT]: {
    category: ErrorCategory.VALIDATION,
    code: ErrorCode.INVALID_FORMAT,
    message: 'Invalid format provided',
    retryable: false,
    statusCode: 400
  },

  // Authentication errors (401)
  [ErrorCode.INVALID_CREDENTIALS]: {
    category: ErrorCategory.AUTHENTICATION,
    code: ErrorCode.INVALID_CREDENTIALS,
    message: 'Invalid credentials provided',
    retryable: false,
    statusCode: 401
  },
  [ErrorCode.TOKEN_EXPIRED]: {
    category: ErrorCategory.AUTHENTICATION,
    code: ErrorCode.TOKEN_EXPIRED,
    message: 'Authentication token has expired',
    retryable: true,
    statusCode: 401
  },
  [ErrorCode.TOKEN_INVALID]: {
    category: ErrorCategory.AUTHENTICATION,
    code: ErrorCode.TOKEN_INVALID,
    message: 'Invalid authentication token',
    retryable: false,
    statusCode: 401
  },
  [ErrorCode.EMAIL_NOT_VERIFIED]: {
    category: ErrorCategory.AUTHENTICATION,
    code: ErrorCode.EMAIL_NOT_VERIFIED,
    message: 'Email address not verified',
    retryable: false,
    statusCode: 401
  },
  [ErrorCode.ACCOUNT_LOCKED]: {
    category: ErrorCategory.AUTHENTICATION,
    code: ErrorCode.ACCOUNT_LOCKED,
    message: 'Account is locked',
    retryable: false,
    statusCode: 401
  },
  [ErrorCode.UNAUTHORIZED]: {
    category: ErrorCategory.AUTHENTICATION,
    code: ErrorCode.UNAUTHORIZED,
    message: 'Invalid email or password',
    retryable: false,
    statusCode: 401
  },
  // Authorization errors (403)
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: {
    category: ErrorCategory.AUTHORIZATION,
    code: ErrorCode.INSUFFICIENT_PERMISSIONS,
    message: 'Insufficient permissions to access this resource',
    retryable: false,
    statusCode: 403
  },
  [ErrorCode.ACCESS_DENIED]: {
    category: ErrorCategory.AUTHORIZATION,
    code: ErrorCode.ACCESS_DENIED,
    message: 'Access denied',
    retryable: false,
    statusCode: 403
  },

  // Resource not found (404)
  [ErrorCode.RESOURCE_NOT_FOUND]: {
    category: ErrorCategory.AUTHORIZATION,
    code: ErrorCode.RESOURCE_NOT_FOUND,
    message: 'Resource not found',
    retryable: false,
    statusCode: 404
  },

  // Rate limiting (429)
  [ErrorCode.RATE_LIMIT_EXCEEDED]: {
    category: ErrorCategory.RATE_LIMIT,
    code: ErrorCode.RATE_LIMIT_EXCEEDED,
    message: 'Rate limit exceeded',
    retryable: true,
    retryAfter: 60,
    statusCode: 429
  },
  [ErrorCode.TOO_MANY_REQUESTS]: {
    category: ErrorCategory.RATE_LIMIT,
    code: ErrorCode.TOO_MANY_REQUESTS,
    message: 'Too many requests',
    retryable: true,
    retryAfter: 300,
    statusCode: 429
  },

  // Database errors (500)
  [ErrorCode.DATABASE_CONNECTION_ERROR]: {
    category: ErrorCategory.DATABASE,
    code: ErrorCode.DATABASE_CONNECTION_ERROR,
    message: 'Database connection error',
    retryable: true,
    statusCode: 500
  },
  [ErrorCode.DATABASE_OPERATION_FAILED]: {
    category: ErrorCategory.DATABASE,
    code: ErrorCode.DATABASE_OPERATION_FAILED,
    message: 'Database operation failed',
    retryable: false,
    statusCode: 500
  },
  [ErrorCode.CONSTRAINT_VIOLATION]: {
    category: ErrorCategory.DATABASE,
    code: ErrorCode.CONSTRAINT_VIOLATION,
    message: 'Database constraint violation',
    retryable: false,
    statusCode: 400
  },
  [ErrorCode.DUPLICATE_ENTRY]: {
    category: ErrorCategory.DATABASE,
    code: ErrorCode.DUPLICATE_ENTRY,
    message: 'Duplicate entry',
    retryable: false,
    statusCode: 409
  },
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: {
    category: ErrorCategory.DATABASE,
    code: ErrorCode.RESOURCE_ALREADY_EXISTS,
    message: 'Resource already exists',
    retryable: false,
    statusCode: 409
  },

  // External service errors (502/503)
  [ErrorCode.EMAIL_SERVICE_ERROR]: {
    category: ErrorCategory.EXTERNAL_SERVICE,
    code: ErrorCode.EMAIL_SERVICE_ERROR,
    message: 'Email service error',
    retryable: true,
    statusCode: 502
  },
  [ErrorCode.EXTERNAL_API_ERROR]: {
    category: ErrorCategory.EXTERNAL_SERVICE,
    code: ErrorCode.EXTERNAL_API_ERROR,
    message: 'External API error',
    retryable: true,
    statusCode: 502
  },

  // Awareness Lab specific errors
  [ErrorCode.QUIZ_NOT_FOUND]: {
    category: ErrorCategory.VALIDATION,
    code: ErrorCode.QUIZ_NOT_FOUND,
    message: 'Quiz not found',
    retryable: false,
    statusCode: 404
  },
  [ErrorCode.QUIZ_NOT_PUBLISHED]: {
    category: ErrorCategory.AUTHORIZATION,
    code: ErrorCode.QUIZ_NOT_PUBLISHED,
    message: 'Quiz is not published',
    retryable: false,
    statusCode: 403
  },
  [ErrorCode.ATTEMPT_LIMIT_EXCEEDED]: {
    category: ErrorCategory.RATE_LIMIT,
    code: ErrorCode.ATTEMPT_LIMIT_EXCEEDED,
    message: 'Quiz attempt limit exceeded',
    retryable: false,
    statusCode: 429
  },
  [ErrorCode.QUIZ_TIME_EXPIRED]: {
    category: ErrorCategory.VALIDATION,
    code: ErrorCode.QUIZ_TIME_EXPIRED,
    message: 'Quiz time limit expired',
    retryable: false,
    statusCode: 410
  },
  [ErrorCode.INVALID_QUESTION_TYPE]: {
    category: ErrorCategory.VALIDATION,
    code: ErrorCode.INVALID_QUESTION_TYPE,
    message: 'Invalid question type',
    retryable: false,
    statusCode: 400
  },
  [ErrorCode.TEMPLATE_NOT_FOUND]: {
    category: ErrorCategory.VALIDATION,
    code: ErrorCode.TEMPLATE_NOT_FOUND,
    message: 'Quiz template not found',
    retryable: false,
    statusCode: 404
  },
  [ErrorCode.MODULE_NOT_FOUND]: {
    category: ErrorCategory.VALIDATION,
    code: ErrorCode.MODULE_NOT_FOUND,
    message: 'Learning module not found',
    retryable: false,
    statusCode: 404
  },
  [ErrorCode.INVALID_MATERIAL_TYPE]: {
    category: ErrorCategory.VALIDATION,
    code: ErrorCode.INVALID_MATERIAL_TYPE,
    message: 'Invalid material type',
    retryable: false,
    statusCode: 400
  },
  [ErrorCode.INVALID_MULTILINGUAL_CONTENT]: {
    category: ErrorCategory.VALIDATION,
    code: ErrorCode.INVALID_MULTILINGUAL_CONTENT,
    message: 'Invalid multilingual content',
    retryable: false,
    statusCode: 400
  },
  [ErrorCode.UNSAFE_CONTENT]: {
    category: ErrorCategory.VALIDATION,
    code: ErrorCode.UNSAFE_CONTENT,
    message: 'Unsafe content detected',
    retryable: false,
    statusCode: 400
  },

  // Unknown errors (500)
  [ErrorCode.INTERNAL_SERVER_ERROR]: {
    category: ErrorCategory.UNKNOWN,
    code: ErrorCode.INTERNAL_SERVER_ERROR,
    message: 'Internal server error',
    retryable: false,
    statusCode: 500
  },
  [ErrorCode.UNKNOWN_ERROR]: {
    category: ErrorCategory.UNKNOWN,
    code: ErrorCode.UNKNOWN_ERROR,
    message: 'An unknown error occurred',
    retryable: false,
    statusCode: 500
  }
}
