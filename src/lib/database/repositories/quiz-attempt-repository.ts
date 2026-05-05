import { eq, and, desc, sql, avg, max, min } from 'drizzle-orm';
import { db } from '../connection';
import { quizAttempts, quizzes, users } from '../schema';
import type { Transaction } from '../transaction-service';

export interface CreateAttemptData {
  userId: string;
  quizId: string;
  answers?: Record<string, string[]>;
  score?: number;
  timeTakenSeconds?: number;
  isCompleted?: boolean;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  interactionData?: any;
}

export interface UpdateAttemptData {
  answers?: Record<string, string[]>;
  score?: number;
  timeTakenSeconds?: number;
  isCompleted?: boolean;
  completedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  interactionData?: any;
}

export interface AttemptFilters {
  userId?: string;
  quizId?: string;
  isCompleted?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface AttemptWithDetails {
  id: string;
  userId: string;
  quizId: string;
  answers: Record<string, string[]>;
  score: number;
  timeTakenSeconds: number;
  isCompleted: boolean;
  startedAt: Date;
  completedAt: Date | null;
  quiz?: {
    id: string;
    title: string;
    language: 'en' | 'ar';
    timeLimitMinutes: number;
    maxAttempts: number;
  };
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface QuizStatistics {
  quizId: string;
  totalAttempts: number;
  completedAttempts: number;
  completionRate: number;
  averageScore: number;
  averageTimeSeconds: number;
  highestScore: number;
  lowestScore: number;
  uniqueUsers: number;
}

export interface UserQuizProgress {
  userId: string;
  quizId: string;
  attemptCount: number;
  bestScore: number;
  lastAttemptDate: Date;
  hasCompletedAttempts: boolean;
  canAttempt: boolean;
}

/**
 * Repository for managing quiz attempts and scoring
 */
export class QuizAttemptRepository {
  constructor(private readonly database: any = db) { }

  /**
   * Create a new quiz attempt (transaction-aware)
   */
  async create(attemptData: CreateAttemptData, tx?: Transaction): Promise<any> {
    const dbInstance = tx || this.database;

    try {
      const [attempt] = await dbInstance
        .insert(quizAttempts)
        .values({
          ...attemptData,
          answers: attemptData.answers ?? {},
          score: attemptData.score ?? 0,
          timeTakenSeconds: attemptData.timeTakenSeconds ?? 0,
          isCompleted: attemptData.isCompleted ?? false,
          startedAt: new Date(),
          completedAt: attemptData.isCompleted ? new Date() : null
        })
        .returning();

      if (!attempt) {
        throw new Error('Failed to create quiz attempt');
      }

      return attempt;
    } catch (error) {
      throw new Error(`Failed to create quiz attempt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find attempt by ID (transaction-aware)
   */
  async findById(id: string, tx?: Transaction): Promise<any | null> {
    const dbInstance = tx || this.database;

    try {
      const [attempt] = await dbInstance
        .select()
        .from(quizAttempts)
        .where(eq(quizAttempts.id, id))
        .limit(1);

      return attempt || null;
    } catch (error) {
      throw new Error(`Failed to find quiz attempt by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find attempt with quiz and user details (transaction-aware)
   */
  async findByIdWithDetails(id: string, tx?: Transaction): Promise<AttemptWithDetails | null> {
    const dbInstance = tx || this.database;

    try {
      const result = await dbInstance
        .select({
          attempt: quizAttempts,
          quiz: {
            id: quizzes.id,
            title: quizzes.title,
            language: quizzes.language,
            timeLimitMinutes: quizzes.timeLimitMinutes,
            maxAttempts: quizzes.maxAttempts
          },
          user: {
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName
          }
        })
        .from(quizAttempts)
        .leftJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
        .leftJoin(users, eq(quizAttempts.userId, users.id))
        .where(eq(quizAttempts.id, id))
        .limit(1);

      if (!result[0]) return null;

      const { attempt, quiz, user } = result[0];
      return {
        ...attempt,
        quiz: quiz || undefined,
        user: user || undefined
      };
    } catch (error) {
      throw new Error(`Failed to find attempt with details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find multiple attempts with filters and pagination (transaction-aware)
   */
  async findMany(
    filters: AttemptFilters = {},
    limit: number = 20,
    offset: number = 0,
    tx?: Transaction
  ): Promise<any[]> {
    const dbInstance = tx || this.database;

    try {
      let query = dbInstance.select().from(quizAttempts);

      // Apply filters
      const conditions = [];
      if (filters.userId) {
        conditions.push(eq(quizAttempts.userId, filters.userId));
      }
      if (filters.quizId) {
        conditions.push(eq(quizAttempts.quizId, filters.quizId));
      }
      if (filters.isCompleted !== undefined) {
        conditions.push(eq(quizAttempts.isCompleted, filters.isCompleted));
      }
      if (filters.dateFrom) {
        conditions.push(sql`${quizAttempts.startedAt} >= ${filters.dateFrom}`);
      }
      if (filters.dateTo) {
        conditions.push(sql`${quizAttempts.startedAt} <= ${filters.dateTo}`);
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const attempts = await query
        .limit(limit)
        .offset(offset)
        .orderBy(desc(quizAttempts.startedAt));

      return attempts;
    } catch (error) {
      throw new Error(`Failed to find quiz attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find user's attempts for a specific quiz (transaction-aware)
   */
  async findUserAttempts(userId: string, quizId: string, tx?: Transaction): Promise<any[]> {
    const filters: AttemptFilters = { userId, quizId };
    return this.findMany(filters, 100, 0, tx);
  }

  /**
   * Find user's incomplete attempt for a specific quiz (transaction-aware)
   * Returns the most recent incomplete attempt if one exists
   */
  async findIncompleteAttempt(userId: string, quizId: string, tx?: Transaction): Promise<any | null> {
    const dbInstance = tx || this.database;

    try {
      const [attempt] = await dbInstance
        .select()
        .from(quizAttempts)
        .where(and(
          eq(quizAttempts.userId, userId),
          eq(quizAttempts.quizId, quizId),
          eq(quizAttempts.isCompleted, false)
        ))
        .orderBy(desc(quizAttempts.startedAt))
        .limit(1);

      return attempt || null;
    } catch (error) {
      throw new Error(`Failed to find incomplete attempt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update attempt by ID (transaction-aware)
   */
  async update(id: string, updateData: UpdateAttemptData, tx?: Transaction): Promise<any | null> {
    const dbInstance = tx || this.database;

    try {
      const [attempt] = await dbInstance
        .update(quizAttempts)
        .set({
          ...updateData,
          completedAt: updateData.isCompleted ? (updateData.completedAt || new Date()) : null
        })
        .where(eq(quizAttempts.id, id))
        .returning();

      return attempt || null;
    } catch (error) {
      throw new Error(`Failed to update quiz attempt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit quiz attempt with final answers and score (transaction-aware)
   */
  async submit(
    id: string,
    answers: Record<string, string[]>,
    score: number,
    timeTakenSeconds: number,
    tx?: Transaction
  ): Promise<any | null> {
    return this.update(id, {
      answers,
      score,
      timeTakenSeconds,
      isCompleted: true,
      completedAt: new Date()
    }, tx);
  }

  /**
   * Delete attempt by ID (transaction-aware)
   */
  async delete(id: string, tx?: Transaction): Promise<boolean> {
    const dbInstance = tx || this.database;

    try {
      const result = await dbInstance
        .delete(quizAttempts)
        .where(eq(quizAttempts.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      throw new Error(`Failed to delete quiz attempt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Count user's attempts for a quiz (transaction-aware)
   */
  async countUserAttempts(userId: string, quizId: string, tx?: Transaction): Promise<number> {
    const dbInstance = tx || this.database;

    try {
      const result = await dbInstance
        .select({ count: sql`count(*)` })
        .from(quizAttempts)
        .where(and(
          eq(quizAttempts.userId, userId),
          eq(quizAttempts.quizId, quizId)
        ));

      return parseInt(result[0]?.count || '0');
    } catch (error) {
      throw new Error(`Failed to count user attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user's best score for a quiz (transaction-aware)
   */
  async getUserBestScore(userId: string, quizId: string, tx?: Transaction): Promise<number> {
    const dbInstance = tx || this.database;

    try {
      const result = await dbInstance
        .select({ maxScore: max(quizAttempts.score) })
        .from(quizAttempts)
        .where(and(
          eq(quizAttempts.userId, userId),
          eq(quizAttempts.quizId, quizId),
          eq(quizAttempts.isCompleted, true)
        ));

      return result[0]?.maxScore || 0;
    } catch (error) {
      throw new Error(`Failed to get user best score: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user's quiz progress (transaction-aware)
   */
  async getUserQuizProgress(userId: string, quizId: string, maxAttempts: number, tx?: Transaction): Promise<UserQuizProgress> {
    const dbInstance = tx || this.database;

    try {
      const attemptCount = await this.countUserAttempts(userId, quizId, tx);
      const bestScore = await this.getUserBestScore(userId, quizId, tx);

      const lastAttemptResult = await dbInstance
        .select({ startedAt: quizAttempts.startedAt })
        .from(quizAttempts)
        .where(and(
          eq(quizAttempts.userId, userId),
          eq(quizAttempts.quizId, quizId)
        ))
        .orderBy(desc(quizAttempts.startedAt))
        .limit(1);

      const hasCompletedAttempts = await dbInstance
        .select({ count: sql`count(*)` })
        .from(quizAttempts)
        .where(and(
          eq(quizAttempts.userId, userId),
          eq(quizAttempts.quizId, quizId),
          eq(quizAttempts.isCompleted, true)
        ));

      return {
        userId,
        quizId,
        attemptCount,
        bestScore,
        lastAttemptDate: lastAttemptResult[0]?.startedAt || new Date(),
        hasCompletedAttempts: parseInt(hasCompletedAttempts[0]?.count || '0') > 0,
        canAttempt: attemptCount < maxAttempts
      };
    } catch (error) {
      throw new Error(`Failed to get user quiz progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get quiz statistics (transaction-aware)
   */
  async getQuizStatistics(quizId: string, tx?: Transaction): Promise<QuizStatistics> {
    const dbInstance = tx || this.database;

    try {
      const totalAttemptsResult = await dbInstance
        .select({ count: sql`count(*)` })
        .from(quizAttempts)
        .where(eq(quizAttempts.quizId, quizId));

      const completedAttemptsResult = await dbInstance
        .select({ count: sql`count(*)` })
        .from(quizAttempts)
        .where(and(
          eq(quizAttempts.quizId, quizId),
          eq(quizAttempts.isCompleted, true)
        ));

      const scoreStatsResult = await dbInstance
        .select({
          avgScore: avg(quizAttempts.score),
          maxScore: max(quizAttempts.score),
          minScore: min(quizAttempts.score),
          avgTime: avg(quizAttempts.timeTakenSeconds)
        })
        .from(quizAttempts)
        .where(and(
          eq(quizAttempts.quizId, quizId),
          eq(quizAttempts.isCompleted, true)
        ));

      const uniqueUsersResult = await dbInstance
        .select({ count: sql`count(distinct ${quizAttempts.userId})` })
        .from(quizAttempts)
        .where(eq(quizAttempts.quizId, quizId));

      const totalAttempts = parseInt(totalAttemptsResult[0]?.count || '0');
      const completedAttempts = parseInt(completedAttemptsResult[0]?.count || '0');
      const scoreStats = scoreStatsResult[0];
      const uniqueUsers = parseInt(uniqueUsersResult[0]?.count || '0');

      return {
        quizId,
        totalAttempts,
        completedAttempts,
        completionRate: totalAttempts > 0 ? (completedAttempts / totalAttempts) * 100 : 0,
        averageScore: parseFloat(scoreStats?.avgScore || '0'),
        averageTimeSeconds: parseFloat(scoreStats?.avgTime || '0'),
        highestScore: scoreStats?.maxScore || 0,
        lowestScore: scoreStats?.minScore || 0,
        uniqueUsers
      };
    } catch (error) {
      throw new Error(`Failed to get quiz statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get attempts with pagination and details (transaction-aware)
   */
  async findManyWithDetails(
    filters: AttemptFilters = {},
    limit: number = 20,
    offset: number = 0,
    tx?: Transaction
  ): Promise<AttemptWithDetails[]> {
    const dbInstance = tx || this.database;

    try {
      let query = dbInstance
        .select({
          attempt: quizAttempts,
          quiz: {
            id: quizzes.id,
            title: quizzes.title,
            language: quizzes.language,
            timeLimitMinutes: quizzes.timeLimitMinutes,
            maxAttempts: quizzes.maxAttempts
          },
          user: {
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName
          }
        })
        .from(quizAttempts)
        .leftJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
        .leftJoin(users, eq(quizAttempts.userId, users.id));

      // Apply filters
      const conditions = [];
      if (filters.userId) {
        conditions.push(eq(quizAttempts.userId, filters.userId));
      }
      if (filters.quizId) {
        conditions.push(eq(quizAttempts.quizId, filters.quizId));
      }
      if (filters.isCompleted !== undefined) {
        conditions.push(eq(quizAttempts.isCompleted, filters.isCompleted));
      }
      if (filters.dateFrom) {
        conditions.push(sql`${quizAttempts.startedAt} >= ${filters.dateFrom}`);
      }
      if (filters.dateTo) {
        conditions.push(sql`${quizAttempts.startedAt} <= ${filters.dateTo}`);
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const results = await query
        .limit(limit)
        .offset(offset)
        .orderBy(desc(quizAttempts.startedAt));

      return results.map(({ attempt, quiz, user }: any) => ({
        ...attempt,
        quiz: quiz || undefined,
        user: user || undefined
      }));
    } catch (error) {
      throw new Error(`Failed to find attempts with details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Count total attempts with filters (transaction-aware)
   */
  async count(filters: AttemptFilters = {}, tx?: Transaction): Promise<number> {
    const dbInstance = tx || this.database;

    try {
      let query = dbInstance.select({ count: sql`count(*)` }).from(quizAttempts);

      // Apply filters
      const conditions = [];
      if (filters.userId) {
        conditions.push(eq(quizAttempts.userId, filters.userId));
      }
      if (filters.quizId) {
        conditions.push(eq(quizAttempts.quizId, filters.quizId));
      }
      if (filters.isCompleted !== undefined) {
        conditions.push(eq(quizAttempts.isCompleted, filters.isCompleted));
      }
      if (filters.dateFrom) {
        conditions.push(sql`${quizAttempts.startedAt} >= ${filters.dateFrom}`);
      }
      if (filters.dateTo) {
        conditions.push(sql`${quizAttempts.startedAt} <= ${filters.dateTo}`);
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const result = await query;
      return parseInt(result[0]?.count || '0');
    } catch (error) {
      throw new Error(`Failed to count quiz attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if attempt exists (transaction-aware)
   */
  async exists(id: string, tx?: Transaction): Promise<boolean> {
    const dbInstance = tx || this.database;

    try {
      const [attempt] = await dbInstance
        .select({ id: quizAttempts.id })
        .from(quizAttempts)
        .where(eq(quizAttempts.id, id))
        .limit(1);

      return !!attempt;
    } catch (error) {
      throw new Error(`Failed to check attempt existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const quizAttemptRepository = new QuizAttemptRepository();
