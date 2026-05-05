import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Import route handlers
import { GET as getTemplates, POST as createTemplate } from '@/app/(backend)/api/v1/admin/quiz-templates/route';
import { GET as getTemplate, PUT as updateTemplate, DELETE as deleteTemplate } from '@/app/(backend)/api/v1/admin/quiz-templates/[id]/route';
import { POST as duplicateTemplate } from '@/app/(backend)/api/v1/admin/quiz-templates/[id]/duplicate/route';
import { POST as useTemplate } from '@/app/(backend)/api/v1/admin/quiz-templates/[id]/use/route';
import { GET as getUsageStats } from '@/app/(backend)/api/v1/admin/quiz-templates/[id]/usage-stats/route';

// Mock the template service
vi.mock('@/lib/services/awareness-lab/template.service', () => ({
  templateService: {
    createTemplate: vi.fn(),
    getTemplates: vi.fn(),
    getTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    duplicateTemplate: vi.fn(),
    useTemplate: vi.fn(),
    getUsageStats: vi.fn(),
    getPopularTemplates: vi.fn(),
    searchTemplates: vi.fn()
  }
}));

// Mock authentication
vi.mock('@/lib/auth/session-validation-middleware', () => ({
  validateSession: vi.fn()
}));

import { templateService } from '@/lib/services/awareness-lab/template.service';
import { validateSession } from '@/lib/auth/session-validation-middleware';

