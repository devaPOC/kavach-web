import { BaseService, ServiceResult, serviceSuccess, serviceError } from './base.service';
import { emailService } from '@/lib/email/email-service';
import { userRepository } from '@/lib/database/repositories/user-repository';
import type { AwarenessSessionRequest, AwarenessSessionStatus } from '@/types/awareness-session';

/**
 * Service for managing awareness session notifications
 * Handles all email notifications related to awareness session workflow
 */
export class AwarenessSessionNotificationService extends BaseService {
  /**
   * Send notification to admin when a new request is submitted
   */
  async notifyAdminNewRequest(request: AwarenessSessionRequest): Promise<ServiceResult<void>> {
    try {
      this.validateRequired(request, 'request');

      // Get requester information
      const requester = await userRepository.findById(request.requesterId);
      if (!requester) {
        return serviceError('Requester not found', 'USER_NOT_FOUND');
      }

      // Get admin users
      const admins = await userRepository.findByRole('admin');
      if (!admins || admins.length === 0) {
        this.logger.warn('No admin users found for awareness session notification', {
          requestId: request.id,
        });
        return serviceError('No admin users found', 'NO_ADMINS');
      }

      const requesterName = `${requester.firstName} ${requester.lastName}`;

      // Send notification to all admins
      const notificationPromises = admins.map(async (admin: any) => {
        try {
          const result = await emailService.sendAwarenessSessionNewRequestNotification({
            adminEmail: admin.email,
            request,
            requesterName,
          });

          if (!result.success) {
            this.logger.error('Failed to send new request notification to admin', {
              adminId: admin.id,
              adminEmail: admin.email,
              requestId: request.id,
              error: result.error,
            });
          }

          return result;
        } catch (error) {
          this.logger.error('Error sending new request notification to admin', {
            adminId: admin.id,
            adminEmail: admin.email,
            requestId: request.id,
            error,
          });
          return { success: false, error: 'Failed to send notification' };
        }
      });

      const results = await Promise.allSettled(notificationPromises);
      const successCount = results.filter(
        (result: any) => result.status === 'fulfilled' && result.value.success
      ).length;

      this.audit({
        event: 'awareness.session.notification.admin.new_request' as any,
        userId: request.requesterId,
        resource: request.id,
        action: 'awareness_session_admin_notification_sent',
        metadata: {
          adminCount: admins.length,
          successCount,
          organizationName: request.organizationName,
        },
      });

      this.logger.info('Admin new request notifications sent', {
        requestId: request.id,
        adminCount: admins.length,
        successCount,
      });

      if (successCount === 0) {
        return serviceError('Failed to send notifications to any admin', 'NOTIFICATION_FAILED');
      }

      return serviceSuccess(undefined);
    } catch (error) {
      this.logger.error('Failed to notify admin of new request', {
        error,
        requestId: request.id,
      });
      return serviceError('Failed to send admin notification', 'INTERNAL_ERROR');
    }
  }

  /**
   * Send notification to expert when assigned to a request
   */
  async notifyExpertAssignment(request: AwarenessSessionRequest, expertId: string): Promise<ServiceResult<void>> {
    try {
      this.validateRequired(request, 'request');
      this.validateRequired(expertId, 'expertId');

      // Get expert information
      const expert = await userRepository.findById(expertId);
      if (!expert) {
        return serviceError('Expert not found', 'EXPERT_NOT_FOUND');
      }

      // Get requester information
      const requester = await userRepository.findById(request.requesterId);
      if (!requester) {
        return serviceError('Requester not found', 'USER_NOT_FOUND');
      }

      const expertName = `${expert.firstName} ${expert.lastName}`;
      const requesterName = `${requester.firstName} ${requester.lastName}`;

      // Send notification to expert
      const result = await emailService.sendAwarenessSessionExpertAssignmentNotification({
        expertEmail: expert.email,
        expertName,
        request,
        requesterName,
      });

      if (!result.success) {
        this.logger.error('Failed to send expert assignment notification', {
          expertId,
          expertEmail: expert.email,
          requestId: request.id,
          error: result.error,
        });
        return serviceError('Failed to send expert notification', 'NOTIFICATION_FAILED');
      }

      this.audit({
        event: 'awareness.session.notification.expert.assignment' as any,
        userId: expertId,
        resource: request.id,
        action: 'awareness_session_expert_notification_sent',
        metadata: {
          expertEmail: expert.email,
          organizationName: request.organizationName,
        },
      });

      this.logger.info('Expert assignment notification sent', {
        requestId: request.id,
        expertId,
        expertEmail: expert.email,
      });

      return serviceSuccess(undefined);
    } catch (error) {
      this.logger.error('Failed to notify expert of assignment', {
        error,
        requestId: request.id,
        expertId,
      });
      return serviceError('Failed to send expert notification', 'INTERNAL_ERROR');
    }
  }

