import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { 
  performanceMonitor, 
  withPerformanceMonitoring,
  withDatabaseMonitoring,
  withExternalServiceMonitoring
} from '../performance-monitor';

// Mock metrics - but keep the actual implementation for measurePerformance
const actualMetrics = await vi.importActual('../../utils/metrics');
vi.mock('../../utils/metrics', () => ({
  ...actualMetrics,
  recordApiRequest: vi.fn()
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Mock audit logger
vi.mock('../../utils/audit-logger', () => ({
  auditSystem: vi.fn()
}));

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear performance monitor state
    performanceMonitor['requestMetrics'].clear();
  });

  describe('monitorRequest', () => {
    it('should monitor successful request performance', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET'
      });
      const requestId = 'test-request-id';

      const result = await performanceMonitor.monitorRequest(
        mockRequest,
        requestId,
        async () => {
          // Simulate some work
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'success';
        }
      );

      expect(result).toBe('success');
      
      const metrics = performanceMonitor.getRequestMetrics(requestId);
      expect(metrics).toBeDefined();
      expect(metrics?.method).toBe('GET');
      expect(metrics?.url).toBe('/api/test');
      expect(metrics?.statusCode).toBe(200);
      expect(metrics?.duration).toBeGreaterThan(0);
    });

    it('should monitor failed request performance', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST'
      });
      const requestId = 'test-request-id';

      const testError = new Error('Test error');
      (testError as any).statusCode = 400;

      await expect(
        performanceMonitor.monitorRequest(
          mockRequest,
          requestId,
          async () => {
            throw testError;
          }
        )
      ).rejects.toThrow('Test error');

      const metrics = performanceMonitor.getRequestMetrics(requestId);
      expect(metrics).toBeDefined();
      expect(metrics?.statusCode).toBe(400);
    });

    it('should detect slow requests', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/slow', {
        method: 'GET'
      });
      const requestId = 'slow-request-id';

      // Mock a slow operation
      await performanceMonitor.monitorRequest(
        mockRequest,
        requestId,
        async () => {
          // Simulate slow work
          await new Promise(resolve => setTimeout(resolve, 100));
          return 'slow result';
        }
      );

      const metrics = performanceMonitor.getRequestMetrics(requestId);
      expect(metrics?.duration).toBeGreaterThan(50);
    });

    it('should track memory usage', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/memory', {
        method: 'GET'
      });
      const requestId = 'memory-request-id';

      await performanceMonitor.monitorRequest(
        mockRequest,
        requestId,
        async () => {
          // Simulate memory allocation
          const largeArray = new Array(1000).fill('test');
          return largeArray.length;
        }
      );

      const metrics = performanceMonitor.getRequestMetrics(requestId);
      expect(metrics?.memoryUsage).toBeDefined();
      expect(metrics?.memoryUsage.before).toBeDefined();
      expect(metrics?.memoryUsage.after).toBeDefined();
      expect(metrics?.memoryUsage.delta).toBeDefined();
    });
  });

  describe('getPerformanceStats', () => {
    it('should return accurate performance statistics', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET'
      });

      // Add some test metrics
      await performanceMonitor.monitorRequest(mockRequest, 'req1', async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'success';
      });

      await performanceMonitor.monitorRequest(mockRequest, 'req2', async () => {
        await new Promise(resolve => setTimeout(resolve, 30));
        return 'success';
      });

      // Add a failed request
      const errorRequest = new NextRequest('http://localhost:3000/api/error', {
        method: 'POST'
      });
      
      try {
        await performanceMonitor.monitorRequest(errorRequest, 'req3', async () => {
          const error = new Error('Test error');
          (error as any).statusCode = 500;
          throw error;
        });
      } catch {
        // Expected error
      }

      const stats = performanceMonitor.getPerformanceStats();
      
      expect(stats.totalRequests).toBe(3);
      expect(stats.averageResponseTime).toBeGreaterThan(0);
      expect(stats.errorRate).toBeGreaterThan(0);
    });

    it('should return zero stats when no metrics exist', () => {
      const stats = performanceMonitor.getPerformanceStats();
      
      expect(stats.totalRequests).toBe(0);
      expect(stats.averageResponseTime).toBe(0);
      expect(stats.errorRate).toBe(0);
      expect(stats.slowRequests).toBe(0);
      expect(stats.memoryLeaks).toBe(0);
    });
  });

  describe('getRecentMetrics', () => {
    it('should return recent metrics in chronological order', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET'
      });

      // Add multiple requests
      for (let i = 0; i < 5; i++) {
        await performanceMonitor.monitorRequest(mockRequest, `req${i}`, async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return `result${i}`;
        });
      }

      const recentMetrics = performanceMonitor.getRecentMetrics(3);
      
      expect(recentMetrics).toHaveLength(3);
      // Should be in reverse chronological order (most recent first)
      expect(recentMetrics[0].requestId).toBe('req4');
      expect(recentMetrics[1].requestId).toBe('req3');
      expect(recentMetrics[2].requestId).toBe('req2');
    });
  });

  describe('withPerformanceMonitoring wrapper', () => {
    it('should wrap handler with performance monitoring', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        new Response('success', { status: 200 })
      );

      const wrappedHandler = withPerformanceMonitoring(mockHandler);
      
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
        headers: { 'x-correlation-id': 'test-correlation-id' }
      });

      const result = await wrappedHandler(mockRequest);
      
      expect(mockHandler).toHaveBeenCalledWith(mockRequest);
      expect(result).toBeInstanceOf(Response);
      
      const metrics = performanceMonitor.getRequestMetrics('test-correlation-id');
      expect(metrics).toBeDefined();
    });
  });

  describe('withDatabaseMonitoring wrapper', () => {
    it('should monitor database operations', async () => {
      const mockOperation = vi.fn().mockResolvedValue('database result');
      
      const result = await withDatabaseMonitoring('user_query', mockOperation);
      
      expect(result).toBe('database result');
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should handle database operation errors', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Database error'));
      
      await expect(
        withDatabaseMonitoring('user_query', mockOperation)
      ).rejects.toThrow('Database error');
    });
  });

  describe('withExternalServiceMonitoring wrapper', () => {
    it('should monitor external service calls', async () => {
      const mockOperation = vi.fn().mockResolvedValue('service result');
      
      const result = await withExternalServiceMonitoring('email_service', mockOperation);
      
      expect(result).toBe('service result');
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should handle external service errors', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Service error'));
      
      await expect(
        withExternalServiceMonitoring('email_service', mockOperation)
      ).rejects.toThrow('Service error');
    });
  });
});