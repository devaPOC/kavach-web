import { NextRequest, NextResponse } from 'next/server';
import {
  createRouteHandler,
  type RouteHandlerContext
} from '@/lib/api/route-handler';
import { learningMaterialsController } from '@/lib/controllers/awareness-lab/learning-materials.controller';

async function handleGetModule(request: NextRequest, context: RouteHandlerContext) {
  const { params } = context;
  // Redirect expert users to use the unified module endpoint
  return learningMaterialsController.getModuleForCustomer(request, params?.id as string);
}

async function handleUpdateModule(request: NextRequest, context: RouteHandlerContext) {
  const { params } = context;
  return NextResponse.json(
    {
      success: false,
      error: 'This endpoint is deprecated. Expert users should use admin interface for learning module management.',
      code: 'ENDPOINT_DEPRECATED',
      redirectTo: `/api/v1/admin/learning-modules/${params?.id}`
    },
    { status: 410 }
  );
}

async function handleDeleteModule(request: NextRequest, context: RouteHandlerContext) {
  const { params } = context;
  return NextResponse.json(
    {
      success: false,
      error: 'This endpoint is deprecated. Expert users should use admin interface for learning module management.',
      code: 'ENDPOINT_DEPRECATED',
      redirectTo: `/api/v1/admin/learning-modules/${params?.id}`
    },
    { status: 410 }
  );
}

// Create standardized route handlers with authentication required
const handlers = createRouteHandler(
  {
    allowedMethods: ['GET', 'PUT', 'DELETE'],
    requireAuth: true
  },
  {
    GET: handleGetModule,
    PUT: handleUpdateModule,
    DELETE: handleDeleteModule
  }
);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
