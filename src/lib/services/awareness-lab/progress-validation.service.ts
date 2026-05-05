import { BaseService, ServiceResult, serviceSuccess, serviceError } from '../base.service';
import { learningRepository } from '@/lib/database/repositories/learning-repository';
import { transactionService } from '@/lib/database/transaction-service';
import { AwarenessLabErrorCode } from '@/lib/errors/awareness-lab-errors';

export interface ProgressValidationResult {
  isValid: boolean;
  issues: ProgressValidationIssue[];
  repairActions: ProgressRepairAction[];
  summary: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    orphanedRecords: number;
    inconsistentRecords: number;
  };
}

export interface ProgressValidationIssue {
  id: string;
  type: 'orphaned_material' | 'orphaned_module' | 'orphaned_user' | 'inconsistent_completion' | 'invalid_timestamp' | 'duplicate_record';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  affectedRecord: {
    progressId: string;
    userId?: string;
    moduleId?: string;
    materialId?: string;
  };
  suggestedAction: string;
}

export interface ProgressRepairAction {
  type: 'delete_orphaned' | 'fix_completion_status' | 'fix_timestamp' | 'merge_duplicates' | 'recalculate_progress';
  description: string;
  affectedRecords: string[];
  riskLevel: 'low' | 'medium' | 'high';
  requiresUserConfirmation: boolean;
}

export interface ProgressSyncResult {
  success: boolean;
  syncedSessions: number;
  conflictsResolved: number;
  errors: string[];
}

export interface ProgressRepairResult {
  success: boolean;
  actionsPerformed: number;
  recordsFixed: number;
  recordsDeleted: number;
  errors: string[];
}

/**
 * Service for validating and repairing progress tracking data
 */
export class ProgressValidationService extends BaseService {

