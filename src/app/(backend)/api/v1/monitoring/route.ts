import { NextRequest, NextResponse } from 'next/server';
import { 
  createSingleMethodHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';
import { AuthorizationError, UnknownError } from '@/lib/errors/custom-errors';
import { snapshotMetrics, recordSystemMetrics } from '@/lib/utils/metrics';
import { securityMonitor } from '@/lib/security/security-monitor';
import { healthMonitor } from '@/infrastructure/health/health-monitor';

async function handleMonitoringRequest(request: NextRequest, context: RouteHandlerContext) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';

    let responseData: any = {};

    switch (type) {
      case 'metrics':
        // Record current system metrics before returning snapshot
        recordSystemMetrics();
        responseData = {
          metrics: snapshotMetrics(),
          timestamp: new Date().toISOString()
        };
        break;

      case 'security':
        responseData = {
          stats: securityMonitor.getSecurityMetrics(),
          alerts: [], // TODO: Implement getActiveAlerts() method
          timestamp: new Date().toISOString()
        };
        break;

      case 'health':
        const healthResults = await healthMonitor.checkAll();
        const healthTrends = healthMonitor.getHealthTrends();
        responseData = {
          status: healthMonitor.getOverallStatus(healthResults),
          checks: healthResults,
          trends: healthTrends,
          timestamp: new Date().toISOString()
        };
        break;

      case 'all':
      default:
        // Record current system metrics
        recordSystemMetrics();
        
        // Get all monitoring data
        const [healthResults2] = await Promise.all([
          healthMonitor.checkAll()
        ]);

        responseData = {
          health: {
            status: healthMonitor.getOverallStatus(healthResults2),
            checks: healthResults2,
            trends: healthMonitor.getHealthTrends()
          },
          metrics: snapshotMetrics(),
          security: {
            stats: securityMonitor.getSecurityMetrics(),
            alerts: [] // TODO: Implement getActiveAlerts() method
          },
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

// Create standardized route handlers
const handlers = createSingleMethodHandler('GET', handleMonitoringRequest);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;