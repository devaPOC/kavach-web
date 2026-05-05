/**
 * Performance monitoring middleware for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { recordApiRequest, measurePerformance } from '../utils/metrics';
import { auditSystem } from '../utils/audit-logger';
import { logger } from '../utils/logger';

export interface PerformanceMetrics {
  requestId: string;
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  memoryUsage: {
    before: NodeJS.MemoryUsage;
    after: NodeJS.MemoryUsage;
    delta: {
      heapUsed: number;
      heapTotal: number;
      rss: number;
    };
  };
  timestamp: string;
}

export interface PerformanceThresholds {
  slowRequestMs: number;
  memoryLeakMb: number;
  criticalMemoryMb: number;
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  slowRequestMs: 5000, // 5 seconds
  memoryLeakMb: 50, // 50MB increase
  criticalMemoryMb: 500 // 500MB total heap
};

class PerformanceMonitor {
  private thresholds: PerformanceThresholds;
  private requestMetrics: Map<string, PerformanceMetrics> = new Map();

  constructor(thresholds: Partial<PerformanceThresholds> = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
    this.startCleanupInterval();
  }

  /**
   * Monitor a request's performance
   */
  async monitorRequest<T>(
    request: NextRequest,
    requestId: string,
    handler: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const memoryBefore = process.memoryUsage();
    const url = new URL(request.url);
    const endpoint = url.pathname;

    try {
      const result = await handler();
      const duration = Date.now() - startTime;
      const memoryAfter = process.memoryUsage();

      // Calculate memory delta
      const memoryDelta = {
        heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
        heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
        rss: memoryAfter.rss - memoryBefore.rss
      };

      const metrics: PerformanceMetrics = {
        requestId,
        method: request.method,
        url: endpoint,
        statusCode: 200, // Assume success if no error thrown
        duration,
        memoryUsage: {
          before: memoryBefore,
          after: memoryAfter,
          delta: memoryDelta
        },
        timestamp: new Date().toISOString()
      };

      // Store metrics
      this.requestMetrics.set(requestId, metrics);

      // Record API metrics
      recordApiRequest(endpoint, request.method, 200, duration);

      // Check for performance issues
      this.checkPerformanceThresholds(metrics);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const memoryAfter = process.memoryUsage();

      // Record error metrics
      const statusCode = this.getErrorStatusCode(error);
      recordApiRequest(endpoint, request.method, statusCode, duration);

      const metrics: PerformanceMetrics = {
        requestId,
        method: request.method,
        url: endpoint,
        statusCode,
        duration,
        memoryUsage: {
          before: memoryBefore,
          after: memoryAfter,
          delta: {
            heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
            heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
            rss: memoryAfter.rss - memoryBefore.rss
          }
        },
        timestamp: new Date().toISOString()
      };

      this.requestMetrics.set(requestId, metrics);
      this.checkPerformanceThresholds(metrics);

      throw error;
    }
  }

  /**
   * Monitor a database operation
   */
  async monitorDatabaseOperation<T>(
    operation: string,
    handler: () => Promise<T>
  ): Promise<T> {
    return measurePerformance(`database_${operation}`, handler);
  }

  /**
   * Monitor an external service call
   */
  async monitorExternalService<T>(
    serviceName: string,
    handler: () => Promise<T>
  ): Promise<T> {
    return measurePerformance(`external_service_${serviceName}`, handler);
  }

  /**
   * Get performance metrics for a request
   */
  getRequestMetrics(requestId: string): PerformanceMetrics | undefined {
    return this.requestMetrics.get(requestId);
  }

  /**
   * Get recent performance metrics
   */
  getRecentMetrics(limit: number = 100): PerformanceMetrics[] {
    const metrics = Array.from(this.requestMetrics.values());
    return metrics
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    averageResponseTime: number;
    slowRequests: number;
    memoryLeaks: number;
    totalRequests: number;
    errorRate: number;
  } {
    const metrics = Array.from(this.requestMetrics.values());
    
    if (metrics.length === 0) {
      return {
        averageResponseTime: 0,
        slowRequests: 0,
        memoryLeaks: 0,
        totalRequests: 0,
        errorRate: 0
      };
    }

    const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
    const averageResponseTime = totalDuration / metrics.length;
    
    const slowRequests = metrics.filter(m => m.duration > this.thresholds.slowRequestMs).length;
    const memoryLeaks = metrics.filter(m => 
      m.memoryUsage.delta.heapUsed > this.thresholds.memoryLeakMb * 1024 * 1024
    ).length;
    
    const errorRequests = metrics.filter(m => m.statusCode >= 400).length;
    const errorRate = (errorRequests / metrics.length) * 100;

    return {
      averageResponseTime: Math.round(averageResponseTime),
      slowRequests,
      memoryLeaks,
      totalRequests: metrics.length,
      errorRate: Math.round(errorRate * 100) / 100
    };
  }

  private checkPerformanceThresholds(metrics: PerformanceMetrics): void {
    // Check for slow requests
    if (metrics.duration > this.thresholds.slowRequestMs) {
      auditSystem({
        event: 'system.performance.degraded',
        severity: 'medium',
        metadata: {
          type: 'slow_request',
          endpoint: metrics.url,
          method: metrics.method,
          duration: metrics.duration,
          threshold: this.thresholds.slowRequestMs
        },
        requestId: metrics.requestId
      });

      logger.warn('Slow request detected', {
        requestId: metrics.requestId,
        endpoint: metrics.url,
        method: metrics.method,
        duration: metrics.duration,
        threshold: this.thresholds.slowRequestMs
      });
    }

    // Check for memory leaks
    const memoryIncreaseMb = metrics.memoryUsage.delta.heapUsed / (1024 * 1024);
    if (memoryIncreaseMb > this.thresholds.memoryLeakMb) {
      auditSystem({
        event: 'system.performance.degraded',
        severity: 'high',
        metadata: {
          type: 'memory_leak',
          endpoint: metrics.url,
          method: metrics.method,
          memoryIncreaseMb: Math.round(memoryIncreaseMb),
          threshold: this.thresholds.memoryLeakMb
        },
        requestId: metrics.requestId
      });

      logger.error('Potential memory leak detected', {
        requestId: metrics.requestId,
        endpoint: metrics.url,
        method: metrics.method,
        memoryIncreaseMb: Math.round(memoryIncreaseMb),
        threshold: this.thresholds.memoryLeakMb
      });
    }

    // Check for critical memory usage
    const totalMemoryMb = metrics.memoryUsage.after.heapUsed / (1024 * 1024);
    if (totalMemoryMb > this.thresholds.criticalMemoryMb) {
      auditSystem({
        event: 'system.error.critical',
        severity: 'critical',
        metadata: {
          type: 'critical_memory',
          endpoint: metrics.url,
          method: metrics.method,
          totalMemoryMb: Math.round(totalMemoryMb),
          threshold: this.thresholds.criticalMemoryMb
        },
        requestId: metrics.requestId
      });

      logger.error('Critical memory usage detected', {
        requestId: metrics.requestId,
        endpoint: metrics.url,
        method: metrics.method,
        totalMemoryMb: Math.round(totalMemoryMb),
        threshold: this.thresholds.criticalMemoryMb
      });
    }
  }

  private getErrorStatusCode(error: any): number {
    if (error?.statusCode) return error.statusCode;
    if (error?.status) return error.status;
    return 500; // Default to internal server error
  }

  private startCleanupInterval(): void {
    // Clean up old metrics every hour
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000);
  }

  private cleanupOldMetrics(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [requestId, metrics] of this.requestMetrics) {
      if (new Date(metrics.timestamp) < cutoff) {
        this.requestMetrics.delete(requestId);
      }
    }
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Middleware wrapper for performance monitoring
 */
export function withPerformanceMonitoring<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    const [request] = args as unknown as [NextRequest, ...any[]];
    const requestId = request.headers.get('x-correlation-id') || 'unknown';

    return performanceMonitor.monitorRequest(request, requestId, () => handler(...args));
  };
}

/**
 * Database operation monitoring wrapper
 */
export function withDatabaseMonitoring<T>(
  operation: string,
  handler: () => Promise<T>
): Promise<T> {
  return performanceMonitor.monitorDatabaseOperation(operation, handler);
}

/**
 * External service monitoring wrapper
 */
export function withExternalServiceMonitoring<T>(
  serviceName: string,
  handler: () => Promise<T>
): Promise<T> {
  return performanceMonitor.monitorExternalService(serviceName, handler);
}