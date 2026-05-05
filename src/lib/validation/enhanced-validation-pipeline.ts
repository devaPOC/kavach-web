/**
 * Enhanced Validation Pipeline for Awareness Lab
 * Provides comprehensive validation with detailed field-level error messages
 * and cross-validation capabilities
 *
 * NOTE: This file uses server-only utilities and should not be imported in client code
 */

import { z } from 'zod';
import { AwarenessLabError, AwarenessLabErrorCode } from '@/lib/errors/awareness-lab-errors';
import {
  sanitizeHtml,
  sanitizeQuestionOptions,
} from './awareness-lab-utils.server';
import {
  validateMultilingualContent,
  isValidUrl,
  validateVideoUrl,
  validateEmbedCode,
  validateQuizAnswers
} from './awareness-lab-utils';

// Enhanced error message types
export interface ValidationError {
  field: string;
  code: string;
  message: string;
  value?: any;
  context?: Record<string, any>;
}

export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// Field-level error messages
export const VALIDATION_MESSAGES = {
  // Common field messages
  REQUIRED: 'This field is required',
  INVALID_FORMAT: 'Invalid format provided',
  TOO_SHORT: 'Value is too short',
  TOO_LONG: 'Value is too long',
  INVALID_TYPE: 'Invalid data type',

  // Quiz-specific messages
  QUIZ_TITLE_REQUIRED: 'Quiz title is required',
  QUIZ_TITLE_TOO_LONG: 'Quiz title must be less than 255 characters',
  QUIZ_DESCRIPTION_TOO_LONG: 'Quiz description must be less than 5000 characters',
  QUIZ_NO_QUESTIONS: 'Quiz must have at least one question',
  QUIZ_TOO_MANY_QUESTIONS: 'Quiz cannot have more than 50 questions',
  QUIZ_INVALID_TIME_LIMIT: 'Time limit must be between 1 and 180 minutes',
  QUIZ_INVALID_ATTEMPTS: 'Attempt limit must be between 1 and 10',
  QUIZ_END_DATE_PAST: 'End date must be in the future',
  QUIZ_PUBLISHED_CANNOT_MODIFY: 'Published quizzes cannot be modified',

  // Question-specific messages
  QUESTION_TEXT_REQUIRED: 'Question text is required',
  QUESTION_TEXT_TOO_LONG: 'Question text must be less than 5000 characters',
  QUESTION_INVALID_TYPE: 'Invalid question type selected',
  QUESTION_NO_OPTIONS: 'Question must have at least 2 options',
  QUESTION_TOO_MANY_OPTIONS: 'Question cannot have more than 6 options',
  QUESTION_NO_CORRECT_ANSWERS: 'Question must have at least one correct answer',
  QUESTION_INVALID_CORRECT_ANSWERS: 'Correct answers do not match question options',
  QUESTION_TRUE_FALSE_MULTIPLE_ANSWERS: 'True/False questions can only have one correct answer',
  QUESTION_MCQ_MULTIPLE_ANSWERS: 'Multiple choice questions can only have one correct answer',
  QUESTION_MULTIPLE_SELECT_NO_ANSWERS: 'Multiple select questions must have at least one correct answer',

  // Material-specific messages
  MATERIAL_TITLE_REQUIRED: 'Material title is required',
  MATERIAL_TITLE_TOO_LONG: 'Material title must be less than 255 characters',
  MATERIAL_DESCRIPTION_TOO_LONG: 'Material description must be less than 5000 characters',
  MATERIAL_INVALID_TYPE: 'Invalid material type selected',
  MATERIAL_NO_CONTENT: 'Material must have at least one content source (URL, embed code, or file)',
  MATERIAL_INVALID_URL: 'Invalid or unsafe URL provided',
  MATERIAL_INVALID_VIDEO_URL: 'Invalid video URL or unsupported platform',
  MATERIAL_UNSAFE_EMBED: 'Embed code contains unsafe elements',
  MATERIAL_INVALID_DURATION: 'Duration must be a positive number',

  // Module-specific messages
  MODULE_TITLE_REQUIRED: 'Module title is required',
  MODULE_TITLE_TOO_LONG: 'Module title must be less than 255 characters',
  MODULE_DESCRIPTION_TOO_LONG: 'Module description must be less than 5000 characters',
  MODULE_CATEGORY_REQUIRED: 'Module category is required',
  MODULE_CATEGORY_TOO_LONG: 'Module category must be less than 100 characters',
  MODULE_TOO_MANY_MATERIALS: 'Module cannot have more than 20 materials',
  MODULE_NO_MATERIALS_PUBLISHED: 'Cannot publish module without materials',

  // Content validation messages
  CONTENT_INVALID_CHARACTERS: 'Content contains invalid characters or formatting',
  CONTENT_UNSAFE_ELEMENTS: 'Content contains unsafe elements and cannot be saved',
  CONTENT_MULTILINGUAL_INVALID: 'Content must be valid for both Arabic and English languages',

  // Security messages
  SECURITY_MALICIOUS_CONTENT: 'Content appears to contain malicious elements',
  SECURITY_UNSAFE_URL: 'URL failed security validation',
  SECURITY_BLOCKED_DOMAIN: 'Domain is not allowed',
  SECURITY_INVALID_PROTOCOL: 'Only HTTP and HTTPS protocols are allowed'
} as const;

