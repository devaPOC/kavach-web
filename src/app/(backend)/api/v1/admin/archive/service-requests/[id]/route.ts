import { NextRequest } from 'next/server';
import { archiveController } from '@/lib/controllers/archive/archive.controller';

async function handleDeleteArchivedRequest(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return archiveController.deleteArchivedRequest(request, id);
}

export {
  handleDeleteArchivedRequest as DELETE
};
