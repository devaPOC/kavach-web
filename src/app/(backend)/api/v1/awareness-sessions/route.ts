import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
import { createRouteHandler, getRequestBody } from '@/lib/api/route-handler';
import { awarenessSessionService } from '@/lib/services/awareness-session.service';
import { createAwarenessSessionSchema } from '@/lib/validation/awareness-session-schemas';
import { cookieManager } from '@/lib/auth/unified-session-manager';
import { createGenericErrorNextResponse, createSuccessNextResponse } from '@/lib/errors/response-utils';
import { logger } from '@/lib/utils/logger';

// POST /api/v1/awareness-sessions - Create new awareness session request
async function handleCreateAwarenessSession(request: NextRequest) {
  try {
    // Get session from cookies
    const sessionResult = await cookieManager.getSessionFromCookies(request);
    if (!sessionResult) {
      return createGenericErrorNextResponse('Authentication required', undefined, 401);
    }

    if (sessionResult.role !== 'customer') {
      return createGenericErrorNextResponse('Only customers can create awareness session requests', undefined, 403);
    }

    // Get request body
    const rawBody = await getRequestBody(request);

    console.log('API received raw body:', rawBody);
    console.log('API sessionDate type:', typeof rawBody.sessionDate);
    console.log('API sessionDate value:', rawBody.sessionDate);

    // Ensure sessionDate is a string (in case JSON parsing converted it to Date)
    const body = {
      ...rawBody,
      sessionDate: rawBody.sessionDate instanceof Date
        ? rawBody.sessionDate.toISOString()
        : String(rawBody.sessionDate)
    };

    console.log('API processed body:', body);
    console.log('API processed sessionDate type:', typeof body.sessionDate);

    // Validate request data
    const validationResult = createAwarenessSessionSchema.safeParse(body);

    if (!validationResult.success) {
      console.log('Validation failed!');
      console.log('Validation errors:', validationResult.error.issues);
    } else {
      console.log('Validation passed!');
    }
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map(issue => issue.message).join(', ');
      return createGenericErrorNextResponse(`Validation failed: ${errorMessages}`, undefined, 400);
    }

    console.log('Converting sessionDate to Date object...');
    console.log('Original sessionDate:', validationResult.data.sessionDate);

    // Convert string date to Date object for service
    const requestData = {
      ...validationResult.data,
      sessionDate: new Date(validationResult.data.sessionDate),
    };

    console.log('Converted sessionDate:', requestData.sessionDate);
    console.log('Calling service with data:', requestData);

    // Create awareness session request
    const result = await awarenessSessionService.createRequest(sessionResult.userId, requestData);

    // Handle service result
    if (result.success) {
      return createSuccessNextResponse(result.data, 'Awareness session request created successfully', undefined, 201);
    } else {
      return createGenericErrorNextResponse(result.error, result.code as any, 400);
    }

  } catch (error: any) {
    logger.error('Error creating awareness session request:', error);
    return createGenericErrorNextResponse('Failed to create awareness session request', undefined, 500);
  }
}

// GET /api/v1/awareness-sessions - Get user's awareness session requests
async function handleGetUserAwarenessSessions(request: NextRequest) {
  try {
    // Get session from cookies
    const sessionResult = await cookieManager.getSessionFromCookies(request);
    if (!sessionResult) {
      return createGenericErrorNextResponse('Authentication required', undefined, 401);
    }

    if (sessionResult.role !== 'customer') {
      return createGenericErrorNextResponse('Only customers can access their awareness session requests', undefined, 403);
    }

    // Get URL parameters for pagination and filters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);

    const status = url.searchParams.get('status') || undefined;
    const search = (url.searchParams.get('search') || '').trim() || undefined;
    const startDateStr = url.searchParams.get('startDate') || undefined;
    const endDateStr = url.searchParams.get('endDate') || undefined;
    const sessionMode = url.searchParams.get('sessionMode') || undefined;

    let startDate = startDateStr ? new Date(startDateStr) : undefined;
    let endDate = endDateStr ? new Date(endDateStr) : undefined;
    if (startDate && isNaN(startDate.getTime())) startDate = undefined as any;
    if (endDate && isNaN(endDate.getTime())) endDate = undefined as any;

    // Get user's awareness session requests with filters
    const result = await awarenessSessionService.getRequestsByUser(
      sessionResult.userId,
      page,
      limit,
      {
        status: status as any,
        search,
        startDate,
        endDate,
        sessionMode: sessionMode as any,
      }
    );

    // Handle service result
    if (result.success) {
      return createSuccessNextResponse(result.data, 'Awareness session requests fetched successfully');
    } else {
      return createGenericErrorNextResponse(result.error, result.code as any, 400);
    }

  } catch (error: any) {
    logger.error('Error fetching user awareness session requests:', error);
    return createGenericErrorNextResponse('Failed to fetch awareness session requests', undefined, 500);
  }
}

// Create route handlers
const routeHandlers = createRouteHandler(
  {
    allowedMethods: ['GET', 'POST']
  },
  {
    POST: handleCreateAwarenessSession,
    GET: handleGetUserAwarenessSessions
  }
);

export const { GET, POST } = routeHandlers;
