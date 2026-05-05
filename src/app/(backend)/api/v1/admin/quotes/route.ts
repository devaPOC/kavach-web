import { NextRequest } from 'next/server';
import { adminController } from '@/lib/controllers/admin/admin.controller';

// GET /api/v1/admin/quotes - Get all quotes with filtering
export async function GET(request: NextRequest) {
  return adminController.getQuotes(request);
}

// POST /api/v1/admin/quotes - Create a new quote
export async function POST(request: NextRequest) {
  return adminController.createQuote(request);
}