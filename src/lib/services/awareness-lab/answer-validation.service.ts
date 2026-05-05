import { BaseService, ServiceResult, serviceSuccess, serviceError } from '../base.service';
import { AwarenessLabErrorCode } from '@/lib/errors/awareness-lab-errors';

export interface ValidationRule {
  field: string;
  rule: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface AnswerValidationResult {
  isValid: boolean;
  errors: ValidationRule[];
  warnings: ValidationRule[];
  sanitizedAnswers: Record<string, string[]>;
  questionValidations: Record<string, QuestionValidationResult>;
}

export interface QuestionValidationResult {
  questionId: string;
  questionType: 'mcq' | 'true_false' | 'multiple_select';
  isValid: boolean;
  errors: string[];
  warnings: string[];
  originalAnswers: string[];
  sanitizedAnswers: string[];
  expectedFormat: string;
}

export interface SecurityCheckResult {
  isSafe: boolean;
  threats: string[];
  sanitizedAnswers: Record<string, string[]>;
}

/**
 * Answer Validation Service for quiz submissions
 * Implements requirements 2.3 and 2.6 for answer validation and security checks
 */
export class AnswerValidationService extends BaseService {
  
  /**
   * Validate quiz answers with comprehensive checks
   */
  async validateQuizAnswers(
    questions: any[],
    userAnswers: Record<string, string[]>,
    options: {
      enableSanitization?: boolean;
      enableSecurityChecks?: boolean;
      strictValidation?: boolean;
    } = {}
  ): Promise<ServiceResult<AnswerValidationResult>> {
    try {
      const {
        enableSanitization = true,
        enableSecurityChecks = true,
        strictValidation = false
      } = options;

      const errors: ValidationRule[] = [];
      const warnings: ValidationRule[] = [];
      const questionValidations: Record<string, QuestionValidationResult> = {};
      let sanitizedAnswers = { ...userAnswers };

      // Basic structure validation
      if (!userAnswers || typeof userAnswers !== 'object') {
        return serviceError('Invalid answers format', AwarenessLabErrorCode.INVALID_QUIZ_ANSWERS);
      }

      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return serviceError('No questions provided for validation', AwarenessLabErrorCode.INVALID_QUIZ_ANSWERS);
      }

      // Security checks first
      if (enableSecurityChecks) {
        const securityResult = await this.performSecurityChecks(userAnswers);
        if (!securityResult.success) {
          return serviceError(securityResult.error!, AwarenessLabErrorCode.INVALID_QUIZ_ANSWERS);
        }

        const securityData = securityResult.data!;
        if (!securityData.isSafe) {
          errors.push({
            field: 'answers',
            rule: 'security_check',
            message: `Security threats detected: ${securityData.threats.join(', ')}`,
            severity: 'error'
          });
        }

        sanitizedAnswers = securityData.sanitizedAnswers;
      }

      // Validate each question's answers
      for (const question of questions) {
        const questionValidation = await this.validateQuestionAnswers(
          question,
          sanitizedAnswers[question.id] || [],
          { enableSanitization, strictValidation }
        );

        if (!questionValidation.success) {
          errors.push({
            field: question.id,
            rule: 'question_validation',
            message: questionValidation.error!,
            severity: 'error'
          });
          continue;
        }

        const validation = questionValidation.data!;
        questionValidations[question.id] = validation;

        // Update sanitized answers
        if (enableSanitization) {
          sanitizedAnswers[question.id] = validation.sanitizedAnswers;
        }

        // Add errors and warnings
        validation.errors.forEach(error => {
          errors.push({
            field: question.id,
            rule: 'format_validation',
            message: error,
            severity: 'error'
          });
        });

        validation.warnings.forEach(warning => {
          warnings.push({
            field: question.id,
            rule: 'format_warning',
            message: warning,
            severity: 'warning'
          });
        });
      }

      // Check for missing answers
      const missingAnswers = questions.filter(q => 
        !sanitizedAnswers[q.id] || 
        sanitizedAnswers[q.id].length === 0 ||
        sanitizedAnswers[q.id].every(a => !a || a.trim().length === 0)
      );

      if (missingAnswers.length > 0) {
        if (strictValidation) {
          missingAnswers.forEach(q => {
            errors.push({
              field: q.id,
              rule: 'required',
              message: `Answer is required for question ${q.id}`,
              severity: 'error'
            });
          });
        } else {
          warnings.push({
            field: 'answers',
            rule: 'incomplete',
            message: `${missingAnswers.length} question(s) have no answers`,
            severity: 'warning'
          });
        }
      }

      const result: AnswerValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        sanitizedAnswers,
        questionValidations
      };

