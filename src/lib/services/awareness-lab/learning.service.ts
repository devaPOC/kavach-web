import { BaseService, ServiceResult, serviceSuccess, serviceError } from '../base.service';
import { learningRepository } from '@/lib/database/repositories/learning-repository';
import { transactionService } from '@/lib/database/transaction-service';
import {
  LearningModuleError,
  ContentValidationError,
  AwarenessLabErrorCode
} from '@/lib/errors/awareness-lab-errors';
import {
  learningModuleSchema,
  learningModuleUpdateSchema,
  moduleMaterialSchema,
  progressUpdateSchema,
  type LearningModuleData,
  type LearningModuleUpdateData,
  type ModuleMaterialData,
  type ProgressUpdateData
} from '@/lib/validation/awareness-lab-schemas';
import { materialValidationService } from './material-validation.service';
import { materialOrganizationService } from './material-organization.service';
import { modulePublishingService } from './module-publishing.service';
import { progressTrackingService } from './progress-tracking.service';
import { progressValidationService } from './progress-validation.service';
import { analyticsEnhancementService } from './analytics-enhancement.service';

export interface ModuleProgress {
  moduleId: string;
  totalMaterials: number;
  completedMaterials: number;
  completionPercentage: number;
  lastAccessed: Date | null;
  isModuleCompleted: boolean;
}

export interface MaterialProgress {
  materialId: string;
  isCompleted: boolean;
  completedAt?: Date;
  lastAccessed: Date;
}

export interface LearningStats {
  totalModules: number;
  completedModules: number;
  totalMaterials: number;
  completedMaterials: number;
  overallProgress: number;
  recentActivity: Array<{
    moduleId: string;
    moduleTitle: string;
    materialId?: string;
    materialTitle?: string;
    action: 'accessed' | 'completed';
    timestamp: Date;
  }>;
}

/**
 * Service for managing learning modules, materials, and progress tracking
 */
export class LearningService extends BaseService {

  // ===== MODULE MANAGEMENT =====

  /**
   * Create a new learning module with materials
   */
  async createModule(
    createdBy: string,
    moduleData: LearningModuleData
  ): Promise<ServiceResult<any>> {
    try {
      // Validate input data
      const validatedData = learningModuleSchema.parse(moduleData);

      // Create module and materials in a transaction
      const transactionResult = await transactionService.executeInTransaction(async (tx) => {
        // Create the module
        const module = await learningRepository.createModule(createdBy, {
          title: validatedData.title,
          description: validatedData.description,
          category: validatedData.category,
          orderIndex: validatedData.orderIndex,
          isPublished: false // Always start as unpublished
        }, tx);

        // Add materials if provided
        const materials = [];
        if (validatedData.materials && validatedData.materials.length > 0) {
          for (let i = 0; i < validatedData.materials.length; i++) {
            const materialData = validatedData.materials[i];

            // Validate material URL if provided
            if (materialData.materialData.url) {
              const urlValidation = await materialValidationService.validateMaterialUrl(
                materialData.materialData.url, 
                materialData.materialType
              );
              if (!urlValidation.success) {
                throw LearningModuleError.invalidMaterialUrl(
                  materialData.materialData.url,
                  urlValidation.error || 'Invalid URL'
                );
              }
              if (!urlValidation.data.isValid) {
                throw LearningModuleError.invalidMaterialUrl(
                  materialData.materialData.url,
                  urlValidation.data.reason || 'Invalid URL'
                );
              }
            }

            // Validate embed code if provided
            if (materialData.materialData.embedCode) {
              const embedValidation = await materialValidationService.sanitizeEmbedCode(
                materialData.materialData.embedCode
              );
              if (!embedValidation.success || !embedValidation.data.isValid) {
                throw ContentValidationError.invalidEmbedCode(
                  materialData.materialData.embedCode
                );
              }
              // Use sanitized embed code
              materialData.materialData.embedCode = embedValidation.data.sanitizedCode;
            }

            const material = await learningRepository.addMaterial(module.id, {
              materialType: materialData.materialType,
              title: materialData.title,
              description: materialData.description,
              materialData: materialData.materialData,
              orderIndex: materialData.orderIndex || i + 1
            }, tx);
            materials.push(material);
          }
        }

        return { ...module, materials };
      }, 'LearningService.createModule');

      if (!transactionResult.success) {
        return serviceError(transactionResult.error || 'Failed to create module', 'TRANSACTION_FAILED');
      }

      const result = transactionResult.data!;

      this.audit({
        event: 'awareness.learning.module.created',
        userId: createdBy,
        resource: result.id,
        metadata: {
          title: validatedData.title,
          category: validatedData.category,
          materialCount: validatedData.materials?.length || 0
        }
      });

      return serviceSuccess(result);
    } catch (error) {
      this.handleError(error, 'LearningService.createModule');
    }
  }

