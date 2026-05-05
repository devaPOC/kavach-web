import { NextRequest } from 'next/server';
import { archiveController } from '@/lib/controllers/archive/archive.controller';

async function handleGetArchiveStats(request: NextRequest) {
  return archiveController.getArchiveStats(request);
}

export {
  handleGetArchiveStats as GET
};
