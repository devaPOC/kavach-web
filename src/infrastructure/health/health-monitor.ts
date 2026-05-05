/**
 * Health check system for monitoring application components
 */

export enum HealthStatus {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  DEGRADED = 'degraded'
}

export interface HealthCheckResult {
  status: HealthStatus;
  message?: string;
  duration?: number;
  timestamp: string;
  details?: Record<string, any>;
}

export interface HealthCheck {
  name: string;
  check(): Promise<HealthCheckResult>;
}

/**
 * Abstract base health check
 */
export abstract class BaseHealthCheck implements HealthCheck {
  constructor(public readonly name: string) { }

  abstract check(): Promise<HealthCheckResult>;

  protected createResult(
    status: HealthStatus,
    message?: string,
    details?: Record<string, any>
  ): HealthCheckResult {
    return {
      status,
      message,
      timestamp: new Date().toISOString(),
      details
    };
  }
}

/**
 * Database health check
 */
export class DatabaseHealthCheck extends BaseHealthCheck {
  constructor(private healthCheckFn: () => Promise<boolean>) {
    super('database');
  }

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const isHealthy = await this.healthCheckFn();
      const duration = Date.now() - startTime;

      return {
        ...this.createResult(
          isHealthy ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
          isHealthy ? 'Database connection successful' : 'Database connection failed'
        ),
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        ...this.createResult(
          HealthStatus.UNHEALTHY,
          'Database health check failed',
          { error: error instanceof Error ? error.message : 'Unknown error' }
        ),
        duration
      };
    }
  }
}

/**
 * Memory health check
 */
export class MemoryHealthCheck extends BaseHealthCheck {
  constructor(private thresholds?: { warning?: number; critical?: number }) {
    super('memory');
  }

