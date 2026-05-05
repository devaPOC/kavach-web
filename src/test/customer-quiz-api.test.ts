import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the quiz service first
vi.mock('@/lib/services/awareness-lab/quiz.service', () => ({
  quizService: {
    getPublishedQuizzes: vi.fn(),
    getQuizForCustomer: vi.fn(),
    startQuizAttempt: vi.fn(),
    submitQuizAttempt: vi.fn(),
    getUserQuizProgress: vi.fn(),
    getUserAttemptHistory: vi.fn()
  }
}));

import { awarenessLabController } from '@/lib/controllers/awareness-lab/awareness-lab.controller';
import { quizService } from '@/lib/services/awareness-lab/quiz.service';

// Mock the session validation
const mockCustomerSession = {
  success: true,
  userId: 'test-customer-id',
  role: 'customer' as const,
  email: 'customer@test.com'
};

const mockInvalidSession = {
  success: false,
  userId: null,
  role: null,
  email: null
};

describe('Customer Quiz API Controller', () => {
  beforeAll(() => {
    // Mock the validateSession method
    vi.spyOn(awarenessLabController as any, 'validateSession')
      .mockResolvedValue(mockCustomerSession);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/quizzes', () => {
    it('should get published quizzes successfully', async () => {
      const mockQuizzes = [
        {
          id: 'quiz-1',
          title: 'Cybersecurity Basics',
          description: 'Learn the basics of cybersecurity',
          language: 'en',
          timeLimitMinutes: 30,
          maxAttempts: 3,
          isPublished: true
        },
        {
          id: 'quiz-2',
          title: 'Password Security',
          description: 'Best practices for password security',
          language: 'en',
          timeLimitMinutes: 15,
          maxAttempts: 2,
          isPublished: true
        }
      ];

      vi.mocked(quizService.getPublishedQuizzes).mockResolvedValue({
        success: true,
        data: mockQuizzes
      });

      const request = new NextRequest('http://localhost:3000/api/v1/quizzes?page=1&limit=20&language=en');

      const response = await awarenessLabController.getPublishedQuizzes(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.quizzes).toEqual(mockQuizzes);
      expect(responseData.data.pagination).toBeDefined();
      expect(responseData.data.pagination.page).toBe(1);
      expect(responseData.data.pagination.limit).toBe(20);
      expect(quizService.getPublishedQuizzes).toHaveBeenCalledWith('en', 20, 0);
    });

    it('should handle pagination correctly', async () => {
      const mockQuizzes = Array.from({ length: 10 }, (_, i) => ({
        id: `quiz-${i + 1}`,
        title: `Quiz ${i + 1}`,
        language: 'en',
        isPublished: true
      }));

      vi.mocked(quizService.getPublishedQuizzes).mockResolvedValue({
        success: true,
        data: mockQuizzes
      });

      const request = new NextRequest('http://localhost:3000/api/v1/quizzes?page=2&limit=10');

      const response = await awarenessLabController.getPublishedQuizzes(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data.pagination.page).toBe(2);
      expect(responseData.data.pagination.limit).toBe(10);
      expect(responseData.data.pagination.hasMore).toBe(true); // 10 items returned with limit 10 means there might be more
      expect(quizService.getPublishedQuizzes).toHaveBeenCalledWith(undefined, 10, 10);
    });

    it('should return 401 for unauthenticated requests', async () => {
      vi.spyOn(awarenessLabController as any, 'validateSession')
        .mockResolvedValueOnce(mockInvalidSession);

      const request = new NextRequest('http://localhost:3000/api/v1/quizzes');

      const response = await awarenessLabController.getPublishedQuizzes(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Authentication required');
    });
  });

  describe('GET /api/v1/quizzes/:id', () => {
    it('should get quiz for customer successfully', async () => {
      const mockQuiz = {
        id: 'quiz-1',
        title: 'Cybersecurity Basics',
        description: 'Learn the basics of cybersecurity',
        language: 'en',
        timeLimitMinutes: 30,
        maxAttempts: 3,
        isPublished: true,
        questions: [
          {
            id: 'question-1',
            questionType: 'mcq',
            questionData: {
              question: 'What is cybersecurity?',
              options: ['Option A', 'Option B', 'Option C', 'Option D']
            },
            orderIndex: 1
            // Note: correctAnswers should be excluded for customers
          }
        ],
        userProgress: {
          quizId: 'quiz-1',
          attemptCount: 1,
          maxAttempts: 3,
          canAttempt: true,
          bestScore: 75,
          hasCompletedAttempts: true
        }
      };

      vi.mocked(quizService.getQuizForCustomer).mockResolvedValue({
        success: true,
        data: mockQuiz
      });

      const request = new NextRequest('http://localhost:3000/api/v1/quizzes/quiz-1');

      const response = await awarenessLabController.getQuizForCustomer(request, 'quiz-1');
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.id).toBe('quiz-1');
      expect(responseData.data.userProgress).toBeDefined();
      expect(quizService.getQuizForCustomer).toHaveBeenCalledWith('quiz-1', 'test-customer-id');
    });

    it('should return 404 for non-existent quiz', async () => {
      vi.mocked(quizService.getQuizForCustomer).mockResolvedValue({
        success: false,
        error: 'Quiz not found',
        code: 'QUIZ_NOT_FOUND'
      });

      const request = new NextRequest('http://localhost:3000/api/v1/quizzes/non-existent');

      const response = await awarenessLabController.getQuizForCustomer(request, 'non-existent');
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Quiz not found');
    });

    it('should return 403 for unpublished quiz', async () => {
      vi.mocked(quizService.getQuizForCustomer).mockResolvedValue({
        success: false,
        error: 'Quiz is not published',
        code: 'QUIZ_NOT_PUBLISHED'
      });

      const request = new NextRequest('http://localhost:3000/api/v1/quizzes/unpublished-quiz');

      const response = await awarenessLabController.getQuizForCustomer(request, 'unpublished-quiz');
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Quiz is not published');
    });

    it('should return 400 for invalid quiz ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/quizzes/');

      const response = await awarenessLabController.getQuizForCustomer(request, '');
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Invalid quiz ID');
    });
  });

  describe('POST /api/v1/quizzes/:id/attempts', () => {
    it('should start quiz attempt successfully', async () => {
      const mockAttempt = {
        attemptId: 'attempt-1',
        quizId: 'quiz-1',
        timeLimitMinutes: 30,
        startedAt: new Date()
      };

      vi.mocked(quizService.startQuizAttempt).mockResolvedValue({
        success: true,
        data: mockAttempt
      });

      const request = new NextRequest('http://localhost:3000/api/v1/quizzes/quiz-1/attempts', {
        method: 'POST'
      });

      const response = await awarenessLabController.startQuizAttempt(request, 'quiz-1');
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.data.attemptId).toBe('attempt-1');
      expect(responseData.data.quizId).toBe('quiz-1');
      expect(quizService.startQuizAttempt).toHaveBeenCalledWith('test-customer-id', 'quiz-1');
    });

    it('should return 429 when attempt limit exceeded', async () => {
      vi.mocked(quizService.startQuizAttempt).mockResolvedValue({
        success: false,
        error: 'Maximum attempts (3) exceeded',
        code: 'ATTEMPT_LIMIT_EXCEEDED'
      });

      const request = new NextRequest('http://localhost:3000/api/v1/quizzes/quiz-1/attempts', {
        method: 'POST'
      });

      const response = await awarenessLabController.startQuizAttempt(request, 'quiz-1');
      const responseData = await response.json();

      expect(response.status).toBe(429);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Maximum attempts');
    });

    it('should return 404 for non-existent quiz', async () => {
      vi.mocked(quizService.startQuizAttempt).mockResolvedValue({
        success: false,
        error: 'Quiz not found',
        code: 'QUIZ_NOT_FOUND'
      });

      const request = new NextRequest('http://localhost:3000/api/v1/quizzes/non-existent/attempts', {
        method: 'POST'
      });

      const response = await awarenessLabController.startQuizAttempt(request, 'non-existent');
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Quiz not found');
    });
  });

  describe('PUT /api/v1/quizzes/attempts/:id/submit', () => {
    it('should submit quiz attempt successfully', async () => {
      const mockResult = {
        attemptId: 'attempt-1',
        score: 85,
        totalQuestions: 10,
        correctAnswers: 8,
        timeTakenSeconds: 1200,
        isCompleted: true,
        results: [
          {
            questionId: 'question-1',
            userAnswers: ['Option A'],
            correctAnswers: ['Option A'],
            isCorrect: true,
            explanation: 'Correct! This is the right answer.'
          },
          {
            questionId: 'question-2',
            userAnswers: ['Option B'],
            correctAnswers: ['Option C'],
            isCorrect: false,
            explanation: 'Incorrect. The correct answer is Option C.'
          }
        ]
      };

      vi.mocked(quizService.submitQuizAttempt).mockResolvedValue({
        success: true,
        data: mockResult
      });

      const submitData = {
        answers: {
          'question-1': ['Option A'],
          'question-2': ['Option B']
        },
        timeTakenSeconds: 1200
      };

      const request = new NextRequest('http://localhost:3000/api/v1/quizzes/attempts/attempt-1/submit', {
        method: 'PUT',
        body: JSON.stringify(submitData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await awarenessLabController.submitQuizAttempt(request, 'attempt-1');
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.score).toBe(85);
      expect(responseData.data.correctAnswers).toBe(8);
      expect(responseData.data.results).toHaveLength(2);
      expect(quizService.submitQuizAttempt).toHaveBeenCalledWith(
        'attempt-1',
        submitData.answers,
        submitData.timeTakenSeconds,
        'test-customer-id'
      );
    });

    it('should return 400 for missing answers', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/quizzes/attempts/attempt-1/submit', {
        method: 'PUT',
        body: JSON.stringify({ timeTakenSeconds: 1200 }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await awarenessLabController.submitQuizAttempt(request, 'attempt-1');
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Answers are required');
    });

    it('should return 400 for invalid time taken', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/quizzes/attempts/attempt-1/submit', {
        method: 'PUT',
        body: JSON.stringify({
          answers: { 'question-1': ['Option A'] },
          timeTakenSeconds: -100
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await awarenessLabController.submitQuizAttempt(request, 'attempt-1');
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Valid time taken is required');
    });

    it('should return 409 for already completed attempt', async () => {
      vi.mocked(quizService.submitQuizAttempt).mockResolvedValue({
        success: false,
        error: 'Quiz attempt already completed',
        code: 'QUIZ_ALREADY_COMPLETED'
      });

      const request = new NextRequest('http://localhost:3000/api/v1/quizzes/attempts/attempt-1/submit', {
        method: 'PUT',
        body: JSON.stringify({
          answers: { 'question-1': ['Option A'] },
          timeTakenSeconds: 1200
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await awarenessLabController.submitQuizAttempt(request, 'attempt-1');
      const responseData = await response.json();

      expect(response.status).toBe(409);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Quiz attempt already completed');
    });

    it('should return 408 for time expired', async () => {
      vi.mocked(quizService.submitQuizAttempt).mockResolvedValue({
        success: false,
        error: 'Quiz time limit exceeded',
        code: 'QUIZ_TIME_EXPIRED'
      });

      const request = new NextRequest('http://localhost:3000/api/v1/quizzes/attempts/attempt-1/submit', {
        method: 'PUT',
        body: JSON.stringify({
          answers: { 'question-1': ['Option A'] },
          timeTakenSeconds: 2400 // 40 minutes
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await awarenessLabController.submitQuizAttempt(request, 'attempt-1');
      const responseData = await response.json();

      expect(response.status).toBe(408);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Quiz time limit exceeded');
    });

    it('should return 403 for unauthorized access', async () => {
      vi.mocked(quizService.submitQuizAttempt).mockResolvedValue({
        success: false,
        error: 'Unauthorized access to quiz attempt',
        code: 'UNAUTHORIZED'
      });

      const request = new NextRequest('http://localhost:3000/api/v1/quizzes/attempts/attempt-1/submit', {
        method: 'PUT',
        body: JSON.stringify({
          answers: { 'question-1': ['Option A'] },
          timeTakenSeconds: 1200
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await awarenessLabController.submitQuizAttempt(request, 'attempt-1');
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Unauthorized access to quiz attempt');
    });
  });

  describe('GET /api/v1/quizzes/:id/progress', () => {
    it('should get user quiz progress successfully', async () => {
      const mockProgress = {
        quizId: 'quiz-1',
        attemptCount: 2,
        maxAttempts: 3,
        canAttempt: true,
        bestScore: 85,
        hasCompletedAttempts: true,
        lastAttemptDate: new Date()
      };

      vi.mocked(quizService.getUserQuizProgress).mockResolvedValue({
        success: true,
        data: mockProgress
      });

      const request = new NextRequest('http://localhost:3000/api/v1/quizzes/quiz-1/progress');

      const response = await awarenessLabController.getUserQuizProgress(request, 'quiz-1');
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.quizId).toBe('quiz-1');
      expect(responseData.data.attemptCount).toBe(2);
      expect(responseData.data.canAttempt).toBe(true);
      expect(quizService.getUserQuizProgress).toHaveBeenCalledWith('test-customer-id', 'quiz-1');
    });
  });

  describe('GET /api/v1/quizzes/:id/attempts/history', () => {
    it('should get user attempt history successfully', async () => {
      const mockHistory = [
        {
          id: 'attempt-2',
          score: 85,
          timeTakenSeconds: 1200,
          isCompleted: true,
          startedAt: new Date('2024-01-02'),
          completedAt: new Date('2024-01-02')
        },
        {
          id: 'attempt-1',
          score: 70,
          timeTakenSeconds: 1500,
          isCompleted: true,
          startedAt: new Date('2024-01-01'),
          completedAt: new Date('2024-01-01')
        }
      ];

      vi.mocked(quizService.getUserAttemptHistory).mockResolvedValue({
        success: true,
        data: mockHistory
      });

      const request = new NextRequest('http://localhost:3000/api/v1/quizzes/quiz-1/attempts/history');

      const response = await awarenessLabController.getUserAttemptHistory(request, 'quiz-1');
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveLength(2);
      expect(responseData.data[0].score).toBe(85); // Most recent first
      expect(quizService.getUserAttemptHistory).toHaveBeenCalledWith('test-customer-id', 'quiz-1');
    });
  });
});