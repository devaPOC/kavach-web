import { NextRequest, NextResponse } from 'next/server';
import { 
  createRouteHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';
import { awarenessLabController } from '@/lib/controllers/awareness-lab/awareness-lab.controller';

async function handleValidateQuestion(request: NextRequest, context: RouteHandlerContext) {
  const { params } = context;
  if (!params?.id) {
    return NextResponse.json({ error: 'Question ID is required' }, { status: 400 });
  }
  return awarenessLabController.validateQuestionAnswers(request, params.id);
}

// Create standardized route handlers
const handlers = createRouteHandler(
  { allowedMethods: ['GET'] },
  {
    GET: handleValidateQuestion
  }
);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;