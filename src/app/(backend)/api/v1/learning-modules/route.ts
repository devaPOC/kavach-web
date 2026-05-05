import { NextRequest } from 'next/server';
import { 
  createRouteHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';
import { learningMaterialsController } from '@/lib/controllers/awareness-lab/learning-materials.controller';

async function handleGetPublishedModules(request: NextRequest, context: RouteHandlerContext) {
  return learningMaterialsController.getPublishedModules(request);
}

// Create standardized route handlers
const handlers = createRouteHandler(
  { allowedMethods: ['GET'] },
  {
    GET: handleGetPublishedModules
  }
);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;