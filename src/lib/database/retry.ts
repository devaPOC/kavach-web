import { db } from './connection';
import { PostgresError } from 'postgres';

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
}

/**
 * Execute a database query with retry logic for connection timeouts
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 5000 } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if it's a connection timeout or similar error
      const isRetryable =
        error.code === 'CONNECT_TIMEOUT' ||
        error.code === 'CONNECTION_ERROR' ||
        error.errno === 'CONNECT_TIMEOUT' ||
        error.message?.includes('timeout') ||
        error.message?.includes('connection');

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

      console.log(`Database operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
