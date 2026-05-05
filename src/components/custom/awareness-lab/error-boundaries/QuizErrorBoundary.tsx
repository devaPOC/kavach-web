/**
 * Quiz-specific Error Boundary
 * Handles quiz-related errors with specific recovery actions
 */

import React, { ReactNode } from 'react';
import { BaseErrorBoundary } from './BaseErrorBoundary';
import { AwarenessLabError, AwarenessLabErrorCode } from '@/lib/errors/awareness-lab-errors';
import { ErrorRecoveryAction } from './types';
import { createErrorContext } from './utils';

interface QuizErrorBoundaryProps {
  children: ReactNode;
  quizId?: string;
  attemptId?: string;
  fallback?: ReactNode;
  onError?: (error: AwarenessLabError, errorInfo: any) => void;
  onQuizReset?: () => void;
  onReturnToQuizList?: () => void;
  maxRetries?: number;
}

export const QuizErrorBoundary: React.FC<QuizErrorBoundaryProps> = ({
  children,
  quizId,
  attemptId,
  fallback,
  onError,
  onQuizReset,
  onReturnToQuizList,
  maxRetries = 3
}) => {
  const handleError = (error: AwarenessLabError, errorInfo: any) => {
    // Create quiz-specific error context
    const context = createErrorContext('QuizErrorBoundary', {
      quizId,
      attemptId,
      errorInfo,
      quizContext: {
        currentQuestion: getCurrentQuestionIndex(),
        totalQuestions: getTotalQuestions(),
        timeRemaining: getTimeRemaining(),
        answersProvided: getAnswersCount()
      }
    });

    // Log quiz-specific error
    console.error('Quiz Error Boundary caught error:', {
      error: {
        code: error.code,
        message: error.message,
        quizId,
        attemptId
      },
      context
    });

    // Handle specific quiz error scenarios
    handleQuizErrorScenario(error, context);

    // Call parent error handler
    onError?.(error, { ...errorInfo, context });
  };

  const handleQuizErrorScenario = (error: AwarenessLabError, context: any) => {
    switch (error.code) {
      case AwarenessLabErrorCode.QUIZ_TIME_EXPIRED:
        // Auto-submit quiz if time expired
        autoSubmitQuiz();
        break;
      
      case AwarenessLabErrorCode.QUIZ_NOT_FOUND:
      case AwarenessLabErrorCode.QUIZ_NOT_PUBLISHED:
        // Redirect to quiz list
        setTimeout(() => {
          onReturnToQuizList?.();
        }, 3000);
        break;
      
      case AwarenessLabErrorCode.ATTEMPT_LIMIT_EXCEEDED:
        // Show results or redirect to quiz list
        setTimeout(() => {
          onReturnToQuizList?.();
        }, 5000);
        break;
      
      default:
        // Default handling
        break;
    }
  };

  const getQuizSpecificRecoveryActions = (error: AwarenessLabError): ErrorRecoveryAction[] => {
    const actions: ErrorRecoveryAction[] = [];

    switch (error.code) {
      case AwarenessLabErrorCode.QUIZ_NOT_FOUND:
      case AwarenessLabErrorCode.QUIZ_NOT_PUBLISHED:
        actions.push({
          type: 'redirect',
          label: 'Back to Quiz List',
          action: () => onReturnToQuizList?.()
        });
        break;
      
      case AwarenessLabErrorCode.QUIZ_TIME_EXPIRED:
        actions.push({
          type: 'redirect',
          label: 'View Results',
          action: () => redirectToResults()
        });
        break;
      
      case AwarenessLabErrorCode.INVALID_QUIZ_ANSWERS:
        actions.push({
          type: 'retry',
          label: 'Fix Answers',
          action: () => scrollToFirstError()
        });
        break;
      
      case AwarenessLabErrorCode.QUIZ_ALREADY_STARTED:
        actions.push({
          type: 'redirect',
          label: 'Continue Quiz',
          action: () => redirectToContinueQuiz()
        });
        break;
      
      default:
        if (onQuizReset) {
          actions.push({
            type: 'reset',
            label: 'Restart Quiz',
            action: onQuizReset
          });
        }
        break;
    }

    return actions;
  };

  // Helper functions for quiz context
  const getCurrentQuestionIndex = (): number => {
    // Implementation depends on your quiz state management
    // This is a placeholder
    return 0;
  };

  const getTotalQuestions = (): number => {
    // Implementation depends on your quiz state management
    // This is a placeholder
    return 0;
  };

  const getTimeRemaining = (): number => {
    // Implementation depends on your quiz timer
    // This is a placeholder
    return 0;
  };

  const getAnswersCount = (): number => {
    // Implementation depends on your quiz state management
    // This is a placeholder
    return 0;
  };

  const autoSubmitQuiz = () => {
    // Implementation for auto-submitting quiz when time expires
    console.log('Auto-submitting quiz due to time expiration');
    // You would call your quiz submission logic here
  };

  const redirectToResults = () => {
    // Implementation for redirecting to quiz results
    if (quizId && attemptId) {
      window.location.href = `/quiz/${quizId}/results/${attemptId}`;
    }
  };

  const redirectToContinueQuiz = () => {
    // Implementation for redirecting to continue quiz
    if (quizId) {
      window.location.href = `/quiz/${quizId}/continue`;
    }
  };

  const scrollToFirstError = () => {
    // Implementation for scrolling to first validation error
    const firstError = document.querySelector('[data-error="true"]');
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <BaseErrorBoundary
      errorType="quiz"
      contextName="QuizErrorBoundary"
      fallback={fallback}
      onError={handleError}
      maxRetries={maxRetries}
      resetKeys={[quizId, attemptId].filter((key): key is string => key !== undefined)}
      resetOnPropsChange={true}
    >
      {children}
    </BaseErrorBoundary>
  );
};