import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock drizzle-orm before imports
vi.mock('drizzle-orm', () => ({
  eq: (field: any, value: any) => ({ field, value, type: 'eq' }),
  and: (...conditions: any[]) => ({ conditions, type: 'and' }),
  lt: (field: any, value: any) => ({ field, value, type: 'lt' }),
  gt: (field: any, value: any) => ({ field, value, type: 'gt' }),
}));

process.env.USE_INMEM_DB = 'false';
import { SessionRepository } from '../session-repository';
import type { AuthSession } from '@/types/auth';

let mockDb: any;
vi.mock('../../schema', () => ({
  sessions: {
    id: 'sessions.id',
    userId: 'sessions.userId',
    token: 'sessions.token',
    expiresAt: 'sessions.expiresAt',
    createdAt: 'sessions.createdAt',
  }
}));
import { sessions as mockSessions } from '../../schema';

describe('SessionRepository', () => {
  let sessionRepository: SessionRepository;

  const mockSession: AuthSession = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: '456e7890-e89b-12d3-a456-426614174001',
    token: 'session-token-123',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    createdAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockCreateData = {
    userId: '456e7890-e89b-12d3-a456-426614174001',
    token: 'session-token-123',
    tokenType: 'access' as const,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };

  beforeEach(() => {
    mockDb = {
      insert: vi.fn(),
      select: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    sessionRepository = new SessionRepository(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new session successfully', async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockSession]),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const result = await sessionRepository.create(mockCreateData);

      expect(mockDb.insert).toHaveBeenCalledWith(mockSessions);
      expect(mockInsert.values).toHaveBeenCalledWith(mockCreateData);
      expect(mockInsert.returning).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });

    it('should throw error when session creation fails', async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      await expect(sessionRepository.create(mockCreateData))
        .rejects.toThrow('Failed to create session');
    });

    it('should throw specific error for duplicate token', async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(new Error('unique constraint violation')),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      await expect(sessionRepository.create(mockCreateData))
        .rejects.toThrow('Session token already exists');
    });
  });

  describe('findByToken', () => {
    it('should find session by token successfully', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockSession]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await sessionRepository.findByToken('session-token-123');

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockSelect.from).toHaveBeenCalledWith(mockSessions);
      expect(mockSelect.where).toHaveBeenCalled();
      expect(mockSelect.limit).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockSession);
    });

    it('should return null when session not found', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await sessionRepository.findByToken('nonexistent-token');

      expect(result).toBeNull();
    });
  });

  describe('findActiveByToken', () => {
    it('should find active session by token successfully', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockSession]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await sessionRepository.findActiveByToken('session-token-123');

      expect(result).toEqual(mockSession);
    });

    it('should return null when no active session found', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await sessionRepository.findActiveByToken('expired-token');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find all sessions for a user', async () => {
      const userSessions = [mockSession, { ...mockSession, id: 'another-session' }];

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(userSessions),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await sessionRepository.findByUserId(mockSession.userId);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockSelect.from).toHaveBeenCalledWith(mockSessions);
      expect(mockSelect.where).toHaveBeenCalled();
      expect(result).toEqual(userSessions);
    });

    it('should return empty array when user has no sessions', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await sessionRepository.findByUserId('user-without-sessions');

      expect(result).toEqual([]);
    });
  });

  describe('findActiveByUserId', () => {
    it('should find active sessions for a user', async () => {
      const activeSessions = [mockSession];

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(activeSessions),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await sessionRepository.findActiveByUserId(mockSession.userId);

      expect(result).toEqual(activeSessions);
    });
  });

  describe('updateExpiration', () => {
    it('should update session expiration successfully', async () => {
      const newExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
      const updatedSession = { ...mockSession, expiresAt: newExpiresAt };

      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([updatedSession]),
      };
      mockDb.update.mockReturnValue(mockUpdate);

      const result = await sessionRepository.updateExpiration(mockSession.id, newExpiresAt);

      expect(mockDb.update).toHaveBeenCalledWith(mockSessions);
      expect(mockUpdate.set).toHaveBeenCalledWith({ expiresAt: newExpiresAt });
      expect(mockUpdate.where).toHaveBeenCalled();
      expect(mockUpdate.returning).toHaveBeenCalled();
      expect(result).toEqual(updatedSession);
    });

    it('should return null when session not found', async () => {
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };
      mockDb.update.mockReturnValue(mockUpdate);

      const result = await sessionRepository.updateExpiration(
        'nonexistent-id',
        new Date()
      );

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete session successfully', async () => {
      const mockDelete = {
        where: vi.fn().mockResolvedValue([{ id: mockSession.id }]),
      };
      mockDb.delete.mockReturnValue(mockDelete);

      const result = await sessionRepository.delete(mockSession.id);

      expect(mockDb.delete).toHaveBeenCalledWith(mockSessions);
      expect(mockDelete.where).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when session not found', async () => {
      const mockDelete = {
        where: vi.fn().mockResolvedValue([]),
      };
      mockDb.delete.mockReturnValue(mockDelete);

      const result = await sessionRepository.delete('nonexistent-id');

      expect(result).toBe(false);
    });
  });

  describe('deleteByToken', () => {
    it('should delete session by token successfully', async () => {
      const mockDelete = {
        where: vi.fn().mockResolvedValue([{ id: mockSession.id }]),
      };
      mockDb.delete.mockReturnValue(mockDelete);

      const result = await sessionRepository.deleteByToken('session-token-123');

      expect(result).toBe(true);
    });
  });

  describe('deleteByUserId', () => {
    it('should delete all sessions for a user', async () => {
      const mockDelete = {
        where: vi.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]),
      };
      mockDb.delete.mockReturnValue(mockDelete);

      const result = await sessionRepository.deleteByUserId(mockSession.userId);

      expect(mockDb.delete).toHaveBeenCalledWith(mockSessions);
      expect(mockDelete.where).toHaveBeenCalled();
      expect(result).toBe(2);
    });
  });

  describe('deleteExpired', () => {
    it('should delete expired sessions successfully', async () => {
      const mockDelete = {
        where: vi.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]),
      };
      mockDb.delete.mockReturnValue(mockDelete);

      const result = await sessionRepository.deleteExpired();

      expect(mockDb.delete).toHaveBeenCalledWith(mockSessions);
      expect(mockDelete.where).toHaveBeenCalled();
      expect(result).toBe(2);
    });
  });

  describe('validateToken', () => {
    it('should validate active token successfully', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockSession]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await sessionRepository.validateToken('session-token-123');

      expect(result.isValid).toBe(true);
      expect(result.session).toEqual(mockSession);
      expect(result.isExpired).toBeUndefined();
    });

    it('should return invalid for non-existent token', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await sessionRepository.validateToken('nonexistent-token');

      expect(result.isValid).toBe(false);
      expect(result.session).toBeUndefined();
    });

    it('should return invalid and expired for expired token', async () => {
      const expiredSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() - 60 * 1000), // 1 minute ago
      };

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([expiredSession]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await sessionRepository.validateToken('session-token-123');

      expect(result.isValid).toBe(false);
      expect(result.isExpired).toBe(true);
      expect(result.session).toEqual(expiredSession);
    });
  });

  describe('cleanup', () => {
    it('should cleanup expired sessions successfully', async () => {
      const mockDelete = {
        where: vi.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]),
      };
      mockDb.delete.mockReturnValue(mockDelete);

      const result = await sessionRepository.cleanup();

      expect(result.deletedCount).toBe(2);
    });
  });

  describe('countActiveByUserId', () => {
    it('should count active sessions for a user', async () => {
      const activeSessions = [mockSession, { ...mockSession, id: 'another-session' }];

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(activeSessions),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await sessionRepository.countActiveByUserId(mockSession.userId);

      expect(result).toBe(2);
    });

    it('should return 0 when user has no active sessions', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await sessionRepository.countActiveByUserId('user-without-sessions');

      expect(result).toBe(0);
    });
  });
});
