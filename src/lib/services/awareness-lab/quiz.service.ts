import { BaseService, ServiceResult, serviceSuccess, serviceError } from '../base.service';
import type { ValidationError } from '@/lib/validation/enhanced-validation-pipeline';
import { quizRepository } from '@/lib/database/repositories/quiz-repository';
import { quizAttemptRepository } from '@/lib/database/repositories/quiz-attempt-repository';
import { templateRepository } from '@/lib/database/repositories/template-repository';
import { transactionService } from '@/lib/database/transaction-service';
import {
  QuizError,
  QuestionError,
  AwarenessLabErrorCode
} from '@/lib/errors/awareness-lab-errors';
import {
  quizCreationSchema,
  quizUpdateSchema,
  quizAttemptSchema,
  type QuizCreationData,
  type QuizUpdateData,
  type QuizAttemptData
} from '@/lib/validation/awareness-lab-schemas';

export interface QuizAttemptResult {
  attemptId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeTakenSeconds: number;
  isCompleted: boolean;
  results: Array<{
    questionId: string;
    userAnswers: string[];
    correctAnswers: string[];
    isCorrect: boolean;
    explanation?: string;
  }>;
}

export interface QuizProgress {
  quizId: string;
  attemptCount: number;
  maxAttempts: number;
  canAttempt: boolean;
  bestScore: number;
  hasCompletedAttempts: boolean;
  lastAttemptDate?: Date;
}

/**
 * Service for managing quizzes, quiz attempts, and scoring logic
 */
export class QuizService extends BaseService {

  // ===== QUIZ MANAGEMENT =====

  /**
   * Create a new quiz with questions
   */
  async createQuiz(
    createdBy: string,
    quizData: QuizCreationData
  ): Promise<ServiceResult<any>> {
    try {
      // Enhanced validation using the validation pipeline
      const { QuizValidationPipeline } = await import('@/lib/validation/enhanced-validation-pipeline');
      const validationResult = await QuizValidationPipeline.validateQuizCreation(quizData, {
        userId: createdBy
      });

      if (!validationResult.success) {
        const errorMessages = validationResult.errors.map(e => e.message).join('; ');
        return serviceError(
          `Quiz validation failed: ${errorMessages}`,
          AwarenessLabErrorCode.INVALID_QUIZ_ANSWERS,
          validationResult.errors
        );
      }

      // Use validated data
      const validatedData = validationResult.data!;

      // Validate template if provided
      if (validatedData.templateId) {
        const templateExists = await templateRepository.exists(validatedData.templateId);
        if (!templateExists) {
          return serviceError('Template not found', AwarenessLabErrorCode.TEMPLATE_NOT_FOUND);
        }
      }

      // Create quiz and questions in a transaction
      const transactionResult = await transactionService.executeInTransaction(async (tx) => {
        // Create the quiz
        const quiz = await quizRepository.create(createdBy, {
          title: validatedData.title,
          description: validatedData.description,
          language: validatedData.language,
          targetAudience: validatedData.targetAudience,
          timeLimitMinutes: validatedData.timeLimitMinutes,
          maxAttempts: validatedData.maxAttempts,
          templateId: validatedData.templateId,
          endDate: validatedData.endDate,
          isPublished: false // Always start as unpublished
        }, tx);

        // Add questions to the quiz
        const questions = [];
        for (let i = 0; i < validatedData.questions.length; i++) {
          const questionData = validatedData.questions[i];
          const question = await quizRepository.addQuestion(quiz.id, {
            questionType: questionData.questionType,
            questionData: questionData.questionData,
            correctAnswers: questionData.correctAnswers,
            orderIndex: questionData.orderIndex || i + 1
          }, tx);
          questions.push(question);
        }

        return { ...quiz, questions };
      }, 'QuizService.createQuiz');

      if (!transactionResult.success) {
        return serviceError(transactionResult.error || 'Failed to create quiz', 'TRANSACTION_FAILED');
      }

      const result = transactionResult.data!;

      // Log validation warnings if any
      if (validationResult.warnings.length > 0) {
        const warningMessages = validationResult.warnings.map(w => w.message).join('; ');
        console.warn(`Quiz creation warnings for ${result.id}: ${warningMessages}`);
      }

      this.audit({
        event: 'awareness.quiz.created',
        userId: createdBy,
        resource: result.id,
        metadata: {
          title: validatedData.title,
          questionCount: validatedData.questions.length,
          templateId: validatedData.templateId,
          hasValidationWarnings: validationResult.warnings.length > 0
        }
      });

      return serviceSuccess(result);
    } catch (error) {
      this.handleError(error, 'QuizService.createQuiz');
    }
  }

