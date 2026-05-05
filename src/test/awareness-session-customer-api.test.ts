import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the awareness session service first
vi.mock('@/lib/services/awareness-session.service', () => ({
  awarenessSessionService: {
    createRequest: vi.fn(),
    getRequestsByUser: vi.fn(),
    getRequestById: vi.fn()
  }
}));

// Mock the cookie manager
vi.mock('@/lib/auth/unified-session-manager', () => ({
  cookieManager: {
    getSessionFromCookies: vi.fn()
  }
}));

import { awarenessSessionService } from '@/lib/services/awareness-session.service';
import { cookieManager } from '@/lib/auth/unified-session-manager';

// Import the route handlers
import { GET as getAwarenessSessions, POST as createAwarenessSession } from '@/app/(backend)/api/v1/awareness-sessions/route';
import { GET as getAwarenessSessionById } from '@/app/(backend)/api/v1/awareness-sessions/[id]/route';

// Mock session data
const mockCustomerSession = {
  userId: 'test-customer-id',
  role: 'customer' as const,
  email: 'customer@test.com'
};

// Create a future date for testing
const futureSessionDate = new Date();
futureSessionDate.setDate(futureSessionDate.getDate() + 30);

const mockAwarenessSessionRequest = {
  id: 'test-request-id',
  requesterId: 'test-customer-id',
  sessionDate: futureSessionDate,
  location: 'Test Location',
  duration: '2_hours' as const,
  subject: 'Cybersecurity Awareness',
  audienceSize: 50,
  audienceTypes: ['corporate_staff'] as const,
  sessionMode: 'on_site' as const,
  organizationName: 'Test Organization',
  contactEmail: 'contact@test.com',
  contactPhone: '+1234567890',
  status: 'pending_admin_review' as const,
  createdAt: new Date('2024-11-01T10:00:00Z'),
  updatedAt: new Date('2024-11-01T10:00:00Z')
};

describe('Customer Awareness Session API', () => {
  beforeAll(() => {
    // Mock successful customer session by default
    vi.mocked(cookieManager.getSessionFromCookies).mockResolvedValue(mockCustomerSession);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/awareness-sessions', () => {
    it('should create awareness session request successfully', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 days from now
      
      const requestData = {
        sessionDate: futureDate.toISOString(),
        location: 'Test Location',
        duration: '2_hours',
        subject: 'Cybersecurity Awareness',
        audienceSize: 50,
        audienceTypes: ['corporate_staff'],
        sessionMode: 'on_site',
        organizationName: 'Test Organization',
        contactEmail: 'contact@test.com',
        contactPhone: '+1234567890'
      };

      vi.mocked(awarenessSessionService.createRequest).mockResolvedValue({
        success: true,
        data: mockAwarenessSessionRequest
      });

      const request = new NextRequest('http://localhost:3000/api/v1/awareness-sessions', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await createAwarenessSession(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual({
        ...mockAwarenessSessionRequest,
        sessionDate: mockAwarenessSessionRequest.sessionDate.toISOString(),
        createdAt: mockAwarenessSessionRequest.createdAt.toISOString(),
        updatedAt: mockAwarenessSessionRequest.updatedAt.toISOString()
      });
      expect(responseData.message).toBe('Awareness session request created successfully');
      expect(awarenessSessionService.createRequest).toHaveBeenCalledWith(
        'test-customer-id',
        expect.objectContaining({
          sessionDate: expect.any(Date),
          location: 'Test Location',
          duration: '2_hours'
        })
      );
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(cookieManager.getSessionFromCookies).mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost:3000/api/v1/awareness-sessions', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await createAwarenessSession(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Authentication required');
    });

    it('should return 403 when user is not a customer', async () => {
      vi.mocked(cookieManager.getSessionFromCookies).mockResolvedValueOnce({
        ...mockCustomerSession,
        role: 'admin'
      });

      const request = new NextRequest('http://localhost:3000/api/v1/awareness-sessions', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await createAwarenessSession(request);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Only customers can create awareness session requests');
    });
  });

  describe('GET /api/v1/awareness-sessions', () => {
    it('should get user awareness session requests successfully', async () => {
      const mockRequestsData = {
        requests: [mockAwarenessSessionRequest],
        total: 1,
        totalPages: 1
      };

      vi.mocked(awarenessSessionService.getRequestsByUser).mockResolvedValue({
        success: true,
        data: mockRequestsData
      });

      const request = new NextRequest('http://localhost:3000/api/v1/awareness-sessions?page=1&limit=20');

      const response = await getAwarenessSessions(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual({
        ...mockRequestsData,
        requests: mockRequestsData.requests.map(req => ({
          ...req,
          sessionDate: req.sessionDate.toISOString(),
          createdAt: req.createdAt.toISOString(),
          updatedAt: req.updatedAt.toISOString()
        }))
      });
      expect(responseData.message).toBe('Awareness session requests fetched successfully');
      expect(awarenessSessionService.getRequestsByUser).toHaveBeenCalledWith(
        'test-customer-id',
        1,
        20
      );
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(cookieManager.getSessionFromCookies).mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost:3000/api/v1/awareness-sessions');

      const response = await getAwarenessSessions(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Authentication required');
    });
  });

  describe('GET /api/v1/awareness-sessions/{id}', () => {
    it('should get awareness session request by ID successfully', async () => {
      vi.mocked(awarenessSessionService.getRequestById).mockResolvedValue({
        success: true,
        data: mockAwarenessSessionRequest
      });

      const request = new NextRequest('http://localhost:3000/api/v1/awareness-sessions/test-request-id');
      const context = { params: Promise.resolve({ id: 'test-request-id' }) };

      const response = await getAwarenessSessionById(request, context);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual({
        ...mockAwarenessSessionRequest,
        sessionDate: mockAwarenessSessionRequest.sessionDate.toISOString(),
        createdAt: mockAwarenessSessionRequest.createdAt.toISOString(),
        updatedAt: mockAwarenessSessionRequest.updatedAt.toISOString()
      });
      expect(responseData.message).toBe('Awareness session request fetched successfully');
      expect(awarenessSessionService.getRequestById).toHaveBeenCalledWith(
        'test-request-id',
        'test-customer-id'
      );
    });

    it('should return 400 when ID is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/awareness-sessions/');
      const context = { params: Promise.resolve({ id: '' }) };

      const response = await getAwarenessSessionById(request, context);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Awareness session request ID is required');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(cookieManager.getSessionFromCookies).mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost:3000/api/v1/awareness-sessions/test-request-id');
      const context = { params: Promise.resolve({ id: 'test-request-id' }) };

      const response = await getAwarenessSessionById(request, context);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Authentication required');
    });
  });
});