// Enhanced validation context
export interface ValidationContext {
  userId?: string;
  userRole?: string;
  isPublished?: boolean;
  existingData?: any;
  skipSecurityChecks?: boolean;
}

/**
 * Enhanced Quiz Validation Pipeline
 */
export class QuizValidationPipeline {
  /**
   * Validate quiz creation data with comprehensive checks
   */
  static async validateQuizCreation(
    data: any,
    context: ValidationContext = {}
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    try {
      // Basic structure validation
      const structureResult = this.validateQuizStructure(data);
      errors.push(...structureResult.errors);
      warnings.push(...structureResult.warnings);

      if (structureResult.success) {
        // Cross-question validation
        const crossValidationResult = this.validateQuizCrossQuestions(data.questions);
        errors.push(...crossValidationResult.errors);
        warnings.push(...crossValidationResult.warnings);

        // Content security validation
        const securityResult = await this.validateQuizSecurity(data, context);
        errors.push(...securityResult.errors);
        warnings.push(...securityResult.warnings);

        // Business logic validation
        const businessResult = this.validateQuizBusinessLogic(data, context);
        errors.push(...businessResult.errors);
        warnings.push(...businessResult.warnings);

        // Template inheritance validation
        if (data.templateId) {
          const templateResult = await this.validateTemplateInheritance(data, context);
          errors.push(...templateResult.errors);
          warnings.push(...templateResult.warnings);
        }
      }

      return {
        success: errors.length === 0,
        data: errors.length === 0 ? data : undefined,
        errors,
        warnings
      };
    } catch (error) {
      return {
        success: false,
        errors: [{
          field: 'general',
          code: 'VALIDATION_ERROR',
          message: 'An error occurred during validation',
          context: { originalError: error instanceof Error ? error.message : 'Unknown error' }
        }],
        warnings: []
      };
    }
  }

