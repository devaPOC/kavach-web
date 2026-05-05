import { NextRequest } from 'next/server';
import { adminController } from '@/lib/controllers/admin/admin.controller';

// Type for route handler context
interface RouteHandlerContext {
  params: Promise<{ id: string }>;
}

async function handleAssignExpert(request: NextRequest, context: RouteHandlerContext) {
  const { id } = await context.params;
  return adminController.assignExpertToServiceRequest(request, id);
}

async function handleUpdateServiceRequestStatus(request: NextRequest, context: RouteHandlerContext) {
  const { id } = await context.params;
  return adminController.updateServiceRequestStatus(request, id);
}

async function handleDeleteServiceRequest(request: NextRequest, context: RouteHandlerContext) {
  console.log('=== ROUTE HANDLER CALLED ===');
  const { id } = await context.params;
  console.log('Route: Extracted ID:', id);
  const result = await adminController.deleteServiceRequest(request, id);
  console.log('Route: Controller result:', result);
  return result;
}

export {
  handleAssignExpert as POST,
  handleUpdateServiceRequestStatus as PATCH,
  handleDeleteServiceRequest as DELETE
};
