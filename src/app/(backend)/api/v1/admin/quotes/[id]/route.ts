import { NextRequest } from 'next/server';
import { adminController } from '@/lib/controllers/admin/admin.controller';

// GET /api/v1/admin/quotes/[id] - Get quote by ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return adminController.getQuoteById(request, id);
}

// PUT /api/v1/admin/quotes/[id] - Update/revise quote
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return adminController.updateQuote(request, id);
}

// DELETE /api/v1/admin/quotes/[id] - Delete quote
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return adminController.deleteQuote(request, id);
}