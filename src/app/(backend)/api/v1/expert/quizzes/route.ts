import { NextRequest, NextResponse } from 'next/server';
import {
  createRouteHandler,
  type RouteHandlerContext
} from '@/lib/api/route-handler';
import { awarenessLabController } from '@/lib/controllers/awareness-lab/awareness-lab.controller';

async function handleGetQuizzes(request: NextRequest, context: RouteHandlerContext) {
  // Redirect expert users to use the unified published quizzes endpoint
  return awarenessLabController.getPublishedQuizzes(request);
}

async function handleCreateQuiz(request: NextRequest, context: RouteHandlerContext) {
  // Expert quiz creation should use admin interface
  return NextResponse.json(
    {
      success: false,
      error: 'This endpoint is deprecated. Expert users should use admin interface for quiz creation.',
      code: 'ENDPOINT_DEPRECATED',
      redirectTo: '/api/v1/admin/quizzes'
    },
    { status: 410 }
  );
}

// Create standardized route handlers with authentication required
const handlers = createRouteHandler(
  {
    allowedMethods: ['GET', 'POST'],
    requireAuth: true
  },
  {
    GET: handleGetQuizzes,
    POST: handleCreateQuiz
  }
);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
