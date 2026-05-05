import { NextRequest } from 'next/server';
import { expertController } from '@/lib/controllers/expert/expert.controller';
import { 
  createRouteHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';

async function handleGetExpertAwarenessSessionRequests(request: NextRequest, context: RouteHandlerContext) {
  return expertController.getAwarenessSessionRequests(request);
}

// Create standardized route handlers
const handlers = createRouteHandler(
  { allowedMethods: ['GET'] },
  {
    GET: handleGetExpertAwarenessSessionRequests,
  }
);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;