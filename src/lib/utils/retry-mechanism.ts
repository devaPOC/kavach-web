/**
 * Retry Mechanism with Exponential Backoff
 * Provides robust retry logic for transient failures
 */

import { AwarenessLabError, AwarenessLabErrorCode } from '@/lib/errors/awareness-lab-errors';

// Retry configuration
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // in milliseconds
  maxDelay: number; // in milliseconds
  backoffMultiplier: number;
  jitterFactor: number; // 0-1, adds randomness to prevent thundering herd
  retryableErrors: string[]; // Error codes that should trigger retry
  onRetry?: (attempt: number, error: Error) => void;
  onMaxAttemptsReached?: (error: Error) => void;
}

// Default retry configuration
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  jitterFactor: 0.1,
  retryableErrors: [
    'NETWORK_ERROR',
    'TIMEOUT_ERROR',
    'SERVER_ERROR',
    'DATABASE_CONNECTION_ERROR',
    'EXTERNAL_SERVICE_ERROR',
    'ANALYTICS_DATA_UNAVAILABLE'
  ]
};

// Retry result
export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

/**
 * Retry mechanism with exponential backoff and jitter
 */
export class RetryMechanism {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Execute a function with retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName: string = 'operation'
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < this.config.maxAttempts) {
      attempt++;

      try {
        const result = await operation();
        return {
          success: true,
          data: result,
          attempts: attempt,
          totalTime: Date.now() - startTime
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if error is retryable
        if (!this.isRetryableError(lastError)) {
          break;
        }

        // Don't wait after the last attempt
        if (attempt < this.config.maxAttempts) {
          const delay = this.calculateDelay(attempt);
          
          // Call retry callback if provided
          this.config.onRetry?.(attempt, lastError);
          
          console.warn(
            `${operationName} failed (attempt ${attempt}/${this.config.maxAttempts}). ` +
            `Retrying in ${delay}ms. Error: ${lastError.message}`
          );
          
          await this.sleep(delay);
        }
      }
    }

    // All attempts failed
    this.config.onMaxAttemptsReached?.(lastError!);
    
    return {
      success: false,
      error: lastError!,
      attempts: attempt,
      totalTime: Date.now() - startTime
    };
  }

  /**
   * Check if an error should trigger a retry
   */
  private isRetryableError(error: Error): boolean {
    // Check for AwarenessLabError with retryable flag
    if (error instanceof AwarenessLabError) {
      return error.retryable;
    }

    // Check for specific error codes
    const errorCode = this.extractErrorCode(error);
    if (errorCode && this.config.retryableErrors.includes(errorCode)) {
      return true;
    }

    // Check for common network/timeout errors
    const retryablePatterns = [
      /network/i,
      /timeout/i,
      /connection/i,
      /ECONNRESET/i,
      /ENOTFOUND/i,
      /ETIMEDOUT/i,
      /fetch.*failed/i,
      /server.*error/i,
      /5\d\d/i // 5xx HTTP status codes
    ];

    return retryablePatterns.some(pattern => 
      pattern.test(error.message) || pattern.test(error.name)
    );
  }

  /**
   * Extract error code from error object
   */
  private extractErrorCode(error: Error): string | null {
    if (error instanceof AwarenessLabError) {
      return error.code;
    }

    // Check for common error code properties
    const errorObj = error as any;
    return errorObj.code || errorObj.errorCode || errorObj.type || null;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    const jitter = exponentialDelay * this.config.jitterFactor * Math.random();
    const totalDelay = exponentialDelay + jitter;
    
    return Math.min(totalDelay, this.config.maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update retry configuration
   */
  updateConfig(newConfig: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by temporarily stopping requests to failing services
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing, rejecting requests
  HALF_OPEN = 'half_open' // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  recoveryTimeout: number;  // Time to wait before trying again (ms)
  monitoringPeriod: number; // Time window for failure counting (ms)
  successThreshold: number; // Successes needed to close from half-open
}

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeout: 60000, // 1 minute
  monitoringPeriod: 300000, // 5 minutes
  successThreshold: 3
};

/**
 * Circuit Breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private failures: number[] = []; // Timestamps of failures
  private config: CircuitBreakerConfig;

  constructor(
    private name: string,
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
  }

  /**
   * Execute operation through circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new AwarenessLabError(
          AwarenessLabErrorCode.ANALYTICS_DATA_UNAVAILABLE,
          `Circuit breaker "${this.name}" is OPEN. Service temporarily unavailable.`
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitBreakerState.CLOSED;
        this.successCount = 0;
        console.log(`Circuit breaker "${this.name}" closed after successful recovery`);
      }
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    const now = Date.now();
    this.failures.push(now);
    this.lastFailureTime = now;
    
    // Clean old failures outside monitoring period
    this.failures = this.failures.filter(
      timestamp => now - timestamp <= this.config.monitoringPeriod
    );
    
    this.failureCount = this.failures.length;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Failed during recovery attempt, go back to open
      this.state = CircuitBreakerState.OPEN;
      console.warn(`Circuit breaker "${this.name}" failed during recovery, returning to OPEN state`);
    } else if (this.failureCount >= this.config.failureThreshold) {
      // Too many failures, open the circuit
      this.state = CircuitBreakerState.OPEN;
      console.warn(
        `Circuit breaker "${this.name}" opened due to ${this.failureCount} failures ` +
        `in ${this.config.monitoringPeriod}ms`
      );
    }
  }

  /**
   * Check if we should attempt to reset the circuit breaker
   */
  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.config.recoveryTimeout;
  }

  /**
   * Get current circuit breaker status
   */
  getStatus(): {
    state: CircuitBreakerState;
    failureCount: number;
    successCount: number;
    lastFailureTime: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
    };
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.failures = [];
    console.log(`Circuit breaker "${this.name}" manually reset`);
  }
}

