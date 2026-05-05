import { describe, it, expect, beforeEach, vi } from 'vitest';
import { awarenessSessionAnalyticsService } from '@/lib/services/awareness-session-analytics.service';

// Mock the database connection
vi.mock('@/lib/database/connection', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
  }
}));

// Mock the repositories
vi.mock('@/lib/database/repositories/awareness-session-repository', () => ({
  awarenessSessionRepository: {
    getStatistics: vi.fn(),
  }
}));

vi.mock('@/lib/database/repositories/user-repository', () => ({
  userRepository: {
    findById: vi.fn(),
  }
}));

describe('AwarenessSessionAnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAnalytics', () => {
    it('should validate date range parameters', async () => {
      const invalidDateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2023-12-31') // End date before start date
      };

      const result = await awarenessSessionAnalyticsService.getAnalytics(invalidDateRange);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Start date must be before end date');
    });

    it('should require startDate parameter', async () => {
      const invalidDateRange = {
        startDate: null as any,
        endDate: new Date('2024-12-31')
      };

      const result = await awarenessSessionAnalyticsService.getAnalytics(invalidDateRange);

      expect(result.success).toBe(false);
      expect(result.error).toContain('startDate');
    });

    it('should require endDate parameter', async () => {
      const invalidDateRange = {
        startDate: new Date('2024-01-01'),
        endDate: null as any
      };

      const result = await awarenessSessionAnalyticsService.getAnalytics(invalidDateRange);

      expect(result.success).toBe(false);
      expect(result.error).toContain('endDate');
    });
  });

  describe('exportAnalytics', () => {
    it('should validate export format', async () => {
      const invalidOptions = {
        format: 'invalid' as any,
        includeDetails: false,
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31')
        }
      };

      const result = await awarenessSessionAnalyticsService.exportAnalytics(invalidOptions);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unsupported export format');
    });

    it('should require format parameter', async () => {
      const invalidOptions = {
        format: null as any,
        includeDetails: false,
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31')
        }
      };

      const result = await awarenessSessionAnalyticsService.exportAnalytics(invalidOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('format');
    });

    it('should require dateRange parameter', async () => {
      const invalidOptions = {
        format: 'csv' as const,
        includeDetails: false,
        dateRange: null as any
      };

      const result = await awarenessSessionAnalyticsService.exportAnalytics(invalidOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('dateRange');
    });
  });

  describe('CSV export generation', () => {
    it('should generate valid CSV structure', () => {
      const mockAnalytics = {
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31')
        },
        requestVolume: {
          totalRequests: 100,
          averageRequestsPerDay: 5.5,
          requestsByStatus: {
            'pending_admin_review': 10,
            'forwarded_to_expert': 20,
            'confirmed': 50,
            'rejected': 15,
            'expert_declined': 5
          },
          requestsByMonth: [],
          requestsByWeek: []
        },
        expertUtilization: {
          totalExperts: 5,
          activeExperts: 3,
          expertAssignments: [
            {
              expertId: '1',
              expertName: 'John Doe',
              expertEmail: 'john@example.com',
              totalAssigned: 10,
              totalConfirmed: 8,
              totalDeclined: 2,
              acceptanceRate: 80,
              averageResponseTime: 24
            }
          ],
          unassignedRequests: 5,
          reassignmentRate: 10
        },
        sessionAnalytics: {
          sessionsByDuration: {
            '1_hour': 20,
            '2_hours': 30,
            'half_day': 15,
            'full_day': 5
          },
          sessionsByMode: {
            'on_site': 40,
            'online': 30
          },
          sessionsByAudienceType: {
            'women': 10,
            'kids': 15,
            'adults': 25,
            'mixed': 20,
            'corporate_staff': 15,
            'students': 15
          },
          averageAudienceSize: 25,
          totalAudienceReached: 1250,
          popularTopics: [
            { topic: 'Password Security', count: 15 },
            { topic: 'Phishing Awareness', count: 12 }
          ],
          locationDistribution: [
            { location: 'New York', count: 10 },
            { location: 'Los Angeles', count: 8 }
          ]
        },
        trendAnalysis: {
          requestTrends: [],
          seasonalPatterns: [],
          statusTransitionTimes: {}
        },
        generatedAt: new Date()
      };

      // Test the private method indirectly by calling exportAnalytics
      const service = awarenessSessionAnalyticsService as any;
      const csvData = service.generateCSVExport(mockAnalytics, { includeDetails: true });

      expect(csvData).toContain('Awareness Session Analytics Report');
      expect(csvData).toContain('Total Requests,100');
      expect(csvData).toContain('John Doe');
      expect(csvData).toContain('Password Security');
    });
  });
});