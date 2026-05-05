import { eq, and, desc, asc, sql, inArray } from 'drizzle-orm';
import { db } from '../connection';
import { quizzes, quizQuestions, quizTemplates } from '../schema';
import type { Transaction } from '../transaction-service';

export interface CreateQuizData {
  title: string;
  description?: string;
  language: 'en' | 'ar';
  targetAudience?: 'customer' | 'expert';
  timeLimitMinutes: number;
  maxAttempts: number;
  templateId?: string;
  isPublished?: boolean;
  endDate?: Date;
}

export interface UpdateQuizData {
  title?: string;
  description?: string;
  language?: 'en' | 'ar';
  targetAudience?: 'customer' | 'expert';
  timeLimitMinutes?: number;
  maxAttempts?: number;
  isPublished?: boolean;
  endDate?: Date;
}

export interface CreateQuestionData {
  questionType: 'mcq' | 'true_false' | 'multiple_select';
  questionData: {
    question: string;
    options?: string[];
    explanation?: string;
  };
  correctAnswers: string[];
  orderIndex: number;
}

export interface UpdateQuestionData {
  questionType?: 'mcq' | 'true_false' | 'multiple_select';
  questionData?: {
    question: string;
    options?: string[];
    explanation?: string;
  };
  correctAnswers?: string[];
  orderIndex?: number;
}

export interface QuizWithQuestions {
  id: string;
  createdBy: string;
  templateId: string | null;
  title: string;
  description: string | null;
  language: 'en' | 'ar';
  targetAudience: 'customer' | 'expert';
  timeLimitMinutes: number;
  maxAttempts: number;
  isPublished: boolean;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  questions: Array<{
    id: string;
    quizId: string;
    questionType: 'mcq' | 'true_false' | 'multiple_select';
    questionData: {
      question: string;
      options?: string[];
      explanation?: string;
    };
    correctAnswers: string[];
    orderIndex: number;
    createdAt: Date;
  }>;
}

export interface QuizFilters {
  language?: 'en' | 'ar';
  targetAudience?: 'customer' | 'expert';
  isPublished?: boolean;
  createdBy?: string;
  templateId?: string;
  search?: string;
}

/**
 * Repository for managing quizzes and quiz questions
 */
export class QuizRepository {
  constructor(private readonly database: any = db) { }

