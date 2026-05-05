import { BaseService, ServiceResult, serviceSuccess, serviceError } from '../base.service';
import { learningRepository } from '@/lib/database/repositories/learning-repository';
import { transactionService } from '@/lib/database/transaction-service';
import { AwarenessLabErrorCode } from '@/lib/errors/awareness-lab-errors';
import { materialValidationService } from './material-validation.service';

export interface MaterialReorderResult {
  success: boolean;
  updatedMaterials: Array<{
    id: string;
    orderIndex: number;
  }>;
  progressUpdatesRequired: string[]; // User IDs that need progress recalculation
}

export interface BulkMaterialOperation {
  action: 'create' | 'update' | 'delete';
  materialId?: string;
  materialData?: any;
}

export interface BulkOperationResult {
  success: boolean;
  results: Array<{
    operation: BulkMaterialOperation;
    success: boolean;
    result?: any;
    error?: string;
  }>;
  totalProcessed: number;
  successCount: number;
  errorCount: number;
}

export interface MaterialDependency {
  materialId: string;
  dependentOn: string[];
  dependents: string[];
  canDelete: boolean;
  deleteBlockers: string[];
}

export interface DragDropReorderData {
  draggedMaterialId: string;
  targetMaterialId: string;
  position: 'before' | 'after';
}

/**
 * Service for managing material organization, reordering, and bulk operations
 */
export class MaterialOrganizationService extends BaseService {

  /**
   * Reorder materials within a module using drag and drop
   */
  async reorderMaterialsDragDrop(
    moduleId: string,
    reorderData: DragDropReorderData,
    userId: string
  ): Promise<ServiceResult<MaterialReorderResult>> {
    try {
      // Validate module exists
      const moduleExists = await learningRepository.moduleExists(moduleId);
      if (!moduleExists) {
        return serviceError('Learning module not found', AwarenessLabErrorCode.MODULE_NOT_FOUND);
      }

      // Get current materials in order
      const currentMaterials = await learningRepository.getModuleMaterials(moduleId);
      
      if (currentMaterials.length === 0) {
        return serviceError('Module has no materials to reorder', 'NO_MATERIALS');
      }

      // Validate that both materials exist in this module
      const draggedIndex = currentMaterials.findIndex(m => m.id === reorderData.draggedMaterialId);
      const targetIndex = currentMaterials.findIndex(m => m.id === reorderData.targetMaterialId);

      if (draggedIndex === -1) {
        return serviceError('Dragged material not found in module', AwarenessLabErrorCode.MATERIAL_NOT_FOUND);
      }

      if (targetIndex === -1) {
        return serviceError('Target material not found in module', AwarenessLabErrorCode.MATERIAL_NOT_FOUND);
      }

      // Calculate new order
      const newOrder = this.calculateNewOrder(currentMaterials, draggedIndex, targetIndex, reorderData.position);

      // Apply the reordering in a transaction
      const transactionResult = await transactionService.executeInTransaction(async (tx) => {
        const updatedMaterials = [];

        for (let i = 0; i < newOrder.length; i++) {
          const material = newOrder[i];
          const newOrderIndex = i + 1;

          if (material.orderIndex !== newOrderIndex) {
            await learningRepository.updateMaterial(material.id, { orderIndex: newOrderIndex }, tx);
            updatedMaterials.push({
              id: material.id,
              orderIndex: newOrderIndex
            });
          }
        }

        return updatedMaterials;
      }, 'MaterialOrganizationService.reorderMaterialsDragDrop');

      if (!transactionResult.success) {
        return serviceError(transactionResult.error || 'Failed to reorder materials', 'TRANSACTION_FAILED');
      }

      // Get users who have progress in this module for recalculation
      const usersWithProgress = await learningRepository.getUsersWithModuleProgress(moduleId);

      const result: MaterialReorderResult = {
        success: true,
        updatedMaterials: transactionResult.data!,
        progressUpdatesRequired: usersWithProgress.map(u => u.userId)
      };

      this.audit({
        event: 'awareness.learning.material.added',
        userId,
        resource: moduleId,
        metadata: {
          draggedMaterialId: reorderData.draggedMaterialId,
          targetMaterialId: reorderData.targetMaterialId,
          position: reorderData.position,
          updatedCount: transactionResult.data!.length
        }
      });

      // Trigger progress recalculation for affected users (async)
      this.scheduleProgressRecalculation(moduleId, result.progressUpdatesRequired);

      return serviceSuccess(result);
    } catch (error) {
      this.handleError(error, 'MaterialOrganizationService.reorderMaterialsDragDrop');
    }
  }

