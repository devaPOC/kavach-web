/**
 * Standardized route handler utilities for consistent API behavior
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRequestContext, runWithCorrelation, type RequestContext } from '@/lib/errors/correlation'
import { 
  createGenericErrorNextResponse, 
  createErrorNextResponse,
  type ServiceResult 
} from '@/lib/errors/response-utils'
import { BaseError, ValidationError } from '@/lib/errors/custom-errors'
import { ErrorCode } from '@/lib/errors/error-types'
import { logger } from '@/lib/utils/logger'

/**
 * HTTP methods supported by Next.js API routes
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

/**
 * Route handler function signature
 */
export type RouteHandler<T = any> = (
  request: NextRequest,
  context: RouteHandlerContext
) => Promise<NextResponse | ServiceResult<T>>

/**
 * Route handler context with request information
 */
export interface RouteHandlerContext {
  requestContext: RequestContext
  params?: Record<string, string>
}

/**
 * Route configuration options
 */
export interface RouteConfig {
  allowedMethods: HttpMethod[]
  requireAuth?: boolean
  rateLimit?: {
    requests: number
    windowMs: number
  }
}

/**
 * Method not allowed error
 */
class MethodNotAllowedError extends ValidationError {
  constructor(method: string, allowedMethods: HttpMethod[]) {
    super(
      ErrorCode.INVALID_INPUT,
      `Method ${method} not allowed. Allowed methods: ${allowedMethods.join(', ')}`,
      undefined,
      { allowedMethods }
    )
    // Override the status code to 405 for method not allowed
    this.statusCode = 405
  }
}

/**
 * Create a standardized route handler with consistent error handling
 */
export function createRouteHandler(
  config: RouteConfig,
  handlers: Partial<Record<HttpMethod, RouteHandler>>
) {
  const methodHandler = (method: HttpMethod) => createMethodHandler(method, config, handlers)
  
  return {
    GET: methodHandler('GET'),
    POST: methodHandler('POST'),
    PUT: methodHandler('PUT'),
    DELETE: methodHandler('DELETE'),
    PATCH: methodHandler('PATCH'),
    HEAD: methodHandler('HEAD'),
    OPTIONS: methodHandler('OPTIONS')
  }
}

/**
 * Create a handler for a specific HTTP method
 */
function createMethodHandler(
  method: HttpMethod,
  config: RouteConfig,
  handlers: Partial<Record<HttpMethod, RouteHandler>>
) {
  return async (request: NextRequest, context?: any) => {
    // Parse route parameters if provided
    let params: Record<string, string> | undefined
    if (context?.params) {
      params = await context.params
    }

    // Create request context
    const requestContext = createRequestContext(request)

    // Run with correlation context
    return runWithCorrelation(requestContext, async () => {
      try {
        // Validate HTTP method
        if (!config.allowedMethods.includes(method)) {
          const error = new MethodNotAllowedError(method, config.allowedMethods)
          logger.warn('Method not allowed', {
            method,
            allowedMethods: config.allowedMethods,
            url: request.url,
            requestId: requestContext.requestId
          })
          return createErrorNextResponse(error, requestContext.requestId)
        }

        // Get handler for this method
        const handler = handlers[method]
        if (!handler) {
          const error = new MethodNotAllowedError(method, config.allowedMethods)
          return createErrorNextResponse(error, requestContext.requestId)
        }

        // Create handler context
        const handlerContext: RouteHandlerContext = {
          requestContext,
          params
        }

        // Execute handler
        const result = await handler(request, handlerContext)

        // If result is already a NextResponse, return it
        if (result instanceof NextResponse) {
          // Add correlation headers if not already present
          if (!result.headers.get('x-correlation-id')) {
            result.headers.set('x-correlation-id', requestContext.requestId)
          }
          return result
        }

        // If result is a ServiceResult, convert to NextResponse
        if (isServiceResult(result)) {
          const { serviceResultToNextResponse } = await import('@/lib/errors/response-utils')
          return serviceResultToNextResponse(result, requestContext.requestId)
        }

        // Fallback for unexpected result types
        logger.error('Unexpected handler result type', {
          resultType: typeof result,
          requestId: requestContext.requestId
        })
        return createGenericErrorNextResponse(
          'Internal server error',
          ErrorCode.INTERNAL_SERVER_ERROR,
          500,
          requestContext.requestId
        )

      } catch (error) {
        // Log the error
        logger.error('Route handler error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          method,
          url: request.url,
          requestId: requestContext.requestId
        })

        // Handle known errors
        if (error instanceof BaseError) {
          return createErrorNextResponse(error, requestContext.requestId)
        }

        // Handle unknown errors
        return createGenericErrorNextResponse(
          'An unexpected error occurred',
          ErrorCode.INTERNAL_SERVER_ERROR,
          500,
          requestContext.requestId
        )
      }
    })
  }
}

/**
 * Type guard to check if result is a ServiceResult
 */
function isServiceResult<T>(result: any): result is ServiceResult<T> {
  return (
    typeof result === 'object' &&
    result !== null &&
    typeof result.success === 'boolean' &&
    (result.success === false || result.data !== undefined)
  )
}

/**
 * Simple route handler for single method endpoints
 */
export function createSingleMethodHandler<T = any>(
  method: HttpMethod,
  handler: RouteHandler<T>
) {
  const config: RouteConfig = {
    allowedMethods: [method]
  }

  const handlers = {
    [method]: handler
  }

  return createRouteHandler(config, handlers)
}

/**
 * Create method not allowed handler for unsupported methods
 */
export function createMethodNotAllowedHandler(allowedMethods: HttpMethod[]) {
  return async (request: NextRequest) => {
    const requestContext = createRequestContext(request)
    const error = new MethodNotAllowedError(request.method as HttpMethod, allowedMethods)
    
    logger.warn('Method not allowed', {
      method: request.method,
      allowedMethods,
      url: request.url,
      requestId: requestContext.requestId
    })

    return createErrorNextResponse(error, requestContext.requestId)
  }
}

/**
 * Utility to extract and validate request body
 */
export async function getRequestBody<T = any>(request: NextRequest): Promise<T> {
  try {
    const body = await request.json()
    return body as T
  } catch (error) {
    throw ValidationError.invalidInput(
      'Invalid JSON in request body',
      { originalError: error instanceof Error ? error.message : 'Unknown error' }
    )
  }
}

/**
 * Utility to create request with additional data (for compatibility with existing code)
 */
export function createRequestWithData(
  originalRequest: NextRequest,
  additionalData: Record<string, any>
): Request {
  return new Request(originalRequest.url, {
    method: originalRequest.method,
    headers: originalRequest.headers,
    body: JSON.stringify(additionalData)
  })
}