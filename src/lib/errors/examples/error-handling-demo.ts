/**
 * Demo/example of how to use the standardized error handling system
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  ValidationError,
  AuthenticationError,
  DatabaseError,
  withErrorHandler,
  createRequestContext,
  runWithCorrelation,
  createSuccessNextResponse,
  createErrorNextResponse,
  serviceResultToNextResponse,
  createServiceSuccess,
  createServiceError
} from '../index'

/**
 * Example API route handler with error handling
 */
export const exampleApiRoute = withErrorHandler(async (request: NextRequest) => {
  // Create request context for correlation tracking
  const context = createRequestContext(request, 'user-123')
  
  return runWithCorrelation(context, async () => {
    // Simulate some business logic that might throw errors
    const result = await exampleService()
    
    // Return success response
    return createSuccessNextResponse(result, 'Operation completed successfully')
  })
})

/**
 * Example service function with error handling
 */
async function exampleService() {
  // Example validation error
  if (Math.random() > 0.8) {
    throw ValidationError.invalidInput('email', 'Invalid email format')
  }
  
  // Example authentication error
  if (Math.random() > 0.9) {
    throw AuthenticationError.tokenExpired()
  }
  
  // Example database error
  if (Math.random() > 0.95) {
    throw DatabaseError.connectionError(new Error('Connection timeout'))
  }
  
  return { id: 1, message: 'Success' }
}

/**
 * Example controller method using service results
 */
export async function exampleController(request: NextRequest): Promise<NextResponse> {
  const context = createRequestContext(request)
  
  try {
    // Call service and get result
    const serviceResult = await exampleServiceWithResult()
    
    // Convert service result to Next.js response
    return serviceResultToNextResponse(serviceResult, context.correlationId)
  } catch (error) {
    // Handle unexpected errors
    if (error instanceof ValidationError) {
      return createErrorNextResponse(error, context.correlationId)
    }
    
    // For unknown errors, create a generic error response
    const unknownError = new DatabaseError()
    return createErrorNextResponse(unknownError, context.correlationId)
  }
}

/**
 * Example service that returns ServiceResult
 */
async function exampleServiceWithResult() {
  try {
    const data = await exampleService()
    return createServiceSuccess(data, 'Data retrieved successfully')
  } catch (error) {
    if (error instanceof ValidationError || 
        error instanceof AuthenticationError || 
        error instanceof DatabaseError) {
      return createServiceError(error)
    }
    
    // Convert unknown errors
    const unknownError = new DatabaseError()
    return createServiceError(unknownError)
  }
}

/**
 * Example middleware usage
 */
export async function exampleMiddleware(request: NextRequest) {
  const context = createRequestContext(request)
  
  // Run the rest of the request with correlation context
  return runWithCorrelation(context, async () => {
    // Your middleware logic here
    console.log(`Processing request ${context.correlationId}`)
    
    // Continue to next middleware or route handler
    return NextResponse.next()
  })
}

/**
 * Example of manual error creation and handling
 */
export function createCustomErrors() {
  // Create validation errors
  const validationError = ValidationError.missingField('password')
  const formatError = ValidationError.invalidFormat('email', 'valid email address')
  
  // Create authentication errors
  const authError = AuthenticationError.invalidCredentials()
  const expiredError = AuthenticationError.tokenExpired()
  
  // Create database errors
  const dbError = DatabaseError.duplicateEntry('email', 'user@example.com')
  const connectionError = DatabaseError.connectionError(new Error('Timeout'))
  
  return {
    validationError,
    formatError,
    authError,
    expiredError,
    dbError,
    connectionError
  }
}

/**
 * Example of error logging and monitoring
 */
export async function exampleWithLogging(request: NextRequest) {
  const context = createRequestContext(request, 'user-456')
  
  return runWithCorrelation(context, async () => {
    try {
      // Your business logic here
      const result = await exampleService()
      
      // Log successful operation
      console.log('Operation completed successfully', {
        requestId: context.correlationId,
        userId: context.userId,
        timestamp: context.timestamp
      })
      
      return createSuccessNextResponse(result)
    } catch (error) {
      // Error will be automatically logged by the error handler
      // when using withErrorHandler wrapper
      throw error
    }
  })
}