  /**
   * Reorder materials by providing explicit order array
   */
  async reorderMaterialsByOrder(
    moduleId: string,
    materialIds: string[],
    userId: string
  ): Promise<ServiceResult<MaterialReorderResult>> {
    try {
      // Validate module exists
      const moduleExists = await learningRepository.moduleExists(moduleId);
      if (!moduleExists) {
        return serviceError('Learning module not found', AwarenessLabErrorCode.MODULE_NOT_FOUND);
      }

      // Get current materials
      const currentMaterials = await learningRepository.getModuleMaterials(moduleId);
      
      // Validate that all provided IDs exist in the module
      const currentMaterialIds = currentMaterials.map(m => m.id);
      const invalidIds = materialIds.filter(id => !currentMaterialIds.includes(id));
      
      if (invalidIds.length > 0) {
        return serviceError(
          `Materials not found in module: ${invalidIds.join(', ')}`,
          AwarenessLabErrorCode.MATERIAL_NOT_FOUND
        );
      }

      // Validate that all materials are included
      if (materialIds.length !== currentMaterials.length) {
        return serviceError('All materials must be included in the new order', 'INCOMPLETE_REORDER');
      }

      // Apply the reordering in a transaction
      const transactionResult = await transactionService.executeInTransaction(async (tx) => {
        const updatedMaterials = [];

        for (let i = 0; i < materialIds.length; i++) {
          const materialId = materialIds[i];
          const newOrderIndex = i + 1;
          const currentMaterial = currentMaterials.find(m => m.id === materialId);

          if (currentMaterial && currentMaterial.orderIndex !== newOrderIndex) {
            await learningRepository.updateMaterial(materialId, { orderIndex: newOrderIndex }, tx);
            updatedMaterials.push({
              id: materialId,
              orderIndex: newOrderIndex
            });
          }
        }

        return updatedMaterials;
      }, 'MaterialOrganizationService.reorderMaterialsByOrder');

      if (!transactionResult.success) {
        return serviceError(transactionResult.error || 'Failed to reorder materials', 'TRANSACTION_FAILED');
      }

      // Get users who have progress in this module for recalculation
      const usersWithProgress = await learningRepository.getUsersWithModuleProgress(moduleId);

      const result: MaterialReorderResult = {
        success: true,
        updatedMaterials: transactionResult.data!,
        progressUpdatesRequired: usersWithProgress.map(u => u.userId)
      };

      this.audit({
        event: 'awareness.learning.material.added',
        userId,
        resource: moduleId,
        metadata: {
          reorderType: 'explicit_order',
          materialCount: materialIds.length,
          updatedCount: transactionResult.data!.length
        }
      });

      // Trigger progress recalculation for affected users (async)
      this.scheduleProgressRecalculation(moduleId, result.progressUpdatesRequired);

      return serviceSuccess(result);
    } catch (error) {
      this.handleError(error, 'MaterialOrganizationService.reorderMaterialsByOrder');
    }
  }

