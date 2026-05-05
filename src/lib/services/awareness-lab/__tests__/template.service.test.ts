import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TemplateService } from '../template.service';
import { templateRepository } from '@/lib/database/repositories/template-repository';
import { quizRepository } from '@/lib/database/repositories/quiz-repository';
import { AwarenessLabErrorCode } from '@/lib/errors/awareness-lab-errors';

// Mock dependencies
vi.mock('@/lib/database/repositories/template-repository');
vi.mock('@/lib/database/repositories/quiz-repository');

describe('TemplateService', () => {
  let templateService: TemplateService;
  let mockTemplateRepository: any;
  let mockQuizRepository: any;

  const mockTemplate = {
    id: 'template-123',
    createdBy: 'user-123',
    name: 'Test Template',
    description: 'A test quiz template',
    templateConfig: {
      timeLimitMinutes: 30,
      maxAttempts: 3,
      language: 'en' as const,
      questionTypes: ['mcq', 'true_false'],
      defaultQuestionCount: 10
    },
    usageCount: 5,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockQuiz = {
    id: 'quiz-123',
    title: 'Test Quiz',
    templateId: 'template-123',
    timeLimitMinutes: 30,
    maxAttempts: 3,
    language: 'en' as const
  };

  beforeEach(() => {
    templateService = new TemplateService();
    mockTemplateRepository = vi.mocked(templateRepository);
    mockQuizRepository = vi.mocked(quizRepository);

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createTemplate', () => {
    const validTemplateData = {
      name: 'Test Template',
      description: 'A test quiz template',
      templateConfig: {
        timeLimitMinutes: 30,
        maxAttempts: 3,
        language: 'en' as const,
        questionTypes: ['mcq', 'true_false'],
        defaultQuestionCount: 10
      }
    };

    it('should create template successfully', async () => {
      mockTemplateRepository.create.mockResolvedValue(mockTemplate);

      const result = await templateService.createTemplate('user-123', validTemplateData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTemplate);
      expect(mockTemplateRepository.create).toHaveBeenCalledWith('user-123', validTemplateData);
    });

    it('should validate question types', async () => {
      const invalidTemplateData = {
        ...validTemplateData,
        templateConfig: {
          ...validTemplateData.templateConfig,
          questionTypes: ['invalid_type']
        }
      };

      const result = await templateService.createTemplate('user-123', invalidTemplateData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid question types');
      expect(result.code).toBe(AwarenessLabErrorCode.INVALID_TEMPLATE_CONFIG);
    });

    it('should handle repository errors', async () => {
      mockTemplateRepository.create.mockRejectedValue(new Error('Database error'));

      const result = await templateService.createTemplate('user-123', validTemplateData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });
  });

  describe('updateTemplate', () => {
    const updateData = {
      name: 'Updated Template',
      description: 'Updated description',
      templateConfig: {
        timeLimitMinutes: 45,
        questionTypes: ['mcq']
      }
    };

    it('should update template successfully', async () => {
      mockTemplateRepository.findById.mockResolvedValue(mockTemplate);
      mockTemplateRepository.update.mockResolvedValue({ ...mockTemplate, ...updateData });

      const result = await templateService.updateTemplate('template-123', updateData, 'user-123');

      expect(result.success).toBe(true);
      expect(mockTemplateRepository.findById).toHaveBeenCalledWith('template-123');
      expect(mockTemplateRepository.update).toHaveBeenCalledWith('template-123', updateData);
    });

    it('should return error when template not found', async () => {
      mockTemplateRepository.findById.mockResolvedValue(null);

      const result = await templateService.updateTemplate('template-123', updateData, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Template not found');
      expect(result.code).toBe(AwarenessLabErrorCode.TEMPLATE_NOT_FOUND);
    });

    it('should validate question types in update', async () => {
      mockTemplateRepository.findById.mockResolvedValue(mockTemplate);

      const invalidUpdateData = {
        templateConfig: {
          questionTypes: ['invalid_type']
        }
      };

      const result = await templateService.updateTemplate('template-123', invalidUpdateData, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid question types');
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template successfully when not in use', async () => {
      const unusedTemplate = { ...mockTemplate, usageCount: 0 };
      mockTemplateRepository.findById.mockResolvedValue(unusedTemplate);
      mockTemplateRepository.delete.mockResolvedValue(true);

      const result = await templateService.deleteTemplate('template-123', 'user-123');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockTemplateRepository.delete).toHaveBeenCalledWith('template-123');
    });

    it('should return error when template is in use', async () => {
      mockTemplateRepository.findById.mockResolvedValue(mockTemplate);
      mockQuizRepository.findMany.mockResolvedValue([mockQuiz]);

      const result = await templateService.deleteTemplate('template-123', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Template is used by');
      expect(result.code).toBe(AwarenessLabErrorCode.TEMPLATE_IN_USE);
    });

    it('should return error when template not found', async () => {
      mockTemplateRepository.findById.mockResolvedValue(null);

      const result = await templateService.deleteTemplate('template-123', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Template not found');
    });
  });

  describe('useTemplate', () => {
    it('should use template successfully and increment usage count', async () => {
      mockTemplateRepository.getConfigForQuiz.mockResolvedValue(mockTemplate.templateConfig);

      const result = await templateService.useTemplate('template-123', 'user-456');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTemplate.templateConfig);
      expect(mockTemplateRepository.getConfigForQuiz).toHaveBeenCalledWith('template-123');
    });

    it('should return error when template not found', async () => {
      mockTemplateRepository.getConfigForQuiz.mockResolvedValue(null);

      const result = await templateService.useTemplate('template-123', 'user-456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Template not found');
      expect(result.code).toBe(AwarenessLabErrorCode.TEMPLATE_NOT_FOUND);
    });
  });

  describe('duplicateTemplate', () => {
    it('should duplicate template successfully', async () => {
      const duplicatedTemplate = { ...mockTemplate, id: 'template-456', name: 'Test Template (Copy)' };
      mockTemplateRepository.duplicate.mockResolvedValue(duplicatedTemplate);

      const result = await templateService.duplicateTemplate('template-123', 'user-456');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(duplicatedTemplate);
      expect(mockTemplateRepository.duplicate).toHaveBeenCalledWith('template-123', 'user-456', undefined);
    });

    it('should duplicate template with custom name', async () => {
      const customName = 'My Custom Template';
      const duplicatedTemplate = { ...mockTemplate, id: 'template-456', name: customName };
      mockTemplateRepository.duplicate.mockResolvedValue(duplicatedTemplate);

      const result = await templateService.duplicateTemplate('template-123', 'user-456', customName);

      expect(result.success).toBe(true);
      expect(mockTemplateRepository.duplicate).toHaveBeenCalledWith('template-123', 'user-456', customName);
    });

    it('should return error when template not found for duplication', async () => {
      mockTemplateRepository.duplicate.mockResolvedValue(null);

      const result = await templateService.duplicateTemplate('template-123', 'user-456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Template not found');
    });
  });

  describe('getPopularTemplates', () => {
    it('should return popular templates successfully', async () => {
      const popularTemplates = [
        { ...mockTemplate, usageCount: 10 },
        { ...mockTemplate, id: 'template-456', usageCount: 8 }
      ];
      mockTemplateRepository.findPopular.mockResolvedValue(popularTemplates);

      const result = await templateService.getPopularTemplates(5);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].usageCount).toBe(10);
      expect(mockTemplateRepository.findPopular).toHaveBeenCalledWith(5);
    });

    it('should handle empty popular templates list', async () => {
      mockTemplateRepository.findPopular.mockResolvedValue([]);

      const result = await templateService.getPopularTemplates();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('getTemplateUsageStats', () => {
    it('should return template usage statistics successfully', async () => {
      const usageStats = {
        totalUsage: 15,
        recentUsage: { lastMonth: 5, lastWeek: 2, lastDay: 0 },
        averageUsagePerMonth: 2.5
      };
      mockTemplateRepository.findById.mockResolvedValue(mockTemplate);
      mockTemplateRepository.getUsageStatistics.mockResolvedValue(usageStats);

      const result = await templateService.getTemplateUsageStats('template-123');

      expect(result.success).toBe(true);
      expect(result.data.totalUsage).toBe(15);
      expect(result.data.averageUsagePerMonth).toBe(2.5);
    });

    it('should return error when template not found', async () => {
      mockTemplateRepository.findById.mockResolvedValue(null);

      const result = await templateService.getTemplateUsageStats('template-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Template not found');
    });
  });

  describe('validateTemplateConfig', () => {
    const validConfig = {
      timeLimitMinutes: 30,
      maxAttempts: 3,
      language: 'en' as const,
      questionTypes: ['mcq', 'true_false'],
      defaultQuestionCount: 10
    };

    it('should validate valid template config', async () => {
      const result = await templateService.validateTemplateConfig(validConfig);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should reject invalid time limit', async () => {
      const invalidConfig = { ...validConfig, timeLimitMinutes: 0 };

      const result = await templateService.validateTemplateConfig(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Time limit must be between 1 and 180 minutes');
    });

    it('should reject invalid max attempts', async () => {
      const invalidConfig = { ...validConfig, maxAttempts: 0 };

      const result = await templateService.validateTemplateConfig(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Max attempts must be between 1 and 10');
    });

    it('should reject invalid language', async () => {
      const invalidConfig = { ...validConfig, language: 'fr' as any };

      const result = await templateService.validateTemplateConfig(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Language must be either "en" or "ar"');
    });

    it('should reject invalid question types', async () => {
      const invalidConfig = { ...validConfig, questionTypes: ['invalid_type'] };

      const result = await templateService.validateTemplateConfig(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid question types');
    });

    it('should reject empty question types', async () => {
      const invalidConfig = { ...validConfig, questionTypes: [] };

      const result = await templateService.validateTemplateConfig(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('At least one question type must be specified');
    });

    it('should reject invalid default question count', async () => {
      const invalidConfig = { ...validConfig, defaultQuestionCount: 0 };

      const result = await templateService.validateTemplateConfig(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Default question count must be between 1 and 50');
    });
  });

  describe('createTemplateFromQuiz', () => {
    const mockQuizWithQuestions = {
      ...mockQuiz,
      questions: [
        { questionType: 'mcq' },
        { questionType: 'true_false' },
        { questionType: 'mcq' }
      ]
    };

    it('should create template from quiz successfully', async () => {
      mockQuizRepository.findById.mockResolvedValue(mockQuiz);
      mockQuizRepository.getQuestions.mockResolvedValue(mockQuizWithQuestions.questions);
      mockTemplateRepository.create.mockResolvedValue(mockTemplate);

      const result = await templateService.createTemplateFromQuiz(
        'quiz-123',
        'Template from Quiz',
        'Generated from quiz',
        'user-123'
      );

      expect(result.success).toBe(true);
      expect(mockQuizRepository.findById).toHaveBeenCalledWith('quiz-123');
      expect(mockQuizRepository.getQuestions).toHaveBeenCalledWith('quiz-123');
    });

    it('should return error when quiz not found', async () => {
      mockQuizRepository.findById.mockResolvedValue(null);

      const result = await templateService.createTemplateFromQuiz(
        'quiz-123',
        'Template from Quiz',
        'Generated from quiz',
        'user-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Quiz not found');
    });
  });

  describe('getRecommendedTemplates', () => {
    it('should return popular templates for users with no history', async () => {
      mockQuizRepository.findMany.mockResolvedValue([]);
      mockTemplateRepository.findPopular.mockResolvedValue([mockTemplate]);

      const result = await templateService.getRecommendedTemplates('user-456', 5);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockTemplate]);
      expect(mockTemplateRepository.findPopular).toHaveBeenCalledWith(5);
    });

    it('should return personalized recommendations for users with history', async () => {
      const userQuizzes = [
        { language: 'en', timeLimitMinutes: 30, maxAttempts: 3 },
        { language: 'en', timeLimitMinutes: 45, maxAttempts: 2 }
      ];
      mockQuizRepository.findMany.mockResolvedValue(userQuizzes);
      mockTemplateRepository.findMany.mockResolvedValue([mockTemplate]);

      const result = await templateService.getRecommendedTemplates('user-456', 5);

      expect(result.success).toBe(true);
      expect(mockQuizRepository.findMany).toHaveBeenCalledWith({ createdBy: 'user-456' }, 10, 0);
      expect(mockTemplateRepository.findMany).toHaveBeenCalledWith({ language: 'en' }, 10, 0);
    });
  });

  describe('helper methods', () => {
    describe('getMostCommonLanguage', () => {
      it('should return most common language', () => {
        const quizzes = [
          { language: 'en' },
          { language: 'en' },
          { language: 'ar' }
        ];

        const result = (templateService as any).getMostCommonLanguage(quizzes);
        expect(result).toBe('en');
      });

      it('should handle single language', () => {
        const quizzes = [{ language: 'ar' }];

        const result = (templateService as any).getMostCommonLanguage(quizzes);
        expect(result).toBe('ar');
      });
    });

    describe('getAverageTimeLimit', () => {
      it('should calculate average time limit', () => {
        const quizzes = [
          { timeLimitMinutes: 30 },
          { timeLimitMinutes: 60 },
          { timeLimitMinutes: 45 }
        ];

        const result = (templateService as any).getAverageTimeLimit(quizzes);
        expect(result).toBe(45);
      });
    });

    describe('calculateTemplateScore', () => {
      it('should calculate template score based on preferences', () => {
        const template = {
          templateConfig: {
            language: 'en',
            timeLimitMinutes: 30,
            maxAttempts: 3
          },
          usageCount: 10
        };
        const preferences = {
          language: 'en',
          avgTimeLimit: 30,
          avgMaxAttempts: 3
        };

        const result = (templateService as any).calculateTemplateScore(template, preferences);
        expect(result).toBeGreaterThan(80); // Should score high for exact matches
      });

      it('should penalize templates with different preferences', () => {
        const template = {
          templateConfig: {
            language: 'ar',
            timeLimitMinutes: 120,
            maxAttempts: 1
          },
          usageCount: 1
        };
        const preferences = {
          language: 'en',
          avgTimeLimit: 30,
          avgMaxAttempts: 3
        };

        const result = (templateService as any).calculateTemplateScore(template, preferences);
        expect(result).toBeLessThan(50); // Should score low for mismatches
      });
    });
  });
});