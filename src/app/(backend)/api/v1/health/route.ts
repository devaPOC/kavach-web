import { NextRequest, NextResponse } from 'next/server';
import {
  healthMonitor,
  DatabaseHealthCheck,
  MemoryHealthCheck,
  SessionStoreHealthCheck,
  EmailServiceHealthCheck,
  RateLimiterHealthCheck,
  DiskSpaceHealthCheck,
  HealthStatus,
  databaseManager
} from '@/infrastructure';
import { 
  createSingleMethodHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';
import { AuthorizationError, UnknownError } from '@/lib/errors/custom-errors';
import { auditSystem } from '@/lib/utils/audit-logger';
import { recordSystemMetrics } from '@/lib/utils/metrics';

// Initialize comprehensive health checks
healthMonitor.addCheck(new DatabaseHealthCheck(() => databaseManager.healthCheck()));
healthMonitor.addCheck(new MemoryHealthCheck({ warning: 80, critical: 95 }));
healthMonitor.addCheck(new SessionStoreHealthCheck(async () => {
  // Simple session store check - in production this would check Redis/database
  try {
    return true; // Placeholder - implement actual session store check
  } catch {
    return false;
  }
}));
healthMonitor.addCheck(new EmailServiceHealthCheck(async () => {
  // Simple email service check - in production this would check SMTP connectivity
  try {
    return true; // Placeholder - implement actual email service check
  } catch {
    return false;
  }
}));
healthMonitor.addCheck(new RateLimiterHealthCheck(async () => {
  // Simple rate limiter check
  try {
    return true; // Placeholder - implement actual rate limiter check
  } catch {
    return false;
  }
}));
healthMonitor.addCheck(new DiskSpaceHealthCheck({ warning: 80, critical: 95 }));

async function handleHealthCheck(request: NextRequest, context: RouteHandlerContext) {
  try {
    const { searchParams } = new URL(request.url);
    const checkName = searchParams.get('check');
    const includeTrends = searchParams.get('trends') === 'true';
    const includeHistory = searchParams.get('history') === 'true';

    // Record current system metrics
    recordSystemMetrics();

    if (checkName) {
      // Check specific component
      const result = await healthMonitor.checkOne(checkName);
      if (!result) {
        throw AuthorizationError.resourceNotFound('Health check', context.requestContext.requestId);
      }

      let responseData: any = result;

      if (includeHistory) {
        responseData = {
          ...result,
          history: healthMonitor.getHealthHistory(checkName, 20)
        };
      }

      // Audit health check
      auditSystem({
        event: 'system.health.check',
        severity: result.status === HealthStatus.HEALTHY ? 'low' : 'medium',
        metadata: {
          checkName,
          status: result.status,
          duration: result.duration
        },
        requestId: context.requestContext.requestId
      });

      const status = result.status === HealthStatus.HEALTHY ? 200 : 503;
      const response = NextResponse.json(responseData, { status });
      response.headers.set('x-correlation-id', context.requestContext.requestId);
      return response;
    }

    // Check all components
    const results = await healthMonitor.checkAll();
    const overallStatus = healthMonitor.getOverallStatus(results);

    const responseData: any = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results,
      info: {
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version
      }
    };

    if (includeTrends) {
      responseData.trends = healthMonitor.getHealthTrends();
    }

    // Audit overall health check
    auditSystem({
      event: 'system.health.check',
      severity: overallStatus === HealthStatus.HEALTHY ? 'low' : 'high',
      metadata: {
        overallStatus,
        checkCount: Object.keys(results).length,
        unhealthyChecks: Object.entries(results)
          .filter(([, result]) => result.status === HealthStatus.UNHEALTHY)
          .map(([name]) => name)
      },
      requestId: context.requestContext.requestId
    });

    const httpStatus = overallStatus === HealthStatus.HEALTHY ? 200 : 503;
    const response = NextResponse.json(responseData, { status: httpStatus });
    response.headers.set('x-correlation-id', context.requestContext.requestId);
    return response;

  } catch (error) {
    // Audit health check failure
    auditSystem({
      event: 'system.error.critical',
      severity: 'critical',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        context: 'health_check_endpoint'
      },
      requestId: context.requestContext.requestId
    });

    throw new UnknownError(
      error instanceof Error ? error : new Error('Unknown error'),
      context.requestContext.requestId
    );
  }
}

// Create standardized route handlers
const handlers = createSingleMethodHandler('GET', handleHealthCheck);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
