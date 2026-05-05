import { NextRequest } from 'next/server';
import { customerController } from '@/lib/controllers/customer/customer.controller';

// Type for route handler context
interface RouteHandlerContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteHandlerContext) {
  const { id: taskId } = await context.params;
  return await customerController.closeTask(request, taskId);
}