      this.audit({
        event: 'awareness.quiz.validation.failed',
        resource: 'answer_validation',
        metadata: {
          totalQuestions: questions.length,
          answeredQuestions: Object.keys(sanitizedAnswers).length,
          errorCount: errors.length,
          warningCount: warnings.length,
          securityChecksEnabled: enableSecurityChecks,
          sanitizationEnabled: enableSanitization
        }
      });

      return serviceSuccess(result);
    } catch (error) {
      this.handleError(error, 'AnswerValidationService.validateQuizAnswers');
    }
  }

  /**
   * Validate answers for a specific question
   */
  private async validateQuestionAnswers(
    question: any,
    userAnswers: string[],
    options: { enableSanitization: boolean; strictValidation: boolean }
  ): Promise<ServiceResult<QuestionValidationResult>> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];
      let sanitizedAnswers = [...userAnswers];

      // Basic validation
      if (!question.id || !question.questionType) {
        return serviceError('Invalid question format', AwarenessLabErrorCode.INVALID_QUIZ_ANSWERS);
      }

      // Sanitize answers if enabled
      if (options.enableSanitization) {
        sanitizedAnswers = this.sanitizeAnswers(userAnswers);
      }

      // Type-specific validation
      switch (question.questionType) {
        case 'mcq':
          this.validateMCQAnswers(sanitizedAnswers, errors, warnings, options.strictValidation);
          break;

        case 'true_false':
          this.validateTrueFalseAnswers(sanitizedAnswers, errors, warnings, options.strictValidation);
          break;

        case 'multiple_select':
          this.validateMultipleSelectAnswers(sanitizedAnswers, errors, warnings, options.strictValidation);
          break;

        default:
          errors.push(`Unsupported question type: ${question.questionType}`);
      }

      // Check for suspicious patterns
      this.checkSuspiciousPatterns(sanitizedAnswers, warnings);

      const result: QuestionValidationResult = {
        questionId: question.id,
        questionType: question.questionType,
        isValid: errors.length === 0,
        errors,
        warnings,
        originalAnswers: userAnswers,
        sanitizedAnswers,
        expectedFormat: this.getExpectedFormat(question.questionType)
      };

      return serviceSuccess(result);
    } catch (error) {
      return serviceError(
        `Failed to validate question answers: ${error instanceof Error ? error.message : 'Unknown error'}`,
        AwarenessLabErrorCode.INVALID_QUIZ_ANSWERS
      );
    }
  }

  /**
   * Validate Multiple Choice Question answers
   */
  private validateMCQAnswers(
    answers: string[],
    errors: string[],
    warnings: string[],
    strictValidation: boolean
  ): void {
    if (answers.length === 0) {
      if (strictValidation) {
        errors.push('MCQ requires exactly one answer');
      } else {
        warnings.push('No answer selected for MCQ');
      }
      return;
    }

    if (answers.length > 1) {
      errors.push('MCQ can only have one answer selected');
      return;
    }

    const answer = answers[0];
    if (!answer || answer.trim().length === 0) {
      errors.push('MCQ answer cannot be empty');
      return;
    }

    // Check for valid option format (assuming options are labeled A, B, C, D or 1, 2, 3, 4)
    const validOptionPattern = /^[A-Za-z0-9]$/;
    if (!validOptionPattern.test(answer.trim())) {
      warnings.push('MCQ answer format may be invalid (expected single character/digit)');
    }
  }

  /**
   * Validate True/False Question answers
   */
  private validateTrueFalseAnswers(
    answers: string[],
    errors: string[],
    warnings: string[],
    strictValidation: boolean
  ): void {
    if (answers.length === 0) {
      if (strictValidation) {
        errors.push('True/False requires exactly one answer');
      } else {
        warnings.push('No answer selected for True/False question');
      }
      return;
    }

    if (answers.length > 1) {
      errors.push('True/False can only have one answer selected');
      return;
    }

    const answer = answers[0].toLowerCase().trim();
    const validAnswers = ['true', 'false', 't', 'f', '1', '0', 'yes', 'no', 'y', 'n'];
    
    if (!validAnswers.includes(answer)) {
      errors.push(`Invalid True/False answer: "${answers[0]}". Expected: true, false, t, f, 1, 0, yes, no, y, or n`);
    }
  }

  /**
   * Validate Multiple Select Question answers
   */
  private validateMultipleSelectAnswers(
    answers: string[],
    errors: string[],
    warnings: string[],
    strictValidation: boolean
  ): void {
    if (answers.length === 0) {
      if (strictValidation) {
        errors.push('Multiple select requires at least one answer');
      } else {
        warnings.push('No answers selected for multiple select question');
      }
      return;
    }

    // Check for duplicates
    const uniqueAnswers = new Set(answers);
    if (uniqueAnswers.size !== answers.length) {
      warnings.push('Duplicate answers detected in multiple select question');
    }

    // Check for empty answers
    const emptyAnswers = answers.filter(a => !a || a.trim().length === 0);
    if (emptyAnswers.length > 0) {
      errors.push(`${emptyAnswers.length} empty answer(s) in multiple select question`);
    }

    // Check for reasonable number of selections (not more than 10)
    if (answers.length > 10) {
      warnings.push('Unusually high number of selections for multiple select question');
    }
  }

  /**
   * Perform security checks on answers
   */
  private async performSecurityChecks(
    userAnswers: Record<string, string[]>
  ): Promise<ServiceResult<SecurityCheckResult>> {
    try {
      const threats: string[] = [];
      const sanitizedAnswers: Record<string, string[]> = {};

      for (const [questionId, answers] of Object.entries(userAnswers)) {
        const sanitizedQuestionAnswers: string[] = [];

        for (const answer of answers || []) {
          if (typeof answer !== 'string') {
            threats.push(`Non-string answer detected in question ${questionId}`);
            continue;
          }

          // Check for script injection
          if (this.containsScript(answer)) {
            threats.push(`Script injection attempt detected in question ${questionId}`);
            sanitizedQuestionAnswers.push(this.removeScripts(answer));
            continue;
          }

          // Check for SQL injection patterns
          if (this.containsSQLInjection(answer)) {
            threats.push(`SQL injection attempt detected in question ${questionId}`);
            sanitizedQuestionAnswers.push(this.sanitizeSQLInjection(answer));
            continue;
          }

          // Check for excessive length
          if (answer.length > 1000) {
            threats.push(`Excessively long answer detected in question ${questionId}`);
            sanitizedQuestionAnswers.push(answer.substring(0, 1000));
            continue;
          }

          // Check for suspicious characters
          if (this.containsSuspiciousCharacters(answer)) {
            threats.push(`Suspicious characters detected in question ${questionId}`);
            sanitizedQuestionAnswers.push(this.removeSuspiciousCharacters(answer));
            continue;
          }

          sanitizedQuestionAnswers.push(answer);
        }

        sanitizedAnswers[questionId] = sanitizedQuestionAnswers;
      }

      const result: SecurityCheckResult = {
        isSafe: threats.length === 0,
        threats,
        sanitizedAnswers
      };

      return serviceSuccess(result);
    } catch (error) {
      return serviceError(
        `Security check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        AwarenessLabErrorCode.INVALID_QUIZ_ANSWERS
      );
    }
  }

  /**
   * Sanitize answers by removing/escaping dangerous content
   */
  private sanitizeAnswers(answers: string[]): string[] {
    return answers
      .filter(answer => answer != null)
      .map(answer => String(answer))
      .map(answer => answer.trim())
      .map(answer => this.removeScripts(answer))
      .map(answer => this.sanitizeSQLInjection(answer))
      .map(answer => this.removeSuspiciousCharacters(answer))
      .filter(answer => answer.length > 0);
  }

  /**
   * Check for suspicious patterns in answers
   */
  private checkSuspiciousPatterns(answers: string[], warnings: string[]): void {
    // Check for repeated identical answers
    if (answers.length > 1) {
      const uniqueAnswers = new Set(answers);
      if (uniqueAnswers.size === 1) {
        warnings.push('All answers are identical');
      }
    }

    // Check for sequential patterns (A, B, C, D or 1, 2, 3, 4)
    if (answers.length > 2) {
      const isSequential = this.isSequentialPattern(answers);
      if (isSequential) {
        warnings.push('Sequential answer pattern detected');
      }
    }

    // Check for alternating patterns (A, B, A, B)
    if (answers.length > 3) {
      const isAlternating = this.isAlternatingPattern(answers);
      if (isAlternating) {
        warnings.push('Alternating answer pattern detected');
      }
    }
  }

  /**
   * Security check methods
   */
  private containsScript(text: string): boolean {
    const scriptPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi
    ];
    return scriptPatterns.some(pattern => pattern.test(text));
  }

  private removeScripts(text: string): string {
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/<iframe[^>]*>/gi, '')
      .replace(/<object[^>]*>/gi, '')
      .replace(/<embed[^>]*>/gi, '');
  }

  private containsSQLInjection(text: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /(--|\/\*|\*\/)/gi,
      /(\bxp_cmdshell\b)/gi
    ];
    return sqlPatterns.some(pattern => pattern.test(text));
  }

  private sanitizeSQLInjection(text: string): string {
    return text
      .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi, '')
      .replace(/(--|\/\*|\*\/)/gi, '')
      .replace(/(\bxp_cmdshell\b)/gi, '');
  }

  private containsSuspiciousCharacters(text: string): boolean {
    // Check for control characters and unusual Unicode
    return /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/.test(text);
  }

  private removeSuspiciousCharacters(text: string): string {
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
  }

  /**
   * Pattern detection methods
   */
  private isSequentialPattern(answers: string[]): boolean {
    if (answers.length < 3) return false;
    
    // Check for alphabetical sequence (A, B, C)
    const isAlphaSequential = answers.every((answer, index) => {
      if (index === 0) return true;
      const prevChar = answers[index - 1].charCodeAt(0);
      const currChar = answer.charCodeAt(0);
      return currChar === prevChar + 1;
    });

    // Check for numerical sequence (1, 2, 3)
    const isNumSequential = answers.every((answer, index) => {
      if (index === 0) return true;
      const prevNum = parseInt(answers[index - 1]);
      const currNum = parseInt(answer);
      return !isNaN(prevNum) && !isNaN(currNum) && currNum === prevNum + 1;
    });

    return isAlphaSequential || isNumSequential;
  }

  private isAlternatingPattern(answers: string[]): boolean {
    if (answers.length < 4) return false;
    
    return answers.every((answer, index) => {
      if (index < 2) return true;
      return answer === answers[index - 2];
    });
  }

  /**
   * Get expected format description for question type
   */
  private getExpectedFormat(questionType: string): string {
    switch (questionType) {
      case 'mcq':
        return 'Single answer (e.g., "A", "B", "C", or "1", "2", "3")';
      case 'true_false':
        return 'Single boolean answer (e.g., "true", "false", "t", "f", "1", "0")';
      case 'multiple_select':
        return 'One or more answers (e.g., ["A", "C"] or ["1", "3", "4"])';
      default:
        return 'Unknown format';
    }
  }
}

// Export singleton instance
export const answerValidationService = new AnswerValidationService();