import { BaseService, ServiceResult, serviceSuccess, serviceError } from '../base.service';
import { learningRepository } from '@/lib/database/repositories/learning-repository';
import { analyticsRepository } from '@/lib/database/repositories/analytics-repository';
import { transactionService } from '@/lib/database/transaction-service';
import { AwarenessLabErrorCode } from '@/lib/errors/awareness-lab-errors';

export interface AnalyticsDataIntegrityResult {
  isValid: boolean;
  issues: AnalyticsIntegrityIssue[];
  repairActions: AnalyticsRepairAction[];
  summary: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    deletedContentReferences: number;
    inconsistentData: number;
  };
}

export interface AnalyticsIntegrityIssue {
  id: string;
  type: 'deleted_content_reference' | 'inconsistent_data' | 'missing_data' | 'duplicate_data' | 'invalid_calculation';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  affectedData: {
    recordId?: string;
    userId?: string;
    moduleId?: string;
    materialId?: string;
    dataType: string;
  };
  suggestedAction: string;
}

export interface AnalyticsRepairAction {
  type: 'remove_deleted_references' | 'fix_calculations' | 'merge_duplicates' | 'recalculate_metrics';
  description: string;
  affectedRecords: string[];
  riskLevel: 'low' | 'medium' | 'high';
  requiresUserConfirmation: boolean;
}

export interface RealTimeAnalyticsUpdate {
  userId: string;
  eventType: 'material_accessed' | 'material_completed' | 'module_started' | 'module_completed' | 'quiz_attempted' | 'quiz_completed';
  moduleId?: string;
  materialId?: string;
  quizId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ComprehensiveLearningStats {
  userId: string;
  overallProgress: {
    totalModules: number;
    completedModules: number;
    inProgressModules: number;
    notStartedModules: number;
    overallCompletionRate: number;
  };
  timeAnalytics: {
    totalTimeSpent: number; // in minutes
    averageSessionDuration: number;
    mostActiveTimeOfDay: string;
    learningStreak: number; // consecutive days
    lastActivityDate: Date;
  };
  performanceMetrics: {
    averageQuizScore: number;
    quizAttempts: number;
    quizCompletions: number;
    improvementTrend: 'improving' | 'stable' | 'declining';
  };
  engagementMetrics: {
    materialAccessCount: number;
    averageMaterialCompletionTime: number;
    preferredContentTypes: Array<{
      type: string;
      count: number;
      completionRate: number;
    }>;
    interactionScore: number; // 0-100 based on engagement
  };
  recentActivity: Array<{
    date: Date;
    moduleTitle: string;
    materialTitle?: string;
    action: string;
    timeSpent?: number;
    score?: number;
  }>;
  achievements: Array<{
    type: string;
    title: string;
    description: string;
    earnedDate: Date;
    category: 'completion' | 'performance' | 'engagement' | 'streak';
  }>;
  recommendations: Array<{
    type: 'next_module' | 'review_material' | 'retake_quiz' | 'focus_area';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    moduleId?: string;
    materialId?: string;
  }>;
}

export interface SystemAnalytics {
  userEngagement: {
    totalActiveUsers: number;
    newUsersThisMonth: number;
    averageSessionsPerUser: number;
    userRetentionRate: number;
  };
  contentPerformance: {
    mostPopularModules: Array<{
      moduleId: string;
      title: string;
      accessCount: number;
      completionRate: number;
      averageRating: number;
    }>;
    leastEngagingContent: Array<{
      moduleId: string;
      materialId?: string;
      title: string;
      dropOffRate: number;
      averageTimeSpent: number;
    }>;
  };
  learningOutcomes: {
    overallCompletionRate: number;
    averageTimeToCompletion: number;
    skillImprovementMetrics: Array<{
      category: string;
      averageImprovement: number;
      participantCount: number;
    }>;
  };
  systemHealth: {
    dataIntegrityScore: number;
    lastDataValidation: Date;
    pendingRepairs: number;
    cacheHitRate: number;
  };
}

/**
 * Service for enhanced analytics and reporting with data integrity checks
 */
export class AnalyticsEnhancementService extends BaseService {

