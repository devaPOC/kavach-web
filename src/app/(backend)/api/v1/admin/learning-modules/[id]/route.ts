import { NextRequest } from 'next/server';
import { 
  createRouteHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';
import { learningMaterialsController } from '@/lib/controllers/awareness-lab/learning-materials.controller';

async function handleGetModule(request: NextRequest, context: RouteHandlerContext) {
  const moduleId = context.params?.id as string;
  return learningMaterialsController.getModuleById(request, moduleId);
}

async function handleUpdateModule(request: NextRequest, context: RouteHandlerContext) {
  const moduleId = context.params?.id as string;
  return learningMaterialsController.updateModule(request, moduleId);
}

async function handleDeleteModule(request: NextRequest, context: RouteHandlerContext) {
  const moduleId = context.params?.id as string;
  return learningMaterialsController.deleteModule(request, moduleId);
}

// Create standardized route handlers
const handlers = createRouteHandler(
  { allowedMethods: ['GET', 'PUT', 'DELETE'] },
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