import { BaseService, ServiceResult, serviceSuccess, serviceError } from '../base.service';
import { learningRepository } from '@/lib/database/repositories/learning-repository';
import { transactionService } from '@/lib/database/transaction-service';
import { AwarenessLabErrorCode } from '@/lib/errors/awareness-lab-errors';
import { materialValidationService } from './material-validation.service';

export interface ModuleValidationResult {
  isValid: boolean;
  canPublish: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  completenessScore: number; // 0-100
  recommendations: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  recommendation: string;
}

export interface ModuleCompletenessCheck {
  hasTitle: boolean;
  hasDescription: boolean;
  hasCategory: boolean;
  hasMaterials: boolean;
  materialCount: number;
  allMaterialsValid: boolean;
  invalidMaterials: string[];
  hasValidOrder: boolean;
  estimatedDuration?: number;
}

export interface ModulePreviewData {
  module: any;
  materials: any[];
  validationResult: ModuleValidationResult;
  previewUrl?: string;
  estimatedCompletionTime: number;
}

/**
 * Service for module publishing, validation, and preview functionality
 */
export class ModulePublishingService extends BaseService {

  /**
   * Validate module for publishing
   */
  async validateModuleForPublishing(moduleId: string): Promise<ServiceResult<ModuleValidationResult>> {
    try {
      const module = await learningRepository.findModuleByIdWithMaterials(moduleId);
      if (!module) {
        return serviceError('Learning module not found', AwarenessLabErrorCode.MODULE_NOT_FOUND);
      }

      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      const recommendations: string[] = [];

      // Basic module validation
      const basicValidation = this.validateBasicModuleInfo(module);
      errors.push(...basicValidation.errors);
      warnings.push(...basicValidation.warnings);

      // Materials validation
      const materialsValidation = await this.validateModuleMaterials(module.materials || []);
      errors.push(...materialsValidation.errors);
      warnings.push(...materialsValidation.warnings);

      // Content completeness check
      const completenessCheck = this.performCompletenessCheck(module);
      if (completenessCheck.recommendations) {
        recommendations.push(...completenessCheck.recommendations);
      }

      // Calculate completeness score
      const completenessScore = this.calculateCompletenessScore(module, completenessCheck);

      // Determine if module can be published
      const canPublish = errors.length === 0 && completenessScore >= 70;

      // Add recommendations based on score
      if (completenessScore < 100) {
        recommendations.push(...this.generateRecommendations(completenessCheck, completenessScore));
      }

      const result: ModuleValidationResult = {
        isValid: errors.length === 0,
        canPublish,
        errors,
        warnings,
        completenessScore,
        recommendations
      };

      this.audit({
        event: 'awareness.learning.module.updated',
        resource: moduleId,
        metadata: {
          isValid: result.isValid,
          canPublish: result.canPublish,
          completenessScore: result.completenessScore,
          errorCount: errors.length,
          warningCount: warnings.length
        }
      });

      return serviceSuccess(result);
    } catch (error) {
      this.handleError(error, 'ModulePublishingService.validateModuleForPublishing');
    }
  }

  /**
   * Publish module with validation
   */
  async publishModule(
    moduleId: string,
    userId: string,
    skipValidation: boolean = false
  ): Promise<ServiceResult<any>> {
    try {
      // Validate module first unless skipped
      if (!skipValidation) {
        const validationResult = await this.validateModuleForPublishing(moduleId);
        if (!validationResult.success) {
          return validationResult;
        }

        if (!validationResult.data.canPublish) {
          return serviceError(
            'Module cannot be published due to validation errors',
            'MODULE_VALIDATION_FAILED',
            [validationResult.data]
          );
        }
      }

      // Publish the module
      const transactionResult = await transactionService.executeInTransaction(async (tx) => {
        const updatedModule = await learningRepository.updateModule(
          moduleId,
          { 
            isPublished: true
          },
          tx
        );

        // Update material order indices to ensure consistency
        const materials = await learningRepository.getModuleMaterials(moduleId);
        for (let i = 0; i < materials.length; i++) {
          const material = materials[i];
          if (material.orderIndex !== i + 1) {
            await learningRepository.updateMaterial(
              material.id,
              { orderIndex: i + 1 },
              tx
            );
          }
        }

        return updatedModule;
      }, 'ModulePublishingService.publishModule');

      if (!transactionResult.success) {
        return serviceError(transactionResult.error || 'Failed to publish module', 'TRANSACTION_FAILED');
      }

      const result = transactionResult.data!;

      this.audit({
        event: 'awareness.learning.module.published',
        userId,
        resource: moduleId,
        metadata: {
          skipValidation,
          publishedAt: new Date().toISOString()
        }
      });

      return serviceSuccess(result);
    } catch (error) {
      this.handleError(error, 'ModulePublishingService.publishModule');
    }
  }