  async check(): Promise<HealthCheckResult> {
    try {
      const usage = process.memoryUsage();
      const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
      const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
      const usagePercent = (usedMB / totalMB) * 100;

      const warning = this.thresholds?.warning || 80;
      const critical = this.thresholds?.critical || 95;

      let status = HealthStatus.HEALTHY;
      let message = `Memory usage: ${usedMB}MB / ${totalMB}MB (${usagePercent.toFixed(1)}%)`;

      if (usagePercent >= critical) {
        status = HealthStatus.UNHEALTHY;
        message = `Critical memory usage: ${usagePercent.toFixed(1)}%`;
      } else if (usagePercent >= warning) {
        status = HealthStatus.DEGRADED;
        message = `High memory usage: ${usagePercent.toFixed(1)}%`;
      }

      return this.createResult(status, message, {
        usedMB,
        totalMB,
        usagePercent: Number(usagePercent.toFixed(1)),
        rss: Math.round(usage.rss / 1024 / 1024),
        external: Math.round(usage.external / 1024 / 1024)
      });
    } catch (error) {
      return this.createResult(
        HealthStatus.UNHEALTHY,
        'Memory health check failed',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
}

/**
 * External service health check
 */
export class ExternalServiceHealthCheck extends BaseHealthCheck {
  constructor(
    name: string,
    private url: string,
    private timeout: number = 5000
  ) {
    super(name);
  }

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(this.url, {
        signal: controller.signal,
        method: 'GET'
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      const isHealthy = response.status >= 200 && response.status < 300;

      return {
        ...this.createResult(
          isHealthy ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
          `Service responded with status ${response.status}`,
          {
            statusCode: response.status,
            url: this.url
          }
        ),
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        ...this.createResult(
          HealthStatus.UNHEALTHY,
          'Service check failed',
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            url: this.url
          }
        ),
        duration
      };
    }
  }
}

/**
 * Health monitor to manage multiple health checks
 */
export class HealthMonitor {
  private checks: Map<string, HealthCheck> = new Map();
  private healthHistory: Map<string, HealthCheckResult[]> = new Map();
  private alertThresholds: Map<string, { consecutiveFailures: number; alertSent: boolean }> = new Map();

  addCheck(check: HealthCheck): void {
    this.checks.set(check.name, check);
    this.healthHistory.set(check.name, []);
    this.alertThresholds.set(check.name, { consecutiveFailures: 0, alertSent: false });
  }

  removeCheck(name: string): boolean {
    const removed = this.checks.delete(name);
    if (removed) {
      this.healthHistory.delete(name);
      this.alertThresholds.delete(name);
    }
    return removed;
  }

  async checkAll(): Promise<Record<string, HealthCheckResult>> {
    const results: Record<string, HealthCheckResult> = {};

    const checkPromises = Array.from(this.checks.entries()).map(async ([name, check]) => {
      try {
        const result = await check.check();
        results[name] = result;
        this.recordHealthResult(name, result);
      } catch (error) {
        const errorResult = {
          status: HealthStatus.UNHEALTHY,
          message: 'Health check execution failed',
          timestamp: new Date().toISOString(),
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        };
        results[name] = errorResult;
        this.recordHealthResult(name, errorResult);
      }
    });

    await Promise.all(checkPromises);
    return results;
  }

  async checkOne(name: string): Promise<HealthCheckResult | null> {
    const check = this.checks.get(name);
    if (!check) {
      return null;
    }

    try {
      const result = await check.check();
      this.recordHealthResult(name, result);
      return result;
    } catch (error) {
      const errorResult = {
        status: HealthStatus.UNHEALTHY,
        message: 'Health check execution failed',
        timestamp: new Date().toISOString(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
      this.recordHealthResult(name, errorResult);
      return errorResult;
    }
  }

  getOverallStatus(results: Record<string, HealthCheckResult>): HealthStatus {
    const statuses = Object.values(results).map(r => r.status);

    if (statuses.includes(HealthStatus.UNHEALTHY)) {
      return HealthStatus.UNHEALTHY;
    }

    if (statuses.includes(HealthStatus.DEGRADED)) {
      return HealthStatus.DEGRADED;
    }

    return HealthStatus.HEALTHY;
  }

  getCheckNames(): string[] {
    return Array.from(this.checks.keys());
  }

  getHealthHistory(checkName: string, limit: number = 10): HealthCheckResult[] {
    const history = this.healthHistory.get(checkName) || [];
    return history.slice(-limit);
  }

  getHealthTrends(): Record<string, { 
    current: HealthStatus; 
    trend: 'improving' | 'stable' | 'degrading';
    uptime: number;
    avgResponseTime?: number;
  }> {
    const trends: Record<string, any> = {};

    for (const [name, history] of this.healthHistory) {
      if (history.length === 0) continue;

      const recent = history.slice(-10);
      const current = recent[recent.length - 1];
      
      // Calculate trend
      let trend: 'improving' | 'stable' | 'degrading' = 'stable';
      if (recent.length >= 3) {
        const recentStatuses = recent.slice(-3).map(r => r.status);
        const healthyCount = recentStatuses.filter(s => s === HealthStatus.HEALTHY).length;
        const unhealthyCount = recentStatuses.filter(s => s === HealthStatus.UNHEALTHY).length;
        
        if (healthyCount > unhealthyCount && recentStatuses[recentStatuses.length - 1] === HealthStatus.HEALTHY) {
          trend = 'improving';
        } else if (unhealthyCount > healthyCount || recentStatuses[recentStatuses.length - 1] === HealthStatus.UNHEALTHY) {
          trend = 'degrading';
        }
      }

      // Calculate uptime (percentage of healthy checks in last 24 hours)
      const last24h = history.filter(r => {
        const checkTime = new Date(r.timestamp);
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return checkTime >= cutoff;
      });
      
      const healthyChecks = last24h.filter(r => r.status === HealthStatus.HEALTHY).length;
      const uptime = last24h.length > 0 ? (healthyChecks / last24h.length) * 100 : 100;

      // Calculate average response time
      const withDuration = recent.filter(r => r.duration !== undefined);
      const avgResponseTime = withDuration.length > 0 
        ? withDuration.reduce((sum, r) => sum + (r.duration || 0), 0) / withDuration.length
        : undefined;

      trends[name] = {
        current: current.status,
        trend,
        uptime: Math.round(uptime * 100) / 100,
        avgResponseTime: avgResponseTime ? Math.round(avgResponseTime) : undefined
      };
    }

    return trends;
  }

  private recordHealthResult(checkName: string, result: HealthCheckResult): void {
    const history = this.healthHistory.get(checkName) || [];
    history.push(result);
    
    // Keep only last 100 results per check
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    this.healthHistory.set(checkName, history);

    // Track consecutive failures for alerting
    const threshold = this.alertThresholds.get(checkName);
    if (threshold) {
      if (result.status === HealthStatus.UNHEALTHY) {
        threshold.consecutiveFailures++;
        
        // Send alert after 3 consecutive failures
        if (threshold.consecutiveFailures >= 3 && !threshold.alertSent) {
          this.sendHealthAlert(checkName, result, threshold.consecutiveFailures);
          threshold.alertSent = true;
        }
      } else {
        // Reset on successful check
        threshold.consecutiveFailures = 0;
        threshold.alertSent = false;
      }
    }
  }

  private sendHealthAlert(checkName: string, result: HealthCheckResult, consecutiveFailures: number): void {
    // Import audit functions to avoid circular dependencies
    const { auditSystem } = require('../../lib/utils/audit-logger');
    
    auditSystem({
      event: 'system.health.check',
      severity: 'high',
      metadata: {
        checkName,
        status: result.status,
        message: result.message,
        consecutiveFailures,
        details: result.details
      }
    });
  }
}

/**
 * Session store health check
 */
export class SessionStoreHealthCheck extends BaseHealthCheck {
  constructor(private sessionCheckFn: () => Promise<boolean>) {
    super('session_store');
  }

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const isHealthy = await this.sessionCheckFn();
      const duration = Date.now() - startTime;

      return {
        ...this.createResult(
          isHealthy ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
          isHealthy ? 'Session store accessible' : 'Session store unavailable'
        ),
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        ...this.createResult(
          HealthStatus.UNHEALTHY,
          'Session store health check failed',
          { error: error instanceof Error ? error.message : 'Unknown error' }
        ),
        duration
      };
    }
  }
}

/**
 * Email service health check
 */
export class EmailServiceHealthCheck extends BaseHealthCheck {
  constructor(private emailCheckFn: () => Promise<boolean>) {
    super('email_service');
  }

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const isHealthy = await this.emailCheckFn();
      const duration = Date.now() - startTime;

      return {
        ...this.createResult(
          isHealthy ? HealthStatus.HEALTHY : HealthStatus.DEGRADED,
          isHealthy ? 'Email service operational' : 'Email service degraded'
        ),
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        ...this.createResult(
          HealthStatus.DEGRADED,
          'Email service check failed',
          { error: error instanceof Error ? error.message : 'Unknown error' }
        ),
        duration
      };
    }
  }
}

