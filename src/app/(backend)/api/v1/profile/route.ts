import { NextRequest } from 'next/server';
import { ProfileController } from '@/lib/controllers/profile';
import { 
  createSingleMethodHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';

async function handleGetProfile(request: NextRequest, context: RouteHandlerContext) {
  return ProfileController.getProfile(request as any);
}

// Create standardized route handlers
const handlers = createSingleMethodHandler('GET', handleGetProfile);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