  /**
   * Send status change notification to requester
   */
  async notifyRequesterStatusChange(
    request: AwarenessSessionRequest,
    previousStatus?: AwarenessSessionStatus
  ): Promise<ServiceResult<void>> {
    try {
      this.validateRequired(request, 'request');

      // Get requester information
      const requester = await userRepository.findById(request.requesterId);
      if (!requester) {
        return serviceError('Requester not found', 'USER_NOT_FOUND');
      }

      const requesterName = `${requester.firstName} ${requester.lastName}`;
      let expertName: string | undefined;

      // Get expert information if assigned
      if (request.assignedExpertId) {
        const expert = await userRepository.findById(request.assignedExpertId);
        if (expert) {
          expertName = `${expert.firstName} ${expert.lastName}`;
        }
      }

      // Send notification to requester
      const result = await emailService.sendAwarenessSessionStatusChangeNotification({
        requesterEmail: requester.email,
        requesterName,
        request,
        expertName,
        previousStatus,
      });

      if (!result.success) {
        this.logger.error('Failed to send status change notification to requester', {
          requesterId: request.requesterId,
          requesterEmail: requester.email,
          requestId: request.id,
          status: request.status,
          error: result.error,
        });
        return serviceError('Failed to send requester notification', 'NOTIFICATION_FAILED');
      }

      this.audit({
        event: 'awareness.session.notification.requester.status_change' as any,
        userId: request.requesterId,
        resource: request.id,
        action: 'awareness_session_requester_notification_sent',
        metadata: {
          requesterEmail: requester.email,
          previousStatus,
          newStatus: request.status,
          organizationName: request.organizationName,
        },
      });

      this.logger.info('Requester status change notification sent', {
        requestId: request.id,
        requesterId: request.requesterId,
        requesterEmail: requester.email,
        previousStatus,
        newStatus: request.status,
      });

      return serviceSuccess(undefined);
    } catch (error) {
      this.logger.error('Failed to notify requester of status change', {
        error,
        requestId: request.id,
        status: request.status,
      });
      return serviceError('Failed to send requester notification', 'INTERNAL_ERROR');
    }
  }

