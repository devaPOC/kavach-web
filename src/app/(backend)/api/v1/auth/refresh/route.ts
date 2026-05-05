import { NextRequest } from 'next/server';
import { authController } from '@/lib/controllers';
import { 
  createSingleMethodHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';

async function handleRefreshToken(request: NextRequest, context: RouteHandlerContext) {
  return authController.refreshToken(request);
}

// Create standardized route handlers
const handlers = createSingleMethodHandler('POST', handleRefreshToken);

export const POST = handlers.POST;
export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