  /**
   * Validate progress data for a specific user
   */
  async validateUserProgressData(userId: string): Promise<ServiceResult<ProgressValidationResult>> {
    try {
      // Get all progress records for the user
      const userProgress = await learningRepository.findProgress({ userId }, 1000, 0);
      
      const issues: ProgressValidationIssue[] = [];
      const repairActions: ProgressRepairAction[] = [];
      
      let validRecords = 0;
      let invalidRecords = 0;
      let orphanedRecords = 0;
      let inconsistentRecords = 0;

      // Check for orphaned records (references to non-existent modules/materials)
      for (const progress of userProgress) {
        let hasIssues = false;

        // Check if module exists
        const moduleExists = await learningRepository.moduleExists(progress.moduleId);
        if (!moduleExists) {
          issues.push({
            id: `orphaned_module_${progress.id}`,
            type: 'orphaned_module',
            severity: 'critical',
            description: `Progress record references non-existent module: ${progress.moduleId}`,
            affectedRecord: {
              progressId: progress.id,
              userId: progress.userId,
              moduleId: progress.moduleId,
              materialId: progress.materialId
            },
            suggestedAction: 'Delete orphaned progress record'
          });
          orphanedRecords++;
          hasIssues = true;
        }

        // Check if material exists (if materialId is provided)
        if (progress.materialId) {
          const materialExists = await learningRepository.materialExists(progress.materialId);
          if (!materialExists) {
            issues.push({
              id: `orphaned_material_${progress.id}`,
              type: 'orphaned_material',
              severity: 'critical',
              description: `Progress record references non-existent material: ${progress.materialId}`,
              affectedRecord: {
                progressId: progress.id,
                userId: progress.userId,
                moduleId: progress.moduleId,
                materialId: progress.materialId
              },
              suggestedAction: 'Delete orphaned progress record'
            });
            orphanedRecords++;
            hasIssues = true;
          }
        }

        // Check for inconsistent completion status
        if (progress.isCompleted && !progress.completedAt) {
          issues.push({
            id: `inconsistent_completion_${progress.id}`,
            type: 'inconsistent_completion',
            severity: 'warning',
            description: `Progress marked as completed but missing completion timestamp`,
            affectedRecord: {
              progressId: progress.id,
              userId: progress.userId,
              moduleId: progress.moduleId,
              materialId: progress.materialId
            },
            suggestedAction: 'Set completion timestamp to last accessed time'
          });
          inconsistentRecords++;
          hasIssues = true;
        }

        // Check for invalid timestamps
        if (progress.completedAt && progress.lastAccessed && 
            new Date(progress.completedAt) > new Date(progress.lastAccessed)) {
          issues.push({
            id: `invalid_timestamp_${progress.id}`,
            type: 'invalid_timestamp',
            severity: 'warning',
            description: `Completion timestamp is after last accessed timestamp`,
            affectedRecord: {
              progressId: progress.id,
              userId: progress.userId,
              moduleId: progress.moduleId,
              materialId: progress.materialId
            },
            suggestedAction: 'Fix timestamp inconsistency'
          });
          inconsistentRecords++;
          hasIssues = true;
        }

        if (!hasIssues) {
          validRecords++;
        } else {
          invalidRecords++;
        }
      }

      // Check for duplicate records
      const duplicates = await this.findDuplicateProgressRecords(userId);
      for (const duplicate of duplicates) {
        issues.push({
          id: `duplicate_${duplicate.key}`,
          type: 'duplicate_record',
          severity: 'warning',
          description: `Duplicate progress records found for user-module-material combination`,
          affectedRecord: {
            progressId: duplicate.records[0].id,
            userId: duplicate.userId,
            moduleId: duplicate.moduleId,
            materialId: duplicate.materialId || undefined
          },
          suggestedAction: 'Merge duplicate records keeping the most recent data'
        });
        inconsistentRecords += duplicate.records.length - 1;
      }

      // Generate repair actions based on issues
      if (orphanedRecords > 0) {
        const orphanedIds = issues
          .filter(i => i.type === 'orphaned_module' || i.type === 'orphaned_material')
          .map(i => i.affectedRecord.progressId);
        
        repairActions.push({
          type: 'delete_orphaned',
          description: `Delete ${orphanedRecords} orphaned progress records`,
          affectedRecords: orphanedIds,
          riskLevel: 'low',
          requiresUserConfirmation: false
        });
      }

      if (inconsistentRecords > 0) {
        const inconsistentIds = issues
          .filter(i => i.type === 'inconsistent_completion' || i.type === 'invalid_timestamp')
          .map(i => i.affectedRecord.progressId);
        
        repairActions.push({
          type: 'fix_completion_status',
          description: `Fix ${inconsistentRecords} records with inconsistent completion data`,
          affectedRecords: inconsistentIds,
          riskLevel: 'low',
          requiresUserConfirmation: false
        });
      }

      if (duplicates.length > 0) {
        const duplicateIds = duplicates.flatMap(d => d.records.map(r => r.id));
        
        repairActions.push({
          type: 'merge_duplicates',
          description: `Merge ${duplicates.length} sets of duplicate progress records`,
          affectedRecords: duplicateIds,
          riskLevel: 'medium',
          requiresUserConfirmation: true
        });
      }

      const result: ProgressValidationResult = {
        isValid: issues.length === 0,
        issues,
        repairActions,
        summary: {
          totalRecords: userProgress.length,
          validRecords,
          invalidRecords,
          orphanedRecords,
          inconsistentRecords
        }
      };

      return serviceSuccess(result);
    } catch (error) {
      return serviceError(
        error instanceof Error ? error.message : 'Unknown error',
        'VALIDATION_FAILED'
      );
    }
  }

