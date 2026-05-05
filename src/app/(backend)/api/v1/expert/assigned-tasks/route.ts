import { NextRequest } from 'next/server';
import { expertController } from '@/lib/controllers/expert/expert.controller';

async function handleGetAssignedTasks(request: NextRequest) {
  return expertController.getAssignedTasks(request);
}

export {
  handleGetAssignedTasks as GET
};
