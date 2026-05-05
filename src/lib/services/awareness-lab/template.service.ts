import { BaseService, ServiceResult, serviceSuccess, serviceError } from '../base.service';
import { templateRepository } from '@/lib/database/repositories/template-repository';
import { quizRepository } from '@/lib/database/repositories/quiz-repository';
import { 
  TemplateError, 
  AwarenessLabErrorCode 
} from '@/lib/errors/awareness-lab-errors';
import { 
  quizTemplateSchema,
  type QuizTemplateData
} from '@/lib/validation/awareness-lab-schemas';

export interface TemplateUsageStats {
  templateId: string;
  totalUsage: number;
  recentUsage: {
    lastMonth: number;
    lastWeek: number;
    lastDay: number;
  };
  averageUsagePerMonth: number;
  createdAt: Date;
  lastUsed?: Date;
}

export interface TemplateConfig {
  timeLimitMinutes: number;
  maxAttempts: number;
  language: 'en' | 'ar';
  questionTypes: string[];
  defaultQuestionCount: number;
}

export interface PopularTemplate {
  id: string;
  name: string;
  description?: string;
  usageCount: number;
  config: TemplateConfig;
  createdBy: string;
  createdAt: Date;
}

/**
 * Service for managing quiz templates, creation, and usage tracking
 */
export class TemplateService extends BaseService {

  // ===== TEMPLATE MANAGEMENT =====

  /**
   * Create a new quiz template
   */
  async createTemplate(
    createdBy: string,
    templateData: QuizTemplateData
  ): Promise<ServiceResult<any>> {
    try {
      // Validate input data
      const validatedData = quizTemplateSchema.parse(templateData);

      // Validate question types
      const validQuestionTypes = ['mcq', 'true_false', 'multiple_select'];
      const invalidTypes = validatedData.templateConfig.questionTypes.filter(
        type => !validQuestionTypes.includes(type)
      );

      if (invalidTypes.length > 0) {
        return serviceError(
          `Invalid question types: ${invalidTypes.join(', ')}`,
          AwarenessLabErrorCode.INVALID_TEMPLATE_CONFIG
        );
      }

      const template = await templateRepository.create(createdBy, {
        name: validatedData.name,
        description: validatedData.description,
        templateConfig: validatedData.templateConfig
      });

      this.audit({
        event: 'awareness.template.created',
        userId: createdBy,
        resource: template.id,
        metadata: { 
          name: validatedData.name,
          language: validatedData.templateConfig.language,
          questionTypes: validatedData.templateConfig.questionTypes
        }
      });

      return serviceSuccess(template);
    } catch (error) {
      this.handleError(error, 'TemplateService.createTemplate');
    }
  }

