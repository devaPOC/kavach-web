import { NextRequest } from 'next/server';
import {
	createRouteHandler,
	type RouteHandlerContext
} from '@/lib/api/route-handler';
import { learningMaterialsController } from '@/lib/controllers/awareness-lab/learning-materials.controller';

async function handleGetGlobalProgress(request: NextRequest, context: RouteHandlerContext) {
	return learningMaterialsController.getGlobalProgress(request);
}

// Create standardized route handlers
const handlers = createRouteHandler(
	{ allowedMethods: ['GET'] },
	{
		GET: handleGetGlobalProgress
	}
);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
