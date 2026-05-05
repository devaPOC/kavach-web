import { db } from '@/lib/database';
import { serviceData } from '@/lib/database/schema/service-data';
import { archivedServiceData } from '@/lib/database/schema/archived-service-data';
import { users } from '@/lib/database/schema/users';
import { eq, and, lt, isNull, isNotNull, gte, lte, desc, sql } from 'drizzle-orm';
import { logger } from '@/lib/utils/logger';
import { emitAudit } from '@/lib/utils/audit-logger';

export class ArchiveService {

  /**
   * Archive service requests when a user is deleted
   */
  static async archiveUserServiceRequests(userId: string): Promise<number> {
    try {
      // Get all service requests for the user with user and expert details
      const requests = await db
        .select({
          serviceRequest: serviceData,
          customer: {
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email
          }
        })
        .from(serviceData)
        .leftJoin(users, eq(serviceData.userId, users.id))
        .where(eq(serviceData.userId, userId));

      if (requests.length === 0) {
        return 0;
      }

      // Get expert details separately for requests that have assigned experts
      const expertRequests = await db
        .select({
          serviceRequestId: serviceData.id,
          expertFirstName: users.firstName,
          expertLastName: users.lastName,
          expertEmail: users.email
        })
        .from(serviceData)
        .leftJoin(users, eq(serviceData.assignedExpertId, users.id))
        .where(and(
          eq(serviceData.userId, userId),
          isNotNull(serviceData.assignedExpertId)
        ));

      // Create a map of expert data
      const expertMap = new Map();
      expertRequests.forEach(expert => {
        expertMap.set(expert.serviceRequestId, {
          firstName: expert.expertFirstName,
          lastName: expert.expertLastName,
          email: expert.expertEmail
        });
      });

      // Archive all requests for this user
      const archiveData = requests
        .filter(req => req.serviceRequest.status !== 'completed') // Only archive incomplete requests
        .map(req => {
          const expert = expertMap.get(req.serviceRequest.id);
          return {
            originalId: req.serviceRequest.id,
            userId: req.serviceRequest.userId,
            assignedExpertId: req.serviceRequest.assignedExpertId,
            serviceType: req.serviceRequest.serviceType,
            status: req.serviceRequest.status,
            priority: req.serviceRequest.priority,
            title: req.serviceRequest.title,
            description: req.serviceRequest.description,
            data: req.serviceRequest.data,
            assignedAt: req.serviceRequest.assignedAt,
            completedAt: req.serviceRequest.completedAt,
            createdAt: req.serviceRequest.createdAt,
            updatedAt: req.serviceRequest.updatedAt,
            archiveReason: 'user_deleted' as const,
            customerName: req.customer ? `${req.customer.firstName} ${req.customer.lastName}` : 'Unknown User',
            customerEmail: req.customer?.email || 'unknown@example.com',
            expertName: expert ? `${expert.firstName} ${expert.lastName}` : null,
            expertEmail: expert?.email || null
          };
        });

      if (archiveData.length === 0) {
        return 0;
      }

      // Insert into archive table
      await db.insert(archivedServiceData).values(archiveData);

      // Delete from main table (only incomplete requests)
      await db
        .delete(serviceData)
        .where(and(
          eq(serviceData.userId, userId),
          isNull(serviceData.completedAt)
        ));

      logger.info(`Archived ${archiveData.length} incomplete service requests for deleted user ${userId}`);

      emitAudit({
        event: 'admin.user.deleted',
        userId,
        success: true,
        metadata: {
          action: 'user_data_archived',
          archivedCount: archiveData.length,
          reason: 'user_deleted'
        }
      });

      return archiveData.length;

    } catch (error) {
      logger.error('Error archiving user service requests:', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      throw error;
    }
  }

  /**
   * Archive completed service requests older than 1 day
   */
  static async archiveCompletedServiceRequests(): Promise<number> {
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      // Get completed requests older than 1 day with user details
      const requests = await db
        .select({
          serviceRequest: serviceData,
          customer: {
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email
          }
        })
        .from(serviceData)
        .leftJoin(users, eq(serviceData.userId, users.id))
        .where(and(
          eq(serviceData.status, 'completed'),
          isNotNull(serviceData.completedAt),
          lt(serviceData.completedAt, oneDayAgo)
        ));

      if (requests.length === 0) {
        return 0;
      }

      // Get expert details separately
      const expertRequests = await db
        .select({
          serviceRequestId: serviceData.id,
          expertFirstName: users.firstName,
          expertLastName: users.lastName,
          expertEmail: users.email
        })
        .from(serviceData)
        .leftJoin(users, eq(serviceData.assignedExpertId, users.id))
        .where(and(
          eq(serviceData.status, 'completed'),
          isNotNull(serviceData.completedAt),
          lt(serviceData.completedAt, oneDayAgo),
          isNotNull(serviceData.assignedExpertId)
        ));

      // Create expert map
      const expertMap = new Map();
      expertRequests.forEach(expert => {
        expertMap.set(expert.serviceRequestId, {
          firstName: expert.expertFirstName,
          lastName: expert.expertLastName,
          email: expert.expertEmail
        });
      });

      // Archive the completed requests
      const archiveData = requests.map(req => {
        const expert = expertMap.get(req.serviceRequest.id);
        return {
          originalId: req.serviceRequest.id,
          userId: req.serviceRequest.userId,
          assignedExpertId: req.serviceRequest.assignedExpertId,
          serviceType: req.serviceRequest.serviceType,
          status: req.serviceRequest.status,
          priority: req.serviceRequest.priority,
          title: req.serviceRequest.title,
          description: req.serviceRequest.description,
          data: req.serviceRequest.data,
          assignedAt: req.serviceRequest.assignedAt,
          completedAt: req.serviceRequest.completedAt,
          createdAt: req.serviceRequest.createdAt,
          updatedAt: req.serviceRequest.updatedAt,
          archiveReason: 'auto_completed' as const,
          customerName: req.customer ? `${req.customer.firstName} ${req.customer.lastName}` : 'Deleted User',
          customerEmail: req.customer?.email || 'deleted@example.com',
          expertName: expert ? `${expert.firstName} ${expert.lastName}` : 'Unassigned',
          expertEmail: expert?.email || null
        };
      });

      // Insert into archive table
      await db.insert(archivedServiceData).values(archiveData);

      // Delete from main table
      const requestIds = requests.map(req => req.serviceRequest.id);
      await db.delete(serviceData).where(
        and(
          eq(serviceData.status, 'completed'),
          isNotNull(serviceData.completedAt),
          lt(serviceData.completedAt, oneDayAgo)
        )
      );

      logger.info(`Archived ${archiveData.length} completed service requests older than 1 day`);
      return archiveData.length;

    } catch (error) {
      logger.error('Error archiving completed service requests:', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get archived service requests with filtering
   */
  static async getArchivedServiceRequests(filters: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    archiveReason?: string;
    serviceType?: string;
    dateFrom?: Date;
    dateTo?: Date;
    search?: string;
  } = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        priority,
        archiveReason,
        serviceType,
        dateFrom,
        dateTo,
        search
      } = filters;

      const offset = (page - 1) * limit;

      // Build where conditions
      const whereConditions = [];

      if (status && status !== 'all') {
        whereConditions.push(eq(archivedServiceData.status, status));
      }

      if (priority && priority !== 'all') {
        whereConditions.push(eq(archivedServiceData.priority, priority));
      }

      if (archiveReason && archiveReason !== 'all') {
        whereConditions.push(eq(archivedServiceData.archiveReason, archiveReason));
      }

      if (serviceType && serviceType !== 'all') {
        whereConditions.push(eq(archivedServiceData.serviceType, serviceType));
      }

      if (dateFrom) {
        whereConditions.push(gte(archivedServiceData.archivedAt, dateFrom));
      }

      if (dateTo) {
        whereConditions.push(lte(archivedServiceData.archivedAt, dateTo));
      }

      // Get archived requests
      const archivedRequests = await db
        .select()
        .from(archivedServiceData)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(archivedServiceData.archivedAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      const totalCountResult = await db
        .select({ count: sql`count(*)` })
        .from(archivedServiceData)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

      const totalCount = Number(totalCountResult[0]?.count || 0);
      const totalPages = Math.ceil(totalCount / limit);

      return {
        success: true,
        data: {
          requests: archivedRequests,
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      };

    } catch (error) {
      logger.error('Error getting archived service requests:', {
        error: error instanceof Error ? error.message : String(error),
        filters
      });
      throw error;
    }
  }

  /**
   * Delete archived service request permanently
   */
  static async deleteArchivedServiceRequest(archivedId: string): Promise<boolean> {
    try {
      const result = await db
        .delete(archivedServiceData)
        .where(eq(archivedServiceData.id, archivedId));

      logger.info(`Permanently deleted archived service request ${archivedId}`);

      emitAudit({
        event: 'admin.user.deleted',
        success: true,
        metadata: {
          action: 'archived_data_permanently_deleted',
          archivedId
        }
      });

      return true;

    } catch (error) {
      logger.error('Error deleting archived service request:', {
        error: error instanceof Error ? error.message : String(error),
        archivedId
      });
      throw error;
    }
  }

  /**
   * Get archive statistics
   */
  static async getArchiveStats() {
    try {
      // Get total count
      const totalResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(archivedServiceData);

      const total = totalResult[0]?.count || 0;

      // Get count by archive reason
      const userDeletedResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(archivedServiceData)
        .where(eq(archivedServiceData.archiveReason, 'user_deleted'));

      const userDeleted = userDeletedResult[0]?.count || 0;

      const autoCompletedResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(archivedServiceData)
        .where(eq(archivedServiceData.archiveReason, 'auto_completed'));

      const autoCompleted = autoCompletedResult[0]?.count || 0;

      // Get count by status
      const statusResults = await db
        .select({
          status: archivedServiceData.status,
          count: sql<number>`count(*)::int`
        })
        .from(archivedServiceData)
        .groupBy(archivedServiceData.status);

      const byStatus = statusResults.reduce((acc, row) => {
        if (row.status) {
          acc[row.status] = row.count;
        }
        return acc;
      }, {} as Record<string, number>);

      // Get count by priority
      const priorityResults = await db
        .select({
          priority: archivedServiceData.priority,
          count: sql<number>`count(*)::int`
        })
        .from(archivedServiceData)
        .groupBy(archivedServiceData.priority);

      const byPriority = priorityResults.reduce((acc, row) => {
        if (row.priority) {
          acc[row.priority] = row.count;
        }
        return acc;
      }, {} as Record<string, number>); return {
        success: true,
        data: {
          total,
          userDeleted,
          autoCompleted,
          byStatus,
          byPriority
        }
      };

    } catch (error) {
      logger.error('Error getting archive stats:', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}