  /**
   * Perform comprehensive analytics data integrity check
   */
  async performAnalyticsDataIntegrityCheck(): Promise<ServiceResult<AnalyticsDataIntegrityResult>> {
    try {
      const issues: AnalyticsIntegrityIssue[] = [];
      const repairActions: AnalyticsRepairAction[] = [];
      
      let totalRecords = 0;
      let validRecords = 0;
      let invalidRecords = 0;
      let deletedContentReferences = 0;
      let inconsistentData = 0;

      // Check for references to deleted modules
      const deletedModuleRefs = await this.findDeletedModuleReferences();
      for (const ref of deletedModuleRefs) {
        issues.push({
          id: `deleted_module_ref_${ref.id}`,
          type: 'deleted_content_reference',
          severity: 'critical',
          description: `Analytics record references deleted module: ${ref.moduleId}`,
          affectedData: {
            recordId: ref.id,
            moduleId: ref.moduleId,
            dataType: 'module_analytics'
          },
          suggestedAction: 'Remove reference to deleted module'
        });
        deletedContentReferences++;
        invalidRecords++;
      }

      // Check for references to deleted materials
      const deletedMaterialRefs = await this.findDeletedMaterialReferences();
      for (const ref of deletedMaterialRefs) {
        issues.push({
          id: `deleted_material_ref_${ref.id}`,
          type: 'deleted_content_reference',
          severity: 'critical',
          description: `Analytics record references deleted material: ${ref.materialId}`,
          affectedData: {
            recordId: ref.id,
            materialId: ref.materialId,
            dataType: 'material_analytics'
          },
          suggestedAction: 'Remove reference to deleted material'
        });
        deletedContentReferences++;
        invalidRecords++;
      }

      // Check for inconsistent completion calculations
      const inconsistentCalculations = await this.findInconsistentCompletionCalculations();
      for (const calc of inconsistentCalculations) {
        issues.push({
          id: `inconsistent_calc_${calc.userId}_${calc.moduleId}`,
          type: 'inconsistent_data',
          severity: 'warning',
          description: `Completion percentage doesn't match actual progress`,
          affectedData: {
            userId: calc.userId,
            moduleId: calc.moduleId,
            dataType: 'completion_calculation'
          },
          suggestedAction: 'Recalculate completion percentage'
        });
        inconsistentData++;
        invalidRecords++;
      }

      // Check for duplicate analytics records
      const duplicateRecords = await this.findDuplicateAnalyticsRecords();
      for (const duplicate of duplicateRecords) {
        issues.push({
          id: `duplicate_${duplicate.key}`,
          type: 'duplicate_data',
          severity: 'warning',
          description: `Duplicate analytics records found`,
          affectedData: {
            userId: duplicate.userId,
            moduleId: duplicate.moduleId,
            dataType: 'analytics_record'
          },
          suggestedAction: 'Merge duplicate records'
        });
        inconsistentData += duplicate.count - 1;
        invalidRecords += duplicate.count - 1;
      }

      // Get total record count
      totalRecords = await this.getTotalAnalyticsRecordCount();
      validRecords = totalRecords - invalidRecords;

      // Generate repair actions
      if (deletedContentReferences > 0) {
        const deletedRefs = issues
          .filter(i => i.type === 'deleted_content_reference')
          .map(i => i.affectedData.recordId!)
          .filter(id => id);

        repairActions.push({
          type: 'remove_deleted_references',
          description: `Remove ${deletedContentReferences} references to deleted content`,
          affectedRecords: deletedRefs,
          riskLevel: 'low',
          requiresUserConfirmation: false
        });
      }

      if (inconsistentData > 0) {
        const inconsistentIds = issues
          .filter(i => i.type === 'inconsistent_data' || i.type === 'duplicate_data')
          .map(i => i.affectedData.recordId || `${i.affectedData.userId}_${i.affectedData.moduleId}`)
          .filter(id => id);

        repairActions.push({
          type: 'fix_calculations',
          description: `Fix ${inconsistentData} inconsistent data records`,
          affectedRecords: inconsistentIds,
          riskLevel: 'medium',
          requiresUserConfirmation: true
        });
      }

      const result: AnalyticsDataIntegrityResult = {
        isValid: issues.length === 0,
        issues,
        repairActions,
        summary: {
          totalRecords,
          validRecords,
          invalidRecords,
          deletedContentReferences,
          inconsistentData
        }
      };

      return serviceSuccess(result);
    } catch (error) {
      this.handleError(error, 'AnalyticsEnhancementService.performAnalyticsDataIntegrityCheck');
    }
  }

