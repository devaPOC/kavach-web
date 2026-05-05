import { eq, and, lt, gt } from 'drizzle-orm';
import { db } from '../connection';
import { emailVerifications } from '../schema';
import type { EmailVerification } from '@/types/auth';

export interface CreateEmailVerificationData {
  userId: string;
  token: string;
  type: 'magic_link';
  expiresAt: Date;
}

export class EmailVerificationRepository {
  constructor(private readonly database: any = db) { }
  /**
   * Create a new email verification token
   */
  async create(data: CreateEmailVerificationData): Promise<EmailVerification> {
    if (process.env.USE_INMEM_DB === 'true') {
      return EmailVerificationRepositoryMemory.create(data);
    }
    try {
      const [verification] = await this.database
        .insert(emailVerifications)
        .values({
          ...data,
          isUsed: false,
        })
        .returning();

      if (!verification) {
        throw new Error('Failed to create email verification');
      }

      return verification;
    } catch (error) {
      throw new Error(`Failed to create email verification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find verification by token
   */
  async findByToken(token: string): Promise<EmailVerification | null> {
    if (process.env.USE_INMEM_DB === 'true') {
      return EmailVerificationRepositoryMemory.findByToken(token);
    }
    try {
      const [verification] = await this.database
        .select()
        .from(emailVerifications)
        .where(eq(emailVerifications.token, token))
        .limit(1);

      return verification || null;
    } catch (error) {
      throw new Error(`Failed to find verification by token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find active verification by user ID and type
   */
  async findActiveByUserIdAndType(userId: string, type: 'magic_link'): Promise<EmailVerification | null> {
    if (process.env.USE_INMEM_DB === 'true') {
      return EmailVerificationRepositoryMemory.findActiveByUserIdAndType(userId, type);
    }
    try {
      const [verification] = await this.database
        .select()
        .from(emailVerifications)
        .where(and(
          eq(emailVerifications.userId, userId),
          eq(emailVerifications.type, type),
          eq(emailVerifications.isUsed, false),
          gt(emailVerifications.expiresAt, new Date())
        ))
        .limit(1);

      return verification || null;
    } catch (error) {
      throw new Error(`Failed to find active verification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mark verification as used
   */
  async markAsUsed(id: string): Promise<EmailVerification | null> {
    if (process.env.USE_INMEM_DB === 'true') {
      return EmailVerificationRepositoryMemory.markAsUsed(id);
    }
    try {
      const [verification] = await this.database
        .delete(emailVerifications)
        .where(eq(emailVerifications.id, id))
        .returning();


      return verification || null;
    } catch (error) {
      throw new Error(`Failed to mark verification as used: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate and use verification token
   */
  async validateAndUse(token: string): Promise<{ isValid: boolean; userId?: string; isExpired?: boolean }> {
    if (process.env.USE_INMEM_DB === 'true') {
      const v = await EmailVerificationRepositoryMemory.findByToken(token);
      if (!v) return { isValid: false };
      if (v.isUsed) return { isValid: false };
      if (new Date() > v.expiresAt) return { isValid: false, isExpired: true, userId: v.userId };
      await EmailVerificationRepositoryMemory.markAsUsed(v.id);
      return { isValid: true, userId: v.userId };
    }
    try {
      const verification = await this.findByToken(token);

      if (!verification) {
        return { isValid: false };
      }

      if (verification.isUsed) {
        return { isValid: false };
      }

      if (new Date() > verification.expiresAt) {
        return { isValid: false, isExpired: true, userId: verification.userId };
      }

      // Mark as used
      await this.markAsUsed(verification.id);

      return { isValid: true, userId: verification.userId };
    } catch (error) {
      throw new Error(`Failed to validate verification token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete expired verifications
   */
  async deleteExpired(): Promise<number> {
    if (process.env.USE_INMEM_DB === 'true') {
      return EmailVerificationRepositoryMemory.deleteExpired();
    }
    try {
      const result = await this.database
        .delete(emailVerifications)
        .where(lt(emailVerifications.expiresAt, new Date()));

      return result.length;
    } catch (error) {
      throw new Error(`Failed to delete expired verifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete all verifications for a user
   */
  async deleteByUserId(userId: string): Promise<number> {
    if (process.env.USE_INMEM_DB === 'true') {
      return EmailVerificationRepositoryMemory.deleteByUserId(userId);
    }
    try {
      const result = await this.database
        .delete(emailVerifications)
        .where(eq(emailVerifications.userId, userId));

      return result.length;
    } catch (error) {
      throw new Error(`Failed to delete verifications for user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete verification by ID
   */
  async delete(id: string): Promise<boolean> {
    if (process.env.USE_INMEM_DB === 'true') {
      return EmailVerificationRepositoryMemory.delete(id);
    }
    try {
      const result = await this.database
        .delete(emailVerifications)
        .where(eq(emailVerifications.id, id));

      return result.length > 0;
    } catch (error) {
      throw new Error(`Failed to delete verification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if user has pending verification
   */
  async hasPendingVerification(userId: string, type?: 'magic_link'): Promise<boolean> {
    if (process.env.USE_INMEM_DB === 'true') {
      return EmailVerificationRepositoryMemory.hasPending(userId, type);
    }
    try {
      const conditions = [
        eq(emailVerifications.userId, userId),
        eq(emailVerifications.isUsed, false),
        gt(emailVerifications.expiresAt, new Date())
      ];

      if (type) {
        conditions.push(eq(emailVerifications.type, type));
      }

      const [verification] = await this.database
        .select({ id: emailVerifications.id })
        .from(emailVerifications)
        .where(and(...conditions))
        .limit(1);

      return !!verification;
    } catch (error) {
      throw new Error(`Failed to check pending verification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const emailVerificationRepository = new EmailVerificationRepository();

// In-memory email verification store for tests
interface MemoryVerification extends EmailVerification { }
const memoryVerifications: MemoryVerification[] = [];
class EmailVerificationRepositoryMemory {
  static async create(data: CreateEmailVerificationData) {
    const v: MemoryVerification = { id: (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)), ...data, isUsed: false, createdAt: new Date() } as any;
    memoryVerifications.push(v); return v;
  }
  static async findByToken(token: string) { return memoryVerifications.find(v => v.token === token) || null; }
  static async findActiveByUserIdAndType(userId: string, type: 'magic_link') { return memoryVerifications.find(v => v.userId === userId && v.type === type && !v.isUsed && v.expiresAt > new Date()) || null; }
  static async markAsUsed(id: string) { const v = memoryVerifications.find(v => v.id === id); if (!v) return null; v.isUsed = true; return v; }
  static async deleteExpired() { const now = Date.now(); const before = memoryVerifications.length; for (let i = memoryVerifications.length - 1; i >= 0; i--) if (memoryVerifications[i].expiresAt.getTime() < now) memoryVerifications.splice(i, 1); return before - memoryVerifications.length; }
  static async deleteByUserId(userId: string) { const before = memoryVerifications.length; for (let i = memoryVerifications.length - 1; i >= 0; i--) if (memoryVerifications[i].userId === userId) memoryVerifications.splice(i, 1); return before - memoryVerifications.length; }
  static async delete(id: string) { const i = memoryVerifications.findIndex(v => v.id === id); if (i === -1) return false; memoryVerifications.splice(i, 1); return true; }
  static async hasPending(userId: string, type?: 'magic_link') { return !!memoryVerifications.find(v => v.userId === userId && !v.isUsed && v.expiresAt > new Date() && (!type || v.type === type)); }
}
