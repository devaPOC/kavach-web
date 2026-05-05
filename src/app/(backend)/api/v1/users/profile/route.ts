import { NextRequest } from 'next/server';
import { userController } from '@/lib/controllers';
import { 
  createRouteHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';

async function handleGetUserProfile(request: NextRequest, context: RouteHandlerContext) {
  return userController.getProfile(request);
}

async function handleUpdateUserProfile(request: NextRequest, context: RouteHandlerContext) {
  return userController.updateProfile(request);
}

// Create standardized route handlers
const handlers = createRouteHandler(
  { allowedMethods: ['GET', 'PUT'] },
  {
    GET: handleGetUserProfile,
    PUT: handleUpdateUserProfile
  }
);

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const POST = handlers.POST;
export const DELETE = handlers.DELETE;