  /**
   * Validate quiz publishing requirements
   */
  static async validateQuizPublishing(
    data: any,
    context: ValidationContext = {}
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    try {
      // Check if quiz has questions
      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        errors.push({
          field: 'questions',
          code: 'QUIZ_NO_QUESTIONS_PUBLISH',
          message: 'Cannot publish quiz without questions. Please add at least one question before publishing.',
          value: data.questions
        });
      }

      // Validate all questions are properly configured
      if (Array.isArray(data.questions)) {
        data.questions.forEach((question: any, index: number) => {
          const questionErrors = this.validateQuestionForPublishing(question, index);
          errors.push(...questionErrors);
        });
      }

      // Check quiz structure completeness for publishing
      const requiredFields = ['title', 'timeLimitMinutes', 'maxAttempts'];
      for (const field of requiredFields) {
        if (!data[field]) {
          errors.push({
            field,
            code: 'REQUIRED_FOR_PUBLISHING',
            message: `${field} is required before publishing the quiz`,
            value: data[field]
          });
        }
      }

      // Validate quiz has proper configuration
      if (data.timeLimitMinutes && data.questions && data.questions.length > 0) {
        const estimatedTime = data.questions.length * 1.5; // 1.5 minutes per question
        if (data.timeLimitMinutes < estimatedTime) {
          warnings.push({
            field: 'timeLimitMinutes',
            code: 'TIME_LIMIT_WARNING',
            message: `Time limit (${data.timeLimitMinutes} minutes) may be insufficient for ${data.questions.length} questions. Consider at least ${Math.ceil(estimatedTime)} minutes.`,
            context: {
              timeLimitMinutes: data.timeLimitMinutes,
              questionCount: data.questions.length,
              recommendedMinimum: Math.ceil(estimatedTime)
            }
          });
        }
      }

      return {
        success: errors.length === 0,
        data: errors.length === 0 ? data : undefined,
        errors,
        warnings
      };
    } catch (error) {
      return {
        success: false,
        errors: [{
          field: 'general',
          code: 'VALIDATION_ERROR',
          message: 'An error occurred during publishing validation',
          context: { originalError: error instanceof Error ? error.message : 'Unknown error' }
        }],
        warnings: []
      };
    }
  }

  /**
   * Validate basic quiz structure
   */
  private static validateQuizStructure(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Title validation
    if (!data.title || typeof data.title !== 'string') {
      errors.push({
        field: 'title',
        code: 'QUIZ_TITLE_REQUIRED',
        message: VALIDATION_MESSAGES.QUIZ_TITLE_REQUIRED,
        value: data.title
      });
    } else if (data.title.length > 255) {
      errors.push({
        field: 'title',
        code: 'QUIZ_TITLE_TOO_LONG',
        message: VALIDATION_MESSAGES.QUIZ_TITLE_TOO_LONG,
        value: data.title,
        context: { maxLength: 255, actualLength: data.title.length }
      });
    } else if (!validateMultilingualContent(data.title)) {
      errors.push({
        field: 'title',
        code: 'CONTENT_INVALID_CHARACTERS',
        message: VALIDATION_MESSAGES.CONTENT_INVALID_CHARACTERS,
        value: data.title
      });
    }

    // Description validation
    if (data.description && typeof data.description === 'string') {
      if (data.description.length > 5000) {
        errors.push({
          field: 'description',
          code: 'QUIZ_DESCRIPTION_TOO_LONG',
          message: VALIDATION_MESSAGES.QUIZ_DESCRIPTION_TOO_LONG,
          value: data.description,
          context: { maxLength: 5000, actualLength: data.description.length }
        });
      } else if (!validateMultilingualContent(data.description)) {
        errors.push({
          field: 'description',
          code: 'CONTENT_INVALID_CHARACTERS',
          message: VALIDATION_MESSAGES.CONTENT_INVALID_CHARACTERS,
          value: data.description
        });
      }
    }

    // Time limit validation
    if (typeof data.timeLimitMinutes !== 'number' ||
      data.timeLimitMinutes < 1 ||
      data.timeLimitMinutes > 180) {
      errors.push({
        field: 'timeLimitMinutes',
        code: 'QUIZ_INVALID_TIME_LIMIT',
        message: VALIDATION_MESSAGES.QUIZ_INVALID_TIME_LIMIT,
        value: data.timeLimitMinutes,
        context: { min: 1, max: 180 }
      });
    }

    // Attempt limit validation
    if (typeof data.maxAttempts !== 'number' ||
      data.maxAttempts < 1 ||
      data.maxAttempts > 10) {
      errors.push({
        field: 'maxAttempts',
        code: 'QUIZ_INVALID_ATTEMPTS',
        message: VALIDATION_MESSAGES.QUIZ_INVALID_ATTEMPTS,
        value: data.maxAttempts,
        context: { min: 1, max: 10 }
      });
    }

    // Questions validation
    if (!Array.isArray(data.questions) || data.questions.length === 0) {
      errors.push({
        field: 'questions',
        code: 'QUIZ_NO_QUESTIONS',
        message: VALIDATION_MESSAGES.QUIZ_NO_QUESTIONS,
        value: data.questions
      });
    } else if (data.questions.length > 50) {
      errors.push({
        field: 'questions',
        code: 'QUIZ_TOO_MANY_QUESTIONS',
        message: VALIDATION_MESSAGES.QUIZ_TOO_MANY_QUESTIONS,
        value: data.questions,
        context: { maxQuestions: 50, actualCount: data.questions.length }
      });
    }

    // End date validation
    if (data.endDate) {
      const endDate = new Date(data.endDate);
      if (isNaN(endDate.getTime())) {
        errors.push({
          field: 'endDate',
          code: 'INVALID_FORMAT',
          message: 'Invalid date format',
          value: data.endDate
        });
      } else if (endDate <= new Date()) {
        errors.push({
          field: 'endDate',
          code: 'QUIZ_END_DATE_PAST',
          message: VALIDATION_MESSAGES.QUIZ_END_DATE_PAST,
          value: data.endDate
        });
      }
    }

    return { success: errors.length === 0, errors, warnings };
  }

  /**
   * Validate cross-question consistency
   */
  private static validateQuizCrossQuestions(questions: any[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!Array.isArray(questions)) {
      return { success: true, errors, warnings };
    }

    // Check for duplicate question texts
    const questionTexts = new Set<string>();
    const duplicateIndices: number[] = [];

    questions.forEach((question, index) => {
      if (question.questionData?.question) {
        const normalizedText = question.questionData.question.toLowerCase().trim();
        if (questionTexts.has(normalizedText)) {
          duplicateIndices.push(index);
        } else {
          questionTexts.add(normalizedText);
        }
      }
    });

    if (duplicateIndices.length > 0) {
      warnings.push({
        field: 'questions',
        code: 'DUPLICATE_QUESTIONS',
        message: 'Some questions have identical or very similar text',
        context: { duplicateIndices }
      });
    }

    // Validate individual questions
    questions.forEach((question, index) => {
      const questionErrors = this.validateSingleQuestion(question, index);
      errors.push(...questionErrors);
    });

    // Check question order consistency
    const orderIndices = questions.map(q => q.orderIndex).filter(idx => typeof idx === 'number');
    const uniqueIndices = new Set(orderIndices);

    if (orderIndices.length !== uniqueIndices.size) {
      errors.push({
        field: 'questions',
        code: 'DUPLICATE_ORDER_INDICES',
        message: 'Questions have duplicate order indices',
        context: { orderIndices }
      });
    }

    return { success: errors.length === 0, errors, warnings };
  }

  /**
   * Validate a single question
   */
  private static validateSingleQuestion(question: any, index: number): ValidationError[] {
    const errors: ValidationError[] = [];
    const fieldPrefix = `questions[${index}]`;

    // Question type validation
    const validTypes = ['mcq', 'true_false', 'multiple_select'];
    if (!validTypes.includes(question.questionType)) {
      errors.push({
        field: `${fieldPrefix}.questionType`,
        code: 'QUESTION_INVALID_TYPE',
        message: VALIDATION_MESSAGES.QUESTION_INVALID_TYPE,
        value: question.questionType,
        context: { validTypes }
      });
      return errors; // Can't validate further without valid type
    }

    // Question text validation
    if (!question.questionData?.question) {
      errors.push({
        field: `${fieldPrefix}.questionData.question`,
        code: 'QUESTION_TEXT_REQUIRED',
        message: VALIDATION_MESSAGES.QUESTION_TEXT_REQUIRED
      });
    } else {
      if (question.questionData.question.length > 5000) {
        errors.push({
          field: `${fieldPrefix}.questionData.question`,
          code: 'QUESTION_TEXT_TOO_LONG',
          message: VALIDATION_MESSAGES.QUESTION_TEXT_TOO_LONG,
          value: question.questionData.question,
          context: { maxLength: 5000, actualLength: question.questionData.question.length }
        });
      }

      if (!validateMultilingualContent(question.questionData.question)) {
        errors.push({
          field: `${fieldPrefix}.questionData.question`,
          code: 'CONTENT_INVALID_CHARACTERS',
          message: VALIDATION_MESSAGES.CONTENT_INVALID_CHARACTERS,
          value: question.questionData.question
        });
      }
    }

    // Type-specific validation
    switch (question.questionType) {
      case 'true_false':
        errors.push(...this.validateTrueFalseQuestion(question, fieldPrefix));
        break;
      case 'mcq':
        errors.push(...this.validateMCQQuestion(question, fieldPrefix));
        break;
      case 'multiple_select':
        errors.push(...this.validateMultipleSelectQuestion(question, fieldPrefix));
        break;
    }

    return errors;
  }

  /**
   * Validate True/False question
   */
  private static validateTrueFalseQuestion(question: any, fieldPrefix: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // True/False questions shouldn't have options
    if (question.questionData.options && question.questionData.options.length > 0) {
      errors.push({
        field: `${fieldPrefix}.questionData.options`,
        code: 'TRUE_FALSE_NO_OPTIONS',
        message: 'True/False questions should not have custom options',
        value: question.questionData.options
      });
    }

    // Correct answers validation
    if (!Array.isArray(question.correctAnswers) || question.correctAnswers.length !== 1) {
      errors.push({
        field: `${fieldPrefix}.correctAnswers`,
        code: 'QUESTION_TRUE_FALSE_MULTIPLE_ANSWERS',
        message: VALIDATION_MESSAGES.QUESTION_TRUE_FALSE_MULTIPLE_ANSWERS,
        value: question.correctAnswers
      });
    } else if (!['true', 'false'].includes(question.correctAnswers[0]?.toLowerCase())) {
      errors.push({
        field: `${fieldPrefix}.correctAnswers`,
        code: 'INVALID_TRUE_FALSE_ANSWER',
        message: 'True/False answer must be "true" or "false"',
        value: question.correctAnswers[0]
      });
    }

    return errors;
  }

  /**
   * Validate Multiple Choice Question
   */
  private static validateMCQQuestion(question: any, fieldPrefix: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // Options validation
    if (!Array.isArray(question.questionData.options) || question.questionData.options.length < 2) {
      errors.push({
        field: `${fieldPrefix}.questionData.options`,
        code: 'QUESTION_NO_OPTIONS',
        message: VALIDATION_MESSAGES.QUESTION_NO_OPTIONS,
        value: question.questionData.options
      });
    } else if (question.questionData.options.length > 6) {
      errors.push({
        field: `${fieldPrefix}.questionData.options`,
        code: 'QUESTION_TOO_MANY_OPTIONS',
        message: VALIDATION_MESSAGES.QUESTION_TOO_MANY_OPTIONS,
        value: question.questionData.options,
        context: { maxOptions: 6, actualCount: question.questionData.options.length }
      });
    }

    // Correct answers validation
    if (!Array.isArray(question.correctAnswers) || question.correctAnswers.length !== 1) {
      errors.push({
        field: `${fieldPrefix}.correctAnswers`,
        code: 'QUESTION_MCQ_MULTIPLE_ANSWERS',
        message: VALIDATION_MESSAGES.QUESTION_MCQ_MULTIPLE_ANSWERS,
        value: question.correctAnswers
      });
    } else if (question.questionData.options &&
      !question.questionData.options.includes(question.correctAnswers[0])) {
      errors.push({
        field: `${fieldPrefix}.correctAnswers`,
        code: 'QUESTION_INVALID_CORRECT_ANSWERS',
        message: VALIDATION_MESSAGES.QUESTION_INVALID_CORRECT_ANSWERS,
        value: question.correctAnswers[0],
        context: { availableOptions: question.questionData.options }
      });
    }

    return errors;
  }

  /**
   * Validate Multiple Select Question
   */
  private static validateMultipleSelectQuestion(question: any, fieldPrefix: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // Options validation
    if (!Array.isArray(question.questionData.options) || question.questionData.options.length < 2) {
      errors.push({
        field: `${fieldPrefix}.questionData.options`,
        code: 'QUESTION_NO_OPTIONS',
        message: VALIDATION_MESSAGES.QUESTION_NO_OPTIONS,
        value: question.questionData.options
      });
    } else if (question.questionData.options.length > 6) {
      errors.push({
        field: `${fieldPrefix}.questionData.options`,
        code: 'QUESTION_TOO_MANY_OPTIONS',
        message: VALIDATION_MESSAGES.QUESTION_TOO_MANY_OPTIONS,
        value: question.questionData.options,
        context: { maxOptions: 6, actualCount: question.questionData.options.length }
      });
    }

    // Correct answers validation
    if (!Array.isArray(question.correctAnswers) || question.correctAnswers.length === 0) {
      errors.push({
        field: `${fieldPrefix}.correctAnswers`,
        code: 'QUESTION_MULTIPLE_SELECT_NO_ANSWERS',
        message: VALIDATION_MESSAGES.QUESTION_MULTIPLE_SELECT_NO_ANSWERS,
        value: question.correctAnswers
      });
    } else if (question.questionData.options) {
      const invalidAnswers = question.correctAnswers.filter(
        (answer: string) => !question.questionData.options.includes(answer)
      );
      if (invalidAnswers.length > 0) {
        errors.push({
          field: `${fieldPrefix}.correctAnswers`,
          code: 'QUESTION_INVALID_CORRECT_ANSWERS',
          message: VALIDATION_MESSAGES.QUESTION_INVALID_CORRECT_ANSWERS,
          value: invalidAnswers,
          context: { availableOptions: question.questionData.options }
        });
      }
    }

    return errors;
  }

  /**
   * Validate quiz security aspects
   */
  private static async validateQuizSecurity(
    data: any,
    context: ValidationContext
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (context.skipSecurityChecks) {
      return { success: true, errors, warnings };
    }

    // Content security validation
    const contentFields = [
      { field: 'title', value: data.title },
      { field: 'description', value: data.description }
    ];

    for (const { field, value } of contentFields) {
      if (value && typeof value === 'string') {
        if (this.containsMaliciousContent(value)) {
          errors.push({
            field,
            code: 'SECURITY_MALICIOUS_CONTENT',
            message: VALIDATION_MESSAGES.SECURITY_MALICIOUS_CONTENT,
            value: value.substring(0, 100) // Only log first 100 chars for security
          });
        }
      }
    }

    // Question content security
    if (Array.isArray(data.questions)) {
      data.questions.forEach((question: any, index: number) => {
        if (question.questionData?.question &&
          this.containsMaliciousContent(question.questionData.question)) {
          errors.push({
            field: `questions[${index}].questionData.question`,
            code: 'SECURITY_MALICIOUS_CONTENT',
            message: VALIDATION_MESSAGES.SECURITY_MALICIOUS_CONTENT
          });
        }

        if (Array.isArray(question.questionData?.options)) {
          question.questionData.options.forEach((option: string, optionIndex: number) => {
            if (this.containsMaliciousContent(option)) {
              errors.push({
                field: `questions[${index}].questionData.options[${optionIndex}]`,
                code: 'SECURITY_MALICIOUS_CONTENT',
                message: VALIDATION_MESSAGES.SECURITY_MALICIOUS_CONTENT
              });
            }
          });
        }
      });
    }

    return { success: errors.length === 0, errors, warnings };
  }

  /**
   * Validate quiz business logic
   */
  private static validateQuizBusinessLogic(
    data: any,
    context: ValidationContext
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Check if trying to modify published quiz
    if (context.isPublished && context.existingData) {
      const restrictedFields = ['questions', 'timeLimitMinutes', 'maxAttempts'];
      for (const field of restrictedFields) {
        if (data[field] !== undefined &&
          JSON.stringify(data[field]) !== JSON.stringify(context.existingData[field])) {
          errors.push({
            field,
            code: 'QUIZ_PUBLISHED_CANNOT_MODIFY',
            message: VALIDATION_MESSAGES.QUIZ_PUBLISHED_CANNOT_MODIFY,
            context: { field }
          });
        }
      }
    }

    // Warn about very short time limits
    if (data.timeLimitMinutes && data.timeLimitMinutes < 5 &&
      Array.isArray(data.questions) && data.questions.length > 5) {
      warnings.push({
        field: 'timeLimitMinutes',
        code: 'SHORT_TIME_LIMIT',
        message: 'Time limit may be too short for the number of questions',
        context: {
          timeLimitMinutes: data.timeLimitMinutes,
          questionCount: data.questions.length,
          recommendedMinimum: Math.ceil(data.questions.length * 1.5)
        }
      });
    }

    return { success: errors.length === 0, errors, warnings };
  }

  /**
   * Validate template inheritance configuration
   */
  private static async validateTemplateInheritance(
    data: any,
    context: ValidationContext
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!data.templateId) {
      return { success: true, errors, warnings };
    }

    // Validate template ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(data.templateId)) {
      errors.push({
        field: 'templateId',
        code: 'INVALID_TEMPLATE_ID',
        message: 'Invalid template ID format',
        value: data.templateId
      });
      return { success: false, errors, warnings };
    }

    // Check if template configuration is properly inherited
    if (data.templateId && !data.timeLimitMinutes) {
      warnings.push({
        field: 'timeLimitMinutes',
        code: 'TEMPLATE_CONFIG_MISSING',
        message: 'Time limit should be inherited from template or explicitly set',
        context: { templateId: data.templateId }
      });
    }

    if (data.templateId && !data.maxAttempts) {
      warnings.push({
        field: 'maxAttempts',
        code: 'TEMPLATE_CONFIG_MISSING',
        message: 'Max attempts should be inherited from template or explicitly set',
        context: { templateId: data.templateId }
      });
    }

    return { success: errors.length === 0, errors, warnings };
  }

  /**
   * Validate individual question for publishing
   */
  private static validateQuestionForPublishing(question: any, index: number): ValidationError[] {
    const errors: ValidationError[] = [];
    const fieldPrefix = `questions[${index}]`;

    // Ensure question has all required fields for publishing
    if (!question.questionData?.question) {
      errors.push({
        field: `${fieldPrefix}.questionData.question`,
        code: 'QUESTION_TEXT_REQUIRED_PUBLISH',
        message: `Question ${index + 1} must have question text before publishing`,
        context: { questionIndex: index }
      });
    }

    if (!question.questionType) {
      errors.push({
        field: `${fieldPrefix}.questionType`,
        code: 'QUESTION_TYPE_REQUIRED_PUBLISH',
        message: `Question ${index + 1} must have a question type before publishing`,
        context: { questionIndex: index }
      });
    }

    if (!Array.isArray(question.correctAnswers) || question.correctAnswers.length === 0) {
      errors.push({
        field: `${fieldPrefix}.correctAnswers`,
        code: 'QUESTION_ANSWERS_REQUIRED_PUBLISH',
        message: `Question ${index + 1} must have correct answers before publishing`,
        context: { questionIndex: index }
      });
    }

    // Type-specific publishing validation
    if (question.questionType === 'mcq' || question.questionType === 'multiple_select') {
      if (!Array.isArray(question.questionData?.options) || question.questionData.options.length < 2) {
        errors.push({
          field: `${fieldPrefix}.questionData.options`,
          code: 'QUESTION_OPTIONS_REQUIRED_PUBLISH',
          message: `Question ${index + 1} must have at least 2 options before publishing`,
          context: { questionIndex: index, questionType: question.questionType }
        });
      }
    }

    return errors;
  }

  /**
   * Check for malicious content patterns
   */
  private static containsMaliciousContent(content: string): boolean {
    const maliciousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /data:text\/html/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi, // Event handlers like onclick, onload, etc.
      /<iframe[^>]*src\s*=\s*["']?(?!https?:\/\/)/gi, // Non-HTTP iframe sources
      /eval\s*\(/gi,
      /document\.write/gi,
      /window\.location/gi
    ];

    return maliciousPatterns.some(pattern => pattern.test(content));
  }
}

