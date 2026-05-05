import { BaseService, ServiceResult, serviceSuccess, serviceError } from '../base.service';
import { learningRepository } from '@/lib/database/repositories/learning-repository';
import { transactionService } from '@/lib/database/transaction-service';
import { AwarenessLabErrorCode } from '@/lib/errors/awareness-lab-errors';

export interface AccurateMaterialAccess {
  userId: string;
  moduleId: string;
  materialId: string;
  accessTimestamp: Date;
  sessionId: string;
  deviceInfo?: {
    userAgent: string;
    ipAddress: string;
    deviceType: 'desktop' | 'mobile' | 'tablet';
  };
  duration?: number; // Time spent on material in seconds
}

export interface MaterialCompletionData {
  userId: string;
  moduleId: string;
  materialId: string;
  completionTimestamp: Date;
  sessionId: string;
  completionMethod: 'manual' | 'automatic' | 'time_based';
  timeSpent: number; // Total time spent on material
  interactionData?: {
    scrollPercentage?: number;
    clickCount?: number;
    focusTime?: number;
  };
}

export interface ProgressRecoveryResult {
  success: boolean;
  recoveredSessions: number;
  restoredProgress: number;
  errors: string[];
}

export interface ModuleProgressCalculation {
  moduleId: string;
  userId: string;
  totalMaterials: number;
  completedMaterials: number;
  accessedMaterials: number;
  completionPercentage: number;
  estimatedTimeRemaining: number; // in minutes
  lastActivity: Date;
  isModuleCompleted: boolean;
  nextRecommendedMaterial?: string;
}

/**
 * Service for accurate progress tracking with proper timestamp management
 */
export class ProgressTrackingService extends BaseService {

  /**
   * Track material access with enhanced accuracy and timestamp management
   */
  async trackMaterialAccessAccurate(
    accessData: AccurateMaterialAccess
  ): Promise<ServiceResult<any>> {
    try {
      // Validate that module and material exist
      const moduleExists = await learningRepository.moduleExists(accessData.moduleId);
      if (!moduleExists) {
        return serviceError('Learning module not found', AwarenessLabErrorCode.MODULE_NOT_FOUND);
      }

      const materialExists = await learningRepository.materialExists(accessData.materialId);
      if (!materialExists) {
        return serviceError('Learning material not found', AwarenessLabErrorCode.MATERIAL_NOT_FOUND);
      }

      const result = await transactionService.executeInTransaction(async (tx) => {
        // Check for existing progress record
        const existingProgress = await this.getProgressRecord(
          accessData.userId,
          accessData.moduleId,
          accessData.materialId,
          tx
        );

        if (existingProgress) {
          // Update existing record with accurate timestamp management
          const updates: any = {
            lastAccessed: accessData.accessTimestamp,
            sessionId: accessData.sessionId
          };

          // Update device info if provided
          if (accessData.deviceInfo) {
            updates.deviceInfo = accessData.deviceInfo;
          }

          // Update duration if provided (accumulate total time)
          if (accessData.duration) {
            const currentDuration = existingProgress.totalTimeSpent || 0;
            updates.totalTimeSpent = currentDuration + accessData.duration;
          }

          // Ensure timestamps are consistent
          if (existingProgress.completedAt && 
              new Date(accessData.accessTimestamp) < new Date(existingProgress.completedAt)) {
            // Don't update lastAccessed if it would be before completion time
            // This prevents timestamp inconsistencies
            delete updates.lastAccessed;
          }

          const updatedProgress = await this.updateProgressRecord(
            existingProgress.id,
            updates,
            tx
          );

          return updatedProgress;
        } else {
          // Create new progress record with accurate initial data
          const newProgress = await this.createProgressRecord({
            userId: accessData.userId,
            moduleId: accessData.moduleId,
            materialId: accessData.materialId,
            isCompleted: false,
            lastAccessed: accessData.accessTimestamp,
            sessionId: accessData.sessionId,
            deviceInfo: accessData.deviceInfo,
            totalTimeSpent: accessData.duration || 0
          }, tx);

          return newProgress;
        }
      }, 'ProgressTrackingService.trackMaterialAccessAccurate');

      if (!result.success) {
        return serviceError(result.error || 'Failed to track material access', 'TRACKING_FAILED');
      }

      // Update module progress calculation
      await this.recalculateModuleProgress(accessData.userId, accessData.moduleId);

      this.audit({
        event: 'awareness.learning.material.accessed',
        userId: accessData.userId,
        resource: accessData.materialId,
        metadata: {
          moduleId: accessData.moduleId,
          sessionId: accessData.sessionId,
          duration: accessData.duration
        }
      });

      return serviceSuccess(result.data);
    } catch (error) {
      this.handleError(error, 'ProgressTrackingService.trackMaterialAccessAccurate');
    }
  }

