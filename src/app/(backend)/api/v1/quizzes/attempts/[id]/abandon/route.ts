import { NextRequest, NextResponse } from 'next/server';
import {
	createRouteHandler,
	type RouteHandlerContext
} from '@/lib/api/route-handler';
import { awarenessLabController } from '@/lib/controllers/awareness-lab/awareness-lab.controller';

async function handleAbandonQuizAttempt(request: NextRequest, context: RouteHandlerContext) {
	const { params } = context;
	if (!params?.id) {
		return NextResponse.json({ error: 'Attempt ID is required' }, { status: 400 });
	}
	return awarenessLabController.abandonQuizAttempt(request, params.id);
}

// Create standardized route handlers
const handlers = createRouteHandler(
	{ allowedMethods: ['DELETE'] },
	{
		DELETE: handleAbandonQuizAttempt
	}
);

export const DELETE = handlers.DELETE;
