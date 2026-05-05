import { NextRequest, NextResponse } from 'next/server';
import {
  createRouteHandler,
  type RouteHandlerContext
} from '@/lib/api/route-handler';

async function handleCanDelete(request: NextRequest, context: RouteHandlerContext) {
  const { params } = context;
  return NextResponse.json(
    {
      success: false,
      error: 'This endpoint is deprecated. Expert users should use admin interface for quiz management.',
      code: 'ENDPOINT_DEPRECATED',
      redirectTo: `/api/v1/admin/quizzes/${params?.id}/can-delete`
    },
    { status: 410 }
  );
}

// Create standardized route handlers with authentication required
const handlers = createRouteHandler(
  {
    allowedMethods: ['GET'],
    requireAuth: true
  },
  {
    GET: handleCanDelete
  }
);

export const GET = handlers.GET;
