import { NextRequest } from 'next/server';
import { awarenessSessionService } from '@/lib/services/awareness-session.service';
import { cookieManager } from '@/lib/auth/unified-session-manager';
import { createGenericErrorNextResponse, createSuccessNextResponse } from '@/lib/errors/response-utils';
import { logger } from '@/lib/utils/logger';

// GET /api/v1/awareness-sessions/{id}/status-history - Get status history for awareness session request
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    // Get session from cookies
    const sessionResult = await cookieManager.getSessionFromCookies(request);
    if (!sessionResult) {
      return createGenericErrorNextResponse('Authentication required', undefined, 401);
    }

    // Get the ID from route parameters
    const params = await context.params;
    const { id } = params;

    if (!id) {
      return createGenericErrorNextResponse('Awareness session request ID is required', undefined, 400);
    }

    // Get status history for the awareness session request
    const result = await awarenessSessionService.getStatusHistory(id, sessionResult.userId);

    // Handle service result
    if (result.success) {
      return createSuccessNextResponse(result.data, 'Status history fetched successfully');
    } else {
      return createGenericErrorNextResponse(result.error, result.code as any, 400);
    }

  } catch (error: any) {
    logger.error('Error fetching awareness session status history:', error);
    return createGenericErrorNextResponse('Failed to fetch status history', undefined, 500);
  }
}