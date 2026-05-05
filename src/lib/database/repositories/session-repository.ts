import { eq, and, lt, gt } from 'drizzle-orm';
import { db } from '../connection';
import { sessions } from '../schema';
import type { AuthSession } from '@/types/auth';

export interface CreateSessionData {
  userId: string;
  token: string;
  tokenType: 'access' | 'refresh';
  jti?: string | null;
  expiresAt: Date;
}

export class SessionRepository {
  constructor(private readonly database: any = db) { }
  /**
   * Create a new session
   */
  async create(data: CreateSessionData): Promise<AuthSession> {
    if (process.env.USE_INMEM_DB === 'true') {
      return SessionRepositoryMemory.create(data);
    }
    try {
      const [session] = await this.database
        .insert(sessions)
        .values(data)
        .returning();

      if (!session) {
        throw new Error('Failed to create session');
      }

      return { ...session, tokenType: session.tokenType as 'access' | 'refresh', jti: (session as any).jti || undefined } as AuthSession;
    } catch (error) {
      if (error instanceof Error && error.message.includes('unique constraint')) {
        throw new Error('Session token already exists');
      }
      throw new Error(`Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find session by token
   */
  async findByToken(token: string): Promise<AuthSession | null> {
    if (process.env.USE_INMEM_DB === 'true') {
      return SessionRepositoryMemory.findByToken(token);
    }
    try {
      const [session] = await this.database
        .select()
        .from(sessions)
        .where(eq(sessions.token, token))
        .limit(1);

      return session ? { ...session, tokenType: session.tokenType as 'access' | 'refresh', jti: (session as any).jti || undefined } : null;
    } catch (error) {
      throw new Error(`Failed to find session by token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find active session by token (not expired)
   */
  async findActiveByToken(token: string): Promise<AuthSession | null> {
    if (process.env.USE_INMEM_DB === 'true') {
      const s = await SessionRepositoryMemory.findByToken(token); if (!s) return null; if (new Date() > s.expiresAt) return null; return s;
    }
    try {
      const [session] = await this.database
        .select()
        .from(sessions)
        .where(and(
          eq(sessions.token, token),
          gt(sessions.expiresAt, new Date())
        ))
        .limit(1);

      return session ? { ...session, tokenType: session.tokenType as 'access' | 'refresh', jti: (session as any).jti || undefined } : null;
    } catch (error) {
      throw new Error(`Failed to find active session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find all sessions for a user
   */
  async findByUserId(userId: string): Promise<AuthSession[]> {
    if (process.env.USE_INMEM_DB === 'true') {
      return SessionRepositoryMemory.findByUserId(userId);
    }
    try {
      const userSessions = await this.database
        .select()
        .from(sessions)
        .where(eq(sessions.userId, userId));

      return userSessions.map((s: any) => ({ ...s, tokenType: s.tokenType as 'access' | 'refresh', jti: (s as any).jti || undefined }));
    } catch (error) {
      throw new Error(`Failed to find sessions for user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find active sessions for a user
   */
  async findActiveByUserId(userId: string): Promise<AuthSession[]> {
    if (process.env.USE_INMEM_DB === 'true') {
      return (await SessionRepositoryMemory.findByUserId(userId)).filter(s => new Date() < s.expiresAt);
    }
    try {
      const userSessions = await this.database
        .select()
        .from(sessions)
        .where(and(
          eq(sessions.userId, userId),
          gt(sessions.expiresAt, new Date())
        ));

      return userSessions.map((s: any) => ({ ...s, tokenType: s.tokenType as 'access' | 'refresh', jti: (s as any).jti || undefined }));
    } catch (error) {
      throw new Error(`Failed to find active sessions for user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update session expiration
   */
  async updateExpiration(id: string, expiresAt: Date): Promise<AuthSession | null> {
    if (process.env.USE_INMEM_DB === 'true') {
      return SessionRepositoryMemory.updateExpiration(id, expiresAt);
    }
    try {
      const [session] = await this.database
        .update(sessions)
        .set({ expiresAt })
        .where(eq(sessions.id, id))
        .returning();

      return session ? { ...session, tokenType: session.tokenType as 'access' | 'refresh', jti: (session as any).jti || undefined } : null;
    } catch (error) {
      throw new Error(`Failed to update session expiration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete session by ID
   */
  async delete(id: string): Promise<boolean> {
    if (process.env.USE_INMEM_DB === 'true') {
      return SessionRepositoryMemory.delete(id);
    }
    try {
      const result = await this.database
        .delete(sessions)
        .where(eq(sessions.id, id));

      return result.length > 0;
    } catch (error) {
      throw new Error(`Failed to delete session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete session by token
   */
  async deleteByToken(token: string): Promise<boolean> {
    if (process.env.USE_INMEM_DB === 'true') {
      return SessionRepositoryMemory.deleteByToken(token);
    }
    try {
      const result = await this.database
        .delete(sessions)
        .where(eq(sessions.token, token));

      return result.length > 0;
    } catch (error) {
      throw new Error(`Failed to delete session by token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete all sessions for a user
   */
  async deleteByUserId(userId: string): Promise<number> {
    if (process.env.USE_INMEM_DB === 'true') {
      return SessionRepositoryMemory.deleteByUserId(userId);
    }
    try {
      const result = await this.database
        .delete(sessions)
        .where(eq(sessions.userId, userId));

      return result.length;
    } catch (error) {
      throw new Error(`Failed to delete sessions for user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete expired sessions
   */
  async deleteExpired(): Promise<number> {
    if (process.env.USE_INMEM_DB === 'true') {
      return SessionRepositoryMemory.deleteExpired();
    }
    try {
      const result = await this.database
        .delete(sessions)
        .where(lt(sessions.expiresAt, new Date()));

      return result.length;
    } catch (error) {
      throw new Error(`Failed to delete expired sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate session token
   */
  async validateToken(token: string): Promise<{ isValid: boolean; session?: AuthSession; isExpired?: boolean }> {
    if (process.env.USE_INMEM_DB === 'true') {
      const s = await SessionRepositoryMemory.findByToken(token); if (!s) return { isValid: false }; if (new Date() > s.expiresAt) return { isValid: false, isExpired: true, session: s }; return { isValid: true, session: s };
    }
    try {
      const session = await this.findByToken(token);

      if (!session) {
        return { isValid: false };
      }

      if (new Date() > session.expiresAt) {
        return { isValid: false, isExpired: true, session };
      }

      return { isValid: true, session };
    } catch (error) {
      throw new Error(`Failed to validate session token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cleanup expired sessions (maintenance task)
   */
  async cleanup(): Promise<{ deletedCount: number }> {
    if (process.env.USE_INMEM_DB === 'true') {
      return { deletedCount: await SessionRepositoryMemory.deleteExpired() };
    }
    try {
      const deletedCount = await this.deleteExpired();
      return { deletedCount };
    } catch (error) {
      throw new Error(`Failed to cleanup sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Count active sessions for a user
   */
  async countActiveByUserId(userId: string): Promise<number> {
    if (process.env.USE_INMEM_DB === 'true') {
      return (await SessionRepositoryMemory.findByUserId(userId)).filter(s => new Date() < s.expiresAt).length;
    }
    try {
      const activeSessions = await this.findActiveByUserId(userId);
      return activeSessions.length;
    } catch (error) {
      throw new Error(`Failed to count active sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete all refresh sessions for a user (revocation helper)
   */
  async deleteRefreshByUserId(userId: string): Promise<number> {
    if (process.env.USE_INMEM_DB === 'true') {
      return SessionRepositoryMemory.deleteRefreshByUserId(userId);
    }
    try {
      const result = await this.database
        .delete(sessions)
        .where(and(eq(sessions.userId, userId), eq(sessions.tokenType as any, 'refresh')));
      return result.length;
    } catch (error) {
      throw new Error(`Failed to delete refresh sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const sessionRepository = new SessionRepository();

// In-memory session store for tests
const memorySessions: AuthSession[] = [];
class SessionRepositoryMemory {
  static async create(data: CreateSessionData): Promise<AuthSession> {
    const existing = memorySessions.find(s => s.token === data.token);
    if (existing) throw new Error('Session token already exists');
    const s: AuthSession = { id: (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)), ...data } as any;
    memorySessions.push(s); return s;
  }
  static async findByToken(token: string) { return memorySessions.find(s => s.token === token) || null; }

  static async findByUserId(userId: string) { return memorySessions.filter(s => s.userId === userId); }

  static async updateExpiration(id: string, expiresAt: Date) { const s = memorySessions.find(x => x.id === id); if (!s) return null; s.expiresAt = expiresAt; return s; }

  static async delete(id: string) { const i = memorySessions.findIndex(s => s.id === id); if (i === -1) return false; memorySessions.splice(i, 1); return true; }

  static async deleteByToken(token: string) { const i = memorySessions.findIndex(s => s.token === token); if (i === -1) return false; memorySessions.splice(i, 1); return true; }

  static async deleteByUserId(userId: string) { const before = memorySessions.length; for (let i = memorySessions.length - 1; i >= 0; i--) if (memorySessions[i].userId === userId) memorySessions.splice(i, 1); return before - memorySessions.length; }

  static async deleteExpired() { const now = Date.now(); const before = memorySessions.length; for (let i = memorySessions.length - 1; i >= 0; i--) if (memorySessions[i].expiresAt.getTime() < now) memorySessions.splice(i, 1); return before - memorySessions.length; }

  static async deleteRefreshByUserId(userId: string) { const before = memorySessions.length; for (let i = memorySessions.length - 1; i >= 0; i--) if (memorySessions[i].userId === userId && memorySessions[i].tokenType === 'refresh') memorySessions.splice(i, 1); return before - memorySessions.length; }
}
