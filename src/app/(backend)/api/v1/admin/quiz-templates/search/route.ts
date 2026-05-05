import { NextRequest } from 'next/server';
import { 
  createRouteHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';
import { templateController } from '@/lib/controllers/awareness-lab/template.controller';

async function handleSearchTemplates(request: NextRequest, context: RouteHandlerContext) {
  return templateController.searchTemplates(request);
}

// Create standardized route handlers
const handlers = createRouteHandler(
  { allowedMethods: ['GET'] },
  {
    GET: handleSearchTemplates
  }
);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;