  /**
   * Unpublish module
   */
  async unpublishModule(
    moduleId: string,
    userId: string,
    reason?: string
  ): Promise<ServiceResult<any>> {
    try {
      const module = await learningRepository.findModuleById(moduleId);
      if (!module) {
        return serviceError('Learning module not found', AwarenessLabErrorCode.MODULE_NOT_FOUND);
      }

      if (!module.isPublished) {
        return serviceError('Module is not currently published', 'MODULE_NOT_PUBLISHED');
      }

      // Check if module has active user progress
      const progressCount = await learningRepository.getModuleProgressCount(moduleId);
      if (progressCount > 0) {
        return serviceError(
          'Cannot unpublish module with active user progress. Consider archiving instead.',
          'MODULE_HAS_ACTIVE_PROGRESS'
        );
      }

      const updatedModule = await learningRepository.updateModule(moduleId, {
        isPublished: false
      });

      this.audit({
        event: 'awareness.learning.module.unpublished',
        userId,
        resource: moduleId,
        metadata: {
          reason,
          unpublishedAt: new Date().toISOString(),
          hadProgressCount: progressCount
        }
      });

      return serviceSuccess(updatedModule);
    } catch (error) {
      this.handleError(error, 'ModulePublishingService.unpublishModule');
    }
  }

  /**
   * Generate module preview for admin testing
   */
  async generateModulePreview(
    moduleId: string,
    userId: string
  ): Promise<ServiceResult<ModulePreviewData>> {
    try {
      const module = await learningRepository.findModuleByIdWithMaterials(moduleId);
      if (!module) {
        return serviceError('Learning module not found', AwarenessLabErrorCode.MODULE_NOT_FOUND);
      }

      // Validate module
      const validationResult = await this.validateModuleForPublishing(moduleId);
      if (!validationResult.success) {
        return validationResult;
      }

      // Calculate estimated completion time
      const estimatedCompletionTime = this.calculateEstimatedCompletionTime(module.materials || []);

      // Generate preview URL (this would be a temporary URL for admin preview)
      const previewUrl = this.generatePreviewUrl(moduleId, userId);

      const result: ModulePreviewData = {
        module,
        materials: module.materials || [],
        validationResult: validationResult.data,
        previewUrl,
        estimatedCompletionTime
      };

      this.audit({
        event: 'awareness.learning.module.created',
        userId,
        resource: moduleId,
        metadata: {
          materialCount: module.materials?.length || 0,
          estimatedCompletionTime,
          validationScore: validationResult.data.completenessScore
        }
      });

      return serviceSuccess(result);
    } catch (error) {
      this.handleError(error, 'ModulePublishingService.generateModulePreview');
    }
  }

  /**
   * Perform comprehensive module completeness check
   */
  async performModuleCompletenessCheck(moduleId: string): Promise<ServiceResult<ModuleCompletenessCheck>> {
    try {
      const module = await learningRepository.findModuleByIdWithMaterials(moduleId);
      if (!module) {
        return serviceError('Learning module not found', AwarenessLabErrorCode.MODULE_NOT_FOUND);
      }

      const completenessCheck = this.performCompletenessCheck(module);

      // Validate all materials
      const invalidMaterials: string[] = [];
      if (module.materials && module.materials.length > 0) {
        for (const material of module.materials) {
          const isValid = await this.validateSingleMaterial(material);
          if (!isValid) {
            invalidMaterials.push(material.id);
          }
        }
      }

      const result: ModuleCompletenessCheck = {
        ...completenessCheck,
        allMaterialsValid: invalidMaterials.length === 0,
        invalidMaterials,
        estimatedDuration: this.calculateEstimatedCompletionTime(module.materials || [])
      };

      return serviceSuccess(result);
    } catch (error) {
      this.handleError(error, 'ModulePublishingService.performModuleCompletenessCheck');
    }
  }

