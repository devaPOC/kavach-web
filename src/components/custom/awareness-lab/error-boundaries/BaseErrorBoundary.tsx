/**
 * Base Error Boundary component for Awareness Lab
 * Provides comprehensive error handling with recovery mechanisms
 */

import React, { Component, ReactNode } from 'react';
import { AwarenessLabError, AwarenessLabErrorCode } from '@/lib/errors/awareness-lab-errors';
import { 
  ErrorBoundaryState, 
  ErrorBoundaryProps, 
  ErrorRecoveryAction,
  ERROR_CLASSIFICATIONS,
  RecoveryStrategy 
} from './types';
import { ErrorDisplay } from './ErrorDisplay';
import { generateErrorId, logError, shouldRetry } from './utils';

interface BaseErrorBoundaryProps extends ErrorBoundaryProps {
  errorType: string;
  contextName: string;
}

export class BaseErrorBoundary extends Component<BaseErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;
  private lastResetKeys: Array<string | number> = [];

  constructor(props: BaseErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0,
      lastErrorTime: null
    };

    this.lastResetKeys = props.resetKeys || [];
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Convert generic errors to AwarenessLabError if needed
    const awarenessLabError = error instanceof AwarenessLabError 
      ? error 
      : new AwarenessLabError(
          AwarenessLabErrorCode.INVALID_QUIZ_ANSWERS, // Default error code
          error.message,
          undefined,
          { originalError: error.name, stack: error.stack }
        );

    return {
      hasError: true,
      error: awarenessLabError,
      errorId: generateErrorId(),
      lastErrorTime: new Date()
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const awarenessLabError = this.state.error;
    
    if (awarenessLabError) {
      // Log the error with context
      logError(awarenessLabError, {
        ...errorInfo,
        contextName: this.props.contextName,
        errorType: this.props.errorType,
        retryCount: this.state.retryCount
      });

      // Call the onError callback if provided
      this.props.onError?.(awarenessLabError, errorInfo);
    }
  }

  componentDidUpdate(prevProps: BaseErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error state if resetKeys have changed
    if (hasError && resetKeys && prevProps.resetKeys !== resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => this.lastResetKeys[index] !== key
      );

      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
        this.lastResetKeys = resetKeys;
      }
    }

    // Reset on any prop change if resetOnPropsChange is true
    if (hasError && resetOnPropsChange && prevProps !== this.props) {
      this.resetErrorBoundary();
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  resetErrorBoundary = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0,
      lastErrorTime: null
    });
  };

  handleRetry = async () => {
    const { error, retryCount } = this.state;
    const maxRetries = this.props.maxRetries || 3;

    if (!error || retryCount >= maxRetries) {
      return;
    }

    const classification = ERROR_CLASSIFICATIONS[error.code];
    
    if (!shouldRetry(error, retryCount, maxRetries)) {
      return;
    }

    // Increment retry count
    this.setState(prevState => ({
      retryCount: prevState.retryCount + 1
    }));

    // Calculate retry delay (exponential backoff)
    const baseDelay = 1000; // 1 second
    const delay = baseDelay * Math.pow(2, retryCount);
    const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
    const totalDelay = delay + jitter;

    // Set timeout for retry
    this.retryTimeoutId = setTimeout(() => {
      this.resetErrorBoundary();
    }, totalDelay);
  };

  handleReset = () => {
    this.resetErrorBoundary();
  };

  getRecoveryActions = (): ErrorRecoveryAction[] => {
    const { error, retryCount } = this.state;
    const maxRetries = this.props.maxRetries || 3;
    
    if (!error) return [];

    const classification = ERROR_CLASSIFICATIONS[error.code];
    const actions: ErrorRecoveryAction[] = [];

    // Add retry action if retryable and under max retries
    if (classification.retryable && retryCount < maxRetries) {
      actions.push({
        type: 'retry',
        label: `Retry (${retryCount + 1}/${maxRetries})`,
        action: this.handleRetry,
        disabled: false
      });
    }

    // Add reset action
    actions.push({
      type: 'reset',
      label: 'Start Over',
      action: this.handleReset,
      disabled: false
    });

    // Add context-specific actions based on recovery strategy
    switch (classification.recoveryStrategy) {
      case RecoveryStrategy.REDIRECT:
        actions.push({
          type: 'redirect',
          label: 'Go Back',
          action: () => window.history.back(),
          disabled: false
        });
        break;
      
      case RecoveryStrategy.FALLBACK:
        actions.push({
          type: 'fallback',
          label: 'Continue Anyway',
          action: this.handleReset,
          disabled: false
        });
        break;
    }

    return actions;
  };

  render(): ReactNode {
    const { hasError, error, errorId, retryCount } = this.state;
    const { children, fallback, maxRetries = 3 } = this.props;

    if (hasError && error && errorId) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Use default error display
      return (
        <ErrorDisplay
          error={error}
          errorId={errorId}
          retryCount={retryCount}
          maxRetries={maxRetries}
          onRetry={this.handleRetry}
          onReset={this.handleReset}
          recoveryActions={this.getRecoveryActions()}
        />
      );
    }

    return children;
  }
}