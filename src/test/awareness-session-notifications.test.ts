/**
 * Test suite for awareness session notification system integration
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { awarenessSessionNotificationService } from '@/lib/services/awareness-session-notification.service';
import { emailService } from '@/lib/email/email-service';
import { userRepository } from '@/lib/database/repositories/user-repository';
import type { AwarenessSessionRequest } from '@/types/awareness-session';

// Mock dependencies
vi.mock('@/lib/email/email-service');
vi.mock('@/lib/database/repositories/user-repository');

const mockEmailService = vi.mocked(emailService);
const mockUserRepository = vi.mocked(userRepository);

describe('Awareness Session Notification Service', () => {
  const mockRequest: AwarenessSessionRequest = {
    id: 'test-request-id',
    requesterId: 'test-requester-id',
    sessionDate: new Date('2025-02-15T10:00:00Z'),
    location: 'Test Location',
    duration: '2_hours',
    subject: 'Cybersecurity Awareness Training',
    audienceSize: 50,
    audienceTypes: ['corporate_staff'],
    sessionMode: 'on_site',
    organizationName: 'Test Organization',
    contactEmail: 'contact@test.com',
    contactPhone: '+1234567890',
    status: 'pending_admin_review',
    createdAt: new Date('2025-01-15T10:00:00Z'),
    updatedAt: new Date('2025-01-15T10:00:00Z'),
  };

  const mockRequester = {
    id: 'test-requester-id',
    email: 'requester@test.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'customer' as const,
  };

  const mockAdmin = {
    id: 'test-admin-id',
    email: 'admin@test.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin' as const,
  };

  const mockExpert = {
    id: 'test-expert-id',
    email: 'expert@test.com',
    firstName: 'Jane',
    lastName: 'Expert',
    role: 'expert' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockUserRepository.findById.mockImplementation(async (id: string) => {
      if (id === 'test-requester-id') return mockRequester as any;
      if (id === 'test-admin-id') return mockAdmin as any;
      if (id === 'test-expert-id') return mockExpert as any;
      return null;
    });

    mockUserRepository.findByRole.mockImplementation(async (role: string) => {
      if (role === 'admin') return [mockAdmin] as any;
      return [] as any;
    });

    mockEmailService.sendAwarenessSessionNewRequestNotification.mockResolvedValue({
      success: true,
      messageId: 'test-message-id',
    });

    mockEmailService.sendAwarenessSessionExpertAssignmentNotification.mockResolvedValue({
      success: true,
      messageId: 'test-message-id',
    });

    mockEmailService.sendAwarenessSessionStatusChangeNotification.mockResolvedValue({
      success: true,
      messageId: 'test-message-id',
    });

    mockEmailService.sendEmail.mockResolvedValue({
      success: true,
      messageId: 'test-message-id',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('notifyAdminNewRequest', () => {
    it('should send notification to admin when new request is submitted', async () => {
      const result = await awarenessSessionNotificationService.notifyAdminNewRequest(mockRequest);

      expect(result.success).toBe(true);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('test-requester-id');
      expect(mockUserRepository.findByRole).toHaveBeenCalledWith('admin');
      expect(mockEmailService.sendAwarenessSessionNewRequestNotification).toHaveBeenCalledWith({
        adminEmail: 'admin@test.com',
        request: mockRequest,
        requesterName: 'John Doe',
      });
    });

    it('should handle case when no admins are found', async () => {
      mockUserRepository.findByRole.mockResolvedValue([]);

      const result = await awarenessSessionNotificationService.notifyAdminNewRequest(mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No admin users found');
    });

    it('should handle case when requester is not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await awarenessSessionNotificationService.notifyAdminNewRequest(mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Requester not found');
    });
  });

  describe('notifyExpertAssignment', () => {
    it('should send notification to expert when assigned to request', async () => {
      const result = await awarenessSessionNotificationService.notifyExpertAssignment(
        mockRequest,
        'test-expert-id'
      );

      expect(result.success).toBe(true);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('test-expert-id');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('test-requester-id');
      expect(mockEmailService.sendAwarenessSessionExpertAssignmentNotification).toHaveBeenCalledWith({
        expertEmail: 'expert@test.com',
        expertName: 'Jane Expert',
        request: mockRequest,
        requesterName: 'John Doe',
      });
    });

    it('should handle case when expert is not found', async () => {
      mockUserRepository.findById.mockImplementation(async (id: string) => {
        if (id === 'test-requester-id') return mockRequester as any;
        return null;
      });

      const result = await awarenessSessionNotificationService.notifyExpertAssignment(
        mockRequest,
        'test-expert-id'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Expert not found');
    });
  });

  describe('notifyRequesterStatusChange', () => {
    it('should send status change notification to requester', async () => {
      const updatedRequest = {
        ...mockRequest,
        status: 'forwarded_to_expert' as const,
        assignedExpertId: 'test-expert-id',
      };

      const result = await awarenessSessionNotificationService.notifyRequesterStatusChange(
        updatedRequest,
        'pending_admin_review'
      );

      expect(result.success).toBe(true);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('test-requester-id');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('test-expert-id');
      expect(mockEmailService.sendAwarenessSessionStatusChangeNotification).toHaveBeenCalledWith({
        requesterEmail: 'requester@test.com',
        requesterName: 'John Doe',
        request: updatedRequest,
        expertName: 'Jane Expert',
        previousStatus: 'pending_admin_review',
      });
    });

    it('should handle status change without expert assignment', async () => {
      const rejectedRequest = {
        ...mockRequest,
        status: 'rejected' as const,
        rejectionReason: 'Not suitable for our services',
      };

      const result = await awarenessSessionNotificationService.notifyRequesterStatusChange(
        rejectedRequest,
        'pending_admin_review'
      );

      expect(result.success).toBe(true);
      expect(mockEmailService.sendAwarenessSessionStatusChangeNotification).toHaveBeenCalledWith({
        requesterEmail: 'requester@test.com',
        requesterName: 'John Doe',
        request: rejectedRequest,
        expertName: undefined,
        previousStatus: 'pending_admin_review',
      });
    });
  });

  describe('handleStatusChangeNotifications', () => {
    it('should handle multiple notifications for status change to forwarded_to_expert', async () => {
      const updatedRequest = {
        ...mockRequest,
        status: 'forwarded_to_expert' as const,
        assignedExpertId: 'test-expert-id',
      };

      const result = await awarenessSessionNotificationService.handleStatusChangeNotifications(
        updatedRequest,
        'pending_admin_review'
      );

      expect(result.success).toBe(true);
      
      // Should send requester notification
      expect(mockEmailService.sendAwarenessSessionStatusChangeNotification).toHaveBeenCalled();
      
      // Should send expert assignment notification
      expect(mockEmailService.sendAwarenessSessionExpertAssignmentNotification).toHaveBeenCalled();
    });

    it('should handle notifications for expert confirmation', async () => {
      const confirmedRequest = {
        ...mockRequest,
        status: 'confirmed' as const,
        assignedExpertId: 'test-expert-id',
        expertNotes: 'Looking forward to the session',
      };

      const result = await awarenessSessionNotificationService.handleStatusChangeNotifications(
        confirmedRequest,
        'forwarded_to_expert'
      );

      expect(result.success).toBe(true);
      
      // Should send requester notification
      expect(mockEmailService.sendAwarenessSessionStatusChangeNotification).toHaveBeenCalled();
      
      // Should send admin notification about expert response
      expect(mockEmailService.sendEmail).toHaveBeenCalled();
    });

    it('should handle notifications for expert decline', async () => {
      const declinedRequest = {
        ...mockRequest,
        status: 'expert_declined' as const,
        assignedExpertId: 'test-expert-id',
        expertNotes: 'Schedule conflict',
      };

      const result = await awarenessSessionNotificationService.handleStatusChangeNotifications(
        declinedRequest,
        'forwarded_to_expert'
      );

      expect(result.success).toBe(true);
      
      // Should send requester notification
      expect(mockEmailService.sendAwarenessSessionStatusChangeNotification).toHaveBeenCalled();
      
      // Should send admin notification about expert response
      expect(mockEmailService.sendEmail).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle email service failures gracefully', async () => {
      mockEmailService.sendAwarenessSessionNewRequestNotification.mockResolvedValue({
        success: false,
        error: 'SMTP connection failed',
      });

      const result = await awarenessSessionNotificationService.notifyAdminNewRequest(mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to send notifications to any admin');
    });

    it('should handle partial email failures', async () => {
      const multipleAdmins = [mockAdmin, { ...mockAdmin, id: 'admin-2', email: 'admin2@test.com' }];
      mockUserRepository.findByRole.mockResolvedValue(multipleAdmins as any);

      mockEmailService.sendAwarenessSessionNewRequestNotification
        .mockResolvedValueOnce({ success: true, messageId: 'msg-1' })
        .mockResolvedValueOnce({ success: false, error: 'Failed to send' });

      const result = await awarenessSessionNotificationService.notifyAdminNewRequest(mockRequest);

      expect(result.success).toBe(true); // Should succeed if at least one notification is sent
    });
  });
});