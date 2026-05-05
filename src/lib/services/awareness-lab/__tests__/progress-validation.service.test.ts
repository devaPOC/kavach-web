import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProgressValidationService } from '../progress-validation.service';
import { learningRepository } from '@/lib/database/repositories/learning-repository';
import { transactionService } from '@/lib/database/transaction-service';

// Mock dependencies
vi.mock('@/lib/database/repositories/learning-repository');
vi.mock('@/lib/database/transaction-service');

const mockLearningRepository = vi.mocked(learningRepository);
const mockTransactionService = vi.mocked(transactionService);

describe('ProgressValidationService', () => {
  let progressValidationService: ProgressValidationService;

  beforeEach(() => {
    progressValidationService = new ProgressValidationService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateUserProgressData', () => {
    const mockUserId = 'user-123';
    const mockProgressRecords = [
      {
        id: 'progress-1',
        userId: mockUserId,
        moduleId: 'module-1',
        materialId: 'material-1',
        isCompleted: true,
        completedAt: new Date('2024-01-15T10:00:00Z'),
        lastAccessed: new Date('2024-01-15T10:00:00Z')
      },
      {
        id: 'progress-2',
        userId: mockUserId,
        moduleId: 'module-2',
        materialId: 'material-2',
        isCompleted: true,
        completedAt: null, // Missing completion timestamp
        lastAccessed: new Date('2024-01-16T10:00:00Z')
      },
      {
        id: 'progress-3',
        userId: mockUserId,
        moduleId: 'module-3',
        materialId: 'material-3',
        isCompleted: false,
        completedAt: null,
        lastAccessed: new Date('2024-01-17T10:00:00Z')
      }
    ];

    it('should validate user progress data successfully with no issues', async () => {
      const validProgressRecords = [mockProgressRecords[0], mockProgressRecords[2]]; // Only valid records
      
      mockLearningRepository.findProgress.mockResolvedValue(validProgressRecords);
      mockLearningRepository.moduleExists.mockResolvedValue(true);
      mockLearningRepository.materialExists.mockResolvedValue(true);

      const result = await progressValidationService.validateUserProgressData(mockUserId);

      expect(result.success).toBe(true);
      expect(result.data?.isValid).toBe(true);
      expect(result.data?.issues).toHaveLength(0);
      expect(result.data?.summary.validRecords).toBe(2);
      expect(result.data?.summary.invalidRecords).toBe(0);
    });

    it('should identify orphaned module references', async () => {
      mockLearningRepository.findProgress.mockResolvedValue([mockProgressRecords[0]]);
      mockLearningRepository.moduleExists.mockResolvedValue(false); // Module doesn't exist
      mockLearningRepository.materialExists.mockResolvedValue(true);

      const result = await progressValidationService.validateUserProgressData(mockUserId);

      expect(result.success).toBe(true);
      expect(result.data?.isValid).toBe(false);
      expect(result.data?.issues).toHaveLength(1);
      expect(result.data?.issues[0].type).toBe('orphaned_module');
      expect(result.data?.issues[0].severity).toBe('critical');
      expect(result.data?.summary.orphanedRecords).toBe(1);
    });

    it('should identify orphaned material references', async () => {
      mockLearningRepository.findProgress.mockResolvedValue([mockProgressRecords[0]]);
      mockLearningRepository.moduleExists.mockResolvedValue(true);
      mockLearningRepository.materialExists.mockResolvedValue(false); // Material doesn't exist

      const result = await progressValidationService.validateUserProgressData(mockUserId);

      expect(result.success).toBe(true);
      expect(result.data?.isValid).toBe(false);
      expect(result.data?.issues).toHaveLength(1);
      expect(result.data?.issues[0].type).toBe('orphaned_material');
      expect(result.data?.issues[0].severity).toBe('critical');
      expect(result.data?.summary.orphanedRecords).toBe(1);
    });

    it('should identify inconsistent completion status', async () => {
      mockLearningRepository.findProgress.mockResolvedValue([mockProgressRecords[1]]); // Missing completedAt
      mockLearningRepository.moduleExists.mockResolvedValue(true);
      mockLearningRepository.materialExists.mockResolvedValue(true);

      const result = await progressValidationService.validateUserProgressData(mockUserId);

      expect(result.success).toBe(true);
      expect(result.data?.isValid).toBe(false);
      expect(result.data?.issues).toHaveLength(1);
      expect(result.data?.issues[0].type).toBe('inconsistent_completion');
      expect(result.data?.issues[0].severity).toBe('warning');
      expect(result.data?.summary.inconsistentRecords).toBe(1);
    });

    it('should identify invalid timestamps', async () => {
      const invalidRecord = {
        ...mockProgressRecords[0],
        completedAt: new Date('2024-01-15T12:00:00Z'), // After lastAccessed
        lastAccessed: new Date('2024-01-15T10:00:00Z')
      };

      mockLearningRepository.findProgress.mockResolvedValue([invalidRecord]);
      mockLearningRepository.moduleExists.mockResolvedValue(true);
      mockLearningRepository.materialExists.mockResolvedValue(true);

      const result = await progressValidationService.validateUserProgressData(mockUserId);

      expect(result.success).toBe(true);
      expect(result.data?.isValid).toBe(false);
      expect(result.data?.issues).toHaveLength(1);
      expect(result.data?.issues[0].type).toBe('invalid_timestamp');
      expect(result.data?.issues[0].severity).toBe('warning');
    });

    it('should generate appropriate repair actions', async () => {
      mockLearningRepository.findProgress.mockResolvedValue([mockProgressRecords[1]]); // Inconsistent record
      mockLearningRepository.moduleExists.mockResolvedValue(true);
      mockLearningRepository.materialExists.mockResolvedValue(true);

      const result = await progressValidationService.validateUserProgressData(mockUserId);

      expect(result.success).toBe(true);
      expect(result.data?.repairActions).toHaveLength(1);
      expect(result.data?.repairActions[0].type).toBe('fix_completion_status');
      expect(result.data?.repairActions[0].riskLevel).toBe('low');
      expect(result.data?.repairActions[0].requiresUserConfirmation).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockLearningRepository.findProgress.mockRejectedValue(new Error('Database error'));

      const result = await progressValidationService.validateUserProgressData(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });
  });

  describe('repairProgressData', () => {
    const mockUserId = 'user-123';
    const mockRepairActions = [
      {
        type: 'delete_orphaned' as const,
        description: 'Delete orphaned records',
        affectedRecords: ['progress-1', 'progress-2'],
        riskLevel: 'low' as const,
        requiresUserConfirmation: false
      },
      {
        type: 'fix_completion_status' as const,
        description: 'Fix completion status',
        affectedRecords: ['progress-3'],
        riskLevel: 'low' as const,
        requiresUserConfirmation: false
      }
    ];

    it('should repair progress data successfully', async () => {
      mockTransactionService.executeInTransaction.mockImplementation(async (callback) => {
        const result = await callback({} as any);
        return { success: true, data: result };
      });

      const result = await progressValidationService.repairProgressData(
        mockUserId,
        mockRepairActions,
        false
      );

      expect(result.success).toBe(true);
      expect(result.data?.success).toBe(true);
      expect(result.data?.actionsPerformed).toBe(2);
      expect(mockTransactionService.executeInTransaction).toHaveBeenCalledOnce();
    });

    it('should skip actions requiring user confirmation when not provided', async () => {
      const actionsRequiringConfirmation = [
        {
          ...mockRepairActions[0],
          requiresUserConfirmation: true
        }
      ];

      mockTransactionService.executeInTransaction.mockImplementation(async (callback) => {
        const result = await callback({} as any);
        return { success: true, data: result };
      });

      const result = await progressValidationService.repairProgressData(
        mockUserId,
        actionsRequiringConfirmation,
        false // No confirmation
      );

      expect(result.success).toBe(true);
      expect(result.data?.actionsPerformed).toBe(0); // Should skip the action
    });

    it('should handle transaction failures', async () => {
      mockTransactionService.executeInTransaction.mockResolvedValue({
        success: false,
        error: 'Transaction failed'
      });

      const result = await progressValidationService.repairProgressData(
        mockUserId,
        mockRepairActions,
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Transaction failed');
    });
  });

  describe('synchronizeProgressAcrossSessions', () => {
    const mockUserId = 'user-123';

    it('should synchronize progress successfully', async () => {
      const mockProgressRecords = [
        {
          id: 'progress-1',
          userId: mockUserId,
          moduleId: 'module-1',
          materialId: 'material-1',
          lastAccessed: new Date('2024-01-15T10:00:00Z')
        },
        {
          id: 'progress-2',
          userId: mockUserId,
          moduleId: 'module-1',
          materialId: 'material-1', // Duplicate
          lastAccessed: new Date('2024-01-15T11:00:00Z') // More recent
        }
      ];

      mockLearningRepository.findProgress.mockResolvedValue(mockProgressRecords);
      mockTransactionService.executeInTransaction.mockImplementation(async (callback) => {
        // Mock the transaction callback to return expected data
        const mockTx = {};
        const result = await callback(mockTx);
        return { success: true, data: result };
      });

      const result = await progressValidationService.synchronizeProgressAcrossSessions(mockUserId);

      expect(result.success).toBe(true);
      expect(result.data?.syncedSessions).toBeGreaterThan(0);
      // Note: conflictsResolved might be 0 if no actual conflicts are processed in the mock
    });

    it('should handle synchronization errors', async () => {
      mockLearningRepository.findProgress.mockRejectedValue(new Error('Sync error'));

      const result = await progressValidationService.synchronizeProgressAcrossSessions(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Sync error');
    });
  });

  describe('validateAllProgressData', () => {
    it('should validate all progress data across users', async () => {
      const mockAllProgress = [
        {
          id: 'progress-1',
          userId: 'user-1',
          moduleId: 'module-1',
          materialId: 'material-1',
          isCompleted: true,
          completedAt: new Date(),
          lastAccessed: new Date()
        },
        {
          id: 'progress-2',
          userId: 'user-2',
          moduleId: 'module-2',
          materialId: 'material-2',
          isCompleted: false,
          completedAt: null,
          lastAccessed: new Date()
        }
      ];

      mockLearningRepository.findProgress.mockResolvedValue(mockAllProgress);
      mockLearningRepository.moduleExists.mockResolvedValue(true);
      mockLearningRepository.materialExists.mockResolvedValue(true);

      const result = await progressValidationService.validateAllProgressData();

      expect(result.success).toBe(true);
      expect(result.data?.summary.totalRecords).toBe(2);
      expect(mockLearningRepository.findProgress).toHaveBeenCalledWith({}, 10000, 0);
    });
  });
});