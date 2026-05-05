import { NextRequest, NextResponse } from 'next/server';
import { adminController } from '@/lib/controllers/admin/admin.controller';

// GET /api/admin/experts - Get list of experts
export async function GET(request: NextRequest) {
  return await adminController.getExpertList(request);
}
