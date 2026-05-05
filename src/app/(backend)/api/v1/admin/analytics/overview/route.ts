import { NextRequest } from 'next/server';
import { analyticsController } from '@/lib/controllers/awareness-lab/analytics.controller';

async function handleGetOverviewAnalytics(request: NextRequest) {
  return analyticsController.getOverviewAnalytics(request);
}

export {
  handleGetOverviewAnalytics as GET
};