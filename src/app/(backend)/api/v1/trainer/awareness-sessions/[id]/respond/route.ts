import { NextRequest, NextResponse } from 'next/server';
import { expertController } from '@/lib/controllers/expert/expert.controller';
import { 
  createRouteHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';

async function handleExpertAwarenessSessionResponse(request: NextRequest, context: RouteHandlerContext): Promise<NextResponse> {
  const { params } = context;
  const requestId = params?.id as string;
  
  if (!requestId) {
    return NextResponse.json(
      { error: 'Request ID is required' },
      { status: 400 }
    );
  }

  return expertController.respondToAwarenessSessionRequest(request, requestId);
}

// Create standardized route handlers
const handlers = createRouteHandler(
  { allowedMethods: ['PUT'] },
  {
    PUT: handleExpertAwarenessSessionResponse,
  }
);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;