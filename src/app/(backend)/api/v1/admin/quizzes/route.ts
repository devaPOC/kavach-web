import { NextRequest } from 'next/server';
import { 
  createRouteHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';
import { awarenessLabController } from '@/lib/controllers/awareness-lab/awareness-lab.controller';

async function handleGetQuizzes(request: NextRequest, context: RouteHandlerContext) {
  return awarenessLabController.getQuizzesForAdmin(request);
}

async function handleCreateQuiz(request: NextRequest, context: RouteHandlerContext) {
  return awarenessLabController.createQuiz(request);
}

// Create standardized route handlers
const handlers = createRouteHandler(
  { allowedMethods: ['GET', 'POST'] },
  {
    GET: handleGetQuizzes,
    POST: handleCreateQuiz
  }
);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;