/**
 * Enhanced Material Validation Pipeline
 */
export class MaterialValidationPipeline {
  /**
   * Validate material creation with security checks
   */
  static async validateMaterialCreation(
    data: any,
    context: ValidationContext = {}
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    try {
      // Basic structure validation
      const structureResult = this.validateMaterialStructure(data);
      errors.push(...structureResult.errors);
      warnings.push(...structureResult.warnings);

      if (structureResult.success) {
        // URL and content security validation
        const securityResult = await this.validateMaterialSecurity(data, context);
        errors.push(...securityResult.errors);
        warnings.push(...securityResult.warnings);

        // Domain whitelisting validation
        const domainResult = await this.validateDomainWhitelist(data);
        errors.push(...domainResult.errors);
        warnings.push(...domainResult.warnings);
      }

      return {
        success: errors.length === 0,
        data: errors.length === 0 ? data : undefined,
        errors,
        warnings
      };
    } catch (error) {
      return {
        success: false,
        errors: [{
          field: 'general',
          code: 'VALIDATION_ERROR',
          message: 'An error occurred during material validation',
          context: { originalError: error instanceof Error ? error.message : 'Unknown error' }
        }],
        warnings: []
      };
    }
  }

  /**
   * Validate basic material structure
   */
  private static validateMaterialStructure(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Title validation
    if (!data.title || typeof data.title !== 'string') {
      errors.push({
        field: 'title',
        code: 'MATERIAL_TITLE_REQUIRED',
        message: VALIDATION_MESSAGES.MATERIAL_TITLE_REQUIRED,
        value: data.title
      });
    } else if (data.title.length > 255) {
      errors.push({
        field: 'title',
        code: 'MATERIAL_TITLE_TOO_LONG',
        message: VALIDATION_MESSAGES.MATERIAL_TITLE_TOO_LONG,
        value: data.title,
        context: { maxLength: 255, actualLength: data.title.length }
      });
    }

    // Material type validation
    const validTypes = ['link', 'video', 'document'];
    if (!validTypes.includes(data.materialType)) {
      errors.push({
        field: 'materialType',
        code: 'MATERIAL_INVALID_TYPE',
        message: VALIDATION_MESSAGES.MATERIAL_INVALID_TYPE,
        value: data.materialType,
        context: { validTypes }
      });
    }

    // Content source validation
    const hasUrl = data.materialData?.url;
    const hasEmbedCode = data.materialData?.embedCode;
    const hasFileUrl = data.materialData?.fileUrl;

    if (!hasUrl && !hasEmbedCode && !hasFileUrl) {
      errors.push({
        field: 'materialData',
        code: 'MATERIAL_NO_CONTENT',
        message: VALIDATION_MESSAGES.MATERIAL_NO_CONTENT
      });
    }

    return { success: errors.length === 0, errors, warnings };
  }

