import { NextRequest } from 'next/server';
import { adminController } from '@/lib/controllers';
import { 
  createRouteHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';

async function handleGetUserProfile(request: NextRequest, context: RouteHandlerContext) {
  const id = context.params?.id;
  if (!id) {
    throw new Error('User ID is required');
  }
  return adminController.getUserProfile(request, id);
}

// Create standardized route handlers
const handlers = createRouteHandler(
  { allowedMethods: ['GET'] },
  {
    GET: handleGetUserProfile
  }
);

export const GET = handlers.GET;