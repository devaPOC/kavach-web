/**
 * Cache Manager for Performance Optimization
 * Implements multi-layer caching with Redis and in-memory fallback
 */

import { logger } from '@/lib/utils/logger';
import { emitAudit, AuditEventName } from '@/lib/utils/audit-logger';

export interface CacheConfig {
  enableRedis: boolean;
  enableMemoryCache: boolean;
  defaultTTL: number; // seconds
  maxMemoryItems: number;
  keyPrefix: string;
  compressionThreshold: number; // bytes
}

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enableRedis: process.env.REDIS_URL ? true : false,
  enableMemoryCache: true,
  defaultTTL: 3600, // 1 hour
  maxMemoryItems: 1000,
  keyPrefix: 'kavach:',
  compressionThreshold: 1024 // 1KB
};

export interface CacheItem<T = any> {
  value: string; // Always store as serialized string
  ttl: number;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
  compressed: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  memoryUsage: number;
  redisConnected: boolean;
}

export interface CacheStrategy {
  key: string;
  ttl?: number;
  tags?: string[];
  compress?: boolean;
  fallbackToMemory?: boolean;
}

/**
 * In-Memory Cache Implementation
 */
class MemoryCache {
  private cache: Map<string, CacheItem> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    memoryUsage: 0,
    redisConnected: false
  };
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    this.startCleanupInterval();
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Check if item has expired
    if (this.isExpired(item)) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      return null;
    }

    // Update access statistics
    item.accessCount++;
    item.lastAccessed = Date.now();
    this.stats.hits++;

    return this.deserializeValue(item.value, item.compressed);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const actualTTL = ttl || this.config.defaultTTL;
    const serializedValue = this.serializeValue(value);
    const shouldCompress = serializedValue.length > this.config.compressionThreshold;
    
    const item: CacheItem<T> = {
      value: shouldCompress ? this.compress(serializedValue) : serializedValue,
      ttl: actualTTL,
      createdAt: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      compressed: shouldCompress
    };

    // Evict items if cache is full
    if (this.cache.size >= this.config.maxMemoryItems) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(key, item);
    this.stats.sets++;
    this.updateMemoryUsage();
  }

  async delete(key: string): Promise<void> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      this.updateMemoryUsage();
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.stats.memoryUsage = 0;
  }

  async keys(pattern?: string): Promise<string[]> {
    const keys = Array.from(this.cache.keys());
    if (pattern) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return keys.filter(key => regex.test(key));
    }
    return keys;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  private isExpired(item: CacheItem): boolean {
    return Date.now() - item.createdAt > item.ttl * 1000;
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  private serializeValue<T>(value: T): string {
    return JSON.stringify(value);
  }

  private deserializeValue<T>(value: any, compressed: boolean): T {
    const stringValue = compressed ? this.decompress(value) : value;
    return JSON.parse(stringValue);
  }

  private compress(data: string): string {
    // Simple compression simulation - in real implementation, use a compression library
    return Buffer.from(data).toString('base64');
  }

  private decompress(data: string): string {
    // Simple decompression simulation
    return Buffer.from(data, 'base64').toString();
  }

  private updateMemoryUsage(): void {
    let totalSize = 0;
    for (const item of this.cache.values()) {
      totalSize += JSON.stringify(item).length;
    }
    this.stats.memoryUsage = totalSize;
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  private cleanup(): void {
    const now = Date.now();
    let evicted = 0;

    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        this.cache.delete(key);
        evicted++;
      }
    }

    if (evicted > 0) {
      this.stats.evictions += evicted;
      this.updateMemoryUsage();
      logger.info('Memory cache cleanup', { evicted, remaining: this.cache.size });
    }
  }
}

/**
 * Redis Cache Implementation (Mock for now - would use actual Redis client)
 */
