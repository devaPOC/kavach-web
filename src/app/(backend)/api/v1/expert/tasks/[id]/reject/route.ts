import { NextRequest } from 'next/server';
import { expertController } from '@/lib/controllers/expert/expert.controller';

// Type for route handler context
interface RouteHandlerContext {
  params: Promise<{ id: string }>;
}

async function handleRejectTask(request: NextRequest, context: RouteHandlerContext) {
  const { id } = await context.params;
  return expertController.rejectTask(request, id);
}

export {
  handleRejectTask as POST
};
