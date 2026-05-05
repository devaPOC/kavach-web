/**
 * Database error types and handling utilities
 */

export enum DatabaseErrorType {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TRANSACTION_ERROR = 'TRANSACTION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class DatabaseError extends Error {
  public readonly type: DatabaseErrorType;
  public readonly originalError?: Error;
  public readonly details?: Record<string, any>;

  constructor(
    type: DatabaseErrorType,
    message: string,
    originalError?: Error,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'DatabaseError';
    this.type = type;
    this.originalError = originalError;
    this.details = details;
  }
}

/**
 * Parse database errors and convert to appropriate DatabaseError
 */
export function parseDatabaseError(error: unknown): DatabaseError {
  if (error instanceof DatabaseError) {
    return error;
  }

  const originalError = error instanceof Error ? error : new Error('Unknown error');
  const message = originalError.message.toLowerCase();

  // PostgreSQL error codes and patterns
  if (message.includes('unique constraint') || message.includes('duplicate key')) {
    return new DatabaseError(
      DatabaseErrorType.DUPLICATE_ENTRY,
      'A record with this information already exists',
      originalError
    );
  }

  if (message.includes('foreign key constraint') || message.includes('violates')) {
    return new DatabaseError(
      DatabaseErrorType.CONSTRAINT_VIOLATION,
      'Operation violates database constraints',
      originalError
    );
  }

  if (message.includes('connection') || message.includes('connect')) {
    return new DatabaseError(
      DatabaseErrorType.CONNECTION_ERROR,
      'Database connection failed',
      originalError
    );
  }

  if (message.includes('not found') || message.includes('no rows')) {
    return new DatabaseError(
      DatabaseErrorType.NOT_FOUND,
      'Requested record not found',
      originalError
    );
  }

  if (message.includes('invalid') || message.includes('malformed')) {
    return new DatabaseError(
      DatabaseErrorType.VALIDATION_ERROR,
      'Invalid data provided',
      originalError
    );
  }

  if (message.includes('transaction') || message.includes('rollback')) {
    return new DatabaseError(
      DatabaseErrorType.TRANSACTION_ERROR,
      'Database transaction failed',
      originalError
    );
  }

  return new DatabaseError(
    DatabaseErrorType.UNKNOWN_ERROR,
    'An unexpected database error occurred',
    originalError
  );
}

/**
 * Error handler wrapper for repository methods
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw parseDatabaseError(error);
    }
  };
}

/**
 * Validation utilities for database operations
 */
export class DatabaseValidation {
  /**
   * Validate UUID format
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input: string): string {
    return input.trim().replace(/\0/g, '');
  }

  /**
   * Validate required fields
   */
  static validateRequired(data: Record<string, any>, requiredFields: string[]): void {
    const missingFields = requiredFields.filter(field => 
      data[field] === undefined || data[field] === null || data[field] === ''
    );

    if (missingFields.length > 0) {
      throw new DatabaseError(
        DatabaseErrorType.VALIDATION_ERROR,
        `Missing required fields: ${missingFields.join(', ')}`,
        undefined,
        { missingFields }
      );
    }
  }

  /**
   * Validate field lengths
   */
  static validateFieldLengths(
    data: Record<string, any>, 
    fieldLimits: Record<string, number>
  ): void {
    const invalidFields: string[] = [];

    Object.entries(fieldLimits).forEach(([field, maxLength]) => {
      const value = data[field];
      if (typeof value === 'string' && value.length > maxLength) {
        invalidFields.push(`${field} (max: ${maxLength}, actual: ${value.length})`);
      }
    });

    if (invalidFields.length > 0) {
      throw new DatabaseError(
        DatabaseErrorType.VALIDATION_ERROR,
        `Field length validation failed: ${invalidFields.join(', ')}`,
        undefined,
        { invalidFields }
      );
    }
  }
}

/**
 * Logging utilities for database operations
 */
export class DatabaseLogger {
  /**
   * Log database operation
   */
  static logOperation(
    operation: string,
    table: string,
    duration?: number,
    error?: Error
  ): void {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      operation,
      table,
      duration: duration ? `${duration}ms` : undefined,
      error: error?.message
    };

    if (error) {
      console.error('[DATABASE ERROR]', logData);
    } else {
      console.log('[DATABASE]', logData);
    }
  }

  /**
   * Performance monitoring wrapper
   */
  static withPerformanceLogging<T extends any[], R>(
    operation: string,
    table: string,
    fn: (...args: T) => Promise<R>
  ) {
    return async (...args: T): Promise<R> => {
      const startTime = Date.now();
      let error: Error | undefined;

      try {
        const result = await fn(...args);
        const duration = Date.now() - startTime;
        this.logOperation(operation, table, duration);
        return result;
      } catch (err) {
        error = err instanceof Error ? err : new Error('Unknown error');
        const duration = Date.now() - startTime;
        this.logOperation(operation, table, duration, error);
        throw error;
      }
    };
  }
}