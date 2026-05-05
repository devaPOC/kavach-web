import { NextRequest, NextResponse } from 'next/server';
import { 
  createSingleMethodHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';
import { UnknownError } from '@/lib/errors/custom-errors';
import { snapshotMetrics, recordSystemMetrics } from '@/lib/utils/metrics';
import { performanceMonitor } from '@/lib/middleware/performance-monitor';

async function handleMetricsRequest(request: NextRequest, context: RouteHandlerContext) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const format = searchParams.get('format') || 'json';

    // Record current system metrics before returning snapshot
    recordSystemMetrics();

    let responseData: any = {};

    switch (type) {
      case 'system':
        const systemMetrics = snapshotMetrics().filter(m => 
          m.name.startsWith('system_') || m.name.includes('memory') || m.name.includes('cpu')
        );
        responseData = {
          metrics: systemMetrics,
          timestamp: new Date().toISOString()
        };
        break;

      case 'auth':
        const authMetrics = snapshotMetrics().filter(m => m.name.startsWith('auth_'));
        responseData = {
          metrics: authMetrics,
          timestamp: new Date().toISOString()
        };
        break;

      case 'api':
        const apiMetrics = snapshotMetrics().filter(m => m.name.startsWith('api_'));
        responseData = {
          metrics: apiMetrics,
          timestamp: new Date().toISOString()
        };
        break;

      case 'database':
        const dbMetrics = snapshotMetrics().filter(m => m.name.startsWith('database_'));
        responseData = {
          metrics: dbMetrics,
          timestamp: new Date().toISOString()
        };
        break;

      case 'security':
        const securityMetrics = snapshotMetrics().filter(m => m.name.startsWith('security_'));
        responseData = {
          metrics: securityMetrics,
          timestamp: new Date().toISOString()
        };
        break;

      case 'performance':
        const performanceStats = performanceMonitor.getPerformanceStats();
        const recentMetrics = performanceMonitor.getRecentMetrics(50);
        responseData = {
          stats: performanceStats,
          recentRequests: recentMetrics,
          timestamp: new Date().toISOString()
        };
        break;

      case 'all':
      default:
        const allMetrics = snapshotMetrics();
        const perfStats = performanceMonitor.getPerformanceStats();
        
        responseData = {
          metrics: allMetrics,
          performance: perfStats,
          system: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            nodeVersion: process.version
          },
          timestamp: new Date().toISOString()
        };
        break;
    }

    // Handle different response formats
    if (format === 'prometheus') {
      // Convert to Prometheus format
      const prometheusData = convertToPrometheusFormat(responseData.metrics || []);
      const response = new NextResponse(prometheusData, {
        headers: {
          'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
          'x-correlation-id': context.requestContext.requestId
        }
      });
      return response;
    }

    // Default JSON format
    const response = NextResponse.json(responseData);
    response.headers.set('x-correlation-id', context.requestContext.requestId);
    return response;

  } catch (error) {
    throw new UnknownError(
      error instanceof Error ? error : new Error('Unknown error'),
      context.requestContext.requestId
    );
  }
}

function convertToPrometheusFormat(metrics: any[]): string {
  const lines: string[] = [];
  
  for (const metric of metrics) {
    const labels = metric.labels 
      ? Object.entries(metric.labels).map(([k, v]) => `${k}="${v}"`).join(',')
      : '';
    
    const labelString = labels ? `{${labels}}` : '';
    
    switch (metric.type) {
      case 'counter':
        lines.push(`# TYPE ${metric.name} counter`);
        lines.push(`${metric.name}${labelString} ${metric.value}`);
        break;
        
      case 'gauge':
        lines.push(`# TYPE ${metric.name} gauge`);
        lines.push(`${metric.name}${labelString} ${metric.value}`);
        break;
        
      case 'histogram':
        lines.push(`# TYPE ${metric.name} histogram`);
        lines.push(`${metric.name}_count${labelString} ${metric.count}`);
        lines.push(`${metric.name}_sum${labelString} ${metric.sum}`);
        // Add buckets if needed
        break;
        
      case 'timer':
        lines.push(`# TYPE ${metric.name}_duration_seconds gauge`);
        lines.push(`${metric.name}_duration_seconds${labelString} ${metric.duration / 1000}`);
        break;
    }
  }
  
  return lines.join('\n') + '\n';
}

// Create standardized route handlers
const handlers = createSingleMethodHandler('GET', handleMetricsRequest);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;