  /**
   * Update an existing quiz
   */
  async updateQuiz(
    quizId: string,
    updateData: QuizUpdateData,
    userId: string
  ): Promise<ServiceResult<any>> {
    try {
      // Validate input data
      const validatedData = quizUpdateSchema.parse(updateData);

      // Check if quiz exists and get current state
      const existingQuiz = await quizRepository.findById(quizId);
      if (!existingQuiz) {
        return serviceError('Quiz not found', AwarenessLabErrorCode.QUIZ_NOT_FOUND);
      }

      // Check if quiz is already published and trying to modify structure
      if (existingQuiz.isPublished && (validatedData.questions || validatedData.timeLimitMinutes || validatedData.maxAttempts)) {
        return serviceError('Cannot modify published quiz structure', AwarenessLabErrorCode.QUIZ_ALREADY_PUBLISHED);
      }

      const transactionResult = await transactionService.executeInTransaction(async (tx) => {
        // Update quiz basic info
        const updatedQuiz = await quizRepository.update(quizId, {
          title: validatedData.title,
          description: validatedData.description,
          language: validatedData.language,
          targetAudience: validatedData.targetAudience,
          timeLimitMinutes: validatedData.timeLimitMinutes,
          maxAttempts: validatedData.maxAttempts,
          isPublished: validatedData.isPublished,
          endDate: validatedData.endDate
        }, tx);

        // Update questions if provided and quiz is not published
        if (validatedData.questions && !existingQuiz.isPublished) {
          // Delete existing questions
          await quizRepository.deleteAllQuestions(quizId, tx);

          // Add new questions
          const questions = [];
          for (let i = 0; i < validatedData.questions.length; i++) {
            const questionData = validatedData.questions[i];
            const question = await quizRepository.addQuestion(quizId, {
              questionType: questionData.questionType,
              questionData: questionData.questionData,
              correctAnswers: questionData.correctAnswers,
              orderIndex: questionData.orderIndex || i + 1
            }, tx);
            questions.push(question);
          }

          return { ...updatedQuiz, questions };
        }

        return updatedQuiz;
      }, 'QuizService.updateQuiz');

      if (!transactionResult.success) {
        return serviceError(transactionResult.error || 'Failed to update quiz', 'TRANSACTION_FAILED');
      }

      const result = transactionResult.data!;

      this.audit({
        event: 'awareness.quiz.updated',
        userId,
        resource: quizId,
        metadata: {
          isPublished: validatedData.isPublished,
          hasQuestionUpdates: !!validatedData.questions
        }
      });

      return serviceSuccess(result);
    } catch (error) {
      this.handleError(error, 'QuizService.updateQuiz');
    }
  }

  /**
   * Publish or unpublish a quiz
   */
  async setQuizPublished(
    quizId: string,
    isPublished: boolean,
    userId: string
  ): Promise<ServiceResult<any>> {
    try {
      const quiz = await quizRepository.findByIdWithQuestions(quizId);
      if (!quiz) {
        return serviceError('Quiz not found', AwarenessLabErrorCode.QUIZ_NOT_FOUND);
      }

      // Enhanced validation for publishing
      let publishingValidation: any = null;
      if (isPublished) {
        const { QuizValidationPipeline } = await import('@/lib/validation/enhanced-validation-pipeline');
        publishingValidation = await QuizValidationPipeline.validateQuizPublishing(quiz, {
          userId,
          isPublished: false // Current state before publishing
        });

        if (!publishingValidation.success) {
          const errorMessages = publishingValidation.errors.map((e: any) => e.message).join('; ');
          return serviceError(
            `Cannot publish quiz: ${errorMessages}`,
            AwarenessLabErrorCode.INVALID_QUIZ_ANSWERS,
            publishingValidation.errors
          );
        }

        // Log warnings if any
        if (publishingValidation.warnings && publishingValidation.warnings.length > 0) {
          const warningMessages = publishingValidation.warnings.map((w: any) => w.message).join('; ');
          console.warn(`Quiz publishing warnings for ${quizId}: ${warningMessages}`);
        }
      }

      const result = await quizRepository.setPublished(quizId, isPublished);

      this.audit({
        event: isPublished ? 'awareness.quiz.published' : 'awareness.quiz.unpublished',
        userId,
        resource: quizId,
        metadata: {
          questionCount: quiz.questions?.length || 0,
          hasValidationWarnings: isPublished && publishingValidation && publishingValidation.warnings && publishingValidation.warnings.length > 0
        }
      });

      return serviceSuccess(result);
    } catch (error) {
      this.handleError(error, 'QuizService.setQuizPublished');
    }
  }

