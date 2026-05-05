import { NextRequest } from 'next/server';
import { analyticsController } from '@/lib/controllers/awareness-lab/analytics.controller';

async function handleGetUserDemographics(request: NextRequest) {
  return analyticsController.getUserDemographics(request);
}

export {
  handleGetUserDemographics as GET
};