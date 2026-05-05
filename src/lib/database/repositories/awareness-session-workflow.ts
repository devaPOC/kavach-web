import { transactionService } from '../transaction-service';
import { awarenessSessionRepository } from './awareness-session-repository';
import { logger } from '@/lib/utils/logger';
import type { 
  AwarenessSessionRequest,
  AwarenessSessionStatus,
  CreateAwarenessSessionData
} from '@/types/awareness-session';

/**
 * Workflow utilities for awareness session requests that handle
 * database transactions and status history tracking
 */
export class AwarenessSessionWorkflow {
  /**
   * Create a new awareness session request with initial status history
   */
  static async createRequest(
    requesterId: string,
    data: CreateAwarenessSessionData
  ): Promise<{ success: boolean; data?: AwarenessSessionRequest; error?: string }> {
    const result = await transactionService.executeInTransaction(async (tx) => {
      // Create the awareness session request
      const sessionRequest = await awarenessSessionRepository.createInTransaction(tx, {
        ...data,
        requesterId,
      });

      // Add initial status history entry
      await awarenessSessionRepository.addStatusHistoryInTransaction(
        tx,
        sessionRequest.id,
        null,
        'pending_admin_review',
        requesterId,
        'Initial request submission'
      );

      return sessionRequest;
    }, 'create-awareness-session-request');

    return {
      success: result.success,
      data: result.data,
      error: result.error,
    };
  }

  /**
   * Update awareness session status with history tracking
   */
  static async updateStatus(
    sessionId: string,
    newStatus: AwarenessSessionStatus,
    changedBy: string,
    notes?: string
  ): Promise<{ success: boolean; data?: AwarenessSessionRequest; error?: string }> {
    const result = await transactionService.executeInTransaction(async (tx) => {
      // Get current session to track previous status
      const currentSession = await awarenessSessionRepository.findByIdInTransaction(tx, sessionId);
      if (!currentSession) {
        throw new Error('Awareness session request not found');
      }

      const previousStatus = currentSession.status;

      // Update the session status
      const updatedSession = await awarenessSessionRepository.updateStatusInTransaction(
        tx,
        sessionId,
        newStatus,
        notes
      );

      if (!updatedSession) {
        throw new Error('Failed to update awareness session status');
      }

      // Add status history entry
      await awarenessSessionRepository.addStatusHistoryInTransaction(
        tx,
        sessionId,
        previousStatus,
        newStatus,
        changedBy,
        notes
      );

      return updatedSession;
    }, 'update-awareness-session-status');

    return {
      success: result.success,
      data: result.data,
      error: result.error,
    };
  }

  /**
   * Assign expert to awareness session request with history tracking
   */
  static async assignExpert(
    sessionId: string,
    expertId: string,
    adminId: string,
    notes?: string
  ): Promise<{ success: boolean; data?: AwarenessSessionRequest; error?: string }> {
    const result = await transactionService.executeInTransaction(async (tx) => {
      // Get current session to track previous status
      const currentSession = await awarenessSessionRepository.findByIdInTransaction(tx, sessionId);
      if (!currentSession) {
        throw new Error('Awareness session request not found');
      }

      const previousStatus = currentSession.status;

      // Assign expert (this also updates status to 'forwarded_to_expert')
      const updatedSession = await awarenessSessionRepository.assignExpertInTransaction(
        tx,
        sessionId,
        expertId,
        notes
      );

      if (!updatedSession) {
        throw new Error('Failed to assign expert to awareness session');
      }

      // Add status history entry
      await awarenessSessionRepository.addStatusHistoryInTransaction(
        tx,
        sessionId,
        previousStatus,
        'forwarded_to_expert',
        adminId,
        notes || `Assigned to expert ${expertId}`
      );

      return updatedSession;
    }, 'assign-expert-to-awareness-session');

    return {
      success: result.success,
      data: result.data,
      error: result.error,
    };
  }

