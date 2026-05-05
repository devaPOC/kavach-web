import { NextRequest } from 'next/server';
import { db } from '@/lib/database';
import { serviceData } from '@/lib/database/schema/service-data';
import { users } from '@/lib/database/schema/users';
import { eq, desc } from 'drizzle-orm';
import { logger } from '@/lib/utils/logger';

async function handleGetCustomerTasks(request: NextRequest) {
  try {
    // Get authenticated user from request
    const user = (request as any).user;
    if (!user || user.role !== 'customer') {
      return Response.json(
        { success: false, error: 'Customer access required' },
        { status: 403 }
      );
    }

    // Get customer tasks with expert information
    const tasks = await db
      .select({
        id: serviceData.id,
        title: serviceData.title,
        serviceType: serviceData.serviceType,
        priority: serviceData.priority,
        status: serviceData.status,
        description: serviceData.description,
        createdAt: serviceData.createdAt,
        assignedAt: serviceData.assignedAt,
        data: serviceData.data,
        expert: {
          firstName: users.firstName,
          lastName: users.lastName
        }
      })
      .from(serviceData)
      .leftJoin(users, eq(serviceData.assignedExpertId, users.id))
      .where(eq(serviceData.userId, user.userId))
      .orderBy(desc(serviceData.createdAt));

    // Format the data
    const formattedTasks = tasks.map(task => {
      // Import the service mapping utility
      const { getServiceNameByType } = require('@/lib/utils/service-mapping');
      const properServiceName = getServiceNameByType(task.serviceType || 'general-consultation');
      
      return {
        id: task.id,
        title: task.title || properServiceName,
        serviceType: task.serviceType,
        priority: task.priority,
        status: task.status,
        description: task.description,
        createdAt: task.createdAt?.toISOString(),
        assignedAt: task.assignedAt?.toISOString(),
        expert: task.expert && task.expert.firstName ? {
          firstName: task.expert.firstName,
          lastName: task.expert.lastName
        } : null,
        data: task.data,
        completionReport: (task.data as any)?.completionReport || null
      };
    });

    logger.info('Customer tasks retrieved', {
      customerId: user.userId,
      taskCount: formattedTasks.length
    });

    return Response.json({
      success: true,
      data: formattedTasks
    });

  } catch (error) {
    logger.error('Failed to get customer tasks', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return Response.json(
      {
        success: false,
        error: 'Failed to retrieve tasks',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export {
  handleGetCustomerTasks as GET
};
