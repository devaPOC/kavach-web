/**
 * Error response utilities for controllers and services
 */

import { NextResponse } from 'next/server'
import { BaseError } from './custom-errors'
import { ErrorCode } from './error-types'
import { getCurrentCorrelationId } from './correlation'

/**
 * Standard API response interfaces
 */
export interface ApiErrorResponse {
  success: false
  error: string
  code: string
  details?: Record<string, any>
  timestamp: string
  requestId: string
  field?: string
  retryable?: boolean
  retryAfter?: number
}

export interface ApiSuccessResponse<T = any> {
  success: true
  data: T
  message?: string
  timestamp: string
  requestId: string
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Create success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  requestId?: string
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId: requestId || getCurrentCorrelationId() || 'unknown'
  }
}

/**
 * Create error response from BaseError
 */
export function createErrorResponse(
  error: BaseError,
  requestId?: string
): ApiErrorResponse {
  const correlationId = requestId || getCurrentCorrelationId() || 'unknown'
  
  return {
    success: false,
    error: error.message,
    code: error.code,
    details: error.details,
    timestamp: new Date().toISOString(),
    requestId: correlationId,
    field: error.field,
    retryable: error.retryable,
    retryAfter: error.retryAfter
  }
}

/**
 * Create error response from unknown error
 */
export function createGenericErrorResponse(
  message: string = 'An unexpected error occurred',
  code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
  statusCode: number = 500,
  requestId?: string
): ApiErrorResponse {
  const correlationId = requestId || getCurrentCorrelationId() || 'unknown'
  
  return {
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString(),
    requestId: correlationId,
    retryable: false
  }
}

/**
 * Create validation error response
 */
export function createValidationErrorResponse(
  errors: Array<{ field: string; message: string }>,
  requestId?: string
): ApiErrorResponse {
  const correlationId = requestId || getCurrentCorrelationId() || 'unknown'
  
  return {
    success: false,
    error: 'Validation failed',
    code: ErrorCode.INVALID_INPUT,
    details: { validationErrors: errors },
    timestamp: new Date().toISOString(),
    requestId: correlationId,
    retryable: false
  }
}

/**
 * Create Next.js response with error
 */
export function createErrorNextResponse(
  error: BaseError,
  requestId?: string
): NextResponse {
  const errorResponse = createErrorResponse(error, requestId)
  const response = NextResponse.json(errorResponse, { status: error.statusCode })
  
  // Add correlation headers
  response.headers.set('x-correlation-id', errorResponse.requestId)
  
  // Add retry-after header for rate limit errors
  if (error.retryAfter) {
    response.headers.set('retry-after', error.retryAfter.toString())
  }
  
  return response
}

/**
 * Create Next.js response with success data
 */
export function createSuccessNextResponse<T>(
  data: T,
  message?: string,
  requestId?: string,
  status: number = 200
): NextResponse {
  const successResponse = createSuccessResponse(data, message, requestId)
  const response = NextResponse.json(successResponse, { status })
  
  // Add correlation headers
  response.headers.set('x-correlation-id', successResponse.requestId)
  
  return response
}

/**
 * Create Next.js response with generic error
 */
export function createGenericErrorNextResponse(
  message?: string,
  code?: ErrorCode,
  statusCode: number = 500,
  requestId?: string
): NextResponse {
  const errorResponse = createGenericErrorResponse(message, code, statusCode, requestId)
  const response = NextResponse.json(errorResponse, { status: statusCode })
  
  // Add correlation headers
  response.headers.set('x-correlation-id', errorResponse.requestId)
  
  return response
}

/**
 * Create Next.js response with validation errors
 */
export function createValidationErrorNextResponse(
  errors: Array<{ field: string; message: string }>,
  requestId?: string
): NextResponse {
  const errorResponse = createValidationErrorResponse(errors, requestId)
  const response = NextResponse.json(errorResponse, { status: 400 })
  
  // Add correlation headers
  response.headers.set('x-correlation-id', errorResponse.requestId)
  
  return response
}

/**
 * Service result type for consistent service responses
 */
export interface ServiceResult<T> {
  success: boolean
  data?: T
  error?: BaseError
  message?: string
}

/**
 * Create successful service result
 */
export function createServiceSuccess<T>(data: T, message?: string): ServiceResult<T> {
  return {
    success: true,
    data,
    message
  }
}

/**
 * Create failed service result
 */
export function createServiceError<T>(error: BaseError): ServiceResult<T> {
  return {
    success: false,
    error
  }
}

/**
 * Convert service result to API response
 */
export function serviceResultToApiResponse<T>(
  result: ServiceResult<T>,
  requestId?: string
): ApiResponse<T> {
  if (result.success && result.data !== undefined) {
    return createSuccessResponse(result.data, result.message, requestId)
  } else if (result.error) {
    return createErrorResponse(result.error, requestId)
  } else {
    return createGenericErrorResponse('Unknown service error', ErrorCode.INTERNAL_SERVER_ERROR, 500, requestId)
  }
}

/**
 * Convert service result to Next.js response
 */
export function serviceResultToNextResponse<T>(
  result: ServiceResult<T>,
  requestId?: string,
  successStatus: number = 200
): NextResponse {
  if (result.success && result.data !== undefined) {
    return createSuccessNextResponse(result.data, result.message, requestId, successStatus)
  } else if (result.error) {
    return createErrorNextResponse(result.error, requestId)
  } else {
    return createGenericErrorNextResponse('Unknown service error', ErrorCode.INTERNAL_SERVER_ERROR, 500, requestId)
  }
}