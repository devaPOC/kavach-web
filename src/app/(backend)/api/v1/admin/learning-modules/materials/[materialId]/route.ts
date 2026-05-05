import { NextRequest } from 'next/server';
import { 
  createRouteHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';
import { learningMaterialsController } from '@/lib/controllers/awareness-lab/learning-materials.controller';

async function handleUpdateMaterial(request: NextRequest, context: RouteHandlerContext) {
  const materialId = context.params?.materialId as string;
  return learningMaterialsController.updateMaterial(request, materialId);
}

async function handleDeleteMaterial(request: NextRequest, context: RouteHandlerContext) {
  const materialId = context.params?.materialId as string;
  return learningMaterialsController.deleteMaterial(request, materialId);
}

// Create standardized route handlers
const handlers = createRouteHandler(
  { allowedMethods: ['PUT', 'DELETE'] },
  {
    PUT: handleUpdateMaterial,
    DELETE: handleDeleteMaterial
  }
);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;