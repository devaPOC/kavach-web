import { NextRequest, NextResponse } from 'next/server';
import { adminController } from '@/lib/controllers';
import { 
  createRouteHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';

async function handleAssignExpertToAwarenessSession(request: NextRequest, context: RouteHandlerContext): Promise<NextResponse> {
  const { params } = context;
  const requestId = params?.id as string;
  
  if (!requestId) {
    return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
  }

  return adminController.assignExpertToAwarenessSession(request, requestId);
}

// Create standardized route handlers
const handlers = createRouteHandler(
  { allowedMethods: ['PUT'] },
  {
    PUT: handleAssignExpertToAwarenessSession,
  }
);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;