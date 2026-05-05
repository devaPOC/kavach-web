import { NextRequest } from 'next/server';
import { expertController } from '@/lib/controllers/expert/expert.controller';

// Type for route handler context
interface RouteHandlerContext {
  params: Promise<{ id: string }>;
}

async function handleRequestClosure(request: NextRequest, context: RouteHandlerContext) {
  const { id } = await context.params;
  return expertController.requestClosure(request, id);
}

export {
  handleRequestClosure as POST
};
