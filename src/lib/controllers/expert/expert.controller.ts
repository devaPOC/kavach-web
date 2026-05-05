import { NextRequest, NextResponse } from 'next/server';
import { BaseController } from '../auth/auth.controller';
import { expertService } from '@/lib/services/expert/expert.service';
import { awarenessSessionService } from '@/lib/services/awareness-session.service';
import { logger } from '@/infrastructure/logging/logger';

/**
 * Expert controller handling expert-specific endpoints
 */
export class ExpertController extends BaseController {
  /**
   * Get assigned tasks for the current expert
   */
  async getAssignedTasks(request: NextRequest): Promise<NextResponse> {
    try {
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'expert' && session.role !== 'trainer') {
        return this.error('Expert access required', 'EXPERT_ACCESS_REQUIRED', 403);
      }

      // Parse query parameters for filtering and pagination
      const url = new URL(request.url);
      const status = url.searchParams.get('status');
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');

      const result = await expertService.getAssignedTasks(session.userId!, {
        status: status as any,
        page,
        limit
      });

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error: any | Error) {
      logger.error('Failed to get assigned tasks:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Accept a task assignment
   */
  async acceptTask(request: NextRequest, taskId: string): Promise<NextResponse> {
    try {
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'expert' && session.role !== 'trainer') {
        return this.error('Expert access required', 'EXPERT_ACCESS_REQUIRED', 403);
      }

      const body = await this.parseBody<{
        note?: string;
      }>(request);

      const result = await expertService.acceptTask(
        taskId,
        session.userId!,
        body?.note
      );

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error: any | Error) {
      logger.error('Failed to accept task:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Reject a task assignment
   */
  async rejectTask(request: NextRequest, taskId: string): Promise<NextResponse> {
    try {
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'expert' && session.role !== 'trainer') {
        return this.error('Expert access required', 'EXPERT_ACCESS_REQUIRED', 403);
      }

      const body = await this.parseBody<{
        reason?: string;
      }>(request);

      const result = await expertService.rejectTask(
        session.userId!,
        taskId,
        body?.reason
      );

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error: any | Error) {
      logger.error('Failed to reject task:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Start working on an accepted task
   */
  async startTask(request: NextRequest, taskId: string): Promise<NextResponse> {
    try {
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'expert' && session.role !== 'trainer') {
        return this.error('Expert access required', 'EXPERT_ACCESS_REQUIRED', 403);
      }

      const result = await expertService.startTask(taskId, session.userId!);

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error: any | Error) {
      logger.error('Failed to start task:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Request closure for a completed task
   */
  async requestClosure(request: NextRequest, taskId: string): Promise<NextResponse> {
    try {
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'expert' && session.role !== 'trainer') {
        return this.error('Expert access required', 'EXPERT_ACCESS_REQUIRED', 403);
      }

      const result = await expertService.requestClosure(taskId, session.userId!);

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error: any | Error) {
      logger.error('Failed to request task closure:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Submit completion report for a task
   */
  async submitCompletionReport(request: NextRequest, taskId: string): Promise<NextResponse> {
    try {
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'expert' && session.role !== 'trainer') {
        return this.error('Expert access required', 'EXPERT_ACCESS_REQUIRED', 403);
      }

      const body = await this.parseBody<{
        report: string;
      }>(request);

      // Validate input - require report
      if (!body?.report?.trim()) {
        return this.error('A detailed completion report is required', 'REPORT_REQUIRED', 400);
      }

      const result = await expertService.submitCompletionReport(taskId, session.userId!, {
        report: body.report.trim(),
        files: [] // No files for text-only reports
      });

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error: any | Error) {
      logger.error('Failed to submit completion report:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Get expert dashboard statistics
   */
  async getDashboardStats(request: NextRequest): Promise<NextResponse> {
    try {
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'expert' && session.role !== 'trainer') {
        return this.error('Expert access required', 'EXPERT_ACCESS_REQUIRED', 403);
      }

      const result = await expertService.getDashboardStats(session.userId!);

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error: any | Error) {
      logger.error('Failed to get dashboard stats:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Get expert dashboard activity
   */
  async getDashboardActivity(request: NextRequest): Promise<NextResponse> {
    try {
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'expert' && session.role !== 'trainer') {
        return this.error('Expert access required', 'EXPERT_ACCESS_REQUIRED', 403);
      }

      // Parse query parameters for pagination
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '10');

      const result = await expertService.getDashboardActivity(session.userId!, { limit });

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error: any | Error) {
      logger.error('Failed to get dashboard activity:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Get earnings statistics for the expert
   */
  async getEarnings(request: NextRequest): Promise<NextResponse> {
    try {
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'expert' && session.role !== 'trainer') {
        return this.error('Expert access required', 'EXPERT_ACCESS_REQUIRED', 403);
      }

      // Parse query parameters for date range filtering
      const url = new URL(request.url);
      const startDate = url.searchParams.get('startDate');
      const endDate = url.searchParams.get('endDate');
      const period = url.searchParams.get('period') || 'month'; // month, quarter, year

      const result = await expertService.getEarnings(session.userId!, {
        startDate,
        endDate,
        period
      });

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error: any | Error) {
      logger.error('Failed to get earnings:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Get awareness session requests assigned to the expert
   */
  async getAwarenessSessionRequests(request: NextRequest): Promise<NextResponse> {
    try {
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'trainer') {
        return this.error('Trainer access required', 'TRAINER_ACCESS_REQUIRED', 403);
      }

      // Get pagination parameters from query
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      // Optional filters
      const status = searchParams.get('status') || undefined;
      const search = (searchParams.get('search') || '').trim() || undefined;
      const startDateStr = searchParams.get('startDate') || undefined;
      const endDateStr = searchParams.get('endDate') || undefined;
      const sessionMode = searchParams.get('sessionMode') || undefined;

      let startDate = startDateStr ? new Date(startDateStr) : undefined;
      let endDate = endDateStr ? new Date(endDateStr) : undefined;
      if (startDate && isNaN(startDate.getTime())) startDate = undefined as any;
      if (endDate && isNaN(endDate.getTime())) endDate = undefined as any;

      const result = await awarenessSessionService.getRequestsForExpert(
        session.userId!,
        page,
        limit,
        {
          status: status as any,
          search,
          startDate,
          endDate,
          sessionMode: sessionMode as any,
        }
      );

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error: any | Error) {
      logger.error('Failed to get awareness session requests for expert:', { error });
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Respond to awareness session request (accept/decline)
   */
  async respondToAwarenessSessionRequest(request: NextRequest, requestId: string): Promise<NextResponse> {
    try {
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'trainer') {
        return this.error('Trainer access required', 'TRAINER_ACCESS_REQUIRED', 403);
      }

      const body = await this.parseBody<{
        action: 'accept' | 'decline';
        notes?: string;
      }>(request);

      const validation = this.validateRequired(body, ['action']);
      if (!validation.isValid) {
        return this.error(`Missing required fields: ${validation.missingFields?.join(', ')}`, undefined, 400);
      }

      // Validate action value
      if (!['accept', 'decline'].includes(body!.action)) {
        return this.error('Action must be either "accept" or "decline"', undefined, 400);
      }

      const result = await awarenessSessionService.expertResponse(requestId, session.userId!, body!);

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error: any | Error) {
      logger.error('Failed to respond to awareness session request:', { error });
      return this.error('Internal server error', undefined, 500);
    }
  }


}

// Export singleton instance
export const expertController = new ExpertController();
