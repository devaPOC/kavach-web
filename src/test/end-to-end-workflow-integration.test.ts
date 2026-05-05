import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Import all relevant route handlers for the complete workflow
import { POST as createQuiz } from '@/app/(backend)/api/v1/admin/quizzes/route';
import { PUT as publishQuiz } from '@/app/(backend)/api/v1/admin/quizzes/[id]/publish/route';
import { GET as getPublishedQuizzes } from '@/app/(backend)/api/v1/quizzes/route';
import { GET as getQuizForCustomer } from '@/app/(backend)/api/v1/quizzes/[id]/route';
import { POST as startQuizAttempt } from '@/app/(backend)/api/v1/quizzes/[id]/attempts/route';
import { PUT as submitQuizAttempt } from '@/app/(backend)/api/v1/quizzes/attempts/[id]/submit/route';
import { GET as getQuizProgress } from '@/app/(backend)/api/v1/quizzes/[id]/progress/route';
import { GET as getAttemptHistory } from '@/app/(backend)/api/v1/quizzes/[id]/my-attempts/route';
import { GET as getQuizAnalytics } from '@/app/(backend)/api/v1/admin/analytics/quizzes/[id]/stats/route';

// Import learning materials handlers
import { POST as createLearningModule } from '@/app/(backend)/api/v1/admin/learning-modules/route';
import { PUT as publishModule } from '@/app/(backend)/api/v1/admin/learning-modules/[id]/publish/route';
import { GET as getPublishedModules } from '@/app/(backend)/api/v1/learning-modules/route';
import { GET as getModuleForCustomer } from '@/app/(backend)/api/v1/learning-modules/[id]/route';
import { POST as updateProgress } from '@/app/(backend)/api/v1/learning-modules/[id]/progress/route';

// Mock all services
vi.mock('@/lib/services/awareness-lab/quiz.service', () => ({
  quizService: {
    createQuiz: vi.fn(),
    setQuizPublished: vi.fn(),
    getPublishedQuizzes: vi.fn(),
    getQuizForCustomer: vi.fn(),
    startQuizAttempt: vi.fn(),
    submitQuizAttempt: vi.fn(),
    getUserQuizProgress: vi.fn(),
    getUserAttemptHistory: vi.fn()
  }
}));

vi.mock('@/lib/services/awareness-lab/learning.service', () => ({
  learningService: {
    createModule: vi.fn(),
    setModulePublished: vi.fn(),
    getPublishedModules: vi.fn(),
    getModuleForCustomer: vi.fn(),
    trackMaterialAccess: vi.fn(),
    markMaterialCompleted: vi.fn()
  }
}));

vi.mock('@/lib/services/awareness-lab/analytics.service', () => ({
  analyticsService: {
    getQuizAnalytics: vi.fn(),
    getQuizPerformanceMetrics: vi.fn(),
    getQuestionAnalytics: vi.fn()
  }
}));

vi.mock('@/lib/auth/session-validation-middleware', () => ({
  validateSession: vi.fn()
}));

import { quizService } from '@/lib/services/awareness-lab/quiz.service';
import { learningService } from '@/lib/services/awareness-lab/learning.service';
import { analyticsService } from '@/lib/services/awareness-lab/analytics.service';
import { validateSession } from '@/lib/auth/session-validation-middleware';

