import { db } from './connection';
import { transactionService, type Transaction, type TransactionResult } from './transaction-service';
import { 
  quizzes, 
  quizQuestions, 
  quizAttempts, 
  quizTemplates,
  learningModules,
  moduleMaterials,
  learningProgress
} from './schema';
import { eq, and, desc, asc, count, avg, sum, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

/**
 * Awareness Lab specific database utilities and transaction helpers
 */
export class AwarenessLabDbUtils {
  /**
   * Create a complete quiz with questions in a single transaction
   */
  async createQuizWithQuestions(
    quizData: typeof quizzes.$inferInsert,
    questionsData: (typeof quizQuestions.$inferInsert)[]
  ): Promise<TransactionResult<{ quiz: typeof quizzes.$inferSelect; questions: (typeof quizQuestions.$inferSelect)[] }>> {
    return transactionService.executeInTransaction(async (tx) => {
      // Insert quiz
      const [quiz] = await tx.insert(quizzes).values(quizData).returning();
      
      // Insert questions with quiz ID
      const questionsWithQuizId = questionsData.map(q => ({
        ...q,
        quizId: quiz.id
      }));
      
      const insertedQuestions = await tx.insert(quizQuestions).values(questionsWithQuizId).returning();
      
      return { quiz, questions: insertedQuestions };
    }, 'create-quiz-with-questions');
  }

  /**
   * Create a learning module with materials in a single transaction
   */
  async createModuleWithMaterials(
    moduleData: typeof learningModules.$inferInsert,
    materialsData: (typeof moduleMaterials.$inferInsert)[]
  ): Promise<TransactionResult<{ module: typeof learningModules.$inferSelect; materials: (typeof moduleMaterials.$inferSelect)[] }>> {
    return transactionService.executeInTransaction(async (tx) => {
      // Insert module
      const [module] = await tx.insert(learningModules).values(moduleData).returning();
      
      // Insert materials with module ID
      const materialsWithModuleId = materialsData.map(m => ({
        ...m,
        moduleId: module.id
      }));
      
      const insertedMaterials = await tx.insert(moduleMaterials).values(materialsWithModuleId).returning();
      
      return { module, materials: insertedMaterials };
    }, 'create-module-with-materials');
  }

  /**
   * Delete quiz and all related data in a single transaction
   */
  async deleteQuizCompletely(quizId: string): Promise<TransactionResult<void>> {
    return transactionService.executeInTransaction(async (tx) => {
      // Delete quiz attempts first
      await tx.delete(quizAttempts).where(eq(quizAttempts.quizId, quizId));
      
      // Delete quiz questions (cascade should handle this, but being explicit)
      await tx.delete(quizQuestions).where(eq(quizQuestions.quizId, quizId));
      
      // Delete the quiz
      await tx.delete(quizzes).where(eq(quizzes.id, quizId));
    }, 'delete-quiz-completely');
  }

  /**
   * Delete learning module and all related data in a single transaction
   */
  async deleteModuleCompletely(moduleId: string): Promise<TransactionResult<void>> {
    return transactionService.executeInTransaction(async (tx) => {
      // Delete learning progress first
      await tx.delete(learningProgress).where(eq(learningProgress.moduleId, moduleId));
      
      // Delete module materials (cascade should handle this, but being explicit)
      await tx.delete(moduleMaterials).where(eq(moduleMaterials.moduleId, moduleId));
      
      // Delete the module
      await tx.delete(learningModules).where(eq(learningModules.id, moduleId));
    }, 'delete-module-completely');
  }

  /**
   * Update quiz template usage count atomically
   */
  async incrementTemplateUsage(templateId: string): Promise<TransactionResult<void>> {
    return transactionService.executeInTransaction(async (tx) => {
      await tx
        .update(quizTemplates)
        .set({ 
          usageCount: sql`${quizTemplates.usageCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(quizTemplates.id, templateId));
    }, 'increment-template-usage');
  }

  /**
   * Get quiz statistics with attempt data in a single query
   */
  async getQuizStatistics(quizId: string): Promise<TransactionResult<{
    totalAttempts: number;
    completedAttempts: number;
    averageScore: number;
    averageTimeSeconds: number;
    completionRate: number;
  }>> {
    return transactionService.executeInTransaction(async (tx) => {
      const stats = await tx
        .select({
          totalAttempts: count(),
          completedAttempts: sum(sql`CASE WHEN ${quizAttempts.isCompleted} THEN 1 ELSE 0 END`),
          averageScore: avg(quizAttempts.score),
          averageTimeSeconds: avg(quizAttempts.timeTakenSeconds)
        })
        .from(quizAttempts)
        .where(eq(quizAttempts.quizId, quizId));

      const result = stats[0];
      const completionRate = result.totalAttempts > 0 
        ? (Number(result.completedAttempts) / result.totalAttempts) * 100 
        : 0;

      return {
        totalAttempts: result.totalAttempts,
        completedAttempts: Number(result.completedAttempts),
        averageScore: Number(result.averageScore) || 0,
        averageTimeSeconds: Number(result.averageTimeSeconds) || 0,
        completionRate
      };
    }, 'get-quiz-statistics');
  }

  /**
   * Get user's learning progress for a module
   */
  async getUserModuleProgress(userId: string, moduleId: string): Promise<TransactionResult<{
    totalMaterials: number;
    completedMaterials: number;
    progressPercentage: number;
    lastAccessed?: Date;
  }>> {
    return transactionService.executeInTransaction(async (tx) => {
      // Get total materials count
      const totalMaterialsResult = await tx
        .select({ count: count() })
        .from(moduleMaterials)
        .where(eq(moduleMaterials.moduleId, moduleId));

      const totalMaterials = totalMaterialsResult[0]?.count || 0;

      // Get completed materials count and last accessed
      const progressResult = await tx
        .select({
          completedCount: count(),
          lastAccessed: sql`MAX(${learningProgress.lastAccessed})`
        })
        .from(learningProgress)
        .where(
          and(
            eq(learningProgress.userId, userId),
            eq(learningProgress.moduleId, moduleId),
            eq(learningProgress.isCompleted, true)
          )
        );

      const completedMaterials = progressResult[0]?.completedCount || 0;
      const lastAccessed = progressResult[0]?.lastAccessed as Date | undefined;
      const progressPercentage = totalMaterials > 0 
        ? (completedMaterials / totalMaterials) * 100 
        : 0;

      return {
        totalMaterials,
        completedMaterials,
        progressPercentage,
        lastAccessed
      };
    }, 'get-user-module-progress');
  }

  /**
   * Check if user can attempt a quiz (based on attempt limits)
   */
  async canUserAttemptQuiz(userId: string, quizId: string): Promise<TransactionResult<{
    canAttempt: boolean;
    attemptsUsed: number;
    maxAttempts: number;
    reason?: string;
  }>> {
    return transactionService.executeInTransaction(async (tx) => {
      // Get quiz max attempts
      const quizResult = await tx
        .select({ maxAttempts: quizzes.maxAttempts })
        .from(quizzes)
        .where(eq(quizzes.id, quizId));

      if (quizResult.length === 0) {
        return {
          canAttempt: false,
          attemptsUsed: 0,
          maxAttempts: 0,
          reason: 'Quiz not found'
        };
      }

      const maxAttempts = quizResult[0].maxAttempts;

      // Get user's attempt count
      const attemptResult = await tx
        .select({ count: count() })
        .from(quizAttempts)
        .where(
          and(
            eq(quizAttempts.userId, userId),
            eq(quizAttempts.quizId, quizId)
          )
        );

      const attemptsUsed = attemptResult[0]?.count || 0;
      const canAttempt = attemptsUsed < maxAttempts;

      return {
        canAttempt,
        attemptsUsed,
        maxAttempts,
        reason: canAttempt ? undefined : 'Maximum attempts exceeded'
      };
    }, 'check-user-quiz-attempts');
  }
}

// Export singleton instance
export const awarenessLabDbUtils = new AwarenessLabDbUtils();

// Re-export transaction service for awareness lab operations
export { transactionService };
export type { Transaction, TransactionResult };