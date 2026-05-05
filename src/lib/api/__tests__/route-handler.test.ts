/**
 * Route handler tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { 
  createRouteHandler, 
  createSingleMethodHandler,
  getRequestBody,
  createRequestWithData,
  type RouteHandlerContext 
} from '../route-handler'

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}))

// Mock correlation utilities
vi.mock('@/lib/errors/correlation', () => ({
  createRequestContext: vi.fn(() => ({
    requestId: 'test-request-id',
    correlationId: 'test-correlation-id',
    clientIP: '127.0.0.1',
    userAgent: 'test-agent',
    timestamp: new Date(),
    method: 'GET',
    url: 'http://localhost:3000/test'
  })),
  runWithCorrelation: vi.fn((context, fn) => fn())
}))

describe('Route Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createSingleMethodHandler', () => {
    it('should handle allowed method correctly', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      )

      const handlers = createSingleMethodHandler('POST', mockHandler)
      const request = new NextRequest('http://localhost:3000/test', {
        method: 'POST'
      })

      const response = await handlers.POST(request)
      
      expect(mockHandler).toHaveBeenCalled()
      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should reject disallowed methods', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      )

      const handlers = createSingleMethodHandler('POST', mockHandler)
      const request = new NextRequest('http://localhost:3000/test', {
        method: 'GET'
      })

      const response = await handlers.GET(request)
      
      expect(mockHandler).not.toHaveBeenCalled()
      expect(response).toBeInstanceOf(NextResponse)
      expect(response.status).toBe(405)
    })
  })

  describe('createRouteHandler', () => {
    it('should handle multiple allowed methods', async () => {
      const getHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ method: 'GET' })
      )
      const postHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ method: 'POST' })
      )

      const handlers = createRouteHandler(
        { allowedMethods: ['GET', 'POST'] },
        {
          GET: getHandler,
          POST: postHandler
        }
      )

      // Test GET
      const getRequest = new NextRequest('http://localhost:3000/test', {
        method: 'GET'
      })
      const getResponse = await handlers.GET(getRequest)
      
      expect(getHandler).toHaveBeenCalled()
      expect(getResponse).toBeInstanceOf(NextResponse)

      // Test POST
      const postRequest = new NextRequest('http://localhost:3000/test', {
        method: 'POST'
      })
      const postResponse = await handlers.POST(postRequest)
      
      expect(postHandler).toHaveBeenCalled()
      expect(postResponse).toBeInstanceOf(NextResponse)
    })

    it('should reject methods not in allowedMethods', async () => {
      const getHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ method: 'GET' })
      )

      const handlers = createRouteHandler(
        { allowedMethods: ['GET'] },
        { GET: getHandler }
      )

      const request = new NextRequest('http://localhost:3000/test', {
        method: 'POST'
      })
      const response = await handlers.POST(request)
      
      expect(getHandler).not.toHaveBeenCalled()
      expect(response).toBeInstanceOf(NextResponse)
      expect(response.status).toBe(405)
    })
  })

  describe('getRequestBody', () => {
    it('should parse valid JSON body', async () => {
      const testData = { name: 'test', value: 123 }
      const request = new NextRequest('http://localhost:3000/test', {
        method: 'POST',
        body: JSON.stringify(testData),
        headers: { 'content-type': 'application/json' }
      })

      const body = await getRequestBody(request)
      expect(body).toEqual(testData)
    })

    it('should throw ValidationError for invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/test', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'content-type': 'application/json' }
      })

      await expect(getRequestBody(request)).rejects.toThrow()
    })
  })

  describe('createRequestWithData', () => {
    it('should create request with additional data', () => {
      const originalRequest = new NextRequest('http://localhost:3000/test', {
        method: 'POST',
        headers: { 'authorization': 'Bearer token' }
      })

      const additionalData = { role: 'customer', extra: 'data' }
      const newRequest = createRequestWithData(originalRequest, additionalData)

      expect(newRequest.url).toBe(originalRequest.url)
      expect(newRequest.method).toBe(originalRequest.method)
      expect(newRequest.headers.get('authorization')).toBe('Bearer token')
    })
  })

  describe('error handling', () => {
    it('should handle handler errors gracefully', async () => {
      const errorHandler = vi.fn().mockRejectedValue(new Error('Test error'))

      const handlers = createSingleMethodHandler('POST', errorHandler)
      const request = new NextRequest('http://localhost:3000/test', {
        method: 'POST'
      })

      const response = await handlers.POST(request)
      
      expect(response).toBeInstanceOf(NextResponse)
      expect(response.status).toBe(500)
    })

    it('should add correlation headers to responses', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      )

      const handlers = createSingleMethodHandler('POST', mockHandler)
      const request = new NextRequest('http://localhost:3000/test', {
        method: 'POST'
      })

      const response = await handlers.POST(request)
      
      expect(response.headers.get('x-correlation-id')).toBe('test-request-id')
    })
  })
})