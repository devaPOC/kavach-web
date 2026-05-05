/**
 * ErrorHandler middleware with consistent error response formats
 */

import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { 
  BaseError, 
  ValidationError, 
  AuthenticationError, 
  DatabaseError, 
  ExternalServiceError,
  UnknownError 
} from './custom-errors'
import { ErrorCode } from './error-types'
import { 
  createErrorNextResponse, 
  createGenericErrorNextResponse,
  createValidationErrorNextResponse 
} from './response-utils'
import { RequestContext, getCurrentCorrelationId } from './correlation'
import { logger } from '../utils/logger'

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  logErrors: boolean
  includeStackTrace: boolean
  sanitizeErrors: boolean
}

const DEFAULT_CONFIG: ErrorHandlerConfig = {
  logErrors: true,
  includeStackTrace: process.env.NODE_ENV === 'development',
  sanitizeErrors: process.env.NODE_ENV === 'production'
}

/**
 * Main error handler class
 */
export class ErrorHandler {
  private config: ErrorHandlerConfig

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Handle error and return appropriate Next.js response
   */
  handleError(error: unknown, context?: RequestContext): NextResponse {
    const requestId = context?.correlationId || getCurrentCorrelationId() || 'unknown'

    // Log error if configured
    if (this.config.logErrors) {
      this.logError(error, context)
    }

    // Handle different error types
    if (error instanceof BaseError) {
      return this.handleBaseError(error, requestId)
    }

    if (error instanceof ZodError) {
      return this.handleZodError(error, requestId)
    }

    if (this.isDatabaseError(error)) {
      return this.handleDatabaseError(error, requestId)
    }

    if (this.isNetworkError(error)) {
      return this.handleNetworkError(error, requestId)
    }

    // Handle unknown errors
    return this.handleUnknownError(error, requestId)
  }

  /**
   * Handle BaseError instances
   */
  private handleBaseError(error: BaseError, requestId: string): NextResponse {
    // Sanitize error message in production
    if (this.config.sanitizeErrors && error.statusCode >= 500) {
      const sanitizedError = new UnknownError(undefined, requestId)
      return createErrorNextResponse(sanitizedError, requestId)
    }

    return createErrorNextResponse(error, requestId)
  }

  /**
   * Handle Zod validation errors
   */
  private handleZodError(error: ZodError, requestId: string): NextResponse {
    const validationErrors = error.issues.map(err => ({
      field: err.path?.join?.('.') || 'unknown',
      message: err.message || 'Validation error'
    }))

    return createValidationErrorNextResponse(validationErrors, requestId)
  }

  /**
   * Handle database errors
   */
  private handleDatabaseError(error: any, requestId: string): NextResponse {
    let dbError: DatabaseError

    // Handle specific database error types
    if (error.code === '23505' || error.message?.includes('duplicate')) {
      // PostgreSQL unique constraint violation
      const field = this.extractFieldFromDuplicateError(error.message)
      dbError = DatabaseError.duplicateEntry(field, 'value', requestId)
    } else if (error.code === '23503' || error.message?.includes('foreign key')) {
      // PostgreSQL foreign key constraint violation
      dbError = DatabaseError.constraintViolation('foreign key', requestId)
    } else if (error.code === 'ECONNREFUSED' || error.message?.includes('connection')) {
      // Connection error
      dbError = DatabaseError.connectionError(error, requestId)
    } else {
      // Generic database error
      dbError = new DatabaseError(ErrorCode.DATABASE_CONNECTION_ERROR, undefined, { originalError: error.message }, requestId)
    }

    return createErrorNextResponse(dbError, requestId)
  }

  /**
   * Handle network/external service errors
   */
  private handleNetworkError(error: any, requestId: string): NextResponse {
    const serviceError = ExternalServiceError.externalApiError('unknown', error, requestId)
    return createErrorNextResponse(serviceError, requestId)
  }

  /**
   * Handle unknown errors
   */
  private handleUnknownError(error: unknown, requestId: string): NextResponse {
    const unknownError = new UnknownError(error instanceof Error ? error : undefined, requestId)
    
    // Always sanitize unknown errors in production
    if (this.config.sanitizeErrors) {
      return createGenericErrorNextResponse(
        'An unexpected error occurred',
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        requestId
      )
    }

    return createErrorNextResponse(unknownError, requestId)
  }

  /**
   * Log error with appropriate level and context
   */
  private logError(error: unknown, context?: RequestContext): void {
    const logContext = {
      requestId: context?.correlationId || 'unknown',
      userId: context?.userId,
      method: context?.method,
      url: context?.url,
      clientIP: context?.clientIP,
      userAgent: context?.userAgent,
      timestamp: context?.timestamp || new Date()
    }

    if (error instanceof BaseError) {
      // Log based on error severity
      if (error.statusCode >= 500) {
        logger.error('Server error occurred', {
          ...logContext,
          error: {
            name: error.name,
            message: error.message,
            code: error.code,
            category: error.category,
            statusCode: error.statusCode,
            stack: this.config.includeStackTrace ? error.stack : undefined,
            details: error.details
          }
        })
      } else if (error.statusCode >= 400) {
        logger.warn('Client error occurred', {
          ...logContext,
          error: {
            name: error.name,
            message: error.message,
            code: error.code,
            category: error.category,
            statusCode: error.statusCode,
            field: error.field
          }
        })
      }
    } else {
      // Log unknown errors as errors
      logger.error('Unknown error occurred', {
        ...logContext,
        error: {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: this.config.includeStackTrace && error instanceof Error ? error.stack : undefined
        }
      })
    }
  }

  /**
   * Check if error is a database error
   */
  private isDatabaseError(error: any): boolean {
    return (
      error?.code?.startsWith?.('23') || // PostgreSQL constraint errors
      error?.code === 'ECONNREFUSED' ||
      error?.message?.includes?.('database') ||
      error?.message?.includes?.('connection') ||
      error?.message?.includes?.('constraint') ||
      error?.message?.includes?.('duplicate')
    )
  }

  /**
   * Check if error is a network error
   */
  private isNetworkError(error: any): boolean {
    return (
      error?.code === 'ENOTFOUND' ||
      error?.code === 'ECONNRESET' ||
      error?.code === 'ETIMEDOUT' ||
      error?.message?.includes?.('fetch') ||
      error?.message?.includes?.('network')
    )
  }

  /**
   * Extract field name from duplicate error message
   */
  private extractFieldFromDuplicateError(message: string): string {
    // Try to extract field name from error message
    const match = message?.match(/Key \(([^)]+)\)/)
    return match?.[1] || 'unknown'
  }
}

/**
 * Default error handler instance
 */
export const errorHandler = new ErrorHandler()

/**
 * Async error handler wrapper for API routes
 */
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return errorHandler.handleError(error)
    }
  }
}

/**
 * Error boundary for service functions
 */
export async function withServiceErrorHandler<T>(
  operation: () => Promise<T>,
  context?: RequestContext
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    // Log error
    if (context) {
      errorHandler['logError'](error, context)
    }
    
    // Re-throw as appropriate error type
    if (error instanceof BaseError) {
      throw error
    }
    
    // Convert unknown errors to BaseError
    throw new UnknownError(error instanceof Error ? error : undefined, context?.correlationId)
  }
}