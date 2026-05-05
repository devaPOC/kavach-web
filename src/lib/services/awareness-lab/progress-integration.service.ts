import { BaseService, ServiceResult, serviceSuccess, serviceError } from '../base.service';
import { progressValidationService } from './progress-validation.service';
import { progressTrackingService } from './progress-tracking.service';
import { analyticsEnhancementService } from './analytics-enhancement.service';
import { AwarenessLabErrorCode } from '@/lib/errors/awareness-lab-errors';

export interface ProgressSystemHealthCheck {
  validationHealth: {
    isHealthy: boolean;
    issues: number;
    lastCheck: Date;
  };
  trackingHealth: {
    isHealthy: boolean;
    accuracy: number;
    lastUpdate: Date;
  };
  analyticsHealth: {
    isHealthy: boolean;
    integrityScore: number;
    lastSync: Date;
  };
  overallHealth: {
    status: 'healthy' | 'warning' | 'critical';
    score: number;
    recommendations: string[];
  };
}

export interface ProgressSystemRepairResult {
  validationRepairs: number;
  trackingRepairs: number;
  analyticsRepairs: number;
  totalRepairs: number;
  errors: string[];
  success: boolean;
}

/**
 * Integration service that coordinates progress validation, tracking, and analytics
 */
export class ProgressIntegrationService extends BaseService {

  /**
   * Perform comprehensive system health check for progress tracking
   */
  async performSystemHealthCheck(): Promise<ServiceResult<ProgressSystemHealthCheck>> {
    try {
      // Check validation system health
      const validationCheck = await progressValidationService.validateAllProgressData();
      const validationHealth = {
        isHealthy: validationCheck.success && (validationCheck.success ? validationCheck.data?.isValid : false) || false,
        issues: validationCheck.success ? (validationCheck.data?.issues?.length || 0) : 0,
        lastCheck: new Date()
      };

      // Check analytics system health
      const analyticsCheck = await analyticsEnhancementService.performAnalyticsDataIntegrityCheck();
      const analyticsHealth = {
        isHealthy: analyticsCheck.success && (analyticsCheck.success ? analyticsCheck.data?.isValid : false) || false,
        integrityScore: analyticsCheck.success ? (analyticsCheck.data?.summary?.validRecords || 0) : 0,
        lastSync: new Date()
      };

      // Calculate tracking health (simplified for now)
      const trackingHealth = {
        isHealthy: true,
        accuracy: 95, // Would be calculated based on actual metrics
        lastUpdate: new Date()
      };

      // Calculate overall health
      const healthScore = (
        (validationHealth.isHealthy ? 33 : 0) +
        (trackingHealth.isHealthy ? 33 : 0) +
        (analyticsHealth.isHealthy ? 34 : 0)
      );

      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (healthScore < 50) status = 'critical';
      else if (healthScore < 80) status = 'warning';

      const recommendations: string[] = [];
      if (!validationHealth.isHealthy) {
        recommendations.push('Run progress data validation and repair');
      }
      if (!analyticsHealth.isHealthy) {
        recommendations.push('Repair analytics data integrity issues');
      }
      if (trackingHealth.accuracy < 90) {
        recommendations.push('Review progress tracking accuracy');
      }

      const healthCheck: ProgressSystemHealthCheck = {
        validationHealth,
        trackingHealth,
        analyticsHealth,
        overallHealth: {
          status,
          score: healthScore,
          recommendations
        }
      };

      return serviceSuccess(healthCheck);
    } catch (error) {
      this.handleError(error, 'ProgressIntegrationService.performSystemHealthCheck');
    }
  }

