import { NextRequest, NextResponse } from 'next/server';
import { 
  createRouteHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';
import { templateController } from '@/lib/controllers/awareness-lab/template.controller';

async function handleGetTemplate(request: NextRequest, context: RouteHandlerContext) {
  const { params } = context;
  if (!params?.id) {
    return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
  }
  return templateController.getTemplateById(request, params.id);
}

async function handleUpdateTemplate(request: NextRequest, context: RouteHandlerContext) {
  const { params } = context;
  if (!params?.id) {
    return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
  }
  return templateController.updateTemplate(request, params.id);
}

async function handleDeleteTemplate(request: NextRequest, context: RouteHandlerContext) {
  const { params } = context;
  if (!params?.id) {
    return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
  }
  return templateController.deleteTemplate(request, params.id);
}

// Create standardized route handlers
const handlers = createRouteHandler(
  { allowedMethods: ['GET', 'PUT', 'DELETE'] },
  {
    GET: handleGetTemplate,
    PUT: handleUpdateTemplate,
    DELETE: handleDeleteTemplate
  }
);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;