  /**
   * Expert response to awareness session request with history tracking
   */
  static async expertResponse(
    sessionId: string,
    expertId: string,
    action: 'accept' | 'decline',
    notes?: string
  ): Promise<{ success: boolean; data?: AwarenessSessionRequest; error?: string }> {
    const result = await transactionService.executeInTransaction(async (tx) => {
      // Get current session to validate expert assignment
      const currentSession = await awarenessSessionRepository.findByIdInTransaction(tx, sessionId);
      if (!currentSession) {
        throw new Error('Awareness session request not found');
      }

      if (currentSession.assignedExpertId !== expertId) {
        throw new Error('Expert is not assigned to this awareness session request');
      }

      if (currentSession.status !== 'forwarded_to_expert') {
        throw new Error('Awareness session request is not in a state that allows expert response');
      }

      const previousStatus = currentSession.status;
      const newStatus: AwarenessSessionStatus = action === 'accept' ? 'confirmed' : 'expert_declined';

      // Update the session status
      const updatedSession = await awarenessSessionRepository.updateStatusInTransaction(
        tx,
        sessionId,
        newStatus,
        notes
      );

      if (!updatedSession) {
        throw new Error('Failed to update awareness session status');
      }

      // Add status history entry
      await awarenessSessionRepository.addStatusHistoryInTransaction(
        tx,
        sessionId,
        previousStatus,
        newStatus,
        expertId,
        notes || `Expert ${action}ed the request`
      );

      return updatedSession;
    }, 'expert-response-to-awareness-session');

    return {
      success: result.success,
      data: result.data,
      error: result.error,
    };
  }

  /**
   * Admin review of awareness session request with history tracking
   */
  static async adminReview(
    sessionId: string,
    adminId: string,
    action: 'approve' | 'reject',
    notes?: string,
    expertId?: string
  ): Promise<{ success: boolean; data?: AwarenessSessionRequest; error?: string }> {
    const result = await transactionService.executeInTransaction(async (tx) => {
      logger.info('Admin review: Finding session in transaction', { sessionId, action });
      
      // Get current session to validate state
      const currentSession = await awarenessSessionRepository.findByIdInTransaction(tx, sessionId);
      if (!currentSession) {
        throw new Error('Awareness session request not found');
      }

      logger.info('Admin review: Session found, validating state', { 
        sessionId, 
        currentStatus: currentSession.status, 
        action 
      });

      if (currentSession.status !== 'pending_admin_review' && currentSession.status !== 'expert_declined') {
        throw new Error('Awareness session request is not in a reviewable state');
      }

      const previousStatus = currentSession.status;
      let updatedSession: AwarenessSessionRequest | null;

      if (action === 'approve') {
        if (!expertId) {
          throw new Error('Expert ID is required when approving a request');
        }

        logger.info('Admin review: Approving and assigning expert', { sessionId, expertId });

        // Assign expert (this also updates status to 'forwarded_to_expert')
        updatedSession = await awarenessSessionRepository.assignExpertInTransaction(
          tx,
          sessionId,
          expertId,
          notes
        );

        logger.info('Admin review: Expert assigned, adding status history', { sessionId });

        // Add status history entry for approval and expert assignment
        await awarenessSessionRepository.addStatusHistoryInTransaction(
          tx,
          sessionId,
          previousStatus,
          'forwarded_to_expert',
          adminId,
          notes || `Approved and assigned to expert ${expertId}`
        );
      } else {
        logger.info('Admin review: Rejecting request', { sessionId });

        // Reject the request
        updatedSession = await awarenessSessionRepository.updateStatusInTransaction(
          tx,
          sessionId,
          'rejected',
          notes
        );

        logger.info('Admin review: Request rejected, adding status history', { sessionId });

        // Add status history entry for rejection
        await awarenessSessionRepository.addStatusHistoryInTransaction(
          tx,
          sessionId,
          previousStatus,
          'rejected',
          adminId,
          notes || 'Request rejected by admin'
        );
      }

      if (!updatedSession) {
        throw new Error(`Failed to ${action} awareness session request`);
      }

      logger.info('Admin review: Transaction completed successfully', { 
        sessionId, 
        action, 
        newStatus: updatedSession.status 
      });

      return updatedSession;
    }, 'admin-review-awareness-session');

    return {
      success: result.success,
      data: result.data,
      error: result.error,
    };
  }

  /**
   * Get complete awareness session request with status history
   */
  static async getRequestWithHistory(sessionId: string): Promise<{
    request: AwarenessSessionRequest | null;
    history: any[];
  }> {
    const request = await awarenessSessionRepository.findById(sessionId);
    const history = request ? await awarenessSessionRepository.getStatusHistory(sessionId) : [];

    return {
      request,
      history,
    };
  }
}

// Export singleton instance
export const awarenessSessionWorkflow = AwarenessSessionWorkflow;