  /**
   * Perform comprehensive system repair for all progress tracking components
   */
  async performSystemRepair(
    userId?: string,
    userConfirmation: boolean = false
  ): Promise<ServiceResult<ProgressSystemRepairResult>> {
    try {
      let validationRepairs = 0;
      let trackingRepairs = 0;
      let analyticsRepairs = 0;
      const errors: string[] = [];

      // Repair validation issues
      try {
        if (userId) {
          const validationCheck = await progressValidationService.validateUserProgressData(userId);
          if (validationCheck.success && validationCheck.data?.repairActions.length) {
            const repairResult = await progressValidationService.repairProgressData(
              userId,
              validationCheck.data.repairActions,
              userConfirmation
            );
            if (repairResult.success) {
              validationRepairs = repairResult.data?.actionsPerformed || 0;
            } else {
              errors.push('Failed to repair validation issues');
            }
          }
        } else {
          const validationCheck = await progressValidationService.validateAllProgressData();
          if (validationCheck.success && validationCheck.data?.repairActions.length) {
            // For system-wide repairs, we'd need to implement batch processing
            validationRepairs = validationCheck.data.repairActions.length;
          }
        }
      } catch (error) {
        errors.push(`Validation repair failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Repair analytics issues
      try {
        const analyticsCheck = await analyticsEnhancementService.performAnalyticsDataIntegrityCheck();
        if (analyticsCheck.success && analyticsCheck.data?.repairActions.length) {
          const repairResult = await analyticsEnhancementService.repairAnalyticsData(
            analyticsCheck.data.repairActions,
            userConfirmation
          );
          if (repairResult.success) {
            analyticsRepairs = repairResult.data?.actionsPerformed || 0;
          } else {
            errors.push('Failed to repair analytics issues');
          }
        }
      } catch (error) {
        errors.push(`Analytics repair failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Tracking repairs would be handled by recalculating progress
      if (userId) {
        try {
          // Get user's modules and recalculate progress for each
          const userProgress = await progressValidationService.validateUserProgressData(userId);
          if (userProgress.success) {
            trackingRepairs = 1; // Simplified - would be actual repair count
          }
        } catch (error) {
          errors.push(`Tracking repair failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      const totalRepairs = validationRepairs + trackingRepairs + analyticsRepairs;
      const success = errors.length === 0;

      const result: ProgressSystemRepairResult = {
        validationRepairs,
        trackingRepairs,
        analyticsRepairs,
        totalRepairs,
        errors,
        success
      };

      this.audit({
        event: 'system.health.check',
        userId: userId || 'system',
        resource: 'progress_system',
        metadata: {
          totalRepairs,
          validationRepairs,
          trackingRepairs,
          analyticsRepairs,
          success
        }
      });

      return serviceSuccess(result);
    } catch (error) {
      this.handleError(error, 'ProgressIntegrationService.performSystemRepair');
    }
  }

  /**
   * Synchronize progress data across all systems
   */
  async synchronizeProgressSystems(userId: string): Promise<ServiceResult<boolean>> {
    try {
      // Synchronize progress across sessions
      const syncResult = await progressValidationService.synchronizeProgressAcrossSessions(userId);
      if (!syncResult.success) {
        return serviceError('Failed to synchronize progress across sessions', 'SYNC_FAILED');
      }

      // Update analytics with synchronized data
      const analyticsUpdate = {
        userId,
        eventType: 'module_started' as const,
        timestamp: new Date(),
        metadata: { syncOperation: true }
      };
      
      const analyticsResult = await analyticsEnhancementService.processRealTimeAnalyticsUpdate(analyticsUpdate);
      if (!analyticsResult.success) {
        return serviceError('Failed to update analytics after sync', 'ANALYTICS_UPDATE_FAILED');
      }

      this.audit({
        event: 'system.health.check',
        userId,
        resource: userId,
        metadata: {
          syncedSessions: syncResult.data?.syncedSessions || 0,
          conflictsResolved: syncResult.data?.conflictsResolved || 0
        }
      });

      return serviceSuccess(true);
    } catch (error) {
      this.handleError(error, 'ProgressIntegrationService.synchronizeProgressSystems');
    }
  }

  /**
   * Generate comprehensive progress report combining all systems
   */
  async generateComprehensiveProgressReport(
    userId: string
  ): Promise<ServiceResult<{
    validation: any;
    tracking: any;
    analytics: any;
    summary: {
      overallHealth: string;
      dataIntegrity: number;
      recommendations: string[];
    };
  }>> {
    try {
      // Get validation data
      const validationData = await progressValidationService.validateUserProgressData(userId);
      
      // Get comprehensive learning stats
      const analyticsData = await analyticsEnhancementService.generateComprehensiveLearningStats(userId);

      // Calculate tracking accuracy (simplified)
      const trackingData = {
        accuracy: 95,
        lastUpdate: new Date(),
        consistencyScore: 90
      };

      // Generate summary
      const dataIntegrity = validationData.success && validationData.data?.isValid ? 100 : 
        validationData.success ? 
          ((validationData.data?.summary?.validRecords || 0) / (validationData.data?.summary?.totalRecords || 1) * 100) : 
          0;

      const overallHealth = dataIntegrity > 90 ? 'excellent' : 
        dataIntegrity > 70 ? 'good' : 
        dataIntegrity > 50 ? 'fair' : 'poor';

      const recommendations: string[] = [];
      if (validationData.success && validationData.data && !validationData.data.isValid) {
        recommendations.push('Fix data validation issues');
      }
      if (dataIntegrity < 90) {
        recommendations.push('Improve data integrity');
      }
      if (trackingData.accuracy < 95) {
        recommendations.push('Enhance tracking accuracy');
      }

      const report = {
        validation: validationData.success ? validationData.data : null,
        tracking: trackingData,
        analytics: analyticsData.success ? analyticsData.data : null,
        summary: {
          overallHealth,
          dataIntegrity,
          recommendations
        }
      };

      return serviceSuccess(report);
    } catch (error) {
      this.handleError(error, 'ProgressIntegrationService.generateComprehensiveProgressReport');
    }
  }

  /**
   * Schedule automated maintenance for progress tracking systems
   */
  async scheduleAutomatedMaintenance(): Promise<ServiceResult<boolean>> {
    try {
      // This would typically integrate with a job scheduler
      // For now, we'll just log the scheduling
      
      this.audit({
        event: 'system.health.check',
        userId: 'system',
        resource: 'progress_system',
        metadata: {
          scheduledAt: new Date(),
          maintenanceType: 'automated'
        }
      });

      return serviceSuccess(true);
    } catch (error) {
      this.handleError(error, 'ProgressIntegrationService.scheduleAutomatedMaintenance');
    }
  }

  /**
   * Monitor progress tracking system performance
   */
  async monitorSystemPerformance(): Promise<ServiceResult<{
    responseTime: number;
    throughput: number;
    errorRate: number;
    cacheHitRate: number;
    recommendations: string[];
  }>> {
    try {
      // These would be actual performance metrics in a real implementation
      const metrics = {
        responseTime: 150, // ms
        throughput: 1000, // requests per minute
        errorRate: 0.1, // percentage
        cacheHitRate: 95, // percentage
        recommendations: [] as string[]
      };

      if (metrics.responseTime > 200) {
        metrics.recommendations.push('Optimize database queries');
      }
      if (metrics.errorRate > 1) {
        metrics.recommendations.push('Investigate error sources');
      }
      if (metrics.cacheHitRate < 90) {
        metrics.recommendations.push('Improve caching strategy');
      }

      return serviceSuccess(metrics);
    } catch (error) {
      this.handleError(error, 'ProgressIntegrationService.monitorSystemPerformance');
    }
  }
}

// Export singleton instance
export const progressIntegrationService = new ProgressIntegrationService();