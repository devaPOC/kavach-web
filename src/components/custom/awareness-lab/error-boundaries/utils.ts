/**
 * Utility functions for error boundary operations
 */

import { AwarenessLabError } from '@/lib/errors/awareness-lab-errors';
import { ERROR_CLASSIFICATIONS } from './types';

/**
 * Generate a unique error ID for tracking
 */
export const generateErrorId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `err_${timestamp}_${randomPart}`;
};

/**
 * Log error with context information
 */
export const logError = (
  error: AwarenessLabError, 
  context: Record<string, any>
): void => {
  const errorLog = {
    errorId: generateErrorId(),
    timestamp: new Date().toISOString(),
    error: {
      code: error.code,
      message: error.message,
      category: error.category,
      statusCode: error.statusCode,
      retryable: error.retryable,
      field: error.field,
      details: error.details,
      requestId: error.requestId,
      stack: error.stack
    },
    context,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    url: typeof window !== 'undefined' ? window.location.href : 'server'
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.group(`🚨 Awareness Lab Error: ${error.code}`);
    console.error('Error Details:', errorLog);
    console.groupEnd();
  }

  // In production, you would send this to your logging service
  // Example: sendToLoggingService(errorLog);
};

/**
 * Determine if an error should be retried
 */
export const shouldRetry = (
  error: AwarenessLabError,
  currentRetryCount: number,
  maxRetries: number
): boolean => {
  const classification = ERROR_CLASSIFICATIONS[error.code];
  
  // Check if error is retryable
  if (!classification.retryable) {
    return false;
  }

  // Check if we haven't exceeded max retries
  if (currentRetryCount >= maxRetries) {
    return false;
  }

  // Check if we haven't exceeded error-specific max retries
  if (currentRetryCount >= classification.maxRetries) {
    return false;
  }

  return true;
};

/**
 * Calculate retry delay with exponential backoff
 */
export const calculateRetryDelay = (
  retryCount: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): number => {
  const exponentialDelay = baseDelay * Math.pow(2, retryCount);
  const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
  const totalDelay = exponentialDelay + jitter;
  
  return Math.min(totalDelay, maxDelay);
};

/**
 * Check if error is recoverable
 */
export const isRecoverable = (error: AwarenessLabError): boolean => {
  const classification = ERROR_CLASSIFICATIONS[error.code];
  return classification.recoverable;
};

/**
 * Get user-friendly error message
 */
export const getUserFriendlyMessage = (error: AwarenessLabError): string => {
  const classification = ERROR_CLASSIFICATIONS[error.code];
  return classification.userMessage;
};

/**
 * Get technical error message for debugging
 */
export const getTechnicalMessage = (error: AwarenessLabError): string => {
  const classification = ERROR_CLASSIFICATIONS[error.code];
  return classification.technicalMessage;
};

/**
 * Create error context for logging
 */
export const createErrorContext = (
  componentName: string,
  additionalContext: Record<string, any> = {}
): Record<string, any> => {
  return {
    component: componentName,
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    userId: getUserId(),
    ...additionalContext
  };
};

/**
 * Get session ID (implement based on your session management)
 */
const getSessionId = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  // Try to get session ID from localStorage, sessionStorage, or cookies
  try {
    return localStorage.getItem('sessionId') || 
           sessionStorage.getItem('sessionId') || 
           null;
  } catch {
    return null;
  }
};

/**
 * Get user ID (implement based on your authentication system)
 */
const getUserId = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  // Try to get user ID from your authentication system
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.id || null;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Sanitize error details for logging (remove sensitive information)
 */
export const sanitizeErrorDetails = (
  details: Record<string, any>
): Record<string, any> => {
  const sensitiveKeys = [
    'password', 'token', 'secret', 'key', 'auth', 'credential',
    'ssn', 'social', 'credit', 'card', 'cvv', 'pin'
  ];

  const sanitized = { ...details };

  const sanitizeValue = (obj: any, path: string = ''): any => {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'string') {
      // Check if the key or path contains sensitive information
      const lowerPath = path.toLowerCase();
      const isSensitive = sensitiveKeys.some(key => lowerPath.includes(key));
      return isSensitive ? '[REDACTED]' : obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map((item, index) => sanitizeValue(item, `${path}[${index}]`));
    }
    
    if (typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const newPath = path ? `${path}.${key}` : key;
        result[key] = sanitizeValue(value, newPath);
      }
      return result;
    }
    
    return obj;
  };

  return sanitizeValue(sanitized);
};

/**
 * Format error for display
 */
export const formatErrorForDisplay = (error: AwarenessLabError): {
  title: string;
  message: string;
  severity: string;
  recoverable: boolean;
} => {
  const classification = ERROR_CLASSIFICATIONS[error.code];
  
  return {
    title: `Error: ${error.code}`,
    message: classification.userMessage,
    severity: classification.severity,
    recoverable: classification.recoverable
  };
};

/**
 * Check if error should trigger an alert/notification
 */
export const shouldAlert = (error: AwarenessLabError): boolean => {
  const classification = ERROR_CLASSIFICATIONS[error.code];
  
  // Alert for high and critical severity errors
  return classification.severity === 'high' || classification.severity === 'critical';
};

/**
 * Get retry configuration for an error
 */
export const getRetryConfig = (error: AwarenessLabError): {
  retryable: boolean;
  maxRetries: number;
  baseDelay: number;
} => {
  const classification = ERROR_CLASSIFICATIONS[error.code];
  
  return {
    retryable: classification.retryable,
    maxRetries: classification.maxRetries,
    baseDelay: 1000 // 1 second base delay
  };
};