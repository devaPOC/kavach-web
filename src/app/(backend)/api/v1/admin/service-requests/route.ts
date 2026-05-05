import { NextRequest } from 'next/server';
import { adminController } from '@/lib/controllers/admin/admin.controller';

async function handleGetServiceRequests(request: NextRequest) {
  return adminController.getServiceRequests(request);
}

export {
  handleGetServiceRequests as GET
};
