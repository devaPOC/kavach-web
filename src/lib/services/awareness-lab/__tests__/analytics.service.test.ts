import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnalyticsService } from '../analytics.service';
import { analyticsRepository } from '@/lib/database/repositories/analytics-repository';
import { quizRepository } from '@/lib/database/repositories/quiz-repository';
import { learningRepository } from '@/lib/database/repositories/learning-repository';
import { AwarenessLabErrorCode } from '@/lib/errors/awareness-lab-errors';

// Mock dependencies
vi.mock('@/lib/database/repositories/analytics-repository');
vi.mock('@/lib/database/repositories/quiz-repository');
vi.mock('@/lib/database/repositories/learning-repository');

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let mockAnalyticsRepository: any;
  let mockQuizRepository: any;
  let mockLearningRepository: any;

  const mockQuizAnalytics = {
    quizId: 'quiz-123',
    quizTitle: 'Test Quiz',
    totalAttempts: 100,
    completedAttempts: 85,
    completionRate: 85,
    averageScore: 78.5,
    averageTimeMinutes: 15.2,
    highestScore: 100,
    lowestScore: 45,
    uniqueUsers: 75,
    questionAnalytics: [
      {
        questionId: 'question-1',
        questionText: 'What is 2+2?',
        questionType: 'mcq' as const,
        totalAnswers: 85,
        correctAnswers: 80,
        accuracyRate: 94.1,
        commonWrongAnswers: [
          { answer: '5', count: 3, percentage: 3.5 },
          { answer: '3', count: 2, percentage: 2.4 }
        ]
      }
    ],
    userEngagement: {
      newUsers: 60,
      returningUsers: 15,
      averageAttemptsPerUser: 1.33
    }
  };

  const mockOverviewAnalytics = {
    totalQuizzes: 25,
    publishedQuizzes: 20,
    totalAttempts: 500,
    completedAttempts: 425,
    overallCompletionRate: 85,
    totalUsers: 200,
    activeUsers: 150,
    averageScoreAcrossAllQuizzes: 76.8,
    totalLearningModules: 15,
    publishedLearningModules: 12,
    totalMaterialsCompleted: 1200,
    topPerformingQuizzes: [
      {
        quizId: 'quiz-123',
        title: 'Test Quiz',
        completionRate: 95,
        averageScore: 88
      }
    ],
    userEngagementTrends: {
      dailyActiveUsers: 45,
      weeklyActiveUsers: 120,
      monthlyActiveUsers: 180
    }
  };

  const mockUserProgressAnalytics = {
    userId: 'user-123',
    userEmail: 'test@example.com',
    userName: 'John Doe',
    quizProgress: {
      totalQuizzesTaken: 15,
      completedQuizzes: 12,
      averageScore: 82.5,
      bestScore: 98,
      totalTimeSpent: 3600
    },
    learningProgress: {
      modulesAccessed: 8,
      modulesCompleted: 5,
      materialsCompleted: 45,
      totalLearningTime: 7200
    },
    engagementMetrics: {
      firstActivity: new Date('2024-01-01'),
      lastActivity: new Date('2024-01-15'),
      totalSessions: 25,
      averageSessionLength: 144
    }
  };

  beforeEach(() => {
    analyticsService = new AnalyticsService();
    mockAnalyticsRepository = vi.mocked(analyticsRepository);
    mockQuizRepository = vi.mocked(quizRepository);
    mockLearningRepository = vi.mocked(learningRepository);

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getQuizAnalytics', () => {
    it('should return quiz analytics successfully', async () => {
      mockQuizRepository.exists.mockResolvedValue(true);
      mockAnalyticsRepository.getQuizAnalytics.mockResolvedValue(mockQuizAnalytics);

      const result = await analyticsService.getQuizAnalytics('quiz-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockQuizAnalytics);
      expect(mockQuizRepository.exists).toHaveBeenCalledWith('quiz-123');
      expect(mockAnalyticsRepository.getQuizAnalytics).toHaveBeenCalledWith('quiz-123', undefined);
    });

    it('should return quiz analytics with date range', async () => {
      const dateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };
      mockQuizRepository.exists.mockResolvedValue(true);
      mockAnalyticsRepository.getQuizAnalytics.mockResolvedValue(mockQuizAnalytics);

      const result = await analyticsService.getQuizAnalytics('quiz-123', dateRange);

      expect(result.success).toBe(true);
      expect(mockAnalyticsRepository.getQuizAnalytics).toHaveBeenCalledWith('quiz-123', {
        from: dateRange.startDate,
        to: dateRange.endDate
      });
    });

    it('should return error when quiz not found', async () => {
      mockQuizRepository.exists.mockResolvedValue(false);

      const result = await analyticsService.getQuizAnalytics('quiz-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Quiz not found');
      expect(result.code).toBe(AwarenessLabErrorCode.QUIZ_NOT_FOUND);
    });

    it('should return error when analytics data unavailable', async () => {
      mockQuizRepository.exists.mockResolvedValue(true);
      mockAnalyticsRepository.getQuizAnalytics.mockResolvedValue(null);

      const result = await analyticsService.getQuizAnalytics('quiz-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Analytics data unavailable');
      expect(result.code).toBe(AwarenessLabErrorCode.ANALYTICS_DATA_UNAVAILABLE);
    });
  });

  describe('getQuizPerformanceMetrics', () => {
    it('should calculate performance metrics correctly', async () => {
      mockQuizRepository.exists.mockResolvedValue(true);
      mockAnalyticsRepository.getQuizAnalytics.mockResolvedValue(mockQuizAnalytics);

      const result = await analyticsService.getQuizPerformanceMetrics('quiz-123');

      expect(result.success).toBe(true);
      expect(result.data.quizId).toBe('quiz-123');
      expect(result.data.difficultyRating).toBeDefined();
      expect(result.data.engagementScore).toBeDefined();
      expect(typeof result.data.engagementScore).toBe('number');
    });

    it('should calculate difficulty rating as Easy for high scores', async () => {
      const highPerformanceAnalytics = {
        ...mockQuizAnalytics,
        completionRate: 90,
        averageScore: 85
      };
      mockQuizRepository.exists.mockResolvedValue(true);
      mockAnalyticsRepository.getQuizAnalytics.mockResolvedValue(highPerformanceAnalytics);

      const result = await analyticsService.getQuizPerformanceMetrics('quiz-123');

      expect(result.success).toBe(true);
      expect(result.data.difficultyRating).toBe('Easy');
    });

    it('should calculate difficulty rating as Hard for low scores', async () => {
      const lowPerformanceAnalytics = {
        ...mockQuizAnalytics,
        completionRate: 40,
        averageScore: 35
      };
      mockQuizRepository.exists.mockResolvedValue(true);
      mockAnalyticsRepository.getQuizAnalytics.mockResolvedValue(lowPerformanceAnalytics);

      const result = await analyticsService.getQuizPerformanceMetrics('quiz-123');

      expect(result.success).toBe(true);
      expect(result.data.difficultyRating).toBe('Hard');
    });
  });

  describe('getSystemOverview', () => {
    it('should return system overview analytics successfully', async () => {
      mockAnalyticsRepository.getOverviewAnalytics.mockResolvedValue(mockOverviewAnalytics);

      const result = await analyticsService.getSystemOverview();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockOverviewAnalytics);
      expect(mockAnalyticsRepository.getOverviewAnalytics).toHaveBeenCalledWith(undefined);
    });

    it('should return system overview with date range', async () => {
      const dateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };
      mockAnalyticsRepository.getOverviewAnalytics.mockResolvedValue(mockOverviewAnalytics);

      const result = await analyticsService.getSystemOverview(dateRange);

      expect(result.success).toBe(true);
      expect(mockAnalyticsRepository.getOverviewAnalytics).toHaveBeenCalledWith({
        from: dateRange.startDate,
        to: dateRange.endDate
      });
    });
  });

  describe('getUserEngagementMetrics', () => {
    it('should calculate user engagement metrics correctly', async () => {
      mockAnalyticsRepository.getOverviewAnalytics.mockResolvedValue(mockOverviewAnalytics);
      mockAnalyticsRepository.getEngagementMetrics.mockResolvedValue({
        averageSessionLength: 180,
        retentionRate: 75
      });

      const result = await analyticsService.getUserEngagementMetrics();

      expect(result.success).toBe(true);
      expect(result.data.totalUsers).toBe(200);
      expect(result.data.activeUsers).toBe(150);
      expect(result.data.retentionRate).toBe(75);
      expect(result.data.churnRate).toBe(25);
    });
  });

  describe('getContentPerformance', () => {
    it('should return content performance analytics successfully', async () => {
      const mockQuizzes = [
        { id: 'quiz-1', title: 'Quiz 1', isPublished: true },
        { id: 'quiz-2', title: 'Quiz 2', isPublished: true }
      ];
      const mockModules = [
        { id: 'module-1', title: 'Module 1', isPublished: true },
        { id: 'module-2', title: 'Module 2', isPublished: true }
      ];

      mockQuizRepository.findMany.mockResolvedValue(mockQuizzes);
      mockLearningRepository.findModules.mockResolvedValue(mockModules);
      mockAnalyticsRepository.getQuizAnalytics
        .mockResolvedValueOnce({ ...mockQuizAnalytics, quizId: 'quiz-1', totalAttempts: 150 })
        .mockResolvedValueOnce({ ...mockQuizAnalytics, quizId: 'quiz-2', totalAttempts: 100 });
      mockAnalyticsRepository.getLearningAnalytics
        .mockResolvedValueOnce({ moduleId: 'module-1', totalUsers: 80, completionRate: 90 })
        .mockResolvedValueOnce({ moduleId: 'module-2', totalUsers: 60, completionRate: 85 });

      const result = await analyticsService.getContentPerformance();

      expect(result.success).toBe(true);
      expect(result.data.quizzes.mostPopular).toBeDefined();
      expect(result.data.quizzes.highestScoring).toBeDefined();
      expect(result.data.learningModules.mostAccessed).toBeDefined();
    });
  });

  describe('getUserProgressAnalytics', () => {
    it('should return user progress analytics successfully', async () => {
      mockAnalyticsRepository.getUserProgressAnalytics.mockResolvedValue(mockUserProgressAnalytics);

      const result = await analyticsService.getUserProgressAnalytics('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUserProgressAnalytics);
      expect(mockAnalyticsRepository.getUserProgressAnalytics).toHaveBeenCalledWith('user-123');
    });

    it('should return error when user not found', async () => {
      mockAnalyticsRepository.getUserProgressAnalytics.mockResolvedValue(null);

      const result = await analyticsService.getUserProgressAnalytics('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('compareQuizzes', () => {
    it('should compare multiple quizzes successfully', async () => {
      const quizIds = ['quiz-1', 'quiz-2', 'quiz-3'];
      mockAnalyticsRepository.getQuizAnalytics
        .mockResolvedValueOnce({ ...mockQuizAnalytics, quizId: 'quiz-1' })
        .mockResolvedValueOnce({ ...mockQuizAnalytics, quizId: 'quiz-2' })
        .mockResolvedValueOnce({ ...mockQuizAnalytics, quizId: 'quiz-3' });

      const result = await analyticsService.compareQuizzes(quizIds);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(mockAnalyticsRepository.getQuizAnalytics).toHaveBeenCalledTimes(3);
    });

    it('should return error for empty quiz list', async () => {
      const result = await analyticsService.compareQuizzes([]);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No quiz IDs provided');
      expect(result.code).toBe(AwarenessLabErrorCode.INVALID_ANALYTICS_FILTER);
    });

    it('should return error for too many quizzes', async () => {
      const quizIds = Array.from({ length: 15 }, (_, i) => `quiz-${i}`);

      const result = await analyticsService.compareQuizzes(quizIds);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot compare more than 10 quizzes at once');
    });
  });

  describe('getTrendingContent', () => {
    it('should return trending content successfully', async () => {
      const mockQuizzes = [
        { id: 'quiz-1', title: 'Trending Quiz 1', isPublished: true },
        { id: 'quiz-2', title: 'Trending Quiz 2', isPublished: true }
      ];
      const mockModules = [
        { id: 'module-1', title: 'Trending Module 1', isPublished: true }
      ];

      mockQuizRepository.findMany.mockResolvedValue(mockQuizzes);
      mockLearningRepository.findModules.mockResolvedValue(mockModules);
      
      // Mock current and previous period analytics
      mockAnalyticsRepository.getQuizAnalytics
        .mockResolvedValueOnce({ ...mockQuizAnalytics, totalAttempts: 50, uniqueUsers: 40 }) // current
        .mockResolvedValueOnce({ ...mockQuizAnalytics, totalAttempts: 30, uniqueUsers: 25 }) // previous
        .mockResolvedValueOnce({ ...mockQuizAnalytics, totalAttempts: 45, uniqueUsers: 35 }) // current
        .mockResolvedValueOnce({ ...mockQuizAnalytics, totalAttempts: 40, uniqueUsers: 30 }); // previous

      const result = await analyticsService.getTrendingContent(7);

      expect(result.success).toBe(true);
      expect(result.data.trendingQuizzes).toBeDefined();
      expect(result.data.trendingModules).toBeDefined();
    });
  });

  describe('getDetailedQuizAttempts', () => {
    it('should return detailed quiz attempts successfully', async () => {
      const mockAttempts = [
        {
          id: 'attempt-1',
          userId: 'user-1',
          userName: 'John Doe',
          userEmail: 'john@example.com',
          score: 85,
          timeTakenSeconds: 900,
          isCompleted: true,
          startedAt: new Date(),
          completedAt: new Date(),
          answers: { 'q1': ['A'] }
        }
      ];

      mockQuizRepository.exists.mockResolvedValue(true);
      mockAnalyticsRepository.getDetailedQuizAttempts.mockResolvedValue(mockAttempts);

      const filters = {
        quizId: 'quiz-123',
        completedOnly: true,
        minScore: 80
      };

      const result = await analyticsService.getDetailedQuizAttempts(filters, 10, 0);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAttempts);
      expect(mockAnalyticsRepository.getDetailedQuizAttempts).toHaveBeenCalledWith(
        'quiz-123',
        expect.objectContaining({
          completedOnly: true,
          minScore: 80
        }),
        10,
        0
      );
    });

    it('should return error when quiz not found', async () => {
      mockQuizRepository.exists.mockResolvedValue(false);

      const result = await analyticsService.getDetailedQuizAttempts({ quizId: 'quiz-123' }, 10, 0);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Quiz not found');
    });
  });

  describe('generateAnalyticsReport', () => {
    it('should generate comprehensive analytics report', async () => {
      const filters = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };

      mockAnalyticsRepository.getOverviewAnalytics.mockResolvedValue(mockOverviewAnalytics);
      mockAnalyticsRepository.getUserProgressAnalytics.mockResolvedValue(mockUserProgressAnalytics);
      mockQuizRepository.findMany.mockResolvedValue([]);
      mockLearningRepository.findModules.mockResolvedValue([]);

      const result = await analyticsService.generateAnalyticsReport(filters, 'json');

      expect(result.success).toBe(true);
      expect(result.data.format).toBe('json');
      expect(result.data.data.generatedAt).toBeDefined();
      expect(result.data.data.systemOverview).toEqual(mockOverviewAnalytics);
    });

    it('should generate CSV format report', async () => {
      const filters = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };

      mockAnalyticsRepository.getOverviewAnalytics.mockResolvedValue(mockOverviewAnalytics);
      mockQuizRepository.findMany.mockResolvedValue([]);
      mockLearningRepository.findModules.mockResolvedValue([]);

      const result = await analyticsService.generateAnalyticsReport(filters, 'csv');

      expect(result.success).toBe(true);
      expect(result.data.format).toBe('csv');
      expect(typeof result.data.data).toBe('string');
      expect(result.data.data).toContain('Type,ID,Title,Metric,Value');
    });
  });

  describe('helper methods', () => {
    describe('calculateDifficultyRating', () => {
      it('should return Easy for high performance', () => {
        const result = (analyticsService as any).calculateDifficultyRating(90, 85);
        expect(result).toBe('Easy');
      });

      it('should return Medium for moderate performance', () => {
        const result = (analyticsService as any).calculateDifficultyRating(70, 65);
        expect(result).toBe('Medium');
      });

      it('should return Hard for low performance', () => {
        const result = (analyticsService as any).calculateDifficultyRating(40, 35);
        expect(result).toBe('Hard');
      });
    });

    describe('calculateEngagementScore', () => {
      it('should calculate engagement score correctly', () => {
        const result = (analyticsService as any).calculateEngagementScore(85, 1.5, 100, 150);
        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThanOrEqual(100);
      });

      it('should handle edge cases', () => {
        const result = (analyticsService as any).calculateEngagementScore(0, 0, 0, 0);
        expect(result).toBe(0);
      });
    });

    describe('calculateTrendScore', () => {
      it('should calculate positive trend for growth', () => {
        const result = (analyticsService as any).calculateTrendScore(100, 80, 50, 40);
        expect(result).toBeGreaterThan(0);
      });

      it('should calculate negative trend for decline', () => {
        const result = (analyticsService as any).calculateTrendScore(80, 100, 40, 50);
        expect(result).toBeLessThan(0);
      });

      it('should handle new content with no previous data', () => {
        const result = (analyticsService as any).calculateTrendScore(50, 0, 30, 0);
        expect(result).toBe(80); // currentAttempts + currentUsers
      });
    });

    describe('validateDateRange', () => {
      it('should validate correct date range', () => {
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');
        
        const result = (analyticsService as any).validateDateRange(startDate, endDate);
        expect(result.success).toBe(true);
      });

      it('should reject invalid date range', () => {
        const startDate = new Date('2024-01-31');
        const endDate = new Date('2024-01-01');
        
        const result = (analyticsService as any).validateDateRange(startDate, endDate);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Start date must be before end date');
      });

      it('should reject date range exceeding maximum', () => {
        const startDate = new Date('2023-01-01');
        const endDate = new Date('2024-12-31');
        
        const result = (analyticsService as any).validateDateRange(startDate, endDate);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Date range cannot exceed');
      });

      it('should allow optional dates', () => {
        const result = (analyticsService as any).validateDateRange(undefined, undefined);
        expect(result.success).toBe(true);
      });
    });
  });
});