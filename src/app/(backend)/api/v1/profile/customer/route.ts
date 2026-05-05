import { NextRequest } from 'next/server';
import { ProfileController } from '@/lib/controllers/profile';
import { 
  createRouteHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';

async function handleCreateCustomerProfile(request: NextRequest, context: RouteHandlerContext) {
  return ProfileController.createCustomerProfile(request as any);
}

async function handleUpdateCustomerProfile(request: NextRequest, context: RouteHandlerContext) {
  return ProfileController.updateCustomerProfile(request as any);
}

// Create standardized route handlers
const handlers = createRouteHandler(
  { allowedMethods: ['POST', 'PUT'] },
  {
    POST: handleCreateCustomerProfile,
    PUT: handleUpdateCustomerProfile
  }
);

export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const GET = handlers.GET;
export const DELETE = handlers.DELETE;