  /**
   * Validate material security
   */
  private static async validateMaterialSecurity(
    data: any,
    context: ValidationContext
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (context.skipSecurityChecks) {
      return { success: true, errors, warnings };
    }

    // URL validation
    if (data.materialData?.url) {
      if (!isValidUrl(data.materialData.url)) {
        errors.push({
          field: 'materialData.url',
          code: 'MATERIAL_INVALID_URL',
          message: VALIDATION_MESSAGES.MATERIAL_INVALID_URL,
          value: data.materialData.url
        });
      }

      // Video URL specific validation
      if (data.materialType === 'video') {
        const videoValidation = validateVideoUrl(data.materialData.url);
        if (!videoValidation.isValid) {
          errors.push({
            field: 'materialData.url',
            code: 'MATERIAL_INVALID_VIDEO_URL',
            message: VALIDATION_MESSAGES.MATERIAL_INVALID_VIDEO_URL,
            value: data.materialData.url
          });
        }
      }
    }

    // Embed code validation
    if (data.materialData?.embedCode) {
      if (!validateEmbedCode(data.materialData.embedCode)) {
        errors.push({
          field: 'materialData.embedCode',
          code: 'MATERIAL_UNSAFE_EMBED',
          message: VALIDATION_MESSAGES.MATERIAL_UNSAFE_EMBED,
          value: data.materialData.embedCode.substring(0, 100)
        });
      }
    }

    return { success: errors.length === 0, errors, warnings };
  }

