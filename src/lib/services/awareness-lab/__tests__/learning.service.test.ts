import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LearningService } from '../learning.service';
import { learningRepository } from '@/lib/database/repositories/learning-repository';
import { transactionService } from '@/lib/database/transaction-service';
import { AwarenessLabErrorCode } from '@/lib/errors/awareness-lab-errors';

// Mock dependencies
vi.mock('@/lib/database/repositories/learning-repository');
vi.mock('@/lib/database/transaction-service');

describe('LearningService', () => {
  let learningService: LearningService;
  let mockLearningRepository: any;
  let mockTransactionService: any;

  const mockModule = {
    id: 'module-123',
    createdBy: 'user-123',
    title: 'Test Module',
    description: 'A test learning module',
    category: 'Security',
    orderIndex: 1,
    isPublished: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    materials: [
      {
        id: 'material-1',
        moduleId: 'module-123',
        materialType: 'link' as const,
        title: 'Test Link',
        description: 'A test link',
        materialData: { url: 'https://example.com' },
        orderIndex: 1,
        createdAt: new Date()
      }
    ]
  };

  const mockMaterial = {
    id: 'material-123',
    moduleId: 'module-123',
    materialType: 'video' as const,
    title: 'Test Video',
    description: 'A test video',
    materialData: { url: 'https://youtube.com/watch?v=test' },
    orderIndex: 1,
    createdAt: new Date()
  };

  const mockProgress = {
    id: 'progress-123',
    userId: 'user-456',
    moduleId: 'module-123',
    materialId: 'material-123',
    isCompleted: true,
    completedAt: new Date(),
    lastAccessed: new Date()
  };

  beforeEach(() => {
    learningService = new LearningService();
    mockLearningRepository = vi.mocked(learningRepository);
    mockTransactionService = vi.mocked(transactionService);

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createModule', () => {
    const validModuleData = {
      title: 'Test Module',
      description: 'A test learning module',
      category: 'Security',
      orderIndex: 1,
      materials: [
        {
          materialType: 'link' as const,
          title: 'Test Link',
          description: 'A test link',
          materialData: { url: 'https://example.com' },
          orderIndex: 1
        }
      ]
    };

    it('should create module successfully', async () => {
      mockTransactionService.executeInTransaction.mockResolvedValue({
        success: true,
        data: mockModule
      });

      const result = await learningService.createModule('user-123', validModuleData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockModule);
      expect(mockTransactionService.executeInTransaction).toHaveBeenCalled();
    });

    it('should validate material URLs', async () => {
      const moduleDataWithInvalidUrl = {
        ...validModuleData,
        materials: [
          {
            materialType: 'link' as const,
            title: 'Invalid Link',
            description: 'An invalid link',
            materialData: { url: 'invalid-url' },
            orderIndex: 1
          }
        ]
      };

      // Mock URL validation to fail
      vi.doMock('@/lib/validation/awareness-lab-utils', () => ({
        isValidUrl: vi.fn().mockReturnValue(false),
        validateVideoUrl: vi.fn().mockReturnValue({ isValid: false })
      }));

      mockTransactionService.executeInTransaction.mockImplementation(async (callback) => {
        try {
          await callback({});
          return { success: true, data: mockModule };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      });

      const result = await learningService.createModule('user-123', moduleDataWithInvalidUrl);

      expect(result.success).toBe(false);
    });

    it('should handle transaction failure', async () => {
      mockTransactionService.executeInTransaction.mockResolvedValue({
        success: false,
        error: 'Database error'
      });

      const result = await learningService.createModule('user-123', validModuleData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('updateModule', () => {
    const updateData = {
      title: 'Updated Module',
      description: 'Updated description',
      isPublished: true
    };

    it('should update module successfully', async () => {
      mockLearningRepository.findModuleById.mockResolvedValue(mockModule);
      mockTransactionService.executeInTransaction.mockResolvedValue({
        success: true,
        data: { ...mockModule, ...updateData }
      });

      const result = await learningService.updateModule('module-123', updateData, 'user-123');

      expect(result.success).toBe(true);
      expect(mockLearningRepository.findModuleById).toHaveBeenCalledWith('module-123');
    });

    it('should return error when module not found', async () => {
      mockLearningRepository.findModuleById.mockResolvedValue(null);

      const result = await learningService.updateModule('module-123', updateData, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Learning module not found');
      expect(result.code).toBe(AwarenessLabErrorCode.MODULE_NOT_FOUND);
    });
  });

  describe('setModulePublished', () => {
    it('should publish module successfully when it has materials', async () => {
      mockLearningRepository.findModuleByIdWithMaterials.mockResolvedValue(mockModule);
      mockLearningRepository.updateModule.mockResolvedValue({ ...mockModule, isPublished: true });

      const result = await learningService.setModulePublished('module-123', true, 'user-123');

      expect(result.success).toBe(true);
      expect(mockLearningRepository.updateModule).toHaveBeenCalledWith('module-123', { isPublished: true });
    });

    it('should return error when trying to publish module without materials', async () => {
      const moduleWithoutMaterials = { ...mockModule, materials: [] };
      mockLearningRepository.findModuleByIdWithMaterials.mockResolvedValue(moduleWithoutMaterials);

      const result = await learningService.setModulePublished('module-123', true, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot publish module without materials');
    });

    it('should return error when module not found', async () => {
      mockLearningRepository.findModuleByIdWithMaterials.mockResolvedValue(null);

      const result = await learningService.setModulePublished('module-123', true, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Learning module not found');
    });
  });

  describe('addMaterial', () => {
    const validMaterialData = {
      materialType: 'video' as const,
      title: 'Test Video',
      description: 'A test video',
      materialData: { url: 'https://youtube.com/watch?v=test' },
      orderIndex: 1
    };

    it('should add material successfully', async () => {
      mockLearningRepository.moduleExists.mockResolvedValue(true);
      mockLearningRepository.addMaterial.mockResolvedValue(mockMaterial);

      // Mock URL validation to pass
      vi.doMock('@/lib/validation/awareness-lab-utils', () => ({
        isValidUrl: vi.fn().mockReturnValue(true),
        validateVideoUrl: vi.fn().mockReturnValue({ isValid: true })
      }));

      const result = await learningService.addMaterial('module-123', validMaterialData, 'user-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockMaterial);
      expect(mockLearningRepository.moduleExists).toHaveBeenCalledWith('module-123');
    });

    it('should return error when module not found', async () => {
      mockLearningRepository.moduleExists.mockResolvedValue(false);

      const result = await learningService.addMaterial('module-123', validMaterialData, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Learning module not found');
      expect(result.code).toBe(AwarenessLabErrorCode.MODULE_NOT_FOUND);
    });

    it('should validate material URL', async () => {
      mockLearningRepository.moduleExists.mockResolvedValue(true);

      // Mock URL validation to fail
      const invalidMaterialData = {
        ...validMaterialData,
        materialData: { url: 'invalid-url' }
      };

      const result = await learningService.addMaterial('module-123', invalidMaterialData, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid material URL');
    });

    it('should validate embed code when provided', async () => {
      mockLearningRepository.moduleExists.mockResolvedValue(true);

      const materialWithEmbed = {
        ...validMaterialData,
        materialData: { embedCode: '<script>alert("xss")</script>' }
      };

      const result = await learningService.addMaterial('module-123', materialWithEmbed, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Embed code contains invalid or unsafe elements');
    });
  });

  describe('markMaterialCompleted', () => {
    it('should mark material as completed successfully', async () => {
      mockLearningRepository.moduleExists.mockResolvedValue(true);
      mockLearningRepository.materialExists.mockResolvedValue(true);
      mockLearningRepository.markMaterialCompleted.mockResolvedValue(mockProgress);

      const result = await learningService.markMaterialCompleted('user-456', 'module-123', 'material-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProgress);
      expect(mockLearningRepository.markMaterialCompleted).toHaveBeenCalledWith('user-456', 'module-123', 'material-123');
    });

    it('should return error when module not found', async () => {
      mockLearningRepository.moduleExists.mockResolvedValue(false);

      const result = await learningService.markMaterialCompleted('user-456', 'module-123', 'material-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Learning module not found');
    });

    it('should return error when material not found', async () => {
      mockLearningRepository.moduleExists.mockResolvedValue(true);
      mockLearningRepository.materialExists.mockResolvedValue(false);

      const result = await learningService.markMaterialCompleted('user-456', 'module-123', 'material-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Learning material not found');
    });
  });

  describe('getUserModuleProgress', () => {
    const mockModuleProgress = {
      userId: 'user-456',
      moduleId: 'module-123',
      totalMaterials: 5,
      completedMaterials: 3,
      completionPercentage: 60,
      lastAccessed: new Date(),
      isModuleCompleted: false
    };

    it('should return user module progress successfully', async () => {
      mockLearningRepository.moduleExists.mockResolvedValue(true);
      mockLearningRepository.getUserModuleProgress.mockResolvedValue(mockModuleProgress);

      const result = await learningService.getUserModuleProgress('user-456', 'module-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockModuleProgress);
    });

    it('should return error when module not found', async () => {
      mockLearningRepository.moduleExists.mockResolvedValue(false);

      const result = await learningService.getUserModuleProgress('user-456', 'module-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Learning module not found');
    });
  });

  describe('getUserLearningStats', () => {
    const mockProgressList = [
      {
        moduleId: 'module-1',
        totalMaterials: 5,
        completedMaterials: 5,
        completionPercentage: 100,
        isModuleCompleted: true,
        lastAccessed: new Date()
      },
      {
        moduleId: 'module-2',
        totalMaterials: 3,
        completedMaterials: 1,
        completionPercentage: 33,
        isModuleCompleted: false,
        lastAccessed: new Date()
      }
    ];

    it('should return user learning statistics successfully', async () => {
      mockLearningRepository.getUserAllModulesProgress.mockResolvedValue(mockProgressList);
      mockLearningRepository.findProgress.mockResolvedValue([
        {
          moduleId: 'module-1',
          materialId: 'material-1',
          isCompleted: true,
          lastAccessed: new Date()
        }
      ]);

      const result = await learningService.getUserLearningStats('user-456');

      expect(result.success).toBe(true);
      expect(result.data.totalModules).toBe(2);
      expect(result.data.completedModules).toBe(1);
      expect(result.data.totalMaterials).toBe(8);
      expect(result.data.completedMaterials).toBe(6);
      expect(result.data.overallProgress).toBe(75);
    });

    it('should handle empty progress list', async () => {
      mockLearningRepository.getUserAllModulesProgress.mockResolvedValue([]);
      mockLearningRepository.findProgress.mockResolvedValue([]);

      const result = await learningService.getUserLearningStats('user-456');

      expect(result.success).toBe(true);
      expect(result.data.totalModules).toBe(0);
      expect(result.data.overallProgress).toBe(0);
    });
  });

  describe('deleteModule', () => {
    it('should delete module successfully when no progress exists', async () => {
      mockLearningRepository.findModuleById.mockResolvedValue(mockModule);
      mockLearningRepository.findProgress.mockResolvedValue([]);
      mockLearningRepository.deleteModule.mockResolvedValue(true);

      const result = await learningService.deleteModule('module-123', 'user-123');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockLearningRepository.deleteModule).toHaveBeenCalledWith('module-123');
    });

    it('should return error when module has progress', async () => {
      mockLearningRepository.findModuleById.mockResolvedValue(mockModule);
      mockLearningRepository.findProgress.mockResolvedValue([mockProgress]);

      const result = await learningService.deleteModule('module-123', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot delete module with user progress');
    });

    it('should return error when module not found', async () => {
      mockLearningRepository.findModuleById.mockResolvedValue(null);

      const result = await learningService.deleteModule('module-123', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Learning module not found');
    });
  });

  describe('validateMaterialUrl', () => {
    it('should validate valid URLs', () => {
      // Mock validation utilities
      vi.doMock('@/lib/validation/awareness-lab-utils', () => ({
        isValidUrl: vi.fn().mockReturnValue(true),
        validateVideoUrl: vi.fn().mockReturnValue({ isValid: true })
      }));

      const result = (learningService as any).validateMaterialUrl('https://example.com', 'link');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid URLs', () => {
      // Mock validation utilities
      vi.doMock('@/lib/validation/awareness-lab-utils', () => ({
        isValidUrl: vi.fn().mockReturnValue(false)
      }));

      const result = (learningService as any).validateMaterialUrl('invalid-url', 'link');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Invalid or unsafe URL format');
    });

    it('should validate video URLs specifically', () => {
      // Mock validation utilities
      vi.doMock('@/lib/validation/awareness-lab-utils', () => ({
        isValidUrl: vi.fn().mockReturnValue(true),
        validateVideoUrl: vi.fn().mockReturnValue({ isValid: false })
      }));

      const result = (learningService as any).validateMaterialUrl('https://example.com', 'video');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('not a valid video source');
    });

    it('should validate document URLs', () => {
      const result = (learningService as any).validateMaterialUrl('https://example.com/doc.pdf', 'document');
      expect(result.isValid).toBe(true);
    });

    it('should validate trusted document domains', () => {
      const result = (learningService as any).validateMaterialUrl('https://drive.google.com/file/d/123', 'document');
      expect(result.isValid).toBe(true);
    });

    it('should reject non-document URLs for document type', () => {
      const result = (learningService as any).validateMaterialUrl('https://example.com/page', 'document');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('does not appear to be a document');
    });
  });

  describe('validateEmbedCode', () => {
    it('should validate safe embed codes', () => {
      // Mock validation utility
      vi.doMock('@/lib/validation/awareness-lab-utils', () => ({
        validateEmbedCode: vi.fn().mockReturnValue(true)
      }));

      const result = (learningService as any).validateEmbedCode('<iframe src="https://youtube.com/embed/test"></iframe>');
      expect(result.isValid).toBe(true);
    });

    it('should reject unsafe embed codes', () => {
      // Mock validation utility
      vi.doMock('@/lib/validation/awareness-lab-utils', () => ({
        validateEmbedCode: vi.fn().mockReturnValue(false)
      }));

      const result = (learningService as any).validateEmbedCode('<script>alert("xss")</script>');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('invalid or unsafe elements');
    });
  });

  describe('reorderMaterials', () => {
    it('should reorder materials successfully', async () => {
      mockLearningRepository.moduleExists.mockResolvedValue(true);
      mockLearningRepository.reorderMaterials.mockResolvedValue(undefined);

      const materialIds = ['material-1', 'material-2', 'material-3'];
      const result = await learningService.reorderMaterials('module-123', materialIds, 'user-123');

      expect(result.success).toBe(true);
      expect(mockLearningRepository.reorderMaterials).toHaveBeenCalledWith(materialIds);
    });

    it('should return error when module not found', async () => {
      mockLearningRepository.moduleExists.mockResolvedValue(false);

      const result = await learningService.reorderMaterials('module-123', ['material-1'], 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Learning module not found');
    });
  });
});