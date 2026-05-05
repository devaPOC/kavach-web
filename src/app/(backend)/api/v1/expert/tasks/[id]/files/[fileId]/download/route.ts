import { NextRequest, NextResponse } from 'next/server';
import { expertService } from '@/lib/services/expert/expert.service';
import { logger } from '@/lib/utils/logger';

// Type for route handler context
interface RouteHandlerContext {
  params: Promise<{ id: string; fileId: string }>;
}

async function handleFileDownload(request: NextRequest, context: RouteHandlerContext) {
  const { id: taskId, fileId } = await context.params;

  if (!taskId || !fileId) {
    return NextResponse.json(
      { success: false, error: 'Task ID and File ID are required' },
      { status: 400 }
    );
  }

  try {
    // Get authenticated user from request
    const user = (request as any).user;
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the file from the expert service
    const result = await expertService.downloadCompletionFile(taskId, fileId, user.userId, user.role);

    if (!result.success) {
      return NextResponse.json(result, { status: result.error === 'File not found' ? 404 : 403 });
    }

    const { fileBuffer, filename, mimeType } = result.data;

    logger.info('File downloaded', {
      taskId,
      fileId,
      userId: user.userId,
      userRole: user.role,
      filename
    });

    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });

  } catch (error) {
    logger.error('Failed to download file', {
      taskId,
      fileId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to download file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export {
  handleFileDownload as GET
};
