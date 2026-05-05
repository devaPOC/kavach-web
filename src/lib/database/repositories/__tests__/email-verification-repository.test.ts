import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
process.env.USE_INMEM_DB = 'false';
import { EmailVerificationRepository } from '../email-verification-repository';
import type { EmailVerification } from '@/types/auth';

let mockDb: any;

vi.mock('drizzle-orm', () => ({
  eq: (field: any, value: any) => ({ field, value, type: 'eq' }),
  and: (...conditions: any[]) => ({ conditions, type: 'and' }),
  lt: (field: any, value: any) => ({ field, value, type: 'lt' }),
  gt: (field: any, value: any) => ({ field, value, type: 'gt' }),
}));
vi.mock('../../schema', () => ({
  emailVerifications: {
    id: 'emailVerifications.id',
    userId: 'emailVerifications.userId',
    token: 'emailVerifications.token',
    type: 'emailVerifications.type',
    expiresAt: 'emailVerifications.expiresAt',
    isUsed: 'emailVerifications.isUsed',
    createdAt: 'emailVerifications.createdAt',
  }
}));
import { emailVerifications as mockEmailVerifications } from '../../schema';

describe('EmailVerificationRepository', () => {
  let emailVerificationRepository: EmailVerificationRepository;

  const mockVerification: EmailVerification = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: '456e7890-e89b-12d3-a456-426614174001',
    token: 'verification-token-123',
    type: 'magic_link',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
    isUsed: false,
    createdAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockCreateData = {
    userId: '456e7890-e89b-12d3-a456-426614174001',
    token: 'verification-token-123',
    type: 'magic_link' as const,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  };

  beforeEach(() => {
    mockDb = {
      insert: vi.fn(),
      select: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    emailVerificationRepository = new EmailVerificationRepository(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new email verification successfully', async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockVerification]),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const result = await emailVerificationRepository.create(mockCreateData);

      expect(mockDb.insert).toHaveBeenCalledWith(mockEmailVerifications);
      expect(mockInsert.values).toHaveBeenCalledWith({
        ...mockCreateData,
        isUsed: false,
      });
      expect(mockInsert.returning).toHaveBeenCalled();
      expect(result).toEqual(mockVerification);
    });

    it('should throw error when verification creation fails', async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      await expect(emailVerificationRepository.create(mockCreateData))
        .rejects.toThrow('Failed to create email verification');
    });

    it('should handle database errors', async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(new Error('Database error')),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      await expect(emailVerificationRepository.create(mockCreateData))
        .rejects.toThrow('Failed to create email verification: Database error');
    });
  });

  describe('findByToken', () => {
    it('should find verification by token successfully', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockVerification]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await emailVerificationRepository.findByToken('verification-token-123');

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockSelect.from).toHaveBeenCalledWith(mockEmailVerifications);
      expect(mockSelect.where).toHaveBeenCalled();
      expect(mockSelect.limit).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockVerification);
    });

    it('should return null when verification not found', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await emailVerificationRepository.findByToken('nonexistent-token');

      expect(result).toBeNull();
    });
  });

  describe('findActiveByUserIdAndType', () => {
    it('should find active verification by user ID and type', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockVerification]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await emailVerificationRepository.findActiveByUserIdAndType(
        mockVerification.userId,
        'magic_link'
      );

      expect(result).toEqual(mockVerification);
    });

    it('should return null when no active verification found', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await emailVerificationRepository.findActiveByUserIdAndType(
        'nonexistent-user',
        'magic_link'
      );

      expect(result).toBeNull();
    });
  });

  describe('markAsUsed', () => {
    it('should mark verification as used successfully', async () => {
      const usedVerification = { ...mockVerification, isUsed: true };

      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([usedVerification]),
      };
      mockDb.update.mockReturnValue(mockUpdate);

      const result = await emailVerificationRepository.markAsUsed(mockVerification.id);

      expect(mockDb.update).toHaveBeenCalledWith(mockEmailVerifications);
      expect(mockUpdate.set).toHaveBeenCalledWith({ isUsed: true });
      expect(mockUpdate.where).toHaveBeenCalled();
      expect(mockUpdate.returning).toHaveBeenCalled();
      expect(result).toEqual(usedVerification);
    });

    it('should return null when verification not found', async () => {
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };
      mockDb.update.mockReturnValue(mockUpdate);

      const result = await emailVerificationRepository.markAsUsed('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('validateAndUse', () => {
    it('should validate and use verification token successfully', async () => {
      // Mock findByToken to return the verification
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockVerification]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      // Mock markAsUsed
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ ...mockVerification, isUsed: true }]),
      };
      mockDb.update.mockReturnValue(mockUpdate);

      const result = await emailVerificationRepository.validateAndUse('verification-token-123');

      expect(result.isValid).toBe(true);
      expect(result.userId).toBe(mockVerification.userId);
      expect(result.isExpired).toBeUndefined();
    });

    it('should return invalid for non-existent token', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await emailVerificationRepository.validateAndUse('nonexistent-token');

      expect(result.isValid).toBe(false);
      expect(result.userId).toBeUndefined();
    });

    it('should return invalid for already used token', async () => {
      const usedVerification = { ...mockVerification, isUsed: true };

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([usedVerification]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await emailVerificationRepository.validateAndUse('verification-token-123');

      expect(result.isValid).toBe(false);
      expect(result.userId).toBeUndefined();
    });

    it('should return invalid and expired for expired token', async () => {
      const expiredVerification = {
        ...mockVerification,
        expiresAt: new Date(Date.now() - 60 * 1000), // 1 minute ago
      };

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([expiredVerification]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await emailVerificationRepository.validateAndUse('verification-token-123');

      expect(result.isValid).toBe(false);
      expect(result.isExpired).toBe(true);
      expect(result.userId).toBe(expiredVerification.userId);
    });
  });

  describe('deleteExpired', () => {
    it('should delete expired verifications successfully', async () => {
      const mockDelete = {
        where: vi.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]),
      };
      mockDb.delete.mockReturnValue(mockDelete);

      const result = await emailVerificationRepository.deleteExpired();

      expect(mockDb.delete).toHaveBeenCalledWith(mockEmailVerifications);
      expect(mockDelete.where).toHaveBeenCalled();
      expect(result).toBe(2);
    });

    it('should return 0 when no expired verifications found', async () => {
      const mockDelete = {
        where: vi.fn().mockResolvedValue([]),
      };
      mockDb.delete.mockReturnValue(mockDelete);

      const result = await emailVerificationRepository.deleteExpired();

      expect(result).toBe(0);
    });
  });

  describe('deleteByUserId', () => {
    it('should delete all verifications for a user', async () => {
      const mockDelete = {
        where: vi.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]),
      };
      mockDb.delete.mockReturnValue(mockDelete);

      const result = await emailVerificationRepository.deleteByUserId(mockVerification.userId);

      expect(mockDb.delete).toHaveBeenCalledWith(mockEmailVerifications);
      expect(mockDelete.where).toHaveBeenCalled();
      expect(result).toBe(2);
    });
  });

  describe('hasPendingVerification', () => {
    it('should return true when user has pending verification', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: mockVerification.id }]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await emailVerificationRepository.hasPendingVerification(
        mockVerification.userId
      );

      expect(result).toBe(true);
    });

    it('should return false when user has no pending verification', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await emailVerificationRepository.hasPendingVerification(
        'user-without-verification'
      );

      expect(result).toBe(false);
    });

    it('should check for specific verification type', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: mockVerification.id }]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await emailVerificationRepository.hasPendingVerification(
        mockVerification.userId,
        'magic_link'
      );

      expect(result).toBe(true);
    });
  });
});
