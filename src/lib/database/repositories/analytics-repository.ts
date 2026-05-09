import { eq, and, desc, sql, avg, max, min, gte, lte } from 'drizzle-orm';
import { db } from '../connection';
import { quizzes, quizAttempts, quizQuestions, learningModules, learningProgress, users } from '../schema';
import type { Transaction } from '../transaction-service';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface QuizAnalytics {
  quizId: string;
  quizTitle: string;
  totalAttempts: number;
  completedAttempts: number;
  completionRate: number;
  averageScore: number;
  averageTimeMinutes: number;
  highestScore: number;
  lowestScore: number;
  uniqueUsers: number;
  questionAnalytics: QuestionAnalytics[];
  userEngagement: {
    newUsers: number;
    returningUsers: number;
    averageAttemptsPerUser: number;
  };
}

export interface QuestionAnalytics {
  questionId: string;
  questionText: string;
  questionType: 'mcq' | 'true_false' | 'multiple_select';
  totalAnswers: number;
  correctAnswers: number;
  accuracyRate: number;
  commonWrongAnswers: Array<{
    answer: string;
    count: number;
    percentage: number;
  }>;
}

export interface OverviewAnalytics {
  totalQuizzes: number;
  publishedQuizzes: number;
  totalAttempts: number;
  completedAttempts: number;
  overallCompletionRate: number;
  totalUsers: number;
  activeUsers: number;
  averageScoreAcrossAllQuizzes: number;
  totalLearningModules: number;
  publishedLearningModules: number;
  totalMaterialsCompleted: number;
  topPerformingQuizzes: Array<{
    quizId: string;
    title: string;
    completionRate: number;
    averageScore: number;
  }>;
  userEngagementTrends: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
  };
}

export interface UserProgressAnalytics {
  userId: string;
  userEmail: string;
  userName: string;
  quizProgress: {
    totalQuizzesTaken: number;
    completedQuizzes: number;
    averageScore: number;
    bestScore: number;
    totalTimeSpent: number;
  };
  learningProgress: {
    modulesAccessed: number;
    modulesCompleted: number;
    materialsCompleted: number;
    totalLearningTime: number;
  };
  engagementMetrics: {
    firstActivity: Date;
    lastActivity: Date;
    totalSessions: number;
    averageSessionLength: number;
  };
}

export interface LearningAnalytics {
  moduleId: string;
  moduleTitle: string;
  totalUsers: number;
  completedUsers: number;
  completionRate: number;
  averageCompletionTime: number;
  materialAnalytics: Array<{
    materialId: string;
    materialTitle: string;
    materialType: 'link' | 'video' | 'document';
    accessCount: number;
    completionCount: number;
    completionRate: number;
  }>;
}

/**
 * Repository for aggregating quiz statistics and user progress analytics
 */
export class AnalyticsRepository {
  constructor(private readonly database: any = db) { }

  // ===== QUIZ ANALYTICS =====

