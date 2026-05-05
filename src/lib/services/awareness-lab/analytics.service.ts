import { BaseService, ServiceResult, serviceSuccess, serviceError } from '../base.service';
import { analyticsRepository } from '@/lib/database/repositories/analytics-repository';
import { quizRepository } from '@/lib/database/repositories/quiz-repository';
import { learningRepository } from '@/lib/database/repositories/learning-repository';
import { 
  AwarenessLabErrorCode 
} from '@/lib/errors/awareness-lab-errors';
import { 
  analyticsFilterSchema,
  type AnalyticsFilterData
} from '@/lib/validation/awareness-lab-schemas';

export interface QuizPerformanceMetrics {
  quizId: string;
  quizTitle: string;
  totalAttempts: number;
  completedAttempts: number;
  completionRate: number;
  averageScore: number;
  averageTimeMinutes: number;
  highestScore: number;
  lowestScore: number;
  uniqueUsers: number;
  difficultyRating: 'Easy' | 'Medium' | 'Hard';
  engagementScore: number;
}

export interface SystemOverview {
  totalQuizzes: number;
  publishedQuizzes: number;
  totalAttempts: number;
  completedAttempts: number;
  overallCompletionRate: number;
  totalUsers: number;
  activeUsers: number;
  averageScoreAcrossAllQuizzes: number;
  totalLearningModules: number;
  publishedLearningModules: number;
  totalMaterialsCompleted: number;
  topPerformingQuizzes: Array<{
    quizId: string;
    title: string;
    completionRate: number;
    averageScore: number;
  }>;
  userEngagementTrends: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
  };
}

export interface UserEngagementMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  returningUsers: number;
  averageSessionsPerUser: number;
  averageTimePerSession: number;
  retentionRate: number;
  churnRate: number;
}

export interface ContentPerformance {
  quizzes: {
    mostPopular: Array<{ id: string; title: string; attempts: number }>;
    highestScoring: Array<{ id: string; title: string; averageScore: number }>;
    mostChallenging: Array<{ id: string; title: string; completionRate: number }>;
  };
  learningModules: {
    mostAccessed: Array<{ id: string; title: string; accessCount: number }>;
    highestCompletion: Array<{ id: string; title: string; completionRate: number }>;
    mostEngaging: Array<{ id: string; title: string; engagementScore: number }>;
  };
}

export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

/**
 * Service for calculating completion rates, statistics, and analytics
 */
export class AnalyticsService extends BaseService {

  // ===== QUIZ ANALYTICS =====

  /**
   * Get comprehensive analytics for a specific quiz
   */
  async getQuizAnalytics(
    quizId: string,
    dateRange?: DateRangeFilter
  ): Promise<ServiceResult<any>> {
    try {
      // Validate quiz exists
      const quizExists = await quizRepository.exists(quizId);
      if (!quizExists) {
        return serviceError('Quiz not found', AwarenessLabErrorCode.QUIZ_NOT_FOUND);
      }

      const analytics = await analyticsRepository.getQuizAnalytics(
        quizId,
        dateRange ? { from: dateRange.startDate!, to: dateRange.endDate! } : undefined
      );

      if (!analytics) {
        return serviceError('Analytics data unavailable', AwarenessLabErrorCode.ANALYTICS_DATA_UNAVAILABLE);
      }

      return serviceSuccess(analytics);
    } catch (error) {
      this.handleError(error, 'AnalyticsService.getQuizAnalytics');
    }
  }

