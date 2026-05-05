import { NextRequest } from 'next/server';
import { awarenessSessionService } from '@/lib/services/awareness-session.service';
import { cookieManager } from '@/lib/auth/unified-session-manager';
import { createGenericErrorNextResponse, createSuccessNextResponse } from '@/lib/errors/response-utils';
import { logger } from '@/lib/utils/logger';

// GET /api/v1/awareness-sessions/{id} - Get specific awareness session request details
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    // Get session from cookies
    const sessionResult = await cookieManager.getSessionFromCookies(request);
    if (!sessionResult) {
      return createGenericErrorNextResponse('Authentication required', undefined, 401);
    }

    if (sessionResult.role !== 'customer') {
      return createGenericErrorNextResponse('Only customers can access awareness session requests', undefined, 403);
    }

    // Get the ID from route parameters
    const params = await context.params;
    const { id } = params;

    if (!id) {
      return createGenericErrorNextResponse('Awareness session request ID is required', undefined, 400);
    }

    // Get awareness session request by ID
    const result = await awarenessSessionService.getRequestById(id, sessionResult.userId);

    // Handle service result
    if (result.success) {
      return createSuccessNextResponse(result.data, 'Awareness session request fetched successfully');
    } else {
      return createGenericErrorNextResponse(result.error, result.code as any, 400);
    }

  } catch (error: any) {
    logger.error('Error fetching awareness session request by ID:', error);
    return createGenericErrorNextResponse('Failed to fetch awareness session request', undefined, 500);
  }
}