  /**
   * Get comprehensive analytics for a specific quiz (transaction-aware)
   */
  async getQuizAnalytics(quizId: string, dateRange?: DateRange, tx?: Transaction): Promise<QuizAnalytics | null> {
    const dbInstance = tx || this.database;

    try {
      // Get quiz basic info
      const quiz = await dbInstance
        .select({ id: quizzes.id, title: quizzes.title })
        .from(quizzes)
        .where(eq(quizzes.id, quizId))
        .limit(1);

      if (!quiz[0]) return null;

      // Build date filter condition
      const dateConditions = [eq(quizAttempts.quizId, quizId)];
      if (dateRange) {
        dateConditions.push(gte(quizAttempts.startedAt, dateRange.from));
        dateConditions.push(lte(quizAttempts.startedAt, dateRange.to));
      }

      // Get basic attempt statistics in parallel to optimize database performance
      const [
        totalAttemptsResult,
        completedAttemptsResult,
        scoreStatsResult,
        uniqueUsersResult
      ] = await Promise.all([
        dbInstance
          .select({ count: sql`count(*)` })
          .from(quizAttempts)
          .where(and(...dateConditions)),
        dbInstance
          .select({ count: sql`count(*)` })
          .from(quizAttempts)
          .where(and(...dateConditions, eq(quizAttempts.isCompleted, true))),
        dbInstance
          .select({
            avgScore: avg(quizAttempts.score),
            maxScore: max(quizAttempts.score),
            minScore: min(quizAttempts.score),
            avgTime: avg(quizAttempts.timeTakenSeconds)
          })
          .from(quizAttempts)
          .where(and(...dateConditions, eq(quizAttempts.isCompleted, true))),
        dbInstance
          .select({ count: sql`count(distinct ${quizAttempts.userId})` })
          .from(quizAttempts)
          .where(and(...dateConditions))
      ]);

      // Get user engagement metrics
      const userEngagementResult = await dbInstance
        .select({
          userId: quizAttempts.userId,
          attemptCount: sql`count(*)`
        })
        .from(quizAttempts)
        .where(and(...dateConditions))
        .groupBy(quizAttempts.userId);

      const totalAttempts = parseInt(totalAttemptsResult[0]?.count || '0');
      const completedAttempts = parseInt(completedAttemptsResult[0]?.count || '0');
      const scoreStats = scoreStatsResult[0];
      const uniqueUsers = parseInt(uniqueUsersResult[0]?.count || '0');

      // Calculate user engagement
      const newUsers = userEngagementResult.filter((u: any) => parseInt(u.attemptCount) === 1).length;
      const returningUsers = userEngagementResult.filter((u: any) => parseInt(u.attemptCount) > 1).length;
      const averageAttemptsPerUser = uniqueUsers > 0 ? totalAttempts / uniqueUsers : 0;

      // Get question analytics
      const questionAnalytics = await this.getQuestionAnalytics(quizId, dateRange, tx);

      return {
        quizId,
        quizTitle: quiz[0].title,
        totalAttempts,
        completedAttempts,
        completionRate: totalAttempts > 0 ? (completedAttempts / totalAttempts) * 100 : 0,
        averageScore: parseFloat(scoreStats?.avgScore || '0'),
        averageTimeMinutes: parseFloat(scoreStats?.avgTime || '0') / 60,
        highestScore: scoreStats?.maxScore || 0,
        lowestScore: scoreStats?.minScore || 0,
        uniqueUsers,
        questionAnalytics,
        userEngagement: {
          newUsers,
          returningUsers,
          averageAttemptsPerUser
        }
      };
    } catch (error) {
      throw new Error(`Failed to get quiz analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get question-level analytics for a quiz (transaction-aware)
   */
  async getQuestionAnalytics(quizId: string, dateRange?: DateRange, tx?: Transaction): Promise<QuestionAnalytics[]> {
    const dbInstance = tx || this.database;

    try {
      // Get all questions for the quiz
      const questions = await dbInstance
        .select()
        .from(quizQuestions)
        .where(eq(quizQuestions.quizId, quizId))
        .orderBy(quizQuestions.orderIndex);

      const questionAnalytics: QuestionAnalytics[] = [];

      for (const question of questions) {
        // Build date filter for attempts
        const dateConditions = [eq(quizAttempts.quizId, quizId), eq(quizAttempts.isCompleted, true)];
        if (dateRange) {
          dateConditions.push(gte(quizAttempts.startedAt, dateRange.from));
          dateConditions.push(lte(quizAttempts.startedAt, dateRange.to));
        }

        // Get all completed attempts for this quiz in the date range
        const attempts = await dbInstance
          .select({ answers: quizAttempts.answers })
          .from(quizAttempts)
          .where(and(...dateConditions));

        let totalAnswers = 0;
        let correctAnswers = 0;
        const answerCounts: Record<string, number> = {};

        // Analyze answers for this question
        for (const attempt of attempts) {
          const userAnswers = attempt.answers[question.id];
          if (userAnswers && userAnswers.length > 0) {
            totalAnswers++;

            // Check if answer is correct
            const isCorrect = this.compareAnswers(userAnswers, question.correctAnswers);
            if (isCorrect) {
              correctAnswers++;
            } else {
              // Track wrong answers
              const answerKey = userAnswers.sort().join(',');
              answerCounts[answerKey] = (answerCounts[answerKey] || 0) + 1;
            }
          }
        }

        // Get common wrong answers
        const commonWrongAnswers = Object.entries(answerCounts)
          .map(([answer, count]) => ({
            answer,
            count,
            percentage: totalAnswers > 0 ? (count / totalAnswers) * 100 : 0
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5); // Top 5 wrong answers

        questionAnalytics.push({
          questionId: question.id,
          questionText: question.questionData.question,
          questionType: question.questionType,
          totalAnswers,
          correctAnswers,
          accuracyRate: totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0,
          commonWrongAnswers
        });
      }

      return questionAnalytics;
    } catch (error) {
      throw new Error(`Failed to get question analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get overview analytics for the entire system (transaction-aware)
   */
  async getOverviewAnalytics(dateRange?: DateRange, tx?: Transaction): Promise<OverviewAnalytics> {
    const dbInstance = tx || this.database;

    try {
      // Attempt statistics with date filter
      let attemptDateConditions: any[] = [];
      if (dateRange) {
        attemptDateConditions.push(gte(quizAttempts.startedAt, dateRange.from));
        attemptDateConditions.push(lte(quizAttempts.startedAt, dateRange.to));
      }

      // Fetch overview statistics in parallel for performance optimization
      const [
        totalQuizzesResult,
        publishedQuizzesResult,
        totalAttemptsResult,
        completedAttemptsResult,
        averageScoreResult
      ] = await Promise.all([
        dbInstance.select({ count: sql`count(*)` }).from(quizzes),
        dbInstance.select({ count: sql`count(*)` }).from(quizzes).where(eq(quizzes.isPublished, true)),
        dbInstance.select({ count: sql`count(*)` }).from(quizAttempts).where(attemptDateConditions.length > 0 ? and(...attemptDateConditions) : undefined),
        dbInstance.select({ count: sql`count(*)` }).from(quizAttempts).where(attemptDateConditions.length > 0 ? and(...attemptDateConditions, eq(quizAttempts.isCompleted, true)) : eq(quizAttempts.isCompleted, true)),
        dbInstance.select({ avgScore: avg(quizAttempts.score) }).from(quizAttempts).where(attemptDateConditions.length > 0 ? and(...attemptDateConditions, eq(quizAttempts.isCompleted, true)) : eq(quizAttempts.isCompleted, true))
      ]);

      // Fetch user and learning module statistics in parallel
      const [
        totalUsersResult,
        activeUsersResult,
        totalModulesResult,
        publishedModulesResult,
        completedMaterialsResult
      ] = await Promise.all([
        dbInstance.select({ count: sql`count(*)` }).from(users),
        dbInstance.select({ count: sql`count(distinct ${quizAttempts.userId})` }).from(quizAttempts).where(attemptDateConditions.length > 0 ? and(...attemptDateConditions) : undefined),
        dbInstance.select({ count: sql`count(*)` }).from(learningModules),
        dbInstance.select({ count: sql`count(*)` }).from(learningModules).where(eq(learningModules.isPublished, true)),
        dbInstance.select({ count: sql`count(*)` }).from(learningProgress).where(eq(learningProgress.isCompleted, true))
      ]);

      // Top performing quizzes
      const topQuizzesResult = await dbInstance
        .select({
          quizId: quizzes.id,
          title: quizzes.title,
          completedAttempts: sql`count(case when ${quizAttempts.isCompleted} then 1 end)`,
          totalAttempts: sql`count(*)`,
          avgScore: avg(quizAttempts.score)
        })
        .from(quizzes)
        .leftJoin(quizAttempts, eq(quizzes.id, quizAttempts.quizId))
        .where(eq(quizzes.isPublished, true))
        .groupBy(quizzes.id, quizzes.title)
        .having(sql`count(*) > 0`)
        .orderBy(desc(sql`count(case when ${quizAttempts.isCompleted} then 1 end) / count(*)`))
        .limit(5);

      // User engagement trends
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const dailyActiveUsersResult = await dbInstance
        .select({ count: sql`count(distinct ${quizAttempts.userId})` })
        .from(quizAttempts)
        .where(gte(quizAttempts.startedAt, oneDayAgo));

      const weeklyActiveUsersResult = await dbInstance
        .select({ count: sql`count(distinct ${quizAttempts.userId})` })
        .from(quizAttempts)
        .where(gte(quizAttempts.startedAt, oneWeekAgo));

      const monthlyActiveUsersResult = await dbInstance
        .select({ count: sql`count(distinct ${quizAttempts.userId})` })
        .from(quizAttempts)
        .where(gte(quizAttempts.startedAt, oneMonthAgo));

      const totalAttempts = parseInt(totalAttemptsResult[0]?.count || '0');
      const completedAttempts = parseInt(completedAttemptsResult[0]?.count || '0');

      return {
        totalQuizzes: parseInt(totalQuizzesResult[0]?.count || '0'),
        publishedQuizzes: parseInt(publishedQuizzesResult[0]?.count || '0'),
        totalAttempts,
        completedAttempts,
        overallCompletionRate: totalAttempts > 0 ? (completedAttempts / totalAttempts) * 100 : 0,
        totalUsers: parseInt(totalUsersResult[0]?.count || '0'),
        activeUsers: parseInt(activeUsersResult[0]?.count || '0'),
        averageScoreAcrossAllQuizzes: parseFloat(averageScoreResult[0]?.avgScore || '0'),
        totalLearningModules: parseInt(totalModulesResult[0]?.count || '0'),
        publishedLearningModules: parseInt(publishedModulesResult[0]?.count || '0'),
        totalMaterialsCompleted: parseInt(completedMaterialsResult[0]?.count || '0'),
        topPerformingQuizzes: topQuizzesResult.map((quiz: any) => ({
          quizId: quiz.quizId,
          title: quiz.title,
          completionRate: parseInt(quiz.totalAttempts) > 0
            ? (parseInt(quiz.completedAttempts) / parseInt(quiz.totalAttempts)) * 100
            : 0,
          averageScore: parseFloat(quiz.avgScore || '0')
        })),
        userEngagementTrends: {
          dailyActiveUsers: parseInt(dailyActiveUsersResult[0]?.count || '0'),
          weeklyActiveUsers: parseInt(weeklyActiveUsersResult[0]?.count || '0'),
          monthlyActiveUsers: parseInt(monthlyActiveUsersResult[0]?.count || '0')
        }
      };
    } catch (error) {
      throw new Error(`Failed to get overview analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user progress analytics (transaction-aware)
   */
  async getUserProgressAnalytics(userId: string, tx?: Transaction): Promise<UserProgressAnalytics | null> {
    const dbInstance = tx || this.database;

    try {
      // Get user info
      const user = await dbInstance
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user[0]) return null;

      // Quiz progress
      const quizProgressResult = await dbInstance
        .select({
          totalAttempts: sql`count(*)`,
          completedAttempts: sql`count(case when ${quizAttempts.isCompleted} then 1 end)`,
          avgScore: avg(quizAttempts.score),
          maxScore: max(quizAttempts.score),
          totalTime: sql`sum(${quizAttempts.timeTakenSeconds})`
        })
        .from(quizAttempts)
        .where(eq(quizAttempts.userId, userId));

      // Learning progress
      const learningProgressData: any = await dbInstance
        .select({
          modulesAccessed: sql`count(distinct ${learningProgress.moduleId})`,
          materialsCompleted: sql`count(case when ${learningProgress.isCompleted} then 1 end)`
        })
        .from(learningProgress)
        .where(eq(learningProgress.userId, userId));

      // Engagement metrics
      const engagementResult = await dbInstance
        .select({
          firstActivity: min(quizAttempts.startedAt),
          lastActivity: max(quizAttempts.startedAt),
          totalSessions: sql`count(*)`
        })
        .from(quizAttempts)
        .where(eq(quizAttempts.userId, userId));

      const quizProgress = quizProgressResult[0];
      const learningProgressStats = learningProgressData[0];
      const engagement = engagementResult[0];

      // Calculate modules completed (where all materials are completed)
      const modulesCompletedResult = await dbInstance
        .select({
          moduleId: learningProgress.moduleId,
          completedMaterials: sql`count(case when ${learningProgress.isCompleted} then 1 end)`,
          totalMaterials: sql`count(*)`
        })
        .from(learningProgress)
        .where(eq(learningProgress.userId, userId))
        .groupBy(learningProgress.moduleId);

      const modulesCompleted = modulesCompletedResult.filter(
        (module: any) => parseInt(module.completedMaterials) === parseInt(module.totalMaterials)
      ).length;

      const totalSessions = parseInt(engagement?.totalSessions || '0');
      const totalTimeSpent = parseInt(quizProgress?.totalTime || '0');
      const averageSessionLength = totalSessions > 0 ? totalTimeSpent / totalSessions : 0;

      return {
        userId,
        userEmail: user[0].email,
        userName: `${user[0].firstName} ${user[0].lastName}`,
        quizProgress: {
          totalQuizzesTaken: parseInt(quizProgress?.totalAttempts || '0'),
          completedQuizzes: parseInt(quizProgress?.completedAttempts || '0'),
          averageScore: parseFloat(quizProgress?.avgScore || '0'),
          bestScore: quizProgress?.maxScore || 0,
          totalTimeSpent: totalTimeSpent
        },
        learningProgress: {
          modulesAccessed: parseInt(learningProgressStats?.modulesAccessed || '0'),
          modulesCompleted,
          materialsCompleted: parseInt(learningProgressStats?.materialsCompleted || '0'),
          totalLearningTime: 0 // Would need to track time spent on materials
        },
        engagementMetrics: {
          firstActivity: engagement?.firstActivity || new Date(),
          lastActivity: engagement?.lastActivity || new Date(),
          totalSessions,
          averageSessionLength
        }
      };
    } catch (error) {
      throw new Error(`Failed to get user progress analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get learning module analytics (transaction-aware)
   */
  async getLearningAnalytics(moduleId: string, tx?: Transaction): Promise<LearningAnalytics | null> {
    const dbInstance = tx || this.database;

    try {
      // Get module info
      const module = await dbInstance
        .select({ id: learningModules.id, title: learningModules.title })
        .from(learningModules)
        .where(eq(learningModules.id, moduleId))
        .limit(1);

      if (!module[0]) return null;

      // Get module statistics
      const moduleStatsResult = await dbInstance
        .select({
          totalUsers: sql`count(distinct ${learningProgress.userId})`,
          completedUsers: sql`count(distinct case when ${learningProgress.isCompleted} then ${learningProgress.userId} end)`
        })
        .from(learningProgress)
        .where(eq(learningProgress.moduleId, moduleId));

      // Get material analytics
      const materialAnalyticsResult = await dbInstance
        .select({
          materialId: learningProgress.materialId,
          accessCount: sql`count(*)`,
          completionCount: sql`count(case when ${learningProgress.isCompleted} then 1 end)`
        })
        .from(learningProgress)
        .where(and(
          eq(learningProgress.moduleId, moduleId),
          sql`${learningProgress.materialId} IS NOT NULL`
        ))
        .groupBy(learningProgress.materialId);

      // Get material details
      const materialAnalytics = [];
      for (const materialStat of materialAnalyticsResult) {
        if (materialStat.materialId) {
          const accessCount = parseInt(materialStat.accessCount);
          const completionCount = parseInt(materialStat.completionCount);

          materialAnalytics.push({
            materialId: materialStat.materialId,
            materialTitle: 'Material', // Would need proper join
            materialType: 'link' as const, // Would need proper join
            accessCount,
            completionCount,
            completionRate: accessCount > 0 ? (completionCount / accessCount) * 100 : 0
          });
        }
      }

      const moduleStats = moduleStatsResult[0];
      const totalUsers = parseInt(moduleStats?.totalUsers || '0');
      const completedUsers = parseInt(moduleStats?.completedUsers || '0');

      return {
        moduleId,
        moduleTitle: module[0].title,
        totalUsers,
        completedUsers,
        completionRate: totalUsers > 0 ? (completedUsers / totalUsers) * 100 : 0,
        averageCompletionTime: 0, // Would need to track time spent
        materialAnalytics
      };
    } catch (error) {
      throw new Error(`Failed to get learning analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get quiz leaderboard (transaction-aware)
   */
  async getQuizLeaderboard(quizId: string, limit: number = 10, tx?: Transaction): Promise<Array<{
    userId: string;
    userName: string;
    bestScore: number;
    attemptCount: number;
    lastAttempt: Date;
  }>> {
    const dbInstance = tx || this.database;

    try {
      const leaderboardResult = await dbInstance
        .select({
          userId: quizAttempts.userId,
          userName: sql`${users.firstName} || ' ' || ${users.lastName}`,
          bestScore: max(quizAttempts.score),
          attemptCount: sql`count(*)`,
          lastAttempt: max(quizAttempts.startedAt)
        })
        .from(quizAttempts)
        .leftJoin(users, eq(quizAttempts.userId, users.id))
        .where(and(
          eq(quizAttempts.quizId, quizId),
          eq(quizAttempts.isCompleted, true)
        ))
        .groupBy(quizAttempts.userId, users.firstName, users.lastName)
        .orderBy(desc(max(quizAttempts.score)), desc(max(quizAttempts.startedAt)))
        .limit(limit);

      return leaderboardResult.map((result: any) => ({
        userId: result.userId,
        userName: result.userName || 'Unknown User',
        bestScore: result.bestScore || 0,
        attemptCount: parseInt(result.attemptCount),
        lastAttempt: result.lastAttempt || new Date()
      }));
    } catch (error) {
      throw new Error(`Failed to get quiz leaderboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Compare user answers with correct answers
   */
  private compareAnswers(userAnswers: string[], correctAnswers: string[]): boolean {
    if (userAnswers.length !== correctAnswers.length) return false;

    const sortedUser = [...userAnswers].sort();
    const sortedCorrect = [...correctAnswers].sort();

    return sortedUser.every((answer, index) => answer === sortedCorrect[index]);
  }

  /**
   * Get analytics for multiple quizzes (transaction-aware)
   */
  async getMultipleQuizAnalytics(quizIds: string[], dateRange?: DateRange, tx?: Transaction): Promise<QuizAnalytics[]> {
    const analytics: QuizAnalytics[] = [];

    for (const quizId of quizIds) {
      const quizAnalytics = await this.getQuizAnalytics(quizId, dateRange, tx);
      if (quizAnalytics) {
        analytics.push(quizAnalytics);
      }
    }

    return analytics;
  }

  /**
   * Get detailed quiz attempts with filtering (transaction-aware)
   */
  async getDetailedQuizAttempts(
    quizId: string,
    filters: {
      completedOnly?: boolean;
      minScore?: number;
      maxScore?: number;
      userId?: string;
      dateRange?: DateRange;
    },
    limit: number,
    offset: number,
    tx?: Transaction
  ): Promise<Array<{
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    score: number;
    timeTakenSeconds: number;
    isCompleted: boolean;
    startedAt: Date;
    completedAt: Date | null;
    answers: Record<string, string[]>;
  }>> {
    const dbInstance = tx || this.database;

    try {
      // Build filter conditions
      const conditions = [eq(quizAttempts.quizId, quizId)];

      if (filters.completedOnly) {
        conditions.push(eq(quizAttempts.isCompleted, true));
      }

      if (filters.minScore !== undefined) {
        conditions.push(gte(quizAttempts.score, filters.minScore));
      }

      if (filters.maxScore !== undefined) {
        conditions.push(lte(quizAttempts.score, filters.maxScore));
      }

      if (filters.userId) {
        conditions.push(eq(quizAttempts.userId, filters.userId));
      }

      if (filters.dateRange) {
        conditions.push(gte(quizAttempts.startedAt, filters.dateRange.from));
        conditions.push(lte(quizAttempts.startedAt, filters.dateRange.to));
      }

      const attempts = await dbInstance
        .select({
          id: quizAttempts.id,
          userId: quizAttempts.userId,
          userName: sql`${users.firstName} || ' ' || ${users.lastName}`,
          userEmail: users.email,
          score: quizAttempts.score,
          timeTakenSeconds: quizAttempts.timeTakenSeconds,
          isCompleted: quizAttempts.isCompleted,
          startedAt: quizAttempts.startedAt,
          completedAt: quizAttempts.completedAt,
          answers: quizAttempts.answers
        })
        .from(quizAttempts)
        .leftJoin(users, eq(quizAttempts.userId, users.id))
        .where(and(...conditions))
        .orderBy(desc(quizAttempts.startedAt))
        .limit(limit)
        .offset(offset);

      return attempts.map((attempt: any) => ({
        id: attempt.id,
        userId: attempt.userId,
        userName: attempt.userName || 'Unknown User',
        userEmail: attempt.userEmail || 'unknown@example.com',
        score: attempt.score || 0,
        timeTakenSeconds: attempt.timeTakenSeconds || 0,
        isCompleted: attempt.isCompleted || false,
        startedAt: attempt.startedAt || new Date(),
        completedAt: attempt.completedAt,
        answers: attempt.answers || {}
      }));
    } catch (error) {
      throw new Error(`Failed to get detailed quiz attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get count of quiz attempts matching filters (transaction-aware)
   */
  async getQuizAttemptsCount(
    quizId: string,
    filters: {
      completedOnly?: boolean;
      minScore?: number;
      maxScore?: number;
      userId?: string;
      dateRange?: DateRange;
    },
    tx?: Transaction
  ): Promise<number> {
    const dbInstance = tx || this.database;

    try {
      // Build filter conditions
      const conditions = [eq(quizAttempts.quizId, quizId)];

      if (filters.completedOnly) {
        conditions.push(eq(quizAttempts.isCompleted, true));
      }

      if (filters.minScore !== undefined) {
        conditions.push(gte(quizAttempts.score, filters.minScore));
      }

      if (filters.maxScore !== undefined) {
        conditions.push(lte(quizAttempts.score, filters.maxScore));
      }

      if (filters.userId) {
        conditions.push(eq(quizAttempts.userId, filters.userId));
      }

      if (filters.dateRange) {
        conditions.push(gte(quizAttempts.startedAt, filters.dateRange.from));
        conditions.push(lte(quizAttempts.startedAt, filters.dateRange.to));
      }

      const result = await dbInstance
        .select({ count: sql`count(*)` })
        .from(quizAttempts)
        .where(and(...conditions));

      return parseInt(result[0]?.count || '0');
    } catch (error) {
      throw new Error(`Failed to get quiz attempts count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user demographics analytics (transaction-aware)
   */
  async getUserDemographicsAnalytics(dateRange?: DateRange, tx?: Transaction): Promise<{
    totalUsers: number;
    usersByRole: Array<{ role: string; count: number; percentage: number }>;
    usersByStatus: Array<{ status: string; count: number; percentage: number }>;
    usersByLanguage: Array<{ language: string; count: number; percentage: number }>;
    usersByCountry: Array<{ country: string; count: number; percentage: number }>;
    usersByRegistrationDate: Array<{ date: string; count: number }>;
    engagementByDemographic: {
      byRole: Array<{ role: string; averageQuizzes: number; averageScore: number }>;
      byCountry: Array<{ country: string; averageQuizzes: number; averageScore: number }>;
    };
  }> {
    const dbInstance = tx || this.database;

    try {
      // Get total users count
      const totalUsersResult = await dbInstance
        .select({ count: sql`count(*)` })
        .from(users);

      const totalUsers = parseInt(totalUsersResult[0]?.count || '0');

      // Users by role
      const usersByRoleResult = await dbInstance
        .select({
          role: users.role,
          count: sql`count(*)`
        })
        .from(users)
        .groupBy(users.role);

      const usersByRole = usersByRoleResult.map((item: any) => ({
        role: item.role || 'unknown',
        count: parseInt(item.count),
        percentage: totalUsers > 0 ? (parseInt(item.count) / totalUsers) * 100 : 0
      }));

      // Users by approval status
      const usersByStatusResult = await dbInstance
        .select({
          status: sql`case when ${users.isApproved} then 'approved' else 'pending' end`,
          count: sql`count(*)`
        })
        .from(users)
        .groupBy(sql`case when ${users.isApproved} then 'approved' else 'pending' end`);

      const usersByStatus = usersByStatusResult.map((item: any) => ({
        status: item.status || 'unknown',
        count: parseInt(item.count),
        percentage: totalUsers > 0 ? (parseInt(item.count) / totalUsers) * 100 : 0
      }));

      // Users by registration date (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const usersByDateResult = await dbInstance
        .select({
          date: sql`date(${users.createdAt})`,
          count: sql`count(*)`
        })
        .from(users)
        .where(gte(users.createdAt, thirtyDaysAgo))
        .groupBy(sql`date(${users.createdAt})`)
        .orderBy(sql`date(${users.createdAt})`);

      const usersByRegistrationDate = usersByDateResult.map((item: any) => ({
        date: item.date || new Date().toISOString().split('T')[0],
        count: parseInt(item.count)
      }));

      // Engagement by role
      const engagementByRoleResult = await dbInstance
        .select({
          role: users.role,
          averageQuizzes: avg(sql`quiz_count`),
          averageScore: avg(sql`avg_score`)
        })
        .from(users)
        .leftJoin(
          sql`(
            SELECT 
              user_id,
              COUNT(*) as quiz_count,
              AVG(score) as avg_score
            FROM quiz_attempts 
            WHERE is_completed = true
            GROUP BY user_id
          ) as user_stats`,
          eq(users.id, sql`user_stats.user_id`)
        )
        .groupBy(users.role);

      const engagementByRole = engagementByRoleResult.map((item: any) => ({
        role: item.role || 'unknown',
        averageQuizzes: parseFloat(item.averageQuizzes || '0'),
        averageScore: parseFloat(item.averageScore || '0')
      }));

      // Placeholder data for missing fields (would need proper schema)
      const usersByLanguage = [
        { language: 'en', count: Math.floor(totalUsers * 0.6), percentage: 60 },
        { language: 'ar', count: Math.floor(totalUsers * 0.4), percentage: 40 }
      ];

      const usersByCountry = [
        { country: 'Unknown', count: totalUsers, percentage: 100 }
      ];

      const engagementByCountry = [
        { country: 'Unknown', averageQuizzes: 0, averageScore: 0 }
      ];

      return {
        totalUsers,
        usersByRole,
        usersByStatus,
        usersByLanguage,
        usersByCountry,
        usersByRegistrationDate,
        engagementByDemographic: {
          byRole: engagementByRole,
          byCountry: engagementByCountry
        }
      };
    } catch (error) {
      throw new Error(`Failed to get user demographics analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get system-wide engagement metrics (transaction-aware)
   */
  async getEngagementMetrics(dateRange?: DateRange, tx?: Transaction): Promise<{
    totalSessions: number;
    averageSessionLength: number;
    bounceRate: number;
    retentionRate: number;
  }> {
    const dbInstance = tx || this.database;

    try {
      let dateConditions = [];
      if (dateRange) {
        dateConditions.push(gte(quizAttempts.startedAt, dateRange.from));
        dateConditions.push(lte(quizAttempts.startedAt, dateRange.to));
      }

      const sessionMetricsResult = await dbInstance
        .select({
          totalSessions: sql`count(*)`,
          avgSessionLength: avg(quizAttempts.timeTakenSeconds),
          completedSessions: sql`count(case when ${quizAttempts.isCompleted} then 1 end)`
        })
        .from(quizAttempts)
        .where(dateConditions.length > 0 ? and(...dateConditions) : undefined);

      const metrics = sessionMetricsResult[0];
      const totalSessions = parseInt(metrics?.totalSessions || '0');
      const completedSessions = parseInt(metrics?.completedSessions || '0');

      return {
        totalSessions,
        averageSessionLength: parseFloat(metrics?.avgSessionLength || '0'),
        bounceRate: totalSessions > 0 ? ((totalSessions - completedSessions) / totalSessions) * 100 : 0,
        retentionRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0
      };
    } catch (error) {
      throw new Error(`Failed to get engagement metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const analyticsRepository = new AnalyticsRepository();