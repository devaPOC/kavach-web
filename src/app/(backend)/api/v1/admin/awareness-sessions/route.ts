import { NextRequest } from 'next/server';
import { adminController } from '@/lib/controllers';
import { 
  createRouteHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';

async function handleGetAwarenessSessionRequests(request: NextRequest, context: RouteHandlerContext) {
  return adminController.getAwarenessSessionRequests(request);
}

// Create standardized route handlers
const handlers = createRouteHandler(
  { allowedMethods: ['GET'] },
  {
    GET: handleGetAwarenessSessionRequests,
  }
);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;