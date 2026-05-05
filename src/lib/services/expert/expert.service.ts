import { BaseService, ServiceResult, serviceSuccess, serviceError } from '../base.service';
import { db } from '../../database';
import { serviceData } from '../../database/schema/service-data';
import { users } from '../../database/schema/users';
import { eq, and, desc } from 'drizzle-orm';
import { emailService } from '../../email/email-service';
import { createId } from '@paralleldrive/cuid2';
import { readFile } from 'fs/promises';
import { join } from 'path';

import { getServiceNameByType } from '../../utils/service-mapping';

export interface TaskFilters {
  status?: 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'pending_closure' | 'closed';
  page?: number;
  limit?: number;
}

export interface AssignedTask {
  id: string;
  title: string;
  serviceType: string;
  priority: string;
  status: string;
  description: string;
  createdAt: string;
  assignedAt: string;
  customer: {
    firstName: string;
    lastName: string;
  };
  data: any;
  completionReport?: {
    id: string;
    report: string;
    files: Array<{
      id: string;
      filename: string;
      originalName: string;
      mimeType: string;
      size: number;
      uploadedAt: string;
    }>;
    submittedAt: string;
  };
  pricing?: {
    type: 'fixed' | 'variable';
    fixedPrice: number | null;
    currency: string;
    quote?: {
      id: string;
      amount: number;
      status: string;
      validUntil?: string;
      description?: string;
    } | null;
  } | null;
}

export interface CompletionReportData {
  report: string;
  files: File[];
}

export class ExpertService extends BaseService {
  /**
   * Get assigned tasks for an expert
   */
  async getAssignedTasks(expertId: string, filters: TaskFilters = {}): Promise<ServiceResult<AssignedTask[]>> {
    try {
      const { status, page = 1, limit = 20 } = filters;
      const offset = (page - 1) * limit;

      // Build where conditions
      const whereConditions = [eq(serviceData.assignedExpertId, expertId)];
      if (status) {
        whereConditions.push(eq(serviceData.status, status));
      }

      const query = db
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
          customerFirstName: users.firstName,
          customerLastName: users.lastName,
        })
        .from(serviceData)
        .innerJoin(users, eq(serviceData.userId, users.id))
        .where(and(...whereConditions))
        .orderBy(desc(serviceData.assignedAt))
        .limit(limit)
        .offset(offset);

      const results = await query;

      // Get pricing information for each task
      const tasks: AssignedTask[] = await Promise.all(results.map(async (row) => {
        const data = row.data as any;
        const completionReport = data?.completionReport;

        // Get the proper service name based on service type
        const properServiceName = getServiceNameByType(row.serviceType || 'general-consultation');

        return {
          id: row.id,
          title: row.title || properServiceName,
          serviceType: row.serviceType || 'general-consultation',
          priority: row.priority || 'normal',
          status: row.status,
          description: row.description || '',
          createdAt: row.createdAt.toISOString(),
          assignedAt: row.assignedAt?.toISOString() || row.createdAt.toISOString(),
          customer: {
            firstName: row.customerFirstName,
            lastName: row.customerLastName,
          },
          data: row.data || {},
          completionReport: completionReport ? {
            id: completionReport.id,
            report: completionReport.report,
            files: completionReport.files || [],
            submittedAt: completionReport.submittedAt
          } : undefined,
          // Pricing information will be handled by the new pricing system
          pricing: null
        };
      }));

