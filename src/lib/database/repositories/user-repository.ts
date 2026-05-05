import { eq, and, sql } from 'drizzle-orm';
import { db } from '../connection';
import { users } from '../schema';
import type { User } from '@/types/user';

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
  isBanned?: boolean;
  isPaused?: boolean;
  isLocked?: boolean;
  bannedAt?: Date | null;
  pausedAt?: Date | null;
  lockedAt?: Date | null;
  lockReason?: string | null;
}

export class UserRepository {
  constructor(private readonly database: any = db) { }
  /**
   * Create a new user
   */
  async create(userData: CreateUserData): Promise<User> {
    try {
      const normalized = { ...userData, email: userData.email.toLowerCase().trim() };
      const [user] = await this.database
        .insert(users)
        .values({
          ...normalized,
          isEmailVerified: false,
          // Experts require manual approval, customers and admins are auto-approved
          isApproved: userData.role !== 'expert',
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
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    try {
      const [user] = await this.database
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
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const [user] = await this.database
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
   * Find user by email and role
   */
  async findByEmailAndRole(email: string, role: 'customer' | 'expert' | 'trainer' | 'admin'): Promise<User | null> {
    try {
      const [user] = await this.database
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
   * Find users by role
   */
  async findByRole(role: 'customer' | 'expert' | 'trainer' | 'admin'): Promise<User[]> {
    try {
      const usersList = await this.database
        .select()
        .from(users)
        .where(eq(users.role, role))
        .orderBy(users.createdAt);

      return usersList;
    } catch (error) {
      throw new Error(`Failed to find users by role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update user by ID
   */
  async update(id: string, updateData: UpdateUserData): Promise<User | null> {
    try {
      const [user] = await this.database
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
   * Delete user by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.database
        .delete(users)
        .where(eq(users.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      throw new Error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify user email
   */
  async verifyEmail(id: string): Promise<User | null> {
    try {
      const [user] = await this.database
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
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    try {
      const [user] = await this.database
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
   * Find multiple users with pagination
   */
  async findMany(limit: number = 20, offset: number = 0): Promise<User[]> {
    try {
      const usersList = await this.database
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
   * Count total number of users
   */
  async count(): Promise<number> {
    try {
      const result = await this.database
        .select({ count: sql`count(*)` })
        .from(users);

      return parseInt(result[0]?.count || '0');
    } catch (error) {
      throw new Error(`Failed to count users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const userRepository = new UserRepository();
