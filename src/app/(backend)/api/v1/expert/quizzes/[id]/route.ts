import { NextRequest, NextResponse } from 'next/server';
import {
  createRouteHandler,
  type RouteHandlerContext
} from '@/lib/api/route-handler';
import { awarenessLabController } from '@/lib/controllers/awareness-lab/awareness-lab.controller';

async function handleGetQuiz(request: NextRequest, context: RouteHandlerContext) {
  const { params } = context;
  // Redirect expert users to use the unified quiz endpoint
  return awarenessLabController.getQuizForCustomer(request, params?.id as string);
}

async function handleUpdateQuiz(request: NextRequest, context: RouteHandlerContext) {
  const { params } = context;
  return NextResponse.json(
    {
      success: false,
      error: 'This endpoint is deprecated. Expert users should use admin interface for quiz management.',
      code: 'ENDPOINT_DEPRECATED',
      redirectTo: `/api/v1/admin/quizzes/${params?.id}`
    },
    { status: 410 }
  );
}

async function handleDeleteQuiz(request: NextRequest, context: RouteHandlerContext) {
  const { params } = context;
  return NextResponse.json(
    {
      success: false,
      error: 'This endpoint is deprecated. Expert users should use admin interface for quiz management.',
      code: 'ENDPOINT_DEPRECATED',
      redirectTo: `/api/v1/admin/quizzes/${params?.id}`
    },
    { status: 410 }
  );
}

// Create standardized route handlers with authentication required
const handlers = createRouteHandler(
  {
    allowedMethods: ['GET', 'PUT', 'DELETE'],
    requireAuth: true
  },
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
