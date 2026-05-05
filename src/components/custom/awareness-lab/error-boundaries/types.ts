/**
 * Types and interfaces for Awareness Lab error boundaries
 */

import { ReactNode } from 'react';
import { AwarenessLabError, AwarenessLabErrorCode } from '@/lib/errors/awareness-lab-errors';

export interface ErrorBoundaryState {
  hasError: boolean;
  error: AwarenessLabError | null;
  errorId: string | null;
  retryCount: number;
  lastErrorTime: Date | null;
}

export interface ErrorRecoveryAction {
  type: 'retry' | 'reset' | 'redirect' | 'fallback';
  label: string;
  action: () => void | Promise<void>;
  disabled?: boolean;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: AwarenessLabError, errorInfo: any) => void;
  maxRetries?: number;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

export interface ErrorDisplayProps {
  error: AwarenessLabError;
  errorId: string;
  retryCount: number;
  maxRetries: number;
  onRetry: () => void;
  onReset: () => void;
  recoveryActions?: ErrorRecoveryAction[];
}

export interface ErrorContextValue {
  reportError: (error: AwarenessLabError) => void;
  clearError: () => void;
  retryLastAction: () => Promise<void>;
  currentError: AwarenessLabError | null;
}

// Error categories for different types of awareness lab errors
export enum AwarenessLabErrorType {
  QUIZ_ERROR = 'quiz',
  MATERIAL_ERROR = 'material',
  PROGRESS_ERROR = 'progress',
  VALIDATION_ERROR = 'validation',
  NETWORK_ERROR = 'network',
  PERMISSION_ERROR = 'permission',
  SYSTEM_ERROR = 'system'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error recovery strategies
export enum RecoveryStrategy {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  REDIRECT = 'redirect',
  RESET = 'reset',
  IGNORE = 'ignore'
}

export interface ErrorClassification {
  type: AwarenessLabErrorType;
  severity: ErrorSeverity;
  recoveryStrategy: RecoveryStrategy;
  userMessage: string;
  technicalMessage: string;
  recoverable: boolean;
  retryable: boolean;
  maxRetries: number;
}

// Error classification mapping
export const ERROR_CLASSIFICATIONS: Record<AwarenessLabErrorCode, ErrorClassification> = {
  // Quiz errors
  [AwarenessLabErrorCode.QUIZ_NOT_FOUND]: {
    type: AwarenessLabErrorType.QUIZ_ERROR,
    severity: ErrorSeverity.MEDIUM,
    recoveryStrategy: RecoveryStrategy.REDIRECT,
    userMessage: 'The quiz you\'re looking for could not be found. You may have been redirected to an outdated link.',
    technicalMessage: 'Quiz resource not found in database',
    recoverable: false,
    retryable: false,
    maxRetries: 0
  },
  [AwarenessLabErrorCode.QUIZ_NOT_PUBLISHED]: {
    type: AwarenessLabErrorType.PERMISSION_ERROR,
    severity: ErrorSeverity.MEDIUM,
    recoveryStrategy: RecoveryStrategy.REDIRECT,
    userMessage: 'This quiz is not currently available. Please check back later or contact your administrator.',
    technicalMessage: 'Quiz is not in published state',
    recoverable: false,
    retryable: false,
    maxRetries: 0
  },
  [AwarenessLabErrorCode.QUIZ_ALREADY_PUBLISHED]: {
    type: AwarenessLabErrorType.VALIDATION_ERROR,
    severity: ErrorSeverity.LOW,
    recoveryStrategy: RecoveryStrategy.FALLBACK,
    userMessage: 'This quiz has already been published and cannot be modified.',
    technicalMessage: 'Attempted to modify published quiz',
    recoverable: true,
    retryable: false,
    maxRetries: 0
  },
  [AwarenessLabErrorCode.ATTEMPT_LIMIT_EXCEEDED]: {
    type: AwarenessLabErrorType.VALIDATION_ERROR,
    severity: ErrorSeverity.MEDIUM,
    recoveryStrategy: RecoveryStrategy.FALLBACK,
    userMessage: 'You have reached the maximum number of attempts for this quiz.',
    technicalMessage: 'Quiz attempt limit exceeded',
    recoverable: false,
    retryable: false,
    maxRetries: 0
  },
  [AwarenessLabErrorCode.QUIZ_TIME_EXPIRED]: {
    type: AwarenessLabErrorType.VALIDATION_ERROR,
    severity: ErrorSeverity.MEDIUM,
    recoveryStrategy: RecoveryStrategy.FALLBACK,
    userMessage: 'The time limit for this quiz has expired. Your current progress has been saved.',
    technicalMessage: 'Quiz time limit exceeded',
    recoverable: false,
    retryable: false,
    maxRetries: 0
  },
  [AwarenessLabErrorCode.QUIZ_ALREADY_STARTED]: {
    type: AwarenessLabErrorType.VALIDATION_ERROR,
    severity: ErrorSeverity.LOW,
    recoveryStrategy: RecoveryStrategy.REDIRECT,
    userMessage: 'You have already started this quiz. You will be redirected to continue where you left off.',
    technicalMessage: 'Quiz attempt already in progress',
    recoverable: true,
    retryable: false,
    maxRetries: 0
  },
  [AwarenessLabErrorCode.QUIZ_NOT_STARTED]: {
    type: AwarenessLabErrorType.VALIDATION_ERROR,
    severity: ErrorSeverity.LOW,
    recoveryStrategy: RecoveryStrategy.REDIRECT,
    userMessage: 'Please start the quiz first before attempting to answer questions.',
    technicalMessage: 'Quiz attempt not initialized',
    recoverable: true,
    retryable: false,
    maxRetries: 0
  },
  [AwarenessLabErrorCode.QUIZ_ALREADY_COMPLETED]: {
    type: AwarenessLabErrorType.VALIDATION_ERROR,
    severity: ErrorSeverity.LOW,
    recoveryStrategy: RecoveryStrategy.REDIRECT,
    userMessage: 'You have already completed this quiz. You can view your results or take another quiz.',
    technicalMessage: 'Quiz attempt already completed',
    recoverable: true,
    retryable: false,
    maxRetries: 0
  },
  [AwarenessLabErrorCode.INVALID_QUIZ_ANSWERS]: {
    type: AwarenessLabErrorType.VALIDATION_ERROR,
    severity: ErrorSeverity.MEDIUM,
    recoveryStrategy: RecoveryStrategy.FALLBACK,
    userMessage: 'Some of your answers are invalid. Please review and correct them before submitting.',
    technicalMessage: 'Quiz answers failed validation',
    recoverable: true,
    retryable: true,
    maxRetries: 3
  },
  
  // Question errors
  [AwarenessLabErrorCode.INVALID_QUESTION_TYPE]: {
    type: AwarenessLabErrorType.QUIZ_ERROR,
    severity: ErrorSeverity.HIGH,
    recoveryStrategy: RecoveryStrategy.FALLBACK,
    userMessage: 'There\'s an issue with this question format. Please skip it and continue, or contact support.',
    technicalMessage: 'Invalid question type configuration',
    recoverable: true,
    retryable: false,
    maxRetries: 0
  },
  [AwarenessLabErrorCode.INVALID_QUESTION_OPTIONS]: {
    type: AwarenessLabErrorType.QUIZ_ERROR,
    severity: ErrorSeverity.HIGH,
    recoveryStrategy: RecoveryStrategy.FALLBACK,
    userMessage: 'This question has invalid options. Please skip it and continue, or contact support.',
    technicalMessage: 'Question options configuration error',
    recoverable: true,
    retryable: false,
    maxRetries: 0
  },
  [AwarenessLabErrorCode.MISSING_CORRECT_ANSWERS]: {
    type: AwarenessLabErrorType.QUIZ_ERROR,
    severity: ErrorSeverity.HIGH,
    recoveryStrategy: RecoveryStrategy.FALLBACK,
    userMessage: 'This question is missing correct answer information. Please skip it and continue.',
    technicalMessage: 'Question missing correct answers',
    recoverable: true,
    retryable: false,
    maxRetries: 0
  },
  [AwarenessLabErrorCode.INVALID_ANSWER_FORMAT]: {
    type: AwarenessLabErrorType.VALIDATION_ERROR,
    severity: ErrorSeverity.MEDIUM,
    recoveryStrategy: RecoveryStrategy.RETRY,
    userMessage: 'Your answer format is invalid. Please check your selection and try again.',
    technicalMessage: 'Answer format validation failed',
    recoverable: true,
    retryable: true,
    maxRetries: 3
  },
  
  // Template errors
  [AwarenessLabErrorCode.TEMPLATE_NOT_FOUND]: {
    type: AwarenessLabErrorType.QUIZ_ERROR,
    severity: ErrorSeverity.MEDIUM,
    recoveryStrategy: RecoveryStrategy.FALLBACK,
    userMessage: 'The quiz template could not be found. Please try creating a new quiz or contact support.',
    technicalMessage: 'Quiz template not found',
    recoverable: true,
    retryable: false,
    maxRetries: 0
  },
  [AwarenessLabErrorCode.TEMPLATE_IN_USE]: {
    type: AwarenessLabErrorType.QUIZ_ERROR,
    severity: ErrorSeverity.LOW,
    recoveryStrategy: RecoveryStrategy.FALLBACK,
    userMessage: 'This template is currently being used and cannot be deleted.',
    technicalMessage: 'Template has active dependencies',
    recoverable: true,
    retryable: false,
    maxRetries: 0
  },
  [AwarenessLabErrorCode.INVALID_TEMPLATE_CONFIG]: {
    type: AwarenessLabErrorType.VALIDATION_ERROR,
    severity: ErrorSeverity.MEDIUM,
    recoveryStrategy: RecoveryStrategy.FALLBACK,
    userMessage: 'The template configuration is invalid. Please check the settings and try again.',
    technicalMessage: 'Template configuration validation failed',
    recoverable: true,
    retryable: true,
    maxRetries: 2
  },
  
  // Learning module errors
  [AwarenessLabErrorCode.MODULE_NOT_FOUND]: {
    type: AwarenessLabErrorType.MATERIAL_ERROR,
    severity: ErrorSeverity.MEDIUM,
    recoveryStrategy: RecoveryStrategy.REDIRECT,
    userMessage: 'The learning module you\'re looking for could not be found.',
    technicalMessage: 'Learning module not found',
    recoverable: false,
    retryable: false,
    maxRetries: 0
  },
  [AwarenessLabErrorCode.MODULE_NOT_PUBLISHED]: {
    type: AwarenessLabErrorType.PERMISSION_ERROR,
    severity: ErrorSeverity.MEDIUM,
    recoveryStrategy: RecoveryStrategy.REDIRECT,
    userMessage: 'This learning module is not currently available. Please check back later.',
    technicalMessage: 'Module not in published state',
    recoverable: false,
    retryable: false,
    maxRetries: 0
  },
  [AwarenessLabErrorCode.INVALID_MATERIAL_TYPE]: {
    type: AwarenessLabErrorType.MATERIAL_ERROR,
    severity: ErrorSeverity.MEDIUM,
    recoveryStrategy: RecoveryStrategy.FALLBACK,
    userMessage: 'This material type is not supported. Please try a different format.',
    technicalMessage: 'Unsupported material type',
    recoverable: true,
    retryable: false,
    maxRetries: 0
  },
  [AwarenessLabErrorCode.INVALID_MATERIAL_URL]: {
    type: AwarenessLabErrorType.MATERIAL_ERROR,
    severity: ErrorSeverity.MEDIUM,
    recoveryStrategy: RecoveryStrategy.FALLBACK,
    userMessage: 'The material link is invalid or unsafe. Please contact your administrator.',
    technicalMessage: 'Material URL failed security validation',
    recoverable: false,
    retryable: false,
    maxRetries: 0
  },
  [AwarenessLabErrorCode.MATERIAL_NOT_FOUND]: {
    type: AwarenessLabErrorType.MATERIAL_ERROR,
    severity: ErrorSeverity.MEDIUM,
    recoveryStrategy: RecoveryStrategy.FALLBACK,
    userMessage: 'The learning material could not be found. It may have been moved or deleted.',
    technicalMessage: 'Material resource not found',
    recoverable: true,
    retryable: true,
    maxRetries: 2
  },
  
  // Content validation errors
  [AwarenessLabErrorCode.INVALID_MULTILINGUAL_CONTENT]: {
    type: AwarenessLabErrorType.VALIDATION_ERROR,
    severity: ErrorSeverity.MEDIUM,
    recoveryStrategy: RecoveryStrategy.FALLBACK,
    userMessage: 'The content contains invalid characters. Please review and correct it.',
    technicalMessage: 'Multilingual content validation failed',
    recoverable: true,
    retryable: true,
    maxRetries: 3
  },
  [AwarenessLabErrorCode.CONTENT_TOO_LONG]: {
    type: AwarenessLabErrorType.VALIDATION_ERROR,
    severity: ErrorSeverity.LOW,
    recoveryStrategy: RecoveryStrategy.FALLBACK,
    userMessage: 'The content is too long. Please shorten it and try again.',
    technicalMessage: 'Content exceeds maximum length',
    recoverable: true,
    retryable: true,
    maxRetries: 3
  },
  [AwarenessLabErrorCode.UNSAFE_CONTENT]: {
    type: AwarenessLabErrorType.VALIDATION_ERROR,
    severity: ErrorSeverity.HIGH,
    recoveryStrategy: RecoveryStrategy.FALLBACK,
    userMessage: 'The content contains unsafe elements and cannot be saved.',
    technicalMessage: 'Content failed security validation',
    recoverable: false,
    retryable: false,
    maxRetries: 0
  },
  [AwarenessLabErrorCode.INVALID_EMBED_CODE]: {
    type: AwarenessLabErrorType.VALIDATION_ERROR,
    severity: ErrorSeverity.HIGH,
    recoveryStrategy: RecoveryStrategy.FALLBACK,
    userMessage: 'The embed code is invalid or contains unsafe elements.',
    technicalMessage: 'Embed code failed security validation',
    recoverable: false,
    retryable: false,
    maxRetries: 0
  },
  
  // Progress tracking errors
  [AwarenessLabErrorCode.PROGRESS_NOT_FOUND]: {
    type: AwarenessLabErrorType.PROGRESS_ERROR,
    severity: ErrorSeverity.MEDIUM,
    recoveryStrategy: RecoveryStrategy.RETRY,
    userMessage: 'Your progress information could not be found. We\'ll try to restore it.',
    technicalMessage: 'Progress record not found',
    recoverable: true,
    retryable: true,
    maxRetries: 3
  },
  [AwarenessLabErrorCode.INVALID_PROGRESS_DATA]: {
    type: AwarenessLabErrorType.PROGRESS_ERROR,
    severity: ErrorSeverity.MEDIUM,
    recoveryStrategy: RecoveryStrategy.RESET,
    userMessage: 'There\'s an issue with your progress data. We\'ll reset it to ensure accuracy.',
    technicalMessage: 'Progress data validation failed',
    recoverable: true,
    retryable: false,
    maxRetries: 0
  },
  
  // Analytics errors
  [AwarenessLabErrorCode.ANALYTICS_DATA_UNAVAILABLE]: {
    type: AwarenessLabErrorType.SYSTEM_ERROR,
    severity: ErrorSeverity.LOW,
    recoveryStrategy: RecoveryStrategy.RETRY,
    userMessage: 'Analytics data is temporarily unavailable. Please try again in a few moments.',
    technicalMessage: 'Analytics service unavailable',
    recoverable: true,
    retryable: true,
    maxRetries: 3
  },
  [AwarenessLabErrorCode.INVALID_ANALYTICS_FILTER]: {
    type: AwarenessLabErrorType.VALIDATION_ERROR,
    severity: ErrorSeverity.LOW,
    recoveryStrategy: RecoveryStrategy.FALLBACK,
    userMessage: 'The analytics filter settings are invalid. Please adjust them and try again.',
    technicalMessage: 'Analytics filter validation failed',
    recoverable: true,
    retryable: true,
    maxRetries: 2
  }
};