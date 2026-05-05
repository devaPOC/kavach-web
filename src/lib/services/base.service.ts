import { logger } from '@/lib/utils/logger';
import { emitAudit, type AuditBase } from '@/lib/utils/audit-logger';
import { recordAuthEvent } from '@/lib/utils/metrics';

/**
 * Base service class with common functionality
 */
export abstract class BaseService {
  protected readonly logger = logger;

  /**
   * Log audit events
   */
  protected audit(event: AuditBase): void {
    emitAudit(event);
  }

  /**
   * Record metrics
   */
  protected recordMetric(event: 'login' | 'signup' | 'refresh' | 'logout' | 'email_verify', success: boolean): void {
    recordAuthEvent(event, success);
  }

  /**
   * Handle service errors
   */
  protected handleError(error: unknown, context: string): never {
    const message = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Service error in ${context}: ${message}`, { error, context });
    throw new Error(`${context}: ${message}`);
  }

  /**
   * Validate required parameters
   */
  protected validateRequired<T>(value: T | null | undefined, fieldName: string): T {
    if (value === null || value === undefined) {
      throw new Error(`${fieldName} is required`);
    }
    return value;
  }
}

/**
 * Service result wrapper for consistent error handling
 */
export type ServiceResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  code?: string;
  validationErrors?: any[];
};

/**
 * Create a successful service result
 */
export function serviceSuccess<T>(data: T): ServiceResult<T> {
  return { success: true, data };
}

/**
 * Create a failed service result
 */
export function serviceError<T>(error: string, code?: string, validationErrors?: any[]): ServiceResult<T> {
  return { success: false, error, code, validationErrors };
}
