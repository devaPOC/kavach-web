import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Import route handlers
import { GET as getOverviewAnalytics } from '@/app/(backend)/api/v1/admin/analytics/overview/route';
import { GET as getQuizStats } from '@/app/(backend)/api/v1/admin/analytics/quizzes/[id]/stats/route';
import { GET as getQuizAttempts } from '@/app/(backend)/api/v1/admin/analytics/quizzes/[id]/attempts/route';
import { GET as exportAnalytics } from '@/app/(backend)/api/v1/admin/analytics/export/route';
import { GET as getDemographics } from '@/app/(backend)/api/v1/admin/analytics/demographics/route';

// Mock the analytics service
vi.mock('@/lib/services/awareness-lab/analytics.service', () => ({
  analyticsService: {
    getSystemOverview: vi.fn(),
    getUserEngagementMetrics: vi.fn(),
    getContentPerformance: vi.fn(),
    getTrendingContent: vi.fn(),
    getQuizAnalytics: vi.fn(),
    getQuizPerformanceMetrics: vi.fn(),
    getQuestionAnalytics: vi.fn(),
    getDetailedQuizAttempts: vi.fn(),
    getQuizAttemptsCount: vi.fn(),
    generateAnalyticsReport: vi.fn(),
    getUserDemographicsAnalytics: vi.fn(),
    exportAnalyticsData: vi.fn()
  }
}));

// Mock authentication
vi.mock('@/lib/auth/session-validation-middleware', () => ({
  validateSession: vi.fn()
}));

import { analyticsService } from '@/lib/services/awareness-lab/analytics.service';
import { validateSession } from '@/lib/auth/session-validation-middleware';

