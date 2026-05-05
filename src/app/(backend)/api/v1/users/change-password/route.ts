import { NextRequest } from 'next/server';
import { userController } from '@/lib/controllers';
import { 
  createSingleMethodHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';

async function handleChangePassword(request: NextRequest, context: RouteHandlerContext) {
  return userController.changePassword(request);
}

// Create standardized route handlers
const handlers = createSingleMethodHandler('POST', handleChangePassword);

export const POST = handlers.POST;
export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
