import { NextRequest } from 'next/server';
import { authController } from '@/lib/controllers';
import { 
  createSingleMethodHandler, 
  getRequestBody, 
  createRequestWithData,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';

async function handleCustomerLogin(request: NextRequest, context: RouteHandlerContext) {
  // Extract and validate request body
  const body = await getRequestBody(request);
  
  // Add role parameter for customer login
  const requestWithRole = createRequestWithData(request, {
    ...body,
    role: 'customer'
  });

  // Call the auth controller
  return authController.login(requestWithRole as any);
}

// Create standardized route handlers
const handlers = createSingleMethodHandler('POST', handleCustomerLogin);

export const POST = handlers.POST;
export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
