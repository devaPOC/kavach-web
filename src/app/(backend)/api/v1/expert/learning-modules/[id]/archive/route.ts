import { NextRequest, NextResponse } from 'next/server';
import {
  createRouteHandler,
  type RouteHandlerContext
} from '@/lib/api/route-handler';

async function handleArchive(request: NextRequest, context: RouteHandlerContext) {
  const { params } = context;
  return NextResponse.json(
    {
      success: false,
      error: 'This endpoint is deprecated. Expert users should use admin interface for learning module management.',
      code: 'ENDPOINT_DEPRECATED',
      redirectTo: `/api/v1/admin/learning-modules/${params?.id}/archive`
    },
    { status: 410 }
  );
}

// Create standardized route handlers with authentication required
const handlers = createRouteHandler(
  {
    allowedMethods: ['POST'],
    requireAuth: true
  },
  {
    POST: handleArchive
  }
);

export const POST = handlers.POST;