  /**
   * Validate progress data for all users
   */
  async validateAllProgressData(): Promise<ServiceResult<ProgressValidationResult>> {
    try {
      // Get all progress records
      const allProgress = await learningRepository.findProgress({}, 10000, 0);
      
      const issues: ProgressValidationIssue[] = [];
      const repairActions: ProgressRepairAction[] = [];
      
      let validRecords = 0;
      let invalidRecords = 0;
      let orphanedRecords = 0;
      let inconsistentRecords = 0;

      // Group progress by user for efficient validation
      const progressByUser = new Map<string, any[]>();
      for (const progress of allProgress) {
        if (!progressByUser.has(progress.userId)) {
          progressByUser.set(progress.userId, []);
        }
        progressByUser.get(progress.userId)!.push(progress);
      }

      // Validate each user's progress
      for (const [userId, userProgress] of progressByUser) {
        const userValidation = await this.validateUserProgressData(userId);
        if (userValidation.success && userValidation.data) {
          issues.push(...userValidation.data.issues);
          repairActions.push(...userValidation.data.repairActions);
          validRecords += userValidation.data.summary.validRecords;
          invalidRecords += userValidation.data.summary.invalidRecords;
          orphanedRecords += userValidation.data.summary.orphanedRecords;
          inconsistentRecords += userValidation.data.summary.inconsistentRecords;
        }
      }

      const result: ProgressValidationResult = {
        isValid: issues.length === 0,
        issues,
        repairActions,
        summary: {
          totalRecords: allProgress.length,
          validRecords,
          invalidRecords,
          orphanedRecords,
          inconsistentRecords
        }
      };

      return serviceSuccess(result);
    } catch (error) {
      this.handleError(error, 'ProgressValidationService.validateAllProgressData');
    }
  }