describe('Analytics API Integration Tests', () => {
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

  const mockExpertSession = {
    success: true,
    userId: 'expert-user-id',
    role: 'expert' as const,
    email: 'expert@test.com'
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

  describe('GET /api/v1/admin/analytics/overview - System Overview', () => {
    it('should return comprehensive system analytics for admin', async () => {
      const mockSystemOverview = {
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
            averageScore: 85,
            totalAttempts: 50
          }
        ],
        userEngagementTrends: {
          dailyActiveUsers: 25,
          weeklyActiveUsers: 60,
          monthlyActiveUsers: 90
        }
      };

      const mockUserEngagement = {
        totalUsers: 100,
        activeUsers: 75,
        newUsersThisMonth: 20,
        returningUsers: 55,
        averageSessionsPerUser: 3.5,
        averageTimePerSession: 1200,
        retentionRate: 85,
        churnRate: 15
      };

      const mockContentPerformance = {
        quizzes: {
          mostPopular: [
            { id: 'quiz-1', title: 'Security Basics', attempts: 50 }
          ],
          highestScoring: [
            { id: 'quiz-2', title: 'Password Security', averageScore: 92 }
          ],
          mostChallenging: [
            { id: 'quiz-3', title: 'Advanced Threats', averageScore: 45 }
          ]
        },
        learningModules: {
          mostAccessed: [
            { id: 'module-1', title: 'Cybersecurity Fundamentals', accessCount: 200 }
          ],
          highestCompletion: [
            { id: 'module-2', title: 'Basic Security', completionRate: 95 }
          ],
          mostEngaging: [
            { id: 'module-3', title: 'Threat Awareness', engagementScore: 88 }
          ]
        }
      };

      const mockTrendingContent = {
        trendingQuizzes: [
          { id: 'quiz-trending', title: 'Latest Security Trends', growthRate: 150 }
        ],
        trendingModules: [
          { id: 'module-trending', title: 'Current Threats', growthRate: 120 }
        ]
      };

      vi.mocked(analyticsService.getSystemOverview).mockResolvedValue({
        success: true,
        data: mockSystemOverview
      });

      vi.mocked(analyticsService.getUserEngagementMetrics).mockResolvedValue({
        success: true,
        data: mockUserEngagement
      });

      vi.mocked(analyticsService.getContentPerformance).mockResolvedValue({
        success: true,
        data: mockContentPerformance
      });

      vi.mocked(analyticsService.getTrendingContent).mockResolvedValue({
        success: true,
        data: mockTrendingContent
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/analytics/overview', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getOverviewAnalytics(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.systemOverview).toEqual(mockSystemOverview);
      expect(responseData.data.userEngagement).toEqual(mockUserEngagement);
      expect(responseData.data.contentPerformance).toEqual(mockContentPerformance);
      expect(responseData.data.trendingContent).toEqual(mockTrendingContent);
    });

    it('should handle date range filtering', async () => {
      const mockFilteredOverview = {
        totalQuizzes: 25,
        publishedQuizzes: 20,
        totalAttempts: 100,
        completedAttempts: 80,
        overallCompletionRate: 80,
        dateRange: {
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-01-31T23:59:59.999Z'
        }
      };

      vi.mocked(analyticsService.getSystemOverview).mockResolvedValue({
        success: true,
        data: mockFilteredOverview
      });

      vi.mocked(analyticsService.getUserEngagementMetrics).mockResolvedValue({
        success: true,
        data: {}
      });

      vi.mocked(analyticsService.getContentPerformance).mockResolvedValue({
        success: true,
        data: { quizzes: {}, learningModules: {} }
      });

      vi.mocked(analyticsService.getTrendingContent).mockResolvedValue({
        success: true,
        data: { trendingQuizzes: [], trendingModules: [] }
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/analytics/overview?startDate=2024-01-01&endDate=2024-01-31', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getOverviewAnalytics(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data.systemOverview.dateRange).toBeDefined();
      expect(analyticsService.getSystemOverview).toHaveBeenCalledWith({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });
    });

    it('should require admin authentication', async () => {
      vi.mocked(validateSession).mockResolvedValue(mockCustomerSession);

      const request = new NextRequest('http://localhost:3000/api/v1/admin/analytics/overview', {
        headers: {
          'Authorization': 'Bearer customer-token'
        }
      });

      const response = await getOverviewAnalytics(request);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Admin access required');
    });

    it('should require authentication', async () => {
      vi.mocked(validateSession).mockResolvedValue(mockInvalidSession);

      const request = new NextRequest('http://localhost:3000/api/v1/admin/analytics/overview');

      const response = await getOverviewAnalytics(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Authentication required');
    });
  });

  describe('GET /api/v1/admin/analytics/quizzes/:id/stats - Quiz Statistics', () => {
    it('should return detailed quiz analytics', async () => {
      const mockQuizAnalytics = {
        quizId: 'quiz-1',
        quizTitle: 'Cybersecurity Basics',
        totalAttempts: 50,
        completedAttempts: 40,
        completionRate: 80,
        averageScore: 75,
        averageTimeMinutes: 15,
        highestScore: 95,
        lowestScore: 45,
        uniqueUsers: 25,
        questionAnalytics: [
          {
            questionId: 'q1',
            questionText: 'What is cybersecurity?',
            correctAnswerRate: 85,
            averageTimeSeconds: 30,
            mostSelectedAnswer: 'Option A',
            difficultyLevel: 'Easy'
          }
        ],
        userEngagement: {
          newUsers: 15,
          returningUsers: 10,
          averageAttemptsPerUser: 2
        }
      };

      const mockPerformanceMetrics = {
        quizId: 'quiz-1',
        quizTitle: 'Cybersecurity Basics',
        totalAttempts: 50,
        completedAttempts: 40,
        completionRate: 80,
        averageScore: 75,
        averageTimeMinutes: 15,
        highestScore: 95,
        lowestScore: 45,
        uniqueUsers: 25,
        difficultyRating: 'Medium' as const,
        engagementScore: 85
      };

      const mockQuestionAnalytics = [
        {
          questionId: 'q1',
          questionText: 'What is cybersecurity?',
          questionType: 'mcq',
          correctAnswerRate: 85,
          averageTimeSeconds: 30,
          totalAnswers: 40,
          correctAnswers: 34,
          answerDistribution: {
            'Option A': 34,
            'Option B': 4,
            'Option C': 2,
            'Option D': 0
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

      const request = new NextRequest('http://localhost:3000/api/v1/admin/analytics/quizzes/quiz-1/stats', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getQuizStats(request, { params: { id: 'quiz-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.quizAnalytics).toEqual(mockQuizAnalytics);
      expect(responseData.data.performanceMetrics).toEqual(mockPerformanceMetrics);
      expect(responseData.data.questionAnalytics).toEqual(mockQuestionAnalytics);
    });

    it('should handle date range and filtering parameters', async () => {
      vi.mocked(analyticsService.getQuizAnalytics).mockResolvedValue({
        success: true,
        data: {
          quizId: 'quiz-1',
          quizTitle: 'Test Quiz',
          totalAttempts: 20,
          completedAttempts: 16,
          completionRate: 80,
          averageScore: 78,
          dateRange: {
            startDate: '2024-01-01T00:00:00.000Z',
            endDate: '2024-01-31T23:59:59.999Z'
          }
        }
      });

      vi.mocked(analyticsService.getQuizPerformanceMetrics).mockResolvedValue({
        success: true,
        data: {}
      });

      vi.mocked(analyticsService.getQuestionAnalytics).mockResolvedValue({
        success: true,
        data: []
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/analytics/quizzes/quiz-1/stats?startDate=2024-01-01&endDate=2024-01-31&minScore=70&maxScore=100', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getQuizStats(request, { params: { id: 'quiz-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data.filters).toEqual({
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T00:00:00.000Z',
        minScore: 70,
        maxScore: 100
      });
    });

    it('should return 404 for non-existent quiz', async () => {
      vi.mocked(analyticsService.getQuizAnalytics).mockResolvedValue({
        success: false,
        error: 'Quiz not found',
        code: 'QUIZ_NOT_FOUND'
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/analytics/quizzes/nonexistent/stats', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getQuizStats(request, { params: { id: 'nonexistent' } });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.code).toBe('QUIZ_NOT_FOUND');
    });

    it('should validate quiz ID format', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/admin/analytics/quizzes//stats', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getQuizStats(request, { params: { id: '' } });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Invalid quiz ID');
    });
  });

  describe('GET /api/v1/admin/analytics/quizzes/:id/attempts - Quiz Attempts', () => {
    it('should return paginated quiz attempts with user details', async () => {
      const mockAttempts = [
        {
          id: 'attempt-1',
          userId: 'user-1',
          userName: 'John Doe',
          userEmail: 'john@example.com',
          score: 85,
          timeTakenSeconds: 900,
          isCompleted: true,
          startedAt: '2024-01-15T10:00:00.000Z',
          completedAt: '2024-01-15T10:15:00.000Z',
          answers: {
            'q1': ['Option A'],
            'q2': ['Option B', 'Option C']
          }
        },
        {
          id: 'attempt-2',
          userId: 'user-2',
          userName: 'Jane Smith',
          userEmail: 'jane@example.com',
          score: 92,
          timeTakenSeconds: 720,
          isCompleted: true,
          startedAt: '2024-01-15T11:00:00.000Z',
          completedAt: '2024-01-15T11:12:00.000Z',
          answers: {
            'q1': ['Option A'],
            'q2': ['Option A']
          }
        }
      ];

      vi.mocked(analyticsService.getDetailedQuizAttempts).mockResolvedValue({
        success: true,
        data: mockAttempts
      });

      vi.mocked(analyticsService.getQuizAttemptsCount).mockResolvedValue({
        success: true,
        data: 25
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/analytics/quizzes/quiz-1/attempts?page=1&limit=10', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getQuizAttempts(request, { params: { id: 'quiz-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.attempts).toEqual(mockAttempts);
      expect(responseData.data.pagination).toEqual({
        page: 1,
        limit: 10,
        totalCount: 25,
        totalPages: 3,
        hasNextPage: true,
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

      const request = new NextRequest('http://localhost:3000/api/v1/admin/analytics/quizzes/quiz-1/attempts?completedOnly=true&minScore=80&maxScore=100&userId=user-1', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getQuizAttempts(request, { params: { id: 'quiz-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data.filters).toEqual({
        completedOnly: true,
        minScore: 80,
        maxScore: 100,
        userId: 'user-1'
      });

      expect(analyticsService.getDetailedQuizAttempts).toHaveBeenCalledWith(
        {
          quizId: 'quiz-1',
          completedOnly: true,
          minScore: 80,
          maxScore: 100,
          userId: 'user-1',
          dateRange: undefined
        },
        50,
        0
      );
    });

    it('should handle date range filtering', async () => {
      vi.mocked(analyticsService.getDetailedQuizAttempts).mockResolvedValue({
        success: true,
        data: []
      });

      vi.mocked(analyticsService.getQuizAttemptsCount).mockResolvedValue({
        success: true,
        data: 0
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/analytics/quizzes/quiz-1/attempts?startDate=2024-01-01&endDate=2024-01-31', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getQuizAttempts(request, { params: { id: 'quiz-1' } });

      expect(analyticsService.getDetailedQuizAttempts).toHaveBeenCalledWith(
        {
          quizId: 'quiz-1',
          completedOnly: undefined,
          minScore: undefined,
          maxScore: undefined,
          userId: undefined,
          dateRange: {
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-31')
          }
        },
        50,
        0
      );
    });

    it('should validate pagination parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/admin/analytics/quizzes/quiz-1/attempts?page=0&limit=1000', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getQuizAttempts(request, { params: { id: 'quiz-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Invalid pagination parameters');
    });
  });

  describe('GET /api/v1/admin/analytics/export - Export Analytics', () => {
    it('should export analytics data in CSV format', async () => {
      const mockExportData = {
        format: 'csv',
        filename: 'analytics-export-2024-01-15.csv',
        data: 'Quiz Title,Total Attempts,Completion Rate,Average Score\nSecurity Basics,50,80%,75\nPassword Security,30,90%,85',
        size: 1024
      };

      vi.mocked(analyticsService.exportAnalyticsData).mockResolvedValue({
        success: true,
        data: mockExportData
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/analytics/export?type=quiz-overview&format=csv&startDate=2024-01-01&endDate=2024-01-31', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await exportAnalytics(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(analyticsService.exportAnalyticsData).toHaveBeenCalledWith({
        type: 'quiz-overview',
        format: 'csv',
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        },
        filters: {}
      });
    });

    it('should export analytics data in JSON format', async () => {
      const mockExportData = {
        format: 'json',
        filename: 'analytics-export-2024-01-15.json',
        data: JSON.stringify({
          quizzes: [
            { id: 'quiz-1', title: 'Security Basics', attempts: 50 }
          ]
        }),
        size: 512
      };

      vi.mocked(analyticsService.exportAnalyticsData).mockResolvedValue({
        success: true,
        data: mockExportData
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/analytics/export?type=detailed-attempts&format=json&quizId=quiz-1', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await exportAnalytics(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
    });

    it('should validate export parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/admin/analytics/export?type=invalid-type&format=invalid-format', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await exportAnalytics(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Invalid export parameters');
    });

    it('should require admin authentication for export', async () => {
      vi.mocked(validateSession).mockResolvedValue(mockExpertSession);

      const request = new NextRequest('http://localhost:3000/api/v1/admin/analytics/export?type=quiz-overview&format=csv', {
        headers: {
          'Authorization': 'Bearer expert-token'
        }
      });

      const response = await exportAnalytics(request);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Admin access required');
    });
  });

  describe('GET /api/v1/admin/analytics/demographics - User Demographics', () => {
    it('should return user demographics analytics', async () => {
      const mockDemographics = {
        totalUsers: 100,
        usersByRole: {
          customer: 85,
          expert: 10,
          admin: 5
        },
        usersByCountry: {
          'Saudi Arabia': 60,
          'UAE': 25,
          'Egypt': 10,
          'Other': 5
        },
        usersByLanguagePreference: {
          'ar': 70,
          'en': 30
        },
        ageDistribution: {
          '18-25': 20,
          '26-35': 35,
          '36-45': 25,
          '46-55': 15,
          '55+': 5
        },
        engagementByDemographic: {
          byCountry: {
            'Saudi Arabia': { averageScore: 75, completionRate: 80 },
            'UAE': { averageScore: 78, completionRate: 85 }
          },
          byLanguage: {
            'ar': { averageScore: 74, completionRate: 82 },
            'en': { averageScore: 79, completionRate: 78 }
          }
        }
      };

      vi.mocked(analyticsService.getUserDemographicsAnalytics).mockResolvedValue({
        success: true,
        data: mockDemographics
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/analytics/demographics', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getDemographics(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual(mockDemographics);
      expect(analyticsService.getUserDemographicsAnalytics).toHaveBeenCalled();
    });

    it('should handle date range filtering for demographics', async () => {
      vi.mocked(analyticsService.getUserDemographicsAnalytics).mockResolvedValue({
        success: true,
        data: {
          totalUsers: 50,
          dateRange: {
            startDate: '2024-01-01T00:00:00.000Z',
            endDate: '2024-01-31T23:59:59.999Z'
          }
        }
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/analytics/demographics?startDate=2024-01-01&endDate=2024-01-31', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getDemographics(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data.dateRange).toBeDefined();
      expect(analyticsService.getUserDemographicsAnalytics).toHaveBeenCalledWith({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all analytics endpoints', async () => {
      vi.mocked(validateSession).mockResolvedValue(mockInvalidSession);

      const endpoints = [
        { url: '/api/v1/admin/analytics/overview', handler: getOverviewAnalytics },
        { url: '/api/v1/admin/analytics/demographics', handler: getDemographics },
        { url: '/api/v1/admin/analytics/export', handler: exportAnalytics }
      ];

      for (const endpoint of endpoints) {
        const request = new NextRequest(`http://localhost:3000${endpoint.url}`);

        const response = await endpoint.handler(request);
        const responseData = await response.json();

        expect(response.status).toBe(401);
        expect(responseData.success).toBe(false);
        expect(responseData.error).toBe('Authentication required');
      }
    });

    it('should require admin role for all analytics endpoints', async () => {
      vi.mocked(validateSession).mockResolvedValue(mockCustomerSession);

      const endpoints = [
        { url: '/api/v1/admin/analytics/overview', handler: getOverviewAnalytics },
        { url: '/api/v1/admin/analytics/demographics', handler: getDemographics },
        { url: '/api/v1/admin/analytics/export', handler: exportAnalytics }
      ];

      for (const endpoint of endpoints) {
        const request = new NextRequest(`http://localhost:3000${endpoint.url}`, {
          headers: {
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

    it('should not allow expert access to analytics endpoints', async () => {
      vi.mocked(validateSession).mockResolvedValue(mockExpertSession);

      const request = new NextRequest('http://localhost:3000/api/v1/admin/analytics/overview', {
        headers: {
          'Authorization': 'Bearer expert-token'
        }
      });

      const response = await getOverviewAnalytics(request);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Admin access required');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle service errors gracefully', async () => {
      vi.mocked(analyticsService.getSystemOverview).mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/v1/admin/analytics/overview', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getOverviewAnalytics(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Internal server error');
    });

    it('should validate date range parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/admin/analytics/overview?startDate=invalid-date&endDate=2024-01-31', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await getOverviewAnalytics(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Invalid date format');
    });

    it('should handle large data exports with streaming', async () => {
      const mockLargeExport = {
        format: 'csv',
        filename: 'large-export.csv',
        data: 'A'.repeat(10000), // Large data
        size: 10000
      };

      vi.mocked(analyticsService.exportAnalyticsData).mockResolvedValue({
        success: true,
        data: mockLargeExport
      });

      const request = new NextRequest('http://localhost:3000/api/v1/admin/analytics/export?type=all-attempts&format=csv', {
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await exportAnalytics(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Length')).toBe('10000');
    });

    it('should handle concurrent analytics requests', async () => {
      vi.mocked(analyticsService.getSystemOverview).mockResolvedValue({
        success: true,
        data: { totalQuizzes: 25 }
      });

      vi.mocked(analyticsService.getUserEngagementMetrics).mockResolvedValue({
        success: true,
        data: { totalUsers: 100 }
      });

      vi.mocked(analyticsService.getContentPerformance).mockResolvedValue({
        success: true,
        data: { quizzes: {}, learningModules: {} }
      });

      vi.mocked(analyticsService.getTrendingContent).mockResolvedValue({
        success: true,
        data: { trendingQuizzes: [], trendingModules: [] }
      });

      // Simulate concurrent requests
      const requests = Array.from({ length: 5 }, () => 
        getOverviewAnalytics(new NextRequest('http://localhost:3000/api/v1/admin/analytics/overview', {
          headers: { 'Authorization': 'Bearer admin-token' }
        }))
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});