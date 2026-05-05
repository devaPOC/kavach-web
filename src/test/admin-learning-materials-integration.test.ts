import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Import route handlers
import { GET as getModules, POST as createModule } from '@/app/(backend)/api/v1/admin/learning-modules/route';
import { GET as getModule, PUT as updateModule, DELETE as deleteModule } from '@/app/(backend)/api/v1/admin/learning-modules/[id]/route';
import { POST as addMaterial } from '@/app/(backend)/api/v1/admin/learning-modules/[id]/materials/route';
import { PUT as updateMaterial, DELETE as deleteMaterial } from '@/app/(backend)/api/v1/admin/learning-modules/materials/[materialId]/route';
import { PUT as publishModule } from '@/app/(backend)/api/v1/admin/learning-modules/[id]/publish/route';
import { GET as getCategories } from '@/app/(backend)/api/v1/admin/learning-modules/categories/route';

// Mock the learning service
vi.mock('@/lib/services/awareness-lab/learning.service', () => ({
  learningService: {
    createModule: vi.fn(),
    getModulesForAdmin: vi.fn(),
    getModuleForAdmin: vi.fn(),
    updateModule: vi.fn(),
    deleteModule: vi.fn(),
    addMaterial: vi.fn(),
    updateMaterial: vi.fn(),
    deleteMaterial: vi.fn(),
    reorderMaterials: vi.fn(),
    setModulePublished: vi.fn(),
    getCategories: vi.fn(),
    validateMaterialUrl: vi.fn()
  }
}));

// Mock authentication
vi.mock('@/lib/auth/session-validation-middleware', () => ({
  validateSession: vi.fn()
}));

import { learningService } from '@/lib/services/awareness-lab/learning.service';
import { validateSession } from '@/lib/auth/session-validation-middleware';