  /**
   * Create a new quiz (transaction-aware)
   */
  async create(createdBy: string, quizData: CreateQuizData, tx?: Transaction): Promise<any> {
    const dbInstance = tx || this.database;

    try {
      const [quiz] = await dbInstance
        .insert(quizzes)
        .values({
          createdBy,
          ...quizData,
          isPublished: quizData.isPublished ?? false,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      if (!quiz) {
        throw new Error('Failed to create quiz');
      }

      // If using a template, increment its usage count
      if (quizData.templateId && tx) {
        await dbInstance
          .update(quizTemplates)
          .set({
            usageCount: sql`${quizTemplates.usageCount} + 1`,
            updatedAt: new Date()
          })
          .where(eq(quizTemplates.id, quizData.templateId));
      }

      return quiz;
    } catch (error) {
      throw new Error(`Failed to create quiz: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find quiz by ID (transaction-aware)
   */
  async findById(id: string, tx?: Transaction): Promise<any | null> {
    const dbInstance = tx || this.database;

    try {
      const [quiz] = await dbInstance
        .select()
        .from(quizzes)
        .where(eq(quizzes.id, id))
        .limit(1);

      return quiz || null;
    } catch (error) {
      throw new Error(`Failed to find quiz by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find quiz with questions by ID (transaction-aware)
   */
  async findByIdWithQuestions(id: string, tx?: Transaction): Promise<QuizWithQuestions | null> {
    const dbInstance = tx || this.database;

    try {
      const quiz = await this.findById(id, tx);
      if (!quiz) return null;

      const questions = await dbInstance
        .select()
        .from(quizQuestions)
        .where(eq(quizQuestions.quizId, id))
        .orderBy(asc(quizQuestions.orderIndex));

      return {
        ...quiz,
        questions
      };
    } catch (error) {
      throw new Error(`Failed to find quiz with questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find multiple quizzes with filters and pagination (transaction-aware)
   */
  async findMany(
    filters: QuizFilters = {},
    limit: number = 20,
    offset: number = 0,
    tx?: Transaction
  ): Promise<any[]> {
    const dbInstance = tx || this.database;

    try {
      let query = dbInstance.select().from(quizzes);

      // Apply filters
      const conditions = [];
      if (filters.language) {
        conditions.push(eq(quizzes.language, filters.language));
      }
      if (filters.targetAudience) {
        conditions.push(eq(quizzes.targetAudience, filters.targetAudience));
      }
      if (filters.isPublished !== undefined) {
        conditions.push(eq(quizzes.isPublished, filters.isPublished));
      }
      if (filters.createdBy) {
        conditions.push(eq(quizzes.createdBy, filters.createdBy));
      }
      if (filters.templateId) {
        conditions.push(eq(quizzes.templateId, filters.templateId));
      }
      if (filters.search) {
        conditions.push(
          sql`(${quizzes.title} ILIKE ${`%${filters.search}%`} OR ${quizzes.description} ILIKE ${`%${filters.search}%`})`
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const quizzesList = await query
        .limit(limit)
        .offset(offset)
        .orderBy(desc(quizzes.createdAt));

      return quizzesList;
    } catch (error) {
      throw new Error(`Failed to find quizzes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find published quizzes for users (transaction-aware)
   * Only returns quizzes that are published and not expired
   */
  async findPublished(language?: 'en' | 'ar', limit: number = 20, offset: number = 0, userRole?: 'customer' | 'expert' | 'admin', tx?: Transaction): Promise<any[]> {
    const dbInstance = tx || this.database;

    try {
      let query = dbInstance.select().from(quizzes);

      // Apply filters for published and non-expired quizzes
      const conditions = [
        eq(quizzes.isPublished, true),
        // Include quizzes with no end date or end date in the future
        sql`(${quizzes.endDate} IS NULL OR ${quizzes.endDate} > NOW())`
      ];

      if (language) {
        conditions.push(eq(quizzes.language, language));
      }

      // Filter by target audience based on user role
      if (userRole === 'customer') {
        conditions.push(eq(quizzes.targetAudience, 'customer'));
      } else if (userRole === 'expert') {
        // Experts can see both customer and expert quizzes
        conditions.push(sql`(${quizzes.targetAudience} = 'customer' OR ${quizzes.targetAudience} = 'expert')`);
      }
      // Admins can see all quizzes (no additional filter needed)

      const quizzesList = await query
        .where(and(...conditions))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(quizzes.createdAt));

      return quizzesList;
    } catch (error) {
      throw new Error(`Failed to find published quizzes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update quiz by ID (transaction-aware)
   */
  async update(id: string, updateData: UpdateQuizData, tx?: Transaction): Promise<any | null> {
    const dbInstance = tx || this.database;

    try {
      const [quiz] = await dbInstance
        .update(quizzes)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(quizzes.id, id))
        .returning();

      return quiz || null;
    } catch (error) {
      throw new Error(`Failed to update quiz: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete quiz by ID (transaction-aware)
   */
  async delete(id: string, tx?: Transaction): Promise<boolean> {
    const dbInstance = tx || this.database;

    try {
      // Questions will be deleted automatically due to cascade delete
      const result = await dbInstance
        .delete(quizzes)
        .where(eq(quizzes.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      throw new Error(`Failed to delete quiz: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Publish/unpublish quiz (transaction-aware)
   */
  async setPublished(id: string, isPublished: boolean, tx?: Transaction): Promise<any | null> {
    return this.update(id, { isPublished }, tx);
  }

  /**
   * Count total quizzes with filters (transaction-aware)
   */
  async count(filters: QuizFilters = {}, tx?: Transaction): Promise<number> {
    const dbInstance = tx || this.database;

    try {
      let query = dbInstance.select({ count: sql`count(*)` }).from(quizzes);

      // Apply filters
      const conditions = [];
      if (filters.language) {
        conditions.push(eq(quizzes.language, filters.language));
      }
      if (filters.targetAudience) {
        conditions.push(eq(quizzes.targetAudience, filters.targetAudience));
      }
      if (filters.isPublished !== undefined) {
        conditions.push(eq(quizzes.isPublished, filters.isPublished));
      }
      if (filters.createdBy) {
        conditions.push(eq(quizzes.createdBy, filters.createdBy));
      }
      if (filters.templateId) {
        conditions.push(eq(quizzes.templateId, filters.templateId));
      }
      if (filters.search) {
        conditions.push(
          sql`(${quizzes.title} ILIKE ${`%${filters.search}%`} OR ${quizzes.description} ILIKE ${`%${filters.search}%`})`
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const result = await query;
      return parseInt(result[0]?.count || '0');
    } catch (error) {
      throw new Error(`Failed to count quizzes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add question to quiz (transaction-aware)
   */
  async addQuestion(quizId: string, questionData: CreateQuestionData, tx?: Transaction): Promise<any> {
    const dbInstance = tx || this.database;

    try {
      const [question] = await dbInstance
        .insert(quizQuestions)
        .values({
          quizId,
          ...questionData,
          createdAt: new Date()
        })
        .returning();

      if (!question) {
        throw new Error('Failed to create question');
      }

      return question;
    } catch (error) {
      throw new Error(`Failed to add question: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update question by ID (transaction-aware)
   */
  async updateQuestion(questionId: string, updateData: UpdateQuestionData, tx?: Transaction): Promise<any | null> {
    const dbInstance = tx || this.database;

    try {
      const [question] = await dbInstance
        .update(quizQuestions)
        .set(updateData)
        .where(eq(quizQuestions.id, questionId))
        .returning();

      return question || null;
    } catch (error) {
      throw new Error(`Failed to update question: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete question by ID (transaction-aware)
   */
  async deleteQuestion(questionId: string, tx?: Transaction): Promise<boolean> {
    const dbInstance = tx || this.database;

    try {
      const result = await dbInstance
        .delete(quizQuestions)
        .where(eq(quizQuestions.id, questionId))
        .returning();

      return result.length > 0;
    } catch (error) {
      throw new Error(`Failed to delete question: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete all questions for a quiz (transaction-aware)
   */
  async deleteAllQuestions(quizId: string, tx?: Transaction): Promise<number> {
    const dbInstance = tx || this.database;

    try {
      const result = await dbInstance
        .delete(quizQuestions)
        .where(eq(quizQuestions.quizId, quizId))
        .returning();

      return result.length;
    } catch (error) {
      throw new Error(`Failed to delete quiz questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get questions for a quiz (transaction-aware)
   */
  async getQuestions(quizId: string, tx?: Transaction): Promise<any[]> {
    const dbInstance = tx || this.database;

    try {
      const questions = await dbInstance
        .select()
        .from(quizQuestions)
        .where(eq(quizQuestions.quizId, quizId))
        .orderBy(asc(quizQuestions.orderIndex));

      return questions;
    } catch (error) {
      throw new Error(`Failed to get quiz questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reorder questions for a quiz with validation (transaction-aware)
   */
  async reorderQuestions(quizId: string, questionIds: string[], tx?: Transaction): Promise<void> {
    const dbInstance = tx || this.database;

    try {
      // First, validate that all questions belong to the quiz
      const existingQuestions = await dbInstance
        .select({ id: quizQuestions.id, orderIndex: quizQuestions.orderIndex })
        .from(quizQuestions)
        .where(eq(quizQuestions.quizId, quizId));

      const existingQuestionIds = existingQuestions.map((q: any) => q.id);

      // Check if all provided question IDs exist and belong to this quiz
      const invalidQuestions = questionIds.filter(id => !existingQuestionIds.includes(id));
      if (invalidQuestions.length > 0) {
        throw new Error(`Invalid question IDs: ${invalidQuestions.join(', ')}`);
      }

      // Check if all existing questions are included in the reorder
      if (questionIds.length !== existingQuestions.length) {
        throw new Error('All questions must be included in reorder operation');
      }

      // Update order indices
      for (let i = 0; i < questionIds.length; i++) {
        await dbInstance
          .update(quizQuestions)
          .set({
            orderIndex: i + 1,
            updatedAt: new Date()
          })
          .where(eq(quizQuestions.id, questionIds[i]));
      }
    } catch (error) {
      throw new Error(`Failed to reorder questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Duplicate a question within the same quiz
   */
  async duplicateQuestion(questionId: string, tx?: Transaction): Promise<any> {
    const dbInstance = tx || this.database;

    try {
      // Get the original question
      const [originalQuestion] = await dbInstance
        .select()
        .from(quizQuestions)
        .where(eq(quizQuestions.id, questionId))
        .limit(1);

      if (!originalQuestion) {
        throw new Error('Question not found');
      }

      // Check if the quiz is published
      const [quiz] = await dbInstance
        .select({ isPublished: quizzes.isPublished })
        .from(quizzes)
        .where(eq(quizzes.id, originalQuestion.quizId))
        .limit(1);

      if (quiz?.isPublished) {
        throw new Error('Cannot duplicate questions in published quiz');
      }

      // Get the highest order index for this quiz
      const [maxOrder] = await dbInstance
        .select({ maxOrder: sql<number>`MAX(${quizQuestions.orderIndex})` })
        .from(quizQuestions)
        .where(eq(quizQuestions.quizId, originalQuestion.quizId));

      const newOrderIndex = (maxOrder?.maxOrder || 0) + 1;

      // Create duplicate question
      const [duplicatedQuestion] = await dbInstance
        .insert(quizQuestions)
        .values({
          quizId: originalQuestion.quizId,
          questionType: originalQuestion.questionType,
          questionData: originalQuestion.questionData,
          correctAnswers: originalQuestion.correctAnswers,
          orderIndex: newOrderIndex,
          createdAt: new Date()
        })
        .returning();

      return duplicatedQuestion;
    } catch (error) {
      throw new Error(`Failed to duplicate question: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Bulk update questions for a quiz
   */
  async bulkUpdateQuestions(
    updates: Array<{ id: string; data: UpdateQuestionData }>,
    tx?: Transaction
  ): Promise<any[]> {
    const dbInstance = tx || this.database;

    try {
      const updatedQuestions = [];

      for (const update of updates) {
        const [question] = await dbInstance
          .update(quizQuestions)
          .set({
            ...update.data,
            updatedAt: new Date()
          })
          .where(eq(quizQuestions.id, update.id))
          .returning();

        if (question) {
          updatedQuestions.push(question);
        }
      }

      return updatedQuestions;
    } catch (error) {
      throw new Error(`Failed to bulk update questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate question answer consistency
   */
  async validateQuestionAnswers(questionId: string, tx?: Transaction): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const dbInstance = tx || this.database;

    try {
      const [question] = await dbInstance
        .select()
        .from(quizQuestions)
        .where(eq(quizQuestions.id, questionId))
        .limit(1);

      if (!question) {
        return { isValid: false, errors: ['Question not found'] };
      }

      const errors: string[] = [];

      // Validate based on question type
      switch (question.questionType) {
        case 'true_false':
          if (!Array.isArray(question.correctAnswers) || question.correctAnswers.length !== 1) {
            errors.push('True/False questions must have exactly one correct answer');
          } else if (!['true', 'false'].includes(question.correctAnswers[0]?.toLowerCase())) {
            errors.push('True/False answer must be "true" or "false"');
          }
          break;

        case 'mcq':
          if (!Array.isArray(question.correctAnswers) || question.correctAnswers.length !== 1) {
            errors.push('Multiple choice questions must have exactly one correct answer');
          }
          if (!question.questionData?.options || !Array.isArray(question.questionData.options)) {
            errors.push('Multiple choice questions must have options');
          } else if (question.correctAnswers && question.correctAnswers.length > 0) {
            const validAnswers = question.correctAnswers.filter((answer: any) =>
              question.questionData.options.includes(answer)
            );
            if (validAnswers.length !== question.correctAnswers.length) {
              errors.push('Correct answers must match available options');
            }
          }
          break;

        case 'multiple_select':
          if (!Array.isArray(question.correctAnswers) || question.correctAnswers.length === 0) {
            errors.push('Multiple select questions must have at least one correct answer');
          }
          if (!question.questionData?.options || !Array.isArray(question.questionData.options)) {
            errors.push('Multiple select questions must have options');
          } else if (question.correctAnswers && question.correctAnswers.length > 0) {
            const validAnswers = question.correctAnswers.filter((answer: any) =>
              question.questionData.options.includes(answer)
            );
            if (validAnswers.length !== question.correctAnswers.length) {
              errors.push('Correct answers must match available options');
            }
          }
          break;

        default:
          errors.push('Invalid question type');
      }

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Check if quiz exists (transaction-aware)
   */
  async exists(id: string, tx?: Transaction): Promise<boolean> {
    const dbInstance = tx || this.database;

    try {
      const [quiz] = await dbInstance
        .select({ id: quizzes.id })
        .from(quizzes)
        .where(eq(quizzes.id, id))
        .limit(1);

      return !!quiz;
    } catch (error) {
      throw new Error(`Failed to check quiz existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if quiz is active (published and not expired)
   */
  async isQuizActive(id: string, tx?: Transaction): Promise<boolean> {
    const dbInstance = tx || this.database;

    try {
      const [quiz] = await dbInstance
        .select({
          id: quizzes.id,
          isPublished: quizzes.isPublished,
          endDate: quizzes.endDate
        })
        .from(quizzes)
        .where(
          and(
            eq(quizzes.id, id),
            eq(quizzes.isPublished, true),
            sql`(${quizzes.endDate} IS NULL OR ${quizzes.endDate} > NOW())`
          )
        )
        .limit(1);

      return !!quiz;
    } catch (error) {
      throw new Error(`Failed to check quiz active status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Archive a quiz (soft delete)
   */
  async archive(id: string, archivedBy: string, tx?: Transaction): Promise<boolean> {
    const dbInstance = tx || this.database;

    try {
      const [updatedQuiz] = await dbInstance
        .update(quizzes)
        .set({
          isArchived: true,
          archivedAt: new Date(),
          archivedBy,
          updatedAt: new Date()
        })
        .where(eq(quizzes.id, id))
        .returning({ id: quizzes.id });

      return !!updatedQuiz;
    } catch (error) {
      throw new Error(`Failed to archive quiz: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Archive a quiz with reason tracking (enhanced version)
   */
  async archiveWithReason(
    id: string,
    archivedBy: string,
    reason: string,
    tx?: Transaction
  ): Promise<boolean> {
    const dbInstance = tx || this.database;

    try {
      // First check if quiz exists
      const existingQuiz = await this.findById(id, tx);
      if (!existingQuiz) {
        throw new Error('Quiz not found');
      }

      if (existingQuiz.isArchived) {
        throw new Error('Quiz is already archived');
      }

      const [updatedQuiz] = await dbInstance
        .update(quizzes)
        .set({
          isArchived: true,
          archivedAt: new Date(),
          archivedBy,
          updatedAt: new Date()
        })
        .where(eq(quizzes.id, id))
        .returning({ id: quizzes.id });

      // Log the archival reason (could be stored in a separate audit table if needed)
      console.log(`Quiz ${id} archived by ${archivedBy}. Reason: ${reason}`);

      return !!updatedQuiz;
    } catch (error) {
      throw new Error(`Failed to archive quiz with reason: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Unarchive a quiz
   */
  async unarchive(id: string, tx?: Transaction): Promise<boolean> {
    const dbInstance = tx || this.database;

    try {
      const [updatedQuiz] = await dbInstance
        .update(quizzes)
        .set({
          isArchived: false,
          archivedAt: null,
          archivedBy: null,
          updatedAt: new Date()
        })
        .where(eq(quizzes.id, id))
        .returning({ id: quizzes.id });

      return !!updatedQuiz;
    } catch (error) {
      throw new Error(`Failed to unarchive quiz: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if quiz can be deleted (no attempts)
   */
  async canBeDeleted(id: string, tx?: Transaction): Promise<boolean> {
    const dbInstance = tx || this.database;

    try {
      // Check if quiz has any attempts - would need quiz attempt table
      // For now, return false if quiz is published as a safety measure
      const [quiz] = await dbInstance
        .select({
          isPublished: quizzes.isPublished,
          createdAt: quizzes.createdAt
        })
        .from(quizzes)
        .where(eq(quizzes.id, id))
        .limit(1);

      if (!quiz) return false;

      // If quiz has been published, it likely has attempts
      // Or if it's older than 1 day, be safe and don't allow deletion
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      return !quiz.isPublished && new Date(quiz.createdAt) > oneDayAgo;
    } catch (error) {
      throw new Error(`Failed to check if quiz can be deleted: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get quizzes that should be auto-archived (2 days after end date)
   */
  async getQuizzesForAutoArchive(tx?: Transaction): Promise<Array<{ id: string; title: string; endDate: Date }>> {
    const dbInstance = tx || this.database;

    try {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const quizzesToArchive = await dbInstance
        .select({
          id: quizzes.id,
          title: quizzes.title,
          endDate: quizzes.endDate
        })
        .from(quizzes)
        .where(
          and(
            eq(quizzes.isArchived, false),
            sql`${quizzes.endDate} IS NOT NULL`,
            sql`${quizzes.endDate} < ${twoDaysAgo}`
          )
        );

      return quizzesToArchive.map((q: any) => ({
        id: q.id,
        title: q.title,
        endDate: q.endDate!
      }));
    } catch (error) {
      throw new Error(`Failed to get quizzes for auto-archive: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find orphaned quiz questions (questions without a valid quiz)
   */
  async findOrphanedQuestions(tx?: Transaction): Promise<string[]> {
    const dbInstance = tx || this.database;

    try {
      // This would require access to quiz_questions table
      // For now, return empty array as placeholder
      // In a real implementation, you'd join quiz_questions with quizzes
      // and find questions where quiz_id doesn't exist in quizzes table
      return [];
    } catch (error) {
      throw new Error(`Failed to find orphaned questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean up orphaned quiz data
   */
  async cleanupOrphanedData(tx?: Transaction): Promise<{ deletedQuestions: number; deletedAttempts: number }> {
    const dbInstance = tx || this.database;

    try {
      // This is a placeholder implementation
      // In a real scenario, you would:
      // 1. Find and delete quiz questions that reference non-existent quizzes
      // 2. Find and delete quiz attempts that reference non-existent quizzes
      // 3. Clean up any other related data

      console.log('Cleanup orphaned data - placeholder implementation');

      return {
        deletedQuestions: 0,
        deletedAttempts: 0
      };
    } catch (error) {
      throw new Error(`Failed to cleanup orphaned data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get archived quizzes for admin management
   */
  async getArchivedQuizzes(
    limit: number = 20,
    offset: number = 0,
    tx?: Transaction
  ): Promise<Array<{
    id: string;
    title: string;
    archivedAt: Date;
    archivedBy: string;
    endDate?: Date;
  }>> {
    const dbInstance = tx || this.database;

    try {
      const archivedQuizzes = await dbInstance
        .select({
          id: quizzes.id,
          title: quizzes.title,
          archivedAt: quizzes.archivedAt,
          archivedBy: quizzes.archivedBy,
          endDate: quizzes.endDate
        })
        .from(quizzes)
        .where(eq(quizzes.isArchived, true))
        .orderBy(sql`${quizzes.archivedAt} DESC`)
        .limit(limit)
        .offset(offset);

      return archivedQuizzes.map((q: any) => ({
        id: q.id,
        title: q.title,
        archivedAt: q.archivedAt!,
        archivedBy: q.archivedBy!,
        endDate: q.endDate
      }));
    } catch (error) {
      throw new Error(`Failed to get archived quizzes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const quizRepository = new QuizRepository();
