import { NextRequest } from 'next/server';
import {
	createRouteHandler,
	type RouteHandlerContext
} from '@/lib/api/route-handler';
import { learningMaterialsController } from '@/lib/controllers/awareness-lab/learning-materials.controller';

async function handleMarkMaterialComplete(request: NextRequest, context: RouteHandlerContext) {
	const moduleId = context.params?.id as string;
	const materialId = context.params?.materialId as string;
	return learningMaterialsController.markMaterialComplete(request, moduleId, materialId);
}

// Create standardized route handlers
const handlers = createRouteHandler(
	{ allowedMethods: ['POST'] },
	{
		POST: handleMarkMaterialComplete
	}
);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