  /**
   * Get quiz performance metrics with difficulty rating
   */
  async getQuizPerformanceMetrics(
    quizId: string,
    dateRange?: DateRangeFilter
  ): Promise<ServiceResult<QuizPerformanceMetrics>> {
    try {
      const analyticsResult = await this.getQuizAnalytics(quizId, dateRange);
      if (!analyticsResult.success) {
        return analyticsResult as ServiceResult<QuizPerformanceMetrics>;
      }

      const analytics = analyticsResult.data;

      // Calculate difficulty rating based on completion rate and average score
      const difficultyRating = this.calculateDifficultyRating(
        analytics.completionRate,
        analytics.averageScore
      );

      // Calculate engagement score
      const engagementScore = this.calculateEngagementScore(
        analytics.completionRate,
        analytics.userEngagement.averageAttemptsPerUser,
        analytics.uniqueUsers,
        analytics.totalAttempts
      );

      const metrics: QuizPerformanceMetrics = {
        quizId: analytics.quizId,
        quizTitle: analytics.quizTitle,
        totalAttempts: analytics.totalAttempts,
        completedAttempts: analytics.completedAttempts,
        completionRate: analytics.completionRate,
        averageScore: analytics.averageScore,
        averageTimeMinutes: analytics.averageTimeMinutes,
        highestScore: analytics.highestScore,
        lowestScore: analytics.lowestScore,
        uniqueUsers: analytics.uniqueUsers,
        difficultyRating,
        engagementScore
      };

      return serviceSuccess(metrics);
    } catch (error) {
      this.handleError(error, 'AnalyticsService.getQuizPerformanceMetrics');
    }
  }

  /**
   * Get question-level analytics for a quiz
   */
  async getQuestionAnalytics(
    quizId: string,
    dateRange?: DateRangeFilter
  ): Promise<ServiceResult<any[]>> {
    try {
      const quizExists = await quizRepository.exists(quizId);
      if (!quizExists) {
        return serviceError('Quiz not found', AwarenessLabErrorCode.QUIZ_NOT_FOUND);
      }

      const questionAnalytics = await analyticsRepository.getQuestionAnalytics(
        quizId,
        dateRange ? { from: dateRange.startDate!, to: dateRange.endDate! } : undefined
      );

      return serviceSuccess(questionAnalytics);
    } catch (error) {
      this.handleError(error, 'AnalyticsService.getQuestionAnalytics');
    }
  }

  /**
   * Get quiz leaderboard
   */
  async getQuizLeaderboard(
    quizId: string,
    limit: number = 10
  ): Promise<ServiceResult<any[]>> {
    try {
      const quizExists = await quizRepository.exists(quizId);
      if (!quizExists) {
        return serviceError('Quiz not found', AwarenessLabErrorCode.QUIZ_NOT_FOUND);
      }

      const leaderboard = await analyticsRepository.getQuizLeaderboard(quizId, limit);
      return serviceSuccess(leaderboard);
    } catch (error) {
      this.handleError(error, 'AnalyticsService.getQuizLeaderboard');
    }
  }

  // ===== SYSTEM OVERVIEW ANALYTICS =====

