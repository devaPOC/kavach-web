import { NextRequest } from 'next/server';
import { expertController } from '@/lib/controllers/expert/expert.controller';

async function handleGetDashboardStats(request: NextRequest) {
  return expertController.getDashboardStats(request);
}

export {
  handleGetDashboardStats as GET
};
