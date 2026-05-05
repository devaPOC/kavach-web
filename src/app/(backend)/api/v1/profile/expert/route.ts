import { NextRequest } from 'next/server';
import { ProfileController } from '@/lib/controllers/profile';
import { 
  createRouteHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';

async function handleCreateExpertProfile(request: NextRequest, context: RouteHandlerContext) {
  return ProfileController.createExpertProfile(request as any);
}

async function handleUpdateExpertProfile(request: NextRequest, context: RouteHandlerContext) {
  return ProfileController.updateExpertProfile(request as any);
}

// Create standardized route handlers
const handlers = createRouteHandler(
  { allowedMethods: ['POST', 'PUT'] },
  {
    POST: handleCreateExpertProfile,
    PUT: handleUpdateExpertProfile
  }
);

export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const GET = handlers.GET;
export const DELETE = handlers.DELETE;