describe('Quiz Template Management Integration Tests', () => {
  const mockAdminSession = {
    success: true,
    userId: 'admin-user-id',
    role: 'admin' as const,
    email: 'admin@test.com'
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

  describe('POST /api/v1/admin/quiz-templates - Create Template', () => {
    it('should create template successfully', async () => {
      const templateData = {
        name: 'Cybersecurity Basic Template',
        description: 'Template for basic cybersecurity quizzes',
        templateConfig: {
          timeLimitMinutes: 30,
          maxAttempts: 3,
          language: 'en' as const,
          questionTypes: ['mcq', 'true_false'],
          defaultQuestionCount: 10
        }
      };

      const mockCreatedTemplate = {
        id: 'template-123',
        ...templateData,
        createdBy: 'admin-user-id',
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(templateService.createTemplate).mockResolvedValue({
        success: true,
        data: mockCreatedTemplate
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quiz-templates', {
        method: 'POST',
        body: JSON.stringify(templateData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await createTemplate(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.data.id).toBe('template-123');
      expect(responseData.data.name).toBe(templateData.name);
      expect(templateService.createTemplate).toHaveBeenCalledWith('admin-user-id', templateData);
    });

    it('should validate template configuration', async () => {
      const invalidTemplateData = {
        name: 'Test Template',
        description: 'Test description',
        templateConfig: {
          timeLimitMinutes: -10, // Invalid negative time
          maxAttempts: 0, // Invalid zero attempts
          language: 'invalid' as any,
          questionTypes: [],
          defaultQuestionCount: -5
        }
      };

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quiz-templates', {
        method: 'POST',
        body: JSON.stringify(invalidTemplateData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await createTemplate(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Validation failed');
    });

    it('should require authentication', async () => {
      vi.mocked(validateSession).mockResolvedValue(mockInvalidSession);

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quiz-templates', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await createTemplate(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Authentication required');
    });
  });

  describe('GET /api/v1/admin/quiz-templates - List Templates', () => {
    it('should return paginated template list', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Basic Security Template',
          description: 'For basic security quizzes',
          usageCount: 5,
          createdAt: new Date()
        },
        {
          id: 'template-2',
          name: 'Advanced Security Template',
          description: 'For advanced security quizzes',
          usageCount: 2,
          createdAt: new Date()
        }
      ];

      vi.mocked(templateService.getTemplates).mockResolvedValue({
        success: true,
        data: mockTemplates
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quiz-templates?page=1&limit=10&sortBy=usageCount&sortOrder=desc', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getTemplates(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.templates).toEqual(mockTemplates);
      expect(responseData.data.pagination).toBeDefined();
      expect(responseData.data.sorting).toEqual({
        sortBy: 'usageCount',
        sortOrder: 'desc'
      });
    });

    it('should handle search functionality', async () => {
      const mockSearchResults = [
        {
          id: 'template-1',
          name: 'Security Template',
          description: 'Security related template',
          usageCount: 3
        }
      ];

      vi.mocked(templateService.searchTemplates).mockResolvedValue({
        success: true,
        data: mockSearchResults
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quiz-templates?search=security', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getTemplates(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data.search).toBe('security');
      expect(templateService.searchTemplates).toHaveBeenCalledWith('security', 20, 0);
    });
  });

  describe('GET /api/v1/admin/quiz-templates/:id - Get Template Details', () => {
    it('should return template details', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Test Template',
        description: 'Test description',
        templateConfig: {
          timeLimitMinutes: 30,
          maxAttempts: 3,
          language: 'en',
          questionTypes: ['mcq', 'true_false'],
          defaultQuestionCount: 10
        },
        usageCount: 5,
        createdBy: 'admin-user-id',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(templateService.getTemplate).mockResolvedValue({
        success: true,
        data: mockTemplate
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quiz-templates/template-1', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getTemplate(request, { params: { id: 'template-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual(mockTemplate);
      expect(templateService.getTemplate).toHaveBeenCalledWith('template-1');
    });

    it('should return 404 for non-existent template', async () => {
      vi.mocked(templateService.getTemplate).mockResolvedValue({
        success: false,
        error: 'Template not found',
        code: 'TEMPLATE_NOT_FOUND'
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quiz-templates/nonexistent', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getTemplate(request, { params: { id: 'nonexistent' } });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('TEMPLATE_NOT_FOUND');
    });
  });

  describe('PUT /api/v1/admin/quiz-templates/:id - Update Template', () => {
    it('should update template successfully', async () => {
      const updateData = {
        name: 'Updated Template Name',
        description: 'Updated description',
        templateConfig: {
          timeLimitMinutes: 45,
          maxAttempts: 5,
          language: 'ar' as const,
          questionTypes: ['mcq', 'multiple_select'],
          defaultQuestionCount: 15
        }
      };

      const mockUpdatedTemplate = {
        id: 'template-1',
        ...updateData,
        usageCount: 5,
        updatedAt: new Date()
      };

      vi.mocked(templateService.updateTemplate).mockResolvedValue({
        success: true,
        data: mockUpdatedTemplate
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quiz-templates/template-1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await updateTemplate(request, { params: { id: 'template-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.name).toBe(updateData.name);
      expect(templateService.updateTemplate).toHaveBeenCalledWith('template-1', updateData, 'admin-user-id');
    });

    it('should validate update data', async () => {
      const invalidUpdateData = {
        templateConfig: {
          timeLimitMinutes: 'invalid' as any,
          maxAttempts: -1,
          language: 'invalid-lang' as any
        }
      };

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quiz-templates/template-1', {
        method: 'PUT',
        body: JSON.stringify(invalidUpdateData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await updateTemplate(request, { params: { id: 'template-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Validation failed');
    });
  });

  describe('DELETE /api/v1/admin/quiz-templates/:id - Delete Template', () => {
    it('should delete template successfully', async () => {
      vi.mocked(templateService.deleteTemplate).mockResolvedValue({
        success: true,
        data: { id: 'template-1', deleted: true }
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quiz-templates/template-1', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await deleteTemplate(request, { params: { id: 'template-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Template deleted successfully');
      expect(templateService.deleteTemplate).toHaveBeenCalledWith('template-1', 'admin-user-id');
    });

    it('should handle deletion of template in use', async () => {
      vi.mocked(templateService.deleteTemplate).mockResolvedValue({
        success: false,
        error: 'Cannot delete template that is currently in use',
        code: 'TEMPLATE_IN_USE'
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quiz-templates/template-1', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await deleteTemplate(request, { params: { id: 'template-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(409);
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('TEMPLATE_IN_USE');
    });
  });

  describe('POST /api/v1/admin/quiz-templates/:id/duplicate - Duplicate Template', () => {
    it('should duplicate template successfully', async () => {
      const duplicateData = {
        name: 'Duplicated Template',
        description: 'Copy of original template'
      };

      const mockDuplicatedTemplate = {
        id: 'template-new',
        name: duplicateData.name,
        description: duplicateData.description,
        templateConfig: {
          timeLimitMinutes: 30,
          maxAttempts: 3,
          language: 'en',
          questionTypes: ['mcq'],
          defaultQuestionCount: 10
        },
        usageCount: 0,
        createdBy: 'admin-user-id',
        createdAt: new Date()
      };

      vi.mocked(templateService.duplicateTemplate).mockResolvedValue({
        success: true,
        data: mockDuplicatedTemplate
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quiz-templates/template-1/duplicate', {
        method: 'POST',
        body: JSON.stringify(duplicateData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await duplicateTemplate(request, { params: { id: 'template-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.data.name).toBe(duplicateData.name);
      expect(templateService.duplicateTemplate).toHaveBeenCalledWith('template-1', duplicateData, 'admin-user-id');
    });
  });

  describe('POST /api/v1/admin/quiz-templates/:id/use - Use Template', () => {
    it('should create quiz from template successfully', async () => {
      const quizData = {
        title: 'New Quiz from Template',
        description: 'Quiz created using template'
      };

      const mockCreatedQuiz = {
        id: 'quiz-new',
        templateId: 'template-1',
        title: quizData.title,
        description: quizData.description,
        timeLimitMinutes: 30,
        maxAttempts: 3,
        language: 'en',
        isPublished: false,
        questions: [],
        createdBy: 'admin-user-id',
        createdAt: new Date()
      };

      vi.mocked(templateService.useTemplate).mockResolvedValue({
        success: true,
        data: mockCreatedQuiz
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quiz-templates/template-1/use', {
        method: 'POST',
        body: JSON.stringify(quizData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await useTemplate(request, { params: { id: 'template-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.data.templateId).toBe('template-1');
      expect(responseData.data.title).toBe(quizData.title);
      expect(templateService.useTemplate).toHaveBeenCalledWith('template-1', quizData, 'admin-user-id');
    });

    it('should validate quiz data when using template', async () => {
      const invalidQuizData = {
        // Missing required title
        description: 'Quiz without title'
      };

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quiz-templates/template-1/use', {
        method: 'POST',
        body: JSON.stringify(invalidQuizData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await useTemplate(request, { params: { id: 'template-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Validation failed');
    });
  });

  describe('GET /api/v1/admin/quiz-templates/:id/usage-stats - Get Usage Statistics', () => {
    it('should return template usage statistics', async () => {
      const mockUsageStats = {
        templateId: 'template-1',
        templateName: 'Test Template',
        totalUsage: 10,
        recentUsage: {
          lastWeek: 3,
          lastMonth: 8,
          lastYear: 10
        },
        quizzesCreated: [
          {
            id: 'quiz-1',
            title: 'Quiz 1',
            createdAt: new Date(),
            createdBy: 'admin-1'
          },
          {
            id: 'quiz-2',
            title: 'Quiz 2',
            createdAt: new Date(),
            createdBy: 'admin-2'
          }
        ],
        popularityRank: 2,
        averageQuizScore: 75.5,
        totalQuizAttempts: 150
      };

      vi.mocked(templateService.getUsageStats).mockResolvedValue({
        success: true,
        data: mockUsageStats
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quiz-templates/template-1/usage-stats', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getUsageStats(request, { params: { id: 'template-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual(mockUsageStats);
      expect(templateService.getUsageStats).toHaveBeenCalledWith('template-1');
    });

    it('should handle date range filtering for usage stats', async () => {
      const mockFilteredStats = {
        templateId: 'template-1',
        templateName: 'Test Template',
        totalUsage: 5,
        dateRange: {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        },
        quizzesCreated: [],
        totalQuizAttempts: 75
      };

      vi.mocked(templateService.getUsageStats).mockResolvedValue({
        success: true,
        data: mockFilteredStats
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quiz-templates/template-1/usage-stats?startDate=2024-01-01&endDate=2024-01-31', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getUsageStats(request, { params: { id: 'template-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data.dateRange).toBeDefined();
      expect(templateService.getUsageStats).toHaveBeenCalledWith('template-1', {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle service errors gracefully', async () => {
      vi.mocked(templateService.createTemplate).mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quiz-templates', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Template',
          description: 'Test',
          templateConfig: {
            timeLimitMinutes: 30,
            maxAttempts: 3,
            language: 'en',
            questionTypes: ['mcq'],
            defaultQuestionCount: 10
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await createTemplate(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Internal server error');
    });

    it('should validate template ID format', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/admin/quiz-templates/', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getTemplate(request, { params: { id: '' } });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Invalid template ID');
    });

    it('should handle concurrent template usage', async () => {
      vi.mocked(templateService.useTemplate).mockResolvedValue({
        success: false,
        error: 'Template is currently being modified',
        code: 'TEMPLATE_LOCKED'
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quiz-templates/template-1/use', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Quiz',
          description: 'Test quiz'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await useTemplate(request, { params: { id: 'template-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(409);
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('TEMPLATE_LOCKED');
    });
  });
});