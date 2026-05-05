/**
 * Database Query Optimization Module
 * Implements query optimization, indexing strategies, and performance monitoring
 */

import { sql, SQL } from 'drizzle-orm';
import { logger } from '@/lib/utils/logger';
import { emitAudit, AuditEventName } from '@/lib/utils/audit-logger';

export interface QueryPerformanceMetrics {
  queryId: string;
  query: string;
  executionTime: number;
  rowsAffected: number;
  timestamp: Date;
  userId?: string;
  endpoint?: string;
}

export interface QueryOptimizationConfig {
  enablePerformanceLogging: boolean;
  slowQueryThreshold: number; // milliseconds
  enableQueryPlan: boolean;
  maxQueryTime: number; // milliseconds
  enableIndexSuggestions: boolean;
}

export const DEFAULT_QUERY_CONFIG: QueryOptimizationConfig = {
  enablePerformanceLogging: true,
  slowQueryThreshold: 1000, // 1 second
  enableQueryPlan: false, // Disable in production
  maxQueryTime: 30000, // 30 seconds
  enableIndexSuggestions: true
};

/**
 * Query Performance Monitor
 */
export class QueryPerformanceMonitor {
  private static instance: QueryPerformanceMonitor;
  private config: QueryOptimizationConfig;
  private metrics: Map<string, QueryPerformanceMetrics> = new Map();
  private activeQueries: Map<string, { startTime: number; query: string }> = new Map();

  constructor(config: QueryOptimizationConfig = DEFAULT_QUERY_CONFIG) {
    this.config = config;
  }

  static getInstance(config?: QueryOptimizationConfig): QueryPerformanceMonitor {
    if (!QueryPerformanceMonitor.instance) {
      QueryPerformanceMonitor.instance = new QueryPerformanceMonitor(config);
    }
    return QueryPerformanceMonitor.instance;
  }

  /**
   * Start monitoring a query
   */
  startQuery(queryId: string, query: string, userId?: string, endpoint?: string): void {
    this.activeQueries.set(queryId, {
      startTime: performance.now(),
      query
    });

    if (this.config.enablePerformanceLogging) {
      logger.info('Query started', { queryId, query: this.sanitizeQuery(query), userId, endpoint });
    }
  }

  /**
   * End monitoring a query
   */
  endQuery(queryId: string, rowsAffected: number = 0, userId?: string, endpoint?: string): void {
    const activeQuery = this.activeQueries.get(queryId);
    if (!activeQuery) {
      logger.warn('Query end called without start', { queryId });
      return;
    }

    const executionTime = performance.now() - activeQuery.startTime;
    const metrics: QueryPerformanceMetrics = {
      queryId,
      query: activeQuery.query,
      executionTime,
      rowsAffected,
      timestamp: new Date(),
      userId,
      endpoint
    };

    this.metrics.set(queryId, metrics);
    this.activeQueries.delete(queryId);

    // Log performance metrics
    if (this.config.enablePerformanceLogging) {
      this.logQueryPerformance(metrics);
    }

    // Check for slow queries
    if (executionTime > this.config.slowQueryThreshold) {
      this.handleSlowQuery(metrics);
    }
  }

  /**
   * Log query performance
   */
  private logQueryPerformance(metrics: QueryPerformanceMetrics): void {
    const logLevel = metrics.executionTime > this.config.slowQueryThreshold ? 'warn' : 'info';
    
    logger[logLevel]('Query performance', {
      queryId: metrics.queryId,
      executionTime: metrics.executionTime,
      rowsAffected: metrics.rowsAffected,
      query: this.sanitizeQuery(metrics.query),
      userId: metrics.userId,
      endpoint: metrics.endpoint
    });
  }

  /**
   * Handle slow query detection
   */
  private handleSlowQuery(metrics: QueryPerformanceMetrics): void {
    logger.warn('Slow query detected', {
      queryId: metrics.queryId,
      executionTime: metrics.executionTime,
      threshold: this.config.slowQueryThreshold,
      query: this.sanitizeQuery(metrics.query),
      userId: metrics.userId,
      endpoint: metrics.endpoint
    });

    // Emit audit event for slow query
    emitAudit({
      event: 'performance.query.slow' as AuditEventName,
      userId: metrics.userId || 'system',
      requestId: metrics.queryId,
      severity: 'medium',
      success: true,
      metadata: {
        executionTime: metrics.executionTime,
        threshold: this.config.slowQueryThreshold,
        rowsAffected: metrics.rowsAffected,
        endpoint: metrics.endpoint
      }
    });

    // Generate index suggestions if enabled
    if (this.config.enableIndexSuggestions) {
      this.generateIndexSuggestions(metrics);
    }
  }

