import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TransactionService } from '../transaction-service';
import { ProfileTransaction } from '../profile-transaction';
import type { Transaction } from '../transaction-service';

// Mock the database connection
vi.mock('../connection', () => ({
  db: {
    transaction: vi.fn()
  }
}));

// Mock the logger
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

describe('TransactionService', () => {
  let transactionService: TransactionService;
  let mockTransaction: any;

  beforeEach(() => {
    transactionService = new TransactionService();
    mockTransaction = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis()
    };
    vi.clearAllMocks();
  });

  describe('executeInTransaction', () => {
    it('should execute operation successfully and return success result', async () => {
      const mockDb = await import('../connection');
      const mockOperation = vi.fn().mockResolvedValue({ id: '123', name: 'test' });
      
      (mockDb.db.transaction as any).mockImplementation(async (callback: any) => {
        return await callback(mockTransaction);
      });

      const result = await transactionService.executeInTransaction(mockOperation, 'test-operation');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: '123', name: 'test' });
      expect(result.error).toBeUndefined();
      expect(mockOperation).toHaveBeenCalledWith(mockTransaction);
    });

    it('should handle operation failure and return error result', async () => {
      const mockDb = await import('../connection');
      const mockOperation = vi.fn().mockRejectedValue(new Error('Operation failed'));
      
      (mockDb.db.transaction as any).mockImplementation(async (callback: any) => {
        return await callback(mockTransaction);
      });

      const result = await transactionService.executeInTransaction(mockOperation, 'test-operation');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Operation failed');
      expect(result.rollbackReason).toContain('Transaction failed during test-operation');
      expect(result.data).toBeUndefined();
    });

    it('should handle database transaction failure', async () => {
      const mockDb = await import('../connection');
      const mockOperation = vi.fn();
      
      (mockDb.db.transaction as any).mockRejectedValue(new Error('Database connection failed'));

      const result = await transactionService.executeInTransaction(mockOperation, 'test-operation');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(mockOperation).not.toHaveBeenCalled();
    });
  });

  describe('executeMultipleInTransaction', () => {
    it('should execute multiple operations successfully', async () => {
      const mockDb = await import('../connection');
      const operations = {
        createUser: vi.fn().mockResolvedValue({ id: 'user-123' }),
        createProfile: vi.fn().mockResolvedValue({ id: 'profile-123' })
      };
      
      (mockDb.db.transaction as any).mockImplementation(async (callback: any) => {
        return await callback(mockTransaction);
      });

      const result = await transactionService.executeMultipleInTransaction(operations, 'multi-operation');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        createUser: { id: 'user-123' },
        createProfile: { id: 'profile-123' }
      });
      expect(operations.createUser).toHaveBeenCalledWith(mockTransaction);
      expect(operations.createProfile).toHaveBeenCalledWith(mockTransaction);
    });

    it('should fail if any operation fails', async () => {
      const mockDb = await import('../connection');
      const operations = {
        createUser: vi.fn().mockResolvedValue({ id: 'user-123' }),
        createProfile: vi.fn().mockRejectedValue(new Error('Profile creation failed'))
      };
      
      (mockDb.db.transaction as any).mockImplementation(async (callback: any) => {
        return await callback(mockTransaction);
      });

      const result = await transactionService.executeMultipleInTransaction(operations, 'multi-operation');

      expect(result.success).toBe(false);
      expect(result.error).toContain("Operation 'createProfile' failed: Profile creation failed");
    });
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockDb = await import('../connection');
      const mockOperation = vi.fn().mockResolvedValue({ id: '123' });
      
      (mockDb.db.transaction as any).mockImplementation(async (callback: any) => {
        return await callback(mockTransaction);
      });

      const result = await transactionService.executeWithRetry(mockOperation, 3, 'retry-operation');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: '123' });
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockDb = await import('../connection');
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce({ id: '123' });
      
      (mockDb.db.transaction as any).mockImplementation(async (callback: any) => {
        return await callback(mockTransaction);
      });

      const result = await transactionService.executeWithRetry(mockOperation, 3, 'retry-operation');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: '123' });
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      const mockDb = await import('../connection');
      const mockOperation = vi.fn().mockRejectedValue(new Error('Always fails'));
      
      (mockDb.db.transaction as any).mockImplementation(async (callback: any) => {
        return await callback(mockTransaction);
      });

      const result = await transactionService.executeWithRetry(mockOperation, 2, 'retry-operation');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Always fails');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });
});

