import { NextRequest } from 'next/server';
import { expertController } from '@/lib/controllers/expert/expert.controller';

// Type for route handler context
interface RouteHandlerContext {
  params: Promise<{ id: string }>;
}

async function handleAcceptTask(request: NextRequest, context: RouteHandlerContext) {
  const { id } = await context.params;
  return expertController.acceptTask(request, id);
}

export {
  handleAcceptTask as POST
};
