import { db } from './connection';
import * as schema from './schema';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import { logger } from '../utils/logger';

/**
 * Transaction context type for Drizzle ORM with PostgresJS
 */
export type Transaction = PgTransaction<PostgresJsQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;

/**
 * Result type for transaction operations
 */
export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  rollbackReason?: string;
}

/**
 * Transaction operation function type
 */
export type TransactionOperation<T> = (tx: Transaction) => Promise<T>;

/**
 * Service for managing database transactions with automatic rollback on errors
 */
export class TransactionService {
  /**
   * Execute an operation within a database transaction
   * Automatically rolls back on any error
   */
  async executeInTransaction<T>(
    operation: TransactionOperation<T>,
    operationName?: string
  ): Promise<TransactionResult<T>> {
    const startTime = Date.now();
    const opName = operationName || 'unknown-operation';

    try {
      logger.info(`Starting transaction: ${opName}`);

      const result = await db.transaction(async (tx) => {
        return await operation(tx);
      });

      const duration = Date.now() - startTime;
      logger.info(`Transaction completed successfully: ${opName} (${duration}ms)`);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error(`Transaction failed: ${opName} (${duration}ms)`, {
        error: errorMessage,
        operationName: opName,
        duration
      });

      return {
        success: false,
        error: errorMessage,
        rollbackReason: `Transaction failed during ${opName}: ${errorMessage}`
      };
    }
  }

  /**
   * Execute multiple operations in a single transaction
   * All operations must succeed or all will be rolled back
   */
  async executeMultipleInTransaction<T extends Record<string, any>>(
    operations: Record<keyof T, TransactionOperation<T[keyof T]>>,
    operationName?: string
  ): Promise<TransactionResult<T>> {
    const opName = operationName || 'multiple-operations';

    return this.executeInTransaction(async (tx) => {
      const results = {} as T;

      for (const [key, operation] of Object.entries(operations)) {
        try {
          results[key as keyof T] = await operation(tx);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          throw new Error(`Operation '${key}' failed: ${errorMessage}`);
        }
      }

      return results;
    }, opName);
  }

  /**
   * Execute an operation with retry logic within a transaction
   */
  async executeWithRetry<T>(
    operation: TransactionOperation<T>,
    maxRetries: number = 3,
    operationName?: string
  ): Promise<TransactionResult<T>> {
    const opName = operationName || 'retry-operation';
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.executeInTransaction(operation, `${opName}-attempt-${attempt}`);

        if (result.success) {
          if (attempt > 1) {
            logger.info(`Transaction succeeded on attempt ${attempt}: ${opName}`);
          }
          return result;
        }

        lastError = new Error(result.error || 'Transaction failed');

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
          logger.warn(`Transaction attempt ${attempt} failed, retrying in ${delay}ms: ${opName}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          logger.warn(`Transaction attempt ${attempt} failed, retrying in ${delay}ms: ${opName}`, {
            error: lastError.message
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    const errorMessage = lastError?.message || 'All retry attempts failed';
    logger.error(`Transaction failed after ${maxRetries} attempts: ${opName}`, {
      error: errorMessage
    });

    return {
      success: false,
      error: errorMessage,
      rollbackReason: `All ${maxRetries} retry attempts failed for ${opName}`
    };
  }
}

// Export singleton instance
export const transactionService = new TransactionService();
