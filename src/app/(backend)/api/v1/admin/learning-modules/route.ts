import { NextRequest } from 'next/server';
import { 
  createRouteHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';
import { learningMaterialsController } from '@/lib/controllers/awareness-lab/learning-materials.controller';

async function handleGetModules(request: NextRequest, context: RouteHandlerContext) {
  return learningMaterialsController.getModules(request);
}

async function handleCreateModule(request: NextRequest, context: RouteHandlerContext) {
  return learningMaterialsController.createModule(request);
}

// Create standardized route handlers
const handlers = createRouteHandler(
  { allowedMethods: ['GET', 'POST'] },
  {
    GET: handleGetModules,
    POST: handleCreateModule
  }
);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;