  /**
   * Get publishing guidelines and requirements
   */
  async getPublishingGuidelines(): Promise<ServiceResult<any>> {
    try {
      const guidelines = {
        requirements: {
          title: 'Module must have a clear, descriptive title (5-100 characters)',
          description: 'Module must have a detailed description (20-500 characters)',
          category: 'Module must be assigned to a valid category',
          materials: 'Module must contain at least 1 material',
          materialValidation: 'All materials must pass security and format validation'
        },
        recommendations: {
          materialCount: 'Modules should have 3-10 materials for optimal learning experience',
          duration: 'Estimated completion time should be 15-60 minutes',
          variety: 'Include different types of materials (videos, documents, links)',
          order: 'Materials should be logically ordered from basic to advanced',
          testing: 'Preview module before publishing to ensure quality'
        },
        bestPractices: {
          titles: 'Use clear, action-oriented titles for materials',
          descriptions: 'Provide helpful descriptions that explain what learners will gain',
          accessibility: 'Ensure materials are accessible to users with disabilities',
          mobile: 'Test materials on mobile devices for responsive design',
          languages: 'Consider providing materials in both Arabic and English'
        },
        validation: {
          completenessThreshold: 70,
          minimumMaterials: 1,
          maximumMaterials: 20,
          titleMinLength: 5,
          titleMaxLength: 100,
          descriptionMinLength: 20,
          descriptionMaxLength: 500
        }
      };

      return serviceSuccess(guidelines);
    } catch (error) {
      this.handleError(error, 'ModulePublishingService.getPublishingGuidelines');
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Validate basic module information
   */
  private validateBasicModuleInfo(module: any): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Title validation
    if (!module.title || module.title.trim().length === 0) {
      errors.push({
        field: 'title',
        message: 'Module title is required',
        severity: 'error',
        code: 'TITLE_REQUIRED'
      });
    } else if (module.title.length < 5) {
      errors.push({
        field: 'title',
        message: 'Module title must be at least 5 characters long',
        severity: 'error',
        code: 'TITLE_TOO_SHORT'
      });
    } else if (module.title.length > 100) {
      errors.push({
        field: 'title',
        message: 'Module title must not exceed 100 characters',
        severity: 'error',
        code: 'TITLE_TOO_LONG'
      });
    }

    // Description validation
    if (!module.description || module.description.trim().length === 0) {
      errors.push({
        field: 'description',
        message: 'Module description is required',
        severity: 'error',
        code: 'DESCRIPTION_REQUIRED'
      });
    } else if (module.description.length < 20) {
      warnings.push({
        field: 'description',
        message: 'Module description is quite short',
        recommendation: 'Consider adding more details about what learners will achieve'
      });
    } else if (module.description.length > 500) {
      warnings.push({
        field: 'description',
        message: 'Module description is very long',
        recommendation: 'Consider making the description more concise'
      });
    }

    // Category validation
    if (!module.category || module.category.trim().length === 0) {
      errors.push({
        field: 'category',
        message: 'Module category is required',
        severity: 'error',
        code: 'CATEGORY_REQUIRED'
      });
    }

    // Materials validation
    if (!module.materials || module.materials.length === 0) {
      errors.push({
        field: 'materials',
        message: 'Module must contain at least one material',
        severity: 'error',
        code: 'NO_MATERIALS'
      });
    } else if (module.materials.length > 20) {
      warnings.push({
        field: 'materials',
        message: 'Module has many materials',
        recommendation: 'Consider splitting into multiple modules for better learning experience'
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate module materials
   */
  private async validateModuleMaterials(materials: any[]): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (materials.length === 0) {
      return { errors, warnings };
    }

    // Check material order
    const orderIndices = materials.map(m => m.orderIndex).sort((a, b) => a - b);
    const expectedOrder = Array.from({ length: materials.length }, (_, i) => i + 1);
    
    if (JSON.stringify(orderIndices) !== JSON.stringify(expectedOrder)) {
      errors.push({
        field: 'materials',
        message: 'Material order indices are not sequential',
        severity: 'error',
        code: 'INVALID_MATERIAL_ORDER'
      });
    }

    // Validate individual materials
    for (let i = 0; i < materials.length; i++) {
      const material = materials[i];
      const materialErrors = await this.validateSingleMaterialDetailed(material, i);
      errors.push(...materialErrors.errors);
      warnings.push(...materialErrors.warnings);
    }

    // Check for material variety
    const materialTypes = [...new Set(materials.map(m => m.materialType))];
    if (materialTypes.length === 1 && materials.length > 3) {
      warnings.push({
        field: 'materials',
        message: 'All materials are of the same type',
        recommendation: 'Consider adding variety with different material types (videos, documents, links)'
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate a single material in detail
   */
  private async validateSingleMaterialDetailed(
    material: any, 
    index: number
  ): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const fieldPrefix = `materials[${index}]`;

    // Title validation
    if (!material.title || material.title.trim().length === 0) {
      errors.push({
        field: `${fieldPrefix}.title`,
        message: 'Material title is required',
        severity: 'error',
        code: 'MATERIAL_TITLE_REQUIRED'
      });
    }

    // Material data validation
    if (!material.materialData) {
      errors.push({
        field: `${fieldPrefix}.materialData`,
        message: 'Material data is required',
        severity: 'error',
        code: 'MATERIAL_DATA_REQUIRED'
      });
      return { errors, warnings };
    }

    // Type-specific validation
    switch (material.materialType) {
      case 'video':
      case 'link':
      case 'document':
        if (material.materialData.url) {
          const urlValidation = await materialValidationService.validateMaterialUrl(
            material.materialData.url,
            material.materialType
          );
          if (urlValidation.success && !urlValidation.data.isValid) {
            errors.push({
              field: `${fieldPrefix}.materialData.url`,
              message: urlValidation.data.reason || 'Invalid URL',
              severity: 'error',
              code: 'INVALID_MATERIAL_URL'
            });
          }
        }
        break;

      case 'embed':
        if (material.materialData.embedCode) {
          const embedValidation = await materialValidationService.sanitizeEmbedCode(
            material.materialData.embedCode
          );
          if (embedValidation.success && !embedValidation.data.isValid) {
            errors.push({
              field: `${fieldPrefix}.materialData.embedCode`,
              message: 'Invalid or unsafe embed code',
              severity: 'error',
              code: 'INVALID_EMBED_CODE'
            });
          }
        }
        break;
    }

    return { errors, warnings };
  }

  /**
   * Validate a single material (simple check)
   */
  private async validateSingleMaterial(material: any): Promise<boolean> {
    if (!material.title || !material.materialData) {
      return false;
    }

    // Basic validation based on material type
    switch (material.materialType) {
      case 'video':
      case 'link':
      case 'document':
        if (!material.materialData.url) return false;
        const urlValidation = await materialValidationService.validateMaterialUrl(
          material.materialData.url,
          material.materialType
        );
        return urlValidation.success && urlValidation.data.isValid;

      case 'embed':
        if (!material.materialData.embedCode) return false;
        const embedValidation = await materialValidationService.sanitizeEmbedCode(
          material.materialData.embedCode
        );
        return embedValidation.success && embedValidation.data.isValid;

      default:
        return true;
    }
  }

  /**
   * Perform completeness check
   */
  private performCompletenessCheck(module: any): ModuleCompletenessCheck & { recommendations?: string[] } {
    const recommendations: string[] = [];

    const hasTitle = !!(module.title && module.title.trim().length >= 5);
    const hasDescription = !!(module.description && module.description.trim().length >= 20);
    const hasCategory = !!(module.category && module.category.trim().length > 0);
    const hasMaterials = !!(module.materials && module.materials.length > 0);
    const materialCount = module.materials?.length || 0;

    // Check material order
    let hasValidOrder = true;
    if (module.materials && module.materials.length > 0) {
      const orderIndices = module.materials.map((m: any) => m.orderIndex).sort((a: number, b: number) => a - b);
      const expectedOrder = Array.from({ length: module.materials.length }, (_, i) => i + 1);
      hasValidOrder = JSON.stringify(orderIndices) === JSON.stringify(expectedOrder);
    }

    // Generate recommendations
    if (!hasTitle) recommendations.push('Add a clear, descriptive title');
    if (!hasDescription) recommendations.push('Add a detailed description explaining the learning objectives');
    if (!hasCategory) recommendations.push('Assign the module to an appropriate category');
    if (!hasMaterials) recommendations.push('Add at least one learning material');
    if (materialCount > 0 && materialCount < 3) recommendations.push('Consider adding more materials for a comprehensive learning experience');
    if (!hasValidOrder) recommendations.push('Fix material ordering to ensure sequential indices');

    return {
      hasTitle,
      hasDescription,
      hasCategory,
      hasMaterials,
      materialCount,
      allMaterialsValid: true, // Will be updated by caller
      invalidMaterials: [], // Will be updated by caller
      hasValidOrder,
      recommendations
    };
  }

  /**
   * Calculate completeness score
   */
  private calculateCompletenessScore(module: any, completenessCheck: ModuleCompletenessCheck): number {
    let score = 0;

    // Basic requirements (60 points total)
    if (completenessCheck.hasTitle) score += 15;
    if (completenessCheck.hasDescription) score += 15;
    if (completenessCheck.hasCategory) score += 10;
    if (completenessCheck.hasMaterials) score += 20;

    // Quality factors (40 points total)
    if (completenessCheck.materialCount >= 3) score += 10;
    if (completenessCheck.materialCount >= 5) score += 5;
    if (completenessCheck.allMaterialsValid) score += 15;
    if (completenessCheck.hasValidOrder) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Generate recommendations based on completeness
   */
  private generateRecommendations(completenessCheck: ModuleCompletenessCheck, score: number): string[] {
    const recommendations: string[] = [];

    if (score < 70) {
      recommendations.push('Module needs improvement before publishing');
    }

    if (completenessCheck.materialCount < 3) {
      recommendations.push('Add more materials to provide a comprehensive learning experience');
    }

    if (!completenessCheck.allMaterialsValid) {
      recommendations.push('Fix invalid materials before publishing');
    }

    if (!completenessCheck.hasValidOrder) {
      recommendations.push('Reorder materials to ensure proper sequencing');
    }

    return recommendations;
  }

  /**
   * Calculate estimated completion time for materials
   */
  private calculateEstimatedCompletionTime(materials: any[]): number {
    let totalMinutes = 0;

    for (const material of materials) {
      switch (material.materialType) {
        case 'video':
          totalMinutes += 10; // Assume 10 minutes per video
          break;
        case 'document':
          totalMinutes += 15; // Assume 15 minutes per document
          break;
        case 'link':
          totalMinutes += 5; // Assume 5 minutes per link
          break;
        case 'embed':
          totalMinutes += 8; // Assume 8 minutes per embed
          break;
        default:
          totalMinutes += 5;
      }
    }

    return totalMinutes;
  }

  /**
   * Generate preview URL for admin testing
   */
  private generatePreviewUrl(moduleId: string, userId: string): string {
    // In a real implementation, this would generate a secure, temporary URL
    // that allows admin users to preview the module before publishing
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const previewToken = Buffer.from(`${moduleId}:${userId}:${Date.now()}`).toString('base64');
    return `${baseUrl}/admin/preview/module/${moduleId}?token=${previewToken}`;
  }
}

// Export singleton instance
export const modulePublishingService = new ModulePublishingService();