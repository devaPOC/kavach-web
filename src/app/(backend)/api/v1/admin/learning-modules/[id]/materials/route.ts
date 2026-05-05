import { NextRequest } from 'next/server';
import { 
  createRouteHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';
import { learningMaterialsController } from '@/lib/controllers/awareness-lab/learning-materials.controller';

async function handleAddMaterial(request: NextRequest, context: RouteHandlerContext) {
  const moduleId = context.params?.id as string;
  return learningMaterialsController.addMaterial(request, moduleId);
}

// Create standardized route handlers
const handlers = createRouteHandler(
  { allowedMethods: ['POST'] },
  {
    POST: handleAddMaterial
  }
);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;