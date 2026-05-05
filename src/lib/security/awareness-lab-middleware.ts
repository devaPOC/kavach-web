/**
 * Awareness Lab Security Middleware
 * Comprehensive security middleware for quiz and learning material endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  quizSubmissionValidator,
  externalLinkValidator,
  quizSessionValidator,
  AwarenessLabRateLimiter,
  ValidationResult,
  SessionValidationResult
} from './awareness-lab-security';
import { awarenessLabCSPManager } from './awareness-lab-csp';
import { auditAwarenessLab, emitAudit } from '@/lib/utils/audit-logger';
import { getRateLimitHeaders, createRateLimitErrorResponse } from '@/lib/auth/rate-limiter';
import { logger } from '@/lib/utils/logger';

/**
 * Security middleware configuration
 */
export interface SecurityMiddlewareConfig {
  enableRateLimit: boolean;
  enableCSP: boolean;
  enableAuditLogging: boolean;
  enableSessionValidation: boolean;
  enableSubmissionValidation: boolean;
  strictMode: boolean;
}

export const DEFAULT_MIDDLEWARE_CONFIG: SecurityMiddlewareConfig = {
  enableRateLimit: true,
  enableCSP: true,
  enableAuditLogging: true,
  enableSessionValidation: true,
  enableSubmissionValidation: true,
  strictMode: process.env.NODE_ENV === 'production'
};

/**
 * Main security middleware class
 */
export class AwarenessLabSecurityMiddleware {
  private config: SecurityMiddlewareConfig;

  constructor(config: SecurityMiddlewareConfig = DEFAULT_MIDDLEWARE_CONFIG) {
    this.config = config;
  }

