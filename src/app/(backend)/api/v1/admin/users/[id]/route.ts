import { NextRequest } from 'next/server';
import { adminController } from '@/lib/controllers';
import { 
  createRouteHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';

async function handleGetUserById(request: NextRequest, context: RouteHandlerContext) {
  const id = context.params?.id;
  if (!id) {
    throw new Error('User ID is required');
  }
  return adminController.getUserById(request, id);
}

async function handleUpdateUserById(request: NextRequest, context: RouteHandlerContext) {
  const id = context.params?.id;
  if (!id) {
    throw new Error('User ID is required');
  }
  return adminController.updateUserById(request, id);
}

async function handleDeleteUserById(request: NextRequest, context: RouteHandlerContext) {
  const id = context.params?.id;
  if (!id) {
    throw new Error('User ID is required');
  }
  return adminController.deleteUserById(request, id);
}

// Create standardized route handlers
const handlers = createRouteHandler(
  { allowedMethods: ['GET', 'PUT', 'DELETE'] },
  {
    GET: handleGetUserById,
    PUT: handleUpdateUserById,
    DELETE: handleDeleteUserById
  }
);

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
export const POST = handlers.POST;