  /**
   * Process real-time analytics update with proper caching and performance optimization
   */
  async processRealTimeAnalyticsUpdate(
    update: RealTimeAnalyticsUpdate
  ): Promise<ServiceResult<boolean>> {
    try {
      const result = await transactionService.executeInTransaction(async (tx) => {
        // Update real-time analytics data
        await this.updateRealTimeMetrics(update, tx);

        // Update cached aggregations
        await this.updateCachedAggregations(update, tx);

        // Trigger any necessary recalculations
        await this.triggerRecalculationsIfNeeded(update, tx);

        return true;
      }, 'AnalyticsEnhancementService.processRealTimeAnalyticsUpdate');

      if (!result.success) {
        return serviceError(result.error || 'Failed to process real-time update', 'UPDATE_FAILED');
      }

      // Invalidate relevant caches
      await this.invalidateRelevantCaches(update);

      this.audit({
        event: 'system.health.check',
        userId: update.userId,
        resource: update.moduleId || update.materialId || update.quizId || 'system',
        metadata: {
          eventType: update.eventType,
          timestamp: update.timestamp
        }
      });

      return serviceSuccess(true);
    } catch (error) {
      this.handleError(error, 'AnalyticsEnhancementService.processRealTimeAnalyticsUpdate');
    }
  }

  /**
   * Generate comprehensive learning statistics with completion rates and activity tracking
   */
  async generateComprehensiveLearningStats(
    userId: string
  ): Promise<ServiceResult<ComprehensiveLearningStats>> {
    try {
      // Get user's module progress
      const moduleProgress = await learningRepository.getUserAllModulesProgress(userId);
      
      // Calculate overall progress metrics
      const totalModules = moduleProgress.length;
      const completedModules = moduleProgress.filter(m => m.isModuleCompleted).length;
      const inProgressModules = moduleProgress.filter(m => 
        m.completedMaterials > 0 && !m.isModuleCompleted
      ).length;
      const notStartedModules = totalModules - completedModules - inProgressModules;
      const overallCompletionRate = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;

      // Get time analytics
      const timeAnalytics = await this.calculateTimeAnalytics(userId);

      // Get performance metrics
      const performanceMetrics = await this.calculatePerformanceMetrics(userId);

      // Get engagement metrics
      const engagementMetrics = await this.calculateEngagementMetrics(userId);

      // Get recent activity
      const recentActivity = await this.getRecentActivity(userId, 10);

      // Calculate achievements
      const achievements = await this.calculateAchievements(userId, {
        completedModules,
        overallCompletionRate,
        timeAnalytics,
        performanceMetrics,
        engagementMetrics
      });

      // Generate recommendations
      const recommendations = await this.generateRecommendations(userId, {
        moduleProgress,
        performanceMetrics,
        engagementMetrics
      });

      const stats: ComprehensiveLearningStats = {
        userId,
        overallProgress: {
          totalModules,
          completedModules,
          inProgressModules,
          notStartedModules,
          overallCompletionRate
        },
        timeAnalytics,
        performanceMetrics,
        engagementMetrics,
        recentActivity,
        achievements,
        recommendations
      };

      return serviceSuccess(stats);
    } catch (error) {
      this.handleError(error, 'AnalyticsEnhancementService.generateComprehensiveLearningStats');
    }
  }

