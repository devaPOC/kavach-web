import { NextRequest } from 'next/server';
import { adminController } from '@/lib/controllers/admin/admin.controller';

// PUT /api/v1/admin/service-requests/[id]/status - Update service request status
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return adminController.updateServiceRequestStatus(request, id);
}