  /**
   * Get system-wide overview analytics
   */
  async getSystemOverview(
    dateRange?: DateRangeFilter
  ): Promise<ServiceResult<SystemOverview>> {
    try {
      const overview = await analyticsRepository.getOverviewAnalytics(
        dateRange ? { from: dateRange.startDate!, to: dateRange.endDate! } : undefined
      );

      return serviceSuccess(overview);
    } catch (error) {
      this.handleError(error, 'AnalyticsService.getSystemOverview');
    }
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagementMetrics(
    dateRange?: DateRangeFilter
  ): Promise<ServiceResult<UserEngagementMetrics>> {
    try {
      const overview = await analyticsRepository.getOverviewAnalytics(
        dateRange ? { from: dateRange.startDate!, to: dateRange.endDate! } : undefined
      );

      const engagementMetrics = await analyticsRepository.getEngagementMetrics(
        dateRange ? { from: dateRange.startDate!, to: dateRange.endDate! } : undefined
      );

      const metrics: UserEngagementMetrics = {
        totalUsers: overview.totalUsers,
        activeUsers: overview.activeUsers,
        newUsersThisMonth: overview.userEngagementTrends.monthlyActiveUsers,
        returningUsers: Math.max(0, overview.activeUsers - overview.userEngagementTrends.monthlyActiveUsers),
        averageSessionsPerUser: overview.activeUsers > 0 ? overview.totalAttempts / overview.activeUsers : 0,
        averageTimePerSession: engagementMetrics.averageSessionLength,
        retentionRate: engagementMetrics.retentionRate,
        churnRate: 100 - engagementMetrics.retentionRate
      };

      return serviceSuccess(metrics);
    } catch (error) {
      this.handleError(error, 'AnalyticsService.getUserEngagementMetrics');
    }
  }

  /**
   * Get content performance analytics
   */
  async getContentPerformance(
    dateRange?: DateRangeFilter
  ): Promise<ServiceResult<ContentPerformance>> {
    try {
      // Get quiz performance data
      const quizzes = await quizRepository.findMany({ isPublished: true }, 100, 0);
      const quizPerformancePromises = quizzes.map(async (quiz) => {
        const analytics = await analyticsRepository.getQuizAnalytics(
          quiz.id,
          dateRange ? { from: dateRange.startDate!, to: dateRange.endDate! } : undefined
        );
        return { quiz, analytics };
      });

      const quizPerformanceResults = await Promise.all(quizPerformancePromises);
      const validQuizResults = quizPerformanceResults.filter(result => result.analytics !== null);

      // Sort and get top performers
      const mostPopularQuizzes = validQuizResults
        .sort((a, b) => b.analytics!.totalAttempts - a.analytics!.totalAttempts)
        .slice(0, 5)
        .map(result => ({
          id: result.quiz.id,
          title: result.quiz.title,
          attempts: result.analytics!.totalAttempts
        }));

      const highestScoringQuizzes = validQuizResults
        .sort((a, b) => b.analytics!.averageScore - a.analytics!.averageScore)
        .slice(0, 5)
        .map(result => ({
          id: result.quiz.id,
          title: result.quiz.title,
          averageScore: result.analytics!.averageScore
        }));

      const mostChallengingQuizzes = validQuizResults
        .sort((a, b) => a.analytics!.completionRate - b.analytics!.completionRate)
        .slice(0, 5)
        .map(result => ({
          id: result.quiz.id,
          title: result.quiz.title,
          completionRate: result.analytics!.completionRate
        }));

      // Get learning module performance (simplified for now)
      const modules = await learningRepository.findModules({ isPublished: true }, 100, 0);
      const modulePerformancePromises = modules.map(async (module) => {
        const analytics = await analyticsRepository.getLearningAnalytics(module.id);
        return { module, analytics };
      });

      const modulePerformanceResults = await Promise.all(modulePerformancePromises);
      const validModuleResults = modulePerformanceResults.filter(result => result.analytics !== null);

      const mostAccessedModules = validModuleResults
        .sort((a, b) => b.analytics!.totalUsers - a.analytics!.totalUsers)
        .slice(0, 5)
        .map(result => ({
          id: result.module.id,
          title: result.module.title,
          accessCount: result.analytics!.totalUsers
        }));

      const highestCompletionModules = validModuleResults
        .sort((a, b) => b.analytics!.completionRate - a.analytics!.completionRate)
        .slice(0, 5)
        .map(result => ({
          id: result.module.id,
          title: result.module.title,
          completionRate: result.analytics!.completionRate
        }));

      const mostEngagingModules = highestCompletionModules.map(module => ({
        id: module.id,
        title: module.title,
        engagementScore: module.completionRate // Using completion rate as engagement score
      }));

      const performance: ContentPerformance = {
        quizzes: {
          mostPopular: mostPopularQuizzes,
          highestScoring: highestScoringQuizzes,
          mostChallenging: mostChallengingQuizzes
        },
        learningModules: {
          mostAccessed: mostAccessedModules,
          highestCompletion: highestCompletionModules,
          mostEngaging: mostEngagingModules
        }
      };

      return serviceSuccess(performance);
    } catch (error) {
      this.handleError(error, 'AnalyticsService.getContentPerformance');
    }
  }

  // ===== USER ANALYTICS =====

  /**
   * Get user progress analytics
   */
  async getUserProgressAnalytics(userId: string): Promise<ServiceResult<any>> {
    try {
      const analytics = await analyticsRepository.getUserProgressAnalytics(userId);
      if (!analytics) {
        return serviceError('User not found', 'USER_NOT_FOUND');
      }

      return serviceSuccess(analytics);
    } catch (error) {
      this.handleError(error, 'AnalyticsService.getUserProgressAnalytics');
    }
  }

  // ===== LEARNING ANALYTICS =====

  /**
   * Get learning module analytics
   */
  async getLearningModuleAnalytics(moduleId: string): Promise<ServiceResult<any>> {
    try {
      const moduleExists = await learningRepository.moduleExists(moduleId);
      if (!moduleExists) {
        return serviceError('Learning module not found', AwarenessLabErrorCode.MODULE_NOT_FOUND);
      }

      const analytics = await analyticsRepository.getLearningAnalytics(moduleId);
      if (!analytics) {
        return serviceError('Analytics data unavailable', AwarenessLabErrorCode.ANALYTICS_DATA_UNAVAILABLE);
      }

      return serviceSuccess(analytics);
    } catch (error) {
      this.handleError(error, 'AnalyticsService.getLearningModuleAnalytics');
    }
  }

  // ===== COMPARATIVE ANALYTICS =====

  /**
   * Compare multiple quizzes performance
   */
  async compareQuizzes(
    quizIds: string[],
    dateRange?: DateRangeFilter
  ): Promise<ServiceResult<any[]>> {
    try {
      if (quizIds.length === 0) {
        return serviceError('No quiz IDs provided', AwarenessLabErrorCode.INVALID_ANALYTICS_FILTER);
      }

      if (quizIds.length > 10) {
        return serviceError('Cannot compare more than 10 quizzes at once', AwarenessLabErrorCode.INVALID_ANALYTICS_FILTER);
      }

      const analyticsPromises = quizIds.map(quizId => 
        analyticsRepository.getQuizAnalytics(
          quizId,
          dateRange ? { from: dateRange.startDate!, to: dateRange.endDate! } : undefined
        )
      );

      const analyticsResults = await Promise.all(analyticsPromises);
      const validResults = analyticsResults.filter(result => result !== null);

      return serviceSuccess(validResults);
    } catch (error) {
      this.handleError(error, 'AnalyticsService.compareQuizzes');
    }
  }

  /**
   * Get trending content (quizzes and modules with increasing engagement)
   */
  async getTrendingContent(
    days: number = 7
  ): Promise<ServiceResult<{
    trendingQuizzes: Array<{ id: string; title: string; trendScore: number }>;
    trendingModules: Array<{ id: string; title: string; trendScore: number }>;
  }>> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
      const previousStartDate = new Date(startDate.getTime() - (days * 24 * 60 * 60 * 1000));

      // Get current period data
      const currentPeriod = { from: startDate, to: endDate };
      const previousPeriod = { from: previousStartDate, to: startDate };

      // Get quiz data for both periods
      const quizzes = await quizRepository.findMany({ isPublished: true }, 50, 0);
      
      const trendingQuizzes = [];
      for (const quiz of quizzes) {
        const currentAnalytics = await analyticsRepository.getQuizAnalytics(quiz.id, currentPeriod);
        const previousAnalytics = await analyticsRepository.getQuizAnalytics(quiz.id, previousPeriod);

        if (currentAnalytics && previousAnalytics) {
          const trendScore = this.calculateTrendScore(
            currentAnalytics.totalAttempts,
            previousAnalytics.totalAttempts,
            currentAnalytics.uniqueUsers,
            previousAnalytics.uniqueUsers
          );

          if (trendScore > 0) {
            trendingQuizzes.push({
              id: quiz.id,
              title: quiz.title,
              trendScore
            });
          }
        }
      }

      // Sort by trend score and take top 10
      trendingQuizzes.sort((a, b) => b.trendScore - a.trendScore);
      const topTrendingQuizzes = trendingQuizzes.slice(0, 10);

      // For modules, we'll use a simplified approach since we don't have detailed time-based analytics
      const modules = await learningRepository.findModules({ isPublished: true }, 20, 0);
      const trendingModules = modules.map(module => ({
        id: module.id,
        title: module.title,
        trendScore: Math.random() * 100 // Placeholder - would need proper time-based tracking
      })).slice(0, 5);

      return serviceSuccess({
        trendingQuizzes: topTrendingQuizzes,
        trendingModules
      });
    } catch (error) {
      this.handleError(error, 'AnalyticsService.getTrendingContent');
    }
  }

  // ===== DETAILED ATTEMPTS ANALYTICS =====

  /**
   * Get detailed quiz attempts with filtering
   */
  async getDetailedQuizAttempts(
    filters: {
      quizId: string;
      completedOnly?: boolean;
      minScore?: number;
      maxScore?: number;
      userId?: string;
      dateRange?: DateRangeFilter;
    },
    limit: number,
    offset: number
  ): Promise<ServiceResult<any[]>> {
    try {
      // Validate quiz exists
      const quizExists = await quizRepository.exists(filters.quizId);
      if (!quizExists) {
        return serviceError('Quiz not found', AwarenessLabErrorCode.QUIZ_NOT_FOUND);
      }

      const attempts = await analyticsRepository.getDetailedQuizAttempts(
        filters.quizId,
        {
          completedOnly: filters.completedOnly,
          minScore: filters.minScore,
          maxScore: filters.maxScore,
          userId: filters.userId,
          dateRange: filters.dateRange ? {
            from: filters.dateRange.startDate!,
            to: filters.dateRange.endDate!
          } : undefined
        },
        limit,
        offset
      );

      return serviceSuccess(attempts);
    } catch (error) {
      this.handleError(error, 'AnalyticsService.getDetailedQuizAttempts');
    }
  }

  /**
   * Get count of quiz attempts matching filters
   */
  async getQuizAttemptsCount(
    filters: {
      quizId: string;
      completedOnly?: boolean;
      minScore?: number;
      maxScore?: number;
      userId?: string;
      dateRange?: DateRangeFilter;
    }
  ): Promise<ServiceResult<number>> {
    try {
      const count = await analyticsRepository.getQuizAttemptsCount(
        filters.quizId,
        {
          completedOnly: filters.completedOnly,
          minScore: filters.minScore,
          maxScore: filters.maxScore,
          userId: filters.userId,
          dateRange: filters.dateRange ? {
            from: filters.dateRange.startDate!,
            to: filters.dateRange.endDate!
          } : undefined
        }
      );

      return serviceSuccess(count);
    } catch (error) {
      this.handleError(error, 'AnalyticsService.getQuizAttemptsCount');
    }
  }

  /**
   * Get user demographics analytics
   */
  async getUserDemographicsAnalytics(
    dateRange?: DateRangeFilter
  ): Promise<ServiceResult<any>> {
    try {
      const demographics = await analyticsRepository.getUserDemographicsAnalytics(
        dateRange ? { from: dateRange.startDate!, to: dateRange.endDate! } : undefined
      );

      return serviceSuccess(demographics);
    } catch (error) {
      this.handleError(error, 'AnalyticsService.getUserDemographicsAnalytics');
    }
  }

  // ===== EXPORT AND REPORTING =====

  /**
   * Generate analytics report for export
   */
  async generateAnalyticsReport(
    filters: AnalyticsFilterData,
    format: 'json' | 'csv' = 'json'
  ): Promise<ServiceResult<any>> {
    try {
      // Validate filters
      const validatedFilters = analyticsFilterSchema.parse(filters);

      const dateRange = validatedFilters.startDate && validatedFilters.endDate ? {
        startDate: new Date(validatedFilters.startDate),
        endDate: new Date(validatedFilters.endDate)
      } : undefined;

      // Collect all analytics data
      const reportData: any = {
        generatedAt: new Date().toISOString(),
        filters: validatedFilters,
        systemOverview: null,
        quizAnalytics: [],
        learningAnalytics: [],
        userEngagement: null
      };

      // Get system overview
      const overviewResult = await this.getSystemOverview(dateRange);
      if (overviewResult.success) {
        reportData.systemOverview = overviewResult.data;
      }

      // Get user engagement metrics
      const engagementResult = await this.getUserEngagementMetrics(dateRange);
      if (engagementResult.success) {
        reportData.userEngagement = engagementResult.data;
      }

      // Get quiz analytics if specific quiz requested
      if (validatedFilters.quizId) {
        const quizAnalyticsResult = await this.getQuizAnalytics(validatedFilters.quizId, dateRange);
        if (quizAnalyticsResult.success) {
          reportData.quizAnalytics.push(quizAnalyticsResult.data);
        }
      } else {
        // Get analytics for all published quizzes (limited to prevent performance issues)
        const quizzes = await quizRepository.findMany({ isPublished: true }, 20, 0);
        for (const quiz of quizzes) {
          const analytics = await analyticsRepository.getQuizAnalytics(
            quiz.id,
            dateRange ? { from: dateRange.startDate!, to: dateRange.endDate! } : undefined
          );
          if (analytics) {
            reportData.quizAnalytics.push(analytics);
          }
        }
      }

      // Get learning module analytics
      const modules = await learningRepository.findModules({ isPublished: true }, 10, 0);
      for (const module of modules) {
        const analytics = await analyticsRepository.getLearningAnalytics(module.id);
        if (analytics) {
          reportData.learningAnalytics.push(analytics);
        }
      }

      // Format based on requested format
      if (format === 'csv') {
        const csvData = this.convertToCSV(reportData);
        return serviceSuccess({ format: 'csv', data: csvData });
      }

      return serviceSuccess({ format: 'json', data: reportData });
    } catch (error) {
      this.handleError(error, 'AnalyticsService.generateAnalyticsReport');
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Calculate difficulty rating based on completion rate and average score
   */
  private calculateDifficultyRating(
    completionRate: number,
    averageScore: number
  ): 'Easy' | 'Medium' | 'Hard' {
    // Combine completion rate and average score to determine difficulty
    const difficultyScore = (completionRate + averageScore) / 2;

    if (difficultyScore >= 75) return 'Easy';
    if (difficultyScore >= 50) return 'Medium';
    return 'Hard';
  }

  /**
   * Calculate engagement score based on various metrics
   */
  private calculateEngagementScore(
    completionRate: number,
    averageAttemptsPerUser: number,
    uniqueUsers: number,
    totalAttempts: number
  ): number {
    // Normalize metrics and calculate weighted score
    const completionWeight = 0.4;
    const retryWeight = 0.3;
    const popularityWeight = 0.3;

    const completionScore = Math.min(100, completionRate);
    const retryScore = Math.min(100, (averageAttemptsPerUser - 1) * 25); // Bonus for retries
    const popularityScore = Math.min(100, Math.log10(totalAttempts + 1) * 20); // Log scale for popularity

    return Math.round(
      (completionScore * completionWeight) +
      (retryScore * retryWeight) +
      (popularityScore * popularityWeight)
    );
  }

  /**
   * Calculate trend score for content
   */
  private calculateTrendScore(
    currentAttempts: number,
    previousAttempts: number,
    currentUsers: number,
    previousUsers: number
  ): number {
    if (previousAttempts === 0 && previousUsers === 0) {
      return currentAttempts + currentUsers; // New content gets base score
    }

    const attemptGrowth = previousAttempts > 0 ? 
      ((currentAttempts - previousAttempts) / previousAttempts) * 100 : 0;
    
    const userGrowth = previousUsers > 0 ? 
      ((currentUsers - previousUsers) / previousUsers) * 100 : 0;

    return (attemptGrowth + userGrowth) / 2;
  }

  /**
   * Convert analytics data to CSV format
   */
  private convertToCSV(data: any): string {
    // Simplified CSV conversion - in a real implementation, you'd want a proper CSV library
    const lines = [];
    
    // Add header
    lines.push('Type,ID,Title,Metric,Value');
    
    // Add quiz data
    if (data.quizAnalytics) {
      for (const quiz of data.quizAnalytics) {
        lines.push(`Quiz,${quiz.quizId},${quiz.quizTitle},Total Attempts,${quiz.totalAttempts}`);
        lines.push(`Quiz,${quiz.quizId},${quiz.quizTitle},Completion Rate,${quiz.completionRate}%`);
        lines.push(`Quiz,${quiz.quizId},${quiz.quizTitle},Average Score,${quiz.averageScore}`);
      }
    }
    
    // Add learning module data
    if (data.learningAnalytics) {
      for (const module of data.learningAnalytics) {
        lines.push(`Module,${module.moduleId},${module.moduleTitle},Total Users,${module.totalUsers}`);
        lines.push(`Module,${module.moduleId},${module.moduleTitle},Completion Rate,${module.completionRate}%`);
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Validate date range for analytics queries
   */
  private validateDateRange(startDate?: Date, endDate?: Date): ServiceResult<boolean> {
    if (!startDate || !endDate) {
      return serviceSuccess(true); // Optional dates are valid
    }

    if (startDate > endDate) {
      return serviceError('Start date must be before end date', AwarenessLabErrorCode.INVALID_ANALYTICS_FILTER);
    }

    const maxRangeDays = 365; // 1 year maximum
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > maxRangeDays) {
      return serviceError(
        `Date range cannot exceed ${maxRangeDays} days`,
        AwarenessLabErrorCode.INVALID_ANALYTICS_FILTER
      );
    }

    return serviceSuccess(true);
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();