  /**
   * Update an existing learning module
   */
  async updateModule(
    moduleId: string,
    updateData: LearningModuleUpdateData,
    userId: string
  ): Promise<ServiceResult<any>> {
    try {
      // Validate input data
      const validatedData = learningModuleUpdateSchema.parse(updateData);

      // Check if module exists
      const existingModule = await learningRepository.findModuleById(moduleId);
      if (!existingModule) {
        return serviceError('Learning module not found', AwarenessLabErrorCode.MODULE_NOT_FOUND);
      }

      const transactionResult = await transactionService.executeInTransaction(async (tx) => {
        // Update module basic info
        const updatedModule = await learningRepository.updateModule(moduleId, {
          title: validatedData.title,
          description: validatedData.description,
          category: validatedData.category,
          orderIndex: validatedData.orderIndex,
          isPublished: validatedData.isPublished
        }, tx);

        return updatedModule;
      }, 'LearningService.updateModule');

      if (!transactionResult.success) {
        return serviceError(transactionResult.error || 'Failed to update module', 'TRANSACTION_FAILED');
      }

      const result = transactionResult.data!;

      this.audit({
        event: 'awareness.learning.module.updated',
        userId,
        resource: moduleId,
        metadata: {
          isPublished: validatedData.isPublished,
          category: validatedData.category
        }
      });

      return serviceSuccess(result);
    } catch (error) {
      this.handleError(error, 'LearningService.updateModule');
    }
  }

  /**
   * Publish or unpublish a learning module with enhanced validation
   */
  async setModulePublished(
    moduleId: string,
    isPublished: boolean,
    userId: string
  ): Promise<ServiceResult<any>> {
    try {
      if (isPublished) {
        // Use enhanced publishing service for publishing
        return await modulePublishingService.publishModule(moduleId, userId);
      } else {
        // Use enhanced publishing service for unpublishing
        return await modulePublishingService.unpublishModule(moduleId, userId);
      }
    } catch (error) {
      this.handleError(error, 'LearningService.setModulePublished');
    }
  }