describe('ProfileTransaction', () => {
  let mockTransaction: Transaction;

  beforeEach(() => {
    mockTransaction = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis()
    } as any;
    vi.clearAllMocks();
  });

  describe('createExpertProfile', () => {
    it('should create expert profile successfully', async () => {
      const mockUser = { id: 'user-123', role: 'expert', email: 'test@example.com' };
      const mockProfile = { id: 'profile-123', userId: 'user-123' };
      const mockUpdatedUser = { ...mockUser, isProfileCompleted: true };

      // Create a more sophisticated mock that tracks call order
      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        callCount++;
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockImplementation(() => {
            if (callCount === 1) {
              return Promise.resolve([mockUser]); // User lookup
            } else if (callCount === 2) {
              return Promise.resolve([]); // No existing profile
            }
            return Promise.resolve([]);
          })
        };
      });

      const mockInsert = vi.fn().mockImplementation(() => ({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockProfile])
      }));

      const mockUpdate = vi.fn().mockImplementation(() => ({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockUpdatedUser])
      }));

      mockTransaction.select = mockSelect;
      mockTransaction.insert = mockInsert;
      mockTransaction.update = mockUpdate;

      const profileData = {
        phoneNumber: '+1234567890',
        areasOfSpecialization: 'Software Development'
      };

      const result = await ProfileTransaction.createExpertProfile(mockTransaction, 'user-123', profileData);

      expect(result.user).toEqual(mockUpdatedUser);
      expect(result.profile).toEqual(mockProfile);
      expect(result.profileType).toBe('expert');
    });

    it('should throw error if user not found', async () => {
      mockTransaction.select().from().where().limit = vi.fn().mockResolvedValue([]);

      const profileData = { phoneNumber: '+1234567890' };

      await expect(
        ProfileTransaction.createExpertProfile(mockTransaction, 'user-123', profileData)
      ).rejects.toThrow('User not found: user-123');
    });

    it('should throw error if user is not an expert', async () => {
      const mockUser = { id: 'user-123', role: 'customer', email: 'test@example.com' };
      mockTransaction.select().from().where().limit = vi.fn().mockResolvedValue([mockUser]);

      const profileData = { phoneNumber: '+1234567890' };

      await expect(
        ProfileTransaction.createExpertProfile(mockTransaction, 'user-123', profileData)
      ).rejects.toThrow('User user-123 is not an expert (role: customer)');
    });

    it('should throw error if profile already exists', async () => {
      const mockUser = { id: 'user-123', role: 'expert', email: 'test@example.com' };
      const mockExistingProfile = { id: 'existing-profile', userId: 'user-123' };

      mockTransaction.select().from().where().limit = vi.fn()
        .mockResolvedValueOnce([mockUser]) // User lookup
        .mockResolvedValueOnce([mockExistingProfile]); // Existing profile

      const profileData = { phoneNumber: '+1234567890' };

      await expect(
        ProfileTransaction.createExpertProfile(mockTransaction, 'user-123', profileData)
      ).rejects.toThrow('Expert profile already exists for user: user-123');
    });
  });

  describe('createCustomerProfile', () => {
    it('should create customer profile successfully', async () => {
      const mockUser = { id: 'user-123', role: 'customer', email: 'test@example.com' };
      const mockProfile = { id: 'profile-123', userId: 'user-123' };
      const mockUpdatedUser = { ...mockUser, isProfileCompleted: true, isApproved: true };

      // Create a more sophisticated mock that tracks call order
      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        callCount++;
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockImplementation(() => {
            if (callCount === 1) {
              return Promise.resolve([mockUser]); // User lookup
            } else if (callCount === 2) {
              return Promise.resolve([]); // No existing profile
            }
            return Promise.resolve([]);
          })
        };
      });

      const mockInsert = vi.fn().mockImplementation(() => ({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockProfile])
      }));

      const mockUpdate = vi.fn().mockImplementation(() => ({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockUpdatedUser])
      }));

      mockTransaction.select = mockSelect;
      mockTransaction.insert = mockInsert;
      mockTransaction.update = mockUpdate;

      const profileData = { phoneNumber: '+1234567890' };

      const result = await ProfileTransaction.createCustomerProfile(mockTransaction, 'user-123', profileData);

      expect(result.user).toEqual(mockUpdatedUser);
      expect(result.profile).toEqual(mockProfile);
      expect(result.profileType).toBe('customer');
    });
  });

  describe('updateUserStatus', () => {
    it('should update user status successfully', async () => {
      const mockUpdatedUser = { 
        id: 'user-123', 
        isProfileCompleted: true, 
        isApproved: true,
        updatedAt: expect.any(Date)
      };

      mockTransaction.update().set().where().returning = vi.fn().mockResolvedValue([mockUpdatedUser]);

      const statusUpdate = { isProfileCompleted: true, isApproved: true };

      const result = await ProfileTransaction.updateUserStatus(mockTransaction, 'user-123', statusUpdate);

      expect(result).toEqual(mockUpdatedUser);
    });

    it('should throw error if user not found', async () => {
      mockTransaction.update().set().where().returning = vi.fn().mockResolvedValue([]);

      const statusUpdate = { isProfileCompleted: true };

      await expect(
        ProfileTransaction.updateUserStatus(mockTransaction, 'user-123', statusUpdate)
      ).rejects.toThrow('Failed to update user status for user: user-123');
    });
  });
});