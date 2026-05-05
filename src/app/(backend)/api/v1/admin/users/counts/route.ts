import { NextRequest } from 'next/server';
import { adminController } from '@/lib/controllers';
import {
	createRouteHandler,
	type RouteHandlerContext
} from '@/lib/api/route-handler';

async function handleGetUserCounts(request: NextRequest, context: RouteHandlerContext) {
	return adminController.getUserCounts(request);
}

// Create standardized route handlers
const handlers = createRouteHandler(
	{ allowedMethods: ['GET'] },
	{
		GET: handleGetUserCounts,
	}
);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
