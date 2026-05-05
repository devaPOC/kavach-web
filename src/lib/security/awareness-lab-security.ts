/**
 * Awareness Lab Security Module
 * Implements comprehensive security measures for quiz and learning materials
 */

import { NextRequest } from 'next/server';
import { auditLogger, emitAudit, AuditEventName } from '@/lib/utils/audit-logger';
import { rateLimiters, checkRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/auth/rate-limiter';
import { logger } from '@/lib/utils/logger';

// Security configuration for Awareness Lab
export interface AwarenessLabSecurityConfig {
  maxQuizAttempts: number;
  maxQuizDuration: number; // in minutes
  allowedExternalDomains: string[];
  maxAnswerLength: number;
  maxQuestionLength: number;
  sessionValidationInterval: number; // in minutes
}

export const DEFAULT_SECURITY_CONFIG: AwarenessLabSecurityConfig = {
  maxQuizAttempts: 10,
  maxQuizDuration: 180, // 3 hours max
  allowedExternalDomains: [
    'youtube.com',
    'youtu.be',
    'vimeo.com',
    'player.vimeo.com',
    'docs.google.com',
    'drive.google.com',
    'microsoft.com',
    'office.com'
  ],
  maxAnswerLength: 1000,
  maxQuestionLength: 5000,
  sessionValidationInterval: 30 // 30 minutes
};

/**
 * Server-side quiz submission validation
 */
export class QuizSubmissionValidator {
  private config: AwarenessLabSecurityConfig;

  constructor(config: AwarenessLabSecurityConfig = DEFAULT_SECURITY_CONFIG) {
    this.config = config;
  }

  /**
   * Validate quiz submission data
   */
  validateSubmission(
    answers: Record<string, string[]>,
    timeTakenSeconds: number,
    quizData: any,
    attemptData: any,
    userId: string,
    requestId: string
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate timing
    const timingValidation = this.validateTiming(timeTakenSeconds, quizData, attemptData);
    if (!timingValidation.isValid) {
      errors.push(...timingValidation.errors);
    }
    warnings.push(...timingValidation.warnings);

    // Validate answers structure
    const answerValidation = this.validateAnswers(answers, quizData);
    if (!answerValidation.isValid) {
      errors.push(...answerValidation.errors);
    }

    // Validate attempt integrity
    const integrityValidation = this.validateAttemptIntegrity(attemptData, userId);
    if (!integrityValidation.isValid) {
      errors.push(...integrityValidation.errors);
    }

    // Check for suspicious patterns
    const suspiciousPatterns = this.detectSuspiciousPatterns(
      answers,
      timeTakenSeconds,
      quizData,
      userId,
      requestId
    );
    warnings.push(...suspiciousPatterns);

    const isValid = errors.length === 0;

    // Log validation results
    if (!isValid || warnings.length > 0) {
      this.logValidationResults(userId, requestId, errors, warnings, {
        timeTakenSeconds,
        answerCount: Object.keys(answers).length,
        quizId: quizData.id
      });
    }

    return {
      isValid,
      errors,
      warnings,
      securityScore: this.calculateSecurityScore(errors, warnings, suspiciousPatterns)
    };
  }

  /**
   * Validate quiz timing
   */
  private validateTiming(
    timeTakenSeconds: number,
    quizData: any,
    attemptData: any
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if time is reasonable
    if (timeTakenSeconds < 0) {
      errors.push('Invalid time taken: negative value');
    }

    if (timeTakenSeconds < 10) {
      warnings.push('Suspiciously fast completion time');
    }

    // Check against quiz time limit
    if (quizData.timeLimitMinutes) {
      const maxTimeSeconds = quizData.timeLimitMinutes * 60;
      if (timeTakenSeconds > maxTimeSeconds + 30) { // 30 second grace period
        errors.push('Time limit exceeded');
      }
    }

    // Check against maximum allowed duration
    const maxDurationSeconds = this.config.maxQuizDuration * 60;
    if (timeTakenSeconds > maxDurationSeconds) {
      errors.push('Quiz duration exceeds maximum allowed time');
    }

    // Validate against attempt start time
    if (attemptData.startedAt) {
      const startTime = new Date(attemptData.startedAt).getTime();
      const currentTime = Date.now();
      const actualDuration = Math.floor((currentTime - startTime) / 1000);

      // Allow some variance for network delays
      const timeDifference = Math.abs(actualDuration - timeTakenSeconds);
      if (timeDifference > 60) { // More than 1 minute difference
        warnings.push('Time discrepancy detected between client and server');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate answers structure and content
   */
  private validateAnswers(
    answers: Record<string, string[]>,
    quizData: any
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!answers || typeof answers !== 'object') {
      errors.push('Invalid answers format');
      return { isValid: false, errors };
    }

    // Validate against quiz questions
    if (quizData.questions) {
      const questionIds = quizData.questions.map((q: any) => q.id);

      // Check for extra answers
      for (const answerId of Object.keys(answers)) {
        if (!questionIds.includes(answerId)) {
          errors.push(`Invalid question ID in answers: ${answerId}`);
        }
      }

      // Validate each answer
      for (const question of quizData.questions) {
        const answer = answers[question.id];

        if (answer !== undefined) {
          // Validate answer format
          if (!Array.isArray(answer)) {
            errors.push(`Invalid answer format for question ${question.id}`);
            continue;
          }

          // Validate answer content length
          for (const answerValue of answer) {
            if (typeof answerValue !== 'string') {
              errors.push(`Invalid answer type for question ${question.id}`);
            } else if (answerValue.length > this.config.maxAnswerLength) {
              errors.push(`Answer too long for question ${question.id}`);
            }
          }

          // Validate answer count based on question type
          const validation = this.validateAnswerByQuestionType(question, answer);
          if (!validation.isValid) {
            errors.push(...validation.errors);
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate answer based on question type
   */
  private validateAnswerByQuestionType(
    question: any,
    answer: string[]
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (question.questionType) {
      case 'mcq':
      case 'true_false':
        if (answer.length !== 1) {
          errors.push(`Single choice question ${question.id} must have exactly one answer`);
        }
        break;

      case 'multiple_select':
        if (answer.length === 0) {
          errors.push(`Multiple select question ${question.id} must have at least one answer`);
        }
        break;

      default:
        errors.push(`Unknown question type: ${question.questionType}`);
    }

    // Validate answer values against options
    if (question.questionType === 'true_false') {
      // For true/false questions, answers should be 'true' or 'false'
      for (const answerValue of answer) {
        if (!['true', 'false'].includes(answerValue.toLowerCase())) {
          errors.push(`Invalid answer option for question ${question.id}: ${answerValue}`);
        }
      }
    } else if (question.questionData?.options) {
      // For MCQ and multiple select, answers should match valid option text
      const validOptions = question.questionData.options;
      for (const answerValue of answer) {
        if (!validOptions.includes(answerValue)) {
          errors.push(`Invalid answer option for question ${question.id}: ${answerValue}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate attempt integrity
   */
  private validateAttemptIntegrity(
    attemptData: any,
    userId: string
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!attemptData) {
      errors.push('Attempt data not found');
      return { isValid: false, errors };
    }

    // Validate ownership
    if (attemptData.userId !== userId) {
      errors.push('Attempt ownership mismatch');
    }

    // Validate attempt state
    if (attemptData.isCompleted) {
      errors.push('Attempt already completed');
    }

    // Validate attempt timing
    if (!attemptData.startedAt) {
      errors.push('Attempt start time not found');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Detect suspicious patterns in quiz submission
   */
  private detectSuspiciousPatterns(
    answers: Record<string, string[]>,
    timeTakenSeconds: number,
    quizData: any,
    userId: string,
    requestId: string
  ): string[] {
    const warnings: string[] = [];

    // All suspicious pattern checks have been removed

    return warnings;
  }

  /**
   * Calculate security score based on validation results
   */
  private calculateSecurityScore(
    errors: string[],
    warnings: string[],
    suspiciousPatterns: string[]
  ): number {
    let score = 100;

    // Deduct points for errors (critical issues)
    score -= errors.length * 25;

    // Deduct points for warnings (suspicious but not blocking)
    score -= warnings.length * 10;

    // Deduct points for suspicious patterns
    score -= suspiciousPatterns.length * 15;

    return Math.max(0, score);
  }

  /**
   * Log validation results for audit purposes
   */
  private logValidationResults(
    userId: string,
    requestId: string,
    errors: string[],
    warnings: string[],
    metadata: any
  ): void {
    if (errors.length > 0) {
      emitAudit({
        event: 'awareness.quiz.validation.failed' as AuditEventName,
        userId,
        requestId,
        severity: 'high',
        success: false,
        metadata: {
          errors,
          warnings,
          ...metadata
        }
      });
    } else if (warnings.length > 0) {
      emitAudit({
        event: 'awareness.quiz.validation.suspicious' as AuditEventName,
        userId,
        requestId,
        severity: 'medium',
        success: true,
        metadata: {
          warnings,
          ...metadata
        }
      });
    }
  }
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  securityScore: number;
}

/**
 * External link validator for learning materials
 */
export class ExternalLinkValidator {
  private config: AwarenessLabSecurityConfig;

  constructor(config: AwarenessLabSecurityConfig = DEFAULT_SECURITY_CONFIG) {
    this.config = config;
  }

  /**
   * Validate external link URL
   */
  validateExternalLink(url: string): LinkValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const parsedUrl = new URL(url);

      // Check protocol
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        errors.push('Only HTTP and HTTPS protocols are allowed');
      }

      // Check domain whitelist
      const domain = parsedUrl.hostname.toLowerCase();
      const isAllowed = this.config.allowedExternalDomains.some(allowedDomain =>
        domain === allowedDomain || domain.endsWith(`.${allowedDomain}`)
      );

      if (!isAllowed) {
        warnings.push(`Domain ${domain} is not in the approved list`);
      }

      // Check for suspicious patterns
      if (this.containsSuspiciousPatterns(url)) {
        warnings.push('URL contains potentially suspicious patterns');
      }

      return {
        isValid: errors.length === 0,
        isApproved: errors.length === 0 && warnings.length === 0,
        errors,
        warnings,
        sanitizedUrl: this.sanitizeUrl(url)
      };

    } catch (error) {
      return {
        isValid: false,
        isApproved: false,
        errors: ['Invalid URL format'],
        warnings: [],
        sanitizedUrl: ''
      };
    }
  }

  /**
   * Check for suspicious patterns in URL
   */
  private containsSuspiciousPatterns(url: string): boolean {
    const suspiciousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /file:/i,
      /ftp:/i,
      /<script/i,
      /onclick/i,
      /onerror/i,
      /onload/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Sanitize URL for safe usage
   */
  private sanitizeUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);

      // Remove potentially dangerous parameters
      const dangerousParams = ['javascript', 'script', 'eval', 'onclick'];
      dangerousParams.forEach(param => {
        parsedUrl.searchParams.delete(param);
      });

      return parsedUrl.toString();
    } catch {
      return '';
    }
  }

  /**
   * Generate CSP directive for external link
   */
  generateCSPDirective(url: string): string {
    try {
      const parsedUrl = new URL(url);
      const domain = parsedUrl.hostname;

      // Return appropriate CSP directive based on content type
      if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
        return `frame-src https://*.youtube.com https://*.youtu.be; script-src https://*.youtube.com`;
      }

      if (domain.includes('vimeo.com')) {
        return `frame-src https://*.vimeo.com; script-src https://*.vimeo.com`;
      }

      // Generic external link
      return `frame-src https://${domain}; connect-src https://${domain}`;

    } catch {
      return '';
    }
  }
}

/**
 * Link validation result interface
 */
export interface LinkValidationResult {
  isValid: boolean;
  isApproved: boolean;
  errors: string[];
  warnings: string[];
  sanitizedUrl: string;
}

/**
 * Rate limiter for Awareness Lab endpoints
 */
export class AwarenessLabRateLimiter {

  /**
   * Rate limit configurations for different Awareness Lab operations
   */
  static readonly CONFIGS = {
    QUIZ_ATTEMPT: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxAttempts: 20, // 20 quiz attempts per hour
      blockDurationMs: 30 * 60 * 1000 // Block for 30 minutes
    },
    QUIZ_SUBMISSION: {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxAttempts: 10, // 10 submissions per 5 minutes
      blockDurationMs: 15 * 60 * 1000 // Block for 15 minutes
    },
    LEARNING_MATERIAL_ACCESS: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxAttempts: 100, // 100 material accesses per hour
      blockDurationMs: 10 * 60 * 1000 // Block for 10 minutes
    },
    ADMIN_QUIZ_CREATION: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxAttempts: 50, // 50 quiz creations per hour
      blockDurationMs: 60 * 60 * 1000 // Block for 1 hour
    }
  };

  /**
   * Check rate limit for quiz attempts
   */
  static checkQuizAttemptLimit(request: NextRequest) {
    return checkRateLimit(request, this.CONFIGS.QUIZ_ATTEMPT, 'awareness-quiz-attempt');
  }

  /**
   * Check rate limit for quiz submissions
   */
  static checkQuizSubmissionLimit(request: NextRequest) {
    return checkRateLimit(request, this.CONFIGS.QUIZ_SUBMISSION, 'awareness-quiz-submission');
  }

  /**
   * Check rate limit for learning material access
   */
  static checkLearningMaterialLimit(request: NextRequest) {
    return checkRateLimit(request, this.CONFIGS.LEARNING_MATERIAL_ACCESS, 'awareness-learning-material');
  }

  /**
   * Check rate limit for admin quiz creation
   */
  static checkAdminQuizCreationLimit(request: NextRequest) {
    return checkRateLimit(request, this.CONFIGS.ADMIN_QUIZ_CREATION, 'awareness-admin-quiz-creation');
  }
}

/**
 * Session validator for quiz attempts
 */
export class QuizSessionValidator {
  private config: AwarenessLabSecurityConfig;

  constructor(config: AwarenessLabSecurityConfig = DEFAULT_SECURITY_CONFIG) {
    this.config = config;
  }

  /**
   * Validate session for quiz attempt
   */
  validateQuizSession(
    session: any,
    attemptData: any,
    requestId: string
  ): SessionValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!session) {
      errors.push('No valid session found');
      return { isValid: false, errors, warnings };
    }

    // Validate session ownership
    if (session.userId !== attemptData.userId) {
      errors.push('Session user mismatch');
    }

    // Check session freshness
    const sessionAge = Date.now() - new Date(session.createdAt || session.iat * 1000).getTime();
    const maxSessionAge = this.config.sessionValidationInterval * 60 * 1000;

    if (sessionAge > maxSessionAge) {
      warnings.push('Session is older than recommended validation interval');
    }

    // Validate session integrity
    if (!session.userId || !session.role) {
      errors.push('Invalid session data');
    }

    // Log session validation
    if (errors.length > 0) {
      emitAudit({
        event: 'awareness.quiz.session.invalid' as AuditEventName,
        userId: session.userId,
        requestId,
        severity: 'high',
        success: false,
        metadata: {
          errors,
          warnings,
          sessionAge: Math.floor(sessionAge / 1000)
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

/**
 * Session validation result interface
 */
export interface SessionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Export singleton instances
export const quizSubmissionValidator = new QuizSubmissionValidator();
export const externalLinkValidator = new ExternalLinkValidator();
export const quizSessionValidator = new QuizSessionValidator();
