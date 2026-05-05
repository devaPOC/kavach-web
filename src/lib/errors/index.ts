/**
 * Standardized error handling system exports
 */

// Error types and classifications
export * from './error-types'

// Custom error classes
export * from './custom-errors'

// Request correlation system
export * from './correlation'

// Response utilities
export * from './response-utils'

// Error handler middleware
export * from './error-handler'

// Re-export commonly used items for convenience
export {
  ErrorCategory,
  ErrorCode,
  ERROR_MAPPINGS
} from './error-types'

export {
  BaseError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  UnknownError
} from './custom-errors'

export {
  generateCorrelationId,
  getOrCreateCorrelationId,
  createRequestContext,
  runWithCorrelation,
  getCurrentCorrelation,
  getCurrentCorrelationId
} from './correlation'

export {
  createSuccessResponse,
  createErrorResponse,
  createSuccessNextResponse,
  createErrorNextResponse,
  createServiceSuccess,
  createServiceError,
  serviceResultToNextResponse
} from './response-utils'

export {
  ErrorHandler,
  errorHandler,
  withErrorHandler,
  withServiceErrorHandler
} from './error-handler'