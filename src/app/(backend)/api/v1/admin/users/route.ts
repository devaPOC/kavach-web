import { NextRequest } from 'next/server';
import { adminController } from '@/lib/controllers';
import { 
  createRouteHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';

async function handleGetUsers(request: NextRequest, context: RouteHandlerContext) {
  return adminController.getUsers(request);
}

async function handleCreateUser(request: NextRequest, context: RouteHandlerContext) {
  return adminController.createUser(request);
}

// Create standardized route handlers
const handlers = createRouteHandler(
  { allowedMethods: ['GET', 'POST'] },
  {
    GET: handleGetUsers,
    POST: handleCreateUser
  }
);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
