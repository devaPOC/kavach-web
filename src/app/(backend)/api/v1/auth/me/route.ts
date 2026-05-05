import { NextRequest } from 'next/server';
import { userController } from '@/lib/controllers';
import { 
  createSingleMethodHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';

async function handleGetMe(request: NextRequest, context: RouteHandlerContext) {
  return userController.getProfile(request);
}

// Create standardized route handlers
const handlers = createSingleMethodHandler('GET', handleGetMe);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
