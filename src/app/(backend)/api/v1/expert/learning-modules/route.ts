import { NextRequest, NextResponse } from 'next/server';
import {
  createRouteHandler,
  type RouteHandlerContext
} from '@/lib/api/route-handler';
import { learningMaterialsController } from '@/lib/controllers/awareness-lab/learning-materials.controller';

async function handleGetLearningModules(request: NextRequest, context: RouteHandlerContext) {
  // Redirect expert users to use the unified published modules endpoint
  return learningMaterialsController.getPublishedModules(request);
}

async function handleCreateLearningModule(request: NextRequest, context: RouteHandlerContext) {
  return NextResponse.json(
    {
      success: false,
      error: 'This endpoint is deprecated. Expert users should use admin interface for learning module creation.',
      code: 'ENDPOINT_DEPRECATED',
      redirectTo: '/api/v1/admin/learning-modules'
    },
    { status: 410 }
  );
}

// Create standardized route handlers with authentication required
const handlers = createRouteHandler(
  {
    allowedMethods: ['GET', 'POST'],
    requireAuth: true
  },
  {
    GET: handleGetLearningModules,
    POST: handleCreateLearningModule
  }
);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
