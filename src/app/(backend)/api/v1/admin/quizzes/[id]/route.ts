import { NextRequest, NextResponse } from 'next/server';
import { 
  createRouteHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';
import { awarenessLabController } from '@/lib/controllers/awareness-lab/awareness-lab.controller';

async function handleGetQuiz(request: NextRequest, context: RouteHandlerContext) {
  const { params } = context;
  if (!params?.id) {
    return NextResponse.json({ error: 'Quiz ID is required' }, { status: 400 });
  }
  return awarenessLabController.getQuizById(request, params.id);
}

async function handleUpdateQuiz(request: NextRequest, context: RouteHandlerContext) {
  const { params } = context;
  if (!params?.id) {
    return NextResponse.json({ error: 'Quiz ID is required' }, { status: 400 });
  }
  return awarenessLabController.updateQuiz(request, params.id);
}

async function handleDeleteQuiz(request: NextRequest, context: RouteHandlerContext) {
  const { params } = context;
  if (!params?.id) {
    return NextResponse.json({ error: 'Quiz ID is required' }, { status: 400 });
  }
  return awarenessLabController.deleteQuiz(request, params.id);
}

// Create standardized route handlers
const handlers = createRouteHandler(
  { allowedMethods: ['GET', 'PUT', 'DELETE'] },
  {
    GET: handleGetQuiz,
    PUT: handleUpdateQuiz,
    DELETE: handleDeleteQuiz
  }
);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;