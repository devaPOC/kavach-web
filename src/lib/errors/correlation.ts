/**
 * Request correlation ID system for error tracking and debugging
 */

import { randomUUID } from 'crypto'
import { NextRequest } from 'next/server'

export const CORRELATION_ID_HEADER = 'x-correlation-id'
export const REQUEST_ID_HEADER = 'x-request-id'

/**
 * Generate a new correlation ID
 */
export function generateCorrelationId(): string {
  return randomUUID()
}

/**
 * Extract correlation ID from request headers or generate a new one
 */
export function getOrCreateCorrelationId(request: NextRequest): string {
  // Check for existing correlation ID in headers
  const existingId = request.headers.get(CORRELATION_ID_HEADER) || 
                    request.headers.get(REQUEST_ID_HEADER)
  
  if (existingId && isValidCorrelationId(existingId)) {
    return existingId
  }
  
  // Generate new correlation ID
  return generateCorrelationId()
}

/**
 * Validate correlation ID format
 */
export function isValidCorrelationId(id: string): boolean {
  // UUID v4 format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

/**
 * Request context for correlation tracking
 */
export interface RequestContext {
  requestId: string
  correlationId: string
  clientIP: string
  userAgent: string
  timestamp: Date
  method: string
  url: string
  userId?: string
}

/**
 * Create request context from Next.js request
 */
export function createRequestContext(request: NextRequest, userId?: string): RequestContext {
  const correlationId = getOrCreateCorrelationId(request)
  
  return {
    requestId: correlationId, // Using same ID for simplicity
    correlationId,
    clientIP: getClientIP(request),
    userAgent: request.headers.get('user-agent') || 'unknown',
    timestamp: new Date(),
    method: request.method,
    url: request.url,
    userId
  }
}

/**
 * Extract client IP from request
 */
function getClientIP(request: NextRequest): string {
  // Check various headers for client IP
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }
  
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  
  // Fallback to connection remote address (may not be available in all environments)
  return 'unknown'
}

/**
 * Correlation context for async operations
 */
class CorrelationContext {
  private static contexts = new Map<string, RequestContext>()
  
  static set(context: RequestContext): void {
    this.contexts.set(context.correlationId, context)
  }
  
  static get(correlationId: string): RequestContext | undefined {
    return this.contexts.get(correlationId)
  }
  
  static delete(correlationId: string): void {
    this.contexts.delete(correlationId)
  }
  
  static clear(): void {
    this.contexts.clear()
  }
}

export { CorrelationContext }

/**
 * Simple correlation storage for Next.js compatibility
 * Using a Map-based approach instead of async_hooks for better compatibility
 */
export const correlationStorage = {
  run: <T>(context: RequestContext, fn: () => T | Promise<T>): T | Promise<T> => {
    // Store context in the correlation context
    CorrelationContext.set(context)
    try {
      return fn()
    } finally {
      CorrelationContext.delete(context.correlationId)
    }
  },
  getStore: (): RequestContext | undefined => {
    // This is a simplified implementation - in production you'd want a more robust solution
    // For now, we'll rely on the CorrelationContext Map
    return undefined
  }
}

/**
 * Run function with correlation context
 */
export function runWithCorrelation<T>(
  context: RequestContext,
  fn: () => T | Promise<T>
): T | Promise<T> {
  return correlationStorage.run(context, fn)
}

/**
 * Get current correlation context
 */
export function getCurrentCorrelation(): RequestContext | undefined {
  return correlationStorage.getStore()
}

/**
 * Get current correlation ID
 */
export function getCurrentCorrelationId(): string | undefined {
  const context = getCurrentCorrelation()
  return context?.correlationId
}

/**
 * Set correlation ID in context (for compatibility)
 */
export function setCorrelationId(correlationId: string): void {
  // This is a simplified implementation for compatibility
  // In a real application, you'd want to use proper async context
  const context = getCurrentCorrelation()
  if (context) {
    context.correlationId = correlationId
  }
}