describe('Admin Learning Materials Integration Tests', () => {
  const mockAdminSession = {
    success: true,
    userId: 'admin-user-id',
    role: 'admin' as const,
    email: 'admin@test.com'
  };

  const mockCustomerSession = {
    success: true,
    userId: 'customer-user-id',
    role: 'customer' as const,
    email: 'customer@test.com'
  };

  const mockInvalidSession = {
    success: false,
    userId: null,
    role: null,
    email: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateSession).mockResolvedValue(mockAdminSession);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/admin/learning-modules - Create Module', () => {
    it('should create learning module successfully', async () => {
      const moduleData = {
        title: 'Cybersecurity Fundamentals',
        description: 'Learn the basics of cybersecurity',
        category: 'security-basics',
        orderIndex: 1,
        materials: [
          {
            materialType: 'link' as const,
            title: 'Introduction to Cybersecurity',
            description: 'Basic concepts and terminology',
            materialData: {
              url: 'https://example.com/cybersecurity-intro'
            },
            orderIndex: 1
          },
          {
            materialType: 'video' as const,
            title: 'Security Best Practices',
            description: 'Video guide on security practices',
            materialData: {
              url: 'https://youtube.com/watch?v=security123'
            },
            orderIndex: 2
          }
        ]
      };

      const mockCreatedModule = {
        id: 'module-123',
        ...moduleData,
        createdBy: 'admin-user-id',
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
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await createModule(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.data.id).toBe('module-123');
      expect(responseData.data.title).toBe(moduleData.title);
      expect(responseData.data.materials).toHaveLength(2);
      expect(learningService.createModule).toHaveBeenCalledWith('admin-user-id', moduleData);
    });

    it('should validate module data', async () => {
      const invalidModuleData = {
        // Missing required title
        description: 'Test description',
        category: 'test-category',
        materials: [
          {
            materialType: 'invalid-type' as any,
            title: 'Test Material',
            materialData: {
              url: 'invalid-url'
            }
          }
        ]
      };

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules', {
        method: 'POST',
        body: JSON.stringify(invalidModuleData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await createModule(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Validation failed');
    });

    it('should validate material URLs', async () => {
      vi.mocked(learningService.validateMaterialUrl).mockResolvedValue({
        success: false,
        error: 'Invalid URL format',
        code: 'INVALID_URL'
      });

      const moduleData = {
        title: 'Test Module',
        description: 'Test description',
        category: 'test',
        materials: [
          {
            materialType: 'link' as const,
            title: 'Test Link',
            description: 'Test link description',
            materialData: {
              url: 'not-a-valid-url'
            },
            orderIndex: 1
          }
        ]
      };

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules', {
        method: 'POST',
        body: JSON.stringify(moduleData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await createModule(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Invalid URL');
    });

    it('should require admin authentication', async () => {
      vi.mocked(validateSession).mockResolvedValue(mockCustomerSession);

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer customer-token'
        }
      });

      const response = await createModule(request);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Admin access required');
    });
  });

  describe('GET /api/v1/admin/learning-modules - List Modules', () => {
    it('should return paginated module list with filters', async () => {
      const mockModules = [
        {
          id: 'module-1',
          title: 'Security Basics',
          description: 'Basic security concepts',
          category: 'security-basics',
          isPublished: true,
          materialsCount: 5,
          createdAt: new Date()
        },
        {
          id: 'module-2',
          title: 'Advanced Security',
          description: 'Advanced security topics',
          category: 'security-advanced',
          isPublished: false,
          materialsCount: 3,
          createdAt: new Date()
        }
      ];

      vi.mocked(learningService.getModulesForAdmin).mockResolvedValue({
        success: true,
        data: mockModules
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules?page=1&limit=10&category=security-basics&published=true&search=security', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getModules(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.modules).toEqual(mockModules);
      expect(responseData.data.pagination).toBeDefined();
      expect(responseData.data.filters).toEqual({
        category: 'security-basics',
        published: true,
        search: 'security'
      });
    });

    it('should handle sorting options', async () => {
      vi.mocked(learningService.getModulesForAdmin).mockResolvedValue({
        success: true,
        data: []
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules?sortBy=createdAt&sortOrder=desc', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getModules(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data.sorting).toEqual({
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
    });
  });

  describe('GET /api/v1/admin/learning-modules/:id - Get Module Details', () => {
    it('should return module with materials', async () => {
      const mockModule = {
        id: 'module-1',
        title: 'Test Module',
        description: 'Test description',
        category: 'test-category',
        orderIndex: 1,
        isPublished: false,
        materials: [
          {
            id: 'material-1',
            materialType: 'link',
            title: 'Test Link',
            description: 'Test link description',
            materialData: {
              url: 'https://example.com'
            },
            orderIndex: 1
          },
          {
            id: 'material-2',
            materialType: 'video',
            title: 'Test Video',
            description: 'Test video description',
            materialData: {
              url: 'https://youtube.com/watch?v=test'
            },
            orderIndex: 2
          }
        ],
        createdBy: 'admin-user-id',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(learningService.getModuleForAdmin).mockResolvedValue({
        success: true,
        data: mockModule
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules/module-1', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getModule(request, { params: { id: 'module-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual(mockModule);
      expect(responseData.data.materials).toHaveLength(2);
      expect(learningService.getModuleForAdmin).toHaveBeenCalledWith('module-1');
    });

    it('should return 404 for non-existent module', async () => {
      vi.mocked(learningService.getModuleForAdmin).mockResolvedValue({
        success: false,
        error: 'Learning module not found',
        code: 'MODULE_NOT_FOUND'
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules/nonexistent', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getModule(request, { params: { id: 'nonexistent' } });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('MODULE_NOT_FOUND');
    });
  });

  describe('PUT /api/v1/admin/learning-modules/:id - Update Module', () => {
    it('should update module successfully', async () => {
      const updateData = {
        title: 'Updated Module Title',
        description: 'Updated description',
        category: 'updated-category',
        orderIndex: 2
      };

      const mockUpdatedModule = {
        id: 'module-1',
        ...updateData,
        isPublished: false,
        materials: [],
        updatedAt: new Date()
      };

      vi.mocked(learningService.updateModule).mockResolvedValue({
        success: true,
        data: mockUpdatedModule
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules/module-1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await updateModule(request, { params: { id: 'module-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.title).toBe(updateData.title);
      expect(learningService.updateModule).toHaveBeenCalledWith('module-1', updateData, 'admin-user-id');
    });

    it('should validate update data', async () => {
      const invalidUpdateData = {
        orderIndex: 'invalid' as any,
        category: '' // Empty category
      };

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules/module-1', {
        method: 'PUT',
        body: JSON.stringify(invalidUpdateData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await updateModule(request, { params: { id: 'module-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Validation failed');
    });
  });

  describe('DELETE /api/v1/admin/learning-modules/:id - Delete Module', () => {
    it('should delete module successfully', async () => {
      vi.mocked(learningService.deleteModule).mockResolvedValue({
        success: true,
        data: { id: 'module-1', deleted: true }
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules/module-1', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await deleteModule(request, { params: { id: 'module-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Learning module deleted successfully');
      expect(learningService.deleteModule).toHaveBeenCalledWith('module-1', 'admin-user-id');
    });

    it('should handle deletion of module with user progress', async () => {
      vi.mocked(learningService.deleteModule).mockResolvedValue({
        success: false,
        error: 'Cannot delete module with existing user progress',
        code: 'MODULE_HAS_PROGRESS'
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules/module-1', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await deleteModule(request, { params: { id: 'module-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(409);
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('MODULE_HAS_PROGRESS');
    });
  });

  describe('POST /api/v1/admin/learning-modules/:id/materials - Add Material', () => {
    it('should add material to module successfully', async () => {
      const materialData = {
        materialType: 'video' as const,
        title: 'New Video Material',
        description: 'Educational video content',
        materialData: {
          url: 'https://youtube.com/watch?v=neweducation'
        },
        orderIndex: 3
      };

      const mockCreatedMaterial = {
        id: 'material-new',
        moduleId: 'module-1',
        ...materialData,
        createdAt: new Date()
      };

      vi.mocked(learningService.addMaterial).mockResolvedValue({
        success: true,
        data: mockCreatedMaterial
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules/module-1/materials', {
        method: 'POST',
        body: JSON.stringify(materialData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await addMaterial(request, { params: { id: 'module-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.data.title).toBe(materialData.title);
      expect(learningService.addMaterial).toHaveBeenCalledWith('module-1', materialData, 'admin-user-id');
    });

    it('should validate material data', async () => {
      const invalidMaterialData = {
        materialType: 'invalid-type' as any,
        title: '', // Empty title
        materialData: {
          url: 'not-a-url'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules/module-1/materials', {
        method: 'POST',
        body: JSON.stringify(invalidMaterialData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await addMaterial(request, { params: { id: 'module-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Validation failed');
    });

    it('should validate video URLs for supported platforms', async () => {
      const materialData = {
        materialType: 'video' as const,
        title: 'Test Video',
        description: 'Test video',
        materialData: {
          url: 'https://unsupported-platform.com/video'
        },
        orderIndex: 1
      };

      vi.mocked(learningService.validateMaterialUrl).mockResolvedValue({
        success: false,
        error: 'Unsupported video platform',
        code: 'UNSUPPORTED_VIDEO_PLATFORM'
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules/module-1/materials', {
        method: 'POST',
        body: JSON.stringify(materialData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await addMaterial(request, { params: { id: 'module-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('UNSUPPORTED_VIDEO_PLATFORM');
    });
  });

  describe('PUT /api/v1/admin/learning-modules/materials/:materialId - Update Material', () => {
    it('should update material successfully', async () => {
      const updateData = {
        title: 'Updated Material Title',
        description: 'Updated description',
        materialData: {
          url: 'https://example.com/updated-link'
        }
      };

      const mockUpdatedMaterial = {
        id: 'material-1',
        moduleId: 'module-1',
        materialType: 'link',
        ...updateData,
        orderIndex: 1,
        updatedAt: new Date()
      };

      vi.mocked(learningService.updateMaterial).mockResolvedValue({
        success: true,
        data: mockUpdatedMaterial
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules/materials/material-1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await updateMaterial(request, { params: { materialId: 'material-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.title).toBe(updateData.title);
      expect(learningService.updateMaterial).toHaveBeenCalledWith('material-1', updateData, 'admin-user-id');
    });
  });

  describe('DELETE /api/v1/admin/learning-modules/materials/:materialId - Delete Material', () => {
    it('should delete material successfully', async () => {
      vi.mocked(learningService.deleteMaterial).mockResolvedValue({
        success: true,
        data: { id: 'material-1', deleted: true }
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules/materials/material-1', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await deleteMaterial(request, { params: { materialId: 'material-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Material deleted successfully');
      expect(learningService.deleteMaterial).toHaveBeenCalledWith('material-1', 'admin-user-id');
    });
  });

  describe('PUT /api/v1/admin/learning-modules/:id/publish - Publish/Unpublish Module', () => {
    it('should publish module successfully', async () => {
      const mockPublishedModule = {
        id: 'module-1',
        title: 'Test Module',
        isPublished: true,
        publishedAt: new Date()
      };

      vi.mocked(learningService.setModulePublished).mockResolvedValue({
        success: true,
        data: mockPublishedModule
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules/module-1/publish', {
        method: 'PUT',
        body: JSON.stringify({ isPublished: true }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await publishModule(request, { params: { id: 'module-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toContain('published successfully');
      expect(learningService.setModulePublished).toHaveBeenCalledWith('module-1', true, 'admin-user-id');
    });

    it('should unpublish module successfully', async () => {
      const mockUnpublishedModule = {
        id: 'module-1',
        title: 'Test Module',
        isPublished: false,
        publishedAt: null
      };

      vi.mocked(learningService.setModulePublished).mockResolvedValue({
        success: true,
        data: mockUnpublishedModule
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules/module-1/publish', {
        method: 'PUT',
        body: JSON.stringify({ isPublished: false }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await publishModule(request, { params: { id: 'module-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toContain('unpublished successfully');
    });

    it('should validate module has materials before publishing', async () => {
      vi.mocked(learningService.setModulePublished).mockResolvedValue({
        success: false,
        error: 'Cannot publish module without materials',
        code: 'MODULE_NO_MATERIALS'
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules/module-1/publish', {
        method: 'PUT',
        body: JSON.stringify({ isPublished: true }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await publishModule(request, { params: { id: 'module-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('MODULE_NO_MATERIALS');
    });
  });

  describe('GET /api/v1/admin/learning-modules/categories - Get Categories', () => {
    it('should return available categories', async () => {
      const mockCategories = [
        'security-basics',
        'security-advanced',
        'privacy-protection',
        'data-security',
        'network-security'
      ];

      vi.mocked(learningService.getCategories).mockResolvedValue({
        success: true,
        data: mockCategories
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules/categories', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getCategories(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual(mockCategories);
      expect(learningService.getCategories).toHaveBeenCalled();
    });

    it('should include category usage statistics', async () => {
      const mockCategoriesWithStats = [
        {
          name: 'security-basics',
          moduleCount: 5,
          publishedCount: 4
        },
        {
          name: 'security-advanced',
          moduleCount: 3,
          publishedCount: 2
        }
      ];

      vi.mocked(learningService.getCategories).mockResolvedValue({
        success: true,
        data: mockCategoriesWithStats
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules/categories?includeStats=true', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getCategories(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data[0]).toHaveProperty('moduleCount');
      expect(responseData.data[0]).toHaveProperty('publishedCount');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all admin endpoints', async () => {
      vi.mocked(validateSession).mockResolvedValue(mockInvalidSession);

      const endpoints = [
        { method: 'GET', url: '/api/v1/admin/learning-modules', handler: getModules },
        { method: 'POST', url: '/api/v1/admin/learning-modules', handler: createModule }
      ];

      for (const endpoint of endpoints) {
        const request = new NextRequest(`http://localhost:3000${endpoint.url}`, {
          method: endpoint.method,
          body: endpoint.method === 'POST' ? JSON.stringify({}) : undefined,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const response = await endpoint.handler(request);
        const responseData = await response.json();

        expect(response.status).toBe(401);
        expect(responseData.success).toBe(false);
        expect(responseData.error).toBe('Authentication required');
      }
    });

    it('should require admin role for all admin endpoints', async () => {
      vi.mocked(validateSession).mockResolvedValue(mockCustomerSession);

      const endpoints = [
        { method: 'GET', url: '/api/v1/admin/learning-modules', handler: getModules },
        { method: 'POST', url: '/api/v1/admin/learning-modules', handler: createModule }
      ];

      for (const endpoint of endpoints) {
        const request = new NextRequest(`http://localhost:3000${endpoint.url}`, {
          method: endpoint.method,
          body: endpoint.method === 'POST' ? JSON.stringify({}) : undefined,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer customer-token'
          }
        });

        const response = await endpoint.handler(request);
        const responseData = await response.json();

        expect(response.status).toBe(403);
        expect(responseData.success).toBe(false);
        expect(responseData.error).toBe('Admin access required');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      vi.mocked(learningService.createModule).mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Module',
          description: 'Test',
          category: 'test',
          materials: []
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await createModule(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Internal server error');
    });

    it('should handle malformed JSON requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await createModule(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Invalid JSON');
    });

    it('should validate module and material IDs', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules/', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getModule(request, { params: { id: '' } });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Invalid module ID');
    });
  });
});