import { NextRequest } from 'next/server';

// Type for route handler context
interface RouteHandlerContext {
  params: Promise<{ id: string }>;
}

async function handleCancelServiceRequest(request: NextRequest, context: RouteHandlerContext) {
  const { id: requestId } = await context.params;

  if (!requestId) {
    return Response.json(
      { success: false, error: 'Service request ID is required' },
      { status: 400 }
    );
  }

  try {
    // Get authenticated user from request
    const user = (request as any).user;
    if (!user || user.role !== 'customer') {
      return Response.json(
        { success: false, error: 'Customer access required' },
        { status: 403 }
      );
    }

    // Import database and schema here to avoid dependency issues
    const { db } = await import('@/lib/database');
    const { serviceData } = await import('@/lib/database/schema/service-data');
    const { eq, and } = await import('drizzle-orm');

    // Check if the service request exists and belongs to the user
    const [request_] = await db
      .select()
      .from(serviceData)
      .where(and(
        eq(serviceData.id, requestId),
        eq(serviceData.userId, user.userId)
      ))
      .limit(1);

    if (!request_) {
      return Response.json(
        { success: false, error: 'Service request not found' },
        { status: 404 }
      );
    }

    // Check if request can be cancelled
    const cancellableStatuses = ['pending', 'assigned'];
    if (!cancellableStatuses.includes(request_.status)) {
      return Response.json(
        { success: false, error: 'Request cannot be cancelled in its current state' },
        { status: 400 }
      );
    }

    // Update status to cancelled
    await db
      .update(serviceData)
      .set({
        status: 'cancelled',
        updatedAt: new Date()
      })
      .where(eq(serviceData.id, requestId));

    return Response.json({
      success: true,
      message: 'Service request cancelled successfully'
    });

  } catch (error) {
    console.error('Failed to cancel service request:', error);
    return Response.json(
      {
        success: false,
        error: 'Failed to cancel service request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export {
  handleCancelServiceRequest as POST
};
