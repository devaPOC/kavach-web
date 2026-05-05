import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { logger } from '@/infrastructure/logging/logger';

/**
 * Database connection configuration
 */
interface DatabaseConfig {
  url: string;
  maxConnections?: number;
  idleTimeout?: number;
  connectTimeout?: number;
  ssl?: boolean;
}

/**
 * Database connection manager
 */
export class DatabaseManager {
  private client: postgres.Sql | null = null;
  private db: ReturnType<typeof drizzle> | null = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Initialize database connection
   */
  async connect(): Promise<void> {
    try {
      if (this.client) {
        logger.warn('Database connection already exists');
        return;
      }

      this.client = postgres(this.config.url, {
        max: this.config.maxConnections || 10,
        idle_timeout: this.config.idleTimeout || 20,
        connect_timeout: this.config.connectTimeout || 10,
        ssl: this.config.ssl || false
      });

      this.db = drizzle(this.client);

      // Test connection
      await this.client`SELECT 1`;

      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Failed to connect to database', { error });
      throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get database instance
   */
  getDatabase() {
    if (!this.db) {
      throw new Error('Database not initialized. Call connect() first.');
    }
    return this.db;
  }

  /**
   * Get raw client
   */
  getClient() {
    if (!this.client) {
      throw new Error('Database client not initialized. Call connect() first.');
    }
    return this.client;
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.end();
        this.client = null;
        this.db = null;
        logger.info('Database disconnected successfully');
      }
    } catch (error) {
      logger.error('Error disconnecting from database', { error });
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }
      await this.client`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

// Create singleton instance
const databaseConfig: DatabaseConfig = {
  url: process.env.DATABASE_URL!,
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
  idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '20'),
  connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10'),
  ssl: process.env.DB_SSL === 'true'
};

if (!databaseConfig.url) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const databaseManager = new DatabaseManager(databaseConfig);

// Only initialize connection in runtime, not during build
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  // Check if we're in a build process
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.npm_lifecycle_event === 'build' ||
    process.argv.includes('build');

  if (!isBuildTime) {
    // Initialize connection only at runtime
    databaseManager.connect().catch(error => {
      logger.error('Failed to initialize database', { error });
      // Don't exit process in serverless environments
      if (process.env.NODE_ENV === 'development') {
        process.exit(1);
      }
    });
  }
}

// Create lazy getters for database instances
let _db: ReturnType<typeof drizzle> | null = null;
let _client: postgres.Sql | null = null;

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    if (!_db) {
      _db = databaseManager.getDatabase();
    }
    return _db[prop as keyof typeof _db];
  }
});

export const client = new Proxy({} as postgres.Sql, {
  get(target, prop) {
    if (!_client) {
      _client = databaseManager.getClient();
    }
    return _client[prop as keyof typeof _client];
  }
});
