import { db } from '../connection';

/**
 * Database transaction wrapper with error handling
 */
export async function withTransaction<T>(
  callback: (tx: any) => Promise<T>
): Promise<T> {
  try {
    return await db.transaction(async (tx) => {
      return await callback(tx);
    });
  } catch (error) {
    throw new Error(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check database connection health
 */
export async function checkDatabaseHealth(): Promise<{ isHealthy: boolean; error?: string }> {
  try {
    await db.execute('SELECT 1');
    return { isHealthy: true };
  } catch (error) {
    return {
      isHealthy: false,
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}

/**
 * Execute raw SQL query with error handling
 */
export async function executeRawQuery<T = any>(
  query: string,
  _params?: any[]
): Promise<T[]> {
  try {
    const result = await db.execute(query);
    return result as T[];
  } catch (error) {
    throw new Error(`Raw query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Batch operation utility
 */
export async function batchOperation<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  batchSize: number = 10
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(item => operation(item))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Retry operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error(`Operation failed after ${maxRetries + 1} attempts: ${lastError.message}`);
}

/**
 * Database cleanup utilities
 */
export class DatabaseCleanup {
  /**
   * Clean up expired records from multiple tables
   */
  static async cleanupExpiredRecords(): Promise<{
    emailVerifications: number;
    sessions: number;
  }> {
    try {
      return await withTransaction(async (_tx) => {

        // Import repositories inside the function to avoid circular dependencies
        const { emailVerificationRepository } = await import('../repositories/email-verification-repository');
        const { sessionRepository } = await import('../repositories/session-repository');

        const [emailVerifications, sessions] = await Promise.all([
          emailVerificationRepository.deleteExpired(),
          sessionRepository.deleteExpired()
        ]);

        return {
          emailVerifications,
          sessions
        };
      });
    } catch (error) {
      throw new Error(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get database statistics
   */
  static async getStats(): Promise<{
    totalUsers: number;
    verifiedUsers: number;
    activeSessions: number;
    pendingVerifications: number;
  }> {
    try {
      const [
        totalUsersResult,
        verifiedUsersResult,
        activeSessionsResult,
        pendingVerificationsResult
      ] = await Promise.all([
        db.execute('SELECT COUNT(*) as count FROM users'),
        db.execute('SELECT COUNT(*) as count FROM users WHERE is_email_verified = true'),
        db.execute('SELECT COUNT(*) as count FROM sessions WHERE expires_at > NOW()'),
        db.execute('SELECT COUNT(*) as count FROM email_verifications WHERE is_used = false AND expires_at > NOW()')
      ]);

      return {
        totalUsers: Number((totalUsersResult[0] as any)?.count || 0),
        verifiedUsers: Number((verifiedUsersResult[0] as any)?.count || 0),
        activeSessions: Number((activeSessionsResult[0] as any)?.count || 0),
        pendingVerifications: Number((pendingVerificationsResult[0] as any)?.count || 0)
      };
    } catch (error) {
      throw new Error(`Failed to get database stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
