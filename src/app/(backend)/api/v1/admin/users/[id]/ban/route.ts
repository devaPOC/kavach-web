import { NextRequest } from 'next/server';
import { adminController } from '@/lib/controllers';
import { 
  createRouteHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';

async function handleBanExpert(request: NextRequest, context: RouteHandlerContext) {
  const id = context.params?.id;
  if (!id) {
    throw new Error('User ID is required');
  }
  return adminController.banExpert(request, id);
}

async function handleUnbanExpert(request: NextRequest, context: RouteHandlerContext) {
  const id = context.params?.id;
  if (!id) {
    throw new Error('User ID is required');
  }
  return adminController.unbanExpert(request, id);
}

// Create standardized route handlers
const handlers = createRouteHandler(
  { allowedMethods: ['POST', 'DELETE'] },
  {
    POST: handleBanExpert,
    DELETE: handleUnbanExpert
  }
);

export const POST = handlers.POST;
export const DELETE = handlers.DELETE;
export const GET = handlers.GET;
export const PUT = handlers.PUT;
