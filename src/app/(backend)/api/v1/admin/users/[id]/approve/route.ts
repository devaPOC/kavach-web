import { NextRequest } from 'next/server';
import { adminController } from '@/lib/controllers';
import { 
  createRouteHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';

async function handleApproveExpert(request: NextRequest, context: RouteHandlerContext) {
  const id = context.params?.id;
  if (!id) {
    throw new Error('User ID is required');
  }
  return adminController.approveExpert(request, id);
}

async function handleRejectExpert(request: NextRequest, context: RouteHandlerContext) {
  const id = context.params?.id;
  if (!id) {
    throw new Error('User ID is required');
  }
  return adminController.rejectExpert(request, id);
}

// Create standardized route handlers
const handlers = createRouteHandler(
  { allowedMethods: ['POST', 'DELETE'] },
  {
    POST: handleApproveExpert,
    DELETE: handleRejectExpert
  }
);

export const POST = handlers.POST;
export const DELETE = handlers.DELETE;
export const GET = handlers.GET;
export const PUT = handlers.PUT;