import { NextRequest, NextResponse } from 'next/server';
import { BaseController } from '../auth/auth.controller';
import { quizService } from '@/lib/services/awareness-lab/quiz.service';
import { logger } from '@/infrastructure/logging/logger';
import {
  quizCreationSchema,
  quizUpdateSchema,
  type QuizCreationData,
  type QuizUpdateData
} from '@/lib/validation/awareness-lab-schemas';
import {
  awarenessLabSecurityMiddleware
} from '@/lib/security/awareness-lab-middleware';
import {
  quizSubmissionValidator,
  externalLinkValidator,
  AwarenessLabRateLimiter
} from '@/lib/security/awareness-lab-security';
import { auditAwarenessLab } from '@/lib/utils/audit-logger';
import { getRateLimitHeaders, createRateLimitErrorResponse } from '@/lib/auth/rate-limiter';

/**
 * Awareness Lab controller handling quiz management endpoints
 */
export class AwarenessLabController extends BaseController {

  // ===== ADMIN QUIZ MANAGEMENT =====

  /**
   * Create a new quiz (admin only)
   */
  async createQuiz(request: NextRequest): Promise<NextResponse> {
    const requestId = `create_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // 1. Rate limiting for admin quiz creation
      const rateLimitResult = AwarenessLabRateLimiter.checkAdminQuizCreationLimit(request);
      if (!rateLimitResult.success) {
        const errorData = createRateLimitErrorResponse(rateLimitResult);
        const response = this.error(errorData.message, errorData.error, 429);

        // Add rate limit headers
        const headers = getRateLimitHeaders(rateLimitResult);
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });

        auditAwarenessLab({
          event: 'awareness.rate.limit.exceeded',
          requestId,
          severity: 'medium',
          success: false,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          metadata: {
            endpoint: 'admin-quiz-creation',
            retryAfter: errorData.retryAfter
          }
        });

        return response;
      }

      // 2. Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        auditAwarenessLab({
          event: 'awareness.security.alert',
          userId: session.userId,
          requestId,
          severity: 'high',
          success: false,
          metadata: {
            reason: 'Non-admin user attempted quiz creation',
            userRole: session.role
          }
        });
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // 3. Parse and validate request body
      const body = await this.parseBody<QuizCreationData>(request);
      if (!body) {
        return this.error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
      }

      // 4. Validate using Zod schema
      const validationResult = quizCreationSchema.safeParse(body);
      if (!validationResult.success) {
        const errors = validationResult.error.issues.map(err =>
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        return this.error(`Validation failed: ${errors}`, 'VALIDATION_ERROR', 400);
      }

      // 5. Additional security validation for quiz content
      const securityValidation = this.validateQuizContent(validationResult.data);
      if (!securityValidation.isValid) {
        auditAwarenessLab({
          event: 'awareness.security.alert',
          userId: session.userId,
          requestId,
          severity: 'high',
          success: false,
          metadata: {
            reason: 'Quiz content security validation failed',
            errors: securityValidation.errors
          }
        });
        return this.error(
          `Security validation failed: ${securityValidation.errors.join(', ')}`,
          'SECURITY_VALIDATION_FAILED',
          400
        );
      }

      // 6. Create quiz using service
      const result = await quizService.createQuiz(session.userId!, validationResult.data);

      if (!result.success) {
        return this.error(result.error || 'Failed to create quiz', result.code, 400);
      }

      // 7. Audit log successful creation
      auditAwarenessLab({
        event: 'awareness.quiz.created',
        userId: session.userId,
        requestId,
        severity: 'low',
        success: true,
        metadata: {
          quizId: result.data?.id,
          title: validationResult.data.title,
          language: validationResult.data.language,
          questionCount: validationResult.data.questions?.length || 0
        }
      });

      return this.success(result.data, 'Quiz created successfully', 201);
    } catch (error: any) {
      logger.error('Failed to create quiz:', error);

      auditAwarenessLab({
        event: 'awareness.security.alert',
        requestId,
        severity: 'critical',
        success: false,
        error: error.message,
        metadata: {
          endpoint: 'admin-quiz-creation'
        }
      });

      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Get all quizzes for admin with filtering and pagination
   */
  async getQuizzesForAdmin(request: NextRequest): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Parse query parameters
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Max 100 per page
      const language = searchParams.get('language') as 'en' | 'ar' | null;
      const isPublished = searchParams.get('published') === 'true' ? true :
        searchParams.get('published') === 'false' ? false : undefined;
      const createdBy = searchParams.get('createdBy') || undefined;
      const search = searchParams.get('search') || undefined;

      // Calculate offset
      const offset = (page - 1) * limit;

      // Build filters
      const filters = {
        language: language || undefined,
        isPublished,
        createdBy,
        search
      };

      // Get quizzes using service
      const result = await quizService.getQuizzesForAdmin(filters, limit, offset);

      if (!result.success) {
        return this.error(result.error || 'Failed to fetch quizzes', result.code, 400);
      }

      // Get total count for pagination
      const totalResult = await quizService.getQuizzesCount(filters);
      const total = totalResult.success ? totalResult.data : 0;
      const totalPages = Math.ceil(total / limit);

      // Add pagination metadata
      const response = {
        quizzes: result.data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages
        },
        filters
      };

      return this.success(response, 'Quizzes retrieved successfully');
    } catch (error: any) {
      logger.error('Failed to get quizzes for admin:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }



  /**
   * Get quiz by ID (admin only)
   */
  async getQuizById(request: NextRequest, quizId: string): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Validate quiz ID format
      if (!quizId || typeof quizId !== 'string') {
        return this.error('Invalid quiz ID', 'INVALID_QUIZ_ID', 400);
      }

      // Get quiz using service (admin version with full details)
      const result = await quizService.getQuizForAdmin(quizId);

      if (!result.success) {
        const statusCode = result.code === 'QUIZ_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to fetch quiz', result.code, statusCode);
      }

      return this.success(result.data, 'Quiz retrieved successfully');
    } catch (error: any) {
      logger.error('Failed to get quiz by ID:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Update quiz (admin only)
   */
  async updateQuiz(request: NextRequest, quizId: string): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Validate quiz ID format
      if (!quizId || typeof quizId !== 'string') {
        return this.error('Invalid quiz ID', 'INVALID_QUIZ_ID', 400);
      }

      // Parse and validate request body
      const body = await this.parseBody<QuizUpdateData>(request);
      if (!body) {
        return this.error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
      }

      // Check if there's actually data to update
      if (Object.keys(body).length === 0) {
        return this.error('No update data provided', 'NO_UPDATE_DATA', 400);
      }

      // Validate using Zod schema
      const validationResult = quizUpdateSchema.safeParse(body);
      if (!validationResult.success) {
        const errors = validationResult.error.issues.map(err =>
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        return this.error(`Validation failed: ${errors}`, 'VALIDATION_ERROR', 400);
      }

      // Update quiz using service
      const result = await quizService.updateQuiz(quizId, validationResult.data, session.userId!);

      if (!result.success) {
        const statusCode = result.code === 'QUIZ_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to update quiz', result.code, statusCode);
      }

      return this.success(result.data, 'Quiz updated successfully');
    } catch (error: any) {
      logger.error('Failed to update quiz:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Delete quiz (admin only)
   */
  async deleteQuiz(request: NextRequest, quizId: string): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Validate quiz ID format
      if (!quizId || typeof quizId !== 'string') {
        return this.error('Invalid quiz ID', 'INVALID_QUIZ_ID', 400);
      }

      // Delete quiz using service
      const result = await quizService.deleteQuiz(quizId, session.userId!);

      if (!result.success) {
        const statusCode = result.code === 'QUIZ_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to delete quiz', result.code, statusCode);
      }

      return this.success({ deleted: true }, 'Quiz deleted successfully');
    } catch (error: any) {
      logger.error('Failed to delete quiz:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }



  /**
   * Publish or unpublish quiz (admin only)
   */
  async publishQuiz(request: NextRequest, quizId: string): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Validate quiz ID format
      if (!quizId || typeof quizId !== 'string') {
        return this.error('Invalid quiz ID', 'INVALID_QUIZ_ID', 400);
      }

      // Parse request body to get publish status
      const body = await this.parseBody<{ isPublished: boolean }>(request);
      if (!body || typeof body.isPublished !== 'boolean') {
        return this.error('Invalid request body. Expected { isPublished: boolean }', 'INVALID_REQUEST_BODY', 400);
      }

      // Update publish status using service
      const result = await quizService.setQuizPublished(quizId, body.isPublished, session.userId!);

      if (!result.success) {
        const statusCode = result.code === 'QUIZ_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to update quiz publish status', result.code, statusCode);
      }

      const message = body.isPublished ? 'Quiz published successfully' : 'Quiz unpublished successfully';
      return this.success(result.data, message);
    } catch (error: any) {
      logger.error('Failed to publish/unpublish quiz:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Archive quiz for admin (admin only)
   */
  async archiveQuizForAdmin(request: NextRequest, quizId: string): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Validate quiz ID format
      if (!quizId || typeof quizId !== 'string') {
        return this.error('Invalid quiz ID', 'INVALID_QUIZ_ID', 400);
      }

      // Parse request body to get archive reason (optional)
      const body = await this.parseBody<{ reason?: string }>(request);
      const reason = body?.reason || 'Manual archive by admin';

      // Archive quiz using service
      const result = await quizService.archiveQuiz(quizId, session.userId!, reason);

      if (!result.success) {
        const statusCode = result.code === 'QUIZ_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to archive quiz', result.code, statusCode);
      }

      return this.success(null, 'Quiz archived successfully');
    } catch (error: any) {
      logger.error('Failed to archive quiz for admin:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Unarchive quiz for admin (admin only)
   */
  async unarchiveQuizForAdmin(request: NextRequest, quizId: string): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Validate quiz ID format
      if (!quizId || typeof quizId !== 'string') {
        return this.error('Invalid quiz ID', 'INVALID_QUIZ_ID', 400);
      }

      // Unarchive quiz using service
      const result = await quizService.unarchiveQuiz(quizId, session.userId!);

      if (!result.success) {
        const statusCode = result.code === 'QUIZ_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to unarchive quiz', result.code, statusCode);
      }

      return this.success(null, 'Quiz unarchived successfully');
    } catch (error: any) {
      logger.error('Failed to unarchive quiz for admin:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Get archived quizzes for admin (admin only)
   */
  async getArchivedQuizzes(request: NextRequest): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Parse query parameters
      const url = new URL(request.url);
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
      const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);

      // Get archived quizzes using service
      const result = await quizService.getArchivedQuizzes(limit, offset);

      if (!result.success) {
        return this.error(result.error || 'Failed to fetch archived quizzes', result.code, 400);
      }

      return this.success(result.data, 'Archived quizzes retrieved successfully');
    } catch (error: any) {
      logger.error('Failed to get archived quizzes for admin:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Reorder quiz questions (admin only)
   */
  async reorderQuizQuestions(request: NextRequest, quizId: string): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Validate quiz ID format
      if (!quizId || typeof quizId !== 'string') {
        return this.error('Invalid quiz ID', 'INVALID_QUIZ_ID', 400);
      }

      // Parse request body to get question order
      const body = await this.parseBody<{ questionIds: string[] }>(request);
      if (!body || !Array.isArray(body.questionIds)) {
        return this.error('Invalid request body. Expected { questionIds: string[] }', 'INVALID_REQUEST_BODY', 400);
      }

      // Reorder questions using service
      const result = await quizService.reorderQuizQuestions(quizId, body.questionIds, session.userId!);

      if (!result.success) {
        const statusCode = result.code === 'QUIZ_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to reorder questions', result.code, statusCode);
      }

      return this.success(null, 'Questions reordered successfully');
    } catch (error: any) {
      logger.error('Failed to reorder quiz questions:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Bulk update quiz questions (admin only)
   */
  async bulkUpdateQuizQuestions(request: NextRequest, quizId: string): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Validate quiz ID format
      if (!quizId || typeof quizId !== 'string') {
        return this.error('Invalid quiz ID', 'INVALID_QUIZ_ID', 400);
      }

      // Parse request body to get updates
      const body = await this.parseBody<{ updates: Array<{ id: string; data: any }> }>(request);
      if (!body || !Array.isArray(body.updates)) {
        return this.error('Invalid request body. Expected { updates: Array<{ id: string; data: any }> }', 'INVALID_REQUEST_BODY', 400);
      }

      // Bulk update questions using service
      const result = await quizService.bulkUpdateQuestions(body.updates, session.userId!);

      if (!result.success) {
        const statusCode = result.validationErrors ? 400 : 500;
        return this.error(result.error || 'Failed to bulk update questions', result.code, statusCode);
      }

      return this.success(result.data, 'Questions updated successfully');
    } catch (error: any) {
      logger.error('Failed to bulk update quiz questions:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Duplicate a question (admin only)
   */
  async duplicateQuestion(request: NextRequest, questionId: string): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Validate question ID format
      if (!questionId || typeof questionId !== 'string') {
        return this.error('Invalid question ID', 'INVALID_QUESTION_ID', 400);
      }

      // Duplicate question using service
      const result = await quizService.duplicateQuestion(questionId, session.userId!);

      if (!result.success) {
        const statusCode = result.code === 'QUESTION_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to duplicate question', result.code, statusCode);
      }

      return this.success(result.data, 'Question duplicated successfully');
    } catch (error: any) {
      logger.error('Failed to duplicate question:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Validate question answers (admin only)
   */
  async validateQuestionAnswers(request: NextRequest, questionId: string): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Validate question ID format
      if (!questionId || typeof questionId !== 'string') {
        return this.error('Invalid question ID', 'INVALID_QUESTION_ID', 400);
      }

      // Validate question using service
      const result = await quizService.validateQuestionAnswers(questionId);

      if (!result.success) {
        const statusCode = result.code === 'QUESTION_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to validate question', result.code, statusCode);
      }

      return this.success(result.data, 'Question validation completed');
    } catch (error: any) {
      logger.error('Failed to validate question answers:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }



  // ===== UNIFIED QUIZ ACCESS FOR ALL USERS =====

  /**
   * Get published quizzes for all authenticated users (customers and experts)
   */
  async getPublishedQuizzes(request: NextRequest): Promise<NextResponse> {
    try {
      // Validate session (works for both customers and experts)
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }

      // Parse query parameters
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Increased limit for experts
      const language = searchParams.get('language') as 'en' | 'ar' | null;

      // Calculate offset
      const offset = (page - 1) * limit;

      // Get published quizzes using service
      const result = await quizService.getPublishedQuizzes(language || undefined, limit, offset, session.role as 'customer' | 'expert' | 'admin');

      if (!result.success) {
        return this.error(result.error || 'Failed to fetch quizzes', result.code, 400);
      }

      // Add pagination metadata
      const response = {
        quizzes: result.data,
        pagination: {
          page,
          limit,
          total: result.data?.length || 0,
          hasMore: (result.data?.length || 0) === limit
        },
        userRole: session.role // Include user role for frontend adaptation
      };

      return this.success(response, 'Published quizzes retrieved successfully');
    } catch (error: any) {
      logger.error('Failed to get published quizzes:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Get quiz by ID for all authenticated users (customers and experts) with attempt validation
   */
  async getQuizForCustomer(request: NextRequest, quizId: string): Promise<NextResponse> {
    try {
      // Validate session (works for both customers and experts)
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }

      // Validate quiz ID format
      if (!quizId || typeof quizId !== 'string') {
        return this.error('Invalid quiz ID', 'INVALID_QUIZ_ID', 400);
      }

      // Get quiz for user using service (includes attempt validation)
      const result = await quizService.getQuizForCustomer(quizId, session.userId!);

      if (!result.success) {
        const statusCode = result.code === 'QUIZ_NOT_FOUND' ? 404 :
          result.code === 'QUIZ_NOT_PUBLISHED' ? 403 : 400;
        return this.error(result.error || 'Failed to fetch quiz', result.code, statusCode);
      }

      // Add user role to response for frontend adaptation
      const responseData = {
        ...result.data,
        userRole: session.role
      };

      return this.success(responseData, 'Quiz retrieved successfully');
    } catch (error: any) {
      logger.error('Failed to get quiz for user:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Start a new quiz attempt for all authenticated users (customers and experts)
   */
  async startQuizAttempt(request: NextRequest, quizId: string): Promise<NextResponse> {
    try {
      // Validate session (works for both customers and experts)
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }

      // Validate quiz ID format
      if (!quizId || typeof quizId !== 'string') {
        return this.error('Invalid quiz ID', 'INVALID_QUIZ_ID', 400);
      }

      // Start quiz attempt using service
      const result = await quizService.startQuizAttempt(session.userId!, quizId);

      if (!result.success) {
        const statusCode = result.code === 'QUIZ_NOT_FOUND' ? 404 :
          result.code === 'QUIZ_NOT_PUBLISHED' ? 403 :
            result.code === 'ATTEMPT_LIMIT_EXCEEDED' ? 429 : 400;
        return this.error(result.error || 'Failed to start quiz attempt', result.code, statusCode);
      }

      return this.success(result.data, 'Quiz attempt started successfully', 201);
    } catch (error: any) {
      logger.error('Failed to start quiz attempt:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Abandon an incomplete quiz attempt (delete it so user can start fresh)
   */
  async abandonQuizAttempt(request: NextRequest, attemptId: string): Promise<NextResponse> {
    try {
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }

      if (!attemptId || typeof attemptId !== 'string') {
        return this.error('Invalid attempt ID', 'INVALID_ATTEMPT_ID', 400);
      }

      const result = await quizService.abandonQuizAttempt(attemptId, session.userId!);

      if (!result.success) {
        const statusCode = result.code === 'QUIZ_NOT_STARTED' ? 404 :
          result.code === 'UNAUTHORIZED' ? 403 :
            result.code === 'QUIZ_ALREADY_COMPLETED' ? 400 : 400;
        return this.error(result.error || 'Failed to abandon quiz attempt', result.code, statusCode);
      }

      return this.success(result.data, 'Quiz attempt abandoned successfully');
    } catch (error: any) {
      logger.error('Failed to abandon quiz attempt:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Submit quiz attempt with answers and get results
   */
  async submitQuizAttempt(request: NextRequest, attemptId: string): Promise<NextResponse> {
    const requestId = `submit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // 1. Rate limiting check
      const rateLimitResult = AwarenessLabRateLimiter.checkQuizSubmissionLimit(request);
      if (!rateLimitResult.success) {
        const errorData = createRateLimitErrorResponse(rateLimitResult);
        const response = this.error(errorData.message, errorData.error, 429);

        // Add rate limit headers
        const headers = getRateLimitHeaders(rateLimitResult);
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });

        // Audit log rate limit exceeded
        auditAwarenessLab({
          event: 'awareness.rate.limit.exceeded',
          requestId,
          severity: 'medium',
          success: false,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          metadata: {
            endpoint: 'quiz-submission',
            retryAfter: errorData.retryAfter
          }
        });

        return response;
      }

      // 2. Validate session (works for both customers and experts)
      const session = await this.validateSession(request);
      if (!session.success) {
        auditAwarenessLab({
          event: 'awareness.quiz.session.invalid',
          requestId,
          severity: 'high',
          success: false,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          metadata: { reason: 'Authentication required' }
        });
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }

      // 3. Validate attempt ID format
      if (!attemptId || typeof attemptId !== 'string') {
        return this.error('Invalid attempt ID', 'INVALID_ATTEMPT_ID', 400);
      }

      // 4. Parse and validate request body
      const body = await this.parseBody<{
        answers: Record<string, string[]>;
        timeTakenSeconds: number;
      }>(request);

      if (!body) {
        return this.error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
      }

      if (!body.answers || typeof body.answers !== 'object') {
        return this.error('Answers are required', 'MISSING_ANSWERS', 400);
      }

      if (typeof body.timeTakenSeconds !== 'number' || body.timeTakenSeconds < 0) {
        return this.error('Valid time taken is required', 'INVALID_TIME_TAKEN', 400);
      }

      // 5. Get quiz and attempt data for validation
      const attemptResult = await quizService.getAttemptById(attemptId);
      if (!attemptResult.success || !attemptResult.data) {
        return this.error('Quiz attempt not found', 'QUIZ_NOT_STARTED', 404);
      }

      const quizResult = await quizService.getQuizForAdmin(attemptResult.data.quizId);
      if (!quizResult.success || !quizResult.data) {
        return this.error('Quiz not found', 'QUIZ_NOT_FOUND', 404);
      }

      // 6. Server-side validation of submission
      const validationResult = quizSubmissionValidator.validateSubmission(
        body.answers,
        body.timeTakenSeconds,
        quizResult.data,
        attemptResult.data,
        session.userId!,
        requestId
      );

      // 7. Handle validation failures
      if (!validationResult.isValid) {
        auditAwarenessLab({
          event: 'awareness.quiz.validation.failed',
          userId: session.userId,
          requestId,
          severity: 'high',
          success: false,
          metadata: {
            attemptId,
            quizId: quizResult.data.id,
            errors: validationResult.errors,
            warnings: validationResult.warnings,
            securityScore: validationResult.securityScore
          }
        });

        // In production, block invalid submissions
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json(
            {
              success: false,
              error: 'Submission validation failed',
              code: 'VALIDATION_FAILED',
              errors: validationResult.errors,
              securityScore: validationResult.securityScore
            },
            { status: 400 }
          );
        }
      }

      // 8. Log suspicious activity
      if (validationResult.warnings.length > 0) {
        auditAwarenessLab({
          event: 'awareness.quiz.validation.suspicious',
          userId: session.userId,
          requestId,
          severity: 'medium',
          success: true,
          metadata: {
            attemptId,
            quizId: quizResult.data.id,
            warnings: validationResult.warnings,
            securityScore: validationResult.securityScore
          }
        });
      }

      // 9. Submit quiz attempt using service
      const result = await quizService.submitQuizAttempt(
        attemptId,
        body.answers,
        body.timeTakenSeconds,
        session.userId!
      );

      if (!result.success) {
        const statusCode = result.code === 'QUIZ_NOT_STARTED' ? 404 :
          result.code === 'QUIZ_ALREADY_COMPLETED' ? 409 :
            result.code === 'QUIZ_TIME_EXPIRED' ? 408 :
              result.code === 'UNAUTHORIZED' ? 403 : 400;

        auditAwarenessLab({
          event: 'awareness.quiz.attempt.submitted',
          userId: session.userId,
          requestId,
          severity: 'medium',
          success: false,
          metadata: {
            attemptId,
            quizId: quizResult.data.id,
            error: result.error,
            code: result.code
          }
        });

        return this.error(result.error || 'Failed to submit quiz attempt', result.code, statusCode);
      }

      // 10. Audit log successful submission
      auditAwarenessLab({
        event: 'awareness.quiz.attempt.completed',
        userId: session.userId,
        requestId,
        severity: 'low',
        success: true,
        metadata: {
          attemptId,
          quizId: quizResult.data.id,
          score: result.data?.score,
          timeTaken: body.timeTakenSeconds,
          securityScore: validationResult.securityScore
        }
      });

      return this.success(result.data, 'Quiz attempt submitted successfully');
    } catch (error: any) {
      logger.error('Failed to submit quiz attempt:', error);

      auditAwarenessLab({
        event: 'awareness.security.alert',
        requestId,
        severity: 'critical',
        success: false,
        error: error.message,
        metadata: {
          endpoint: 'quiz-submission',
          attemptId
        }
      });

      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Get user's quiz progress for all authenticated users (customers and experts)
   */
  async getUserQuizProgress(request: NextRequest, quizId: string): Promise<NextResponse> {
    try {
      // Validate session (works for both customers and experts)
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }

      // Validate quiz ID format
      if (!quizId || typeof quizId !== 'string') {
        return this.error('Invalid quiz ID', 'INVALID_QUIZ_ID', 400);
      }

      // Get user's quiz progress using service
      const result = await quizService.getUserQuizProgress(session.userId!, quizId);

      if (!result.success) {
        const statusCode = result.code === 'QUIZ_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to fetch quiz progress', result.code, statusCode);
      }

      return this.success(result.data, 'Quiz progress retrieved successfully');
    } catch (error: any) {
      logger.error('Failed to get user quiz progress:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Get user's attempt history for a quiz for all authenticated users (customers and experts)
   */
  async getUserAttemptHistory(request: NextRequest, quizId: string): Promise<NextResponse> {
    try {
      // Validate session (works for both customers and experts)
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }

      // Validate quiz ID format
      if (!quizId || typeof quizId !== 'string') {
        return this.error('Invalid quiz ID', 'INVALID_QUIZ_ID', 400);
      }

      // Get user's attempt history using service
      const result = await quizService.getUserAttemptHistory(session.userId!, quizId);

      if (!result.success) {
        return this.error(result.error || 'Failed to fetch attempt history', result.code, 400);
      }

      return this.success(result.data, 'Attempt history retrieved successfully');
    } catch (error: any) {
      logger.error('Failed to get user attempt history:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Validate quiz content for security issues
   */
  private validateQuizContent(quizData: QuizCreationData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const maxQuestionLength = 5000;
    const maxAnswerLength = 1000;
    const maxQuizTitleLength = 255;
    const maxDescriptionLength = 2000;

    // Validate quiz title and description
    if (quizData.title && quizData.title.length > maxQuizTitleLength) {
      errors.push(`Quiz title exceeds maximum length of ${maxQuizTitleLength} characters`);
    }

    if (quizData.description && quizData.description.length > maxDescriptionLength) {
      errors.push(`Quiz description exceeds maximum length of ${maxDescriptionLength} characters`);
    }

    // Check for potentially malicious content in title and description
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /onclick/i,
      /onerror/i,
      /onload/i,
      /<iframe/i,
      /<object/i,
      /<embed/i
    ];

    const checkForSuspiciousContent = (content: string, fieldName: string) => {
      suspiciousPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          errors.push(`Potentially malicious content detected in ${fieldName}`);
        }
      });
    };

    if (quizData.title) {
      checkForSuspiciousContent(quizData.title, 'title');
    }

    if (quizData.description) {
      checkForSuspiciousContent(quizData.description, 'description');
    }

    // Validate questions
    if (quizData.questions) {
      quizData.questions.forEach((question, index) => {
        // Check question length
        if (question.questionData?.question && question.questionData.question.length > maxQuestionLength) {
          errors.push(`Question ${index + 1} exceeds maximum length of ${maxQuestionLength} characters`);
        }

        // Check for suspicious content in question
        if (question.questionData?.question) {
          checkForSuspiciousContent(question.questionData.question, `question ${index + 1}`);
        }

        // Check answer options
        if (question.questionData?.options) {
          question.questionData.options.forEach((option, optionIndex) => {
            if (option.length > maxAnswerLength) {
              errors.push(`Answer option ${optionIndex + 1} in question ${index + 1} exceeds maximum length`);
            }
            checkForSuspiciousContent(option, `answer option in question ${index + 1}`);
          });
        }

        // Check explanation
        if (question.questionData?.explanation && question.questionData.explanation.length > maxAnswerLength) {
          errors.push(`Explanation for question ${index + 1} exceeds maximum length`);
        }

        if (question.questionData?.explanation) {
          checkForSuspiciousContent(question.questionData.explanation, `explanation for question ${index + 1}`);
        }

        // Validate correct answers
        if (!question.correctAnswers || question.correctAnswers.length === 0) {
          errors.push(`Question ${index + 1} must have at least one correct answer`);
        }

        // Validate question type specific rules
        switch (question.questionType) {
          case 'mcq':
          case 'true_false':
            if (question.correctAnswers.length !== 1) {
              errors.push(`Question ${index + 1} of type ${question.questionType} must have exactly one correct answer`);
            }
            break;
          case 'multiple_select':
            if (question.correctAnswers.length === 0) {
              errors.push(`Question ${index + 1} of type multiple_select must have at least one correct answer`);
            }
            break;
        }
      });
    }

    // Validate time limits
    if (quizData.timeLimitMinutes && (quizData.timeLimitMinutes < 1 || quizData.timeLimitMinutes > 180)) {
      errors.push('Time limit must be between 1 and 180 minutes');
    }

    // Validate attempt limits
    if (quizData.maxAttempts && (quizData.maxAttempts < 1 || quizData.maxAttempts > 10)) {
      errors.push('Maximum attempts must be between 1 and 10');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const awarenessLabController = new AwarenessLabController();