  /**
   * Mark material as completed with enhanced validation and timestamp management
   */
  async markMaterialCompletedAccurate(
    completionData: MaterialCompletionData
  ): Promise<ServiceResult<any>> {
    try {
      // Validate that module and material exist
      const moduleExists = await learningRepository.moduleExists(completionData.moduleId);
      if (!moduleExists) {
        return serviceError('Learning module not found', AwarenessLabErrorCode.MODULE_NOT_FOUND);
      }

      const materialExists = await learningRepository.materialExists(completionData.materialId);
      if (!materialExists) {
        return serviceError('Learning material not found', AwarenessLabErrorCode.MATERIAL_NOT_FOUND);
      }

      const result = await transactionService.executeInTransaction(async (tx) => {
        // Get existing progress record
        const existingProgress = await this.getProgressRecord(
          completionData.userId,
          completionData.moduleId,
          completionData.materialId,
          tx
        );

        if (existingProgress) {
          // Update existing record to mark as completed
          const updates: any = {
            isCompleted: true,
            completedAt: completionData.completionTimestamp,
            lastAccessed: completionData.completionTimestamp,
            sessionId: completionData.sessionId,
            completionMethod: completionData.completionMethod,
            totalTimeSpent: completionData.timeSpent
          };

          // Add interaction data if provided
          if (completionData.interactionData) {
            updates.interactionData = completionData.interactionData;
          }

          // Ensure completion timestamp is not before last access
          if (existingProgress.lastAccessed && 
              new Date(completionData.completionTimestamp) < new Date(existingProgress.lastAccessed)) {
            // Use the later of the two timestamps
            updates.completedAt = existingProgress.lastAccessed;
            updates.lastAccessed = existingProgress.lastAccessed;
          }

          const updatedProgress = await this.updateProgressRecord(
            existingProgress.id,
            updates,
            tx
          );

          return updatedProgress;
        } else {
          // Create new progress record already marked as completed
          const newProgress = await this.createProgressRecord({
            userId: completionData.userId,
            moduleId: completionData.moduleId,
            materialId: completionData.materialId,
            isCompleted: true,
            completedAt: completionData.completionTimestamp,
            lastAccessed: completionData.completionTimestamp,
            sessionId: completionData.sessionId,
            completionMethod: completionData.completionMethod,
            totalTimeSpent: completionData.timeSpent,
            interactionData: completionData.interactionData
          }, tx);

          return newProgress;
        }
      }, 'ProgressTrackingService.markMaterialCompletedAccurate');

      if (!result.success) {
        return serviceError(result.error || 'Failed to mark material completed', 'COMPLETION_FAILED');
      }

      // Recalculate module progress
      await this.recalculateModuleProgress(completionData.userId, completionData.moduleId);

      this.audit({
        event: 'awareness.learning.material.completed',
        userId: completionData.userId,
        resource: completionData.materialId,
        metadata: {
          moduleId: completionData.moduleId,
          sessionId: completionData.sessionId,
          completionMethod: completionData.completionMethod,
          timeSpent: completionData.timeSpent
        }
      });

      return serviceSuccess(result.data);
    } catch (error) {
      this.handleError(error, 'ProgressTrackingService.markMaterialCompletedAccurate');
    }
  }

