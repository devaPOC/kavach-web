import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuizService } from '../quiz.service';
import { quizRepository } from '@/lib/database/repositories/quiz-repository';
import { quizAttemptRepository } from '@/lib/database/repositories/quiz-attempt-repository';
import { templateRepository } from '@/lib/database/repositories/template-repository';
import { transactionService } from '@/lib/database/transaction-service';
import { AwarenessLabErrorCode } from '@/lib/errors/awareness-lab-errors';

// Mock dependencies
vi.mock('@/lib/database/repositories/quiz-repository');
vi.mock('@/lib/database/repositories/quiz-attempt-repository');
vi.mock('@/lib/database/repositories/template-repository');
vi.mock('@/lib/database/transaction-service');

describe('QuizService', () => {
  let quizService: QuizService;
  let mockQuizRepository: any;
  let mockQuizAttemptRepository: any;
  let mockTemplateRepository: any;
  let mockTransactionService: any;

  const mockQuiz = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    createdBy: '123e4567-e89b-12d3-a456-426614174001',
    templateId: null,
    title: 'Test Quiz',
    description: 'A test quiz',
    language: 'en' as const,
    timeLimitMinutes: 30,
    maxAttempts: 3,
    isPublished: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    questions: [
      {
        id: '123e4567-e89b-12d3-a456-426614174002',
        quizId: '123e4567-e89b-12d3-a456-426614174000',
        questionType: 'mcq' as const,
        questionData: {
          question: 'What is 2+2?',
          options: ['3', '4', '5', '6'],
          explanation: 'Basic math'
        },
        correctAnswers: ['4'],
        orderIndex: 1,
        createdAt: new Date()
      }
    ]
  };

  const mockAttempt = {
    id: '123e4567-e89b-12d3-a456-426614174003',
    userId: '123e4567-e89b-12d3-a456-426614174004',
    quizId: '123e4567-e89b-12d3-a456-426614174000',
    answers: {},
    score: 0,
    timeTakenSeconds: 0,
    isCompleted: false,
    startedAt: new Date(),
    completedAt: null
  };

  beforeEach(() => {
    quizService = new QuizService();
    mockQuizRepository = vi.mocked(quizRepository);
    mockQuizAttemptRepository = vi.mocked(quizAttemptRepository);
    mockTemplateRepository = vi.mocked(templateRepository);
    mockTransactionService = vi.mocked(transactionService);

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createQuiz', () => {
    const validQuizData = {
      title: 'Test Quiz',
      description: 'A test quiz',
      language: 'en' as const,
      targetAudience: 'customer' as const,
      timeLimitMinutes: 30,
      maxAttempts: 3,
      questions: [
        {
          questionType: 'mcq' as const,
          questionData: {
            question: 'What is 2+2?',
            options: ['3', '4', '5', '6']
          },
          correctAnswers: ['4'],
          orderIndex: 1
        }
      ]
    };

    it('should create a quiz successfully', async () => {
      mockTransactionService.executeInTransaction.mockResolvedValue({
        success: true,
        data: mockQuiz
      });

      const result = await quizService.createQuiz('123e4567-e89b-12d3-a456-426614174001', validQuizData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockQuiz);
      expect(mockTransactionService.executeInTransaction).toHaveBeenCalled();
    });

    it('should validate template exists when templateId provided', async () => {
      const quizDataWithTemplate = { ...validQuizData, templateId: '123e4567-e89b-12d3-a456-426614174005' };
      mockTemplateRepository.exists.mockResolvedValue(true);
      mockTransactionService.executeInTransaction.mockResolvedValue({
        success: true,
        data: mockQuiz
      });

      const result = await quizService.createQuiz('123e4567-e89b-12d3-a456-426614174001', quizDataWithTemplate);

      expect(result.success).toBe(true);
      expect(mockTemplateRepository.exists).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174005');
    });

    it('should return error when template not found', async () => {
      const quizDataWithTemplate = { ...validQuizData, templateId: '123e4567-e89b-12d3-a456-426614174005' };
      mockTemplateRepository.exists.mockResolvedValue(false);

      const result = await quizService.createQuiz('123e4567-e89b-12d3-a456-426614174001', quizDataWithTemplate);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Template not found');
      expect(result.code).toBe(AwarenessLabErrorCode.TEMPLATE_NOT_FOUND);
    });

    it('should handle transaction failure', async () => {
      mockTransactionService.executeInTransaction.mockResolvedValue({
        success: false,
        error: 'Database error'
      });

      const result = await quizService.createQuiz('123e4567-e89b-12d3-a456-426614174001', validQuizData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('should handle validation errors', async () => {
      const invalidQuizData = { ...validQuizData, title: '' };

      const result = await quizService.createQuiz('123e4567-e89b-12d3-a456-426614174001', invalidQuizData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Title is required');
    });
  });

  describe('updateQuiz', () => {
    const updateData = {
      title: 'Updated Quiz',
      description: 'Updated description',
      isPublished: true
    };

    it('should update quiz successfully', async () => {
      mockQuizRepository.findById.mockResolvedValue(mockQuiz);
      mockTransactionService.executeInTransaction.mockResolvedValue({
        success: true,
        data: { ...mockQuiz, ...updateData }
      });

      const result = await quizService.updateQuiz('quiz-123', updateData, 'user-123');

      expect(result.success).toBe(true);
      expect(mockQuizRepository.findById).toHaveBeenCalledWith('quiz-123');
    });

    it('should return error when quiz not found', async () => {
      mockQuizRepository.findById.mockResolvedValue(null);

      const result = await quizService.updateQuiz('quiz-123', updateData, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Quiz not found');
      expect(result.code).toBe(AwarenessLabErrorCode.QUIZ_NOT_FOUND);
    });

    it('should prevent modifying published quiz structure', async () => {
      const publishedQuiz = { ...mockQuiz, isPublished: true };
      mockQuizRepository.findById.mockResolvedValue(publishedQuiz);

      const structuralUpdate = { ...updateData, timeLimitMinutes: 60 };
      const result = await quizService.updateQuiz('quiz-123', structuralUpdate, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot modify published quiz structure');
    });
  });

  describe('startQuizAttempt', () => {
    it('should start quiz attempt successfully', async () => {
      mockQuizRepository.findById.mockResolvedValue({ ...mockQuiz, isPublished: true });
      mockQuizAttemptRepository.getUserQuizProgress.mockResolvedValue({
        attemptCount: 0,
        canAttempt: true,
        bestScore: 0,
        hasCompletedAttempts: false
      });
      mockQuizAttemptRepository.create.mockResolvedValue(mockAttempt);

      const result = await quizService.startQuizAttempt('user-456', 'quiz-123');

      expect(result.success).toBe(true);
      expect(result.data.attemptId).toBe('attempt-123');
      expect(mockQuizAttemptRepository.create).toHaveBeenCalled();
    });

    it('should return error when quiz not found', async () => {
      mockQuizRepository.findById.mockResolvedValue(null);

      const result = await quizService.startQuizAttempt('user-456', 'quiz-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Quiz not found');
      expect(result.code).toBe(AwarenessLabErrorCode.QUIZ_NOT_FOUND);
    });

    it('should return error when quiz not published', async () => {
      mockQuizRepository.findById.mockResolvedValue(mockQuiz);

      const result = await quizService.startQuizAttempt('user-456', 'quiz-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Quiz is not published');
      expect(result.code).toBe(AwarenessLabErrorCode.QUIZ_NOT_PUBLISHED);
    });

    it('should return error when attempt limit exceeded', async () => {
      mockQuizRepository.findById.mockResolvedValue({ ...mockQuiz, isPublished: true });
      mockQuizAttemptRepository.getUserQuizProgress.mockResolvedValue({
        attemptCount: 3,
        canAttempt: false,
        bestScore: 80,
        hasCompletedAttempts: true
      });

      const result = await quizService.startQuizAttempt('user-456', 'quiz-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum attempts');
      expect(result.code).toBe(AwarenessLabErrorCode.ATTEMPT_LIMIT_EXCEEDED);
    });
  });

  describe('submitQuizAttempt', () => {
    const answers = { '123e4567-e89b-12d3-a456-426614174002': ['4'] };
    const timeTaken = 300; // 5 minutes

    it('should submit quiz attempt successfully', async () => {
      const completedAttempt = { ...mockAttempt, isCompleted: true, score: 100 };
      mockQuizAttemptRepository.findById.mockResolvedValue(mockAttempt);
      mockQuizRepository.findByIdWithQuestions.mockResolvedValue(mockQuiz);
      mockQuizAttemptRepository.submit.mockResolvedValue(completedAttempt);

      const result = await quizService.submitQuizAttempt('123e4567-e89b-12d3-a456-426614174003', answers, timeTaken, '123e4567-e89b-12d3-a456-426614174004');

      expect(result.success).toBe(true);
      expect(result.data.score).toBe(100);
      expect(result.data.isCompleted).toBe(true);
      expect(mockQuizAttemptRepository.submit).toHaveBeenCalled();
    });

    it('should return error when attempt not found', async () => {
      mockQuizAttemptRepository.findById.mockResolvedValue(null);

      const result = await quizService.submitQuizAttempt('123e4567-e89b-12d3-a456-426614174003', answers, timeTaken, '123e4567-e89b-12d3-a456-426614174004');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Quiz attempt not found');
      expect(result.code).toBe(AwarenessLabErrorCode.QUIZ_NOT_STARTED);
    });

    it('should return error when user not authorized', async () => {
      mockQuizAttemptRepository.findById.mockResolvedValue(mockAttempt);

      const result = await quizService.submitQuizAttempt('123e4567-e89b-12d3-a456-426614174003', answers, timeTaken, '123e4567-e89b-12d3-a456-426614174999');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized access to quiz attempt');
    });

    it('should return error when attempt already completed', async () => {
      const completedAttempt = { ...mockAttempt, isCompleted: true };
      mockQuizAttemptRepository.findById.mockResolvedValue(completedAttempt);

      const result = await quizService.submitQuizAttempt('123e4567-e89b-12d3-a456-426614174003', answers, timeTaken, '123e4567-e89b-12d3-a456-426614174004');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Quiz attempt already completed');
      expect(result.code).toBe(AwarenessLabErrorCode.QUIZ_ALREADY_COMPLETED);
    });

    it('should return error when time limit exceeded', async () => {
      const oldAttempt = {
        ...mockAttempt,
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      };
      mockQuizAttemptRepository.findById.mockResolvedValue(oldAttempt);
      mockQuizRepository.findByIdWithQuestions.mockResolvedValue(mockQuiz);

      const result = await quizService.submitQuizAttempt('123e4567-e89b-12d3-a456-426614174003', answers, timeTaken, '123e4567-e89b-12d3-a456-426614174004');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Quiz time limit exceeded');
      expect(result.code).toBe(AwarenessLabErrorCode.QUIZ_TIME_EXPIRED);
    });
  });

  describe('calculateQuizScore', () => {
    it('should calculate score correctly for all correct answers', () => {
      const questions = [
        {
          id: 'q1',
          correctAnswers: ['A'],
          questionData: { explanation: 'Test explanation' }
        },
        {
          id: 'q2',
          correctAnswers: ['B', 'C'],
          questionData: { explanation: 'Test explanation 2' }
        }
      ];
      const userAnswers = {
        'q1': ['A'],
        'q2': ['B', 'C']
      };

      const result = (quizService as any).calculateQuizScore(questions, userAnswers);

      expect(result.score).toBe(100);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].isCorrect).toBe(true);
      expect(result.results[1].isCorrect).toBe(true);
    });

    it('should calculate score correctly for partial correct answers', () => {
      const questions = [
        {
          id: 'q1',
          correctAnswers: ['A'],
          questionData: { explanation: 'Test explanation' }
        },
        {
          id: 'q2',
          correctAnswers: ['B'],
          questionData: { explanation: 'Test explanation 2' }
        }
      ];
      const userAnswers = {
        'q1': ['A'],
        'q2': ['C']
      };

      const result = (quizService as any).calculateQuizScore(questions, userAnswers);

      expect(result.score).toBe(50);
      expect(result.results[0].isCorrect).toBe(true);
      expect(result.results[1].isCorrect).toBe(false);
    });

    it('should handle missing answers', () => {
      const questions = [
        {
          id: 'q1',
          correctAnswers: ['A'],
          questionData: { explanation: 'Test explanation' }
        }
      ];
      const userAnswers = {};

      const result = (quizService as any).calculateQuizScore(questions, userAnswers);

      expect(result.score).toBe(0);
      expect(result.results[0].isCorrect).toBe(false);
      expect(result.results[0].userAnswers).toEqual([]);
    });
  });

  describe('compareAnswers', () => {
    it('should return true for identical answers', () => {
      const result = (quizService as any).compareAnswers(['A', 'B'], ['A', 'B']);
      expect(result).toBe(true);
    });

    it('should return true for answers in different order', () => {
      const result = (quizService as any).compareAnswers(['B', 'A'], ['A', 'B']);
      expect(result).toBe(true);
    });

    it('should return false for different answers', () => {
      const result = (quizService as any).compareAnswers(['A'], ['B']);
      expect(result).toBe(false);
    });

    it('should return false for different number of answers', () => {
      const result = (quizService as any).compareAnswers(['A'], ['A', 'B']);
      expect(result).toBe(false);
    });
  });

  describe('getUserQuizProgress', () => {
    it('should return user quiz progress successfully', async () => {
      mockQuizRepository.findById.mockResolvedValue(mockQuiz);
      mockQuizAttemptRepository.getUserQuizProgress.mockResolvedValue({
        attemptCount: 2,
        bestScore: 85,
        hasCompletedAttempts: true,
        canAttempt: true,
        lastAttemptDate: new Date()
      });

      const result = await quizService.getUserQuizProgress('user-456', 'quiz-123');

      expect(result.success).toBe(true);
      expect(result.data.attemptCount).toBe(2);
      expect(result.data.bestScore).toBe(85);
      expect(result.data.maxAttempts).toBe(3);
    });

    it('should return error when quiz not found', async () => {
      mockQuizRepository.findById.mockResolvedValue(null);

      const result = await quizService.getUserQuizProgress('user-456', 'quiz-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Quiz not found');
    });
  });

  describe('deleteQuiz', () => {
    it('should delete quiz successfully when no attempts exist', async () => {
      mockQuizRepository.findById.mockResolvedValue(mockQuiz);
      mockQuizAttemptRepository.count.mockResolvedValue(0);
      mockQuizRepository.delete.mockResolvedValue(true);

      const result = await quizService.deleteQuiz('quiz-123', 'user-123');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockQuizRepository.delete).toHaveBeenCalledWith('quiz-123');
    });

    it('should return error when quiz has attempts', async () => {
      mockQuizRepository.findById.mockResolvedValue(mockQuiz);
      mockQuizAttemptRepository.count.mockResolvedValue(5);

      const result = await quizService.deleteQuiz('quiz-123', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot delete quiz with existing attempts');
    });

    it('should return error when quiz not found', async () => {
      mockQuizRepository.findById.mockResolvedValue(null);

      const result = await quizService.deleteQuiz('quiz-123', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Quiz not found');
    });
  });

  describe('validateAttemptTimeLimit', () => {
    it('should validate time limit successfully', async () => {
      const recentAttempt = {
        ...mockAttempt,
        startedAt: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
      };
      mockQuizAttemptRepository.findById.mockResolvedValue(recentAttempt);

      const result = await quizService.validateAttemptTimeLimit('attempt-123', 30);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should return error when time limit exceeded', async () => {
      const oldAttempt = {
        ...mockAttempt,
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      };
      mockQuizAttemptRepository.findById.mockResolvedValue(oldAttempt);
      mockQuizAttemptRepository.update.mockResolvedValue(oldAttempt);

      const result = await quizService.validateAttemptTimeLimit('attempt-123', 30);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Time limit exceeded');
      expect(result.code).toBe(AwarenessLabErrorCode.QUIZ_TIME_EXPIRED);
      expect(mockQuizAttemptRepository.update).toHaveBeenCalled();
    });

    it('should return error when attempt not found', async () => {
      mockQuizAttemptRepository.findById.mockResolvedValue(null);

      const result = await quizService.validateAttemptTimeLimit('attempt-123', 30);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Attempt not found');
    });
  });
});