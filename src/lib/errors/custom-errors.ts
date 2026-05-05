/**
 * Custom error classes for different error categories
 */

import { ErrorCode, ErrorCategory, ERROR_MAPPINGS } from './error-types'

export abstract class BaseError extends Error {
  public readonly code: ErrorCode
  public readonly category: ErrorCategory
  public statusCode: number
  public readonly retryable: boolean
  public readonly retryAfter?: number
  public readonly field?: string
  public readonly details?: Record<string, any>
  public readonly requestId?: string

  constructor(
    code: ErrorCode,
    message?: string,
    field?: string,
    details?: Record<string, any>,
    requestId?: string
  ) {
    const errorMapping = ERROR_MAPPINGS[code]
    super(message || errorMapping.message)
    
    this.name = this.constructor.name
    this.code = code
    this.category = errorMapping.category
    this.statusCode = errorMapping.statusCode
    this.retryable = errorMapping.retryable
    this.retryAfter = errorMapping.retryAfter
    this.field = field
    this.details = details
    this.requestId = requestId

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

export class ValidationError extends BaseError {
  constructor(
    code: ErrorCode = ErrorCode.INVALID_INPUT,
    message?: string,
    field?: string,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(code, message, field, details, requestId)
  }

  static invalidInput(fieldOrMessage?: string, messageOrErrors?: string | Record<string, string>, requestId?: string): ValidationError {
    // Handle both old and new signatures
    if (typeof messageOrErrors === 'string') {
      // Old signature: invalidInput(field, message, requestId)
      return new ValidationError(
        ErrorCode.INVALID_INPUT,
        messageOrErrors,
        fieldOrMessage,
        undefined,
        requestId
      )
    } else {
      // New signature: invalidInput(message, errors, requestId)
      return new ValidationError(
        ErrorCode.INVALID_INPUT, 
        fieldOrMessage || 'Validation failed', 
        undefined, 
        messageOrErrors ? { validationErrors: messageOrErrors } : undefined, 
        requestId
      )
    }
  }

  static duplicateValue(field: string, message?: string, requestId?: string): ValidationError {
    return new ValidationError(
      ErrorCode.DUPLICATE_ENTRY,
      message || `Duplicate value for ${field}`,
      field,
      undefined,
      requestId
    )
  }

  static missingField(field: string, requestId?: string): ValidationError {
    return new ValidationError(
      ErrorCode.MISSING_REQUIRED_FIELD,
      `Required field '${field}' is missing`,
      field,
      undefined,
      requestId
    )
  }

  static invalidFormat(field: string, expectedFormat: string, requestId?: string): ValidationError {
    return new ValidationError(
      ErrorCode.INVALID_FORMAT,
      `Field '${field}' has invalid format. Expected: ${expectedFormat}`,
      field,
      { expectedFormat },
      requestId
    )
  }
}

export class AuthenticationError extends BaseError {
  constructor(
    code: ErrorCode = ErrorCode.INVALID_CREDENTIALS,
    message?: string,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(code, message, undefined, details, requestId)
  }

  static invalidCredentials(requestId?: string): AuthenticationError {
    return new AuthenticationError(ErrorCode.INVALID_CREDENTIALS, undefined, undefined, requestId)
  }

  static tokenExpired(requestId?: string): AuthenticationError {
    return new AuthenticationError(ErrorCode.TOKEN_EXPIRED, undefined, undefined, requestId)
  }

  static tokenInvalid(requestId?: string): AuthenticationError {
    return new AuthenticationError(ErrorCode.TOKEN_INVALID, undefined, undefined, requestId)
  }

  static invalidToken(message?: string, requestId?: string): AuthenticationError {
    return new AuthenticationError(ErrorCode.TOKEN_INVALID, message, undefined, requestId)
  }

  static emailNotVerified(requestId?: string): AuthenticationError {
    return new AuthenticationError(ErrorCode.EMAIL_NOT_VERIFIED, undefined, undefined, requestId)
  }

  static accountLocked(reason?: string, requestId?: string): AuthenticationError {
    return new AuthenticationError(
      ErrorCode.ACCOUNT_LOCKED,
      undefined,
      reason ? { reason } : undefined,
      requestId
    )
  }

  static accountBanned(requestId?: string): AuthenticationError {
    return new AuthenticationError(
      ErrorCode.ACCOUNT_LOCKED,
      'Your expert account has been banned. Please contact support for assistance.',
      { reason: 'banned' },
      requestId
    )
  }

  static accountPaused(requestId?: string): AuthenticationError {
    return new AuthenticationError(
      ErrorCode.ACCOUNT_LOCKED,
      'Your customer account has been paused. Please contact support for assistance.',
      { reason: 'paused' },
      requestId
    )
  }

  static rateLimited(message?: string, retryAfter?: number, requestId?: string): AuthenticationError {
    return new AuthenticationError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      message,
      { retryAfter },
      requestId
    )
  }
}

export class AuthorizationError extends BaseError {
  constructor(
    code: ErrorCode = ErrorCode.INSUFFICIENT_PERMISSIONS,
    message?: string,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(code, message, undefined, details, requestId)
  }

