/**
 * Tests for error handling system
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { ZodError, z } from 'zod'
import { ErrorHandler } from '../error-handler'
import { 
  ValidationError, 
  AuthenticationError, 
  DatabaseError,
  UnknownError 
} from '../custom-errors'
import { ErrorCode } from '../error-types'
import { createRequestContext } from '../correlation'

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}))

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler
  let mockRequest: NextRequest

  beforeEach(() => {
    errorHandler = new ErrorHandler()
    mockRequest = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: {
        'user-agent': 'test-agent',
        'x-forwarded-for': '127.0.0.1'
      }
    })
    vi.clearAllMocks()
  })

  describe('handleError', () => {
    it('should handle ValidationError correctly', () => {
      const error = ValidationError.invalidInput('email', 'Invalid email format')
      const context = createRequestContext(mockRequest)
      
      const response = errorHandler.handleError(error, context)
      
      expect(response.status).toBe(400)
    })

    it('should handle AuthenticationError correctly', () => {
      const error = AuthenticationError.invalidCredentials()
      const context = createRequestContext(mockRequest)
      
      const response = errorHandler.handleError(error, context)
      
      expect(response.status).toBe(401)
    })

    it('should handle ZodError correctly', () => {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8)
      })
      
      const result = schema.safeParse({ email: 'invalid', password: '123' })
      if (!result.success) {
        const context = createRequestContext(mockRequest)
        const response = errorHandler.handleError(result.error, context)
        
        expect(response.status).toBe(400)
      } else {
        throw new Error('Expected validation to fail')
      }
    })

    it('should handle database errors correctly', () => {
      const dbError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint "users_email_key"'
      }
      const context = createRequestContext(mockRequest)
      
      const response = errorHandler.handleError(dbError, context)
      
      expect(response.status).toBe(409)
    })

    it('should handle unknown errors correctly', () => {
      const unknownError = new Error('Something went wrong')
      const context = createRequestContext(mockRequest)
      
      const response = errorHandler.handleError(unknownError, context)
      
      expect(response.status).toBe(500)
    })

    it('should sanitize errors in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      const productionHandler = new ErrorHandler({ sanitizeErrors: true })
      const serverError = new DatabaseError(ErrorCode.DATABASE_CONNECTION_ERROR)
      const context = createRequestContext(mockRequest)
      
      const response = productionHandler.handleError(serverError, context)
      
      expect(response.status).toBe(500)
      
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('withErrorHandler', () => {
    it('should catch and handle errors in wrapped function', async () => {
      const { withErrorHandler } = await import('../error-handler')
      
      const throwingHandler = withErrorHandler(async () => {
        throw ValidationError.invalidInput('test')
      })
      
      const response = await throwingHandler()
      expect(response.status).toBe(400)
    })

    it('should pass through successful responses', async () => {
      const { withErrorHandler } = await import('../error-handler')
      const { createSuccessNextResponse } = await import('../response-utils')
      
      const successHandler = withErrorHandler(async () => {
        return createSuccessNextResponse({ message: 'success' })
      })
      
      const response = await successHandler()
      expect(response.status).toBe(200)
    })
  })
})

describe('Custom Errors', () => {
  describe('ValidationError', () => {
    it('should create invalid input error correctly', () => {
      const error = ValidationError.invalidInput('email', 'Invalid format', 'req-123')
      
      expect(error.code).toBe(ErrorCode.INVALID_INPUT)
      expect(error.field).toBe('email')
      expect(error.message).toBe('Invalid format')
      expect(error.requestId).toBe('req-123')
      expect(error.statusCode).toBe(400)
      expect(error.retryable).toBe(false)
    })

    it('should create missing field error correctly', () => {
      const error = ValidationError.missingField('password')
      
      expect(error.code).toBe(ErrorCode.MISSING_REQUIRED_FIELD)
      expect(error.field).toBe('password')
      expect(error.message).toBe("Required field 'password' is missing")
    })

    it('should create invalid format error correctly', () => {
      const error = ValidationError.invalidFormat('email', 'valid email address')
      
      expect(error.code).toBe(ErrorCode.INVALID_FORMAT)
      expect(error.field).toBe('email')
      expect(error.details).toEqual({ expectedFormat: 'valid email address' })
    })
  })

  describe('AuthenticationError', () => {
    it('should create invalid credentials error correctly', () => {
      const error = AuthenticationError.invalidCredentials('req-123')
      
      expect(error.code).toBe(ErrorCode.INVALID_CREDENTIALS)
      expect(error.statusCode).toBe(401)
      expect(error.requestId).toBe('req-123')
    })

    it('should create token expired error correctly', () => {
      const error = AuthenticationError.tokenExpired()
      
      expect(error.code).toBe(ErrorCode.TOKEN_EXPIRED)
      expect(error.retryable).toBe(true)
    })

    it('should create account locked error correctly', () => {
      const error = AuthenticationError.accountLocked('Too many failed attempts')
      
      expect(error.code).toBe(ErrorCode.ACCOUNT_LOCKED)
      expect(error.details).toEqual({ reason: 'Too many failed attempts' })
    })
  })

  describe('DatabaseError', () => {
    it('should create connection error correctly', () => {
      const originalError = new Error('Connection refused')
      const error = DatabaseError.connectionError(originalError, 'req-123')
      
      expect(error.code).toBe(ErrorCode.DATABASE_CONNECTION_ERROR)
      expect(error.retryable).toBe(true)
      expect(error.details).toEqual({ originalError: 'Connection refused' })
    })

    it('should create duplicate entry error correctly', () => {
      const error = DatabaseError.duplicateEntry('email', 'test@example.com')
      
      expect(error.code).toBe(ErrorCode.DUPLICATE_ENTRY)
      expect(error.statusCode).toBe(409)
      expect(error.details).toEqual({ field: 'email', value: 'test@example.com' })
    })
  })
})

describe('Response Utils', () => {
  describe('createSuccessResponse', () => {
    it('should create success response correctly', async () => {
      const { createSuccessResponse } = await import('../response-utils')
      
      const response = createSuccessResponse({ id: 1 }, 'Success message', 'req-123')
      
      expect(response.success).toBe(true)
      expect(response.data).toEqual({ id: 1 })
      expect(response.message).toBe('Success message')
      expect(response.requestId).toBe('req-123')
      expect(response.timestamp).toBeDefined()
    })
  })

  describe('createErrorResponse', () => {
    it('should create error response correctly', async () => {
      const { createErrorResponse } = await import('../response-utils')
      
      const error = ValidationError.invalidInput('email', 'Invalid format', 'req-123')
      const response = createErrorResponse(error, 'req-123')
      
      expect(response.success).toBe(false)
      expect(response.error).toBe('Invalid format')
      expect(response.code).toBe(ErrorCode.INVALID_INPUT)
      expect(response.field).toBe('email')
      expect(response.retryable).toBe(false)
      expect(response.requestId).toBe('req-123')
    })
  })

  describe('serviceResultToNextResponse', () => {
    it('should convert successful service result to Next response', async () => {
      const { serviceResultToNextResponse, createServiceSuccess } = await import('../response-utils')
      
      const serviceResult = createServiceSuccess({ id: 1 }, 'Created successfully')
      const response = serviceResultToNextResponse(serviceResult, 'req-123', 201)
      
      expect(response.status).toBe(201)
    })

    it('should convert failed service result to Next response', async () => {
      const { serviceResultToNextResponse, createServiceError } = await import('../response-utils')
      
      const error = ValidationError.invalidInput('email')
      const serviceResult = createServiceError(error)
      const response = serviceResultToNextResponse(serviceResult, 'req-123')
      
      expect(response.status).toBe(400)
    })
  })
})