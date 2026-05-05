import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  QuizRepository, 
  QuizAttemptRepository, 
  LearningRepository, 
  TemplateRepository, 
  AnalyticsRepository 
} from '../index';

// Mock the database connection
vi.mock('../connection', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn()
  }
}));

describe('Awareness Lab Repositories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('QuizRepository', () => {
    it('should create an instance', () => {
      const repository = new QuizRepository();
      expect(repository).toBeInstanceOf(QuizRepository);
    });

    it('should have all required methods', () => {
      const repository = new QuizRepository();
      
      // Check that all expected methods exist
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.findByIdWithQuestions).toBe('function');
      expect(typeof repository.findMany).toBe('function');
      expect(typeof repository.findPublished).toBe('function');
      expect(typeof repository.update).toBe('function');
      expect(typeof repository.delete).toBe('function');
      expect(typeof repository.addQuestion).toBe('function');
      expect(typeof repository.updateQuestion).toBe('function');
      expect(typeof repository.deleteQuestion).toBe('function');
      expect(typeof repository.getQuestions).toBe('function');
      expect(typeof repository.exists).toBe('function');
    });
  });

  describe('QuizAttemptRepository', () => {
    it('should create an instance', () => {
      const repository = new QuizAttemptRepository();
      expect(repository).toBeInstanceOf(QuizAttemptRepository);
    });

    it('should have all required methods', () => {
      const repository = new QuizAttemptRepository();
      
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.findByIdWithDetails).toBe('function');
      expect(typeof repository.findMany).toBe('function');
      expect(typeof repository.findUserAttempts).toBe('function');
      expect(typeof repository.update).toBe('function');
      expect(typeof repository.submit).toBe('function');
      expect(typeof repository.delete).toBe('function');
      expect(typeof repository.countUserAttempts).toBe('function');
      expect(typeof repository.getUserBestScore).toBe('function');
      expect(typeof repository.getUserQuizProgress).toBe('function');
      expect(typeof repository.getQuizStatistics).toBe('function');
    });
  });

  describe('LearningRepository', () => {
    it('should create an instance', () => {
      const repository = new LearningRepository();
      expect(repository).toBeInstanceOf(LearningRepository);
    });

    it('should have all required methods', () => {
      const repository = new LearningRepository();
      
      // Module methods
      expect(typeof repository.createModule).toBe('function');
      expect(typeof repository.findModuleById).toBe('function');
      expect(typeof repository.findModuleByIdWithMaterials).toBe('function');
      expect(typeof repository.findModules).toBe('function');
      expect(typeof repository.findPublishedModules).toBe('function');
      expect(typeof repository.updateModule).toBe('function');
      expect(typeof repository.deleteModule).toBe('function');
      
      // Material methods
      expect(typeof repository.addMaterial).toBe('function');
      expect(typeof repository.findMaterialById).toBe('function');
      expect(typeof repository.updateMaterial).toBe('function');
      expect(typeof repository.deleteMaterial).toBe('function');
      expect(typeof repository.getModuleMaterials).toBe('function');
      
      // Progress methods
      expect(typeof repository.markMaterialCompleted).toBe('function');
      expect(typeof repository.trackMaterialAccess).toBe('function');
      expect(typeof repository.getUserModuleProgress).toBe('function');
      expect(typeof repository.getUserAllModulesProgress).toBe('function');
    });
  });

  describe('TemplateRepository', () => {
    it('should create an instance', () => {
      const repository = new TemplateRepository();
      expect(repository).toBeInstanceOf(TemplateRepository);
    });

    it('should have all required methods', () => {
      const repository = new TemplateRepository();
      
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.findByIdWithUsage).toBe('function');
      expect(typeof repository.findMany).toBe('function');
      expect(typeof repository.findByCreator).toBe('function');
      expect(typeof repository.findPopular).toBe('function');
      expect(typeof repository.update).toBe('function');
      expect(typeof repository.delete).toBe('function');
      expect(typeof repository.incrementUsage).toBe('function');
      expect(typeof repository.duplicate).toBe('function');
      expect(typeof repository.getConfigForQuiz).toBe('function');
    });
  });

  describe('AnalyticsRepository', () => {
    it('should create an instance', () => {
      const repository = new AnalyticsRepository();
      expect(repository).toBeInstanceOf(AnalyticsRepository);
    });

    it('should have all required methods', () => {
      const repository = new AnalyticsRepository();
      
      expect(typeof repository.getQuizAnalytics).toBe('function');
      expect(typeof repository.getQuestionAnalytics).toBe('function');
      expect(typeof repository.getOverviewAnalytics).toBe('function');
      expect(typeof repository.getUserProgressAnalytics).toBe('function');
      expect(typeof repository.getLearningAnalytics).toBe('function');
      expect(typeof repository.getQuizLeaderboard).toBe('function');
      expect(typeof repository.getMultipleQuizAnalytics).toBe('function');
      expect(typeof repository.getEngagementMetrics).toBe('function');
    });
  });

  describe('Repository Exports', () => {
    it('should export singleton instances', async () => {
      const { 
        quizRepository, 
        quizAttemptRepository, 
        learningRepository, 
        templateRepository, 
        analyticsRepository 
      } = await import('../index');
      
      expect(quizRepository).toBeInstanceOf(QuizRepository);
      expect(quizAttemptRepository).toBeInstanceOf(QuizAttemptRepository);
      expect(learningRepository).toBeInstanceOf(LearningRepository);
      expect(templateRepository).toBeInstanceOf(TemplateRepository);
      expect(analyticsRepository).toBeInstanceOf(AnalyticsRepository);
    });
  });
});