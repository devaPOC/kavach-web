import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { learningMaterialsController } from '@/lib/controllers/awareness-lab/learning-materials.controller';
import { learningService } from '@/lib/services/awareness-lab/learning.service';

// Mock the learning service
const mockLearningService = {
  getPublishedModules: vi.fn(),
  getModuleForCustomer: vi.fn(),
  trackMaterialAccess: vi.fn(),
  markMaterialCompleted: vi.fn()
};

// Mock the controller's validateSession method
const mockValidateSession = vi.fn();

describe('Learning Materials Customer API', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful session validation
    mockValidateSession.mockResolvedValue({
      success: true,
      userId: 'test-user-id',
      role: 'customer'
    });

    // Replace the validateSession method
    (learningMaterialsController as any).validateSession = mockValidateSession;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/learning-modules', () => {
    it('should return published learning modules successfully', async () => {
      // Mock service response
      const mockModules = [
        {
          id: 'module-1',
          title: 'Cybersecurity Basics',
          description: 'Learn the fundamentals of cybersecurity',
          category: 'basics',
          isPublished: true
        }
      ];

      mockLearningService.getPublishedModules.mockResolvedValue({
        success: true,
        data: mockModules
      });

      // Replace the service
      (learningService as any).getPublishedModules = mockLearningService.getPublishedModules;

      // Create mock request
      const request = new NextRequest('http://localhost:3000/api/v1/learning-modules?page=1&limit=20');

      // Call the controller method
      const response = await learningMaterialsController.getPublishedModules(request);
      const responseData = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.modules).toEqual(mockModules);
      expect(responseData.data.pagination).toBeDefined();
      expect(mockLearningService.getPublishedModules).toHaveBeenCalledWith(undefined, 20, 0);
    });

    it('should handle category filtering', async () => {
      mockLearningService.getPublishedModules.mockResolvedValue({
        success: true,
        data: []
      });

      (learningService as any).getPublishedModules = mockLearningService.getPublishedModules;

      const request = new NextRequest('http://localhost:3000/api/v1/learning-modules?category=advanced');

      await learningMaterialsController.getPublishedModules(request);

      expect(mockLearningService.getPublishedModules).toHaveBeenCalledWith('advanced', 20, 0);
    });

    it('should require authentication', async () => {
      mockValidateSession.mockResolvedValue({
        success: false
      });

      const request = new NextRequest('http://localhost:3000/api/v1/learning-modules');

      const response = await learningMaterialsController.getPublishedModules(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('AUTHENTICATION_REQUIRED');
    });
  });

  describe('GET /api/v1/learning-modules/:id', () => {
    it('should return module with progress tracking', async () => {
      const mockModule = {
        id: 'module-1',
        title: 'Cybersecurity Basics',
        materials: [
          { id: 'material-1', title: 'Introduction Video' }
        ],
        userProgress: {
          completedMaterials: 0,
          totalMaterials: 1,
          completionPercentage: 0
        }
      };

      mockLearningService.getModuleForCustomer.mockResolvedValue({
        success: true,
        data: mockModule
      });

      mockLearningService.trackMaterialAccess.mockResolvedValue({
        success: true,
        data: {}
      });

      (learningService as any).getModuleForCustomer = mockLearningService.getModuleForCustomer;
      (learningService as any).trackMaterialAccess = mockLearningService.trackMaterialAccess;

      const request = new NextRequest('http://localhost:3000/api/v1/learning-modules/module-1');

      const response = await learningMaterialsController.getModuleForCustomer(request, 'module-1');
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual(mockModule);
      expect(mockLearningService.getModuleForCustomer).toHaveBeenCalledWith('module-1', 'test-user-id');
      expect(mockLearningService.trackMaterialAccess).toHaveBeenCalledWith('test-user-id', 'module-1', 'module-1');
    });

    it('should handle module not found', async () => {
      mockLearningService.getModuleForCustomer.mockResolvedValue({
        success: false,
        code: 'MODULE_NOT_FOUND',
        error: 'Learning module not found'
      });

      (learningService as any).getModuleForCustomer = mockLearningService.getModuleForCustomer;

      const request = new NextRequest('http://localhost:3000/api/v1/learning-modules/nonexistent');

      const response = await learningMaterialsController.getModuleForCustomer(request, 'nonexistent');
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('MODULE_NOT_FOUND');
    });

    it('should validate module ID format', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/learning-modules/invalid-id');

      const response = await learningMaterialsController.getModuleForCustomer(request, '');
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('INVALID_MODULE_ID');
    });
  });

  describe('POST /api/v1/learning-modules/:id/progress', () => {
    it('should track material access successfully', async () => {
      mockLearningService.trackMaterialAccess.mockResolvedValue({
        success: true,
        data: { id: 'progress-1', isCompleted: false }
      });

      (learningService as any).trackMaterialAccess = mockLearningService.trackMaterialAccess;

      const request = new NextRequest('http://localhost:3000/api/v1/learning-modules/module-1/progress', {
        method: 'POST',
        body: JSON.stringify({
          materialId: 'material-1',
          action: 'access'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await learningMaterialsController.updateProgress(request, 'module-1');
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Material access tracked successfully');
      expect(mockLearningService.trackMaterialAccess).toHaveBeenCalledWith('test-user-id', 'module-1', 'material-1');
    });

    it('should mark material as completed successfully', async () => {
      mockLearningService.markMaterialCompleted.mockResolvedValue({
        success: true,
        data: { id: 'progress-1', isCompleted: true }
      });

      (learningService as any).markMaterialCompleted = mockLearningService.markMaterialCompleted;

      const request = new NextRequest('http://localhost:3000/api/v1/learning-modules/module-1/progress', {
        method: 'POST',
        body: JSON.stringify({
          materialId: 'material-1',
          action: 'complete'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await learningMaterialsController.updateProgress(request, 'module-1');
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Material marked as completed');
      expect(mockLearningService.markMaterialCompleted).toHaveBeenCalledWith('test-user-id', 'module-1', 'material-1');
    });

    it('should validate request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/learning-modules/module-1/progress', {
        method: 'POST',
        body: JSON.stringify({
          materialId: 'material-1'
          // missing action
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await learningMaterialsController.updateProgress(request, 'module-1');
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('INVALID_ACTION');
    });

    it('should validate action values', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/learning-modules/module-1/progress', {
        method: 'POST',
        body: JSON.stringify({
          materialId: 'material-1',
          action: 'invalid-action'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await learningMaterialsController.updateProgress(request, 'module-1');
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('INVALID_ACTION');
    });

    it('should handle legacy isCompleted format (complete)', async () => {
      mockLearningService.markMaterialCompleted.mockResolvedValue({
        success: true,
        data: { id: 'progress-1', isCompleted: true }
      });

      (learningService as any).markMaterialCompleted = mockLearningService.markMaterialCompleted;

      const request = new NextRequest('http://localhost:3000/api/v1/learning-modules/module-1/progress', {
        method: 'POST',
        body: JSON.stringify({
          materialId: 'material-1',
          isCompleted: true
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await learningMaterialsController.updateProgress(request, 'module-1');
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Material marked as completed');
      expect(mockLearningService.markMaterialCompleted).toHaveBeenCalledWith('test-user-id', 'module-1', 'material-1');
    });

    it('should handle legacy isCompleted format (access)', async () => {
      mockLearningService.trackMaterialAccess.mockResolvedValue({
        success: true,
        data: { id: 'progress-1', isCompleted: false }
      });

      (learningService as any).trackMaterialAccess = mockLearningService.trackMaterialAccess;

      const request = new NextRequest('http://localhost:3000/api/v1/learning-modules/module-1/progress', {
        method: 'POST',
        body: JSON.stringify({
          materialId: 'material-1',
          isCompleted: false
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await learningMaterialsController.updateProgress(request, 'module-1');
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Material access tracked successfully');
      expect(mockLearningService.trackMaterialAccess).toHaveBeenCalledWith('test-user-id', 'module-1', 'material-1');
    });
  });
});
