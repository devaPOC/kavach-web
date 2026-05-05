import { NextRequest } from 'next/server';
import { analyticsController } from '@/lib/controllers/awareness-lab/analytics.controller';

async function handleExportAnalytics(request: NextRequest) {
  return analyticsController.exportAnalytics(request);
}

export {
  handleExportAnalytics as GET
};