import { BaseService, ServiceResult, serviceSuccess, serviceError } from './base.service';
import { awarenessSessionRepository } from '@/lib/database/repositories/awareness-session-repository';
import { awarenessSessionWorkflow } from '@/lib/database/repositories/awareness-session-workflow';
import { userRepository } from '@/lib/database/repositories/user-repository';
import { awarenessSessionNotificationService } from './awareness-session-notification.service';
import {
  reviewAwarenessSessionSchema,
  respondToAwarenessSessionSchema,
  assignExpertSchema,
  updateStatusSchema
} from '@/lib/validation/awareness-session-schemas';
import type {
  AwarenessSessionRequest,
  AwarenessSessionStatus,
  AwarenessSessionStatusHistory,
  CreateAwarenessSessionData,
  AdminReviewAction,
  ExpertResponseAction
} from '@/types/awareness-session';

/**
 * Service for managing awareness session requests
 * Handles the complete workflow from request creation to expert confirmation
 */
export class AwarenessSessionService extends BaseService {
  /**
   * Create a new awareness session request
   */
  async createRequest(
    requesterId: string,
    data: CreateAwarenessSessionData
  ): Promise<ServiceResult<AwarenessSessionRequest>> {
    try {
      this.validateRequired(requesterId, 'requesterId');

      // Note: Validation is already done at the API layer, no need to re-validate here

      // Verify requester exists and is active
      const requester = await userRepository.findById(requesterId);
      if (!requester) {
        return serviceError('Requester not found', 'USER_NOT_FOUND');
      }

      if (requester.isBanned || requester.isPaused || requester.isLocked || !requester.isApproved) {
        // Provide more specific error messages
        if (!requester.isApproved) {
          return serviceError('Your account is pending approval. Please wait for admin approval before creating awareness session requests.', 'USER_NOT_APPROVED');
        }
        if (requester.isBanned) {
          return serviceError('Your account has been banned and cannot create requests.', 'USER_BANNED');
        }
        if (requester.isPaused) {
          return serviceError('Your account has been paused. Please contact support.', 'USER_PAUSED');
        }
        if (requester.isLocked) {
          return serviceError('Your account has been locked for security reasons. Please contact support.', 'USER_LOCKED');
        }

        return serviceError('Requester account is not active', 'USER_INACTIVE');
      }

      // Data is already validated at API layer and has correct types
      const requestData = data;

      // Create the request using workflow (handles transaction and history)
      const result = await awarenessSessionWorkflow.createRequest(requesterId, requestData);

      if (!result.success || !result.data) {
        return serviceError(result.error || 'Failed to create awareness session request', 'CREATE_FAILED');
      }

      this.audit({
        event: 'awareness.session.request.created' as any,
        userId: requesterId,
        resource: result.data.id,
        action: 'awareness_session_request_created',
        metadata: {
          organizationName: result.data.organizationName,
          sessionDate: result.data.sessionDate.toISOString(),
          audienceSize: result.data.audienceSize,
        },
      });

      this.logger.info('Awareness session request created successfully', {
        requestId: result.data.id,
        requesterId,
        organizationName: result.data.organizationName,
      });

      // Send notification to admin about new request
      // Note: We don't await this to avoid blocking the response
      awarenessSessionNotificationService.notifyAdminNewRequest(result.data).catch((error) => {
        this.logger.error('Failed to send admin notification for new request', {
          requestId: result.data?.id,
          error,
        });
      });

      return serviceSuccess(result.data);
    } catch (error) {
      this.logger.error('Failed to create awareness session request', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        requesterId,
        organizationName: data.organizationName,
      });
      return serviceError('Failed to create awareness session request', 'INTERNAL_ERROR');
    }
  }

  /**
   * Get awareness session request by ID
   */
  async getRequestById(
    requestId: string,
    userId: string
  ): Promise<ServiceResult<AwarenessSessionRequest>> {
    try {
      this.validateRequired(requestId, 'requestId');
      this.validateRequired(userId, 'userId');

      const request = await awarenessSessionRepository.findById(requestId);
      if (!request) {
        return serviceError('Awareness session request not found', 'REQUEST_NOT_FOUND');
      }

      // Check access permissions
      const user = await userRepository.findById(userId);
      if (!user) {
        return serviceError('User not found', 'USER_NOT_FOUND');
      }

      const hasAccess = this.checkRequestAccess(request, user);
      if (!hasAccess) {
        return serviceError('Access denied to this awareness session request', 'ACCESS_DENIED');
      }

      return serviceSuccess(request);
    } catch (error) {
      this.logger.error('Failed to get awareness session request', {
        error,
        requestId,
        userId,
      });
      return serviceError('Failed to get awareness session request', 'INTERNAL_ERROR');
    }
  }

  /**
   * Get awareness session requests for a user
   */
  async getRequestsByUser(
    userId: string,
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: AwarenessSessionStatus;
      search?: string;
      startDate?: Date;
      endDate?: Date;
      sessionMode?: import('@/types/awareness-session').SessionMode;
    }
  ): Promise<ServiceResult<{ requests: AwarenessSessionRequest[]; total: number; totalPages: number; page: number; countsByStatus?: Record<AwarenessSessionStatus, number> }>> {
    try {
      this.validateRequired(userId, 'userId');

      // Verify user exists and is active
      const user = await userRepository.findById(userId);
      if (!user) {
        this.logger.warn('User not found when fetching awareness session requests', { userId });
        return serviceError('User not found', 'USER_NOT_FOUND');
      }

      if (user.role !== 'customer') {
        this.logger.warn('Non-customer user attempting to fetch awareness session requests', {
          userId,
          role: user.role
        });
        return serviceError('Only customers can access awareness session requests', 'ACCESS_DENIED');
      }

      const repoFilters = {
        requesterId: userId,
        status: filters?.status,
        dateFrom: filters?.startDate,
        dateTo: filters?.endDate,
        sessionMode: filters?.sessionMode,
        search: filters?.search,
      } as any;

      const result = await awarenessSessionRepository.findWithFilters(repoFilters, {
        page,
        limit,
        orderBy: 'createdAt',
        orderDirection: 'desc',
      });

      const { status, ...countsFilters } = repoFilters;
      const countsByStatus = await awarenessSessionRepository.getStatusCountsForRequester(countsFilters);

      return serviceSuccess({
        requests: result.data,
        total: result.total,
        totalPages: result.totalPages,
        page,
        countsByStatus,
      });
    } catch (error) {
      this.logger.error('Failed to get user awareness session requests', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        userId,
        page,
        limit
      });
      return serviceError('Failed to get awareness session requests', 'INTERNAL_ERROR');
    }
  }

  /**
   * Update awareness session request status with validation
   */
  async updateRequestStatus(
    requestId: string,
    newStatus: AwarenessSessionStatus,
    userId: string,
    notes?: string
  ): Promise<ServiceResult<AwarenessSessionRequest>> {
    try {
      this.validateRequired(requestId, 'requestId');
      this.validateRequired(newStatus, 'newStatus');
      this.validateRequired(userId, 'userId');

      // Validate status update data
      const validationResult = updateStatusSchema.safeParse({ status: newStatus, notes });
      if (!validationResult.success) {
        return serviceError(
          `Validation failed: ${validationResult.error.issues.map((e: any) => e.message).join(', ')}`,
          'VALIDATION_ERROR'
        );
      }

      // Get current request to validate transition
      const currentRequest = await awarenessSessionRepository.findById(requestId);
      if (!currentRequest) {
        return serviceError('Awareness session request not found', 'REQUEST_NOT_FOUND');
      }

      // Validate status transition
      const isValidTransition = this.isValidStatusTransition(currentRequest.status, newStatus);
      if (!isValidTransition) {
        return serviceError(
          `Invalid status transition from ${currentRequest.status} to ${newStatus}`,
          'INVALID_TRANSITION'
        );
      }

      // Update status using workflow (handles transaction and history)
      const result = await awarenessSessionWorkflow.updateStatus(requestId, newStatus, userId, notes);

      if (!result.success || !result.data) {
        return serviceError(result.error || 'Failed to update awareness session status', 'UPDATE_FAILED');
      }

      this.audit({
        event: 'awareness.session.status.updated' as any,
        userId,
        resource: requestId,
        action: 'awareness_session_status_updated',
        metadata: {
          previousStatus: currentRequest.status,
          newStatus,
          notes,
        },
      });

      this.logger.info('Awareness session status updated successfully', {
        requestId,
        userId,
        previousStatus: currentRequest.status,
        newStatus,
      });

      // Send status change notifications
      // Note: We don't await this to avoid blocking the response
      awarenessSessionNotificationService.handleStatusChangeNotifications(result.data, currentRequest.status).catch((error) => {
        this.logger.error('Failed to send status change notifications', {
          requestId,
          newStatus,
          error,
        });
      });

      return serviceSuccess(result.data);
    } catch (error) {
      this.logger.error('Failed to update awareness session status', {
        error,
        requestId,
        newStatus,
        userId,
      });
      return serviceError('Failed to update awareness session status', 'INTERNAL_ERROR');
    }
  }

  /**
   * Assign expert to awareness session request
   */
  async assignExpert(
    requestId: string,
    expertId: string,
    adminId: string,
    notes?: string
  ): Promise<ServiceResult<AwarenessSessionRequest>> {
    try {
      this.validateRequired(requestId, 'requestId');
      this.validateRequired(expertId, 'expertId');
      this.validateRequired(adminId, 'adminId');

      // Validate assignment data
      const validationResult = assignExpertSchema.safeParse({ expertId, notes });
      if (!validationResult.success) {
        return serviceError(
          `Validation failed: ${validationResult.error.issues.map((e: any) => e.message).join(', ')}`,
          'VALIDATION_ERROR'
        );
      }

      // Verify admin permissions
      const admin = await userRepository.findById(adminId);
      if (!admin || admin.role !== 'admin') {
        return serviceError('Admin access required', 'ACCESS_DENIED');
      }

      // Verify expert exists and has expert role
      const expert = await userRepository.findById(expertId);
      if (!expert) {
        return serviceError('Expert not found', 'EXPERT_NOT_FOUND');
      }

      if (expert.role !== 'trainer') {
        return serviceError('User is not a trainer', 'INVALID_TRAINER');
      }

      if (expert.isBanned || expert.isPaused || expert.isLocked || !expert.isApproved) {
        return serviceError('Expert account is not active', 'EXPERT_INACTIVE');
      }

      // Get current request to validate state
      const currentRequest = await awarenessSessionRepository.findById(requestId);
      if (!currentRequest) {
        return serviceError('Awareness session request not found', 'REQUEST_NOT_FOUND');
      }

      if (currentRequest.status !== 'pending_admin_review') {
        return serviceError(
          'Request is not in a state that allows expert assignment',
          'INVALID_STATE'
        );
      }

      // Assign expert using workflow (handles transaction and history)
      const result = await awarenessSessionWorkflow.assignExpert(requestId, expertId, adminId, notes);

      if (!result.success || !result.data) {
        return serviceError(result.error || 'Failed to assign expert', 'ASSIGNMENT_FAILED');
      }

      this.audit({
        event: 'awareness.session.expert.assigned' as any,
        userId: adminId,
        resource: requestId,
        action: 'awareness_session_expert_assigned',
        metadata: {
          expertId,
          expertEmail: expert.email,
          notes,
        },
      });

      this.logger.info('Expert assigned to awareness session successfully', {
        requestId,
        expertId,
        adminId,
        expertEmail: expert.email,
      });

      // Send status change notifications (includes expert assignment notification)
      // Note: We don't await this to avoid blocking the response
      awarenessSessionNotificationService.handleStatusChangeNotifications(result.data, currentRequest.status).catch((error) => {
        this.logger.error('Failed to send expert assignment notifications', {
          requestId,
          expertId,
          error,
        });
      });

      return serviceSuccess(result.data);
    } catch (error) {
      this.logger.error('Failed to assign expert to awareness session', {
        error,
        requestId,
        expertId,
        adminId,
      });
      return serviceError('Failed to assign expert', 'INTERNAL_ERROR');
    }
  }

  /**
   * Admin review of awareness session request
   */
  async adminReview(
    requestId: string,
    adminId: string,
    reviewAction: AdminReviewAction
  ): Promise<ServiceResult<AwarenessSessionRequest>> {
    try {
      this.validateRequired(requestId, 'requestId');
      this.validateRequired(adminId, 'adminId');
      this.validateRequired(reviewAction, 'reviewAction');

      // Validate review action data
      const validationResult = reviewAwarenessSessionSchema.safeParse(reviewAction);
      if (!validationResult.success) {
        return serviceError(
          `Validation failed: ${validationResult.error.issues.map((e: any) => e.message).join(', ')}`,
          'VALIDATION_ERROR'
        );
      }

      // Verify admin permissions
      const admin = await userRepository.findById(adminId);
      if (!admin || admin.role !== 'admin') {
        return serviceError('Admin access required', 'ACCESS_DENIED');
      }

      // If approving, verify expert exists
      if (reviewAction.action === 'approve' && reviewAction.expertId) {
        const expert = await userRepository.findById(reviewAction.expertId);
        if (!expert) {
          return serviceError('Expert not found', 'EXPERT_NOT_FOUND');
        }

        if (expert.role !== 'trainer') {
          return serviceError('User is not a trainer', 'INVALID_TRAINER');
        }

        if (expert.isBanned || expert.isPaused || expert.isLocked || !expert.isApproved) {
          return serviceError('Expert account is not active', 'EXPERT_INACTIVE');
        }
      }

      // Perform admin review using workflow (handles transaction and history)
      const result = await awarenessSessionWorkflow.adminReview(
        requestId,
        adminId,
        reviewAction.action,
        reviewAction.notes,
        reviewAction.expertId
      );

      if (!result.success || !result.data) {
        return serviceError(result.error || 'Failed to process admin review', 'REVIEW_FAILED');
      }

      this.audit({
        event: `awareness.session.${reviewAction.action}d` as any,
        userId: adminId,
        resource: requestId,
        action: `awareness_session_${reviewAction.action}d`,
        metadata: {
          action: reviewAction.action,
          expertId: reviewAction.expertId,
          notes: reviewAction.notes,
        },
      });

      this.logger.info(`Awareness session ${reviewAction.action}d by admin`, {
        requestId,
        adminId,
        action: reviewAction.action,
        expertId: reviewAction.expertId,
      });

      // Get the current request to determine previous status
      const currentRequest = await awarenessSessionRepository.findById(requestId);
      const previousStatus = currentRequest?.status;

      // Send status change notifications
      // Note: We don't await this to avoid blocking the response
      awarenessSessionNotificationService.handleStatusChangeNotifications(result.data, previousStatus).catch((error) => {
        this.logger.error('Failed to send admin review notifications', {
          requestId,
          action: reviewAction.action,
          error,
        });
      });

      return serviceSuccess(result.data);
    } catch (error) {
      this.logger.error('Failed to process admin review', {
        error,
        requestId,
        adminId,
        action: reviewAction.action,
      });
      return serviceError('Failed to process admin review', 'INTERNAL_ERROR');
    }
  }

  /**
   * Expert response to awareness session request
   */
  async expertResponse(
    requestId: string,
    expertId: string,
    responseAction: ExpertResponseAction
  ): Promise<ServiceResult<AwarenessSessionRequest>> {
    try {
      this.validateRequired(requestId, 'requestId');
      this.validateRequired(expertId, 'expertId');
      this.validateRequired(responseAction, 'responseAction');

      // Validate response action data
      const validationResult = respondToAwarenessSessionSchema.safeParse(responseAction);
      if (!validationResult.success) {
        return serviceError(
          `Validation failed: ${validationResult.error.issues.map((e: any) => e.message).join(', ')}`,
          'VALIDATION_ERROR'
        );
      }

      // Verify expert/trainer permissions
      const expert = await userRepository.findById(expertId);
      if (!expert || (expert.role !== 'expert' && expert.role !== 'trainer')) {
        return serviceError('Expert access required', 'ACCESS_DENIED');
      }

      if (expert.isBanned || expert.isPaused || expert.isLocked || !expert.isApproved) {
        return serviceError('Expert account is not active', 'EXPERT_INACTIVE');
      }

      // Perform expert response using workflow (handles transaction and history)
      const result = await awarenessSessionWorkflow.expertResponse(
        requestId,
        expertId,
        responseAction.action,
        responseAction.notes
      );

      if (!result.success || !result.data) {
        return serviceError(result.error || 'Failed to process expert response', 'RESPONSE_FAILED');
      }

      this.audit({
        event: `awareness.session.expert.${responseAction.action}ed` as any,
        userId: expertId,
        resource: requestId,
        action: `awareness_session_expert_${responseAction.action}ed`,
        metadata: {
          action: responseAction.action,
          notes: responseAction.notes,
        },
      });

      this.logger.info(`Expert ${responseAction.action}ed awareness session`, {
        requestId,
        expertId,
        action: responseAction.action,
      });

      // Get the current request to determine previous status
      const currentRequest = await awarenessSessionRepository.findById(requestId);
      const previousStatus = currentRequest?.status;

      // Send status change notifications
      // Note: We don't await this to avoid blocking the response
      awarenessSessionNotificationService.handleStatusChangeNotifications(result.data, previousStatus).catch((error) => {
        this.logger.error('Failed to send expert response notifications', {
          requestId,
          action: responseAction.action,
          error,
        });
      });

      return serviceSuccess(result.data);
    } catch (error) {
      this.logger.error('Failed to process expert response', {
        error,
        requestId,
        expertId,
        action: responseAction.action,
      });
      return serviceError('Failed to process expert response', 'INTERNAL_ERROR');
    }
  }

  /**
   * Get awareness session requests for admin dashboard
   */
  async getRequestsForAdmin(
    page: number = 1,
    limit: number = 20,
    status?: AwarenessSessionStatus,
    filters?: {
      search?: string;
      startDate?: Date;
      endDate?: Date;
      sessionMode?: import('@/types/awareness-session').SessionMode;
    }
  ): Promise<ServiceResult<{ requests: AwarenessSessionRequest[]; total: number; totalPages: number; page: number; countsByStatus?: Record<AwarenessSessionStatus, number> }>> {
    try {
      this.logger.info('Getting awareness session requests for admin', {
        page,
        limit,
        status,
      });

      // Validate input parameters
      if (page < 1) {
        return serviceError('Page number must be greater than 0', 'INVALID_PARAMETER');
      }
      if (limit < 1 || limit > 100) {
        return serviceError('Limit must be between 1 and 100', 'INVALID_PARAMETER');
      }

      const repoFilters: any = {
        status,
        dateFrom: filters?.startDate,
        dateTo: filters?.endDate,
        sessionMode: filters?.sessionMode,
        search: filters?.search,
      };

      const result = await awarenessSessionRepository.findWithFilters(
        repoFilters,
        { page, limit, orderBy: 'createdAt', orderDirection: 'desc' }
      );

      // Compute counts per status for tabs under same non-status filters
      const { status: _omitStatus, requesterId: _r, assignedExpertId: _e, ...countsFilters } = repoFilters;
      const countsByStatus = await awarenessSessionRepository.getStatusCountsForAdmin(countsFilters);

      this.logger.info('Successfully retrieved awareness session requests', {
        totalRequests: result.total,
        returnedRequests: result.data.length,
        totalPages: result.totalPages,
      });

      return serviceSuccess({
        requests: result.data,
        total: result.total,
        totalPages: result.totalPages,
        page,
        countsByStatus,
      });
    } catch (error) {
      this.logger.error('Failed to get awareness session requests for admin', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        page,
        limit,
        status,
      });
      return serviceError(`Failed to get awareness session requests: ${error instanceof Error ? error.message : 'Unknown error'}`, 'INTERNAL_ERROR');
    }
  }

  /**
   * Get awareness session requests for expert dashboard
   */
  async getRequestsForExpert(
    expertId: string,
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: AwarenessSessionStatus;
      search?: string;
      startDate?: Date;
      endDate?: Date;
      sessionMode?: import('@/types/awareness-session').SessionMode;
    }
  ): Promise<ServiceResult<{ requests: AwarenessSessionRequest[]; total: number; totalPages: number; page: number; countsByStatus?: Record<AwarenessSessionStatus, number> }>> {
    try {
      this.validateRequired(expertId, 'expertId');

      // Verify expert/trainer permissions
      const expert = await userRepository.findById(expertId);
      if (!expert || expert.role !== 'trainer') {
        return serviceError('Trainer access required', 'ACCESS_DENIED');
      }

      // Build repository filters
      const repoFilters = {
        assignedExpertId: expertId,
        status: filters?.status,
        dateFrom: filters?.startDate,
        dateTo: filters?.endDate,
        sessionMode: filters?.sessionMode,
        search: filters?.search,
      } as any;

      const result = await awarenessSessionRepository.findWithFilters(repoFilters, {
        page,
        limit,
        orderBy: 'createdAt',
        orderDirection: 'desc',
      });

      // For tab counts: compute counts by status for this expert under the same non-status filters
      const { status, ...countsFilters } = repoFilters;
      const countsByStatus = await awarenessSessionRepository.getStatusCountsForExpert(countsFilters);

      return serviceSuccess({
        requests: result.data,
        total: result.total,
        totalPages: result.totalPages,
        page,
        countsByStatus,
      });
    } catch (error) {
      this.logger.error('Failed to get awareness session requests for expert', {
        error,
        expertId,
      });
      return serviceError('Failed to get awareness session requests', 'INTERNAL_ERROR');
    }
  }

  /**
   * Get status history for awareness session request
   */
  async getStatusHistory(
    requestId: string,
    userId: string
  ): Promise<ServiceResult<AwarenessSessionStatusHistory[]>> {
    try {
      this.validateRequired(requestId, 'requestId');
      this.validateRequired(userId, 'userId');

      // Get the request to check access permissions
      const request = await awarenessSessionRepository.findById(requestId);
      if (!request) {
        return serviceError('Awareness session request not found', 'REQUEST_NOT_FOUND');
      }

      // Check access permissions
      const user = await userRepository.findById(userId);
      if (!user) {
        return serviceError('User not found', 'USER_NOT_FOUND');
      }

      const hasAccess = this.checkRequestAccess(request, user);
      if (!hasAccess) {
        return serviceError('Access denied to this awareness session request', 'ACCESS_DENIED');
      }

      // Get status history
      const history = await awarenessSessionRepository.getStatusHistory(requestId);
      return serviceSuccess(history);
    } catch (error) {
      this.logger.error('Failed to get awareness session status history', {
        error,
        requestId,
        userId,
      });
      return serviceError('Failed to get status history', 'INTERNAL_ERROR');
    }
  }

  /**
   * Get awareness session statistics
   */
  async getStatistics(): Promise<ServiceResult<Record<AwarenessSessionStatus, number>>> {
    try {
      const statistics = await awarenessSessionRepository.getStatistics();
      return serviceSuccess(statistics);
    } catch (error) {
      this.logger.error('Failed to get awareness session statistics', { error });
      return serviceError('Failed to get statistics', 'INTERNAL_ERROR');
    }
  }

  /**
   * Check if user has access to view a specific request
   */
  private checkRequestAccess(request: AwarenessSessionRequest, user: any): boolean {
    // Admin can access all requests
    if (user.role === 'admin') {
      return true;
    }

    // Requester can access their own requests
    if (request.requesterId === user.id) {
      return true;
    }

    // Expert can access requests assigned to them
    if (user.role === 'expert' && request.assignedExpertId === user.id) {
      return true;
    }

    return false;
  }

  /**
   * Validate status transition
   */
  private isValidStatusTransition(currentStatus: AwarenessSessionStatus, newStatus: AwarenessSessionStatus): boolean {
    const validTransitions: Record<AwarenessSessionStatus, AwarenessSessionStatus[]> = {
      'pending_admin_review': ['forwarded_to_expert', 'rejected'],
      'forwarded_to_expert': ['confirmed', 'expert_declined'],
      'expert_declined': ['forwarded_to_expert', 'rejected'],
      'confirmed': [], // Terminal state
      'rejected': [], // Terminal state
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }
}

// Export singleton instance
export const awarenessSessionService = new AwarenessSessionService();