  /**
   * Perform bulk operations on materials
   */
  async performBulkMaterialOperations(
    moduleId: string,
    operations: BulkMaterialOperation[],
    userId: string
  ): Promise<ServiceResult<BulkOperationResult>> {
    try {
      // Validate module exists
      const moduleExists = await learningRepository.moduleExists(moduleId);
      if (!moduleExists) {
        return serviceError('Learning module not found', AwarenessLabErrorCode.MODULE_NOT_FOUND);
      }

      if (!operations || operations.length === 0) {
        return serviceError('No operations provided', 'NO_OPERATIONS');
      }

      if (operations.length > 50) {
        return serviceError('Too many operations (maximum 50 allowed)', 'TOO_MANY_OPERATIONS');
      }

      const results: BulkOperationResult['results'] = [];
      let successCount = 0;
      let errorCount = 0;

      // Process operations in a transaction
      const transactionResult = await transactionService.executeInTransaction(async (tx) => {
        for (const operation of operations) {
          try {
            let result: any;

            switch (operation.action) {
              case 'create':
                result = await this.processBulkCreate(moduleId, operation.materialData, tx);
                break;
              case 'update':
                result = await this.processBulkUpdate(operation.materialId!, operation.materialData, tx);
                break;
              case 'delete':
                result = await this.processBulkDelete(operation.materialId!, tx);
                break;
              default:
                throw new Error(`Invalid operation action: ${operation.action}`);
            }

            results.push({
              operation,
              success: true,
              result
            });
            successCount++;
          } catch (error) {
            results.push({
              operation,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            errorCount++;
          }
        }

        return { results, successCount, errorCount };
      }, 'MaterialOrganizationService.performBulkMaterialOperations');

      if (!transactionResult.success) {
        return serviceError(transactionResult.error || 'Bulk operation failed', 'TRANSACTION_FAILED');
      }

      const result: BulkOperationResult = {
        success: errorCount === 0,
        results: transactionResult.data!.results,
        totalProcessed: operations.length,
        successCount: transactionResult.data!.successCount,
        errorCount: transactionResult.data!.errorCount
      };

      this.audit({
        event: 'awareness.learning.material.updated',
        userId,
        resource: moduleId,
        metadata: {
          totalOperations: operations.length,
          successCount,
          errorCount,
          operations: operations.map(op => op.action)
        }
      });

      return serviceSuccess(result);
    } catch (error) {
      this.handleError(error, 'MaterialOrganizationService.performBulkMaterialOperations');
    }
  }

  /**
   * Get material dependencies to prevent deletion of referenced materials
   */
  async getMaterialDependencies(materialId: string): Promise<ServiceResult<MaterialDependency>> {
    try {
      const material = await learningRepository.findMaterialById(materialId);
      if (!material) {
        return serviceError('Material not found', AwarenessLabErrorCode.MATERIAL_NOT_FOUND);
      }

      // Check for dependencies (this is a simplified implementation)
      // In a real system, you might have:
      // - Materials that reference other materials
      // - Quiz questions that reference materials
      // - Learning paths that depend on specific materials

      const dependentOn: string[] = [];
      const dependents: string[] = [];
      const deleteBlockers: string[] = [];

      // Check if material has user progress
      const progressCount = await learningRepository.getMaterialProgressCount(materialId);
      if (progressCount > 0) {
        deleteBlockers.push(`${progressCount} users have progress on this material`);
      }

      // Check if material is part of a published module
      const module = await learningRepository.findModuleById(material.moduleId);
      if (module?.isPublished) {
        deleteBlockers.push('Material is part of a published module');
      }

      const result: MaterialDependency = {
        materialId,
        dependentOn,
        dependents,
        canDelete: deleteBlockers.length === 0,
        deleteBlockers
      };

      return serviceSuccess(result);
    } catch (error) {
      this.handleError(error, 'MaterialOrganizationService.getMaterialDependencies');
    }
  }

  /**
   * Safely delete material with dependency checking
   */
  async safeDeleteMaterial(
    materialId: string,
    userId: string,
    force: boolean = false
  ): Promise<ServiceResult<boolean>> {
    try {
      // Check dependencies first
      const dependencyResult = await this.getMaterialDependencies(materialId);
      if (!dependencyResult.success) {
        return dependencyResult;
      }

      const dependencies = dependencyResult.data!;

      if (!dependencies.canDelete && !force) {
        return serviceError(
          `Cannot delete material: ${dependencies.deleteBlockers.join(', ')}`,
          'MATERIAL_HAS_DEPENDENCIES'
        );
      }

      // Perform deletion
      const deleted = await learningRepository.deleteMaterial(materialId);

      if (deleted) {
        this.audit({
          event: 'awareness.learning.material.deleted',
          userId,
          resource: materialId,
          metadata: {
            forced: force,
            hadDependencies: dependencies.deleteBlockers.length > 0
          }
        });
      }

      return serviceSuccess(deleted);
    } catch (error) {
      this.handleError(error, 'MaterialOrganizationService.safeDeleteMaterial');
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Calculate new order after drag and drop operation
   */
  private calculateNewOrder(
    materials: any[],
    draggedIndex: number,
    targetIndex: number,
    position: 'before' | 'after'
  ): any[] {
    const newOrder = [...materials];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);

    let insertIndex = targetIndex;
    
    // Adjust insert index if dragged item was before target
    if (draggedIndex < targetIndex) {
      insertIndex--;
    }

    // Adjust for position
    if (position === 'after') {
      insertIndex++;
    }

    newOrder.splice(insertIndex, 0, draggedItem);
    return newOrder;
  }

  /**
   * Process bulk create operation
   */
  private async processBulkCreate(moduleId: string, materialData: any, tx: any): Promise<any> {
    // Validate material data
    if (materialData.materialData?.url) {
      const urlValidation = await materialValidationService.validateMaterialUrl(
        materialData.materialData.url,
        materialData.materialType
      );
      if (!urlValidation.success) {
        throw new Error(`Invalid material URL: ${urlValidation.error}`);
      }
      if (!urlValidation.data.isValid) {
        throw new Error(`Invalid material URL: ${urlValidation.data.reason}`);
      }
    }

    if (materialData.materialData?.embedCode) {
      const embedValidation = await materialValidationService.sanitizeEmbedCode(
        materialData.materialData.embedCode
      );
      if (!embedValidation.success || !embedValidation.data.isValid) {
        throw new Error('Invalid embed code');
      }
      // Use sanitized embed code
      materialData.materialData.embedCode = embedValidation.data.sanitizedCode;
    }

    return await learningRepository.addMaterial(moduleId, materialData, tx);
  }

  /**
   * Process bulk update operation
   */
  private async processBulkUpdate(materialId: string, updateData: any, tx: any): Promise<any> {
    // Validate update data
    if (updateData.materialData?.url) {
      const urlValidation = await materialValidationService.validateMaterialUrl(
        updateData.materialData.url,
        updateData.materialType
      );
      if (!urlValidation.success) {
        throw new Error(`Invalid material URL: ${urlValidation.error}`);
      }
      if (!urlValidation.data.isValid) {
        throw new Error(`Invalid material URL: ${urlValidation.data.reason}`);
      }
    }

    if (updateData.materialData?.embedCode) {
      const embedValidation = await materialValidationService.sanitizeEmbedCode(
        updateData.materialData.embedCode
      );
      if (!embedValidation.success || !embedValidation.data.isValid) {
        throw new Error('Invalid embed code');
      }
      // Use sanitized embed code
      updateData.materialData.embedCode = embedValidation.data.sanitizedCode;
    }

    return await learningRepository.updateMaterial(materialId, updateData, tx);
  }

  /**
   * Process bulk delete operation
   */
  private async processBulkDelete(materialId: string, tx: any): Promise<boolean> {
    // Check dependencies
    const dependencyResult = await this.getMaterialDependencies(materialId);
    if (!dependencyResult.success) {
      throw new Error('Failed to check material dependencies');
    }

    const dependencies = dependencyResult.data!;
    if (!dependencies.canDelete) {
      throw new Error(`Cannot delete material: ${dependencies.deleteBlockers.join(', ')}`);
    }

    return await learningRepository.deleteMaterial(materialId, tx);
  }

  /**
   * Schedule progress recalculation for affected users
   */
  private async scheduleProgressRecalculation(moduleId: string, userIds: string[]): Promise<void> {
    // This would typically queue background jobs for progress recalculation
    // For now, we'll just log the requirement
    if (userIds.length > 0) {
      this.audit({
        event: 'awareness.learning.module.updated',
        resource: moduleId,
        metadata: {
          affectedUsers: userIds.length,
          userIds: userIds.slice(0, 10) // Log first 10 user IDs
        }
      });

      // In a real implementation, you would:
      // 1. Queue background jobs for each user
      // 2. Use a job queue system like Bull or Agenda
      // 3. Process recalculations asynchronously
    }
  }
}

// Export singleton instance
export const materialOrganizationService = new MaterialOrganizationService();