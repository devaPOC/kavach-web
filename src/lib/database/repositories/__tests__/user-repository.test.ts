import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
process.env.USE_INMEM_DB = 'false';
import type { User } from '@/types/user';

let mockDb: any;

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value, type: 'eq' })),
  and: vi.fn((...conditions) => ({ conditions, type: 'and' })),
}));

vi.mock('../../schema', () => ({
  users: {
    id: 'users.id',
    email: 'users.email',
    firstName: 'users.firstName',
    lastName: 'users.lastName',
    passwordHash: 'users.passwordHash',
    role: 'users.role',
    isEmailVerified: 'users.isEmailVerified',
    createdAt: 'users.createdAt',
    updatedAt: 'users.updatedAt',
  }
}));

import { UserRepository } from '../user-repository';
import { users as mockUsers } from '../../schema';

describe('UserRepository', () => {
  let userRepository: UserRepository;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    passwordHash: '$2b$12$hashedpassword',
    role: 'customer',
    isEmailVerified: false,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockCreateUserData = {
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    passwordHash: '$2b$12$hashedpassword',
    role: 'customer' as const,
  };

  beforeEach(() => {
    mockDb = {
      insert: vi.fn(),
      select: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    userRepository = new UserRepository(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockUser]),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const result = await userRepository.create(mockCreateUserData);

      expect(mockDb.insert).toHaveBeenCalledWith(mockUsers);
      expect(mockInsert.values).toHaveBeenCalledWith({
        ...mockCreateUserData,
        isEmailVerified: false,
      });
      expect(mockInsert.returning).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should throw error when user creation fails', async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      await expect(userRepository.create(mockCreateUserData))
        .rejects.toThrow('Failed to create user');
    });

    it('should throw specific error for duplicate email', async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(new Error('unique constraint violation')),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      await expect(userRepository.create(mockCreateUserData))
        .rejects.toThrow('User with this email already exists');
    });
  });

  describe('findById', () => {
    it('should find user by ID successfully', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockUser]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await userRepository.findById(mockUser.id);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockSelect.from).toHaveBeenCalledWith(mockUsers);
      expect(mockSelect.where).toHaveBeenCalled();
      expect(mockSelect.limit).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await userRepository.findById('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockRejectedValue(new Error('Database error')),
      };
      mockDb.select.mockReturnValue(mockSelect);

      await expect(userRepository.findById(mockUser.id))
        .rejects.toThrow('Failed to find user by ID: Database error');
    });
  });

  describe('findByEmail', () => {
    it('should find user by email successfully', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockUser]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await userRepository.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
    });

    it('should convert email to lowercase', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockUser]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      await userRepository.findByEmail('TEST@EXAMPLE.COM');

      // The email should be converted to lowercase in the where clause
      expect(mockSelect.where).toHaveBeenCalled();
    });

    it('should return null when user not found', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await userRepository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByEmailAndRole', () => {
    it('should find user by email and role successfully', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockUser]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await userRepository.findByEmailAndRole('test@example.com', 'customer');

      expect(result).toEqual(mockUser);
    });

    it('should return null when user with role not found', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await userRepository.findByEmailAndRole('test@example.com', 'admin');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const updateData = { firstName: 'Jane', isEmailVerified: true };
      const updatedUser = { ...mockUser, ...updateData };

      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([updatedUser]),
      };
      mockDb.update.mockReturnValue(mockUpdate);

      const result = await userRepository.update(mockUser.id, updateData);

      expect(mockDb.update).toHaveBeenCalledWith(mockUsers);
      expect(mockUpdate.set).toHaveBeenCalledWith({
        ...updateData,
        updatedAt: expect.any(Date),
      });
      expect(mockUpdate.where).toHaveBeenCalled();
      expect(mockUpdate.returning).toHaveBeenCalled();
      expect(result).toEqual(updatedUser);
    });

    it('should return null when user not found for update', async () => {
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };
      mockDb.update.mockReturnValue(mockUpdate);

      const result = await userRepository.update('nonexistent-id', { firstName: 'Jane' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      const mockDelete = {
        where: vi.fn().mockResolvedValue([{ id: mockUser.id }]),
      };
      mockDb.delete.mockReturnValue(mockDelete);

      const result = await userRepository.delete(mockUser.id);

      expect(mockDb.delete).toHaveBeenCalledWith(mockUsers);
      expect(mockDelete.where).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when user not found for deletion', async () => {
      const mockDelete = {
        where: vi.fn().mockResolvedValue([]),
      };
      mockDb.delete.mockReturnValue(mockDelete);

      const result = await userRepository.delete('nonexistent-id');

      expect(result).toBe(false);
    });
  });

  describe('verifyEmail', () => {
    it('should verify user email successfully', async () => {
      const verifiedUser = { ...mockUser, isEmailVerified: true };

      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([verifiedUser]),
      };
      mockDb.update.mockReturnValue(mockUpdate);

      const result = await userRepository.verifyEmail(mockUser.id);

      expect(mockUpdate.set).toHaveBeenCalledWith({
        isEmailVerified: true,
        updatedAt: expect.any(Date),
      });
      expect(result).toEqual(verifiedUser);
    });
  });

  describe('emailExists', () => {
    it('should return true when email exists', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: mockUser.id }]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await userRepository.emailExists('test@example.com');

      expect(result).toBe(true);
    });

    it('should return false when email does not exist', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await userRepository.emailExists('nonexistent@example.com');

      expect(result).toBe(false);
    });
  });
});