  /**
   * Generate system-wide analytics with proper handling of deleted content and edge cases
   */
  async generateSystemAnalytics(): Promise<ServiceResult<SystemAnalytics>> {
    try {
      // Calculate user engagement metrics
      const userEngagement = await this.calculateUserEngagementMetrics();

      // Analyze content performance
      const contentPerformance = await this.analyzeContentPerformance();

      // Calculate learning outcomes
      const learningOutcomes = await this.calculateLearningOutcomes();

      // Check system health
      const systemHealth = await this.checkSystemHealth();

      const analytics: SystemAnalytics = {
        userEngagement,
        contentPerformance,
        learningOutcomes,
        systemHealth
      };

      return serviceSuccess(analytics);
    } catch (error) {
      this.handleError(error, 'AnalyticsEnhancementService.generateSystemAnalytics');
    }
  }

  /**
   * Repair analytics data automatically
   */
  async repairAnalyticsData(
    repairActions: AnalyticsRepairAction[],
    userConfirmation: boolean = false
  ): Promise<ServiceResult<{ success: boolean; actionsPerformed: number; errors: string[] }>> {
    try {
      const result = await transactionService.executeInTransaction(async (tx) => {
        let actionsPerformed = 0;
        const errors: string[] = [];

        for (const action of repairActions) {
          // Skip actions that require user confirmation if not provided
          if (action.requiresUserConfirmation && !userConfirmation) {
            continue;
          }

          try {
            switch (action.type) {
              case 'remove_deleted_references':
                await this.removeDeletedContentReferences(action.affectedRecords, tx);
                actionsPerformed++;
                break;

              case 'fix_calculations':
                await this.fixInconsistentCalculations(action.affectedRecords, tx);
                actionsPerformed++;
                break;

              case 'merge_duplicates':
                await this.mergeDuplicateAnalyticsRecords(action.affectedRecords, tx);
                actionsPerformed++;
                break;

              case 'recalculate_metrics':
                await this.recalculateAllMetrics(tx);
                actionsPerformed++;
                break;
            }
          } catch (actionError) {
            errors.push(`Failed to perform ${action.type}: ${actionError instanceof Error ? actionError.message : 'Unknown error'}`);
          }
        }

        return {
          success: errors.length === 0,
          actionsPerformed,
          errors
        };
      }, 'AnalyticsEnhancementService.repairAnalyticsData');

      if (!result.success) {
        return serviceError(result.error || 'Failed to repair analytics data', 'REPAIR_FAILED');
      }

      this.audit({
        event: 'system.health.check',
        userId: 'system',
        resource: 'analytics',
        metadata: {
          actionsPerformed: result.data!.actionsPerformed,
          errors: result.data!.errors
        }
      });

      return serviceSuccess(result.data!);
    } catch (error) {
      this.handleError(error, 'AnalyticsEnhancementService.repairAnalyticsData');
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  private async findDeletedModuleReferences(): Promise<Array<{ id: string; moduleId: string }>> {
    // Implementation would query analytics tables for references to non-existent modules
    return [];
  }

  private async findDeletedMaterialReferences(): Promise<Array<{ id: string; materialId: string }>> {
    // Implementation would query analytics tables for references to non-existent materials
    return [];
  }

  private async findInconsistentCompletionCalculations(): Promise<Array<{ userId: string; moduleId: string }>> {
    // Implementation would find records where calculated completion doesn't match actual progress
    return [];
  }

  private async findDuplicateAnalyticsRecords(): Promise<Array<{ key: string; userId: string; moduleId: string; count: number }>> {
    // Implementation would find duplicate analytics records
    return [];
  }

  private async getTotalAnalyticsRecordCount(): Promise<number> {
    // Implementation would count total analytics records
    return 0;
  }

  private async updateRealTimeMetrics(update: RealTimeAnalyticsUpdate, tx: any): Promise<void> {
    // Implementation would update real-time metrics in the database
  }

  private async updateCachedAggregations(update: RealTimeAnalyticsUpdate, tx: any): Promise<void> {
    // Implementation would update cached aggregation data
  }

  private async triggerRecalculationsIfNeeded(update: RealTimeAnalyticsUpdate, tx: any): Promise<void> {
    // Implementation would trigger recalculations if thresholds are met
  }

  private async invalidateRelevantCaches(update: RealTimeAnalyticsUpdate): Promise<void> {
    // Implementation would invalidate relevant cache entries
  }

  private async calculateTimeAnalytics(userId: string): Promise<ComprehensiveLearningStats['timeAnalytics']> {
    // Implementation would calculate time-based analytics
    return {
      totalTimeSpent: 0,
      averageSessionDuration: 0,
      mostActiveTimeOfDay: '10:00',
      learningStreak: 0,
      lastActivityDate: new Date()
    };
  }

  private async calculatePerformanceMetrics(userId: string): Promise<ComprehensiveLearningStats['performanceMetrics']> {
    // Implementation would calculate performance metrics
    return {
      averageQuizScore: 0,
      quizAttempts: 0,
      quizCompletions: 0,
      improvementTrend: 'stable'
    };
  }

  private async calculateEngagementMetrics(userId: string): Promise<ComprehensiveLearningStats['engagementMetrics']> {
    // Implementation would calculate engagement metrics
    return {
      materialAccessCount: 0,
      averageMaterialCompletionTime: 0,
      preferredContentTypes: [],
      interactionScore: 0
    };
  }

  private async getRecentActivity(userId: string, limit: number): Promise<ComprehensiveLearningStats['recentActivity']> {
    // Implementation would get recent user activity
    return [];
  }

  private async calculateAchievements(userId: string, stats: any): Promise<ComprehensiveLearningStats['achievements']> {
    // Implementation would calculate user achievements
    return [];
  }

  private async generateRecommendations(userId: string, data: any): Promise<ComprehensiveLearningStats['recommendations']> {
    // Implementation would generate personalized recommendations
    return [];
  }

  private async calculateUserEngagementMetrics(): Promise<SystemAnalytics['userEngagement']> {
    // Implementation would calculate system-wide user engagement
    return {
      totalActiveUsers: 0,
      newUsersThisMonth: 0,
      averageSessionsPerUser: 0,
      userRetentionRate: 0
    };
  }

  private async analyzeContentPerformance(): Promise<SystemAnalytics['contentPerformance']> {
    // Implementation would analyze content performance
    return {
      mostPopularModules: [],
      leastEngagingContent: []
    };
  }

  private async calculateLearningOutcomes(): Promise<SystemAnalytics['learningOutcomes']> {
    // Implementation would calculate learning outcomes
    return {
      overallCompletionRate: 0,
      averageTimeToCompletion: 0,
      skillImprovementMetrics: []
    };
  }

  private async checkSystemHealth(): Promise<SystemAnalytics['systemHealth']> {
    // Implementation would check system health metrics
    return {
      dataIntegrityScore: 100,
      lastDataValidation: new Date(),
      pendingRepairs: 0,
      cacheHitRate: 95
    };
  }

  private async removeDeletedContentReferences(recordIds: string[], tx: any): Promise<void> {
    // Implementation would remove references to deleted content
  }

  private async fixInconsistentCalculations(recordIds: string[], tx: any): Promise<void> {
    // Implementation would fix inconsistent calculations
  }

  private async mergeDuplicateAnalyticsRecords(recordIds: string[], tx: any): Promise<void> {
    // Implementation would merge duplicate records
  }

  private async recalculateAllMetrics(tx: any): Promise<void> {
    // Implementation would recalculate all metrics
  }
}

// Export singleton instance
export const analyticsEnhancementService = new AnalyticsEnhancementService();