  /**
   * Get quiz by ID with questions (for customers)
   */
  async getQuizForCustomer(quizId: string, userId: string): Promise<ServiceResult<any>> {
    try {
      const quiz = await quizRepository.findByIdWithQuestions(quizId);
      if (!quiz) {
        return serviceError('Quiz not found', AwarenessLabErrorCode.QUIZ_NOT_FOUND);
      }

      if (!quiz.isPublished) {
        return serviceError('Quiz is not published', AwarenessLabErrorCode.QUIZ_NOT_PUBLISHED);
      }

      // Check if quiz has expired
      if (quiz.endDate && new Date() > quiz.endDate) {
        return serviceError('Quiz has expired', AwarenessLabErrorCode.QUIZ_NOT_PUBLISHED);
      }

      // Get user's progress for this quiz
      const progress = await quizAttemptRepository.getUserQuizProgress(
        userId,
        quizId,
        quiz.maxAttempts
      );

      // Remove correct answers from questions for security
      const sanitizedQuestions = quiz.questions.map(q => ({
        ...q,
        correctAnswers: undefined // Don't expose correct answers to customers
      }));

      return serviceSuccess({
        ...quiz,
        questions: sanitizedQuestions,
        userProgress: progress
      });
    } catch (error) {
      this.handleError(error, 'QuizService.getQuizForCustomer');
    }
  }

  /**
   * Get published quizzes for users based on their role
   */
  async getPublishedQuizzes(
    language?: 'en' | 'ar',
    limit: number = 20,
    offset: number = 0,
    userRole?: 'customer' | 'expert' | 'admin'
  ): Promise<ServiceResult<any[]>> {
    try {
      const quizzes = await quizRepository.findPublished(language, limit, offset, userRole);
      return serviceSuccess(quizzes);
    } catch (error) {
      this.handleError(error, 'QuizService.getPublishedQuizzes');
    }
  }

  // ===== QUIZ ATTEMPTS =====

  /**
   * Start a new quiz attempt
   */
  async startQuizAttempt(
    userId: string,
    quizId: string
  ): Promise<ServiceResult<any>> {
    try {
      const quiz = await quizRepository.findById(quizId);
      if (!quiz) {
        return serviceError('Quiz not found', AwarenessLabErrorCode.QUIZ_NOT_FOUND);
      }

      if (!quiz.isPublished) {
        return serviceError('Quiz is not published', AwarenessLabErrorCode.QUIZ_NOT_PUBLISHED);
      }

      // Check if quiz has expired
      if (quiz.endDate && new Date() > quiz.endDate) {
        return serviceError('Quiz has expired', AwarenessLabErrorCode.QUIZ_NOT_PUBLISHED);
      }

      // Enhanced attempt eligibility check with security validation
      const { attemptManagementService } = await import('./attempt-management.service');
      const eligibilityCheck = await attemptManagementService.checkAttemptEligibility(
        userId,
        quizId,
        {
          checkCooldown: false, // No cooldown for regular attempts
          enableSecurityCheck: true
        }
      );

      if (!eligibilityCheck.success) {
        return serviceError(eligibilityCheck.error!, AwarenessLabErrorCode.ATTEMPT_LIMIT_EXCEEDED);
      }

      const eligibility = eligibilityCheck.data!;
      if (!eligibility.canAttempt) {
        return serviceError(
          eligibility.reason || `Maximum attempts (${eligibility.maxAttempts}) exceeded`,
          AwarenessLabErrorCode.ATTEMPT_LIMIT_EXCEEDED
        );
      }

      // Check for existing incomplete attempt and reuse it
      let attempt = await quizAttemptRepository.findIncompleteAttempt(userId, quizId);
      let isNewAttempt = false;

      if (!attempt) {
        // Create new attempt only if no incomplete attempt exists
        attempt = await quizAttemptRepository.create({
          userId,
          quizId,
          answers: {},
          score: 0,
          timeTakenSeconds: 0,
          isCompleted: false
        });
        isNewAttempt = true;
      }

      this.audit({
        event: 'awareness.quiz.attempt.started',
        userId,
        resource: quizId,
        metadata: {
          attemptId: attempt.id,
          attemptNumber: eligibility.totalAttempts + (isNewAttempt ? 1 : 0),
          isResumed: !isNewAttempt
        }
      });

      return serviceSuccess({
        attemptId: attempt.id,
        quizId,
        timeLimitMinutes: quiz.timeLimitMinutes,
        startedAt: attempt.startedAt,
        endDate: quiz.endDate,
        isResumed: !isNewAttempt
      });
    } catch (error) {
      this.handleError(error, 'QuizService.startQuizAttempt');
    }
  }

  /**
   * Abandon/cancel an incomplete quiz attempt
   * This deletes the attempt so user can start fresh
   */
  async abandonQuizAttempt(
    attemptId: string,
    userId: string
  ): Promise<ServiceResult<{ abandoned: boolean }>> {
    try {
      const attempt = await quizAttemptRepository.findById(attemptId);
      if (!attempt) {
        return serviceError('Quiz attempt not found', AwarenessLabErrorCode.QUIZ_NOT_STARTED);
      }

      if (attempt.userId !== userId) {
        return serviceError('Unauthorized access to quiz attempt', 'UNAUTHORIZED');
      }

      if (attempt.isCompleted) {
        return serviceError('Cannot abandon a completed quiz attempt', AwarenessLabErrorCode.QUIZ_ALREADY_COMPLETED);
      }

      // Delete the incomplete attempt
      await quizAttemptRepository.delete(attemptId);

      this.audit({
        event: 'awareness.quiz.attempt.abandoned',
        userId,
        resource: attempt.quizId,
        metadata: {
          attemptId,
          quizId: attempt.quizId
        }
      });

      return serviceSuccess({ abandoned: true });
    } catch (error) {
      this.handleError(error, 'QuizService.abandonQuizAttempt');
    }
  }

