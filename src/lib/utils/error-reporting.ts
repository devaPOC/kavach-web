/**
 * Automatic Error Reporting System
 * Provides comprehensive error tracking with correlation IDs and context
 */

import { AwarenessLabError, AwarenessLabErrorCode } from '@/lib/errors/awareness-lab-errors';

// Error report structure
export interface ErrorReport {
  id: string;
  correlationId: string;
  timestamp: string;
  error: {
    name: string;
    message: string;
    code?: string;
    category?: string;
    statusCode?: number;
    stack?: string;
    retryable?: boolean;
  };
  context: {
    userId?: string;
    sessionId?: string;
    userAgent: string;
    url: string;
    referrer: string;
    viewport: {
      width: number;
      height: number;
    };
    timestamp: string;
    environment: string;
    version: string;
  };
  system: {
    platform: string;
    language: string;
    timezone: string;
    cookiesEnabled: boolean;
    localStorageEnabled: boolean;
    onlineStatus: boolean;
  };
  performance?: {
    memory?: {
      used: number;
      total: number;
    };
    timing?: {
      navigationStart: number;
      loadEventEnd: number;
      domContentLoadedEventEnd: number;
    };
  };
  breadcrumbs: Breadcrumb[];
  tags: Record<string, string>;
  level: 'error' | 'warning' | 'info' | 'debug';
  fingerprint?: string;
}

// Breadcrumb for tracking user actions leading to error
export interface Breadcrumb {
  timestamp: string;
  category: string;
  message: string;
  level: 'error' | 'warning' | 'info' | 'debug';
  data?: Record<string, any>;
}

// Error reporting configuration
export interface ErrorReportingConfig {
  enabled: boolean;
  endpoint?: string;
  apiKey?: string;
  maxBreadcrumbs: number;
  maxReportsPerSession: number;
  enablePerformanceData: boolean;
  enableStackTrace: boolean;
  enableUserContext: boolean;
  sampleRate: number; // 0-1, percentage of errors to report
  beforeSend?: (report: ErrorReport) => ErrorReport | null;
  onReportSent?: (report: ErrorReport, success: boolean) => void;
}

// Default configuration
const DEFAULT_CONFIG: ErrorReportingConfig = {
  enabled: process.env.NODE_ENV === 'production',
  maxBreadcrumbs: 50,
  maxReportsPerSession: 100,
  enablePerformanceData: true,
  enableStackTrace: true,
  enableUserContext: true,
  sampleRate: 1.0
};

/**
 * Error Reporting Service
 */
export class ErrorReportingService {
  private static instance: ErrorReportingService;
  private config: ErrorReportingConfig;
  private breadcrumbs: Breadcrumb[] = [];
  private reportCount = 0;
  private correlationIdCounter = 0;
  private sessionId: string;

