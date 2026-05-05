import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Import route handlers
import { GET as getAdminQuizzes, POST as createQuiz } from '@/app/(backend)/api/v1/admin/quizzes/route';
import { GET as getAdminQuiz, PUT as updateQuiz, DELETE as deleteQuiz } from '@/app/(backend)/api/v1/admin/quizzes/[id]/route';
import { PUT as publishQuiz } from '@/app/(backend)/api/v1/admin/quizzes/[id]/publish/route';

// Mock the quiz service
vi.mock('@/lib/services/awareness-lab/quiz.service', () => ({
  quizService: {
    createQuiz: vi.fn(),
    getQuizzesForAdmin: vi.fn(),
    getQuizForAdmin: vi.fn(),
    updateQuiz: vi.fn(),
    deleteQuiz: vi.fn(),
    setQuizPublished: vi.fn(),
    duplicateQuiz: vi.fn()
  }
}));

// Mock authentication middleware
vi.mock('@/lib/auth/session-validation-middleware', () => ({
  validateSession: vi.fn()
}));

import { quizService } from '@/lib/services/awareness-lab/quiz.service';
import { validateSession } from '@/lib/auth/session-validation-middleware';

describe('Admin Quiz Management Integration Tests', () => {
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
    // Default to admin session
    vi.mocked(validateSession).mockResolvedValue(mockAdminSession);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/admin/quizzes - Create Quiz', () => {
    it('should create a quiz successfully with valid admin authentication', async () => {
      const quizData = {
        title: 'Cybersecurity Fundamentals',
        description: 'Learn the basics of cybersecurity',
        language: 'en' as const,
        targetAudience: 'customer' as const,
        timeLimitMinutes: 30,
        maxAttempts: 3,
        questions: [
          {
            questionType: 'mcq' as const,
            questionData: {
              question: 'What is cybersecurity?',
              options: ['Option A', 'Option B', 'Option C', 'Option D']
            },
            correctAnswers: ['Option A'],
            orderIndex: 1
          }
        ]
      };

      const mockCreatedQuiz = {
        id: 'quiz-123',
        ...quizData,
        createdBy: 'admin-user-id',
        isPublished: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(quizService.createQuiz).mockResolvedValue({
        success: true,
        data: mockCreatedQuiz
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quizzes', {
        method: 'POST',
        body: JSON.stringify(quizData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await createQuiz(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.data.id).toBe('quiz-123');
      expect(responseData.data.title).toBe(quizData.title);
      expect(quizService.createQuiz).toHaveBeenCalledWith('admin-user-id', quizData);
    });

    it('should reject quiz creation with invalid data', async () => {
      const invalidQuizData = {
        // Missing required title
        description: 'Test description',
        language: 'en',
        timeLimitMinutes: 30,
        maxAttempts: 3,
        questions: []
      };

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quizzes', {
        method: 'POST',
        body: JSON.stringify(invalidQuizData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await createQuiz(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Validation failed');
    });

    it('should reject quiz creation for non-admin users', async () => {
      vi.mocked(validateSession).mockResolvedValue(mockCustomerSession);

      const quizData = {
        title: 'Test Quiz',
        description: 'Test description',
        language: 'en' as const,
        targetAudience: 'customer' as const,
        timeLimitMinutes: 30,
        maxAttempts: 3,
        questions: []
      };

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quizzes', {
        method: 'POST',
        body: JSON.stringify(quizData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer customer-token'
        }
      });

      const response = await createQuiz(request);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Admin access required');
    });

    it('should reject unauthenticated requests', async () => {
      vi.mocked(validateSession).mockResolvedValue(mockInvalidSession);

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quizzes', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await createQuiz(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Authentication required');
    });
  });

  describe('GET /api/v1/admin/quizzes - List Quizzes', () => {
    it('should return paginated quiz list for admin', async () => {
      const mockQuizzes = [
        {
          id: 'quiz-1',
          title: 'Quiz 1',
          description: 'Description 1',
          language: 'en',
          isPublished: true,
          createdAt: new Date()
        },
        {
          id: 'quiz-2',
          title: 'Quiz 2',
          description: 'Description 2',
          language: 'ar',
          isPublished: false,
          createdAt: new Date()
        }
      ];

      vi.mocked(quizService.getQuizzesForAdmin).mockResolvedValue({
        success: true,
        data: mockQuizzes
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quizzes?page=1&limit=10&language=en&published=true', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getAdminQuizzes(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.quizzes).toEqual(mockQuizzes);
      expect(responseData.data.pagination).toBeDefined();
      expect(responseData.data.filters).toEqual({
        language: 'en',
        published: true,
        search: undefined
      });
    });

    it('should handle search functionality', async () => {
      const mockSearchResults = [
        {
          id: 'quiz-1',
          title: 'Cybersecurity Quiz',
          description: 'Security fundamentals',
          language: 'en',
          isPublished: true
        }
      ];

      vi.mocked(quizService.getQuizzesForAdmin).mockResolvedValue({
        success: true,
        data: mockSearchResults
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quizzes?search=cybersecurity', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getAdminQuizzes(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data.filters.search).toBe('cybersecurity');
      expect(quizService.getQuizzesForAdmin).toHaveBeenCalledWith({
        search: 'cybersecurity',
        language: undefined,
        published: undefined,
        createdBy: undefined
      }, 20, 0);
    });
  });

  describe('GET /api/v1/admin/quizzes/:id - Get Quiz Details', () => {
    it('should return quiz details for admin', async () => {
      const mockQuiz = {
        id: 'quiz-1',
        title: 'Test Quiz',
        description: 'Test description',
        language: 'en',
        timeLimitMinutes: 30,
        maxAttempts: 3,
        isPublished: false,
        questions: [
          {
            id: 'question-1',
            questionType: 'mcq',
            questionData: {
              question: 'Test question?',
              options: ['A', 'B', 'C', 'D']
            },
            correctAnswers: ['A'],
            orderIndex: 1
          }
        ],
        createdBy: 'admin-user-id',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(quizService.getQuizForAdmin).mockResolvedValue({
        success: true,
        data: mockQuiz
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quizzes/quiz-1', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getAdminQuiz(request, { params: { id: 'quiz-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual(mockQuiz);
      expect(quizService.getQuizForAdmin).toHaveBeenCalledWith('quiz-1');
    });

    it('should return 404 for non-existent quiz', async () => {
      vi.mocked(quizService.getQuizForAdmin).mockResolvedValue({
        success: false,
        error: 'Quiz not found',
        code: 'QUIZ_NOT_FOUND'
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quizzes/nonexistent', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getAdminQuiz(request, { params: { id: 'nonexistent' } });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('QUIZ_NOT_FOUND');
    });
  });

  describe('PUT /api/v1/admin/quizzes/:id - Update Quiz', () => {
    it('should update quiz successfully', async () => {
      const updateData = {
        title: 'Updated Quiz Title',
        description: 'Updated description',
        timeLimitMinutes: 45
      };

      const mockUpdatedQuiz = {
        id: 'quiz-1',
        ...updateData,
        language: 'en',
        maxAttempts: 3,
        isPublished: false,
        updatedAt: new Date()
      };

      vi.mocked(quizService.updateQuiz).mockResolvedValue({
        success: true,
        data: mockUpdatedQuiz
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quizzes/quiz-1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await updateQuiz(request, { params: { id: 'quiz-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.title).toBe(updateData.title);
      expect(quizService.updateQuiz).toHaveBeenCalledWith('quiz-1', updateData, 'admin-user-id');
    });

    it('should reject updates with invalid data', async () => {
      const invalidUpdateData = {
        timeLimitMinutes: -10 // Invalid negative time
      };

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quizzes/quiz-1', {
        method: 'PUT',
        body: JSON.stringify(invalidUpdateData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await updateQuiz(request, { params: { id: 'quiz-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Validation failed');
    });
  });

  describe('DELETE /api/v1/admin/quizzes/:id - Delete Quiz', () => {
    it('should delete quiz successfully', async () => {
      vi.mocked(quizService.deleteQuiz).mockResolvedValue({
        success: true,
        data: { id: 'quiz-1', deleted: true }
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quizzes/quiz-1', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await deleteQuiz(request, { params: { id: 'quiz-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Quiz deleted successfully');
      expect(quizService.deleteQuiz).toHaveBeenCalledWith('quiz-1', 'admin-user-id');
    });

    it('should handle deletion of quiz with existing attempts', async () => {
      vi.mocked(quizService.deleteQuiz).mockResolvedValue({
        success: false,
        error: 'Cannot delete quiz with existing attempts',
        code: 'QUIZ_HAS_ATTEMPTS'
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quizzes/quiz-1', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await deleteQuiz(request, { params: { id: 'quiz-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(409);
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('QUIZ_HAS_ATTEMPTS');
    });
  });

  describe('PUT /api/v1/admin/quizzes/:id/publish - Publish/Unpublish Quiz', () => {
    it('should publish quiz successfully', async () => {
      const mockPublishedQuiz = {
        id: 'quiz-1',
        title: 'Test Quiz',
        isPublished: true,
        publishedAt: new Date()
      };

      vi.mocked(quizService.setQuizPublished).mockResolvedValue({
        success: true,
        data: mockPublishedQuiz
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quizzes/quiz-1/publish', {
        method: 'PUT',
        body: JSON.stringify({ isPublished: true }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await publishQuiz(request, { params: { id: 'quiz-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toContain('published successfully');
      expect(quizService.setQuizPublished).toHaveBeenCalledWith('quiz-1', true, 'admin-user-id');
    });

    it('should unpublish quiz successfully', async () => {
      const mockUnpublishedQuiz = {
        id: 'quiz-1',
        title: 'Test Quiz',
        isPublished: false,
        publishedAt: null
      };

      vi.mocked(quizService.setQuizPublished).mockResolvedValue({
        success: true,
        data: mockUnpublishedQuiz
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quizzes/quiz-1/publish', {
        method: 'PUT',
        body: JSON.stringify({ isPublished: false }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await publishQuiz(request, { params: { id: 'quiz-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toContain('unpublished successfully');
    });

    it('should validate publish status value', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/admin/quizzes/quiz-1/publish', {
        method: 'PUT',
        body: JSON.stringify({ isPublished: 'invalid' }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await publishQuiz(request, { params: { id: 'quiz-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('isPublished must be a boolean');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all admin endpoints', async () => {
      vi.mocked(validateSession).mockResolvedValue(mockInvalidSession);

      const endpoints = [
        { method: 'GET', url: '/api/v1/admin/quizzes', handler: getAdminQuizzes },
        { method: 'POST', url: '/api/v1/admin/quizzes', handler: createQuiz }
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
        { method: 'GET', url: '/api/v1/admin/quizzes', handler: getAdminQuizzes },
        { method: 'POST', url: '/api/v1/admin/quizzes', handler: createQuiz }
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
      vi.mocked(quizService.createQuiz).mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/v1/admin/quizzes', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Quiz',
          description: 'Test',
          language: 'en',
          timeLimitMinutes: 30,
          maxAttempts: 3,
          questions: []
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await createQuiz(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Internal server error');
    });

    it('should handle malformed JSON requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/admin/quizzes', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await createQuiz(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Invalid JSON');
    });
  });
});