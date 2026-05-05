import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandler } from '@/lib/api/route-handler';
import { awarenessSessionAnalyticsService } from '@/lib/services/awareness-session-analytics.service';
import { cookieManager } from '@/lib/auth/unified-session-manager';
import { createGenericErrorNextResponse, createSuccessNextResponse } from '@/lib/errors/response-utils';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';

const analyticsQuerySchema = z.object({
  startDate: z.string().refine(date => !isNaN(Date.parse(date)), {
    message: "Invalid start date format"
  }),
  endDate: z.string().refine(date => !isNaN(Date.parse(date)), {
    message: "Invalid end date format"
  }),
});

const exportQuerySchema = analyticsQuerySchema.extend({
  format: z.enum(['csv', 'pdf']),
  includeDetails: z.string().optional().transform(val => val === 'true'),
});

/**
 * GET /api/v1/admin/awareness-sessions/analytics
 * Get comprehensive analytics for awareness sessions
 */
async function handleGetAnalytics(request: NextRequest) {
  try {
    // Get session from cookies
    const sessionResult = await cookieManager.getSessionFromCookies(request);
    if (!sessionResult) {
      return createGenericErrorNextResponse('Authentication required', undefined, 401);
    }

    // Verify admin access
    if (sessionResult.role !== 'admin') {
      return createGenericErrorNextResponse('Admin access required', undefined, 403);
    }

    const { searchParams } = new URL(request.url);

    // Check if this is an export request
    const format = searchParams.get('format');
    if (format) {
      // Handle export request
      const exportValidation = exportQuerySchema.safeParse({
        startDate: searchParams.get('startDate'),
        endDate: searchParams.get('endDate'),
        format,
        includeDetails: searchParams.get('includeDetails'),
      });

      if (!exportValidation.success) {
        return createGenericErrorNextResponse(
          'Invalid export parameters',
          undefined,
          400
        );
      }

      const { startDate, endDate, includeDetails } = exportValidation.data;

      const exportResult = await awarenessSessionAnalyticsService.exportAnalytics({
        format: format as 'csv' | 'pdf',
        includeDetails: includeDetails || false,
        dateRange: {
          startDate: new Date(startDate),
          endDate: new Date(endDate)
        }
      });

      if (!exportResult.success) {
        return createGenericErrorNextResponse(
          'Export failed',
          undefined,
          500
        );
      }

      // Return file data for download
      return new NextResponse(exportResult.data.data, {
        status: 200,
        headers: {
          'Content-Type': exportResult.data.mimeType,
          'Content-Disposition': `attachment; filename="${exportResult.data.filename}"`,
        },
      });
    }

    // Handle regular analytics request
    const validation = analyticsQuerySchema.safeParse({
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    });

    if (!validation.success) {
      return createGenericErrorNextResponse(
        'Invalid query parameters',
        undefined,
        400
      );
    }

    const { startDate, endDate } = validation.data;

    const result = await awarenessSessionAnalyticsService.getAnalytics({
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    });

    if (!result.success) {
      return createGenericErrorNextResponse(result.error, undefined, 500);
    }

    return createSuccessNextResponse(result.data, 'Analytics retrieved successfully');

  } catch (error: any) {
    logger.error('Error getting awareness session analytics:', error);
    return createGenericErrorNextResponse('Failed to get analytics', undefined, 500);
  }
}

// Create route handlers
const routeHandlers = createRouteHandler(
  {
    allowedMethods: ['GET']
  },
  {
    GET: handleGetAnalytics
  }
);

export const { GET } = routeHandlers;