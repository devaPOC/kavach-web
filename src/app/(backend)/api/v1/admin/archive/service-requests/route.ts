import { NextRequest } from 'next/server';
import { archiveController } from '@/lib/controllers/archive/archive.controller';

async function handleGetArchivedRequests(request: NextRequest) {
  return archiveController.getArchivedServiceRequests(request);
}

async function handleArchiveCompletedRequests(request: NextRequest) {
  return archiveController.archiveCompletedRequests(request);
}

export {
  handleGetArchivedRequests as GET,
  handleArchiveCompletedRequests as POST
};