describe('End-to-End Workflow Integration Tests', () => {
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

  // Test data that will be used throughout the workflow
  const testQuizData = {
    title: 'Cybersecurity Fundamentals Quiz',
    description: 'Test your knowledge of cybersecurity basics',
    language: 'en' as const,
    targetAudience: 'customer' as const,
    timeLimitMinutes: 30,
    maxAttempts: 3,
    questions: [
      {
        questionType: 'mcq' as const,
        questionData: {
          question: 'What is the primary purpose of cybersecurity?',
          options: [
            'To protect digital assets and information',
            'To increase internet speed',
            'To create new software',
            'To manage databases'
          ]
        },
        correctAnswers: ['To protect digital assets and information'],
        orderIndex: 1
      },
      {
        questionType: 'true_false' as const,
        questionData: {
          question: 'Strong passwords should contain only letters.'
        },
        correctAnswers: ['false'],
        orderIndex: 2
      },
      {
        questionType: 'multiple_select' as const,
        questionData: {
          question: 'Which of the following are common cybersecurity threats?',
          options: [
            'Malware',
            'Phishing',
            'Social Engineering',
            'Regular Software Updates'
          ]
        },
        correctAnswers: ['Malware', 'Phishing', 'Social Engineering'],
        orderIndex: 3
      }
    ]
  };

  const testModuleData = {
    title: 'Cybersecurity Awareness Module',
    description: 'Learn about cybersecurity best practices',
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
        title: 'Password Security Best Practices',
        description: 'Learn how to create strong passwords',
        materialData: {
          url: 'https://youtube.com/watch?v=password-security'
        },
        orderIndex: 2
      }
    ]
  };

  let createdQuizId: string;
  let createdModuleId: string;
  let attemptId: string;

  beforeEach(() => {
    vi.clearAllMocks();
    createdQuizId = 'quiz-test-id';
    createdModuleId = 'module-test-id';
    attemptId = 'attempt-test-id';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Admin Content Creation Workflow', () => {
    it('should create, publish quiz and learning module successfully', async () => {
      // Step 1: Admin creates a quiz
      vi.mocked(validateSession).mockResolvedValue(mockAdminSession);
      
      const mockCreatedQuiz = {
        id: createdQuizId,
        ...testQuizData,
        createdBy: 'admin-user-id',
        isPublished: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(quizService.createQuiz).mockResolvedValue({
        success: true,
        data: mockCreatedQuiz
      });

      const createQuizRequest = new NextRequest('http://localhost:3000/api/v1/admin/quizzes', {
        method: 'POST',
        body: JSON.stringify(testQuizData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const createQuizResponse = await createQuiz(createQuizRequest);
      const createQuizData = await createQuizResponse.json();

      expect(createQuizResponse.status).toBe(201);
      expect(createQuizData.success).toBe(true);
      expect(createQuizData.data.id).toBe(createdQuizId);
      expect(createQuizData.data.isPublished).toBe(false);

      // Step 2: Admin publishes the quiz
      const mockPublishedQuiz = {
        ...mockCreatedQuiz,
        isPublished: true,
        publishedAt: new Date()
      };

      vi.mocked(quizService.setQuizPublished).mockResolvedValue({
        success: true,
        data: mockPublishedQuiz
      });

      const publishQuizRequest = new NextRequest(`http://localhost:3000/api/v1/admin/quizzes/${createdQuizId}/publish`, {
        method: 'PUT',
        body: JSON.stringify({ isPublished: true }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const publishQuizResponse = await publishQuiz(publishQuizRequest, { params: { id: createdQuizId } });
      const publishQuizData = await publishQuizResponse.json();

      expect(publishQuizResponse.status).toBe(200);
      expect(publishQuizData.success).toBe(true);
      expect(publishQuizData.message).toContain('published successfully');

      // Step 3: Admin creates a learning module
      const mockCreatedModule = {
        id: createdModuleId,
        ...testModuleData,
        createdBy: 'admin-user-id',
        isPublished: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(learningService.createModule).mockResolvedValue({
        success: true,
        data: mockCreatedModule
      });

      const createModuleRequest = new NextRequest('http://localhost:3000/api/v1/admin/learning-modules', {
        method: 'POST',
        body: JSON.stringify(testModuleData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const createModuleResponse = await createLearningModule(createModuleRequest);
      const createModuleData = await createModuleResponse.json();

      expect(createModuleResponse.status).toBe(201);
      expect(createModuleData.success).toBe(true);
      expect(createModuleData.data.id).toBe(createdModuleId);

      // Step 4: Admin publishes the learning module
      const mockPublishedModule = {
        ...mockCreatedModule,
        isPublished: true,
        publishedAt: new Date()
      };

      vi.mocked(learningService.setModulePublished).mockResolvedValue({
        success: true,
        data: mockPublishedModule
      });

      const publishModuleRequest = new NextRequest(`http://localhost:3000/api/v1/admin/learning-modules/${createdModuleId}/publish`, {
        method: 'PUT',
        body: JSON.stringify({ isPublished: true }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const publishModuleResponse = await publishModule(publishModuleRequest, { params: { id: createdModuleId } });
      const publishModuleData = await publishModuleResponse.json();

      expect(publishModuleResponse.status).toBe(200);
      expect(publishModuleData.success).toBe(true);
      expect(publishModuleData.message).toContain('published successfully');

      // Verify all service calls were made correctly
      expect(quizService.createQuiz).toHaveBeenCalledWith('admin-user-id', testQuizData);
      expect(quizService.setQuizPublished).toHaveBeenCalledWith(createdQuizId, true, 'admin-user-id');
      expect(learningService.createModule).toHaveBeenCalledWith('admin-user-id', testModuleData);
      expect(learningService.setModulePublished).toHaveBeenCalledWith(createdModuleId, true, 'admin-user-id');
    });
  });

  describe('Complete Customer Learning and Quiz-Taking Workflow', () => {
    it('should allow customer to discover content, learn, and take quiz successfully', async () => {
      // Step 1: Customer discovers published learning modules
      vi.mocked(validateSession).mockResolvedValue(mockCustomerSession);

      const mockPublishedModules = [
        {
          id: createdModuleId,
          title: testModuleData.title,
          description: testModuleData.description,
          category: testModuleData.category,
          isPublished: true,
          materialsCount: 2
        }
      ];

      vi.mocked(learningService.getPublishedModules).mockResolvedValue({
        success: true,
        data: mockPublishedModules
      });

      const getModulesRequest = new NextRequest('http://localhost:3000/api/v1/learning-modules', {
        headers: {
          'Authorization': 'Bearer customer-token'
        }
      });

      const getModulesResponse = await getPublishedModules(getModulesRequest);
      const getModulesData = await getModulesResponse.json();

      expect(getModulesResponse.status).toBe(200);
      expect(getModulesData.success).toBe(true);
      expect(getModulesData.data.modules).toHaveLength(1);
      expect(getModulesData.data.modules[0].id).toBe(createdModuleId);

      // Step 2: Customer accesses a learning module
      const mockModuleWithProgress = {
        id: createdModuleId,
        title: testModuleData.title,
        description: testModuleData.description,
        materials: testModuleData.materials.map((material, index) => ({
          id: `material-${index + 1}`,
          ...material
        })),
        userProgress: {
          completedMaterials: 0,
          totalMaterials: 2,
          completionPercentage: 0
        }
      };

      vi.mocked(learningService.getModuleForCustomer).mockResolvedValue({
        success: true,
        data: mockModuleWithProgress
      });

      vi.mocked(learningService.trackMaterialAccess).mockResolvedValue({
        success: true,
        data: { id: 'progress-1', isCompleted: false }
      });

      const getModuleRequest = new NextRequest(`http://localhost:3000/api/v1/learning-modules/${createdModuleId}`, {
        headers: {
          'Authorization': 'Bearer customer-token'
        }
      });

      const getModuleResponse = await getModuleForCustomer(getModuleRequest, { params: { id: createdModuleId } });
      const getModuleData = await getModuleResponse.json();

      expect(getModuleResponse.status).toBe(200);
      expect(getModuleData.success).toBe(true);
      expect(getModuleData.data.materials).toHaveLength(2);
      expect(getModuleData.data.userProgress.completionPercentage).toBe(0);

      // Step 3: Customer completes learning materials
      vi.mocked(learningService.markMaterialCompleted).mockResolvedValue({
        success: true,
        data: { id: 'progress-1', isCompleted: true }
      });

      for (let i = 1; i <= 2; i++) {
        const completeRequest = new NextRequest(`http://localhost:3000/api/v1/learning-modules/${createdModuleId}/progress`, {
          method: 'POST',
          body: JSON.stringify({
            materialId: `material-${i}`,
            action: 'complete'
          }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer customer-token'
          }
        });

        const completeResponse = await updateProgress(completeRequest, { params: { id: createdModuleId } });
        const completeData = await completeResponse.json();

        expect(completeResponse.status).toBe(200);
        expect(completeData.success).toBe(true);
        expect(completeData.message).toBe('Material marked as completed');
      }

      // Step 4: Customer discovers published quizzes
      const mockPublishedQuizzes = [
        {
          id: createdQuizId,
          title: testQuizData.title,
          description: testQuizData.description,
          language: testQuizData.language,
          timeLimitMinutes: testQuizData.timeLimitMinutes,
          maxAttempts: testQuizData.maxAttempts,
          isPublished: true
        }
      ];

      vi.mocked(quizService.getPublishedQuizzes).mockResolvedValue({
        success: true,
        data: mockPublishedQuizzes
      });

      const getQuizzesRequest = new NextRequest('http://localhost:3000/api/v1/quizzes', {
        headers: {
          'Authorization': 'Bearer customer-token'
        }
      });

      const getQuizzesResponse = await getPublishedQuizzes(getQuizzesRequest);
      const getQuizzesData = await getQuizzesResponse.json();

      expect(getQuizzesResponse.status).toBe(200);
      expect(getQuizzesData.success).toBe(true);
      expect(getQuizzesData.data.quizzes).toHaveLength(1);
      expect(getQuizzesData.data.quizzes[0].id).toBe(createdQuizId);

      // Step 5: Customer gets quiz details
      const mockQuizForCustomer = {
        id: createdQuizId,
        title: testQuizData.title,
        description: testQuizData.description,
        language: testQuizData.language,
        timeLimitMinutes: testQuizData.timeLimitMinutes,
        maxAttempts: testQuizData.maxAttempts,
        isPublished: true,
        questions: testQuizData.questions.map((q, index) => ({
          id: `question-${index + 1}`,
          questionType: q.questionType,
          questionData: q.questionData,
          orderIndex: q.orderIndex
          // Note: correctAnswers excluded for customers
        })),
        userProgress: {
          quizId: createdQuizId,
          attemptCount: 0,
          maxAttempts: 3,
          canAttempt: true,
          bestScore: null,
          hasCompletedAttempts: false
        }
      };

      vi.mocked(quizService.getQuizForCustomer).mockResolvedValue({
        success: true,
        data: mockQuizForCustomer
      });

      const getQuizRequest = new NextRequest(`http://localhost:3000/api/v1/quizzes/${createdQuizId}`, {
        headers: {
          'Authorization': 'Bearer customer-token'
        }
      });

      const getQuizResponse = await getQuizForCustomer(getQuizRequest, { params: { id: createdQuizId } });
      const getQuizData = await getQuizResponse.json();

      expect(getQuizResponse.status).toBe(200);
      expect(getQuizData.success).toBe(true);
      expect(getQuizData.data.questions).toHaveLength(3);
      expect(getQuizData.data.userProgress.canAttempt).toBe(true);

      // Step 6: Customer starts quiz attempt
      const mockAttempt = {
        attemptId: attemptId,
        quizId: createdQuizId,
        timeLimitMinutes: testQuizData.timeLimitMinutes,
        startedAt: new Date()
      };

      vi.mocked(quizService.startQuizAttempt).mockResolvedValue({
        success: true,
        data: mockAttempt
      });

      const startAttemptRequest = new NextRequest(`http://localhost:3000/api/v1/quizzes/${createdQuizId}/attempts`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer customer-token'
        }
      });

      const startAttemptResponse = await startQuizAttempt(startAttemptRequest, { params: { id: createdQuizId } });
      const startAttemptData = await startAttemptResponse.json();

      expect(startAttemptResponse.status).toBe(201);
      expect(startAttemptData.success).toBe(true);
      expect(startAttemptData.data.attemptId).toBe(attemptId);
      expect(startAttemptData.data.quizId).toBe(createdQuizId);

      // Step 7: Customer submits quiz attempt
      const customerAnswers = {
        'question-1': ['To protect digital assets and information'],
        'question-2': ['False'],
        'question-3': ['Malware', 'Phishing', 'Social Engineering']
      };

      const mockSubmissionResult = {
        attemptId: attemptId,
        score: 100,
        totalQuestions: 3,
        correctAnswers: 3,
        timeTakenSeconds: 900,
        isCompleted: true,
        results: [
          {
            questionId: 'question-1',
            userAnswers: ['To protect digital assets and information'],
            correctAnswers: ['To protect digital assets and information'],
            isCorrect: true,
            explanation: 'Correct! Cybersecurity protects digital assets.'
          },
          {
            questionId: 'question-2',
            userAnswers: ['False'],
            correctAnswers: ['False'],
            isCorrect: true,
            explanation: 'Correct! Strong passwords should contain letters, numbers, and symbols.'
          },
          {
            questionId: 'question-3',
            userAnswers: ['Malware', 'Phishing', 'Social Engineering'],
            correctAnswers: ['Malware', 'Phishing', 'Social Engineering'],
            isCorrect: true,
            explanation: 'Correct! These are all common cybersecurity threats.'
          }
        ]
      };

      vi.mocked(quizService.submitQuizAttempt).mockResolvedValue({
        success: true,
        data: mockSubmissionResult
      });

      const submitRequest = new NextRequest(`http://localhost:3000/api/v1/quizzes/attempts/${attemptId}/submit`, {
        method: 'PUT',
        body: JSON.stringify({
          answers: customerAnswers,
          timeTakenSeconds: 900
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer customer-token'
        }
      });

      const submitResponse = await submitQuizAttempt(submitRequest, { params: { id: attemptId } });
      const submitData = await submitResponse.json();

      expect(submitResponse.status).toBe(200);
      expect(submitData.success).toBe(true);
      expect(submitData.data.score).toBe(100);
      expect(submitData.data.correctAnswers).toBe(3);
      expect(submitData.data.results).toHaveLength(3);

      // Step 8: Customer checks progress and attempt history
      const mockProgress = {
        quizId: createdQuizId,
        attemptCount: 1,
        maxAttempts: 3,
        canAttempt: true,
        bestScore: 100,
        hasCompletedAttempts: true,
        lastAttemptDate: new Date()
      };

      vi.mocked(quizService.getUserQuizProgress).mockResolvedValue({
        success: true,
        data: mockProgress
      });

      const progressRequest = new NextRequest(`http://localhost:3000/api/v1/quizzes/${createdQuizId}/progress`, {
        headers: {
          'Authorization': 'Bearer customer-token'
        }
      });

      const progressResponse = await getQuizProgress(progressRequest, { params: { id: createdQuizId } });
      const progressData = await progressResponse.json();

      expect(progressResponse.status).toBe(200);
      expect(progressData.success).toBe(true);
      expect(progressData.data.bestScore).toBe(100);
      expect(progressData.data.attemptCount).toBe(1);

      // Verify all service calls were made correctly
      expect(learningService.getPublishedModules).toHaveBeenCalled();
      expect(learningService.getModuleForCustomer).toHaveBeenCalledWith(createdModuleId, 'customer-user-id');
      expect(learningService.markMaterialCompleted).toHaveBeenCalledTimes(2);
      expect(quizService.getPublishedQuizzes).toHaveBeenCalled();
      expect(quizService.getQuizForCustomer).toHaveBeenCalledWith(createdQuizId, 'customer-user-id');
      expect(quizService.startQuizAttempt).toHaveBeenCalledWith('customer-user-id', createdQuizId);
      expect(quizService.submitQuizAttempt).toHaveBeenCalledWith(attemptId, customerAnswers, 900, 'customer-user-id');
      expect(quizService.getUserQuizProgress).toHaveBeenCalledWith('customer-user-id', createdQuizId);
    });
  });

  describe('Complete Analytics and Reporting Workflow', () => {
    it('should allow admin to view comprehensive analytics after customer activity', async () => {
      // Admin views quiz analytics after customer has taken the quiz
      vi.mocked(validateSession).mockResolvedValue(mockAdminSession);

      const mockQuizAnalytics = {
        quizId: createdQuizId,
        quizTitle: testQuizData.title,
        totalAttempts: 1,
        completedAttempts: 1,
        completionRate: 100,
        averageScore: 100,
        averageTimeMinutes: 15,
        highestScore: 100,
        lowestScore: 100,
        uniqueUsers: 1,
        questionAnalytics: [
          {
            questionId: 'question-1',
            questionText: 'What is the primary purpose of cybersecurity?',
            correctAnswerRate: 100,
            averageTimeSeconds: 30,
            mostSelectedAnswer: 'To protect digital assets and information',
            difficultyLevel: 'Easy'
          },
          {
            questionId: 'question-2',
            questionText: 'Strong passwords should contain only letters.',
            correctAnswerRate: 100,
            averageTimeSeconds: 20,
            mostSelectedAnswer: 'False',
            difficultyLevel: 'Easy'
          },
          {
            questionId: 'question-3',
            questionText: 'Which of the following are common cybersecurity threats?',
            correctAnswerRate: 100,
            averageTimeSeconds: 45,
            mostSelectedAnswer: 'Malware, Phishing, Social Engineering',
            difficultyLevel: 'Medium'
          }
        ],
        userEngagement: {
          newUsers: 1,
          returningUsers: 0,
          averageAttemptsPerUser: 1
        }
      };

      const mockPerformanceMetrics = {
        quizId: createdQuizId,
        quizTitle: testQuizData.title,
        totalAttempts: 1,
        completedAttempts: 1,
        completionRate: 100,
        averageScore: 100,
        averageTimeMinutes: 15,
        highestScore: 100,
        lowestScore: 100,
        uniqueUsers: 1,
        difficultyRating: 'Easy' as const,
        engagementScore: 100
      };

      const mockQuestionAnalytics = [
        {
          questionId: 'question-1',
          questionText: 'What is the primary purpose of cybersecurity?',
          questionType: 'mcq',
          correctAnswerRate: 100,
          averageTimeSeconds: 30,
          totalAnswers: 1,
          correctAnswers: 1,
          answerDistribution: {
            'To protect digital assets and information': 1,
            'To increase internet speed': 0,
            'To create new software': 0,
            'To manage databases': 0
          },
          difficultyLevel: 'Easy'
        }
      ];

      vi.mocked(analyticsService.getQuizAnalytics).mockResolvedValue({
        success: true,
        data: mockQuizAnalytics
      });

      vi.mocked(analyticsService.getQuizPerformanceMetrics).mockResolvedValue({
        success: true,
        data: mockPerformanceMetrics
      });

      vi.mocked(analyticsService.getQuestionAnalytics).mockResolvedValue({
        success: true,
        data: mockQuestionAnalytics
      });

      const analyticsRequest = new NextRequest(`http://localhost:3000/api/v1/admin/analytics/quizzes/${createdQuizId}/stats`, {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const analyticsResponse = await getQuizAnalytics(analyticsRequest, { params: { id: createdQuizId } });
      const analyticsData = await analyticsResponse.json();

      expect(analyticsResponse.status).toBe(200);
      expect(analyticsData.success).toBe(true);
      expect(analyticsData.data.quizAnalytics.totalAttempts).toBe(1);
      expect(analyticsData.data.quizAnalytics.completionRate).toBe(100);
      expect(analyticsData.data.quizAnalytics.averageScore).toBe(100);
      expect(analyticsData.data.questionAnalytics).toHaveLength(1);
      expect(analyticsData.data.performanceMetrics.engagementScore).toBe(100);

      // Verify analytics service calls
      expect(analyticsService.getQuizAnalytics).toHaveBeenCalledWith(createdQuizId, undefined);
      expect(analyticsService.getQuizPerformanceMetrics).toHaveBeenCalledWith(createdQuizId, undefined);
      expect(analyticsService.getQuestionAnalytics).toHaveBeenCalledWith(createdQuizId, undefined);
    });
  });

  describe('Error Handling in Complete Workflow', () => {
    it('should handle quiz attempt limit exceeded scenario', async () => {
      vi.mocked(validateSession).mockResolvedValue(mockCustomerSession);

      // Customer has already reached maximum attempts
      vi.mocked(quizService.startQuizAttempt).mockResolvedValue({
        success: false,
        error: 'Maximum attempts (3) exceeded',
        code: 'ATTEMPT_LIMIT_EXCEEDED'
      });

      const startAttemptRequest = new NextRequest(`http://localhost:3000/api/v1/quizzes/${createdQuizId}/attempts`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer customer-token'
        }
      });

      const startAttemptResponse = await startQuizAttempt(startAttemptRequest, { params: { id: createdQuizId } });
      const startAttemptData = await startAttemptResponse.json();

      expect(startAttemptResponse.status).toBe(429);
      expect(startAttemptData.success).toBe(false);
      expect(startAttemptData.code).toBe('ATTEMPT_LIMIT_EXCEEDED');
      expect(startAttemptData.error).toContain('Maximum attempts');
    });

    it('should handle quiz time expiry scenario', async () => {
      vi.mocked(validateSession).mockResolvedValue(mockCustomerSession);

      // Customer submits after time limit
      vi.mocked(quizService.submitQuizAttempt).mockResolvedValue({
        success: false,
        error: 'Quiz time limit exceeded',
        code: 'QUIZ_TIME_EXPIRED'
      });

      const submitRequest = new NextRequest(`http://localhost:3000/api/v1/quizzes/attempts/${attemptId}/submit`, {
        method: 'PUT',
        body: JSON.stringify({
          answers: { 'question-1': ['Option A'] },
          timeTakenSeconds: 2400 // 40 minutes, exceeds 30-minute limit
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer customer-token'
        }
      });

      const submitResponse = await submitQuizAttempt(submitRequest, { params: { id: attemptId } });
      const submitData = await submitResponse.json();

      expect(submitResponse.status).toBe(408);
      expect(submitData.success).toBe(false);
      expect(submitData.code).toBe('QUIZ_TIME_EXPIRED');
    });

    it('should handle unpublished content access attempts', async () => {
      vi.mocked(validateSession).mockResolvedValue(mockCustomerSession);

      // Customer tries to access unpublished quiz
      vi.mocked(quizService.getQuizForCustomer).mockResolvedValue({
        success: false,
        error: 'Quiz is not published',
        code: 'QUIZ_NOT_PUBLISHED'
      });

      const getQuizRequest = new NextRequest(`http://localhost:3000/api/v1/quizzes/${createdQuizId}`, {
        headers: {
          'Authorization': 'Bearer customer-token'
        }
      });

      const getQuizResponse = await getQuizForCustomer(getQuizRequest, { params: { id: createdQuizId } });
      const getQuizData = await getQuizResponse.json();

      expect(getQuizResponse.status).toBe(403);
      expect(getQuizData.success).toBe(false);
      expect(getQuizData.code).toBe('QUIZ_NOT_PUBLISHED');
    });
  });

  describe('Cross-Feature Integration', () => {
    it('should maintain data consistency across quiz and learning module interactions', async () => {
      // This test ensures that user progress is tracked consistently
      // across both learning modules and quizzes
      
      vi.mocked(validateSession).mockResolvedValue(mockCustomerSession);

      // Customer completes learning module
      vi.mocked(learningService.markMaterialCompleted).mockResolvedValue({
        success: true,
        data: { id: 'progress-1', isCompleted: true }
      });

      // Customer then takes related quiz
      vi.mocked(quizService.startQuizAttempt).mockResolvedValue({
        success: true,
        data: {
          attemptId: attemptId,
          quizId: createdQuizId,
          timeLimitMinutes: 30,
          startedAt: new Date()
        }
      });

      // Both operations should succeed and maintain user context
      const completeRequest = new NextRequest(`http://localhost:3000/api/v1/learning-modules/${createdModuleId}/progress`, {
        method: 'POST',
        body: JSON.stringify({
          materialId: 'material-1',
          action: 'complete'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer customer-token'
        }
      });

      const completeResponse = await updateProgress(completeRequest, { params: { id: createdModuleId } });
      expect(completeResponse.status).toBe(200);

      const startAttemptRequest = new NextRequest(`http://localhost:3000/api/v1/quizzes/${createdQuizId}/attempts`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer customer-token'
        }
      });

      const startAttemptResponse = await startQuizAttempt(startAttemptRequest, { params: { id: createdQuizId } });
      expect(startAttemptResponse.status).toBe(201);

      // Verify both services were called with the same user ID
      expect(learningService.markMaterialCompleted).toHaveBeenCalledWith('customer-user-id', createdModuleId, 'material-1');
      expect(quizService.startQuizAttempt).toHaveBeenCalledWith('customer-user-id', createdQuizId);
    });
  });
});