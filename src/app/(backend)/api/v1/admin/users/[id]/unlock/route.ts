import { NextRequest } from 'next/server';
import { authController } from '@/lib/controllers';
import {
  createRouteHandler,
  type RouteHandlerContext
} from '@/lib/api/route-handler';

async function handleUnlockAccount(request: NextRequest, context: RouteHandlerContext) {
  const id = context.params?.id;
  if (!id) {
    throw new Error('User ID is required');
  }
  return authController.unlockAccount(request, id);
}

// Create standardized route handlers
const handlers = createRouteHandler(
  { allowedMethods: ['POST'] },
  {
    POST: handleUnlockAccount
  }
);

export const { POST } = handlers;