  /**
   * Get published modules for customers
   */
  async getPublishedModules(
    category?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ServiceResult<any[]>> {
    try {
      const modules = await learningRepository.findPublishedModules(category, limit, offset);
      return serviceSuccess(modules);
    } catch (error) {
      this.handleError(error, 'LearningService.getPublishedModules');
    }
  }

  /**
   * Get module with materials for customer
   */
  async getModuleForCustomer(
    moduleId: string,
    userId: string
  ): Promise<ServiceResult<any>> {
    try {
      const module = await learningRepository.findModuleByIdWithMaterials(moduleId);
      if (!module) {
        return serviceError('Learning module not found', AwarenessLabErrorCode.MODULE_NOT_FOUND);
      }

      if (!module.isPublished) {
        return serviceError('Module is not published', AwarenessLabErrorCode.MODULE_NOT_PUBLISHED);
      }

      // Get user's progress for this module
      const progress = await learningRepository.getUserModuleProgress(userId, moduleId);

      return serviceSuccess({
        ...module,
        userProgress: progress
      });
    } catch (error) {
      this.handleError(error, 'LearningService.getModuleForCustomer');
    }
  }

  /**
   * Get available categories
   */
  async getCategories(): Promise<ServiceResult<string[]>> {
    try {
      const categories = await learningRepository.getCategories();
      return serviceSuccess(categories);
    } catch (error) {
      this.handleError(error, 'LearningService.getCategories');
    }
  }

  // ===== MATERIAL MANAGEMENT =====

  /**
   * Add material to a module
   */
  async addMaterial(
    moduleId: string,
    materialData: ModuleMaterialData,
    userId: string
  ): Promise<ServiceResult<any>> {
    try {
      // Validate input data
      const validatedData = moduleMaterialSchema.parse(materialData);

      // Check if module exists
      const moduleExists = await learningRepository.moduleExists(moduleId);
      if (!moduleExists) {
        return serviceError('Learning module not found', AwarenessLabErrorCode.MODULE_NOT_FOUND);
      }

      // Validate material URL if provided
      if (validatedData.materialData.url) {
        const urlValidation = await materialValidationService.validateMaterialUrl(
          validatedData.materialData.url, 
          validatedData.materialType
        );
        if (!urlValidation.success) {
          return serviceError(
            `Invalid material URL: ${urlValidation.error}`,
            AwarenessLabErrorCode.INVALID_MATERIAL_URL
          );
        }
        if (!urlValidation.data.isValid) {
          return serviceError(
            `Invalid material URL: ${urlValidation.data.reason}`,
            AwarenessLabErrorCode.INVALID_MATERIAL_URL
          );
        }
      }

      // Validate embed code if provided
      if (validatedData.materialData.embedCode) {
        const embedValidation = await materialValidationService.sanitizeEmbedCode(
          validatedData.materialData.embedCode
        );
        if (!embedValidation.success || !embedValidation.data.isValid) {
          return serviceError(
            'Embed code contains invalid or unsafe elements',
            AwarenessLabErrorCode.INVALID_EMBED_CODE
          );
        }
        // Use sanitized embed code
        validatedData.materialData.embedCode = embedValidation.data.sanitizedCode;
      }

      const material = await learningRepository.addMaterial(moduleId, {
        materialType: validatedData.materialType,
        title: validatedData.title,
        description: validatedData.description,
        materialData: validatedData.materialData,
        orderIndex: validatedData.orderIndex
      });

      this.audit({
        event: 'awareness.learning.material.added',
        userId,
        resource: moduleId,
        metadata: {
          materialId: material.id,
          materialType: validatedData.materialType,
          title: validatedData.title
        }
      });

      return serviceSuccess(material);
    } catch (error) {
      this.handleError(error, 'LearningService.addMaterial');
    }
  }

  /**
   * Update a material
   */
  async updateMaterial(
    materialId: string,
    updateData: Partial<ModuleMaterialData>,
    userId: string
  ): Promise<ServiceResult<any>> {
    try {
      // Check if material exists
      const existingMaterial = await learningRepository.findMaterialById(materialId);
      if (!existingMaterial) {
        return serviceError('Learning material not found', AwarenessLabErrorCode.MATERIAL_NOT_FOUND);
      }

      // Validate material URL if being updated
      if (updateData.materialData?.url) {
        const urlValidation = await materialValidationService.validateMaterialUrl(
          updateData.materialData.url,
          updateData.materialType || existingMaterial.materialType
        );
        if (!urlValidation.success) {
          return serviceError(
            `Invalid material URL: ${urlValidation.error}`,
            AwarenessLabErrorCode.INVALID_MATERIAL_URL
          );
        }
        if (!urlValidation.data.isValid) {
          return serviceError(
            `Invalid material URL: ${urlValidation.data.reason}`,
            AwarenessLabErrorCode.INVALID_MATERIAL_URL
          );
        }
      }

      // Validate embed code if being updated
      if (updateData.materialData?.embedCode) {
        const embedValidation = await materialValidationService.sanitizeEmbedCode(
          updateData.materialData.embedCode
        );
        if (!embedValidation.success || !embedValidation.data.isValid) {
          return serviceError(
            'Embed code contains invalid or unsafe elements',
            AwarenessLabErrorCode.INVALID_EMBED_CODE
          );
        }
        // Use sanitized embed code
        updateData.materialData.embedCode = embedValidation.data.sanitizedCode;
      }

      const material = await learningRepository.updateMaterial(materialId, updateData);

      this.audit({
        event: 'awareness.learning.material.updated',
        userId,
        resource: materialId,
        metadata: {
          moduleId: existingMaterial.moduleId,
          materialType: updateData.materialType || existingMaterial.materialType
        }
      });

      return serviceSuccess(material);
    } catch (error) {
      this.handleError(error, 'LearningService.updateMaterial');
    }
  }

  /**
   * Delete a material
   */
  async deleteMaterial(
    materialId: string,
    userId: string
  ): Promise<ServiceResult<boolean>> {
    try {
      const material = await learningRepository.findMaterialById(materialId);
      if (!material) {
        return serviceError('Learning material not found', AwarenessLabErrorCode.MATERIAL_NOT_FOUND);
      }

      const deleted = await learningRepository.deleteMaterial(materialId);

      this.audit({
        event: 'awareness.learning.material.deleted',
        userId,
        resource: materialId,
        metadata: {
          moduleId: material.moduleId,
          title: material.title
        }
      });

      return serviceSuccess(deleted);
    } catch (error) {
      this.handleError(error, 'LearningService.deleteMaterial');
    }
  }

  // ===== PROGRESS TRACKING =====

  /**
   * Track material access with enhanced accuracy
   */
  async trackMaterialAccess(
    userId: string,
    moduleId: string,
    materialId: string,
    sessionId?: string,
    deviceInfo?: any,
    duration?: number
  ): Promise<ServiceResult<any>> {
    try {
      // Use enhanced progress tracking service
      const result = await progressTrackingService.trackMaterialAccessAccurate({
        userId,
        moduleId,
        materialId,
        accessTimestamp: new Date(),
        sessionId: sessionId || `session_${Date.now()}`,
        deviceInfo,
        duration
      });

      if (result.success) {
        // Update real-time analytics
        await analyticsEnhancementService.processRealTimeAnalyticsUpdate({
          userId,
          eventType: 'material_accessed',
          moduleId,
          materialId,
          timestamp: new Date(),
          metadata: { sessionId, duration }
        });
      }

      return result;
    } catch (error) {
      this.handleError(error, 'LearningService.trackMaterialAccess');
    }
  }

  /**
   * Mark material as completed with enhanced tracking
   */
  async markMaterialCompleted(
    userId: string,
    moduleId: string,
    materialId: string,
    sessionId?: string,
    completionMethod: 'manual' | 'automatic' | 'time_based' = 'manual',
    timeSpent?: number,
    interactionData?: any
  ): Promise<ServiceResult<any>> {
    try {
      // Use enhanced progress tracking service
      const result = await progressTrackingService.markMaterialCompletedAccurate({
        userId,
        moduleId,
        materialId,
        completionTimestamp: new Date(),
        sessionId: sessionId || `session_${Date.now()}`,
        completionMethod,
        timeSpent: timeSpent || 0,
        interactionData
      });

      if (result.success) {
        // Update real-time analytics
        await analyticsEnhancementService.processRealTimeAnalyticsUpdate({
          userId,
          eventType: 'material_completed',
          moduleId,
          materialId,
          timestamp: new Date(),
          metadata: { sessionId, completionMethod, timeSpent }
        });

        this.audit({
          event: 'awareness.learning.material.completed',
          userId,
          resource: materialId,
          metadata: { moduleId, completionMethod, timeSpent }
        });
      }

      return result;
    } catch (error) {
      this.handleError(error, 'LearningService.markMaterialCompleted');
    }
  }

  /**
   * Get user's progress for a specific module
   */
  async getUserModuleProgress(
    userId: string,
    moduleId: string
  ): Promise<ServiceResult<ModuleProgress>> {
    try {
      const moduleExists = await learningRepository.moduleExists(moduleId);
      if (!moduleExists) {
        return serviceError('Learning module not found', AwarenessLabErrorCode.MODULE_NOT_FOUND);
      }

      const progress = await learningRepository.getUserModuleProgress(userId, moduleId);

      const result: ModuleProgress = {
        moduleId: progress.moduleId,
        totalMaterials: progress.totalMaterials,
        completedMaterials: progress.completedMaterials,
        completionPercentage: progress.completionPercentage,
        lastAccessed: progress.lastAccessed,
        isModuleCompleted: progress.isModuleCompleted
      };

      return serviceSuccess(result);
    } catch (error) {
      this.handleError(error, 'LearningService.getUserModuleProgress');
    }
  }

  /**
   * Get user's progress for all modules
   */
  async getUserAllModulesProgress(userId: string): Promise<ServiceResult<ModuleProgress[]>> {
    try {
      const progressList = await learningRepository.getUserAllModulesProgress(userId);

      const results: ModuleProgress[] = progressList.map(progress => ({
        moduleId: progress.moduleId,
        totalMaterials: progress.totalMaterials,
        completedMaterials: progress.completedMaterials,
        completionPercentage: progress.completionPercentage,
        lastAccessed: progress.lastAccessed,
        isModuleCompleted: progress.isModuleCompleted
      }));

      return serviceSuccess(results);
    } catch (error) {
      this.handleError(error, 'LearningService.getUserAllModulesProgress');
    }
  }

  /**
   * Get user's learning statistics
   */
  async getUserLearningStats(userId: string): Promise<ServiceResult<LearningStats>> {
    try {
      const allProgress = await learningRepository.getUserAllModulesProgress(userId);

      const totalModules = allProgress.length;
      const completedModules = allProgress.filter(p => p.isModuleCompleted).length;
      const totalMaterials = allProgress.reduce((sum, p) => sum + p.totalMaterials, 0);
      const completedMaterials = allProgress.reduce((sum, p) => sum + p.completedMaterials, 0);
      const overallProgress = totalMaterials > 0 ? (completedMaterials / totalMaterials) * 100 : 0;

      // Get recent activity (last 10 activities)
      const recentProgress = await learningRepository.findProgress(
        { userId },
        10,
        0
      );

      const recentActivity = recentProgress.map(progress => ({
        moduleId: progress.moduleId,
        moduleTitle: 'Module', // Would need to join with modules table
        materialId: progress.materialId,
        materialTitle: 'Material', // Would need to join with materials table
        action: progress.isCompleted ? 'completed' as const : 'accessed' as const,
        timestamp: progress.lastAccessed
      }));

      const stats: LearningStats = {
        totalModules,
        completedModules,
        totalMaterials,
        completedMaterials,
        overallProgress,
        recentActivity
      };

      return serviceSuccess(stats);
    } catch (error) {
      this.handleError(error, 'LearningService.getUserLearningStats');
    }
  }

  // ===== ADMIN OPERATIONS =====

  /**
   * Get all modules for admin (with filters)
   */
  async getModulesForAdmin(
    filters: {
      category?: string;
      isPublished?: boolean;
      createdBy?: string;
      search?: string;
    } = {},
    limit: number = 20,
    offset: number = 0
  ): Promise<ServiceResult<any[]>> {
    try {
      const modules = await learningRepository.findModulesWithMaterials(filters, limit, offset);
      return serviceSuccess(modules);
    } catch (error) {
      this.handleError(error, 'LearningService.getModulesForAdmin');
    }
  }

  /**
   * Get count of modules for admin (with filters)
   */
  async getModulesCount(
    filters: {
      category?: string;
      isPublished?: boolean;
      createdBy?: string;
      search?: string;
    } = {}
  ): Promise<ServiceResult<number>> {
    try {
      const count = await learningRepository.countModules(filters);
      return serviceSuccess(count);
    } catch (error) {
      this.handleError(error, 'LearningService.getModulesCount');
    }
  }

  /**
   * Delete a module (admin only)
   */
  async deleteModule(moduleId: string, userId: string): Promise<ServiceResult<boolean>> {
    try {
      const module = await learningRepository.findModuleById(moduleId);
      if (!module) {
        return serviceError('Learning module not found', AwarenessLabErrorCode.MODULE_NOT_FOUND);
      }

      // Check if module has progress records
      const progressCount = await learningRepository.findProgress({ moduleId }, 1, 0);
      if (progressCount.length > 0) {
        return serviceError('Cannot delete module with user progress', 'MODULE_HAS_PROGRESS');
      }

      const deleted = await learningRepository.deleteModule(moduleId);

      this.audit({
        event: 'awareness.learning.module.deleted',
        userId,
        resource: moduleId,
        metadata: { title: module.title, category: module.category }
      });

      return serviceSuccess(deleted);
    } catch (error) {
      this.handleError(error, 'LearningService.deleteModule');
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Compute new material order from drag-and-drop operation
   * @deprecated Use materialOrganizationService.reorderMaterialsDragDrop instead
   */
  async computeReorderFromDrag(
    moduleId: string,
    draggedMaterialId: string,
    targetMaterialId: string
  ): Promise<ServiceResult<string[]>> {
    try {
      // Check if module exists
      const moduleExists = await learningRepository.moduleExists(moduleId);
      if (!moduleExists) {
        return serviceError('Learning module not found', AwarenessLabErrorCode.MODULE_NOT_FOUND);
      }

      // Get current materials in order
      const currentMaterials = await learningRepository.getModuleMaterials(moduleId);

      // Validate that both materials exist in this module
      const draggedIndex = currentMaterials.findIndex(m => m.id === draggedMaterialId);
      const targetIndex = currentMaterials.findIndex(m => m.id === targetMaterialId);

      if (draggedIndex === -1 || targetIndex === -1) {
        return serviceError('One or both materials not found in module', AwarenessLabErrorCode.MATERIAL_NOT_FOUND);
      }

      // Create new order by moving dragged item to target position
      const materialIds = currentMaterials.map(m => m.id);
      const [draggedItem] = materialIds.splice(draggedIndex, 1);
      materialIds.splice(targetIndex, 0, draggedItem);

      return serviceSuccess(materialIds);
    } catch (error) {
      this.handleError(error, 'LearningService.computeReorderFromDrag');
    }
  }

  /**
   * Reorder materials in a module using drag and drop
   */
  async reorderMaterialsDragDrop(
    moduleId: string,
    draggedMaterialId: string,
    targetMaterialId: string,
    position: 'before' | 'after',
    userId: string
  ): Promise<ServiceResult<any>> {
    try {
      return await materialOrganizationService.reorderMaterialsDragDrop(
        moduleId,
        { draggedMaterialId, targetMaterialId, position },
        userId
      );
    } catch (error) {
      this.handleError(error, 'LearningService.reorderMaterialsDragDrop');
    }
  }

  /**
   * Reorder materials in a module by explicit order
   */
  async reorderMaterials(
    moduleId: string,
    materialIds: string[],
    userId: string
  ): Promise<ServiceResult<any>> {
    try {
      return await materialOrganizationService.reorderMaterialsByOrder(
        moduleId,
        materialIds,
        userId
      );
    } catch (error) {
      this.handleError(error, 'LearningService.reorderMaterials');
    }
  }

  /**
   * Perform bulk operations on materials
   */
  async performBulkMaterialOperations(
    moduleId: string,
    operations: any[],
    userId: string
  ): Promise<ServiceResult<any>> {
    try {
      return await materialOrganizationService.performBulkMaterialOperations(
        moduleId,
        operations,
        userId
      );
    } catch (error) {
      this.handleError(error, 'LearningService.performBulkMaterialOperations');
    }
  }

  /**
   * Get material dependencies
   */
  async getMaterialDependencies(materialId: string): Promise<ServiceResult<any>> {
    try {
      return await materialOrganizationService.getMaterialDependencies(materialId);
    } catch (error) {
      this.handleError(error, 'LearningService.getMaterialDependencies');
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
      return await materialOrganizationService.safeDeleteMaterial(materialId, userId, force);
    } catch (error) {
      this.handleError(error, 'LearningService.safeDeleteMaterial');
    }
  }

  // ===== MODULE VALIDATION AND PUBLISHING =====

  /**
   * Validate module for publishing
   */
  async validateModuleForPublishing(moduleId: string): Promise<ServiceResult<any>> {
    try {
      return await modulePublishingService.validateModuleForPublishing(moduleId);
    } catch (error) {
      this.handleError(error, 'LearningService.validateModuleForPublishing');
    }
  }

  /**
   * Generate module preview for admin testing
   */
  async generateModulePreview(moduleId: string, userId: string): Promise<ServiceResult<any>> {
    try {
      return await modulePublishingService.generateModulePreview(moduleId, userId);
    } catch (error) {
      this.handleError(error, 'LearningService.generateModulePreview');
    }
  }

  /**
   * Perform module completeness check
   */
  async performModuleCompletenessCheck(moduleId: string): Promise<ServiceResult<any>> {
    try {
      return await modulePublishingService.performModuleCompletenessCheck(moduleId);
    } catch (error) {
      this.handleError(error, 'LearningService.performModuleCompletenessCheck');
    }
  }

  /**
   * Get publishing guidelines
   */
  async getPublishingGuidelines(): Promise<ServiceResult<any>> {
    try {
      return await modulePublishingService.getPublishingGuidelines();
    } catch (error) {
      this.handleError(error, 'LearningService.getPublishingGuidelines');
    }
  }

  // ===== PROGRESS VALIDATION AND ANALYTICS =====

  /**
   * Validate user's progress data
   */
  async validateUserProgress(userId: string): Promise<ServiceResult<any>> {
    try {
      return await progressValidationService.validateUserProgressData(userId);
    } catch (error) {
      this.handleError(error, 'LearningService.validateUserProgress');
    }
  }

  /**
   * Repair user's progress data
   */
  async repairUserProgress(
    userId: string,
    repairActions: any[],
    userConfirmation: boolean = false
  ): Promise<ServiceResult<any>> {
    try {
      return await progressValidationService.repairProgressData(userId, repairActions, userConfirmation);
    } catch (error) {
      this.handleError(error, 'LearningService.repairUserProgress');
    }
  }

  /**
   * Synchronize user's progress across sessions
   */
  async synchronizeUserProgress(userId: string): Promise<ServiceResult<any>> {
    try {
      return await progressValidationService.synchronizeProgressAcrossSessions(userId);
    } catch (error) {
      this.handleError(error, 'LearningService.synchronizeUserProgress');
    }
  }

  /**
   * Get comprehensive learning statistics
   */
  async getComprehensiveLearningStats(userId: string): Promise<ServiceResult<any>> {
    try {
      return await analyticsEnhancementService.generateComprehensiveLearningStats(userId);
    } catch (error) {
      this.handleError(error, 'LearningService.getComprehensiveLearningStats');
    }
  }

  /**
   * Recover interrupted progress
   */
  async recoverInterruptedProgress(
    userId: string,
    sessionId: string,
    lastKnownState: any
  ): Promise<ServiceResult<any>> {
    try {
      return await progressTrackingService.recoverInterruptedProgress(userId, sessionId, lastKnownState);
    } catch (error) {
      this.handleError(error, 'LearningService.recoverInterruptedProgress');
    }
  }

  /**
   * Validate completion status for a module
   */
  async validateModuleCompletionStatus(
    userId: string,
    moduleId: string
  ): Promise<ServiceResult<any>> {
    try {
      return await progressTrackingService.validateCompletionStatus(userId, moduleId);
    } catch (error) {
      this.handleError(error, 'LearningService.validateModuleCompletionStatus');
    }
  }

  // ===== ARCHIVE OPERATIONS =====

  /**
   * Archive a learning module instead of deleting when it has progress
   */
  async archiveModule(moduleId: string, userId: string): Promise<ServiceResult<boolean>> {
    try {
      const module = await learningRepository.findModuleById(moduleId);
      if (!module) {
        return serviceError('Learning module not found', AwarenessLabErrorCode.MODULE_NOT_FOUND);
      }

      const archived = await learningRepository.archiveModule(moduleId, userId);

      this.audit({
        event: 'awareness.learning.module.archived',
        userId,
        resource: moduleId,
        metadata: { title: module.title, category: module.category }
      });

      return serviceSuccess(archived);
    } catch (error) {
      this.handleError(error, 'LearningService.archiveModule');
    }
  }

  /**
   * Check if learning module can be deleted or should be archived
   */
  async canModuleBeDeleted(moduleId: string): Promise<ServiceResult<{ canDelete: boolean; reason?: string }>> {
    try {
      const canDelete = await learningRepository.canModuleBeDeleted(moduleId);

      if (!canDelete) {
        // Check if module has progress records
        const progressRecords = await learningRepository.findProgress({ moduleId }, 1, 0);
        if (progressRecords.length > 0) {
          return serviceSuccess({
            canDelete: false,
            reason: 'Module has user progress and must be archived instead'
          });
        }

        // Check if module is published
        const module = await learningRepository.findModuleById(moduleId);
        if (module?.isPublished) {
          return serviceSuccess({
            canDelete: false,
            reason: 'Published modules must be archived instead of deleted'
          });
        }

        return serviceSuccess({
          canDelete: false,
          reason: 'Module is too old to be safely deleted'
        });
      }

      return serviceSuccess({ canDelete: true });
    } catch (error) {
      this.handleError(error, 'LearningService.canModuleBeDeleted');
    }
  }
}

// Export singleton instance
export const learningService = new LearningService();