  /**
   * Update an existing template
   */
  async updateTemplate(
    templateId: string,
    updateData: Partial<QuizTemplateData>,
    userId: string
  ): Promise<ServiceResult<any>> {
    try {
      // Check if template exists
      const existingTemplate = await templateRepository.findById(templateId);
      if (!existingTemplate) {
        return serviceError('Template not found', AwarenessLabErrorCode.TEMPLATE_NOT_FOUND);
      }

      // Validate question types if being updated
      if (updateData.templateConfig?.questionTypes) {
        const validQuestionTypes = ['mcq', 'true_false', 'multiple_select'];
        const invalidTypes = updateData.templateConfig.questionTypes.filter(
          type => !validQuestionTypes.includes(type)
        );

        if (invalidTypes.length > 0) {
          return serviceError(
            `Invalid question types: ${invalidTypes.join(', ')}`,
            AwarenessLabErrorCode.INVALID_TEMPLATE_CONFIG
          );
        }
      }

      const template = await templateRepository.update(templateId, updateData);

      this.audit({
        event: 'awareness.template.updated',
        userId,
        resource: templateId,
        metadata: { 
          name: updateData.name || existingTemplate.name,
          hasConfigChanges: !!updateData.templateConfig
        }
      });

      return serviceSuccess(template);
    } catch (error) {
      this.handleError(error, 'TemplateService.updateTemplate');
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string, userId: string): Promise<ServiceResult<boolean>> {
    try {
      const template = await templateRepository.findById(templateId);
      if (!template) {
        return serviceError('Template not found', AwarenessLabErrorCode.TEMPLATE_NOT_FOUND);
      }

      // Check if template is in use
      if (template.usageCount > 0) {
        // Check if there are active quizzes using this template
        const quizzesUsingTemplate = await quizRepository.findMany({ templateId }, 1, 0);
        if (quizzesUsingTemplate.length > 0) {
          return serviceError(
            `Template is used by ${template.usageCount} quiz(es) and cannot be deleted`,
            AwarenessLabErrorCode.TEMPLATE_IN_USE
          );
        }
      }

      const deleted = await templateRepository.delete(templateId);

      this.audit({
        event: 'awareness.template.deleted',
        userId,
        resource: templateId,
        metadata: { 
          name: template.name,
          usageCount: template.usageCount
        }
      });

      return serviceSuccess(deleted);
    } catch (error) {
      this.handleError(error, 'TemplateService.deleteTemplate');
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<ServiceResult<any>> {
    try {
      const template = await templateRepository.findById(templateId);
      if (!template) {
        return serviceError('Template not found', AwarenessLabErrorCode.TEMPLATE_NOT_FOUND);
      }

      return serviceSuccess(template);
    } catch (error) {
      this.handleError(error, 'TemplateService.getTemplate');
    }
  }

  /**
   * Get template with usage statistics
   */
  async getTemplateWithUsage(templateId: string): Promise<ServiceResult<any>> {
    try {
      const template = await templateRepository.findByIdWithUsage(templateId);
      if (!template) {
        return serviceError('Template not found', AwarenessLabErrorCode.TEMPLATE_NOT_FOUND);
      }

      return serviceSuccess(template);
    } catch (error) {
      this.handleError(error, 'TemplateService.getTemplateWithUsage');
    }
  }

  /**
   * Get templates with filters
   */
  async getTemplates(
    filters: {
      createdBy?: string;
      language?: 'en' | 'ar';
      nameSearch?: string;
    } = {},
    limit: number = 20,
    offset: number = 0
  ): Promise<ServiceResult<any[]>> {
    try {
      const templates = await templateRepository.findMany(filters, limit, offset);
      return serviceSuccess(templates);
    } catch (error) {
      this.handleError(error, 'TemplateService.getTemplates');
    }
  }

  /**
   * Get templates by creator
   */
  async getTemplatesByCreator(
    createdBy: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ServiceResult<any[]>> {
    try {
      const templates = await templateRepository.findByCreator(createdBy, limit, offset);
      return serviceSuccess(templates);
    } catch (error) {
      this.handleError(error, 'TemplateService.getTemplatesByCreator');
    }
  }

  /**
   * Get popular templates (most used)
   */
  async getPopularTemplates(limit: number = 10): Promise<ServiceResult<PopularTemplate[]>> {
    try {
      const templates = await templateRepository.findPopular(limit);
      
      const popularTemplates: PopularTemplate[] = templates.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        usageCount: template.usageCount,
        config: template.templateConfig,
        createdBy: template.createdBy,
        createdAt: template.createdAt
      }));

      return serviceSuccess(popularTemplates);
    } catch (error) {
      this.handleError(error, 'TemplateService.getPopularTemplates');
    }
  }

  /**
   * Search templates by name or description
   */
  async searchTemplates(
    searchTerm: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ServiceResult<any[]>> {
    try {
      if (!searchTerm.trim()) {
        return serviceSuccess([]);
      }

      const templates = await templateRepository.search(searchTerm.trim(), limit, offset);
      return serviceSuccess(templates);
    } catch (error) {
      this.handleError(error, 'TemplateService.searchTemplates');
    }
  }

  // ===== TEMPLATE USAGE =====

  /**
   * Use template for quiz creation (increments usage count)
   */
  async useTemplate(templateId: string, userId: string): Promise<ServiceResult<TemplateConfig>> {
    try {
      const config = await templateRepository.getConfigForQuiz(templateId);
      if (!config) {
        return serviceError('Template not found', AwarenessLabErrorCode.TEMPLATE_NOT_FOUND);
      }

      this.audit({
        event: 'awareness.template.used',
        userId,
        resource: templateId,
        metadata: { 
          language: config.language,
          questionTypes: config.questionTypes
        }
      });

      return serviceSuccess(config);
    } catch (error) {
      this.handleError(error, 'TemplateService.useTemplate');
    }
  }

  /**
   * Duplicate an existing template
   */
  async duplicateTemplate(
    templateId: string,
    createdBy: string,
    newName?: string
  ): Promise<ServiceResult<any>> {
    try {
      const duplicatedTemplate = await templateRepository.duplicate(
        templateId,
        createdBy,
        newName
      );

      if (!duplicatedTemplate) {
        return serviceError('Template not found', AwarenessLabErrorCode.TEMPLATE_NOT_FOUND);
      }

      this.audit({
        event: 'awareness.template.duplicated',
        userId: createdBy,
        resource: duplicatedTemplate.id,
        metadata: { 
          originalTemplateId: templateId,
          newName: duplicatedTemplate.name
        }
      });

      return serviceSuccess(duplicatedTemplate);
    } catch (error) {
      this.handleError(error, 'TemplateService.duplicateTemplate');
    }
  }

  /**
   * Get template usage statistics
   */
  async getTemplateUsageStats(templateId: string): Promise<ServiceResult<TemplateUsageStats>> {
    try {
      const template = await templateRepository.findById(templateId);
      if (!template) {
        return serviceError('Template not found', AwarenessLabErrorCode.TEMPLATE_NOT_FOUND);
      }

      const usageStats = await templateRepository.getUsageStatistics(templateId);

      const result: TemplateUsageStats = {
        templateId,
        totalUsage: usageStats.totalUsage,
        recentUsage: usageStats.recentUsage,
        averageUsagePerMonth: usageStats.averageUsagePerMonth,
        createdAt: template.createdAt,
        lastUsed: undefined // Would need additional tracking
      };

      return serviceSuccess(result);
    } catch (error) {
      this.handleError(error, 'TemplateService.getTemplateUsageStats');
    }
  }

  /**
   * Get templates by language
   */
  async getTemplatesByLanguage(
    language: 'en' | 'ar',
    limit: number = 20,
    offset: number = 0
  ): Promise<ServiceResult<any[]>> {
    try {
      const templates = await templateRepository.findByLanguage(language, limit, offset);
      return serviceSuccess(templates);
    } catch (error) {
      this.handleError(error, 'TemplateService.getTemplatesByLanguage');
    }
  }

  // ===== TEMPLATE VALIDATION =====

  /**
   * Validate template configuration
   */
  async validateTemplateConfig(config: TemplateConfig): Promise<ServiceResult<boolean>> {
    try {
      // Validate time limit
      if (config.timeLimitMinutes < 1 || config.timeLimitMinutes > 180) {
        return serviceError(
          'Time limit must be between 1 and 180 minutes',
          AwarenessLabErrorCode.INVALID_TEMPLATE_CONFIG
        );
      }

      // Validate attempt limit
      if (config.maxAttempts < 1 || config.maxAttempts > 10) {
        return serviceError(
          'Max attempts must be between 1 and 10',
          AwarenessLabErrorCode.INVALID_TEMPLATE_CONFIG
        );
      }

      // Validate language
      if (!['en', 'ar'].includes(config.language)) {
        return serviceError(
          'Language must be either "en" or "ar"',
          AwarenessLabErrorCode.INVALID_TEMPLATE_CONFIG
        );
      }

      // Validate question types
      const validQuestionTypes = ['mcq', 'true_false', 'multiple_select'];
      const invalidTypes = config.questionTypes.filter(
        type => !validQuestionTypes.includes(type)
      );

      if (invalidTypes.length > 0) {
        return serviceError(
          `Invalid question types: ${invalidTypes.join(', ')}`,
          AwarenessLabErrorCode.INVALID_TEMPLATE_CONFIG
        );
      }

      if (config.questionTypes.length === 0) {
        return serviceError(
          'At least one question type must be specified',
          AwarenessLabErrorCode.INVALID_TEMPLATE_CONFIG
        );
      }

      // Validate default question count
      if (config.defaultQuestionCount < 1 || config.defaultQuestionCount > 50) {
        return serviceError(
          'Default question count must be between 1 and 50',
          AwarenessLabErrorCode.INVALID_TEMPLATE_CONFIG
        );
      }

      return serviceSuccess(true);
    } catch (error) {
      this.handleError(error, 'TemplateService.validateTemplateConfig');
    }
  }

  /**
   * Create template from existing quiz
   */
  async createTemplateFromQuiz(
    quizId: string,
    templateName: string,
    templateDescription: string | undefined,
    createdBy: string
  ): Promise<ServiceResult<any>> {
    try {
      const quiz = await quizRepository.findById(quizId);
      if (!quiz) {
        return serviceError('Quiz not found', AwarenessLabErrorCode.QUIZ_NOT_FOUND);
      }

      // Get question types from quiz questions
      const questions = await quizRepository.getQuestions(quizId);
      const questionTypes = [...new Set(questions.map(q => q.questionType))];

      const templateData: QuizTemplateData = {
        name: templateName,
        description: templateDescription,
        templateConfig: {
          timeLimitMinutes: quiz.timeLimitMinutes,
          maxAttempts: quiz.maxAttempts,
          language: quiz.language,
          questionTypes,
          defaultQuestionCount: questions.length
        }
      };

      const template = await this.createTemplate(createdBy, templateData);

      if (template.success) {
        this.audit({
          event: 'awareness.template.created',
          userId: createdBy,
          resource: template.data.id,
          metadata: { 
            sourceQuizId: quizId,
            templateName,
            questionCount: questions.length
          }
        });
      }

      return template;
    } catch (error) {
      this.handleError(error, 'TemplateService.createTemplateFromQuiz');
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Check if user owns template
   */
  async checkTemplateOwnership(
    templateId: string,
    userId: string
  ): Promise<ServiceResult<boolean>> {
    try {
      const isOwner = await templateRepository.isOwner(templateId, userId);
      return serviceSuccess(isOwner);
    } catch (error) {
      this.handleError(error, 'TemplateService.checkTemplateOwnership');
    }
  }

  /**
   * Get template count with filters
   */
  async getTemplateCount(
    filters: {
      createdBy?: string;
      language?: 'en' | 'ar';
      nameSearch?: string;
    } = {}
  ): Promise<ServiceResult<number>> {
    try {
      const count = await templateRepository.count(filters);
      return serviceSuccess(count);
    } catch (error) {
      this.handleError(error, 'TemplateService.getTemplateCount');
    }
  }

  /**
   * Increment template usage count manually (for external usage tracking)
   */
  async incrementUsage(templateId: string, userId: string): Promise<ServiceResult<any>> {
    try {
      const template = await templateRepository.incrementUsage(templateId);
      if (!template) {
        return serviceError('Template not found', AwarenessLabErrorCode.TEMPLATE_NOT_FOUND);
      }

      this.audit({
        event: 'awareness.template.used',
        userId,
        resource: templateId,
        metadata: { newUsageCount: template.usageCount }
      });

      return serviceSuccess(template);
    } catch (error) {
      this.handleError(error, 'TemplateService.incrementUsage');
    }
  }

  /**
   * Get recommended templates based on user's quiz creation history
   */
  async getRecommendedTemplates(
    userId: string,
    limit: number = 5
  ): Promise<ServiceResult<any[]>> {
    try {
      // Get user's created quizzes to understand preferences
      const userQuizzes = await quizRepository.findMany({ createdBy: userId }, 10, 0);
      
      if (userQuizzes.length === 0) {
        // If no history, return popular templates
        const popularResult = await this.getPopularTemplates(limit);
        return popularResult;
      }

      // Analyze user preferences
      const languagePreference = this.getMostCommonLanguage(userQuizzes);
      const avgTimeLimit = this.getAverageTimeLimit(userQuizzes);
      const avgMaxAttempts = this.getAverageMaxAttempts(userQuizzes);

      // Find templates matching preferences
      const matchingTemplates = await templateRepository.findMany({
        language: languagePreference
      }, limit * 2, 0);

      // Score templates based on similarity to user preferences
      const scoredTemplates = matchingTemplates
        .map(template => ({
          ...template,
          score: this.calculateTemplateScore(template, {
            language: languagePreference,
            avgTimeLimit,
            avgMaxAttempts
          })
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return serviceSuccess(scoredTemplates);
    } catch (error) {
      this.handleError(error, 'TemplateService.getRecommendedTemplates');
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  private getMostCommonLanguage(quizzes: any[]): 'en' | 'ar' {
    const languageCounts = quizzes.reduce((acc, quiz) => {
      acc[quiz.language] = (acc[quiz.language] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(languageCounts).reduce((a, b) => 
      languageCounts[a[0]] > languageCounts[b[0]] ? a : b
    )[0] as 'en' | 'ar';
  }

  private getAverageTimeLimit(quizzes: any[]): number {
    const sum = quizzes.reduce((acc, quiz) => acc + quiz.timeLimitMinutes, 0);
    return Math.round(sum / quizzes.length);
  }

  private getAverageMaxAttempts(quizzes: any[]): number {
    const sum = quizzes.reduce((acc, quiz) => acc + quiz.maxAttempts, 0);
    return Math.round(sum / quizzes.length);
  }

  private calculateTemplateScore(
    template: any,
    preferences: {
      language: 'en' | 'ar';
      avgTimeLimit: number;
      avgMaxAttempts: number;
    }
  ): number {
    let score = 0;

    // Language match (high weight)
    if (template.templateConfig.language === preferences.language) {
      score += 50;
    }

    // Time limit similarity (medium weight)
    const timeDiff = Math.abs(template.templateConfig.timeLimitMinutes - preferences.avgTimeLimit);
    score += Math.max(0, 25 - (timeDiff / 5)); // Decrease score as difference increases

    // Max attempts similarity (medium weight)
    const attemptsDiff = Math.abs(template.templateConfig.maxAttempts - preferences.avgMaxAttempts);
    score += Math.max(0, 15 - (attemptsDiff * 3)); // Decrease score as difference increases

    // Usage popularity (low weight)
    score += Math.min(10, template.usageCount / 10); // Cap at 10 points

    return score;
  }
}

// Export singleton instance
export const templateService = new TemplateService();