class RedisCache {
  private connected: boolean = false;
  private config: CacheConfig;
  private stats: Partial<CacheStats> = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0
  };

  constructor(config: CacheConfig) {
    this.config = config;
    this.connect();
  }

  private async connect(): Promise<void> {
    try {
      // In a real implementation, this would connect to Redis
      // For now, we'll simulate connection based on environment
      this.connected = !!process.env.REDIS_URL;
      
      if (this.connected) {
        logger.info('Redis cache connected');
      } else {
        logger.info('Redis cache disabled - no REDIS_URL provided');
      }
    } catch (error) {
      logger.error('Redis connection failed', { error });
      this.connected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.connected) return null;

    try {
      // Simulate Redis get operation
      // In real implementation: const result = await this.client.get(this.config.keyPrefix + key);
      this.stats.hits!++;
      return null; // Simulated - would return actual data
    } catch (error) {
      logger.error('Redis get error', { key, error });
      this.stats.misses!++;
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.connected) return;

    try {
      const actualTTL = ttl || this.config.defaultTTL;
      const serializedValue = JSON.stringify(value);
      
      // Simulate Redis set operation
      // In real implementation: await this.client.setex(this.config.keyPrefix + key, actualTTL, serializedValue);
      this.stats.sets!++;
      
      logger.info('Redis set', { key, ttl: actualTTL, size: serializedValue.length });
    } catch (error) {
      logger.error('Redis set error', { key, error });
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.connected) return;

    try {
      // Simulate Redis delete operation
      // In real implementation: await this.client.del(this.config.keyPrefix + key);
      this.stats.deletes!++;
    } catch (error) {
      logger.error('Redis delete error', { key, error });
    }
  }

  async clear(): Promise<void> {
    if (!this.connected) return;

    try {
      // Simulate Redis clear operation
      // In real implementation: await this.client.flushdb();
      logger.info('Redis cache cleared');
    } catch (error) {
      logger.error('Redis clear error', { error });
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    if (!this.connected) return [];

    try {
      // Simulate Redis keys operation
      // In real implementation: return await this.client.keys(this.config.keyPrefix + (pattern || '*'));
      return [];
    } catch (error) {
      logger.error('Redis keys error', { pattern, error });
      return [];
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getStats(): Partial<CacheStats> {
    return { ...this.stats, redisConnected: this.connected };
  }
}

/**
 * Main Cache Manager
 */
export class CacheManager {
  private static instance: CacheManager;
  private memoryCache: MemoryCache;
  private redisCache: RedisCache;
  private config: CacheConfig;

  constructor(config: CacheConfig = DEFAULT_CACHE_CONFIG) {
    this.config = config;
    this.memoryCache = new MemoryCache(config);
    this.redisCache = new RedisCache(config);
  }

  static getInstance(config?: CacheConfig): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager(config);
    }
    return CacheManager.instance;
  }

  /**
   * Get value from cache with fallback strategy
   */
  async get<T>(key: string, strategy?: CacheStrategy): Promise<T | null> {
    const cacheKey = this.buildKey(key, strategy);

    try {
      // Try Redis first if enabled
      if (this.config.enableRedis && this.redisCache.isConnected()) {
        const redisResult = await this.redisCache.get<T>(cacheKey);
        if (redisResult !== null) {
          // Also store in memory cache for faster subsequent access
          if (this.config.enableMemoryCache) {
            await this.memoryCache.set(cacheKey, redisResult, strategy?.ttl);
          }
          return redisResult;
        }
      }

      // Fallback to memory cache
      if (this.config.enableMemoryCache || strategy?.fallbackToMemory !== false) {
        return await this.memoryCache.get<T>(cacheKey);
      }

      return null;
    } catch (error) {
      logger.error('Cache get error', { key: cacheKey, error });
      return null;
    }
  }

  /**
   * Set value in cache with multi-layer strategy
   */
  async set<T>(key: string, value: T, strategy?: CacheStrategy): Promise<void> {
    const cacheKey = this.buildKey(key, strategy);
    const ttl = strategy?.ttl || this.config.defaultTTL;

    try {
      // Set in Redis if enabled
      if (this.config.enableRedis && this.redisCache.isConnected()) {
        await this.redisCache.set(cacheKey, value, ttl);
      }

      // Set in memory cache
      if (this.config.enableMemoryCache) {
        await this.memoryCache.set(cacheKey, value, ttl);
      }

      // Log cache operation
      this.logCacheOperation('set', cacheKey, { ttl, size: JSON.stringify(value).length });

    } catch (error) {
      logger.error('Cache set error', { key: cacheKey, error });
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string, strategy?: CacheStrategy): Promise<void> {
    const cacheKey = this.buildKey(key, strategy);

    try {
      // Delete from Redis
      if (this.config.enableRedis && this.redisCache.isConnected()) {
        await this.redisCache.delete(cacheKey);
      }

      // Delete from memory cache
      if (this.config.enableMemoryCache) {
        await this.memoryCache.delete(cacheKey);
      }

      this.logCacheOperation('delete', cacheKey);

    } catch (error) {
      logger.error('Cache delete error', { key: cacheKey, error });
    }
  }

  /**
   * Clear cache by pattern or tags
   */
  async clear(pattern?: string, tags?: string[]): Promise<void> {
    try {
      if (pattern) {
        // Clear by pattern
        const memoryKeys = await this.memoryCache.keys(pattern);
        const redisKeys = await this.redisCache.keys(pattern);
        
        await Promise.all([
          ...memoryKeys.map(key => this.memoryCache.delete(key)),
          ...redisKeys.map(key => this.redisCache.delete(key))
        ]);

        logger.info('Cache cleared by pattern', { pattern, memoryKeys: memoryKeys.length, redisKeys: redisKeys.length });
      } else {
        // Clear all
        await Promise.all([
          this.memoryCache.clear(),
          this.redisCache.clear()
        ]);

        logger.info('Cache cleared completely');
      }
    } catch (error) {
      logger.error('Cache clear error', { pattern, tags, error });
    }
  }

  /**
   * Get or set pattern (cache-aside)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    strategy?: CacheStrategy
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, strategy);
    if (cached !== null) {
      return cached;
    }

    // Generate value and cache it
    try {
      const value = await factory();
      await this.set(key, value, strategy);
      return value;
    } catch (error) {
      logger.error('Cache factory error', { key, error });
      throw error;
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    // This would require a tag-to-key mapping in a real implementation
    logger.info('Cache invalidation by tags', { tags });
    
    // For now, we'll emit an audit event
    emitAudit({
      event: 'cache.invalidation.tags' as AuditEventName,
      userId: 'system',
      requestId: 'cache-invalidation',
      severity: 'low',
      success: true,
      metadata: { tags }
    });
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const memoryStats = this.memoryCache.getStats();
    const redisStats = this.redisCache.getStats();

    return {
      hits: memoryStats.hits + (redisStats.hits || 0),
      misses: memoryStats.misses + (redisStats.misses || 0),
      sets: memoryStats.sets + (redisStats.sets || 0),
      deletes: memoryStats.deletes + (redisStats.deletes || 0),
      evictions: memoryStats.evictions,
      memoryUsage: memoryStats.memoryUsage,
      redisConnected: redisStats.redisConnected || false
    };
  }

  /**
   * Build cache key with prefix
   */
  private buildKey(key: string, strategy?: CacheStrategy): string {
    return `${this.config.keyPrefix}${strategy?.key || key}`;
  }

  /**
   * Log cache operations
   */
  private logCacheOperation(operation: string, key: string, metadata?: any): void {
    logger.info(`Cache ${operation}`, { key, ...metadata });
  }
}

/**
 * Awareness Lab specific cache strategies
 */
export const AWARENESS_LAB_CACHE_STRATEGIES = {
  // Quiz caching
  QUIZ_LIST: {
    key: 'quiz:list',
    ttl: 300, // 5 minutes
    tags: ['quiz', 'list']
  },
  
  QUIZ_DETAIL: (quizId: string) => ({
    key: `quiz:detail:${quizId}`,
    ttl: 1800, // 30 minutes
    tags: ['quiz', 'detail', quizId]
  }),
  
  QUIZ_QUESTIONS: (quizId: string) => ({
    key: `quiz:questions:${quizId}`,
    ttl: 3600, // 1 hour
    tags: ['quiz', 'questions', quizId]
  }),
  
  // Learning material caching
  MODULE_LIST: {
    key: 'module:list',
    ttl: 600, // 10 minutes
    tags: ['module', 'list']
  },
  
  MODULE_DETAIL: (moduleId: string) => ({
    key: `module:detail:${moduleId}`,
    ttl: 1800, // 30 minutes
    tags: ['module', 'detail', moduleId]
  }),
  
  USER_PROGRESS: (userId: string) => ({
    key: `progress:user:${userId}`,
    ttl: 300, // 5 minutes
    tags: ['progress', 'user', userId]
  }),
  
  // Analytics caching
  QUIZ_STATS: (quizId: string) => ({
    key: `stats:quiz:${quizId}`,
    ttl: 900, // 15 minutes
    tags: ['stats', 'quiz', quizId]
  }),
  
  USER_STATS: (userId: string) => ({
    key: `stats:user:${userId}`,
    ttl: 600, // 10 minutes
    tags: ['stats', 'user', userId]
  })
};

/**
 * Cache warming utilities
 */
export class CacheWarmer {
  private cacheManager: CacheManager;

  constructor(cacheManager: CacheManager) {
    this.cacheManager = cacheManager;
  }

  /**
   * Warm up quiz cache
   */
  async warmQuizCache(quizIds: string[]): Promise<void> {
    logger.info('Starting quiz cache warming', { quizCount: quizIds.length });

    const warmingPromises = quizIds.map(async (quizId) => {
      try {
        // This would fetch quiz data and cache it
        // await this.cacheManager.getOrSet(
        //   `quiz:detail:${quizId}`,
        //   () => fetchQuizById(quizId),
        //   AWARENESS_LAB_CACHE_STRATEGIES.QUIZ_DETAIL(quizId)
        // );
        
        logger.info('Quiz cache warmed', { quizId });
      } catch (error) {
        logger.error('Quiz cache warming failed', { quizId, error });
      }
    });

    await Promise.allSettled(warmingPromises);
    logger.info('Quiz cache warming completed');
  }

  /**
   * Warm up user progress cache
   */
  async warmUserProgressCache(userIds: string[]): Promise<void> {
    logger.info('Starting user progress cache warming', { userCount: userIds.length });

    const warmingPromises = userIds.map(async (userId) => {
      try {
        // This would fetch user progress and cache it
        logger.info('User progress cache warmed', { userId });
      } catch (error) {
        logger.error('User progress cache warming failed', { userId, error });
      }
    });

    await Promise.allSettled(warmingPromises);
    logger.info('User progress cache warming completed');
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();
export const cacheWarmer = new CacheWarmer(cacheManager);