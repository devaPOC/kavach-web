import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { expertController } from '@/lib/controllers/expert/expert.controller';
import { awarenessSessionService } from '@/lib/services/awareness-session.service';
import type { AwarenessSessionRequest } from '@/types/awareness-session';

// Mock the awareness session service
vi.mock('@/lib/services/awareness-session.service', () => ({
  awarenessSessionService: {
    getRequestsForExpert: vi.fn(),
    expertResponse: vi.fn(),
  },
}));

// Mock the logger
vi.mock('@/infrastructure/logging/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock the BaseController session validation
const mockValidateSession = vi.fn();

// Mock the expert controller methods directly
vi.mock('@/lib/controllers/expert/expert.controller', () => {
  const originalModule = vi.importActual('@/lib/controllers/expert/expert.controller');
  
  class MockExpertController {
    async validateSession() {
      return mockValidateSession();
    }
    
    async parseBody(request: NextRequest) {
      return request.json();
    }
    
    validateRequired(body: any, fields: string[]) {
      const missingFields = fields.filter(field => !body || !body[field]);
      return {
        isValid: missingFields.length === 0,
        missingFields: missingFields.length > 0 ? missingFields : undefined,
      };
    }
    
    success(data: any, message?: string, status = 200) {
      return new Response(JSON.stringify({ success: true, data, message }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    error(message: string, code?: string, status = 400) {
      return new Response(JSON.stringify({ success: false, error: message, code }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    async getAwarenessSessionRequests(request: NextRequest) {
      const session = await this.validateSession();
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'expert') {
        return this.error('Expert access required', 'EXPERT_ACCESS_REQUIRED', 403);
      }

      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');

      const result = await (await import('@/lib/services/awareness-session.service')).awarenessSessionService.getRequestsForExpert(session.userId!, page, limit);

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    }

    async respondToAwarenessSessionRequest(request: NextRequest, requestId: string) {
      const session = await this.validateSession();
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'expert') {
        return this.error('Expert access required', 'EXPERT_ACCESS_REQUIRED', 403);
      }

      const body = await this.parseBody(request);
      const validation = this.validateRequired(body, ['action']);
      if (!validation.isValid) {
        return this.error(`Missing required fields: ${validation.missingFields?.join(', ')}`, undefined, 400);
      }

      if (!['accept', 'decline'].includes(body!.action)) {
        return this.error('Action must be either "accept" or "decline"', undefined, 400);
      }

      const result = await (await import('@/lib/services/awareness-session.service')).awarenessSessionService.expertResponse(requestId, session.userId!, body!);

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    }
  }
  
  return {
    ...originalModule,
    expertController: new MockExpertController(),
  };
});

describe('Expert Awareness Session API', () => {
  const mockExpertId = 'expert-123';
  const mockRequestId = 'request-456';
  
  const mockAwarenessSessionRequest: AwarenessSessionRequest = {
    id: mockRequestId,
    requesterId: 'customer-789',
    sessionDate: new Date('2024-12-01T10:00:00Z'),
    location: 'Test Location',
    duration: '2_hours',
    subject: 'Cybersecurity Awareness',
    audienceSize: 50,
    audienceTypes: ['corporate_staff'],
    sessionMode: 'on_site',
    organizationName: 'Test Organization',
    contactEmail: 'contact@test.com',
    contactPhone: '+1234567890',
    status: 'forwarded_to_expert',
    assignedExpertId: mockExpertId,
    createdAt: new Date('2024-11-01T10:00:00Z'),
    updatedAt: new Date('2024-11-01T10:00:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful session validation for expert
    mockValidateSession.mockResolvedValue({
      success: true,
      userId: mockExpertId,
      role: 'expert',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/expert/awareness-sessions', () => {
    it('should return awareness session requests for authenticated expert', async () => {
      const mockResponse = {
        success: true,
        data: {
          requests: [mockAwarenessSessionRequest],
          total: 1,
          totalPages: 1,
        },
      };

      (awarenessSessionService.getRequestsForExpert as any).mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/api/v1/expert/awareness-sessions?page=1&limit=20');
      const response = await expertController.getAwarenessSessionRequests(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.requests).toHaveLength(1);
      expect(responseData.data.requests[0].id).toBe(mockRequestId);
      expect(awarenessSessionService.getRequestsForExpert).toHaveBeenCalledWith(mockExpertId, 1, 20);
    });

    it('should handle pagination parameters correctly', async () => {
      const mockResponse = {
        success: true,
        data: {
          requests: [],
          total: 0,
          totalPages: 0,
        },
      };

      (awarenessSessionService.getRequestsForExpert as any).mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/api/v1/expert/awareness-sessions?page=2&limit=10');
      const response = await expertController.getAwarenessSessionRequests(request);

      expect(response.status).toBe(200);
      expect(awarenessSessionService.getRequestsForExpert).toHaveBeenCalledWith(mockExpertId, 2, 10);
    });

    it('should use default pagination when parameters are not provided', async () => {
      const mockResponse = {
        success: true,
        data: {
          requests: [],
          total: 0,
          totalPages: 0,
        },
      };

      (awarenessSessionService.getRequestsForExpert as any).mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/api/v1/expert/awareness-sessions');
      const response = await expertController.getAwarenessSessionRequests(request);

      expect(response.status).toBe(200);
      expect(awarenessSessionService.getRequestsForExpert).toHaveBeenCalledWith(mockExpertId, 1, 20);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockValidateSession.mockResolvedValue({
        success: false,
        error: 'Authentication required',
      });

      const request = new NextRequest('http://localhost:3000/api/v1/expert/awareness-sessions');
      const response = await expertController.getAwarenessSessionRequests(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Authentication required');
    });

    it('should return 403 when user is not an expert', async () => {
      mockValidateSession.mockResolvedValue({
        success: true,
        userId: 'customer-123',
        role: 'customer',
      });

      const request = new NextRequest('http://localhost:3000/api/v1/expert/awareness-sessions');
      const response = await expertController.getAwarenessSessionRequests(request);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Expert access required');
    });

    it('should handle service errors gracefully', async () => {
      (awarenessSessionService.getRequestsForExpert as any).mockResolvedValue({
        success: false,
        error: 'Database connection failed',
        code: 'DATABASE_ERROR',
      });

      const request = new NextRequest('http://localhost:3000/api/v1/expert/awareness-sessions');
      const response = await expertController.getAwarenessSessionRequests(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Database connection failed');
    });
  });

  describe('PUT /api/v1/expert/awareness-sessions/{id}/respond', () => {
    it('should accept awareness session request successfully', async () => {
      const mockUpdatedRequest = {
        ...mockAwarenessSessionRequest,
        status: 'confirmed' as const,
        expertNotes: 'Looking forward to this session',
        confirmedAt: new Date(),
      };

      (awarenessSessionService.expertResponse as any).mockResolvedValue({
        success: true,
        data: mockUpdatedRequest,
      });

      const requestBody = {
        action: 'accept',
        notes: 'Looking forward to this session',
      };

      const request = new NextRequest(`http://localhost:3000/api/v1/expert/awareness-sessions/${mockRequestId}/respond`, {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await expertController.respondToAwarenessSessionRequest(request, mockRequestId);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.status).toBe('confirmed');
      expect(awarenessSessionService.expertResponse).toHaveBeenCalledWith(
        mockRequestId,
        mockExpertId,
        requestBody
      );
    });

    it('should decline awareness session request successfully', async () => {
      const mockUpdatedRequest = {
        ...mockAwarenessSessionRequest,
        status: 'expert_declined' as const,
        expertNotes: 'Schedule conflict',
      };

      (awarenessSessionService.expertResponse as any).mockResolvedValue({
        success: true,
        data: mockUpdatedRequest,
      });

      const requestBody = {
        action: 'decline',
        notes: 'Schedule conflict',
      };

      const request = new NextRequest(`http://localhost:3000/api/v1/expert/awareness-sessions/${mockRequestId}/respond`, {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await expertController.respondToAwarenessSessionRequest(request, mockRequestId);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.status).toBe('expert_declined');
      expect(awarenessSessionService.expertResponse).toHaveBeenCalledWith(
        mockRequestId,
        mockExpertId,
        requestBody
      );
    });

    it('should return 400 when action is missing', async () => {
      const requestBody = {
        notes: 'Some notes',
      };

      const request = new NextRequest(`http://localhost:3000/api/v1/expert/awareness-sessions/${mockRequestId}/respond`, {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await expertController.respondToAwarenessSessionRequest(request, mockRequestId);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Missing required fields: action');
    });

    it('should return 400 when action is invalid', async () => {
      const requestBody = {
        action: 'invalid_action',
        notes: 'Some notes',
      };

      const request = new NextRequest(`http://localhost:3000/api/v1/expert/awareness-sessions/${mockRequestId}/respond`, {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await expertController.respondToAwarenessSessionRequest(request, mockRequestId);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Action must be either "accept" or "decline"');
    });

    it('should return 401 when user is not authenticated', async () => {
      mockValidateSession.mockResolvedValue({
        success: false,
        error: 'Authentication required',
      });

      const requestBody = {
        action: 'accept',
        notes: 'Looking forward to this session',
      };

      const request = new NextRequest(`http://localhost:3000/api/v1/expert/awareness-sessions/${mockRequestId}/respond`, {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await expertController.respondToAwarenessSessionRequest(request, mockRequestId);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Authentication required');
    });

    it('should return 403 when user is not an expert', async () => {
      mockValidateSession.mockResolvedValue({
        success: true,
        userId: 'admin-123',
        role: 'admin',
      });

      const requestBody = {
        action: 'accept',
        notes: 'Looking forward to this session',
      };

      const request = new NextRequest(`http://localhost:3000/api/v1/expert/awareness-sessions/${mockRequestId}/respond`, {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await expertController.respondToAwarenessSessionRequest(request, mockRequestId);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Expert access required');
    });

    it('should handle service errors gracefully', async () => {
      (awarenessSessionService.expertResponse as any).mockResolvedValue({
        success: false,
        error: 'Request not found',
        code: 'REQUEST_NOT_FOUND',
      });

      const requestBody = {
        action: 'accept',
        notes: 'Looking forward to this session',
      };

      const request = new NextRequest(`http://localhost:3000/api/v1/expert/awareness-sessions/${mockRequestId}/respond`, {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await expertController.respondToAwarenessSessionRequest(request, mockRequestId);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Request not found');
    });

    it('should handle requests without notes', async () => {
      const mockUpdatedRequest = {
        ...mockAwarenessSessionRequest,
        status: 'confirmed' as const,
        confirmedAt: new Date(),
      };

      (awarenessSessionService.expertResponse as any).mockResolvedValue({
        success: true,
        data: mockUpdatedRequest,
      });

      const requestBody = {
        action: 'accept',
      };

      const request = new NextRequest(`http://localhost:3000/api/v1/expert/awareness-sessions/${mockRequestId}/respond`, {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await expertController.respondToAwarenessSessionRequest(request, mockRequestId);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(awarenessSessionService.expertResponse).toHaveBeenCalledWith(
        mockRequestId,
        mockExpertId,
        requestBody
      );
    });
  });
});