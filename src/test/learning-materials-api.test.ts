import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the learning service first
vi.mock('@/lib/services/awareness-lab/learning.service', () => ({
  learningService: {
    createModule: vi.fn(),
    getModulesForAdmin: vi.fn(),
    getModuleForCustomer: vi.fn(),
    updateModule: vi.fn(),
    deleteModule: vi.fn(),
    setModulePublished: vi.fn(),
    addMaterial: vi.fn(),
    updateMaterial: vi.fn(),
    deleteMaterial: vi.fn(),
    reorderMaterials: vi.fn(),
    getCategories: vi.fn()
  }
}));

import { learningMaterialsController } from '@/lib/controllers/awareness-lab/learning-materials.controller';
import { learningService } from '@/lib/services/awareness-lab/learning.service';

// Mock the session validation
const mockValidSession = {
  success: true,
  userId: 'test-admin-id',
  role: 'admin' as const,
  email: 'admin@test.com'
};

const mockInvalidSession = {
  success: false,
  userId: null,
  role: null,
  email: null
};

describe('Learning Materials API Controller', () => {
  beforeAll(() => {
    // Mock the validateSession method
    vi.spyOn(learningMaterialsController as any, 'validateSession')
      .mockResolvedValue(mockValidSession);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/admin/learning-modules', () => {
    it('should create a learning module successfully', async () => {
      const moduleData = {
        title: 'Test Module',
        description: 'Test Description',
        category: 'cybersecurity',
        orderIndex: 1,
        materials: [
          {
            materialType: 'link' as const,
            title: 'Test Link',
            description: 'Test link description',
            materialData: {
              url: 'https://example.com'
            },
            orderIndex: 1
          }
        ]
      };

      const mockCreatedModule = {
        id: 'test-module-id',
        ...moduleData,
        createdBy: 'test-admin-id',
        isPublished: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(learningService.createModule).mockResolvedValue({
        success: true,
        data: mockCreatedModule
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules', {
        method: 'POST',
        body: JSON.stringify(moduleData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await learningMaterialsController.createModule(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.data.title).toBe(moduleData.title);
      expect(learningService.createModule).toHaveBeenCalledWith(
        'test-admin-id',
        moduleData
      );
    });

    it('should return 400 for invalid module data', async () => {
      const invalidData = {
        // Missing required title
        description: 'Test Description',
        category: 'cybersecurity'
      };

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await learningMaterialsController.createModule(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Validation failed');
    });

    it('should return 401 for unauthenticated requests', async () => {
      vi.spyOn(learningMaterialsController as any, 'validateSession')
        .mockResolvedValueOnce(mockInvalidSession);

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await learningMaterialsController.createModule(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Authentication required');
    });
  });

  describe('GET /api/v1/admin/learning-modules', () => {
    it('should get learning modules with pagination', async () => {
      const mockModules = [
        {
          id: 'module-1',
          title: 'Module 1',
          category: 'cybersecurity',
          isPublished: true
        },
        {
          id: 'module-2',
          title: 'Module 2',
          category: 'privacy',
          isPublished: false
        }
      ];

      vi.mocked(learningService.getModulesForAdmin).mockResolvedValue({
        success: true,
        data: mockModules
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules?page=1&limit=10&category=cybersecurity');

      const response = await learningMaterialsController.getModules(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.modules).toEqual(mockModules);
      expect(responseData.data.pagination).toBeDefined();
      expect(responseData.data.filters.category).toBe('cybersecurity');
    });
  });

  describe('POST /api/v1/admin/learning-modules/:id/materials', () => {
    it('should add material to module successfully', async () => {
      const materialData = {
        materialType: 'video' as const,
        title: 'Test Video',
        description: 'Test video description',
        materialData: {
          url: 'https://youtube.com/watch?v=test'
        },
        orderIndex: 1
      };

      const mockCreatedMaterial = {
        id: 'test-material-id',
        moduleId: 'test-module-id',
        ...materialData,
        createdAt: new Date()
      };

      vi.mocked(learningService.addMaterial).mockResolvedValue({
        success: true,
        data: mockCreatedMaterial
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules/test-module-id/materials', {
        method: 'POST',
        body: JSON.stringify(materialData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await learningMaterialsController.addMaterial(request, 'test-module-id');
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.data.title).toBe(materialData.title);
      expect(learningService.addMaterial).toHaveBeenCalledWith(
        'test-module-id',
        materialData,
        'test-admin-id'
      );
    });

    it('should return 400 for invalid material data', async () => {
      const invalidData = {
        // Missing required materialType
        title: 'Test Material',
        materialData: {
          url: 'https://example.com'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules/test-module-id/materials', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await learningMaterialsController.addMaterial(request, 'test-module-id');
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Validation failed');
    });
  });

  describe('PUT /api/v1/admin/learning-modules/:id/publish', () => {
    it('should publish module successfully', async () => {
      const mockUpdatedModule = {
        id: 'test-module-id',
        title: 'Test Module',
        isPublished: true
      };

      vi.mocked(learningService.setModulePublished).mockResolvedValue({
        success: true,
        data: mockUpdatedModule
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules/test-module-id/publish', {
        method: 'PUT',
        body: JSON.stringify({ isPublished: true }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await learningMaterialsController.setModulePublished(request, 'test-module-id');
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toContain('published successfully');
      expect(learningService.setModulePublished).toHaveBeenCalledWith(
        'test-module-id',
        true,
        'test-admin-id'
      );
    });

    it('should unpublish module successfully', async () => {
      const mockUpdatedModule = {
        id: 'test-module-id',
        title: 'Test Module',
        isPublished: false
      };

      vi.mocked(learningService.setModulePublished).mockResolvedValue({
        success: true,
        data: mockUpdatedModule
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules/test-module-id/publish', {
        method: 'PUT',
        body: JSON.stringify({ isPublished: false }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await learningMaterialsController.setModulePublished(request, 'test-module-id');
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toContain('unpublished successfully');
    });
  });

  describe('GET /api/v1/admin/learning-modules/categories', () => {
    it('should get available categories', async () => {
      const mockCategories = ['cybersecurity', 'privacy', 'data-protection'];

      vi.mocked(learningService.getCategories).mockResolvedValue({
        success: true,
        data: mockCategories
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules/categories');

      const response = await learningMaterialsController.getCategories(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual(mockCategories);
    });
  });
});