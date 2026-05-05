import { NextRequest } from 'next/server';
import { authController } from '@/lib/controllers';
import { 
  createSingleMethodHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';

async function handleResendVerification(request: NextRequest, context: RouteHandlerContext) {
  return authController.resendVerificationEmail(request);
}

// Create standardized route handlers
const handlers = createSingleMethodHandler('POST', handleResendVerification);

export const POST = handlers.POST;
export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