  private constructor(config: Partial<ErrorReportingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = this.generateSessionId();
    
    if (this.config.enabled) {
      this.setupGlobalErrorHandlers();
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<ErrorReportingConfig>): ErrorReportingService {
    if (!ErrorReportingService.instance) {
      ErrorReportingService.instance = new ErrorReportingService(config);
    }
    return ErrorReportingService.instance;
  }

  /**
   * Report an error
   */
  async reportError(
    error: Error | AwarenessLabError,
    context: Partial<ErrorReport['context']> = {},
    tags: Record<string, string> = {}
  ): Promise<string | null> {
    if (!this.config.enabled || !this.shouldReport()) {
      return null;
    }

    if (this.reportCount >= this.config.maxReportsPerSession) {
      console.warn('Maximum error reports per session reached');
      return null;
    }

    try {
      const correlationId = this.generateCorrelationId();
      const report = this.createErrorReport(error, context, tags, correlationId);
      
      // Apply beforeSend filter
      const filteredReport = this.config.beforeSend ? this.config.beforeSend(report) : report;
      if (!filteredReport) {
        return null;
      }

      // Send report
      const success = await this.sendReport(filteredReport);
      
      // Call onReportSent callback
      this.config.onReportSent?.(filteredReport, success);
      
      if (success) {
        this.reportCount++;
        console.debug(`Error reported with correlation ID: ${correlationId}`);
        return correlationId;
      }

      return null;
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
      return null;
    }
  }

  /**
   * Add breadcrumb for tracking user actions
   */
  addBreadcrumb(
    category: string,
    message: string,
    level: Breadcrumb['level'] = 'info',
    data?: Record<string, any>
  ): void {
    if (!this.config.enabled) return;

    const breadcrumb: Breadcrumb = {
      timestamp: new Date().toISOString(),
      category,
      message,
      level,
      data
    };

    this.breadcrumbs.push(breadcrumb);

    // Keep only the most recent breadcrumbs
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.config.maxBreadcrumbs);
    }
  }

  /**
   * Set user context
   */
  setUserContext(userId: string, additionalData?: Record<string, any>): void {
    this.addBreadcrumb('user', 'User context updated', 'info', {
      userId,
      ...additionalData
    });
  }

  /**
   * Set tags for all subsequent error reports
   */
  setTags(tags: Record<string, string>): void {
    // Store tags in breadcrumbs for context
    this.addBreadcrumb('system', 'Tags updated', 'debug', { tags });
  }

  /**
   * Create error report
   */
  private createErrorReport(
    error: Error | AwarenessLabError,
    context: Partial<ErrorReport['context']>,
    tags: Record<string, string>,
    correlationId: string
  ): ErrorReport {
    const reportId = this.generateReportId();
    const timestamp = new Date().toISOString();

    // Extract error information
    const errorInfo = {
      name: error.name,
      message: error.message,
      stack: this.config.enableStackTrace ? error.stack : undefined,
      ...(error instanceof AwarenessLabError && {
        code: error.code,
        category: error.category,
        statusCode: error.statusCode,
        retryable: error.retryable
      })
    };

    // Gather system context
    const systemContext = this.gatherSystemContext();
    const performanceData = this.config.enablePerformanceData ? this.gatherPerformanceData() : undefined;

    // Create full context
    const fullContext = {
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      referrer: typeof window !== 'undefined' ? document.referrer : '',
      viewport: typeof window !== 'undefined' ? {
        width: window.innerWidth,
        height: window.innerHeight
      } : { width: 0, height: 0 },
      timestamp,
      environment: process.env.NODE_ENV || 'unknown',
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      ...context
    };

    // Generate fingerprint for error grouping
    const fingerprint = this.generateFingerprint(error);

    return {
      id: reportId,
      correlationId,
      timestamp,
      error: errorInfo,
      context: fullContext,
      system: systemContext,
      performance: performanceData,
      breadcrumbs: [...this.breadcrumbs],
      tags,
      level: 'error',
      fingerprint
    };
  }

  /**
   * Gather system context information
   */
  private gatherSystemContext(): ErrorReport['system'] {
    if (typeof window === 'undefined') {
      return {
        platform: 'server',
        language: 'unknown',
        timezone: 'unknown',
        cookiesEnabled: false,
        localStorageEnabled: false,
        onlineStatus: true
      };
    }

    return {
      platform: window.navigator.platform,
      language: window.navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookiesEnabled: window.navigator.cookieEnabled,
      localStorageEnabled: this.isLocalStorageEnabled(),
      onlineStatus: window.navigator.onLine
    };
  }

  /**
   * Gather performance data
   */
  private gatherPerformanceData(): ErrorReport['performance'] | undefined {
    if (typeof window === 'undefined') return undefined;

    const performance: ErrorReport['performance'] = {};

    // Memory information (if available)
    if ('memory' in window.performance) {
      const memory = (window.performance as any).memory;
      performance.memory = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize
      };
    }

    // Navigation timing
    if (window.performance.timing) {
      performance.timing = {
        navigationStart: window.performance.timing.navigationStart,
        loadEventEnd: window.performance.timing.loadEventEnd,
        domContentLoadedEventEnd: window.performance.timing.domContentLoadedEventEnd
      };
    }

    return performance;
  }

  /**
   * Check if localStorage is available
   */
  private isLocalStorageEnabled(): boolean {
    try {
      const testKey = 'test_localStorage';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate fingerprint for error grouping
   */
  private generateFingerprint(error: Error): string {
    const components = [
      error.name,
      error.message.replace(/\d+/g, 'N'), // Replace numbers with N for grouping
      error.stack?.split('\n')[0] || '' // First line of stack trace
    ];

    return this.hashString(components.join('|'));
  }

  /**
   * Simple hash function for fingerprinting
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Send error report to endpoint
   */
  private async sendReport(report: ErrorReport): Promise<boolean> {
    if (!this.config.endpoint) {
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.group(`🚨 Error Report: ${report.correlationId}`);
        console.error('Error:', report.error);
        console.log('Context:', report.context);
        console.log('Breadcrumbs:', report.breadcrumbs);
        console.groupEnd();
      }
      return true;
    }

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify(report)
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send error report:', error);
      return false;
    }
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return;

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.reportError(event.error || new Error(event.message), {
        url: event.filename,
      }, {
        source: 'global_error_handler',
        line: event.lineno?.toString() || 'unknown',
        column: event.colno?.toString() || 'unknown'
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      
      this.reportError(error, {}, {
        source: 'unhandled_promise_rejection'
      });
    });

    // Track navigation for breadcrumbs
    this.addBreadcrumb('navigation', 'Page loaded', 'info', {
      url: window.location.href
    });
  }

  /**
   * Generate unique correlation ID
   */
  private generateCorrelationId(): string {
    this.correlationIdCounter++;
    const timestamp = Date.now().toString(36);
    const counter = this.correlationIdCounter.toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `${timestamp}-${counter}-${random}`;
  }

  /**
   * Generate unique report ID
   */
  private generateReportId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `err_${timestamp}_${random}`;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `sess_${timestamp}_${random}`;
  }

  /**
   * Determine if error should be reported based on sample rate
   */
  private shouldReport(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ErrorReportingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Clear breadcrumbs
   */
  clearBreadcrumbs(): void {
    this.breadcrumbs = [];
  }

  /**
   * Get current session statistics
   */
  getSessionStats(): {
    sessionId: string;
    reportCount: number;
    breadcrumbCount: number;
    maxReports: number;
  } {
    return {
      sessionId: this.sessionId,
      reportCount: this.reportCount,
      breadcrumbCount: this.breadcrumbs.length,
      maxReports: this.config.maxReportsPerSession
    };
  }
}

