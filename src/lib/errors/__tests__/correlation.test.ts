/**
 * Tests for correlation system
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  generateCorrelationId,
  getOrCreateCorrelationId,
  isValidCorrelationId,
  createRequestContext,
  runWithCorrelation,
  getCurrentCorrelation,
  getCurrentCorrelationId,
  CORRELATION_ID_HEADER,
  REQUEST_ID_HEADER
} from '../correlation'

describe('Correlation System', () => {
  describe('generateCorrelationId', () => {
    it('should generate valid UUID v4', () => {
      const id = generateCorrelationId()
      expect(isValidCorrelationId(id)).toBe(true)
    })

    it('should generate unique IDs', () => {
      const id1 = generateCorrelationId()
      const id2 = generateCorrelationId()
      expect(id1).not.toBe(id2)
    })
  })

  describe('isValidCorrelationId', () => {
    it('should validate correct UUID v4 format', () => {
      const validId = '550e8400-e29b-41d4-a716-446655440000'
      expect(isValidCorrelationId(validId)).toBe(true)
    })

    it('should reject invalid formats', () => {
      expect(isValidCorrelationId('invalid-id')).toBe(false)
      expect(isValidCorrelationId('123')).toBe(false)
      expect(isValidCorrelationId('')).toBe(false)
    })

    it('should reject non-v4 UUIDs', () => {
      const nonV4Id = '550e8400-e29b-31d4-a716-446655440000' // version 3
      expect(isValidCorrelationId(nonV4Id)).toBe(false)
    })
  })

  describe('getOrCreateCorrelationId', () => {
    it('should use existing correlation ID from header', () => {
      const existingId = '550e8400-e29b-41d4-a716-446655440000'
      const request = new NextRequest('http://localhost:3000', {
        headers: {
          [CORRELATION_ID_HEADER]: existingId
        }
      })

      const id = getOrCreateCorrelationId(request)
      expect(id).toBe(existingId)
    })

    it('should use existing request ID from header', () => {
      const existingId = '550e8400-e29b-41d4-a716-446655440001'
      const request = new NextRequest('http://localhost:3000', {
        headers: {
          [REQUEST_ID_HEADER]: existingId
        }
      })

      const id = getOrCreateCorrelationId(request)
      expect(id).toBe(existingId)
    })

    it('should generate new ID when none exists', () => {
      const request = new NextRequest('http://localhost:3000')
      const id = getOrCreateCorrelationId(request)
      expect(isValidCorrelationId(id)).toBe(true)
    })

    it('should generate new ID when existing ID is invalid', () => {
      const request = new NextRequest('http://localhost:3000', {
        headers: {
          [CORRELATION_ID_HEADER]: 'invalid-id'
        }
      })

      const id = getOrCreateCorrelationId(request)
      expect(isValidCorrelationId(id)).toBe(true)
      expect(id).not.toBe('invalid-id')
    })
  })

  describe('createRequestContext', () => {
    it('should create complete request context', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'user-agent': 'test-agent',
          'x-forwarded-for': '192.168.1.1',
          [CORRELATION_ID_HEADER]: '550e8400-e29b-41d4-a716-446655440000'
        }
      })

      const context = createRequestContext(request, 'user-123')

      expect(context.correlationId).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(context.requestId).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(context.clientIP).toBe('192.168.1.1')
      expect(context.userAgent).toBe('test-agent')
      expect(context.method).toBe('POST')
      expect(context.url).toBe('http://localhost:3000/api/test')
      expect(context.userId).toBe('user-123')
      expect(context.timestamp).toBeInstanceOf(Date)
    })

    it('should handle missing headers gracefully', () => {
      const request = new NextRequest('http://localhost:3000/api/test')
      const context = createRequestContext(request)

      expect(isValidCorrelationId(context.correlationId)).toBe(true)
      expect(context.clientIP).toBe('unknown')
      expect(context.userAgent).toBe('unknown')
      expect(context.userId).toBeUndefined()
    })

    it('should extract IP from x-real-ip header', () => {
      const request = new NextRequest('http://localhost:3000', {
        headers: {
          'x-real-ip': '10.0.0.1'
        }
      })

      const context = createRequestContext(request)
      expect(context.clientIP).toBe('10.0.0.1')
    })

    it('should extract IP from cf-connecting-ip header', () => {
      const request = new NextRequest('http://localhost:3000', {
        headers: {
          'cf-connecting-ip': '203.0.113.1'
        }
      })

      const context = createRequestContext(request)
      expect(context.clientIP).toBe('203.0.113.1')
    })

    it('should prioritize x-forwarded-for over other IP headers', () => {
      const request = new NextRequest('http://localhost:3000', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
          'x-real-ip': '10.0.0.1',
          'cf-connecting-ip': '203.0.113.1'
        }
      })

      const context = createRequestContext(request)
      expect(context.clientIP).toBe('192.168.1.1')
    })
  })

  describe('AsyncLocalStorage correlation', () => {
    it('should store and retrieve correlation context', async () => {
      const request = new NextRequest('http://localhost:3000')
      const context = createRequestContext(request, 'user-123')

      await runWithCorrelation(context, async () => {
        const currentContext = getCurrentCorrelation()
        expect(currentContext).toEqual(context)

        const currentId = getCurrentCorrelationId()
        expect(currentId).toBe(context.correlationId)
      })
    })

    it('should return undefined when no context is set', () => {
      const currentContext = getCurrentCorrelation()
      expect(currentContext).toBeUndefined()

      const currentId = getCurrentCorrelationId()
      expect(currentId).toBeUndefined()
    })

    it('should handle nested correlation contexts', async () => {
      const request1 = new NextRequest('http://localhost:3000')
      const context1 = createRequestContext(request1, 'user-1')

      const request2 = new NextRequest('http://localhost:3000')
      const context2 = createRequestContext(request2, 'user-2')

      await runWithCorrelation(context1, async () => {
        expect(getCurrentCorrelationId()).toBe(context1.correlationId)

        await runWithCorrelation(context2, async () => {
          expect(getCurrentCorrelationId()).toBe(context2.correlationId)
        })

        expect(getCurrentCorrelationId()).toBe(context1.correlationId)
      })
    })

    it('should work with synchronous functions', () => {
      const request = new NextRequest('http://localhost:3000')
      const context = createRequestContext(request)

      const result = runWithCorrelation(context, () => {
        const currentId = getCurrentCorrelationId()
        return currentId
      })

      expect(result).toBe(context.correlationId)
    })
  })
})