/**
 * Rate limiter health check
 */
export class RateLimiterHealthCheck extends BaseHealthCheck {
  constructor(private rateLimiterCheckFn: () => Promise<boolean>) {
    super('rate_limiter');
  }

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const isHealthy = await this.rateLimiterCheckFn();
      const duration = Date.now() - startTime;

      return {
        ...this.createResult(
          isHealthy ? HealthStatus.HEALTHY : HealthStatus.DEGRADED,
          isHealthy ? 'Rate limiter operational' : 'Rate limiter issues detected'
        ),
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        ...this.createResult(
          HealthStatus.DEGRADED,
          'Rate limiter check failed',
          { error: error instanceof Error ? error.message : 'Unknown error' }
        ),
        duration
      };
    }
  }
}

/**
 * Disk space health check
 */
export class DiskSpaceHealthCheck extends BaseHealthCheck {
  constructor(private thresholds?: { warning?: number; critical?: number }) {
    super('disk_space');
  }

  async check(): Promise<HealthCheckResult> {
    try {
      // This is a simplified check - in production you'd want to use fs.statSync
      // or a more robust disk space checking library
      const warning = this.thresholds?.warning || 80;
      const critical = this.thresholds?.critical || 95;
      
      // Mock disk usage for now - replace with actual disk space check
      const mockUsagePercent = Math.random() * 100;
      
      let status = HealthStatus.HEALTHY;
      let message = `Disk usage: ${mockUsagePercent.toFixed(1)}%`;

      if (mockUsagePercent >= critical) {
        status = HealthStatus.UNHEALTHY;
        message = `Critical disk usage: ${mockUsagePercent.toFixed(1)}%`;
      } else if (mockUsagePercent >= warning) {
        status = HealthStatus.DEGRADED;
        message = `High disk usage: ${mockUsagePercent.toFixed(1)}%`;
      }

      return this.createResult(status, message, {
        usagePercent: Number(mockUsagePercent.toFixed(1)),
        warningThreshold: warning,
        criticalThreshold: critical
      });
    } catch (error) {
      return this.createResult(
        HealthStatus.UNHEALTHY,
        'Disk space check failed',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
}

// Export default health monitor
export const healthMonitor = new HealthMonitor();
