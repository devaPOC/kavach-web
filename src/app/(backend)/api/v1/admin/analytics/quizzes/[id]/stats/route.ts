import { NextRequest } from 'next/server';
import { analyticsController } from '@/lib/controllers/awareness-lab/analytics.controller';

async function handleGetQuizStats(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  return analyticsController.getQuizStats(request, params.id);
}

export {
  handleGetQuizStats as GET
};