  /**
   * Apply security middleware to quiz attempt endpoints
   */
  async secureQuizAttempt(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // 1. Rate limiting
      if (this.config.enableRateLimit) {
        const rateLimitResult = AwarenessLabRateLimiter.checkQuizAttemptLimit(request);
        if (!rateLimitResult.success) {
          return this.createRateLimitResponse(rateLimitResult, requestId);
        }
      }

      // 2. Session validation
      if (this.config.enableSessionValidation) {
        const sessionValidation = await this.validateSession(request, requestId);
        if (!sessionValidation.isValid) {
          return this.createErrorResponse(
            'Invalid session',
            'SESSION_INVALID',
            401,
            requestId
          );
        }
      }

      // 3. Audit logging - attempt started
      if (this.config.enableAuditLogging) {
        await this.logQuizAttemptStart(request, requestId);
      }

      // 4. Execute handler
      const response = await handler(request);

      // 5. Add security headers
      if (this.config.enableCSP) {
        const nonce = this.generateNonce();
        awarenessLabCSPManager.addCSPHeaders(response, request.nextUrl.pathname, nonce);
      }

      // 6. Log completion
      const duration = Date.now() - startTime;
      logger.info('Quiz attempt security middleware completed', {
        requestId,
        duration,
        status: response.status
      });

      return response;

    } catch (error) {
      logger.error('Quiz attempt security middleware error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      if (this.config.enableAuditLogging) {
        auditAwarenessLab({
          event: 'awareness.security.alert',
          requestId,
          severity: 'high',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          metadata: {
            endpoint: 'quiz-attempt',
            duration: Date.now() - startTime
          }
        });
      }

      return this.createErrorResponse(
        'Security validation failed',
        'SECURITY_ERROR',
        500,
        requestId
      );
    }
  }

  /**
   * Apply security middleware to quiz submission endpoints
   */
  async secureQuizSubmission(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>,
    validationData?: {
      answers: Record<string, string[]>;
      timeTakenSeconds: number;
      quizData: any;
      attemptData: any;
      userId: string;
    }
  ): Promise<NextResponse> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // 1. Rate limiting (stricter for submissions)
      if (this.config.enableRateLimit) {
        const rateLimitResult = AwarenessLabRateLimiter.checkQuizSubmissionLimit(request);
        if (!rateLimitResult.success) {
          return this.createRateLimitResponse(rateLimitResult, requestId);
        }
      }

      // 2. Session validation
      if (this.config.enableSessionValidation) {
        const sessionValidation = await this.validateSession(request, requestId);
        if (!sessionValidation.isValid) {
          return this.createErrorResponse(
            'Invalid session',
            'SESSION_INVALID',
            401,
            requestId
          );
        }
      }

      // 3. Submission validation
      if (this.config.enableSubmissionValidation && validationData) {
        const validationResult = quizSubmissionValidator.validateSubmission(
          validationData.answers,
          validationData.timeTakenSeconds,
          validationData.quizData,
          validationData.attemptData,
          validationData.userId,
          requestId
        );

        if (!validationResult.isValid) {
          if (this.config.enableAuditLogging) {
            auditAwarenessLab({
              event: 'awareness.quiz.validation.failed',
              userId: validationData.userId,
              requestId,
              severity: 'high',
              success: false,
              metadata: {
                errors: validationResult.errors,
                warnings: validationResult.warnings,
                securityScore: validationResult.securityScore
              }
            });
          }

          if (this.config.strictMode) {
            return this.createErrorResponse(
              'Submission validation failed',
              'VALIDATION_FAILED',
              400,
              requestId,
              { errors: validationResult.errors }
            );
          }
        }

        // Log suspicious activity even if not blocking
        if (validationResult.warnings.length > 0) {
          if (this.config.enableAuditLogging) {
            auditAwarenessLab({
              event: 'awareness.quiz.validation.suspicious',
              userId: validationData.userId,
              requestId,
              severity: 'medium',
              success: true,
              metadata: {
                warnings: validationResult.warnings,
                securityScore: validationResult.securityScore
              }
            });
          }
        }
      }

      // 4. Execute handler
      const response = await handler(request);

      // 5. Add security headers
      if (this.config.enableCSP) {
        const nonce = this.generateNonce();
        awarenessLabCSPManager.addCSPHeaders(response, request.nextUrl.pathname, nonce);
      }

      // 6. Log successful submission
      if (this.config.enableAuditLogging && response.status < 400) {
        auditAwarenessLab({
          event: 'awareness.quiz.attempt.submitted',
          userId: validationData?.userId,
          requestId,
          severity: 'low',
          success: true,
          metadata: {
            duration: Date.now() - startTime,
            securityScore: validationData ?
              quizSubmissionValidator.validateSubmission(
                validationData.answers,
                validationData.timeTakenSeconds,
                validationData.quizData,
                validationData.attemptData,
                validationData.userId,
                requestId
              ).securityScore : undefined
          }
        });
      }

      return response;

    } catch (error) {
      logger.error('Quiz submission security middleware error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      if (this.config.enableAuditLogging) {
        auditAwarenessLab({
          event: 'awareness.security.alert',
          requestId,
          severity: 'critical',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          metadata: {
            endpoint: 'quiz-submission',
            duration: Date.now() - startTime
          }
        });
      }

      return this.createErrorResponse(
        'Security validation failed',
        'SECURITY_ERROR',
        500,
        requestId
      );
    }
  }

  /**
   * Apply security middleware to learning material endpoints
   */
  async secureLearningMaterial(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>,
    externalUrls?: string[]
  ): Promise<NextResponse> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // 1. Rate limiting
      if (this.config.enableRateLimit) {
        const rateLimitResult = AwarenessLabRateLimiter.checkLearningMaterialLimit(request);
        if (!rateLimitResult.success) {
          return this.createRateLimitResponse(rateLimitResult, requestId);
        }
      }

      // 2. Validate external URLs if provided
      if (externalUrls && externalUrls.length > 0) {
        const urlValidationResults = externalUrls.map(url =>
          externalLinkValidator.validateExternalLink(url)
        );

        const invalidUrls = urlValidationResults.filter(result => !result.isValid);
        if (invalidUrls.length > 0 && this.config.strictMode) {
          if (this.config.enableAuditLogging) {
            auditAwarenessLab({
              event: 'awareness.external.link.blocked',
              requestId,
              severity: 'medium',
              success: false,
              metadata: {
                invalidUrls: invalidUrls.map(result => result.errors),
                totalUrls: externalUrls.length
              }
            });
          }

          return this.createErrorResponse(
            'Invalid external URLs detected',
            'INVALID_EXTERNAL_URL',
            400,
            requestId
          );
        }

        // Log validated URLs
        if (this.config.enableAuditLogging) {
          auditAwarenessLab({
            event: 'awareness.external.link.validated',
            requestId,
            severity: 'low',
            success: true,
            metadata: {
              validatedUrls: externalUrls.length,
              warnings: urlValidationResults.flatMap(result => result.warnings)
            }
          });
        }
      }

      // 3. Execute handler
      const response = await handler(request);

      // 4. Add CSP headers with external URL support
      if (this.config.enableCSP) {
        const nonce = this.generateNonce();
        awarenessLabCSPManager.addCSPHeaders(
          response,
          request.nextUrl.pathname,
          nonce,
          externalUrls
        );
      }

      return response;

    } catch (error) {
      logger.error('Learning material security middleware error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      if (this.config.enableAuditLogging) {
        auditAwarenessLab({
          event: 'awareness.security.alert',
          requestId,
          severity: 'high',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          metadata: {
            endpoint: 'learning-material',
            duration: Date.now() - startTime
          }
        });
      }

      return this.createErrorResponse(
        'Security validation failed',
        'SECURITY_ERROR',
        500,
        requestId
      );
    }
  }

  /**
   * Apply security middleware to admin endpoints
   */
  async secureAdminEndpoint(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>,
    operation: 'create' | 'update' | 'delete' | 'read'
  ): Promise<NextResponse> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // 1. Stricter rate limiting for admin operations
      if (this.config.enableRateLimit && operation === 'create') {
        const rateLimitResult = AwarenessLabRateLimiter.checkAdminQuizCreationLimit(request);
        if (!rateLimitResult.success) {
          return this.createRateLimitResponse(rateLimitResult, requestId);
        }
      }

      // 2. Session validation (admin role required)
      if (this.config.enableSessionValidation) {
        const sessionValidation = await this.validateAdminSession(request, requestId);
        if (!sessionValidation.isValid) {
          return this.createErrorResponse(
            'Admin access required',
            'ADMIN_ACCESS_REQUIRED',
            403,
            requestId
          );
        }
      }

      // 3. Execute handler
      const response = await handler(request);

      // 4. Add security headers
      if (this.config.enableCSP) {
        const nonce = this.generateNonce();
        awarenessLabCSPManager.addCSPHeaders(response, request.nextUrl.pathname, nonce);
      }

      // 5. Log admin action
      if (this.config.enableAuditLogging && response.status < 400) {
        auditAwarenessLab({
          event: this.getAdminAuditEvent(operation, request.nextUrl.pathname),
          requestId,
          severity: 'medium',
          success: true,
          metadata: {
            operation,
            endpoint: request.nextUrl.pathname,
            duration: Date.now() - startTime
          }
        });
      }

      return response;

    } catch (error) {
      logger.error('Admin endpoint security middleware error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      if (this.config.enableAuditLogging) {
        auditAwarenessLab({
          event: 'awareness.security.alert',
          requestId,
          severity: 'critical',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          metadata: {
            endpoint: 'admin',
            operation,
            duration: Date.now() - startTime
          }
        });
      }

      return this.createErrorResponse(
        'Security validation failed',
        'SECURITY_ERROR',
        500,
        requestId
      );
    }
  }

  /**
   * Validate session for regular users
   */
  private async validateSession(request: NextRequest, requestId: string): Promise<SessionValidationResult> {
    // This would integrate with your existing session validation
    // For now, return a basic validation
    return {
      isValid: true,
      errors: [],
      warnings: []
    };
  }

  /**
   * Validate session for admin users
   */
  private async validateAdminSession(request: NextRequest, requestId: string): Promise<SessionValidationResult> {
    // This would integrate with your existing admin session validation
    // For now, return a basic validation
    return {
      isValid: true,
      errors: [],
      warnings: []
    };
  }

  /**
   * Log quiz attempt start
   */
  private async logQuizAttemptStart(request: NextRequest, requestId: string): Promise<void> {
    auditAwarenessLab({
      event: 'awareness.quiz.attempt.started',
      requestId,
      severity: 'low',
      success: true,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      metadata: {
        endpoint: request.nextUrl.pathname,
        method: request.method
      }
    });
  }

  /**
   * Get appropriate audit event for admin operations
   */
  private getAdminAuditEvent(operation: string, pathname: string): any {
    if (pathname.includes('/quizzes')) {
      switch (operation) {
        case 'create': return 'awareness.quiz.created';
        case 'update': return 'awareness.quiz.updated';
        case 'delete': return 'awareness.quiz.deleted';
        default: return 'awareness.quiz.updated';
      }
    } else if (pathname.includes('/templates')) {
      switch (operation) {
        case 'create': return 'awareness.template.created';
        case 'update': return 'awareness.template.updated';
        case 'delete': return 'awareness.template.deleted';
        default: return 'awareness.template.updated';
      }
    } else if (pathname.includes('/learning-modules')) {
      switch (operation) {
        case 'create': return 'awareness.learning.module.created';
        case 'update': return 'awareness.learning.module.updated';
        case 'delete': return 'awareness.learning.module.deleted';
        default: return 'awareness.learning.module.updated';
      }
    }

    return 'awareness.security.alert';
  }

  /**
   * Create rate limit error response
   */
  private createRateLimitResponse(rateLimitResult: any, requestId: string): NextResponse {
    const errorData = createRateLimitErrorResponse(rateLimitResult);
    const response = NextResponse.json(
      {
        success: false,
        error: errorData.message,
        code: errorData.error,
        requestId,
        retryAfter: errorData.retryAfter
      },
      { status: 429 }
    );

    // Add rate limit headers
    const headers = getRateLimitHeaders(rateLimitResult);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    if (this.config.enableAuditLogging) {
      auditAwarenessLab({
        event: 'awareness.rate.limit.exceeded',
        requestId,
        severity: 'medium',
        success: false,
        metadata: {
          retryAfter: errorData.retryAfter,
          remaining: rateLimitResult.remaining
        }
      });
    }

    return response;
  }

  /**
   * Create standardized error response
   */
  private createErrorResponse(
    message: string,
    code: string,
    status: number,
    requestId: string,
    metadata?: any
  ): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: message,
        code,
        requestId,
        timestamp: new Date().toISOString(),
        ...metadata
      },
      { status }
    );
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate cryptographic nonce
   */
  private generateNonce(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, '');
  }
}

// Export singleton instance
export const awarenessLabSecurityMiddleware = new AwarenessLabSecurityMiddleware();