  /**
   * Recalculate module progress with accurate completion status validation
   */
  async recalculateModuleProgress(
    userId: string,
    moduleId: string
  ): Promise<ServiceResult<ModuleProgressCalculation>> {
    try {
      const result = await transactionService.executeInTransaction(async (tx) => {
        // Get all materials in the module
        const materials = await learningRepository.getModuleMaterials(moduleId, tx);
        const totalMaterials = materials.length;

        if (totalMaterials === 0) {
          return {
            moduleId,
            userId,
            totalMaterials: 0,
            completedMaterials: 0,
            accessedMaterials: 0,
            completionPercentage: 0,
            estimatedTimeRemaining: 0,
            lastActivity: new Date(),
            isModuleCompleted: false
          };
        }

        // Get user's progress for all materials in this module
        const progressRecords = await this.getUserModuleProgressRecords(userId, moduleId, tx);
        
        let completedMaterials = 0;
        let accessedMaterials = 0;
        let totalTimeSpent = 0;
        let lastActivity = new Date(0); // Start with epoch

        for (const progress of progressRecords) {
          if (progress.isCompleted) {
            completedMaterials++;
          }
          if (progress.lastAccessed) {
            accessedMaterials++;
            const accessTime = new Date(progress.lastAccessed);
            if (accessTime > lastActivity) {
              lastActivity = accessTime;
            }
          }
          if (progress.totalTimeSpent) {
            totalTimeSpent += progress.totalTimeSpent;
          }
        }

        const completionPercentage = totalMaterials > 0 ? (completedMaterials / totalMaterials) * 100 : 0;
        const isModuleCompleted = completionPercentage === 100;

        // Estimate time remaining based on average time per material
        const avgTimePerMaterial = accessedMaterials > 0 ? totalTimeSpent / accessedMaterials : 300; // 5 min default
        const remainingMaterials = totalMaterials - completedMaterials;
        const estimatedTimeRemaining = Math.round((remainingMaterials * avgTimePerMaterial) / 60); // in minutes

        // Find next recommended material (first incomplete material in order)
        let nextRecommendedMaterial: string | undefined;
        for (const material of materials) {
          const materialProgress = progressRecords.find(p => p.materialId === material.id);
          if (!materialProgress || !materialProgress.isCompleted) {
            nextRecommendedMaterial = material.id;
            break;
          }
        }

        const calculation: ModuleProgressCalculation = {
          moduleId,
          userId,
          totalMaterials,
          completedMaterials,
          accessedMaterials,
          completionPercentage,
          estimatedTimeRemaining,
          lastActivity,
          isModuleCompleted,
          nextRecommendedMaterial
        };

        // Store the calculated progress for caching
        await this.storeModuleProgressCalculation(calculation, tx);

        return calculation;
      }, 'ProgressTrackingService.recalculateModuleProgress');

      if (!result.success) {
        return serviceError(result.error || 'Failed to recalculate module progress', 'CALCULATION_FAILED');
      }

      return serviceSuccess(result.data!);
    } catch (error) {
      this.handleError(error, 'ProgressTrackingService.recalculateModuleProgress');
    }
  }