/**
 * Retry with Circuit Breaker
 * Combines retry mechanism with circuit breaker pattern
 */
export class RetryWithCircuitBreaker {
  private retryMechanism: RetryMechanism;
  private circuitBreaker: CircuitBreaker;

  constructor(
    name: string,
    retryConfig: Partial<RetryConfig> = {},
    circuitBreakerConfig: Partial<CircuitBreakerConfig> = {}
  ) {
    this.retryMechanism = new RetryMechanism(retryConfig);
    this.circuitBreaker = new CircuitBreaker(name, circuitBreakerConfig);
  }

  /**
   * Execute operation with both retry and circuit breaker protection
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName: string = 'operation'
  ): Promise<RetryResult<T>> {
    return this.retryMechanism.execute(async () => {
      return this.circuitBreaker.execute(operation);
    }, operationName);
  }

  /**
   * Get status of both retry mechanism and circuit breaker
   */
  getStatus(): {
    circuitBreaker: ReturnType<CircuitBreaker['getStatus']>;
  } {
    return {
      circuitBreaker: this.circuitBreaker.getStatus()
    };
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.circuitBreaker.reset();
  }
}

// Utility functions for common retry scenarios

/**
 * Retry API calls with exponential backoff
 */
export async function retryApiCall<T>(
  apiCall: () => Promise<T>,
  options: Partial<RetryConfig> = {}
): Promise<T> {
  const retryMechanism = new RetryMechanism({
    ...DEFAULT_RETRY_CONFIG,
    retryableErrors: [
      ...DEFAULT_RETRY_CONFIG.retryableErrors,
      'FETCH_ERROR',
      'NETWORK_ERROR',
      'TIMEOUT_ERROR'
    ],
    ...options
  });

  const result = await retryMechanism.execute(apiCall, 'API call');
  
  if (!result.success) {
    throw result.error;
  }
  
  return result.data!;
}

/**
 * Retry database operations
 */
export async function retryDatabaseOperation<T>(
  dbOperation: () => Promise<T>,
  options: Partial<RetryConfig> = {}
): Promise<T> {
  const retryMechanism = new RetryMechanism({
    ...DEFAULT_RETRY_CONFIG,
    maxAttempts: 2, // Fewer retries for DB operations
    retryableErrors: [
      'DATABASE_CONNECTION_ERROR',
      'CONNECTION_TIMEOUT',
      'LOCK_TIMEOUT',
      'DEADLOCK'
    ],
    ...options
  });

  const result = await retryMechanism.execute(dbOperation, 'Database operation');
  
  if (!result.success) {
    throw result.error;
  }
  
  return result.data!;
}

/**
 * Create a retry mechanism for specific service
 */
export function createServiceRetry(
  serviceName: string,
  config: Partial<RetryConfig & CircuitBreakerConfig> = {}
): RetryWithCircuitBreaker {
  const { maxAttempts, baseDelay, maxDelay, backoffMultiplier, jitterFactor, retryableErrors, onRetry, onMaxAttemptsReached, ...circuitBreakerConfig } = config;
  
  const retryConfig: Partial<RetryConfig> = {
    maxAttempts,
    baseDelay,
    maxDelay,
    backoffMultiplier,
    jitterFactor,
    retryableErrors,
    onRetry,
    onMaxAttemptsReached
  };

  return new RetryWithCircuitBreaker(serviceName, retryConfig, circuitBreakerConfig);
}