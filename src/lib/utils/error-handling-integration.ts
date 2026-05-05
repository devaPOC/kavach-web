/**
 * Error Handling Integration
 * Combines retry mechanisms, session recovery, and error reporting
 */

import { AwarenessLabError, AwarenessLabErrorCode } from '@/lib/errors/awareness-lab-errors';
import { RetryMechanism, RetryConfig, RetryResult } from './retry-mechanism';
import { 
  QuizSessionRecovery, 
  LearningSessionRecovery, 
  AutoSaveManager,
  RecoveryResult 
} from './session-recovery';
import { 
  ErrorReportingService, 
  reportError, 
  addBreadcrumb,
  ErrorReportingConfig 
} from './error-reporting';

// Integrated error handling configuration
export interface IntegratedErrorHandlingConfig {
  retry: Partial<RetryConfig>;
  reporting: Partial<ErrorReportingConfig>;
  autoSave: {
    enabled: boolean;
    intervalMs: number;
  };
  recovery: {
    enabled: boolean;
    maxRecoveryAttempts: number;
  };
}

// Default integrated configuration
const DEFAULT_INTEGRATED_CONFIG: IntegratedErrorHandlingConfig = {
  retry: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitterFactor: 0.1
  },
  reporting: {
    enabled: process.env.NODE_ENV === 'production',
    maxBreadcrumbs: 50,
    sampleRate: 1.0
  },
  autoSave: {
    enabled: true,
    intervalMs: 30000 // 30 seconds
  },
  recovery: {
    enabled: true,
    maxRecoveryAttempts: 3
  }
};

/**
 * Integrated Error Handler
 * Provides comprehensive error handling with retry, recovery, and reporting
 */
export class IntegratedErrorHandler {
  private retryMechanism: RetryMechanism;
  private errorReporting: ErrorReportingService;
  private autoSaveManager: AutoSaveManager;
  private config: IntegratedErrorHandlingConfig;

  constructor(config: Partial<IntegratedErrorHandlingConfig> = {}) {
    this.config = this.mergeConfig(config);
    
    // Initialize components
    this.retryMechanism = new RetryMechanism({
      ...this.config.retry,
      onRetry: this.handleRetryAttempt.bind(this),
      onMaxAttemptsReached: this.handleMaxRetriesReached.bind(this)
    });
    
    this.errorReporting = ErrorReportingService.getInstance(this.config.reporting);
    this.autoSaveManager = new AutoSaveManager(this.config.autoSave.intervalMs);
  }