  /**
   * Send notification to admin when expert responds to assignment
   */
  async notifyAdminExpertResponse(
    request: AwarenessSessionRequest,
    expertId: string,
    action: 'accept' | 'decline',
    notes?: string
  ): Promise<ServiceResult<void>> {
    try {
      this.validateRequired(request, 'request');
      this.validateRequired(expertId, 'expertId');
      this.validateRequired(action, 'action');

      // Get expert information
      const expert = await userRepository.findById(expertId);
      if (!expert) {
        return serviceError('Expert not found', 'EXPERT_NOT_FOUND');
      }

      // Get admin users
      const admins = await userRepository.findByRole('admin');
      if (!admins || admins.length === 0) {
        this.logger.warn('No admin users found for expert response notification', {
          requestId: request.id,
          expertId,
        });
        return serviceError('No admin users found', 'NO_ADMINS');
      }

      const expertName = `${expert.firstName} ${expert.lastName}`;
      const actionText = action === 'accept' ? 'accepted' : 'declined';
      const subject = `Expert ${actionText.charAt(0).toUpperCase() + actionText.slice(1)} - ${request.organizationName} Awareness Session`;

      // Create notification content
      const html = `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h2 style="color: #1f2937;">Expert Response - ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}</h2>
          <p>Hello Admin,</p>
          <p><strong>${expertName}</strong> has <strong>${actionText}</strong> the awareness session assignment for <strong>${request.organizationName}</strong>.</p>

          <div style="background-color: ${action === 'accept' ? '#f0fdf4' : '#fef2f2'}; border-left: 4px solid ${action === 'accept' ? '#059669' : '#ef4444'}; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: ${action === 'accept' ? '#059669' : '#dc2626'};">Response Details:</h3>
            <p style="margin: 5px 0;"><strong>Expert:</strong> ${expertName}</p>
            <p style="margin: 5px 0;"><strong>Action:</strong> ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}</p>
            <p style="margin: 5px 0;"><strong>Request ID:</strong> ${request.id}</p>
            <p style="margin: 5px 0;"><strong>Organization:</strong> ${request.organizationName}</p>
            ${notes ? `<p style="margin: 5px 0;"><strong>Notes:</strong> ${notes}</p>` : ''}
          </div>

          ${action === 'decline' ? `
          <p style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <strong>Action Required:</strong> Please assign another expert to this request or contact the requester if no suitable expert is available.
          </p>
          ` : `
          <p style="background-color: #f0fdf4; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <strong>Great News:</strong> The session is now confirmed and the requester has been notified.
          </p>
          `}

          <p style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/dashboard?tab=awareness-sessions"
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Request Details
            </a>
          </p>

          <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
            This is an automated notification from the Kavach Admin System.
          </p>
        </div>
      `;

      const text = `
Expert Response - ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}

Hello Admin,

${expertName} has ${actionText} the awareness session assignment for ${request.organizationName}.

Response Details:
- Expert: ${expertName}
- Action: ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}
- Request ID: ${request.id}
- Organization: ${request.organizationName}
${notes ? `- Notes: ${notes}` : ''}

${action === 'decline' ? `
ACTION REQUIRED: Please assign another expert to this request or contact the requester if no suitable expert is available.
` : `
GREAT NEWS: The session is now confirmed and the requester has been notified.
`}

View request details: ${process.env.NEXT_PUBLIC_APP_URL}/admin/dashboard?tab=awareness-sessions

This is an automated notification from the Kavach Admin System.
      `;

      // Send notification to all admins
      const notificationPromises = admins.map(async (admin: any) => {
        try {
          const result = await emailService.sendEmail({
            to: admin.email,
            subject,
            html,
            text,
          });

          if (!result.success) {
            this.logger.error('Failed to send expert response notification to admin', {
              adminId: admin.id,
              adminEmail: admin.email,
              requestId: request.id,
              expertId,
              action,
              error: result.error,
            });
          }

          return result;
        } catch (error) {
          this.logger.error('Error sending expert response notification to admin', {
            adminId: admin.id,
            adminEmail: admin.email,
            requestId: request.id,
            expertId,
            action,
            error,
          });
          return { success: false, error: 'Failed to send notification' };
        }
      });

      const results = await Promise.allSettled(notificationPromises);
      const successCount = results.filter(
        (result: any) => result.status === 'fulfilled' && result.value.success
      ).length;

      this.audit({
        event: 'awareness.session.notification.admin.expert_response' as any,
        userId: expertId,
        resource: request.id,
        action: 'awareness_session_admin_expert_response_notification_sent',
        metadata: {
          adminCount: admins.length,
          successCount,
          expertAction: action,
          organizationName: request.organizationName,
        },
      });

      this.logger.info('Admin expert response notifications sent', {
        requestId: request.id,
        expertId,
        action,
        adminCount: admins.length,
        successCount,
      });

      if (successCount === 0) {
        return serviceError('Failed to send notifications to any admin', 'NOTIFICATION_FAILED');
      }

      return serviceSuccess(undefined);
    } catch (error) {
      this.logger.error('Failed to notify admin of expert response', {
        error,
        requestId: request.id,
        expertId,
        action,
      });
      return serviceError('Failed to send admin notification', 'INTERNAL_ERROR');
    }
  }

  /**
   * Send all relevant notifications for a status change
   * This is the main method that should be called when status changes occur
   */
  async handleStatusChangeNotifications(
    request: AwarenessSessionRequest,
    previousStatus?: AwarenessSessionStatus
  ): Promise<ServiceResult<void>> {
    try {
      const notifications: Promise<ServiceResult<void>>[] = [];

      // Always notify requester of status changes
      notifications.push(this.notifyRequesterStatusChange(request, previousStatus));

      // Send expert assignment notification when forwarded to expert
      if (request.status === 'forwarded_to_expert' && request.assignedExpertId) {
        notifications.push(this.notifyExpertAssignment(request, request.assignedExpertId));
      }

      // Send admin notification when expert responds
      if (request.status === 'confirmed' || request.status === 'expert_declined') {
        const action = request.status === 'confirmed' ? 'accept' : 'decline';
        if (request.assignedExpertId) {
          notifications.push(
            this.notifyAdminExpertResponse(request, request.assignedExpertId, action, request.expertNotes)
          );
        }
      }

      // Wait for all notifications to complete
      const results = await Promise.allSettled(notifications);
      const failures = results.filter((result) => 
        result.status === 'rejected' || 
        (result.status === 'fulfilled' && !result.value.success)
      );

      if (failures.length > 0) {
        this.logger.warn('Some status change notifications failed', {
          requestId: request.id,
          status: request.status,
          failureCount: failures.length,
          totalCount: results.length,
        });
      }

      this.logger.info('Status change notifications processed', {
        requestId: request.id,
        status: request.status,
        successCount: results.length - failures.length,
        totalCount: results.length,
      });

      return serviceSuccess(undefined);
    } catch (error) {
      this.logger.error('Failed to handle status change notifications', {
        error,
        requestId: request.id,
        status: request.status,
      });
      return serviceError('Failed to handle notifications', 'INTERNAL_ERROR');
    }
  }
}

// Export singleton instance
export const awarenessSessionNotificationService = new AwarenessSessionNotificationService();