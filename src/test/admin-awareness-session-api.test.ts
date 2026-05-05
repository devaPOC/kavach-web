import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the awareness session service
vi.mock('@/lib/services/awareness-session.service', () => ({
  awarenessSessionService: {
    getRequestsForAdmin: vi.fn(),
    adminReview: vi.fn(),
    assignExpert: vi.fn()
  }
}));

import { adminController } from '@/lib/controllers';
import { awarenessSessionService } from '@/lib/services/awareness-session.service';

// Mock data
const mockAdminUser = {
  id: 'admin-user-id',
  email: 'admin@test.com',
  role: 'admin'
};

const mockExpertUser = {
  id: 'expert-user-id',
  email: 'expert@test.com',
  role: 'expert'
};

const mockCustomerUser = {
  id: 'customer-user-id',
  email: 'customer@test.com',
  role: 'customer'
};

const mockSessionRequest = {
  id: 'session-request-id',
  requesterId: mockCustomerUser.id,
  sessionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  location: 'Test Location',
  duration: '2_hours' as const,
  subject: 'Cybersecurity Basics',
  audienceSize: 25,
  audienceTypes: ['adults', 'corporate_staff'] as const,
  sessionMode: 'on_site' as const,
  specialRequirements: 'Projector needed',
  organizationName: 'Test Organization',
  contactEmail: 'contact@test.com',
  contactPhone: '+1234567890',
  status: 'pending_admin_review' as const,
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('Admin Awareness Session API', () => {
  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/admin/awareness-sessions', () => {
    it('should get awareness session requests for admin', async () => {
      // Mock service response
      vi.mocked(awarenessSessionService.getRequestsForAdmin).mockResolvedValue({
        success: true,
        data: {
          requests: [mockSessionRequest],
          total: 1,
          totalPages: 1
        }
      });

      // Mock session validation
      const mockValidateSession = vi.fn().mockResolvedValue({
        success: true,
        userId: mockAdminUser.id,
        role: 'admin',
      });

      // Create mock request
      const request = new NextRequest('http://localhost:3000/api/v1/admin/awareness-sessions');
      
      // Mock the validateSession method
      const originalValidateSession = adminController.validateSession;
      adminController.validateSession = mockValidateSession;

      try {
        const response = await adminController.getAwarenessSessionRequests(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data).toHaveProperty('requests');
        expect(data.data).toHaveProperty('total');
        expect(data.data).toHaveProperty('totalPages');
        expect(Array.isArray(data.data.requests)).toBe(true);
        expect(data.data.requests.length).toBe(1);
        expect(data.data.requests[0].id).toBe(mockSessionRequest.id);
        expect(awarenessSessionService.getRequestsForAdmin).toHaveBeenCalledWith(1, 20, undefined);
      } finally {
        // Restore original method
        adminController.validateSession = originalValidateSession;
      }
    });

    it('should require admin authentication', async () => {
      // Mock session validation failure
      const mockValidateSession = vi.fn().mockResolvedValue({
        success: false,
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/awareness-sessions');
      
      const originalValidateSession = adminController.validateSession;
      adminController.validateSession = mockValidateSession;

      try {
        const response = await adminController.getAwarenessSessionRequests(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Authentication required');
      } finally {
        adminController.validateSession = originalValidateSession;
      }
    });

    it('should require admin role', async () => {
      // Mock session validation with non-admin role
      const mockValidateSession = vi.fn().mockResolvedValue({
        success: true,
        userId: mockCustomerUser.id,
        role: 'customer',
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/awareness-sessions');
      
      const originalValidateSession = adminController.validateSession;
      adminController.validateSession = mockValidateSession;

      try {
        const response = await adminController.getAwarenessSessionRequests(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Admin access required');
      } finally {
        adminController.validateSession = originalValidateSession;
      }
    });
  });

  describe('PUT /api/v1/admin/awareness-sessions/{id}/review', () => {
    it('should approve awareness session request', async () => {
      // Mock service response
      vi.mocked(awarenessSessionService.adminReview).mockResolvedValue({
        success: true,
        data: {
          ...mockSessionRequest,
          status: 'forwarded_to_expert',
          assignedExpertId: mockExpertUser.id
        }
      });

      const mockValidateSession = vi.fn().mockResolvedValue({
        success: true,
        userId: mockAdminUser.id,
        role: 'admin',
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/awareness-sessions/test/review', {
        method: 'PUT',
        body: JSON.stringify({
          action: 'approve',
          expertId: mockExpertUser.id,
          notes: 'Approved for expert assignment',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const originalValidateSession = adminController.validateSession;
      adminController.validateSession = mockValidateSession;

      try {
        const response = await adminController.reviewAwarenessSessionRequest(request, mockSessionRequest.id);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.status).toBe('forwarded_to_expert');
        expect(data.data.assignedExpertId).toBe(mockExpertUser.id);
        expect(awarenessSessionService.adminReview).toHaveBeenCalledWith(
          mockSessionRequest.id,
          mockAdminUser.id,
          {
            action: 'approve',
            expertId: mockExpertUser.id,
            notes: 'Approved for expert assignment'
          }
        );
      } finally {
        adminController.validateSession = originalValidateSession;
      }
    });

    it('should reject awareness session request', async () => {
      // Mock service response
      vi.mocked(awarenessSessionService.adminReview).mockResolvedValue({
        success: true,
        data: {
          ...mockSessionRequest,
          status: 'rejected',
          rejectionReason: 'Insufficient information provided'
        }
      });

      const mockValidateSession = vi.fn().mockResolvedValue({
        success: true,
        userId: mockAdminUser.id,
        role: 'admin',
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/awareness-sessions/test/review', {
        method: 'PUT',
        body: JSON.stringify({
          action: 'reject',
          notes: 'Insufficient information provided',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const originalValidateSession = adminController.validateSession;
      adminController.validateSession = mockValidateSession;

      try {
        const response = await adminController.reviewAwarenessSessionRequest(request, mockSessionRequest.id);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.status).toBe('rejected');
        expect(data.data.rejectionReason).toBe('Insufficient information provided');
        expect(awarenessSessionService.adminReview).toHaveBeenCalledWith(
          mockSessionRequest.id,
          mockAdminUser.id,
          {
            action: 'reject',
            notes: 'Insufficient information provided'
          }
        );
      } finally {
        adminController.validateSession = originalValidateSession;
      }
    });

    it('should require expertId when approving', async () => {
      const mockValidateSession = vi.fn().mockResolvedValue({
        success: true,
        userId: mockAdminUser.id,
        role: 'admin',
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/awareness-sessions/test/review', {
        method: 'PUT',
        body: JSON.stringify({
          action: 'approve',
          notes: 'Approved',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const originalValidateSession = adminController.validateSession;
      adminController.validateSession = mockValidateSession;

      try {
        const response = await adminController.reviewAwarenessSessionRequest(request, mockSessionRequest.id);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Expert ID is required when approving a request');
      } finally {
        adminController.validateSession = originalValidateSession;
      }
    });

    it('should require notes when rejecting', async () => {
      const mockValidateSession = vi.fn().mockResolvedValue({
        success: true,
        userId: mockAdminUser.id,
        role: 'admin',
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/awareness-sessions/test/review', {
        method: 'PUT',
        body: JSON.stringify({
          action: 'reject',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const originalValidateSession = adminController.validateSession;
      adminController.validateSession = mockValidateSession;

      try {
        const response = await adminController.reviewAwarenessSessionRequest(request, mockSessionRequest.id);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Notes are required when rejecting a request');
      } finally {
        adminController.validateSession = originalValidateSession;
      }
    });
  });

  describe('PUT /api/v1/admin/awareness-sessions/{id}/assign', () => {
    it('should assign expert to awareness session request', async () => {
      // Mock service response
      vi.mocked(awarenessSessionService.assignExpert).mockResolvedValue({
        success: true,
        data: {
          ...mockSessionRequest,
          status: 'forwarded_to_expert',
          assignedExpertId: mockExpertUser.id
        }
      });

      const mockValidateSession = vi.fn().mockResolvedValue({
        success: true,
        userId: mockAdminUser.id,
        role: 'admin',
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/awareness-sessions/test/assign', {
        method: 'PUT',
        body: JSON.stringify({
          expertId: mockExpertUser.id,
          notes: 'Expert assigned for this session',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const originalValidateSession = adminController.validateSession;
      adminController.validateSession = mockValidateSession;

      try {
        const response = await adminController.assignExpertToAwarenessSession(request, mockSessionRequest.id);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.status).toBe('forwarded_to_expert');
        expect(data.data.assignedExpertId).toBe(mockExpertUser.id);
        expect(awarenessSessionService.assignExpert).toHaveBeenCalledWith(
          mockSessionRequest.id,
          mockExpertUser.id,
          mockAdminUser.id,
          'Expert assigned for this session'
        );
      } finally {
        adminController.validateSession = originalValidateSession;
      }
    });

    it('should require expertId', async () => {
      const mockValidateSession = vi.fn().mockResolvedValue({
        success: true,
        userId: mockAdminUser.id,
        role: 'admin',
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/awareness-sessions/test/assign', {
        method: 'PUT',
        body: JSON.stringify({
          notes: 'Expert assignment',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const originalValidateSession = adminController.validateSession;
      adminController.validateSession = mockValidateSession;

      try {
        const response = await adminController.assignExpertToAwarenessSession(request, mockSessionRequest.id);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Missing required fields: expertId');
      } finally {
        adminController.validateSession = originalValidateSession;
      }
    });
  });
});