import { NextRequest } from 'next/server';
import { expertController } from '@/lib/controllers/expert/expert.controller';

async function handleGetDashboardActivity(request: NextRequest) {
  return expertController.getDashboardActivity(request);
}

export {
  handleGetDashboardActivity as GET
};