  /**
   * Validate domain whitelist
   */
  private static async validateDomainWhitelist(data: any): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Define allowed domains (this could be configurable)
    const allowedDomains = [
      'youtube.com',
      'youtu.be',
      'vimeo.com',
      'docs.google.com',
      'drive.google.com',
      'dropbox.com',
      'onedrive.live.com',
      // Add more trusted domains as needed
    ];

    const urls = [
      data.materialData?.url,
      data.materialData?.fileUrl
    ].filter(Boolean);

    for (const url of urls) {
      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.toLowerCase();

        const isAllowed = allowedDomains.some(allowedDomain =>
          domain === allowedDomain || domain.endsWith(`.${allowedDomain}`)
        );

        if (!isAllowed) {
          warnings.push({
            field: 'materialData.url',
            code: 'DOMAIN_NOT_WHITELISTED',
            message: `Domain "${domain}" is not in the approved list. Please verify this is a trusted source.`,
            value: url,
            context: { domain, allowedDomains }
          });
        }
      } catch {
        // URL parsing error already handled in security validation
      }
    }

    return { success: errors.length === 0, errors, warnings };
  }
}

/**
 * Validation Pipeline Factory
 */
export class ValidationPipelineFactory {
  /**
   * Create appropriate validation pipeline based on data type
   */
  static createPipeline(dataType: 'quiz' | 'material' | 'module'): any {
    switch (dataType) {
      case 'quiz':
        return QuizValidationPipeline;
      case 'material':
        return MaterialValidationPipeline;
      default:
        throw new AwarenessLabError(
          AwarenessLabErrorCode.INVALID_QUIZ_ANSWERS,
          `Unsupported validation pipeline type: ${dataType}`
        );
    }
  }

  /**
   * Validate data with appropriate pipeline
   */
  static async validate(
    dataType: 'quiz' | 'material' | 'module',
    data: any,
    context: ValidationContext = {}
  ): Promise<ValidationResult> {
    const pipeline = this.createPipeline(dataType);

    switch (dataType) {
      case 'quiz':
        return pipeline.validateQuizCreation(data, context);
      case 'material':
        return pipeline.validateMaterialCreation(data, context);
      default:
        throw new AwarenessLabError(
          AwarenessLabErrorCode.INVALID_QUIZ_ANSWERS,
          `Unsupported validation type: ${dataType}`
        );
    }
  }
}