  /**
   * Execute operation with comprehensive error handling
   */
  async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: {
      operationName: string;
      userId?: string;
      sessionId?: string;
      sessionType?: 'quiz' | 'learning';
      tags?: Record<string, string>;
    }
  ): Promise<T> {
    const { operationName, userId, sessionId, sessionType, tags = {} } = context;

    // Add breadcrumb for operation start
    addBreadcrumb('operation', `Starting ${operationName}`, 'info', {
      userId,
      sessionId,
      sessionType
    });

    try {
      // Execute with retry mechanism
      const result = await this.retryMechanism.execute(operation, operationName);
      
      if (!result.success) {
        // Handle final failure
        await this.handleFinalFailure(result.error!, context);
        throw result.error;
      }

      // Add success breadcrumb
      addBreadcrumb('operation', `Completed ${operationName}`, 'info', {
        attempts: result.attempts,
        totalTime: result.totalTime
      });

      return result.data!;

    } catch (error) {
      // This catch handles non-retryable errors or errors from handleFinalFailure
      const awarenessError = this.normalizeError(error);
      
      // Report error with context
      await this.errorReporting.reportError(awarenessError, {
        userId,
        sessionId
      }, {
        ...tags,
        operationName,
        sessionType: sessionType || 'unknown'
      });

      throw awarenessError;
    }
  }

  /**
   * Execute quiz operation with session recovery
   */
  async executeQuizOperation<T>(
    operation: () => Promise<T>,
    context: {
      operationName: string;
      userId: string;
      sessionId: string;
      quizId: string;
      attemptId: string;
      getSessionData?: () => any;
      tags?: Record<string, string>;
    }
  ): Promise<T> {
    const { operationName, userId, sessionId, quizId, attemptId, getSessionData, tags = {} } = context;

    // Start auto-save if session data provider is available
    if (this.config.autoSave.enabled && getSessionData) {
      this.autoSaveManager.startAutoSave('quiz', sessionId, userId, getSessionData);
    }

    try {
      const result = await this.executeWithErrorHandling(operation, {
        operationName,
        userId,
        sessionId,
        sessionType: 'quiz',
        tags: {
          ...tags,
          quizId,
          attemptId
        }
      });

      return result;

    } catch (error) {
      // Attempt session recovery on failure
      if (this.config.recovery.enabled) {
        await this.attemptQuizRecovery(sessionId, userId, error as AwarenessLabError);
      }

      throw error;

    } finally {
      // Stop auto-save
      this.autoSaveManager.stopAutoSave();
    }
  }

  /**
   * Execute learning operation with session recovery
   */
  async executeLearningOperation<T>(
    operation: () => Promise<T>,
    context: {
      operationName: string;
      userId: string;
      sessionId: string;
      moduleId: string;
      getSessionData?: () => any;
      tags?: Record<string, string>;
    }
  ): Promise<T> {
    const { operationName, userId, sessionId, moduleId, getSessionData, tags = {} } = context;

    // Start auto-save if session data provider is available
    if (this.config.autoSave.enabled && getSessionData) {
      this.autoSaveManager.startAutoSave('learning', sessionId, userId, getSessionData);
    }

    try {
      const result = await this.executeWithErrorHandling(operation, {
        operationName,
        userId,
        sessionId,
        sessionType: 'learning',
        tags: {
          ...tags,
          moduleId
        }
      });

      return result;

    } catch (error) {
      // Attempt session recovery on failure
      if (this.config.recovery.enabled) {
        await this.attemptLearningRecovery(sessionId, userId, error as AwarenessLabError);
      }

      throw error;

    } finally {
      // Stop auto-save
      this.autoSaveManager.stopAutoSave();
    }
  }

  /**
   * Handle retry attempt
   */
  private handleRetryAttempt(attempt: number, error: Error): void {
    addBreadcrumb('retry', `Retry attempt ${attempt}`, 'warning', {
      error: error.message,
      attempt
    });
  }

  /**
   * Handle max retries reached
   */
  private handleMaxRetriesReached(error: Error): void {
    addBreadcrumb('retry', 'Max retries reached', 'error', {
      error: error.message
    });
  }

  /**
   * Handle final failure after all retries
   */
  private async handleFinalFailure(
    error: Error,
    context: {
      operationName: string;
      userId?: string;
      sessionId?: string;
      sessionType?: 'quiz' | 'learning';
    }
  ): Promise<void> {
    const awarenessError = this.normalizeError(error);
    
    addBreadcrumb('error', `Final failure in ${context.operationName}`, 'error', {
      errorCode: awarenessError.code,
      errorMessage: awarenessError.message,
      retryable: awarenessError.retryable
    });

    // Additional handling based on error type
    switch (awarenessError.code) {
      case AwarenessLabErrorCode.QUIZ_TIME_EXPIRED:
        // Auto-submit quiz if time expired
        if (context.sessionType === 'quiz' && context.sessionId) {
          await this.handleQuizTimeExpired(context.sessionId, context.userId!);
        }
        break;
      
      case AwarenessLabErrorCode.PROGRESS_NOT_FOUND:
        // Attempt to recover progress data
        if (context.sessionType === 'learning' && context.sessionId) {
          await this.attemptProgressRecovery(context.sessionId, context.userId!);
        }
        break;
    }
  }

  /**
   * Attempt quiz session recovery
   */
  private async attemptQuizRecovery(
    sessionId: string,
    userId: string,
    error: AwarenessLabError
  ): Promise<void> {
    try {
      const recoveryResult = QuizSessionRecovery.recoverQuizSession(sessionId);
      
      if (recoveryResult.success) {
        addBreadcrumb('recovery', 'Quiz session recovered', 'info', {
          recoveryType: recoveryResult.recoveryType,
          recoveredFields: recoveryResult.recoveredFields,
          lostFields: recoveryResult.lostFields
        });

        // Report successful recovery
        await reportError(
          new AwarenessLabError(
            AwarenessLabErrorCode.PROGRESS_NOT_FOUND,
            'Quiz session recovered after error',
            undefined,
            {
              originalError: error.code,
              recoveryResult
            }
          ),
          { userId, sessionId },
          { 
            type: 'recovery_success',
            originalErrorCode: error.code
          }
        );
      } else {
        addBreadcrumb('recovery', 'Quiz session recovery failed', 'error', {
          error: recoveryResult.error,
          lostFields: recoveryResult.lostFields
        });
      }
    } catch (recoveryError) {
      addBreadcrumb('recovery', 'Quiz recovery attempt failed', 'error', {
        error: recoveryError instanceof Error ? recoveryError.message : 'Unknown error'
      });
    }
  }

  /**
   * Attempt learning session recovery
   */
  private async attemptLearningRecovery(
    sessionId: string,
    userId: string,
    error: AwarenessLabError
  ): Promise<void> {
    try {
      const recoveryResult = LearningSessionRecovery.recoverLearningSession(sessionId);
      
      if (recoveryResult.success) {
        addBreadcrumb('recovery', 'Learning session recovered', 'info', {
          recoveryType: recoveryResult.recoveryType,
          recoveredFields: recoveryResult.recoveredFields
        });

        // Report successful recovery
        await reportError(
          new AwarenessLabError(
            AwarenessLabErrorCode.PROGRESS_NOT_FOUND,
            'Learning session recovered after error',
            undefined,
            {
              originalError: error.code,
              recoveryResult
            }
          ),
          { userId, sessionId },
          { 
            type: 'recovery_success',
            originalErrorCode: error.code
          }
        );
      } else {
        addBreadcrumb('recovery', 'Learning session recovery failed', 'error', {
          error: recoveryResult.error
        });
      }
    } catch (recoveryError) {
      addBreadcrumb('recovery', 'Learning recovery attempt failed', 'error', {
        error: recoveryError instanceof Error ? recoveryError.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle quiz time expiration
   */
  private async handleQuizTimeExpired(sessionId: string, userId: string): Promise<void> {
    try {
      // Attempt to auto-submit quiz with current answers
      const recoveryResult = QuizSessionRecovery.recoverQuizSession(sessionId);
      
      if (recoveryResult.success && recoveryResult.data) {
        addBreadcrumb('auto_submit', 'Auto-submitting expired quiz', 'info', {
          quizId: recoveryResult.data.quizId,
          attemptId: recoveryResult.data.attemptId,
          answersCount: Object.keys(recoveryResult.data.answers).length
        });

        // Here you would call your quiz submission service
        // await quizService.submitQuiz(recoveryResult.data.attemptId, recoveryResult.data.answers);
        
        // Clear the session after submission
        QuizSessionRecovery.clearQuizSession(sessionId);
      }
    } catch (error) {
      addBreadcrumb('auto_submit', 'Auto-submit failed', 'error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Attempt progress recovery
   */
  private async attemptProgressRecovery(sessionId: string, userId: string): Promise<void> {
    try {
      const recoveryResult = LearningSessionRecovery.recoverLearningSession(sessionId);
      
      if (recoveryResult.success && recoveryResult.data) {
        addBreadcrumb('progress_recovery', 'Attempting to restore progress', 'info', {
          moduleId: recoveryResult.data.moduleId,
          progress: recoveryResult.data.progress,
          completedMaterials: recoveryResult.data.completedMaterials.length
        });

        // Here you would call your progress service to restore the data
        // await progressService.restoreProgress(userId, recoveryResult.data);
      }
    } catch (error) {
      addBreadcrumb('progress_recovery', 'Progress recovery failed', 'error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Normalize error to AwarenessLabError
   */
  private normalizeError(error: any): AwarenessLabError {
    if (error instanceof AwarenessLabError) {
      return error;
    }

    if (error instanceof Error) {
      return new AwarenessLabError(
        AwarenessLabErrorCode.INVALID_QUIZ_ANSWERS, // Default error code
        error.message,
        undefined,
        { originalError: error.name, stack: error.stack }
      );
    }

    return new AwarenessLabError(
      AwarenessLabErrorCode.INVALID_QUIZ_ANSWERS,
      String(error),
      undefined,
      { originalError: error }
    );
  }

  /**
   * Merge configuration with defaults
   */
  private mergeConfig(config: Partial<IntegratedErrorHandlingConfig>): IntegratedErrorHandlingConfig {
    return {
      retry: { ...DEFAULT_INTEGRATED_CONFIG.retry, ...config.retry },
      reporting: { ...DEFAULT_INTEGRATED_CONFIG.reporting, ...config.reporting },
      autoSave: { ...DEFAULT_INTEGRATED_CONFIG.autoSave, ...config.autoSave },
      recovery: { ...DEFAULT_INTEGRATED_CONFIG.recovery, ...config.recovery }
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<IntegratedErrorHandlingConfig>): void {
    this.config = this.mergeConfig(newConfig);
    
    // Update component configurations
    this.retryMechanism.updateConfig(this.config.retry);
    this.errorReporting.updateConfig(this.config.reporting);
  }

  /**
   * Get current status
   */
  getStatus(): {
    errorReporting: ReturnType<ErrorReportingService['getSessionStats']>;
    config: IntegratedErrorHandlingConfig;
  } {
    return {
      errorReporting: this.errorReporting.getSessionStats(),
      config: this.config
    };
  }
}

// Singleton instance
let integratedErrorHandler: IntegratedErrorHandler | null = null;

/**
 * Get or create integrated error handler instance
 */
export function getIntegratedErrorHandler(
  config?: Partial<IntegratedErrorHandlingConfig>
): IntegratedErrorHandler {
  if (!integratedErrorHandler) {
    integratedErrorHandler = new IntegratedErrorHandler(config);
  }
  return integratedErrorHandler;
}

/**
 * Initialize integrated error handling system
 */
export function initializeIntegratedErrorHandling(
  config?: Partial<IntegratedErrorHandlingConfig>
): IntegratedErrorHandler {
  integratedErrorHandler = new IntegratedErrorHandler(config);
  return integratedErrorHandler;
}

// Utility functions for common operations

/**
 * Execute quiz operation with full error handling
 */
export async function executeQuizOperationSafely<T>(
  operation: () => Promise<T>,
  context: {
    operationName: string;
    userId: string;
    sessionId: string;
    quizId: string;
    attemptId: string;
    getSessionData?: () => any;
    tags?: Record<string, string>;
  }
): Promise<T> {
  const handler = getIntegratedErrorHandler();
  return handler.executeQuizOperation(operation, context);
}

/**
 * Execute learning operation with full error handling
 */
export async function executeLearningOperationSafely<T>(
  operation: () => Promise<T>,
  context: {
    operationName: string;
    userId: string;
    sessionId: string;
    moduleId: string;
    getSessionData?: () => any;
    tags?: Record<string, string>;
  }
): Promise<T> {
  const handler = getIntegratedErrorHandler();
  return handler.executeLearningOperation(operation, context);
}

/**
 * Execute general operation with error handling
 */
export async function executeOperationSafely<T>(
  operation: () => Promise<T>,
  context: {
    operationName: string;
    userId?: string;
    sessionId?: string;
    sessionType?: 'quiz' | 'learning';
    tags?: Record<string, string>;
  }
): Promise<T> {
  const handler = getIntegratedErrorHandler();
  return handler.executeWithErrorHandling(operation, context);
}