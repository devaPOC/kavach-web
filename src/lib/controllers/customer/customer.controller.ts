import { NextRequest, NextResponse } from 'next/server';
import { BaseController } from '../auth/auth.controller';
import { createSuccessNextResponse, createGenericErrorNextResponse } from '@/lib/errors/response-utils';
import { AuthenticationError } from '@/lib/errors/custom-errors';
import { cookieManager } from '@/lib/auth/unified-session-manager';
import { db } from '@/lib/database';
import { serviceData } from '@/lib/database/schema/service-data';
import { users } from '@/lib/database/schema/users';
import { eq, desc, and } from 'drizzle-orm';
import { logger } from '@/lib/utils/logger';
import { getServiceNameByType } from '@/lib/utils/service-mapping';

export class CustomerController extends BaseController {

  // Get customer's service requests
  async getCustomerServiceRequests(request: NextRequest): Promise<NextResponse> {
    try {
      const context = this.createRequestContext(request);

      // Get session from cookies
      const sessionResult = await cookieManager.getSessionFromCookies(request);
      if (!sessionResult) {
        return createGenericErrorNextResponse('Authentication required', undefined, 401, context.correlationId);
      }

      if (sessionResult.role !== 'customer') {
        return createGenericErrorNextResponse('Only customers can access this endpoint', undefined, 403, context.correlationId);
      }

      // Get URL parameters for filtering and pagination
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);
      const status = url.searchParams.get('status');
      const priority = url.searchParams.get('priority');
      const offset = (page - 1) * limit;

      // Build query conditions
      let whereConditions = [eq(serviceData.userId, sessionResult.userId)];

      if (status && status !== 'all') {
        whereConditions.push(eq(serviceData.status, status as any));
      }

      if (priority && priority !== 'all') {
        whereConditions.push(eq(serviceData.priority, priority as any));
      }

      // Fetch service requests with expert information
      const serviceRequests = await db
        .select({
          id: serviceData.id,
          userId: serviceData.userId,
          serviceType: serviceData.serviceType,
          status: serviceData.status,
          priority: serviceData.priority,
          title: serviceData.title,
          description: serviceData.description,
          assignedExpertId: serviceData.assignedExpertId,
          createdAt: serviceData.createdAt,
          updatedAt: serviceData.updatedAt,
          assignedAt: serviceData.assignedAt,
          completedAt: serviceData.completedAt,
          data: serviceData.data,
          // Expert details
          expertFirstName: users.firstName,
          expertLastName: users.lastName,
        })
        .from(serviceData)
        .leftJoin(users, eq(serviceData.assignedExpertId, users.id))
        .where(and(...whereConditions))
        .orderBy(desc(serviceData.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const totalCountResult = await db
        .select({ count: serviceData.id })
        .from(serviceData)
        .where(and(...whereConditions));

      const totalCount = totalCountResult.length;
      const totalPages = Math.ceil(totalCount / limit);

      // Transform the data
      const transformedRequests = serviceRequests.map(request => {
        // Get the proper service name based on service type
        const properServiceName = getServiceNameByType(request.serviceType || 'general-consultation');

        return {
          id: request.id,
          serviceType: request.serviceType,
          status: request.status,
          priority: request.priority || 'normal',
          title: request.title || properServiceName,
          description: request.description,
          assignedExpertId: request.assignedExpertId,
          expertName: request.expertFirstName && request.expertLastName
            ? `${request.expertFirstName} ${request.expertLastName}`
            : null,
          createdAt: request.createdAt.toISOString(),
          assignedAt: request.assignedAt?.toISOString(),
          completedAt: request.completedAt?.toISOString(),
          data: request.data || {},
          completionReport: (request.data as any)?.completionReport || null
        };
      });

      return createSuccessNextResponse({
        requests: transformedRequests,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }, 'Service requests fetched successfully', context.correlationId);

    } catch (error: any) {
      logger.error('Error fetching customer service requests:', error);
      const context = this.createRequestContext(request);
      return createGenericErrorNextResponse('Failed to fetch service requests', undefined, 500, context.correlationId);
    }
  }

  // Close a task (customer approval)
  async closeTask(request: NextRequest, taskId: string): Promise<NextResponse> {
    try {
      const context = this.createRequestContext(request);

      // Get session from cookies
      const sessionResult = await cookieManager.getSessionFromCookies(request);
      if (!sessionResult) {
        return createGenericErrorNextResponse('Authentication required', undefined, 401, context.correlationId);
      }

      if (sessionResult.role !== 'customer') {
        return createGenericErrorNextResponse('Only customers can close their tasks', undefined, 403, context.correlationId);
      }

      if (!taskId) {
        return createGenericErrorNextResponse('Task ID is required', undefined, 400, context.correlationId);
      }

      // Verify the task exists and belongs to the customer
      const task = await db
        .select()
        .from(serviceData)
        .where(and(
          eq(serviceData.id, taskId),
          eq(serviceData.userId, sessionResult.userId)
        ))
        .limit(1);

      if (!task.length) {
        return createGenericErrorNextResponse('Task not found or access denied', undefined, 404, context.correlationId);
      }

      if (task[0].status !== 'pending_closure') {
        return createGenericErrorNextResponse('Task cannot be closed in current status', undefined, 400, context.correlationId);
      }

      // Update task status to 'closed'
      await db
        .update(serviceData)
        .set({
          status: 'closed',
          completedAt: new Date()
        })
        .where(eq(serviceData.id, taskId));

      logger.info('Task closed by customer', {
        taskId,
        customerId: sessionResult.userId,
        correlationId: context.correlationId
      });

      return createSuccessNextResponse(
        { taskId, status: 'closed' },
        'Task closed successfully',
        context.correlationId
      );

    } catch (error: any) {
      logger.error('Error closing task:', error);
      const context = this.createRequestContext(request);
      return createGenericErrorNextResponse('Failed to close task', undefined, 500, context.correlationId);
    }
  }

  // Create a new service request
  async createServiceRequest(request: NextRequest): Promise<NextResponse> {
    try {
      const context = this.createRequestContext(request);

      // Get session from cookies
      const sessionResult = await cookieManager.getSessionFromCookies(request);
      if (!sessionResult) {
        return createGenericErrorNextResponse('Authentication required', undefined, 401, context.correlationId);
      }

      if (sessionResult.role !== 'customer') {
        return createGenericErrorNextResponse('Only customers can create service requests', undefined, 403, context.correlationId);
      }

      const body = await request.json();

      // Import helpers here to avoid circular deps if any
      const { mapFormToServiceDetails, getServicePriority } = await import('@/lib/utils/service-mapping');
      const { buildServiceDescription } = await import('@/lib/utils/service-description-builder');

      // Use the service mapping utility to get proper service details
      const serviceMapping = mapFormToServiceDetails(body);
      const serviceType = serviceMapping.serviceType;
      const title = serviceMapping.title;
      const priority = getServicePriority(serviceType, body) as 'low' | 'normal' | 'high' | 'urgent';

      const description = buildServiceDescription(serviceType, body);

      const [saved] = await db
        .insert(serviceData)
        .values({
          userId: sessionResult.userId,
          serviceType,
          status: 'pending',
          priority,
          title,
          description,
          data: body
        })
        .returning();

      logger.info('Service request created', {
        id: saved.id,
        userId: sessionResult.userId,
        serviceType,
        correlationId: context.correlationId
      });

      return createSuccessNextResponse(
        {
          id: saved.id,
          message: 'Service request submitted successfully',
          request: {
            id: saved.id,
            status: saved.status,
            createdAt: saved.createdAt
          }
        },
        'Service request created successfully',
        context.correlationId,
        201
      );

    } catch (error: any) {
      logger.error('Error creating service request:', error);
      const context = this.createRequestContext(request);
      return createGenericErrorNextResponse('Failed to create service request', undefined, 500, context.correlationId);
    }
  }

  /**
   * Get a single service request by ID
   */
  async getServiceRequestById(
    request: NextRequest,
    requestId: string
  ): Promise<NextResponse> {
    try {
      const context = this.createRequestContext(request);

      // Get session from cookies
      const sessionResult = await cookieManager.getSessionFromCookies(request);
      if (!sessionResult) {
        return createGenericErrorNextResponse('Authentication required', undefined, 401, context.correlationId);
      }

      if (sessionResult.role !== 'customer') {
        return createGenericErrorNextResponse('Only customers can access this endpoint', undefined, 403, context.correlationId);
      }

      if (!requestId) {
        return createGenericErrorNextResponse('Service request ID is required', undefined, 400, context.correlationId);
      }

      // Fetch the specific service request with expert information
      const results = await db
        .select({
          id: serviceData.id,
          userId: serviceData.userId,
          serviceType: serviceData.serviceType,
          status: serviceData.status,
          priority: serviceData.priority,
          title: serviceData.title,
          description: serviceData.description,
          assignedExpertId: serviceData.assignedExpertId,
          createdAt: serviceData.createdAt,
          updatedAt: serviceData.updatedAt,
          assignedAt: serviceData.assignedAt,
          completedAt: serviceData.completedAt,
          data: serviceData.data,
          // Expert details
          expertFirstName: users.firstName,
          expertLastName: users.lastName,
        })
        .from(serviceData)
        .leftJoin(users, eq(serviceData.assignedExpertId, users.id))
        .where(and(
          eq(serviceData.id, requestId),
          eq(serviceData.userId, sessionResult.userId)
        ))
        .limit(1);

      if (!results.length) {
        return createGenericErrorNextResponse('Service request not found', undefined, 404, context.correlationId);
      }

      const serviceRequest = results[0];
      const properServiceName = getServiceNameByType(serviceRequest.serviceType || 'general-consultation');

      const transformed = {
        id: serviceRequest.id,
        serviceType: serviceRequest.serviceType,
        status: serviceRequest.status,
        priority: serviceRequest.priority || 'normal',
        title: serviceRequest.title || properServiceName,
        description: serviceRequest.description,
        assignedExpertId: serviceRequest.assignedExpertId,
        expertName: serviceRequest.expertFirstName && serviceRequest.expertLastName
          ? `${serviceRequest.expertFirstName} ${serviceRequest.expertLastName}`
          : null,
        createdAt: serviceRequest.createdAt.toISOString(),
        assignedAt: serviceRequest.assignedAt?.toISOString(),
        completedAt: serviceRequest.completedAt?.toISOString(),
        data: serviceRequest.data || {},
        completionReport: (serviceRequest.data as any)?.completionReport || null
      };

      return createSuccessNextResponse(transformed, 'Service request fetched successfully', context.correlationId);

    } catch (error: any) {
      logger.error('Error fetching service request by ID:', error);
      const context = this.createRequestContext(request);
      return createGenericErrorNextResponse('Failed to fetch service request', undefined, 500, context.correlationId);
    }
  }
}

export const customerController = new CustomerController();
