import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyticsService } from './analytics.service';
import { analyticsRepository } from '@/lib/database/repositories/analytics-repository';
import { quizRepository } from '@/lib/database/repositories/quiz-repository';

// Mock the repositories
vi.mock('@/lib/database/repositories/analytics-repository');
vi.mock('@/lib/database/repositories/quiz-repository');

describe('AnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getQuizAnalytics', () => {
    it('should return quiz analytics when quiz exists', async () => {
      // Mock quiz exists
      vi.mocked(quizRepository.exists).mockResolvedValue(true);
      
      // Mock analytics data
      const mockAnalytics = {
        quizId: 'quiz-1',
        quizTitle: 'Test Quiz',
        totalAttempts: 10,
        completedAttempts: 8,
        completionRate: 80,
        averageScore: 75,
        averageTimeMinutes: 15,
        highestScore: 95,
        lowestScore: 45,
        uniqueUsers: 5,
        questionAnalytics: [],
        userEngagement: {
          newUsers: 3,
          returningUsers: 2,
          averageAttemptsPerUser: 2
        }
      };
      
      vi.mocked(analyticsRepository.getQuizAnalytics).mockResolvedValue(mockAnalytics);

      const result = await analyticsService.getQuizAnalytics('quiz-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAnalytics);
      expect(quizRepository.exists).toHaveBeenCalledWith('quiz-1');
      expect(analyticsRepository.getQuizAnalytics).toHaveBeenCalledWith('quiz-1', undefined);
    });

    it('should return error when quiz does not exist', async () => {
      vi.mocked(quizRepository.exists).mockResolvedValue(false);

      const result = await analyticsService.getQuizAnalytics('nonexistent-quiz');

      expect(result.success).toBe(false);
      expect(result.code).toBe('QUIZ_NOT_FOUND');
      expect(result.error).toBe('Quiz not found');
    });

    it('should handle date range filtering', async () => {
      vi.mocked(quizRepository.exists).mockResolvedValue(true);
      vi.mocked(analyticsRepository.getQuizAnalytics).mockResolvedValue({
        quizId: 'quiz-1',
        quizTitle: 'Test Quiz',
        totalAttempts: 5,
        completedAttempts: 4,
        completionRate: 80,
        averageScore: 75,
        averageTimeMinutes: 15,
        highestScore: 95,
        lowestScore: 45,
        uniqueUsers: 3,
        questionAnalytics: [],
        userEngagement: {
          newUsers: 2,
          returningUsers: 1,
          averageAttemptsPerUser: 1.67
        }
      });

      const dateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const result = await analyticsService.getQuizAnalytics('quiz-1', dateRange);

      expect(result.success).toBe(true);
      expect(analyticsRepository.getQuizAnalytics).toHaveBeenCalledWith('quiz-1', {
        from: dateRange.startDate,
        to: dateRange.endDate
      });
    });
  });

  describe('getQuizPerformanceMetrics', () => {
    it('should calculate performance metrics correctly', async () => {
      const mockAnalytics = {
        quizId: 'quiz-1',
        quizTitle: 'Test Quiz',
        totalAttempts: 20,
        completedAttempts: 16,
        completionRate: 80,
        averageScore: 75,
        averageTimeMinutes: 15,
        highestScore: 95,
        lowestScore: 45,
        uniqueUsers: 10,
        questionAnalytics: [],
        userEngagement: {
          newUsers: 6,
          returningUsers: 4,
          averageAttemptsPerUser: 2
        }
      };

      vi.mocked(quizRepository.exists).mockResolvedValue(true);
      vi.mocked(analyticsRepository.getQuizAnalytics).mockResolvedValue(mockAnalytics);

      const result = await analyticsService.getQuizPerformanceMetrics('quiz-1');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        quizId: 'quiz-1',
        quizTitle: 'Test Quiz',
        totalAttempts: 20,
        completedAttempts: 16,
        completionRate: 80,
        averageScore: 75,
        difficultyRating: 'Easy', // (80 + 75) / 2 = 77.5 >= 75
        engagementScore: expect.any(Number)
      });
    });

    it('should calculate difficulty rating as Medium for moderate scores', async () => {
      const mockAnalytics = {
        quizId: 'quiz-1',
        quizTitle: 'Test Quiz',
        totalAttempts: 20,
        completedAttempts: 12,
        completionRate: 60,
        averageScore: 65,
        averageTimeMinutes: 15,
        highestScore: 85,
        lowestScore: 35,
        uniqueUsers: 10,
        questionAnalytics: [],
        userEngagement: {
          newUsers: 6,
          returningUsers: 4,
          averageAttemptsPerUser: 2
        }
      };

      vi.mocked(quizRepository.exists).mockResolvedValue(true);
      vi.mocked(analyticsRepository.getQuizAnalytics).mockResolvedValue(mockAnalytics);

      const result = await analyticsService.getQuizPerformanceMetrics('quiz-1');

      expect(result.success).toBe(true);
      expect(result.data?.difficultyRating).toBe('Medium'); // (60 + 65) / 2 = 62.5, between 50-75
    });

    it('should calculate difficulty rating as Hard for low scores', async () => {
      const mockAnalytics = {
        quizId: 'quiz-1',
        quizTitle: 'Test Quiz',
        totalAttempts: 20,
        completedAttempts: 8,
        completionRate: 40,
        averageScore: 45,
        averageTimeMinutes: 15,
        highestScore: 65,
        lowestScore: 25,
        uniqueUsers: 10,
        questionAnalytics: [],
        userEngagement: {
          newUsers: 6,
          returningUsers: 4,
          averageAttemptsPerUser: 2
        }
      };

      vi.mocked(quizRepository.exists).mockResolvedValue(true);
      vi.mocked(analyticsRepository.getQuizAnalytics).mockResolvedValue(mockAnalytics);

      const result = await analyticsService.getQuizPerformanceMetrics('quiz-1');

      expect(result.success).toBe(true);
      expect(result.data?.difficultyRating).toBe('Hard'); // (40 + 45) / 2 = 42.5 < 50
    });
  });

  describe('getDetailedQuizAttempts', () => {
    it('should return detailed quiz attempts with filtering', async () => {
      vi.mocked(quizRepository.exists).mockResolvedValue(true);
      
      const mockAttempts = [
        {
          id: 'attempt-1',
          userId: 'user-1',
          userName: 'John Doe',
          userEmail: 'john@example.com',
          score: 85,
          timeTakenSeconds: 900,
          isCompleted: true,
          startedAt: new Date('2024-01-15'),
          completedAt: new Date('2024-01-15'),
          answers: { 'q1': ['A'], 'q2': ['B'] }
        }
      ];

      vi.mocked(analyticsRepository.getDetailedQuizAttempts).mockResolvedValue(mockAttempts);

      const filters = {
        quizId: 'quiz-1',
        completedOnly: true,
        minScore: 80
      };

      const result = await analyticsService.getDetailedQuizAttempts(filters, 10, 0);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAttempts);
      expect(analyticsRepository.getDetailedQuizAttempts).toHaveBeenCalledWith(
        'quiz-1',
        {
          completedOnly: true,
          minScore: 80,
          maxScore: undefined,
          userId: undefined,
          dateRange: undefined
        },
        10,
        0
      );
    });
  });

  describe('getSystemOverview', () => {
    it('should return system overview analytics', async () => {
      const mockOverview = {
        totalQuizzes: 25,
        publishedQuizzes: 20,
        totalAttempts: 500,
        completedAttempts: 400,
        overallCompletionRate: 80,
        totalUsers: 100,
        activeUsers: 75,
        averageScoreAcrossAllQuizzes: 72.5,
        totalLearningModules: 15,
        publishedLearningModules: 12,
        totalMaterialsCompleted: 300,
        topPerformingQuizzes: [
          {
            quizId: 'quiz-1',
            title: 'Security Basics',
            completionRate: 90,
            averageScore: 85
          }
        ],
        userEngagementTrends: {
          dailyActiveUsers: 25,
          weeklyActiveUsers: 60,
          monthlyActiveUsers: 90
        }
      };

      vi.mocked(analyticsRepository.getOverviewAnalytics).mockResolvedValue(mockOverview);

      const result = await analyticsService.getSystemOverview();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockOverview);
      expect(analyticsRepository.getOverviewAnalytics).toHaveBeenCalledWith(undefined);
    });
  });
});