  /**
   * Submit quiz attempt with answers and calculate score
   */
  async submitQuizAttempt(
    attemptId: string,
    answers: Record<string, string[]>,
    timeTakenSeconds: number,
    userId: string
  ): Promise<ServiceResult<QuizAttemptResult>> {
    try {
      const attempt = await quizAttemptRepository.findById(attemptId);
      if (!attempt) {
        return serviceError('Quiz attempt not found', AwarenessLabErrorCode.QUIZ_NOT_STARTED);
      }

      if (attempt.userId !== userId) {
        return serviceError('Unauthorized access to quiz attempt', 'UNAUTHORIZED');
      }

      if (attempt.isCompleted) {
        return serviceError('Quiz attempt already completed', AwarenessLabErrorCode.QUIZ_ALREADY_COMPLETED);
      }

      // Get quiz with questions first
      const quiz = await quizRepository.findByIdWithQuestions(attempt.quizId);
      if (!quiz) {
        return serviceError('Quiz not found', AwarenessLabErrorCode.QUIZ_NOT_FOUND);
      }

      // Validate input with actual quizId
      const validatedData = quizAttemptSchema.parse({
        quizId: attempt.quizId,
        answers,
        timeTakenSeconds
      });

      // Enhanced answer validation with security checks
      const { answerValidationService } = await import('./answer-validation.service');
      const answerValidation = await answerValidationService.validateQuizAnswers(
        quiz.questions,
        validatedData.answers,
        {
          enableSanitization: true,
          enableSecurityChecks: true,
          strictValidation: false
        }
      );

      if (!answerValidation.success) {
        return serviceError(
          `Answer validation failed: ${answerValidation.error}`,
          AwarenessLabErrorCode.INVALID_QUIZ_ANSWERS
        );
      }

      const validation = answerValidation.data!;

      // Log validation warnings if any
      if (validation.warnings.length > 0) {
        console.warn(`Answer validation warnings for attempt ${attemptId}:`, validation.warnings);
      }

      // Use sanitized answers for scoring
      const sanitizedAnswers = validation.sanitizedAnswers;



      // Validate time limit
      const timeElapsed = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);
      const timeLimit = quiz.timeLimitMinutes * 60;

      if (timeElapsed > timeLimit + 30) { // Allow 30 seconds grace period
        return serviceError('Quiz time limit exceeded', AwarenessLabErrorCode.QUIZ_TIME_EXPIRED);
      }

      // Calculate score and generate results using enhanced scoring with sanitized answers
      const { score, results } = await this.calculateQuizScore(quiz.questions, sanitizedAnswers);

      // Submit the attempt with sanitized answers
      const submittedAttempt = await quizAttemptRepository.submit(
        attemptId,
        sanitizedAnswers,
        score,
        Math.min(timeTakenSeconds, timeElapsed), // Use the smaller of reported vs actual time
      );

      this.audit({
        event: 'awareness.quiz.attempt.submitted',
        userId,
        resource: quiz.id,
        metadata: {
          attemptId,
          score,
          timeTakenSeconds: timeTakenSeconds,
          totalQuestions: quiz.questions.length
        }
      });

      const result: QuizAttemptResult = {
        attemptId,
        score,
        totalQuestions: quiz.questions.length,
        correctAnswers: results.filter(r => r.isCorrect).length,
        timeTakenSeconds: Math.min(timeTakenSeconds, timeElapsed),
        isCompleted: true,
        results
      };

      return serviceSuccess(result);
    } catch (error) {
      this.handleError(error, 'QuizService.submitQuizAttempt');
    }
  }

  /**
   * Get user's quiz progress
   */
  async getUserQuizProgress(
    userId: string,
    quizId: string
  ): Promise<ServiceResult<QuizProgress>> {
    try {
      const quiz = await quizRepository.findById(quizId);
      if (!quiz) {
        return serviceError('Quiz not found', AwarenessLabErrorCode.QUIZ_NOT_FOUND);
      }

      const progress = await quizAttemptRepository.getUserQuizProgress(
        userId,
        quizId,
        quiz.maxAttempts
      );

      const result: QuizProgress = {
        quizId,
        attemptCount: progress.attemptCount,
        maxAttempts: quiz.maxAttempts,
        canAttempt: progress.canAttempt,
        bestScore: progress.bestScore,
        hasCompletedAttempts: progress.hasCompletedAttempts,
        lastAttemptDate: progress.lastAttemptDate
      };

      return serviceSuccess(result);
    } catch (error) {
      this.handleError(error, 'QuizService.getUserQuizProgress');
    }
  }

  /**
   * Get user's attempt history for a quiz
   */
  async getUserAttemptHistory(
    userId: string,
    quizId: string
  ): Promise<ServiceResult<any[]>> {
    try {
      const attempts = await quizAttemptRepository.findUserAttempts(userId, quizId);

      // Remove sensitive data and sort by most recent
      const sanitizedAttempts = attempts
        .map(attempt => ({
          id: attempt.id,
          score: attempt.score,
          timeTakenSeconds: attempt.timeTakenSeconds,
          isCompleted: attempt.isCompleted,
          startedAt: attempt.startedAt,
          completedAt: attempt.completedAt
        }))
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

      return serviceSuccess(sanitizedAttempts);
    } catch (error) {
      this.handleError(error, 'QuizService.getUserAttemptHistory');
    }
  }

  // ===== ADMIN OPERATIONS =====

  /**
   * Get all quizzes for admin (with filters)
   */
  async getQuizzesForAdmin(
    filters: {
      language?: 'en' | 'ar';
      isPublished?: boolean;
      createdBy?: string;
      search?: string;
    } = {},
    limit: number = 20,
    offset: number = 0
  ): Promise<ServiceResult<any[]>> {
    try {
      const quizzes = await quizRepository.findMany(filters, limit, offset);
      return serviceSuccess(quizzes);
    } catch (error) {
      this.handleError(error, 'QuizService.getQuizzesForAdmin');
    }
  }

  /**
   * Get count of quizzes for admin (with filters)
   */
  async getQuizzesCount(
    filters: {
      language?: 'en' | 'ar';
      isPublished?: boolean;
      createdBy?: string;
      search?: string;
    } = {}
  ): Promise<ServiceResult<number>> {
    try {
      const count = await quizRepository.count(filters);
      return serviceSuccess(count);
    } catch (error) {
      this.handleError(error, 'QuizService.getQuizzesCount');
    }
  }

  /**
   * Get quiz by ID for admin (with full details including correct answers)
   */
  async getQuizForAdmin(quizId: string): Promise<ServiceResult<any>> {
    try {
      const quiz = await quizRepository.findByIdWithQuestions(quizId);
      if (!quiz) {
        return serviceError('Quiz not found', AwarenessLabErrorCode.QUIZ_NOT_FOUND);
      }

      // For admin, include all details including correct answers
      return serviceSuccess(quiz);
    } catch (error) {
      this.handleError(error, 'QuizService.getQuizForAdmin');
    }
  }

  /**
   * Delete a quiz (admin only)
   */
  async deleteQuiz(quizId: string, userId: string): Promise<ServiceResult<boolean>> {
    try {
      const quiz = await quizRepository.findById(quizId);
      if (!quiz) {
        return serviceError('Quiz not found', AwarenessLabErrorCode.QUIZ_NOT_FOUND);
      }

      // Check if quiz has attempts
      const attemptCount = await quizAttemptRepository.count({ quizId });
      if (attemptCount > 0) {
        return serviceError('Cannot delete quiz with existing attempts', 'QUIZ_HAS_ATTEMPTS');
      }

      const deleted = await quizRepository.delete(quizId);

      this.audit({
        event: 'awareness.quiz.deleted',
        userId,
        resource: quizId,
        metadata: { title: quiz.title }
      });

      return serviceSuccess(deleted);
    } catch (error) {
      this.handleError(error, 'QuizService.deleteQuiz');
    }
  }

  /**
   * Archive a quiz instead of deleting when it has attempts
   */
  async archiveQuiz(quizId: string, userId: string, reason?: string): Promise<ServiceResult<boolean>> {
    try {
      const quiz = await quizRepository.findById(quizId);
      if (!quiz) {
        return serviceError('Quiz not found', AwarenessLabErrorCode.QUIZ_NOT_FOUND);
      }

      if (quiz.isArchived) {
        return serviceError('Quiz is already archived', 'QUIZ_ALREADY_ARCHIVED');
      }

      const archived = reason
        ? await quizRepository.archiveWithReason(quizId, userId, reason)
        : await quizRepository.archive(quizId, userId);

      this.audit({
        event: 'awareness.quiz.archived',
        userId,
        resource: quizId,
        metadata: {
          title: quiz.title,
          reason: reason || 'Manual archive',
          hasAttempts: await this.checkQuizHasAttempts(quizId)
        }
      });

      return serviceSuccess(archived);
    } catch (error) {
      this.handleError(error, 'QuizService.archiveQuiz');
    }
  }

  /**
   * Get archived quizzes for admin management
   */
  async getArchivedQuizzes(
    limit: number = 20,
    offset: number = 0
  ): Promise<ServiceResult<any[]>> {
    try {
      const archivedQuizzes = await quizRepository.getArchivedQuizzes(limit, offset);
      return serviceSuccess(archivedQuizzes);
    } catch (error) {
      this.handleError(error, 'QuizService.getArchivedQuizzes');
    }
  }

  /**
   * Unarchive a quiz (admin only)
   */
  async unarchiveQuiz(quizId: string, userId: string): Promise<ServiceResult<boolean>> {
    try {
      const quiz = await quizRepository.findById(quizId);
      if (!quiz) {
        return serviceError('Quiz not found', AwarenessLabErrorCode.QUIZ_NOT_FOUND);
      }

      if (!quiz.isArchived) {
        return serviceError('Quiz is not archived', 'QUIZ_NOT_ARCHIVED');
      }

      const unarchived = await quizRepository.unarchive(quizId);

      this.audit({
        event: 'awareness.quiz.unarchived',
        userId,
        resource: quizId,
        metadata: { title: quiz.title }
      });

      return serviceSuccess(unarchived);
    } catch (error) {
      this.handleError(error, 'QuizService.unarchiveQuiz');
    }
  }

  /**
   * Clean up orphaned quiz data
   */
  async cleanupOrphanedData(): Promise<ServiceResult<{ deletedQuestions: number; deletedAttempts: number }>> {
    try {
      const result = await quizRepository.cleanupOrphanedData();

      this.audit({
        event: 'awareness.quiz.cleanup',
        userId: 'system',
        resource: 'cleanup',
        metadata: result
      });

      return serviceSuccess(result);
    } catch (error) {
      this.handleError(error, 'QuizService.cleanupOrphanedData');
    }
  }

  /**
   * Check if quiz can be deleted or should be archived
   */
  async canQuizBeDeleted(quizId: string): Promise<ServiceResult<{ canDelete: boolean; reason?: string }>> {
    try {
      const canDelete = await quizRepository.canBeDeleted(quizId);

      if (!canDelete) {
        // Check if quiz has attempts
        const attemptCount = await quizAttemptRepository.count({ quizId });
        if (attemptCount > 0) {
          return serviceSuccess({
            canDelete: false,
            reason: 'Quiz has existing attempts and must be archived instead'
          });
        }

        // Check if quiz is published
        const quiz = await quizRepository.findById(quizId);
        if (quiz?.isPublished) {
          return serviceSuccess({
            canDelete: false,
            reason: 'Published quizzes must be archived instead of deleted'
          });
        }

        return serviceSuccess({
          canDelete: false,
          reason: 'Quiz is too old to be safely deleted'
        });
      }

      return serviceSuccess({ canDelete: true });
    } catch (error) {
      this.handleError(error, 'QuizService.canQuizBeDeleted');
    }
  }

  /**
   * Auto-archive quizzes that are 2 days past their end date
   */
  async autoArchiveExpiredQuizzes(): Promise<ServiceResult<{ archivedCount: number; archivedQuizzes: string[] }>> {
    try {
      const quizzesToArchive = await quizRepository.getQuizzesForAutoArchive();
      const archivedQuizzes: string[] = [];

      for (const quiz of quizzesToArchive) {
        try {
          await quizRepository.archive(quiz.id, 'system'); // System-initiated archive
          archivedQuizzes.push(quiz.id);

          this.audit({
            event: 'awareness.quiz.auto_archived',
            userId: 'system',
            resource: quiz.id,
            metadata: {
              title: quiz.title,
              endDate: quiz.endDate.toISOString(),
              reason: 'Auto-archived 2 days after end date'
            }
          });
        } catch (error) {
          console.error(`Failed to auto-archive quiz ${quiz.id}:`, error);
        }
      }

      return serviceSuccess({
        archivedCount: archivedQuizzes.length,
        archivedQuizzes
      });
    } catch (error) {
      this.handleError(error, 'QuizService.autoArchiveExpiredQuizzes');
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Calculate quiz score using enhanced scoring service
   */
  private async calculateQuizScore(
    questions: any[],
    userAnswers: Record<string, string[]>
  ): Promise<{
    score: number;
    results: Array<{
      questionId: string;
      userAnswers: string[];
      correctAnswers: string[];
      isCorrect: boolean;
      partialCredit?: number;
      points?: number;
      maxPoints?: number;
      explanation?: string;
      feedback?: string;
    }>
  }> {
    try {
      // Import the scoring service
      const { quizScoringService } = await import('./quiz-scoring.service');

      // Use enhanced scoring with partial credit enabled
      const scoringResult = await quizScoringService.calculateScore(questions, userAnswers, {
        enablePartialCredit: true,
        partialCreditThreshold: 0.5,
        roundingMethod: 'round',
        passingScore: 70
      });

      if (!scoringResult.success) {
        // Fallback to simple scoring if enhanced scoring fails
        console.warn('Enhanced scoring failed, falling back to simple scoring:', scoringResult.error);
        return this.fallbackSimpleScoring(questions, userAnswers);
      }

      const result = scoringResult.data!;

      return {
        score: result.totalScore,
        results: result.results.map(r => ({
          questionId: r.questionId,
          userAnswers: r.userAnswers,
          correctAnswers: r.correctAnswers,
          isCorrect: r.isCorrect,
          partialCredit: r.partialCredit,
          points: r.points,
          maxPoints: r.maxPoints,
          explanation: r.explanation,
          feedback: r.feedback
        }))
      };
    } catch (error) {
      console.warn('Error in enhanced scoring, falling back to simple scoring:', error);
      return this.fallbackSimpleScoring(questions, userAnswers);
    }
  }

  /**
   * Fallback simple scoring method for backwards compatibility
   */
  private fallbackSimpleScoring(
    questions: any[],
    userAnswers: Record<string, string[]>
  ): {
    score: number;
    results: Array<{
      questionId: string;
      userAnswers: string[];
      correctAnswers: string[];
      isCorrect: boolean;
      explanation?: string;
    }>
  } {
    const results = [];
    let correctCount = 0;

    for (const question of questions) {
      const userAnswer = userAnswers[question.id] || [];
      const correctAnswers = question.correctAnswers;

      const isCorrect = this.compareAnswers(userAnswer, correctAnswers);
      if (isCorrect) {
        correctCount++;
      }

      results.push({
        questionId: question.id,
        userAnswers: userAnswer,
        correctAnswers,
        isCorrect,
        explanation: question.questionData.explanation
      });
    }

    const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

    return { score, results };
  }

  /**
   * Compare user answers with correct answers (legacy method)
   */
  private compareAnswers(userAnswers: string[], correctAnswers: string[]): boolean {
    if (userAnswers.length !== correctAnswers.length) {
      return false;
    }

    const sortedUser = [...userAnswers].sort();
    const sortedCorrect = [...correctAnswers].sort();

    return sortedUser.every((answer, index) => answer === sortedCorrect[index]);
  }

  /**
   * Validate attempt time limits
   */
  async validateAttemptTimeLimit(
    attemptId: string,
    timeLimitMinutes: number
  ): Promise<ServiceResult<boolean>> {
    try {
      const attempt = await quizAttemptRepository.findById(attemptId);
      if (!attempt) {
        return serviceError('Attempt not found', AwarenessLabErrorCode.QUIZ_NOT_STARTED);
      }

      const timeElapsed = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);
      const timeLimit = timeLimitMinutes * 60;

      if (timeElapsed > timeLimit) {
        // Auto-submit expired attempt
        await quizAttemptRepository.update(attemptId, {
          isCompleted: true,
          completedAt: new Date()
        });

        return serviceError('Time limit exceeded', AwarenessLabErrorCode.QUIZ_TIME_EXPIRED);
      }

      return serviceSuccess(true);
    } catch (error) {
      this.handleError(error, 'QuizService.validateAttemptTimeLimit');
    }
  }
  /**
   * Get quiz attempt by ID (for security validation)
   */
  async getAttemptById(attemptId: string): Promise<ServiceResult<any>> {
    try {
      const attempt = await quizAttemptRepository.findById(attemptId);

      if (!attempt) {
        return serviceError('Quiz attempt not found', AwarenessLabErrorCode.QUIZ_NOT_STARTED);
      }

      return serviceSuccess(attempt);
    } catch (error) {
      this.handleError(error, 'QuizService.getAttemptById');
    }
  }

  /**
   * Reorder questions in a quiz
   */
  async reorderQuizQuestions(
    quizId: string,
    questionIds: string[],
    userId: string
  ): Promise<ServiceResult<boolean>> {
    try {
      const quiz = await quizRepository.findById(quizId);
      if (!quiz) {
        return serviceError('Quiz not found', AwarenessLabErrorCode.QUIZ_NOT_FOUND);
      }

      // Check if quiz is published - published quizzes shouldn't have structure changes
      if (quiz.isPublished) {
        return serviceError('Cannot reorder questions in published quiz', AwarenessLabErrorCode.QUIZ_ALREADY_PUBLISHED);
      }

      // Validate question IDs format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const invalidIds = questionIds.filter(id => !uuidRegex.test(id));
      if (invalidIds.length > 0) {
        return serviceError(`Invalid question IDs: ${invalidIds.join(', ')}`, 'INVALID_QUESTION_IDS');
      }

      // Reorder questions in transaction
      const transactionResult = await transactionService.executeInTransaction(async (tx) => {
        await quizRepository.reorderQuestions(quizId, questionIds, tx);
        return true;
      }, 'QuizService.reorderQuizQuestions');

      if (!transactionResult.success) {
        return serviceError(transactionResult.error || 'Failed to reorder questions', 'TRANSACTION_FAILED');
      }

      this.audit({
        event: 'awareness.quiz.questions.reordered',
        userId,
        resource: quizId,
        metadata: {
          questionCount: questionIds.length,
          newOrder: questionIds
        }
      });

      return serviceSuccess(true);
    } catch (error) {
      this.handleError(error, 'QuizService.reorderQuizQuestions');
    }
  }

  /**
   * Duplicate a question within a quiz
   */
  async duplicateQuestion(
    questionId: string,
    userId: string
  ): Promise<ServiceResult<any>> {
    try {
      // Validate question ID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(questionId)) {
        return serviceError('Invalid question ID format', 'INVALID_QUESTION_ID');
      }

      // The published quiz check will be handled in the repository method

      // Duplicate question in transaction
      const transactionResult = await transactionService.executeInTransaction(async (tx) => {
        return await quizRepository.duplicateQuestion(questionId, tx);
      }, 'QuizService.duplicateQuestion');

      if (!transactionResult.success) {
        return serviceError(transactionResult.error || 'Failed to duplicate question', 'TRANSACTION_FAILED');
      }

      const duplicatedQuestion = transactionResult.data!;

      this.audit({
        event: 'awareness.quiz.question.duplicated',
        userId,
        resource: questionId,
        metadata: {
          originalQuestionId: questionId,
          duplicatedQuestionId: duplicatedQuestion.id,
          quizId: duplicatedQuestion.quizId
        }
      });

      return serviceSuccess(duplicatedQuestion);
    } catch (error) {
      this.handleError(error, 'QuizService.duplicateQuestion');
    }
  }

  /**
   * Bulk update questions
   */
  async bulkUpdateQuestions(
    updates: Array<{ id: string; data: any }>,
    userId: string
  ): Promise<ServiceResult<any[]>> {
    try {
      // Validate all question IDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const invalidIds = updates.filter(update => !uuidRegex.test(update.id));
      if (invalidIds.length > 0) {
        return serviceError(`Invalid question IDs: ${invalidIds.map(u => u.id).join(', ')}`, 'INVALID_QUESTION_IDS');
      }

      // Validate each update data
      const { QuizValidationPipeline } = await import('@/lib/validation/enhanced-validation-pipeline');

      for (const update of updates) {
        if (update.data.questionType || update.data.questionData || update.data.correctAnswers) {
          // Create a mock question for validation
          const mockQuestion = {
            questionType: update.data.questionType,
            questionData: update.data.questionData,
            correctAnswers: update.data.correctAnswers
          };

          const validationResult = await QuizValidationPipeline.validateQuizCreation(
            { questions: [mockQuestion] },
            { userId }
          );

          if (!validationResult.success) {
            const errorMessages = validationResult.errors.map(e => e.message).join('; ');
            return serviceError(
              `Validation failed for question ${update.id}: ${errorMessages}`,
              'VALIDATION_FAILED',
              validationResult.errors
            );
          }
        }
      }

      // Perform bulk update in transaction
      const transactionResult = await transactionService.executeInTransaction(async (tx) => {
        return await quizRepository.bulkUpdateQuestions(updates, tx);
      }, 'QuizService.bulkUpdateQuestions');

      if (!transactionResult.success) {
        return serviceError(transactionResult.error || 'Failed to bulk update questions', 'TRANSACTION_FAILED');
      }

      const updatedQuestions = transactionResult.data!;

      this.audit({
        event: 'awareness.quiz.questions.bulk_updated',
        userId,
        resource: 'bulk_update',
        metadata: {
          updatedCount: updatedQuestions.length,
          questionIds: updates.map(u => u.id)
        }
      });

      return serviceSuccess(updatedQuestions);
    } catch (error) {
      this.handleError(error, 'QuizService.bulkUpdateQuestions');
    }
  }

  /**
   * Validate question answer consistency
   */
  async validateQuestionAnswers(questionId: string): Promise<ServiceResult<{
    isValid: boolean;
    errors: string[];
  }>> {
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(questionId)) {
        return serviceError('Invalid question ID format', 'INVALID_QUESTION_ID');
      }

      const validationResult = await quizRepository.validateQuestionAnswers(questionId);
      return serviceSuccess(validationResult);
    } catch (error) {
      this.handleError(error, 'QuizService.validateQuestionAnswers');
    }
  }

  /**
   * Check if quiz has attempts (helper method)
   */
  private async checkQuizHasAttempts(quizId: string): Promise<boolean> {
    try {
      const attemptCount = await quizAttemptRepository.count({ quizId });
      return attemptCount > 0;
    } catch (error) {
      console.error('Error checking quiz attempts:', error);
      return false;
    }
  }
}

// Export singleton instance
export const quizService = new QuizService();
