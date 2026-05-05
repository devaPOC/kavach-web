import { NextRequest } from 'next/server';

// Type for route handler context
interface RouteHandlerContext {
  params: Promise<{ id: string }>;
}

async function handleReassignTask(request: NextRequest, context: RouteHandlerContext) {
  const { id: taskId } = await context.params;

  if (!taskId) {
    return Response.json(
      { success: false, error: 'Task ID is required' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { expertId, note } = body;

    if (!expertId) {
      return Response.json(
        { success: false, error: 'Expert ID is required' },
        { status: 400 }
      );
    }

    // Get authenticated user from request
    const user = (request as any).user;
    if (!user || user.role !== 'admin') {
      return Response.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Import database and schema
    const { db } = await import('@/lib/database');
    const { serviceData } = await import('@/lib/database/schema/service-data');
    const { users } = await import('@/lib/database/schema/users');
    const { eq, and } = await import('drizzle-orm');

    // Check if the task exists and is in pending state
    const [task] = await db
      .select({
        id: serviceData.id,
        title: serviceData.title,
        status: serviceData.status,
        userId: serviceData.userId,
      })
      .from(serviceData)
      .where(eq(serviceData.id, taskId))
      .limit(1);

    if (!task) {
      return Response.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    if (task.status !== 'pending' && task.status !== 'rejected') {
      return Response.json(
        { success: false, error: 'Task can only be reassigned when pending or rejected' },
        { status: 400 }
      );
    }

    // Check if the expert exists and is approved
    const [expert] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        isApproved: users.isApproved,
      })
      .from(users)
      .where(and(
        eq(users.id, expertId),
        eq(users.role, 'expert'),
        eq(users.isApproved, true)
      ))
      .limit(1);

    if (!expert) {
      return Response.json(
        { success: false, error: 'Expert not found or not approved' },
        { status: 404 }
      );
    }

    // Assign the task to the expert
    await db
      .update(serviceData)
      .set({
        assignedExpertId: expertId,
        status: 'assigned',
        assignedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(serviceData.id, taskId));

    // Send notification to expert (you can import email service if needed)
    console.log(`Task ${taskId} reassigned to expert ${expertId} by admin ${user.userId}`);

    // If there's a note, you might want to store it or send it with the notification
    if (note) {
      console.log(`Reassignment note: ${note}`);
    }

    return Response.json({
      success: true,
      message: 'Task reassigned successfully',
      data: {
        taskId,
        expertId,
        expertName: `${expert.firstName} ${expert.lastName}`,
        note
      }
    });

  } catch (error) {
    console.error('Failed to reassign task:', error);
    return Response.json(
      {
        success: false,
        error: 'Failed to reassign task',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export {
  handleReassignTask as POST
};
