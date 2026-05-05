import { NextRequest } from 'next/server';
import { authController } from '@/lib/controllers';
import { 
  createSingleMethodHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';

async function handleCheckEmail(request: NextRequest, context: RouteHandlerContext) {
  return authController.checkEmailAvailability(request);
}

// Create standardized route handlers
const handlers = createSingleMethodHandler('POST', handleCheckEmail);

export const POST = handlers.POST;
export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