  static insufficientPermissions(resource?: string, requestId?: string): AuthorizationError {
    return new AuthorizationError(
      ErrorCode.INSUFFICIENT_PERMISSIONS,
      resource ? `Insufficient permissions to access ${resource}` : undefined,
      resource ? { resource } : undefined,
      requestId
    )
  }

  static resourceNotFound(resource?: string, requestId?: string): AuthorizationError {
    return new AuthorizationError(
      ErrorCode.RESOURCE_NOT_FOUND,
      resource ? `${resource} not found` : undefined,
      resource ? { resource } : undefined,
      requestId
    )
  }

  static accessDenied(reason?: string, requestId?: string): AuthorizationError {
    return new AuthorizationError(
      ErrorCode.ACCESS_DENIED,
      undefined,
      reason ? { reason } : undefined,
      requestId
    )
  }
}

export class RateLimitError extends BaseError {
  constructor(
    code: ErrorCode = ErrorCode.RATE_LIMIT_EXCEEDED,
    message?: string,
    retryAfter?: number,
    requestId?: string
  ) {
    super(code, message, undefined, { retryAfter }, requestId)
  }

  static rateLimitExceeded(retryAfter: number = 60, requestId?: string): RateLimitError {
    return new RateLimitError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      `Rate limit exceeded. Try again in ${retryAfter} seconds`,
      retryAfter,
      requestId
    )
  }

  static tooManyRequests(retryAfter: number = 300, requestId?: string): RateLimitError {
    return new RateLimitError(
      ErrorCode.TOO_MANY_REQUESTS,
      `Too many requests. Try again in ${retryAfter} seconds`,
      retryAfter,
      requestId
    )
  }
}

export class DatabaseError extends BaseError {
  constructor(
    code: ErrorCode = ErrorCode.DATABASE_CONNECTION_ERROR,
    message?: string,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(code, message, undefined, details, requestId)
  }

  static connectionError(originalError?: Error, requestId?: string): DatabaseError {
    return new DatabaseError(
      ErrorCode.DATABASE_CONNECTION_ERROR,
      undefined,
      originalError ? { originalError: originalError.message } : undefined,
      requestId
    )
  }

  static constraintViolation(constraint: string, requestId?: string): DatabaseError {
    return new DatabaseError(
      ErrorCode.CONSTRAINT_VIOLATION,
      `Database constraint violation: ${constraint}`,
      { constraint },
      requestId
    )
  }

  static duplicateEntry(field: string, value: string, requestId?: string): DatabaseError {
    return new DatabaseError(
      ErrorCode.DUPLICATE_ENTRY,
      `Duplicate entry for ${field}: ${value}`,
      { field, value },
      requestId
    )
  }
}

export class ExternalServiceError extends BaseError {
  constructor(
    code: ErrorCode = ErrorCode.EXTERNAL_API_ERROR,
    message?: string,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(code, message, undefined, details, requestId)
  }

  static emailServiceError(originalError?: Error, requestId?: string): ExternalServiceError {
    return new ExternalServiceError(
      ErrorCode.EMAIL_SERVICE_ERROR,
      undefined,
      originalError ? { originalError: originalError.message } : undefined,
      requestId
    )
  }

  static externalApiError(service: string, originalError?: Error, requestId?: string): ExternalServiceError {
    return new ExternalServiceError(
      ErrorCode.EXTERNAL_API_ERROR,
      `External API error from ${service}`,
      {
        service,
        originalError: originalError?.message
      },
      requestId
    )
  }
}

export class UnknownError extends BaseError {
  constructor(
    originalError?: Error,
    requestId?: string
  ) {
    super(
      ErrorCode.UNKNOWN_ERROR,
      undefined,
      undefined,
      originalError ? { originalError: originalError.message, stack: originalError.stack } : undefined,
      requestId
    )
  }
}