  /**
   * Recover progress for interrupted sessions and network failures
   */
  async recoverInterruptedProgress(
    userId: string,
    sessionId: string,
    lastKnownState: {
      moduleId: string;
      materialId: string;
      lastAccessTime: Date;
      timeSpent: number;
      wasCompleted: boolean;
    }
  ): Promise<ServiceResult<ProgressRecoveryResult>> {
    try {
      const result = await transactionService.executeInTransaction(async (tx) => {
        let recoveredSessions = 0;
        let restoredProgress = 0;
        const errors: string[] = [];

        try {
          // Check if progress record exists for this session
          const existingProgress = await this.getProgressRecord(
            userId,
            lastKnownState.moduleId,
            lastKnownState.materialId,
            tx
          );

          if (existingProgress) {
            // Update with recovered data if it's more recent
            const updates: any = {};
            let needsUpdate = false;

            // Restore last access time if it's more recent
            if (new Date(lastKnownState.lastAccessTime) > new Date(existingProgress.lastAccessed)) {
              updates.lastAccessed = lastKnownState.lastAccessTime;
              needsUpdate = true;
            }

            // Add time spent
            if (lastKnownState.timeSpent > 0) {
              const currentTimeSpent = existingProgress.totalTimeSpent || 0;
              updates.totalTimeSpent = currentTimeSpent + lastKnownState.timeSpent;
              needsUpdate = true;
            }

            // Restore completion status if it was completed
            if (lastKnownState.wasCompleted && !existingProgress.isCompleted) {
              updates.isCompleted = true;
              updates.completedAt = lastKnownState.lastAccessTime;
              needsUpdate = true;
            }

            if (needsUpdate) {
              await this.updateProgressRecord(existingProgress.id, updates, tx);
              restoredProgress++;
            }
          } else {
            // Create new progress record from recovered state
            await this.createProgressRecord({
              userId,
              moduleId: lastKnownState.moduleId,
              materialId: lastKnownState.materialId,
              isCompleted: lastKnownState.wasCompleted,
              completedAt: lastKnownState.wasCompleted ? lastKnownState.lastAccessTime : null,
              lastAccessed: lastKnownState.lastAccessTime,
              sessionId,
              totalTimeSpent: lastKnownState.timeSpent
            }, tx);
            restoredProgress++;
          }

          recoveredSessions++;
        } catch (error) {
          errors.push(`Failed to recover progress for session ${sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        return {
          success: errors.length === 0,
          recoveredSessions,
          restoredProgress,
          errors
        };
      }, 'ProgressTrackingService.recoverInterruptedProgress');

      if (!result.success) {
        return serviceError(result.error || 'Failed to recover interrupted progress', 'RECOVERY_FAILED');
      }

      // Recalculate module progress after recovery
      await this.recalculateModuleProgress(userId, lastKnownState.moduleId);

      this.audit({
        event: 'system.health.check',
        userId,
        resource: sessionId,
        metadata: {
          moduleId: lastKnownState.moduleId,
          materialId: lastKnownState.materialId,
          recoveredSessions: result.data!.recoveredSessions,
          restoredProgress: result.data!.restoredProgress
        }
      });

      return serviceSuccess(result.data!);
    } catch (error) {
      this.handleError(error, 'ProgressTrackingService.recoverInterruptedProgress');
    }
  }

  /**
   * Validate completion status and ensure proper module progress calculation
   */
  async validateCompletionStatus(
    userId: string,
    moduleId: string
  ): Promise<ServiceResult<{ isValid: boolean; issues: string[]; fixes: string[] }>> {
    try {
      const issues: string[] = [];
      const fixes: string[] = [];

      // Get module materials and user progress
      const materials = await learningRepository.getModuleMaterials(moduleId);
      const progressRecords = await this.getUserModuleProgressRecords(userId, moduleId);

      // Check for missing progress records
      for (const material of materials) {
        const hasProgress = progressRecords.some(p => p.materialId === material.id);
        if (!hasProgress) {
          issues.push(`Missing progress record for material: ${material.title}`);
        }
      }

      // Check for orphaned progress records
      for (const progress of progressRecords) {
        const materialExists = materials.some(m => m.id === progress.materialId);
        if (!materialExists) {
          issues.push(`Orphaned progress record for non-existent material: ${progress.materialId}`);
          fixes.push(`Delete orphaned progress record: ${progress.id}`);
        }
      }

      // Check for timestamp inconsistencies
      for (const progress of progressRecords) {
        if (progress.isCompleted && !progress.completedAt) {
          issues.push(`Completed material missing completion timestamp: ${progress.materialId}`);
          fixes.push(`Set completion timestamp for: ${progress.materialId}`);
        }

        if (progress.completedAt && progress.lastAccessed &&
            new Date(progress.completedAt) > new Date(progress.lastAccessed)) {
          issues.push(`Completion timestamp after last access for: ${progress.materialId}`);
          fixes.push(`Fix timestamp inconsistency for: ${progress.materialId}`);
        }
      }

      const isValid = issues.length === 0;

      return serviceSuccess({ isValid, issues, fixes });
    } catch (error) {
      this.handleError(error, 'ProgressTrackingService.validateCompletionStatus');
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Get progress record for user-module-material combination
   */
  private async getProgressRecord(
    userId: string,
    moduleId: string,
    materialId: string,
    tx?: any
  ): Promise<any | null> {
    const { eq, and } = await import('drizzle-orm');
    const { learningProgress } = await import('@/lib/database/schema');
    
    const dbInstance = tx || (await import('@/lib/database/connection')).db;
    
    const [record] = await dbInstance
      .select()
      .from(learningProgress)
      .where(and(
        eq(learningProgress.userId, userId),
        eq(learningProgress.moduleId, moduleId),
        eq(learningProgress.materialId, materialId)
      ))
      .limit(1);
    
    return record || null;
  }

  /**
   * Create new progress record
   */
  private async createProgressRecord(data: any, tx: any): Promise<any> {
    const { learningProgress } = await import('@/lib/database/schema');
    
    const [record] = await tx
      .insert(learningProgress)
      .values({
        userId: data.userId,
        moduleId: data.moduleId,
        materialId: data.materialId,
        isCompleted: data.isCompleted || false,
        completedAt: data.completedAt || null,
        lastAccessed: data.lastAccessed || new Date(),
        // Additional fields would be added to schema
        sessionId: data.sessionId,
        deviceInfo: data.deviceInfo,
        totalTimeSpent: data.totalTimeSpent || 0,
        completionMethod: data.completionMethod,
        interactionData: data.interactionData
      })
      .returning();
    
    return record;
  }

  /**
   * Update progress record
   */
  private async updateProgressRecord(recordId: string, updates: any, tx: any): Promise<any> {
    const { eq } = await import('drizzle-orm');
    const { learningProgress } = await import('@/lib/database/schema');
    
    const [record] = await tx
      .update(learningProgress)
      .set(updates)
      .where(eq(learningProgress.id, recordId))
      .returning();
    
    return record;
  }

  /**
   * Get all progress records for a user in a specific module
   */
  private async getUserModuleProgressRecords(
    userId: string,
    moduleId: string,
    tx?: any
  ): Promise<any[]> {
    const { eq, and } = await import('drizzle-orm');
    const { learningProgress } = await import('@/lib/database/schema');
    
    const dbInstance = tx || (await import('@/lib/database/connection')).db;
    
    const records = await dbInstance
      .select()
      .from(learningProgress)
      .where(and(
        eq(learningProgress.userId, userId),
        eq(learningProgress.moduleId, moduleId)
      ));
    
    return records;
  }

  /**
   * Store module progress calculation for caching
   */
  private async storeModuleProgressCalculation(
    calculation: ModuleProgressCalculation,
    tx: any
  ): Promise<void> {
    // This would store the calculation in a cache table or update user progress summary
    // Implementation depends on specific caching strategy
  }
}

// Export singleton instance
export const progressTrackingService = new ProgressTrackingService();