      return serviceSuccess(tasks);
    } catch (error) {
      return this.handleError(error, 'ExpertService.getAssignedTasks');
    }
  }

  /**
   * Accept a task assignment
   */
  async acceptTask(taskId: string, expertId: string, note?: string): Promise<ServiceResult<any>> {
    try {
      // First, verify the task is assigned to this expert
      const taskResult = await db
        .select({
          id: serviceData.id,
          userId: serviceData.userId,
          assignedExpertId: serviceData.assignedExpertId,
          status: serviceData.status,
          title: serviceData.title,
        })
        .from(serviceData)
        .where(eq(serviceData.id, taskId))
        .limit(1);

      if (!taskResult.length) {
        return serviceError('Task not found', 'TASK_NOT_FOUND');
      }

      const task = taskResult[0];

      if (task.assignedExpertId !== expertId) {
        return serviceError('Task not assigned to you', 'UNAUTHORIZED_TASK_ACCESS');
      }

      if (task.status !== 'assigned') {
        return serviceError('Task has already been processed', 'TASK_ALREADY_PROCESSED');
      }

      // Update task status to accepted
      await db
        .update(serviceData)
        .set({
          status: 'accepted',
          updatedAt: new Date(),
        })
        .where(eq(serviceData.id, taskId));

      // Get customer and expert info for email notification
      const [customerResult, expertResult] = await Promise.all([
        db
          .select({
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          })
          .from(users)
          .where(eq(users.id, task.userId))
          .limit(1),
        db
          .select({
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          })
          .from(users)
          .where(eq(users.id, expertId))
          .limit(1)
      ]);

      if (customerResult.length && expertResult.length) {
        const customer = customerResult[0];
        const expert = expertResult[0];

        // Send email notification to customer
        try {
          await emailService.sendTaskAcceptanceNotification({
            customerEmail: customer.email,
            customerName: `${customer.firstName} ${customer.lastName}`,
            expertName: `${expert.firstName} ${expert.lastName}`,
            taskTitle: task.title || 'Your Service Request',
            initialNote: note,
          });
        } catch (emailError) {
          console.error('Failed to send task acceptance email:', emailError);
          // Continue even if email fails
        }
      }

      this.audit({
        event: 'admin.user.updated',
        userId: expertId,
        success: true,
        metadata: {
          action: 'task_accepted',
          taskId,
          customerId: task.userId,
          taskTitle: task.title
        }
      });

      return serviceSuccess({
        message: 'Task accepted successfully. Customer has been notified.',
        taskId,
        status: 'accepted'
      });

    } catch (error) {
      return this.handleError(error, 'ExpertService.acceptTask');
    }
  }

  /**
   * Reject an assigned task
   */
  async rejectTask(expertId: string, taskId: string, reason?: string): Promise<ServiceResult<any>> {
    try {
      // Verify the task is assigned to this expert
      const [task] = await db
        .select({
          id: serviceData.id,
          status: serviceData.status,
          title: serviceData.title,
          userId: serviceData.userId,
        })
        .from(serviceData)
        .where(and(
          eq(serviceData.id, taskId),
          eq(serviceData.assignedExpertId, expertId)
        ))
        .limit(1);

      if (!task) {
        return serviceError('Task not found or not assigned to you', 'TASK_NOT_FOUND');
      }

      if (task.status !== 'assigned') {
        return serviceError('Task cannot be rejected in its current state', 'INVALID_STATUS');
      }

      // Update task status back to pending and remove expert assignment
      await db
        .update(serviceData)
        .set({
          status: 'pending',
          assignedExpertId: null,
          assignedAt: null,
          updatedAt: new Date()
        })
        .where(eq(serviceData.id, taskId));

      // Send email notification to admin about rejection
      // Note: In a real application, you'd want to get admin emails from a configuration
      // For now, we'll just log it
      console.log(`Task ${taskId} rejected by expert ${expertId}. Reason: ${reason || 'No reason provided'}`);

      this.audit({
        event: 'admin.user.updated',
        userId: expertId,
        success: true,
        metadata: {
          action: 'task_rejected',
          taskId,
          reason: reason || 'No reason provided'
        }
      });

      return serviceSuccess({
        message: 'Task rejected successfully. It has been returned to the admin for reassignment.',
        taskId,
        reason: reason || 'No reason provided'
      });

    } catch (error) {
      return this.handleError(error, 'ExpertService.rejectTask');
    }
  }

  /**
   * Start working on an accepted task
   */
  async startTask(taskId: string, expertId: string): Promise<ServiceResult<any>> {
    try {
      // Verify the task exists and is assigned to this expert
      const [task] = await db
        .select({
          id: serviceData.id,
          status: serviceData.status,
          title: serviceData.title,
          assignedExpertId: serviceData.assignedExpertId,
        })
        .from(serviceData)
        .where(and(
          eq(serviceData.id, taskId),
          eq(serviceData.assignedExpertId, expertId)
        ))
        .limit(1);

      if (!task) {
        return serviceError('Task not found or not assigned to you', 'TASK_NOT_FOUND');
      }

      if (task.status !== 'accepted') {
        return serviceError('Task must be accepted before starting work', 'INVALID_STATUS');
      }

      // Update task status to in_progress
      await db
        .update(serviceData)
        .set({
          status: 'in_progress',
          updatedAt: new Date()
        })
        .where(eq(serviceData.id, taskId));

      this.audit({
        event: 'admin.user.updated',
        userId: expertId,
        success: true,
        metadata: {
          action: 'task_started',
          taskId,
          taskTitle: task.title
        }
      });

      return serviceSuccess({
        message: 'Task started successfully. You can now begin working on it.',
        taskId,
        status: 'in_progress'
      });

    } catch (error) {
      return this.handleError(error, 'ExpertService.startTask');
    }
  }

  /**
   * Request closure for a completed task
   */
  async requestClosure(taskId: string, expertId: string): Promise<ServiceResult<any>> {
    try {
      // Verify the task exists, is assigned to this expert, and has a completion report
      const [task] = await db
        .select({
          id: serviceData.id,
          status: serviceData.status,
          title: serviceData.title,
          assignedExpertId: serviceData.assignedExpertId,
          userId: serviceData.userId,
          data: serviceData.data,
        })
        .from(serviceData)
        .where(and(
          eq(serviceData.id, taskId),
          eq(serviceData.assignedExpertId, expertId)
        ))
        .limit(1);

      if (!task) {
        return serviceError('Task not found or not assigned to you', 'TASK_NOT_FOUND');
      }

      if (task.status !== 'completed') {
        return serviceError('Task must be completed before requesting closure', 'INVALID_STATUS');
      }

      // Check if task has a completion report
      const taskData = task.data as any;
      if (!taskData?.completionReport) {
        return serviceError('Task must have a completion report before requesting closure', 'NO_COMPLETION_REPORT');
      }

      // Update task status to pending_closure
      await db
        .update(serviceData)
        .set({
          status: 'pending_closure',
          updatedAt: new Date()
        })
        .where(eq(serviceData.id, taskId));

      // Get customer and admin info for notifications
      const [customerResult] = await db
        .select({
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, task.userId))
        .limit(1);

      if (customerResult) {
        // Send email notification to customer
        try {
          await emailService.sendTaskClosureRequestNotification({
            customerEmail: customerResult.email,
            customerName: `${customerResult.firstName} ${customerResult.lastName}`,
            taskTitle: task.title || 'Service Request',
            taskId: taskId,
          });
        } catch (emailError) {
          console.error('Failed to send task closure request email:', emailError);
          // Continue even if email fails
        }
      }
      console.log(`Task ${taskId} closure requested by expert ${expertId}`);

      this.audit({
        event: 'admin.user.updated',
        userId: expertId,
        success: true,
        metadata: {
          action: 'task_closure_requested',
          taskId,
          customerId: task.userId
        }
      });

      return serviceSuccess({
        message: 'Closure request submitted successfully. The task will be reviewed and closed by the admin.',
        taskId,
        status: 'pending_closure'
      });

    } catch (error) {
      return this.handleError(error, 'ExpertService.requestClosure');
    }
  }

  /**
   * Submit completion report for a task
   */
  async submitCompletionReport(taskId: string, expertId: string, reportData: CompletionReportData): Promise<ServiceResult<any>> {
    try {
      // Verify the task exists and belongs to the expert
      const task = await db
        .select()
        .from(serviceData)
        .where(and(
          eq(serviceData.id, taskId),
          eq(serviceData.assignedExpertId, expertId)
        ))
        .limit(1);

      if (!task.length) {
        return serviceError('Task not found or not assigned to you', 'TASK_NOT_FOUND');
      }

      if (task[0].status !== 'completed' && task[0].status !== 'in_progress') {
        return serviceError('Task must be in progress or completed to submit report', 'INVALID_STATUS');
      }

      // Create completion report object (text-only)
      const completionReport = {
        id: createId(),
        report: reportData.report,
        files: [], // No files for text-only reports
        submittedAt: new Date().toISOString()
      };

      // Update task with completion report
      const updateData: any = {
        data: {
          ...(task[0].data as object || {}),
          completionReport
        },
        updatedAt: new Date()
      };

      // If task is in_progress, mark it as completed and set completion time
      if (task[0].status === 'in_progress') {
        updateData.status = 'completed';
        updateData.completedAt = new Date();
      }

      await db
        .update(serviceData)
        .set(updateData)
        .where(eq(serviceData.id, taskId));

      // Send notification to customer about completion report
      // Note: In production, implement proper email notification
      console.log(`Completion report submitted for task ${taskId} by expert ${expertId}`);

      this.audit({
        event: 'admin.user.updated',
        userId: expertId,
        success: true,
        metadata: {
          action: 'completion_report_submitted',
          taskId,
          reportId: completionReport.id,
          status: task[0].status === 'in_progress' ? 'completed' : task[0].status
        }
      });

      return serviceSuccess({
        message: task[0].status === 'in_progress'
          ? 'Task marked as complete with your report. You can now request closure.'
          : 'Completion report updated successfully.',
        taskId,
        reportId: completionReport.id,
        status: task[0].status === 'in_progress' ? 'completed' : task[0].status
      });

    } catch (error) {
      return this.handleError(error, 'ExpertService.submitCompletionReport');
    }
  }

  /**
   * Download completion file
   */
  async downloadCompletionFile(taskId: string, fileId: string, userId: string, userRole: string): Promise<ServiceResult<any>> {
    try {
      // Get the task
      const task = await db
        .select()
        .from(serviceData)
        .where(eq(serviceData.id, taskId))
        .limit(1);

      if (!task.length) {
        return serviceError('Task not found', 'TASK_NOT_FOUND');
      }

      // Check access permissions
      const taskData = task[0];
      if (userRole === 'expert' && taskData.assignedExpertId !== userId) {
        return serviceError('Access denied', 'ACCESS_DENIED');
      } else if (userRole === 'customer' && taskData.userId !== userId) {
        return serviceError('Access denied', 'ACCESS_DENIED');
      }

      // Get completion report from task data
      const completionReport = (taskData.data as any)?.completionReport;
      if (!completionReport) {
        return serviceError('Completion report not found', 'REPORT_NOT_FOUND');
      }

      // Find the requested file
      const file = completionReport.files?.find((f: any) => f.id === fileId);
      if (!file) {
        return serviceError('File not found', 'FILE_NOT_FOUND');
      }

      // Read file from disk
      const filepath = join(process.cwd(), 'uploads', 'completion-reports', taskId, file.filename);

      try {
        const fileBuffer = await readFile(filepath);

        return serviceSuccess({
          fileBuffer,
          filename: file.originalName,
          mimeType: file.mimeType,
          size: file.size
        });
      } catch (fileError) {
        return serviceError('File not found on disk', 'FILE_NOT_FOUND');
      }

    } catch (error) {
      return this.handleError(error, 'ExpertService.downloadCompletionFile');
    }
  }

  /**
   * Get expert dashboard statistics
   */
  async getDashboardStats(expertId: string): Promise<ServiceResult<any>> {
    try {
      const tasks = await db
        .select({
          status: serviceData.status,
        })
        .from(serviceData)
        .where(eq(serviceData.assignedExpertId, expertId));

      const stats = {
        totalAssigned: tasks.length,
        pendingAcceptance: tasks.filter(t => t.status === 'assigned').length,
        inProgress: tasks.filter(t => t.status === 'accepted' || t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed' || t.status === 'pending_closure' || t.status === 'closed').length,
        rejected: tasks.filter(t => t.status === 'rejected').length,
      };

      return serviceSuccess(stats);
    } catch (error) {
      return this.handleError(error, 'ExpertService.getDashboardStats');
    }
  }

  /**
   * Get expert dashboard activity
   */
  async getDashboardActivity(expertId: string, options: { limit?: number } = {}): Promise<ServiceResult<any[]>> {
    try {
      const limit = options.limit || 10;

      // Get recent tasks assigned to this expert with their status changes
      const recentTasks = await db
        .select({
          id: serviceData.id,
          title: serviceData.title,
          serviceType: serviceData.serviceType,
          status: serviceData.status,
          assignedAt: serviceData.assignedAt,
          completedAt: serviceData.completedAt,
          createdAt: serviceData.createdAt,
          updatedAt: serviceData.updatedAt,
        })
        .from(serviceData)
        .where(eq(serviceData.assignedExpertId, expertId))
        .orderBy(desc(serviceData.updatedAt))
        .limit(limit);

      // Create activity entries based on task status and timestamps
      const activities: any[] = [];

      for (const task of recentTasks) {
        // Get the proper service name for this task
        const properServiceName = getServiceNameByType(task.serviceType || 'general-consultation');
        const taskTitle = task.title || properServiceName;

        // Task assignment activity
        if (task.assignedAt) {
          activities.push({
            id: `${task.id}-assigned`,
            type: 'assignment',
            taskTitle,
            timestamp: task.assignedAt.toISOString(),
          });
        }

        // Based on current status, add appropriate activity
        if (task.status === 'accepted' || task.status === 'in_progress') {
          activities.push({
            id: `${task.id}-accepted`,
            type: 'acceptance',
            taskTitle,
            timestamp: task.updatedAt.toISOString(),
          });
        }

        if (task.status === 'completed' || task.status === 'pending_closure' || task.status === 'closed') {
          activities.push({
            id: `${task.id}-completed`,
            type: 'completion',
            taskTitle,
            timestamp: task.completedAt?.toISOString() || task.updatedAt.toISOString(),
          });
        }

        if (task.status === 'rejected') {
          activities.push({
            id: `${task.id}-rejected`,
            type: 'rejection',
            taskTitle,
            timestamp: task.updatedAt.toISOString(),
          });
        }
      }

      // Sort by timestamp descending and limit
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

      return serviceSuccess(sortedActivities);
    } catch (error) {
      return this.handleError(error, 'ExpertService.getDashboardActivity');
    }
  }

  /**
   * Get earnings statistics for an expert
   */
  async getEarnings(expertId: string, options: { startDate?: string | null; endDate?: string | null; period?: string } = {}): Promise<ServiceResult<any>> {
    try {
      const { startDate, endDate, period = 'month' } = options;

      // Get completed tasks for this expert
      const completedTasks = await db
        .select({
          id: serviceData.id,
          serviceType: serviceData.serviceType,
          completedAt: serviceData.completedAt,
          data: serviceData.data,
        })
        .from(serviceData)
        .where(and(
          eq(serviceData.assignedExpertId, expertId),
          eq(serviceData.status, 'closed') // Only count closed/paid tasks
        ))
        .orderBy(desc(serviceData.completedAt));

      // Filter by date range if provided
      let filteredTasks = completedTasks;
      if (startDate || endDate) {
        filteredTasks = completedTasks.filter(task => {
          if (!task.completedAt) return false;
          const taskDate = task.completedAt;

          if (startDate && taskDate < new Date(startDate)) return false;
          if (endDate && taskDate > new Date(endDate)) return false;

          return true;
        });
      }

      // Calculate earnings (placeholder logic - adjust based on your pricing model)
      let totalEarnings = 0;
      const earningsByPeriod: { [key: string]: number } = {};
      const taskBreakdown: any[] = [];

      for (const task of filteredTasks) {
        // For now, use a base rate per completed task
        // In a real system, you'd get this from pricing/payment data
        const baseRate = 50; // 50 OMR per completed task (placeholder)
        const taskEarning = baseRate;

        totalEarnings += taskEarning;

        // Group by period for charts
        if (task.completedAt) {
          const periodKey = this.getPeriodKey(task.completedAt, period);
          earningsByPeriod[periodKey] = (earningsByPeriod[periodKey] || 0) + taskEarning;
        }

        taskBreakdown.push({
          taskId: task.id,
          serviceType: task.serviceType,
          completedAt: task.completedAt?.toISOString(),
          earning: taskEarning,
        });
      }

      // Calculate period-over-period growth
      const periodKeys = Object.keys(earningsByPeriod).sort();
      const currentPeriodEarnings = periodKeys.length > 0 ? earningsByPeriod[periodKeys[periodKeys.length - 1]] : 0;
      const previousPeriodEarnings = periodKeys.length > 1 ? earningsByPeriod[periodKeys[periodKeys.length - 2]] : 0;
      const growthPercentage = previousPeriodEarnings > 0
        ? ((currentPeriodEarnings - previousPeriodEarnings) / previousPeriodEarnings) * 100
        : 0;

      const earningsData = {
        totalEarnings,
        currency: 'OMR',
        completedTasks: filteredTasks.length,
        averagePerTask: filteredTasks.length > 0 ? totalEarnings / filteredTasks.length : 0,
        currentPeriodEarnings,
        previousPeriodEarnings,
        growthPercentage: Math.round(growthPercentage * 100) / 100,
        earningsByPeriod,
        taskBreakdown,
        period,
        dateRange: {
          startDate,
          endDate,
        },
      };

      return serviceSuccess(earningsData);
    } catch (error) {
      return this.handleError(error, 'ExpertService.getEarnings');
    }
  }

  /**
   * Helper method to get period key for grouping earnings
   */
  private getPeriodKey(date: Date, period: string): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const quarter = Math.ceil(month / 3);

    switch (period) {
      case 'year':
        return year.toString();
      case 'quarter':
        return `${year}-Q${quarter}`;
      case 'month':
      default:
        return `${year}-${month.toString().padStart(2, '0')}`;
    }
  }
}

// Export singleton instance
export const expertService = new ExpertService();