  /**
   * Generate index suggestions for slow queries
   */
  private generateIndexSuggestions(metrics: QueryPerformanceMetrics): void {
    const suggestions = this.analyzeQueryForIndexes(metrics.query);
    if (suggestions.length > 0) {
      logger.info('Index suggestions for slow query', {
        queryId: metrics.queryId,
        suggestions,
        query: this.sanitizeQuery(metrics.query)
      });
    }
  }

  /**
   * Analyze query for potential index improvements
   */
  private analyzeQueryForIndexes(query: string): string[] {
    const suggestions: string[] = [];
    const lowerQuery = query.toLowerCase();

    // Common patterns that benefit from indexes
    const patterns = [
      {
        pattern: /where\s+(\w+)\s*=/gi,
        suggestion: (match: string) => `Consider adding index on column: ${match.split('=')[0].trim().split(' ').pop()}`
      },
      {
        pattern: /order\s+by\s+(\w+)/gi,
        suggestion: (match: string) => `Consider adding index for ORDER BY on: ${match.split('by')[1].trim().split(' ')[0]}`
      },
      {
        pattern: /join\s+\w+\s+on\s+(\w+\.\w+)\s*=\s*(\w+\.\w+)/gi,
        suggestion: () => 'Consider adding indexes on JOIN columns'
      },
      {
        pattern: /group\s+by\s+(\w+)/gi,
        suggestion: (match: string) => `Consider adding index for GROUP BY on: ${match.split('by')[1].trim().split(' ')[0]}`
      }
    ];

    patterns.forEach(({ pattern, suggestion }) => {
      const matches = query.match(pattern);
      if (matches) {
        matches.forEach(match => {
          suggestions.push(suggestion(match));
        });
      }
    });

    return [...new Set(suggestions)]; // Remove duplicates
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   */
  private sanitizeQuery(query: string): string {
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password = '[REDACTED]'")
      .replace(/token\s*=\s*'[^']*'/gi, "token = '[REDACTED]'")
      .replace(/email\s*=\s*'[^']*'/gi, "email = '[REDACTED]'")
      .substring(0, 500); // Limit length
  }

  /**
   * Get performance metrics
   */
  getMetrics(): QueryPerformanceMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get slow queries
   */
  getSlowQueries(): QueryPerformanceMetrics[] {
    return this.getMetrics().filter(m => m.executionTime > this.config.slowQueryThreshold);
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Get average execution time by endpoint
   */
  getAverageExecutionTimeByEndpoint(): Record<string, number> {
    const endpointMetrics: Record<string, { total: number; count: number }> = {};
    
    this.getMetrics().forEach(metric => {
      if (metric.endpoint) {
        if (!endpointMetrics[metric.endpoint]) {
          endpointMetrics[metric.endpoint] = { total: 0, count: 0 };
        }
        endpointMetrics[metric.endpoint].total += metric.executionTime;
        endpointMetrics[metric.endpoint].count += 1;
      }
    });

    const averages: Record<string, number> = {};
    Object.entries(endpointMetrics).forEach(([endpoint, { total, count }]) => {
      averages[endpoint] = total / count;
    });

    return averages;
  }
}

/**
 * Optimized Query Builder for Awareness Lab
 */
export class AwarenessLabQueryBuilder {
  private monitor: QueryPerformanceMonitor;

  constructor() {
    this.monitor = QueryPerformanceMonitor.getInstance();
  }

  /**
   * Optimized quiz queries with proper indexing
   */
  getOptimizedQuizQueries() {
    return {
      // Get published quizzes with attempt counts (optimized with indexes)
      getPublishedQuizzesWithStats: sql`
        SELECT 
          q.*,
          COUNT(qa.id) as attempt_count,
          AVG(qa.score) as average_score,
          MAX(qa.completed_at) as last_attempt
        FROM quizzes q
        LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id AND qa.is_completed = true
        WHERE q.is_published = true 
          AND q.language = $1
          AND (q.end_date IS NULL OR q.end_date > NOW())
        GROUP BY q.id
        ORDER BY q.created_at DESC
        LIMIT $2 OFFSET $3
      `,

      // Get user's quiz attempts with pagination (optimized)
      getUserQuizAttempts: sql`
        SELECT 
          qa.*,
          q.title,
          q.description,
          q.total_questions
        FROM quiz_attempts qa
        INNER JOIN quizzes q ON qa.quiz_id = q.id
        WHERE qa.user_id = $1
        ORDER BY qa.created_at DESC
        LIMIT $2 OFFSET $3
      `,

      // Get quiz with questions (optimized for single query)
      getQuizWithQuestions: sql`
        SELECT 
          q.*,
          json_agg(
            json_build_object(
              'id', qq.id,
              'question_text', qq.question_text,
              'question_type', qq.question_type,
              'question_data', qq.question_data,
              'order_index', qq.order_index
            ) ORDER BY qq.order_index
          ) as questions
        FROM quizzes q
        LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
        WHERE q.id = $1
        GROUP BY q.id
      `,

      // Get quiz statistics (optimized aggregation)
      getQuizStatistics: sql`
        SELECT 
          q.id,
          q.title,
          COUNT(DISTINCT qa.user_id) as unique_participants,
          COUNT(qa.id) as total_attempts,
          AVG(qa.score) as average_score,
          MIN(qa.score) as min_score,
          MAX(qa.score) as max_score,
          AVG(EXTRACT(EPOCH FROM (qa.completed_at - qa.started_at))) as average_duration
        FROM quizzes q
        LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id AND qa.is_completed = true
        WHERE q.id = ANY($1)
        GROUP BY q.id, q.title
      `
    };
  }

  /**
   * Optimized learning material queries
   */
  getOptimizedLearningQueries() {
    return {
      // Get module with materials and progress (single query)
      getModuleWithProgress: sql`
        SELECT 
          m.*,
          json_agg(
            json_build_object(
              'id', mm.id,
              'title', mm.title,
              'content_type', mm.content_type,
              'content_url', mm.content_url,
              'order_index', mm.order_index,
              'is_completed', COALESCE(lp.is_completed, false),
              'last_accessed', lp.last_accessed
            ) ORDER BY mm.order_index
          ) as materials,
          COUNT(mm.id) as total_materials,
          COUNT(CASE WHEN lp.is_completed = true THEN 1 END) as completed_materials
        FROM modules m
        LEFT JOIN module_materials mm ON m.id = mm.module_id
        LEFT JOIN learning_progress lp ON mm.id = lp.material_id AND lp.user_id = $2
        WHERE m.id = $1
        GROUP BY m.id
      `,

      // Get user's learning progress summary (optimized)
      getUserProgressSummary: sql`
        SELECT 
          m.id as module_id,
          m.title as module_title,
          COUNT(mm.id) as total_materials,
          COUNT(CASE WHEN lp.is_completed = true THEN 1 END) as completed_materials,
          MAX(lp.last_accessed) as last_accessed,
          ROUND(
            (COUNT(CASE WHEN lp.is_completed = true THEN 1 END)::float / 
             NULLIF(COUNT(mm.id), 0)) * 100, 2
          ) as completion_percentage
        FROM modules m
        LEFT JOIN module_materials mm ON m.id = mm.module_id
        LEFT JOIN learning_progress lp ON mm.id = lp.material_id AND lp.user_id = $1
        WHERE m.is_published = true
        GROUP BY m.id, m.title
        ORDER BY last_accessed DESC NULLS LAST
      `,

      // Get popular materials (optimized with materialized view concept)
      getPopularMaterials: sql`
        SELECT 
          mm.*,
          m.title as module_title,
          COUNT(lp.id) as access_count,
          AVG(CASE WHEN lp.is_completed THEN 1 ELSE 0 END) as completion_rate
        FROM module_materials mm
        INNER JOIN modules m ON mm.module_id = m.id
        LEFT JOIN learning_progress lp ON mm.id = lp.material_id
        WHERE m.is_published = true
          AND mm.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY mm.id, m.title
        HAVING COUNT(lp.id) > 0
        ORDER BY access_count DESC, completion_rate DESC
        LIMIT $1
      `
    };
  }

  /**
   * Execute query with performance monitoring
   */
  async executeWithMonitoring<T>(
    queryFn: () => Promise<T>,
    queryId: string,
    query: string,
    userId?: string,
    endpoint?: string
  ): Promise<T> {
    this.monitor.startQuery(queryId, query, userId, endpoint);
    
    try {
      const result = await queryFn();
      
      // Estimate rows affected (this would need to be passed from the actual query result)
      const rowsAffected = Array.isArray(result) ? result.length : 1;
      
      this.monitor.endQuery(queryId, rowsAffected, userId, endpoint);
      return result;
    } catch (error) {
      this.monitor.endQuery(queryId, 0, userId, endpoint);
      throw error;
    }
  }
}

/**
 * Database Index Recommendations
 */
export const RECOMMENDED_INDEXES = {
  // Quiz-related indexes
  quizzes: [
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quizzes_published_language ON quizzes(is_published, language, created_at) WHERE is_published = true;',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quizzes_end_date ON quizzes(end_date) WHERE end_date IS NOT NULL;',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quizzes_created_at ON quizzes(created_at DESC);'
  ],
  
  quiz_attempts: [
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_attempts_user_quiz ON quiz_attempts(user_id, quiz_id, created_at DESC);',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_attempts_quiz_completed ON quiz_attempts(quiz_id, is_completed, completed_at) WHERE is_completed = true;',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_attempts_user_completed ON quiz_attempts(user_id, is_completed, completed_at) WHERE is_completed = true;'
  ],
  
  quiz_questions: [
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_questions_quiz_order ON quiz_questions(quiz_id, order_index);'
  ],
  
  // Learning material indexes
  modules: [
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_modules_published ON modules(is_published, created_at) WHERE is_published = true;'
  ],
  
  module_materials: [
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_module_materials_module_order ON module_materials(module_id, order_index);',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_module_materials_type ON module_materials(content_type);'
  ],
  
  learning_progress: [
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_learning_progress_user_material ON learning_progress(user_id, material_id);',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_learning_progress_material_completed ON learning_progress(material_id, is_completed, last_accessed) WHERE is_completed = true;',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_learning_progress_user_accessed ON learning_progress(user_id, last_accessed DESC);'
  ],
  
  // User-related indexes
  users: [
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users(role);'
  ]
};

/**
 * Query optimization utilities
 */
export function generateIndexCreationScript(): string {
  const allIndexes = Object.values(RECOMMENDED_INDEXES).flat();
  return allIndexes.join('\n\n') + '\n';
}

/**
 * Analyze query performance and suggest optimizations
 */
export function analyzeQueryPerformance(metrics: QueryPerformanceMetrics[]): {
  slowQueries: QueryPerformanceMetrics[];
  recommendations: string[];
  averageExecutionTime: number;
} {
  const slowQueries = metrics.filter(m => m.executionTime > DEFAULT_QUERY_CONFIG.slowQueryThreshold);
  const averageExecutionTime = metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length;
  
  const recommendations: string[] = [];
  
  if (slowQueries.length > 0) {
    recommendations.push(`Found ${slowQueries.length} slow queries. Consider adding indexes or optimizing query structure.`);
  }
  
  if (averageExecutionTime > 500) {
    recommendations.push('Average query execution time is high. Review database indexes and query optimization.');
  }
  
  const endpointCounts = metrics.reduce((acc, m) => {
    if (m.endpoint) {
      acc[m.endpoint] = (acc[m.endpoint] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  const highVolumeEndpoints = Object.entries(endpointCounts)
    .filter(([, count]) => count > 100)
    .map(([endpoint]) => endpoint);
  
  if (highVolumeEndpoints.length > 0) {
    recommendations.push(`High query volume detected on endpoints: ${highVolumeEndpoints.join(', ')}. Consider caching strategies.`);
  }
  
  return {
    slowQueries,
    recommendations,
    averageExecutionTime
  };
}

// Export singleton instances
export const queryMonitor = QueryPerformanceMonitor.getInstance();
export const queryBuilder = new AwarenessLabQueryBuilder();