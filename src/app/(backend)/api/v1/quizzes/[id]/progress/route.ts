import { NextRequest, NextResponse } from 'next/server';
import { 
  createRouteHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';
import { awarenessLabController } from '@/lib/controllers/awareness-lab/awareness-lab.controller';

async function handleGetQuizProgress(request: NextRequest, context: RouteHandlerContext) {
  const { params } = context;
  if (!params?.id) {
    return NextResponse.json({ error: 'Quiz ID is required' }, { status: 400 });
  }
  return awarenessLabController.getUserQuizProgress(request, params.id);
}

// Create standardized route handlers
const handlers = createRouteHandler(
  { allowedMethods: ['GET'] },
  {
    GET: handleGetQuizProgress
  }
);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;