import { NextRequest } from 'next/server';
import { expertController } from '@/lib/controllers/expert/expert.controller';

/**
 * GET /api/v1/expert/dashboard/earnings
 * Get earnings statistics for the authenticated expert
 */
export async function GET(request: NextRequest) {
  return expertController.getEarnings(request);
}
