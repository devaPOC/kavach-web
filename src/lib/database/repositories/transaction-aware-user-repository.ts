import { eq, and, sql } from 'drizzle-orm';
import { db } from '../connection';
import { users } from '../schema';
import type { User } from '@/types/user';
import type { Transaction } from '../transaction-service';

export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  role: 'customer' | 'expert' | 'trainer' | 'admin';
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  passwordHash?: string;
  isEmailVerified?: boolean;
  isProfileCompleted?: boolean;
  isApproved?: boolean;
  isBanned?: boolean;
  isPaused?: boolean;
  bannedAt?: Date | null;
  pausedAt?: Date | null;
}

/**
 * Transaction-aware User Repository
 * Supports both regular database operations and transaction-based operations
 */
export class TransactionAwareUserRepository {
  constructor(private readonly database: any = db) { }

  /**
   * Create a new user (transaction-aware)
   */
  async create(userData: CreateUserData, tx?: Transaction): Promise<User> {
    const dbInstance = tx || this.database;

    try {
      const normalized = { ...userData, email: userData.email.toLowerCase().trim() };
      const [user] = await dbInstance
        .insert(users)
        .values({
          ...normalized,
          isEmailVerified: false,
          isProfileCompleted: false,
          isApproved: false,
        })
        .returning();

      if (!user) {
        throw new Error('Failed to create user');
      }

      return user;
    } catch (error) {
      const pgCode = (error as any)?.code;
      if (pgCode === '23505' || (error instanceof Error && error.message.includes('unique constraint'))) {
        throw new Error('User with this email already exists');
      }
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find user by ID (transaction-aware)
   */
  async findById(id: string, tx?: Transaction): Promise<User | null> {
    const dbInstance = tx || this.database;

    try {
      const [user] = await dbInstance
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      return user || null;
    } catch (error) {
      throw new Error(`Failed to find user by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find user by email (transaction-aware)
   */
  async findByEmail(email: string, tx?: Transaction): Promise<User | null> {
    const dbInstance = tx || this.database;

    try {
      const [user] = await dbInstance
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      return user || null;
    } catch (error) {
      throw new Error(`Failed to find user by email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find user by email and role (transaction-aware)
   */
  async findByEmailAndRole(email: string, role: 'customer' | 'expert' | 'admin', tx?: Transaction): Promise<User | null> {
    const dbInstance = tx || this.database;

    try {
      const [user] = await dbInstance
        .select()
        .from(users)
        .where(and(
          eq(users.email, email.toLowerCase()),
          eq(users.role, role)
        ))
        .limit(1);

      return user || null;
    } catch (error) {
      throw new Error(`Failed to find user by email and role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update user by ID (transaction-aware)
   */
  async update(id: string, updateData: UpdateUserData, tx?: Transaction): Promise<User | null> {
    const dbInstance = tx || this.database;

    try {
      const [user] = await dbInstance
        .update(users)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      return user || null;
    } catch (error) {
      throw new Error(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete user by ID (transaction-aware)
   */
  async delete(id: string, tx?: Transaction): Promise<boolean> {
    const dbInstance = tx || this.database;

    try {
      const result = await dbInstance
        .delete(users)
        .where(eq(users.id, id));

      return result.length > 0;
    } catch (error) {
      throw new Error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify user email (transaction-aware)
   */
  async verifyEmail(id: string, tx?: Transaction): Promise<User | null> {
    const dbInstance = tx || this.database;

    try {
      const [user] = await dbInstance
        .update(users)
        .set({
          isEmailVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      return user || null;
    } catch (error) {
      throw new Error(`Failed to verify user email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update user profile completion status (transaction-aware)
   */
  async updateProfileCompletion(id: string, isCompleted: boolean, tx?: Transaction): Promise<User | null> {
    const dbInstance = tx || this.database;

    try {
      const [user] = await dbInstance
        .update(users)
        .set({
          isProfileCompleted: isCompleted,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      return user || null;
    } catch (error) {
      throw new Error(`Failed to update profile completion: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update user approval status (transaction-aware)
   */
  async updateApprovalStatus(id: string, isApproved: boolean, tx?: Transaction): Promise<User | null> {
    const dbInstance = tx || this.database;

    try {
      const [user] = await dbInstance
        .update(users)
        .set({
          isApproved: isApproved,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      return user || null;
    } catch (error) {
      throw new Error(`Failed to update approval status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Ban/unban user (transaction-aware)
   */
  async updateBanStatus(id: string, isBanned: boolean, tx?: Transaction): Promise<User | null> {
    const dbInstance = tx || this.database;

    try {
      const [user] = await dbInstance
        .update(users)
        .set({
          isBanned,
          bannedAt: isBanned ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      return user || null;
    } catch (error) {
      throw new Error(`Failed to update ban status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Pause/unpause user (transaction-aware)
   */
  async updatePauseStatus(id: string, isPaused: boolean, tx?: Transaction): Promise<User | null> {
    const dbInstance = tx || this.database;

    try {
      const [user] = await dbInstance
        .update(users)
        .set({
          isPaused,
          pausedAt: isPaused ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      return user || null;
    } catch (error) {
      throw new Error(`Failed to update pause status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if email exists (transaction-aware)
   */
  async emailExists(email: string, tx?: Transaction): Promise<boolean> {
    const dbInstance = tx || this.database;

    try {
      const [user] = await dbInstance
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      return !!user;
    } catch (error) {
      throw new Error(`Failed to check email existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find multiple users with pagination (transaction-aware)
   */
  async findMany(limit: number = 20, offset: number = 0, tx?: Transaction): Promise<User[]> {
    const dbInstance = tx || this.database;

    try {
      const usersList = await dbInstance
        .select()
        .from(users)
        .limit(limit)
        .offset(offset)
        .orderBy(users.createdAt);

      return usersList;
    } catch (error) {
      throw new Error(`Failed to find users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Count total number of users (transaction-aware)
   */
  async count(tx?: Transaction): Promise<number> {
    const dbInstance = tx || this.database;

    try {
      const result = await dbInstance
        .select({ count: sql`count(*)` })
        .from(users);

      return parseInt(result[0]?.count || '0');
    } catch (error) {
      throw new Error(`Failed to count users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const transactionAwareUserRepository = new TransactionAwareUserRepository();
