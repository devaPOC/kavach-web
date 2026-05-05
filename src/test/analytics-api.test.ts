import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { analyticsController } from '@/lib/controllers/awareness-lab/analytics.controller';

// Mock the session validation to return admin user
const mockAdminSession = {
  success: true,
  userId: 'admin-user-id',
  role: 'admin' as const,
  email: 'admin@example.com'
};

// Mock the base controller's validateSession method
vi.mock('@/lib/controllers/auth/auth.controller', () => ({
  BaseController: class {
    async validateSession() {
      return mockAdminSession;
    }
    
    success(data: any, message: string, status = 200) {
      return new Response(JSON.stringify({ success: true, data, message }), {
        status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    error(message: string, code: string, status: number) {
      return new Response(JSON.stringify({ success: false, error: message, code }), {
        status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}));

// Mock the analytics service
vi.mock('@/lib/services/awareness-lab/analytics.service', () => ({
  analyticsService: {
    getQuizAnalytics: vi.fn(),
    getQuizPerformanceMetrics: vi.fn(),
    getQuestionAnalytics: vi.fn(),
    getDetailedQuizAttempts: vi.fn(),
    getQuizAttemptsCount: vi.fn(),
    getSystemOverview: vi.fn(),
    getUserEngagementMetrics: vi.fn(),
    getContentPerformance: vi.fn(),
    getTrendingContent: vi.fn(),
    generateAnalyticsReport: vi.fn(),
    getUserDemographicsAnalytics: vi.fn()
  }
}));

import { analyticsService } from '@/lib/services/awareness-lab/analytics.service';

describe('Analytics API Endpoints', () => {
  beforeAll(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/admin/analytics/quizzes/:id/stats', () => {
    it('should return quiz statistics successfully', async () => {
      const mockQuizAnalytics = {
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

      const mockPerformanceMetrics = {
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
        difficultyRating: 'Easy' as const,
        engagementScore: 85
      };

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
        data: []
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/analytics/quizzes/quiz-1/stats');
      const response = await analyticsController.getQuizStats(request, 'quiz-1');

      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data.quizAnalytics).toEqual(mockQuizAnalytics);
      expect(responseData.data.performanceMetrics).toEqual(mockPerformanceMetrics);
      expect(responseData.data.questionAnalytics).toEqual([]);
    });

    it('should handle date range filtering', async () => {
      vi.mocked(analyticsService.getQuizAnalytics).mockResolvedValue({
        success: true,
        data: {
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
        }
      });

      vi.mocked(analyticsService.getQuizPerformanceMetrics).mockResolvedValue({
        success: true,
        data: {
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
          difficultyRating: 'Easy' as const,
          engagementScore: 80
        }
      });

      vi.mocked(analyticsService.getQuestionAnalytics).mockResolvedValue({
        success: true,
        data: []
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/analytics/quizzes/quiz-1/stats?startDate=2024-01-01&endDate=2024-01-31');
      const response = await analyticsController.getQuizStats(request, 'quiz-1');

      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data.dateRange).toEqual({
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T00:00:00.000Z'
      });

      expect(analyticsService.getQuizAnalytics).toHaveBeenCalledWith('quiz-1', {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });
    });

    it('should return 404 when quiz not found', async () => {
      vi.mocked(analyticsService.getQuizAnalytics).mockResolvedValue({
        success: false,
        code: 'QUIZ_NOT_FOUND',
        error: 'Quiz not found'
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/analytics/quizzes/nonexistent/stats');
      const response = await analyticsController.getQuizStats(request, 'nonexistent');

      expect(response.status).toBe(404);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('QUIZ_NOT_FOUND');
    });
  });

  describe('GET /api/v1/admin/analytics/quizzes/:id/attempts', () => {
    it('should return quiz attempts with pagination', async () => {
      const mockAttempts = [
        {
          id: 'attempt-1',
          userId: 'user-1',
          userName: 'John Doe',
          userEmail: 'john@example.com',
          score: 85,
          timeTakenSeconds: 900,
          isCompleted: true,
          startedAt: '2024-01-15T00:00:00.000Z',
          completedAt: '2024-01-15T00:00:00.000Z',
          answers: { 'q1': ['A'], 'q2': ['B'] }
        }
      ];

      vi.mocked(analyticsService.getDetailedQuizAttempts).mockResolvedValue({
        success: true,
        data: mockAttempts
      });

      vi.mocked(analyticsService.getQuizAttemptsCount).mockResolvedValue({
        success: true,
        data: 1
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/analytics/quizzes/quiz-1/attempts?page=1&limit=10');
      const response = await analyticsController.getQuizAttempts(request, 'quiz-1');

      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data.attempts).toEqual(mockAttempts);
      expect(responseData.data.pagination).toEqual({
        page: 1,
        limit: 10,
        totalCount: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      });
    });

    it('should handle filtering parameters', async () => {
      vi.mocked(analyticsService.getDetailedQuizAttempts).mockResolvedValue({
        success: true,
        data: []
      });

      vi.mocked(analyticsService.getQuizAttemptsCount).mockResolvedValue({
        success: true,
        data: 0
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/analytics/quizzes/quiz-1/attempts?completedOnly=true&minScore=80&maxScore=100');
      const response = await analyticsController.getQuizAttempts(request, 'quiz-1');

      expect(response.status).toBe(200);
      
      expect(analyticsService.getDetailedQuizAttempts).toHaveBeenCalledWith(
        {
          quizId: 'quiz-1',
          completedOnly: true,
          minScore: 80,
          maxScore: 100,
          userId: undefined,
          dateRange: undefined
        },
        50,
        0
      );
    });
  });

  describe('GET /api/v1/admin/analytics/overview', () => {
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

      const mockEngagement = {
        totalUsers: 100,
        activeUsers: 75,
        newUsersThisMonth: 20,
        returningUsers: 55,
        averageSessionsPerUser: 3.5,
        averageTimePerSession: 1200,
        retentionRate: 85,
        churnRate: 15
      };

      vi.mocked(analyticsService.getSystemOverview).mockResolvedValue({
        success: true,
        data: mockOverview
      });

      vi.mocked(analyticsService.getUserEngagementMetrics).mockResolvedValue({
        success: true,
        data: mockEngagement
      });

      vi.mocked(analyticsService.getContentPerformance).mockResolvedValue({
        success: true,
        data: {
          quizzes: {
            mostPopular: [],
            highestScoring: [],
            mostChallenging: []
          },
          learningModules: {
            mostAccessed: [],
            highestCompletion: [],
            mostEngaging: []
          }
        }
      });

      vi.mocked(analyticsService.getTrendingContent).mockResolvedValue({
        success: true,
        data: {
          trendingQuizzes: [],
          trendingModules: []
        }
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/analytics/overview');
      const response = await analyticsController.getOverviewAnalytics(request);

      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data.systemOverview).toEqual(mockOverview);
      expect(responseData.data.userEngagement).toEqual(mockEngagement);
    });
  });
});