// Utility functions

/**
 * Initialize error reporting system
 */
export function initializeErrorReporting(config?: Partial<ErrorReportingConfig>): ErrorReportingService {
  return ErrorReportingService.getInstance(config);
}

/**
 * Report error with automatic correlation ID
 */
export async function reportError(
  error: Error | AwarenessLabError,
  context?: Partial<ErrorReport['context']>,
  tags?: Record<string, string>
): Promise<string | null> {
  const service = ErrorReportingService.getInstance();
  return service.reportError(error, context, tags);
}

/**
 * Add breadcrumb for user action tracking
 */
export function addBreadcrumb(
  category: string,
  message: string,
  level?: Breadcrumb['level'],
  data?: Record<string, any>
): void {
  const service = ErrorReportingService.getInstance();
  service.addBreadcrumb(category, message, level, data);
}

/**
 * Set user context for error reports
 */
export function setUserContext(userId: string, additionalData?: Record<string, any>): void {
  const service = ErrorReportingService.getInstance();
  service.setUserContext(userId, additionalData);
}

/**
 * Create error with correlation ID
 */
export function createErrorWithCorrelation(
  code: AwarenessLabErrorCode,
  message?: string,
  field?: string,
  details?: Record<string, any>
): AwarenessLabError {
  const service = ErrorReportingService.getInstance();
  const correlationId = (service as any).generateCorrelationId();
  
  return new AwarenessLabError(code, message, field, details, correlationId);
}

// All types are already exported as interfaces above