  /**
   * Repair corrupted progress data automatically
   */
  async repairProgressData(
    userId: string,
    repairActions: ProgressRepairAction[],
    userConfirmation: boolean = false
  ): Promise<ServiceResult<ProgressRepairResult>> {
    try {
      const result = await transactionService.executeInTransaction(async (tx) => {
        let actionsPerformed = 0;
        let recordsFixed = 0;
        let recordsDeleted = 0;
        const errors: string[] = [];

        for (const action of repairActions) {
          // Skip actions that require user confirmation if not provided
          if (action.requiresUserConfirmation && !userConfirmation) {
            continue;
          }

          try {
            switch (action.type) {
              case 'delete_orphaned':
                const deletedCount = await this.deleteOrphanedRecords(action.affectedRecords, tx);
                recordsDeleted += deletedCount;
                actionsPerformed++;
                break;

              case 'fix_completion_status':
                const fixedCount = await this.fixCompletionStatus(action.affectedRecords, tx);
                recordsFixed += fixedCount;
                actionsPerformed++;
                break;

              case 'fix_timestamp':
                const timestampFixedCount = await this.fixTimestampInconsistencies(action.affectedRecords, tx);
                recordsFixed += timestampFixedCount;
                actionsPerformed++;
                break;

              case 'merge_duplicates':
                const mergedCount = await this.mergeDuplicateRecords(userId, tx);
                recordsFixed += mergedCount;
                actionsPerformed++;
                break;

              case 'recalculate_progress':
                await this.recalculateUserProgress(userId, tx);
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
          recordsFixed,
          recordsDeleted,
          errors
        };
      }, 'ProgressValidationService.repairProgressData');

      if (!result.success) {
        return serviceError(result.error || 'Failed to repair progress data', 'REPAIR_FAILED');
      }

      this.audit({
        event: 'system.health.check',
        userId,
        resource: userId,
        metadata: {
          actionsPerformed: result.data!.actionsPerformed,
          recordsFixed: result.data!.recordsFixed,
          recordsDeleted: result.data!.recordsDeleted
        }
      });

      return serviceSuccess(result.data!);
    } catch (error) {
      this.handleError(error, 'ProgressValidationService.repairProgressData');
    }
  }

  /**
   * Synchronize progress across multiple sessions and devices
   */
  async synchronizeProgressAcrossSessions(userId: string): Promise<ServiceResult<ProgressSyncResult>> {
    try {
      // Get all progress records for the user
      const userProgress = await learningRepository.findProgress({ userId }, 1000, 0);
      
      // Group by module-material combination to find conflicts
      const progressMap = new Map<string, any[]>();
      for (const progress of userProgress) {
        const key = `${progress.moduleId}-${progress.materialId || 'module'}`;
        if (!progressMap.has(key)) {
          progressMap.set(key, []);
        }
        progressMap.get(key)!.push(progress);
      }

      let syncedSessions = 0;
      let conflictsResolved = 0;
      const errors: string[] = [];

      const result = await transactionService.executeInTransaction(async (tx) => {
        for (const [key, records] of progressMap) {
          if (records.length > 1) {
            // Multiple records for same module-material combination
            // Resolve by keeping the most recent and complete data
            try {
              const resolvedRecord = this.resolveProgressConflict(records);
              
              // Delete all records except the resolved one
              for (const record of records) {
                if (record.id !== resolvedRecord.id) {
                  await this.deleteProgressRecord(record.id, tx);
                }
              }

              // Update the resolved record with merged data
              await this.updateProgressRecord(resolvedRecord.id, resolvedRecord, tx);
              
              conflictsResolved++;
            } catch (error) {
              errors.push(`Failed to resolve conflict for ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
          syncedSessions++;
        }

        return {
          success: errors.length === 0,
          syncedSessions,
          conflictsResolved,
          errors
        };
      }, 'ProgressValidationService.synchronizeProgressAcrossSessions');

      if (!result.success) {
        return serviceError(result.error || 'Failed to synchronize progress', 'SYNC_FAILED');
      }

      this.audit({
        event: 'system.health.check',
        userId,
        resource: userId,
        metadata: {
          syncedSessions: result.data!.syncedSessions,
          conflictsResolved: result.data!.conflictsResolved
        }
      });

      return serviceSuccess(result.data!);
    } catch (error) {
      return serviceError(
        error instanceof Error ? error.message : 'Unknown error',
        'SYNC_FAILED'
      );
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Find duplicate progress records for a user
   */
  private async findDuplicateProgressRecords(userId: string): Promise<Array<{
    key: string;
    userId: string;
    moduleId: string;
    materialId: string | null;
    records: any[];
  }>> {
    const userProgress = await learningRepository.findProgress({ userId }, 1000, 0);
    const progressMap = new Map<string, any[]>();
    
    for (const progress of userProgress) {
      const key = `${progress.userId}-${progress.moduleId}-${progress.materialId || 'null'}`;
      if (!progressMap.has(key)) {
        progressMap.set(key, []);
      }
      progressMap.get(key)!.push(progress);
    }

    const duplicates = [];
    for (const [key, records] of progressMap) {
      if (records.length > 1) {
        const [userId, moduleId, materialId] = key.split('-');
        duplicates.push({
          key,
          userId,
          moduleId,
          materialId: materialId === 'null' ? null : materialId,
          records
        });
      }
    }

    return duplicates;
  }

  /**
   * Delete orphaned progress records
   */
  private async deleteOrphanedRecords(recordIds: string[], tx: any): Promise<number> {
    let deletedCount = 0;
    for (const recordId of recordIds) {
      try {
        await this.deleteProgressRecord(recordId, tx);
        deletedCount++;
      } catch (error) {
        // Log error but continue with other records
        console.error(`Failed to delete orphaned record ${recordId}:`, error);
      }
    }
    return deletedCount;
  }

  /**
   * Fix completion status inconsistencies
   */
  private async fixCompletionStatus(recordIds: string[], tx: any): Promise<number> {
    let fixedCount = 0;
    for (const recordId of recordIds) {
      try {
        // Get the current record
        const progress = await this.getProgressRecord(recordId, tx);
        if (progress) {
          const updates: any = {};
          
          // Fix missing completion timestamp
          if (progress.isCompleted && !progress.completedAt) {
            updates.completedAt = progress.lastAccessed || new Date();
          }
          
          // Fix timestamp inconsistencies
          if (progress.completedAt && progress.lastAccessed && 
              new Date(progress.completedAt) > new Date(progress.lastAccessed)) {
            updates.lastAccessed = progress.completedAt;
          }

          if (Object.keys(updates).length > 0) {
            await this.updateProgressRecord(recordId, updates, tx);
            fixedCount++;
          }
        }
      } catch (error) {
        console.error(`Failed to fix completion status for record ${recordId}:`, error);
      }
    }
    return fixedCount;
  }

  /**
   * Fix timestamp inconsistencies
   */
  private async fixTimestampInconsistencies(recordIds: string[], tx: any): Promise<number> {
    return this.fixCompletionStatus(recordIds, tx); // Same logic
  }

  /**
   * Merge duplicate progress records
   */
  private async mergeDuplicateRecords(userId: string, tx: any): Promise<number> {
    const duplicates = await this.findDuplicateProgressRecords(userId);
    let mergedCount = 0;

    for (const duplicate of duplicates) {
      try {
        const resolvedRecord = this.resolveProgressConflict(duplicate.records);
        
        // Delete all records except the resolved one
        for (const record of duplicate.records) {
          if (record.id !== resolvedRecord.id) {
            await this.deleteProgressRecord(record.id, tx);
          }
        }

        // Update the resolved record
        await this.updateProgressRecord(resolvedRecord.id, resolvedRecord, tx);
        mergedCount++;
      } catch (error) {
        console.error(`Failed to merge duplicate records for ${duplicate.key}:`, error);
      }
    }

    return mergedCount;
  }

  /**
   * Recalculate user progress for all modules
   */
  private async recalculateUserProgress(userId: string, tx: any): Promise<void> {
    // This would involve recalculating module completion percentages
    // based on current material completion status
    // Implementation would depend on specific business logic
  }

  /**
   * Resolve conflict between multiple progress records
   */
  private resolveProgressConflict(records: any[]): any {
    // Sort by last accessed time (most recent first)
    records.sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime());
    
    const mostRecent = records[0];
    
    // Merge data from all records, preferring completed status and most recent timestamps
    const resolved = { ...mostRecent };
    
    for (const record of records) {
      // Prefer completed status
      if (record.isCompleted && !resolved.isCompleted) {
        resolved.isCompleted = record.isCompleted;
        resolved.completedAt = record.completedAt;
      }
      
      // Use the most recent completion time if completed
      if (record.completedAt && resolved.completedAt && 
          new Date(record.completedAt) > new Date(resolved.completedAt)) {
        resolved.completedAt = record.completedAt;
      }
    }

    return resolved;
  }

  /**
   * Delete a progress record
   */
  private async deleteProgressRecord(recordId: string, tx: any): Promise<void> {
    const { eq } = await import('drizzle-orm');
    const { learningProgress } = await import('@/lib/database/schema');
    
    await tx.delete(learningProgress).where(eq(learningProgress.id, recordId));
  }

  /**
   * Update a progress record
   */
  private async updateProgressRecord(recordId: string, updates: any, tx: any): Promise<void> {
    const { eq } = await import('drizzle-orm');
    const { learningProgress } = await import('@/lib/database/schema');
    
    await tx.update(learningProgress)
      .set(updates)
      .where(eq(learningProgress.id, recordId));
  }

  /**
   * Get a progress record by ID
   */
  private async getProgressRecord(recordId: string, tx: any): Promise<any | null> {
    const { eq } = await import('drizzle-orm');
    const { learningProgress } = await import('@/lib/database/schema');
    
    const [record] = await tx.select()
      .from(learningProgress)
      .where(eq(learningProgress.id, recordId))
      .limit(1);
    
    return record || null;
  }
}

// Export singleton instance
export const progressValidationService = new ProgressValidationService();