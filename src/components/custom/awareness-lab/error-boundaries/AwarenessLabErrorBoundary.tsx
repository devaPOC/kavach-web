/**
 * Main Awareness Lab Error Boundary
 * Provides comprehensive error handling for the entire awareness lab system
 */

import React, { ReactNode } from 'react';
import { BaseErrorBoundary } from './BaseErrorBoundary';
import { AwarenessLabError } from '@/lib/errors/awareness-lab-errors';
import { createErrorContext } from './utils';

interface AwarenessLabErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: AwarenessLabError, errorInfo: any) => void;
  maxRetries?: number;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

export const AwarenessLabErrorBoundary: React.FC<AwarenessLabErrorBoundaryProps> = ({
  children,
  fallback,
  onError,
  maxRetries = 3,
  resetKeys,
  resetOnPropsChange = false
}) => {
  const handleError = (error: AwarenessLabError, errorInfo: any) => {
    // Create comprehensive error context
    const context = createErrorContext('AwarenessLabErrorBoundary', {
      errorInfo,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      timestamp: new Date().toISOString(),
      resetKeys,
      maxRetries
    });

    // Log error with context
    console.error('Awareness Lab Error Boundary caught error:', {
      error: {
        code: error.code,
        message: error.message,
        category: error.category,
        statusCode: error.statusCode,
        retryable: error.retryable,
        details: error.details
      },
      context
    });

    // Call parent error handler if provided
    onError?.(error, { ...errorInfo, context });

    // Send error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // Example: sendErrorToMonitoring(error, context);
    }
  };

  return (
    <BaseErrorBoundary
      errorType="awareness-lab"
      contextName="AwarenessLabErrorBoundary"
      fallback={fallback}
      onError={handleError}
      maxRetries={maxRetries}
      resetKeys={resetKeys}
      resetOnPropsChange={resetOnPropsChange}
    >
      {children}
    </BaseErrorBoundary>
  );
};