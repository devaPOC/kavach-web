import { NextRequest } from 'next/server';
import { adminController } from '@/lib/controllers';
import { 
  createSingleMethodHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';

async function handleAdminLogin(request: NextRequest, context: RouteHandlerContext) {
  return adminController.login(request);
}

// Create standardized route handlers
const handlers = createSingleMethodHandler('POST', handleAdminLogin);

export const POST = handlers.POST;
export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
