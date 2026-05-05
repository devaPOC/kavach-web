import { NextRequest } from 'next/server';
import { analyticsController } from '@/lib/controllers/awareness-lab/analytics.controller';

async function handleGetQuizAttempts(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  return analyticsController.getQuizAttempts(request, params.id);
}

export {
  handleGetQuizAttempts as GET
};