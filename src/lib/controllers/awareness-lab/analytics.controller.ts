import { NextRequest, NextResponse } from 'next/server';
import { BaseController } from '../auth/auth.controller';
import { analyticsService } from '@/lib/services/awareness-lab/analytics.service';
import { logger } from '@/infrastructure/logging/logger';

/**
 * Analytics controller for awareness lab reporting and statistics
 */
export class AnalyticsController extends BaseController {

  /**
   * Get comprehensive statistics for a specific quiz
   * GET /api/v1/admin/analytics/quizzes/:id/stats
   */
  async getQuizStats(request: NextRequest, quizId: string): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Validate quiz ID format
      if (!quizId || typeof quizId !== 'string') {
        return this.error('Invalid quiz ID', 'INVALID_QUIZ_ID', 400);
      }

      // Parse query parameters for date filtering
      const { searchParams } = new URL(request.url);
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      let dateRange;
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return this.error('Invalid date format. Use ISO 8601 format (YYYY-MM-DD)', 'INVALID_DATE_FORMAT', 400);
        }
        
        if (start > end) {
          return this.error('Start date must be before end date', 'INVALID_DATE_RANGE', 400);
        }

        dateRange = { startDate: start, endDate: end };
      }

      // Get quiz analytics using service
      const analyticsResult = await analyticsService.getQuizAnalytics(quizId, dateRange);
      if (!analyticsResult.success) {
        const statusCode = analyticsResult.code === 'QUIZ_NOT_FOUND' ? 404 : 400;
        return this.error(analyticsResult.error || 'Failed to fetch quiz statistics', analyticsResult.code, statusCode);
      }

      // Get performance metrics
      const metricsResult = await analyticsService.getQuizPerformanceMetrics(quizId, dateRange);
      if (!metricsResult.success) {
        logger.warn('Failed to get performance metrics for quiz', { quizId, error: metricsResult.error });
      }

      // Get question-level analytics
      const questionAnalyticsResult = await analyticsService.getQuestionAnalytics(quizId, dateRange);
      if (!questionAnalyticsResult.success) {
        logger.warn('Failed to get question analytics for quiz', { quizId, error: questionAnalyticsResult.error });
      }

      // Combine all analytics data
      const response = {
        quizAnalytics: analyticsResult.data,
        performanceMetrics: metricsResult.success ? metricsResult.data : null,
        questionAnalytics: questionAnalyticsResult.success ? questionAnalyticsResult.data : [],
        dateRange: dateRange || null,
        generatedAt: new Date().toISOString()
      };

      return this.success(response, 'Quiz statistics retrieved successfully');
    } catch (error: any) {
      logger.error('Failed to get quiz statistics:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Get detailed attempt data for a specific quiz
   * GET /api/v1/admin/analytics/quizzes/:id/attempts
   */
  async getQuizAttempts(request: NextRequest, quizId: string): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Validate quiz ID format
      if (!quizId || typeof quizId !== 'string') {
        return this.error('Invalid quiz ID', 'INVALID_QUIZ_ID', 400);
      }

      // Parse query parameters
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200); // Max 200 per page
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const completedOnly = searchParams.get('completedOnly') === 'true';
      const minScore = searchParams.get('minScore') ? parseInt(searchParams.get('minScore')!) : undefined;
      const maxScore = searchParams.get('maxScore') ? parseInt(searchParams.get('maxScore')!) : undefined;
      const userId = searchParams.get('userId') || undefined;

      // Validate pagination parameters
      if (page < 1) {
        return this.error('Page must be greater than 0', 'INVALID_PAGE', 400);
      }
      if (limit < 1) {
        return this.error('Limit must be greater than 0', 'INVALID_LIMIT', 400);
      }

      // Validate score filters
      if (minScore !== undefined && (minScore < 0 || minScore > 100)) {
        return this.error('Minimum score must be between 0 and 100', 'INVALID_SCORE_FILTER', 400);
      }
      if (maxScore !== undefined && (maxScore < 0 || maxScore > 100)) {
        return this.error('Maximum score must be between 0 and 100', 'INVALID_SCORE_FILTER', 400);
      }
      if (minScore !== undefined && maxScore !== undefined && minScore > maxScore) {
        return this.error('Minimum score cannot be greater than maximum score', 'INVALID_SCORE_FILTER', 400);
      }

      // Parse date range
      let dateRange;
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return this.error('Invalid date format. Use ISO 8601 format (YYYY-MM-DD)', 'INVALID_DATE_FORMAT', 400);
        }
        
        if (start > end) {
          return this.error('Start date must be before end date', 'INVALID_DATE_RANGE', 400);
        }

        dateRange = { startDate: start, endDate: end };
      }

      // Calculate offset
      const offset = (page - 1) * limit;

      // Build filters
      const filters = {
        quizId,
        completedOnly,
        minScore,
        maxScore,
        userId,
        dateRange
      };

      // Get detailed attempts using analytics service
      // Note: This would need to be implemented in the analytics service
      const attemptsResult = await analyticsService.getDetailedQuizAttempts(filters, limit, offset);
      if (!attemptsResult.success) {
        const statusCode = attemptsResult.code === 'QUIZ_NOT_FOUND' ? 404 : 400;
        return this.error(attemptsResult.error || 'Failed to fetch quiz attempts', attemptsResult.code, statusCode);
      }

      // Get total count for pagination
      const countResult = await analyticsService.getQuizAttemptsCount(filters);
      const totalCount = countResult.success ? countResult.data : 0;

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      const response = {
        attempts: attemptsResult.data,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPreviousPage
        },
        filters,
        generatedAt: new Date().toISOString()
      };

      return this.success(response, 'Quiz attempts retrieved successfully');
    } catch (error: any) {
      logger.error('Failed to get quiz attempts:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Get system-wide analytics overview
   * GET /api/v1/admin/analytics/overview
   */
  async getOverviewAnalytics(request: NextRequest): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Parse query parameters for date filtering and demographics
      const { searchParams } = new URL(request.url);
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const userType = searchParams.get('userType') as 'customer' | 'expert' | null;
      const language = searchParams.get('language') as 'en' | 'ar' | null;
      const includeInactive = searchParams.get('includeInactive') === 'true';

      // Parse date range
      let dateRange;
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return this.error('Invalid date format. Use ISO 8601 format (YYYY-MM-DD)', 'INVALID_DATE_FORMAT', 400);
        }
        
        if (start > end) {
          return this.error('Start date must be before end date', 'INVALID_DATE_RANGE', 400);
        }

        dateRange = { startDate: start, endDate: end };
      }

      // Get system overview analytics
      const overviewResult = await analyticsService.getSystemOverview(dateRange);
      if (!overviewResult.success) {
        return this.error(overviewResult.error || 'Failed to fetch system overview', overviewResult.code, 400);
      }

      // Get user engagement metrics
      const engagementResult = await analyticsService.getUserEngagementMetrics(dateRange);
      if (!engagementResult.success) {
        logger.warn('Failed to get user engagement metrics', { error: engagementResult.error });
      }

      // Get content performance analytics
      const contentPerformanceResult = await analyticsService.getContentPerformance(dateRange);
      if (!contentPerformanceResult.success) {
        logger.warn('Failed to get content performance analytics', { error: contentPerformanceResult.error });
      }

      // Get trending content
      const trendingResult = await analyticsService.getTrendingContent(7); // Last 7 days
      if (!trendingResult.success) {
        logger.warn('Failed to get trending content', { error: trendingResult.error });
      }

      // Apply demographic filters if specified
      let filteredOverview = overviewResult.data;
      if (userType || language || !includeInactive) {
        // Note: This would require additional filtering logic in the service
        // For now, we'll include the filters in the response metadata
      }

      const response = {
        systemOverview: filteredOverview,
        userEngagement: engagementResult.success ? engagementResult.data : null,
        contentPerformance: contentPerformanceResult.success ? contentPerformanceResult.data : null,
        trendingContent: trendingResult.success ? trendingResult.data : null,
        filters: {
          dateRange: dateRange || null,
          userType: userType || null,
          language: language || null,
          includeInactive
        },
        generatedAt: new Date().toISOString()
      };

      return this.success(response, 'System overview analytics retrieved successfully');
    } catch (error: any) {
      logger.error('Failed to get overview analytics:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Export analytics data in various formats
   * GET /api/v1/admin/analytics/export
   */
  async exportAnalytics(request: NextRequest): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Parse query parameters
      const { searchParams } = new URL(request.url);
      const format = searchParams.get('format') as 'json' | 'csv' || 'json';
      const quizId = searchParams.get('quizId') || undefined;
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      // Validate format
      if (!['json', 'csv'].includes(format)) {
        return this.error('Invalid format. Supported formats: json, csv', 'INVALID_FORMAT', 400);
      }

      // Parse date range
      let dateRange;
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return this.error('Invalid date format. Use ISO 8601 format (YYYY-MM-DD)', 'INVALID_DATE_FORMAT', 400);
        }

        dateRange = { startDate: start, endDate: end };
      }

      // Build filters for export
      const filters = {
        quizId,
        startDate: dateRange?.startDate?.toISOString(),
        endDate: dateRange?.endDate?.toISOString()
      };

      // Generate analytics report
      const reportResult = await analyticsService.generateAnalyticsReport(filters, format);
      if (!reportResult.success) {
        return this.error(reportResult.error || 'Failed to generate analytics report', reportResult.code, 400);
      }

      // Set appropriate headers based on format
      const headers: Record<string, string> = {
        'Content-Type': format === 'csv' ? 'text/csv' : 'application/json',
      };

      if (format === 'csv') {
        headers['Content-Disposition'] = `attachment; filename="analytics-report-${new Date().toISOString().split('T')[0]}.csv"`;
      }

      // Return the report data
      const responseData = format === 'csv' ? reportResult.data.data : reportResult.data;
      
      return new NextResponse(
        format === 'csv' ? responseData : JSON.stringify(responseData, null, 2),
        {
          status: 200,
          headers
        }
      );
    } catch (error: any) {
      logger.error('Failed to export analytics:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Get user demographics analytics
   * GET /api/v1/admin/analytics/demographics
   */
  async getUserDemographics(request: NextRequest): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Parse query parameters
      const { searchParams } = new URL(request.url);
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      // Parse date range
      let dateRange;
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return this.error('Invalid date format. Use ISO 8601 format (YYYY-MM-DD)', 'INVALID_DATE_FORMAT', 400);
        }

        dateRange = { startDate: start, endDate: end };
      }

      // Get user demographics analytics
      // Note: This would need to be implemented in the analytics service
      const demographicsResult = await analyticsService.getUserDemographicsAnalytics(dateRange);
      if (!demographicsResult.success) {
        return this.error(demographicsResult.error || 'Failed to fetch user demographics', demographicsResult.code, 400);
      }

      const response = {
        demographics: demographicsResult.data,
        dateRange: dateRange || null,
        generatedAt: new Date().toISOString()
      };

      return this.success(response, 'User demographics retrieved successfully');
    } catch (error: any) {
      logger.error('Failed to get user demographics:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }
}

// Export singleton instance
export const analyticsController = new AnalyticsController();