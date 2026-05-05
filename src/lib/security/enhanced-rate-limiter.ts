/**
 * Enhanced Rate Limiter with Security Monitoring Integration
 * Provides comprehensive rate limiting with audit logging and user feedback
 */

import { NextRequest } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { emitAudit, AuditEventName } from '@/lib/utils/audit-logger';
import { securityMonitor, SecurityEventType, SecuritySeverity } from './security-monitor';
import { createId } from '@paralleldrive/cuid2';

export interface EnhancedRateLimitConfig {
  windowMs: number;
  maxAttempts: number;
  blockDurationMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (request: NextRequest) => string;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  enableSecurityMonitoring?: boolean;
  escalationThreshold?: number; // Number of violations before escalation
  progressiveBlocking?: boolean; // Increase block duration with repeated violations
}

export interface EnhancedRateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
  error?: string;
  headers?: Record<string, string>;
  securityEvent?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  userFriendlyMessage?: string;
}

export interface RateLimitRecord {
  count: number;
  resetTime: number;
  blocked?: number;
  firstRequest: number;
  lastRequest: number;
  violations: number;
  escalationLevel: number;
  userAgent?: string;
  endpoint?: string;
}

/**
 * Enhanced Rate Limit Store with Security Features
 */
class EnhancedRateLimitStore {
  private store = new Map<string, RateLimitRecord>();
  private cleanupInterval: NodeJS.Timeout;
  private suspiciousIPs = new Set<string>();
  private whitelistedIPs = new Set<string>();

  constructor() {
    // Cleanup expired entries every 2 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 2 * 60 * 1000);

    // Initialize whitelisted IPs (localhost, etc.)
    this.whitelistedIPs.add('127.0.0.1');
    this.whitelistedIPs.add('::1');
    this.whitelistedIPs.add('localhost');
  }

  get(key: string): RateLimitRecord | undefined {
    return this.store.get(key);
  }

  set(key: string, value: RateLimitRecord): void {
    this.store.set(key, value);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  isWhitelisted(ip: string): boolean {
    return this.whitelistedIPs.has(ip);
  }

  addToWhitelist(ip: string): void {
    this.whitelistedIPs.add(ip);
    logger.info('IP added to whitelist', { ip });
  }

  removeFromWhitelist(ip: string): void {
    this.whitelistedIPs.delete(ip);
    logger.info('IP removed from whitelist', { ip });
  }

  markSuspicious(ip: string): void {
    this.suspiciousIPs.add(ip);
    logger.warn('IP marked as suspicious', { ip });
  }

  isSuspicious(ip: string): boolean {
    return this.suspiciousIPs.has(ip);
  }

  // Get all keys for monitoring
  getAllKeys(): string[] {
    return Array.from(this.store.keys());
  }

  // Get store statistics
  getStats(): {
    totalKeys: number;
    blockedKeys: number;
    suspiciousIPs: number;
    whitelistedIPs: number;
    memoryUsage: number;
    highViolationKeys: number;
  } {
    const now = Date.now();
    let blockedKeys = 0;
    let highViolationKeys = 0;
    let memoryUsage = 0;

    for (const [key, record] of this.store.entries()) {
      if (record.blocked && record.blocked > now) {
        blockedKeys++;
      }
      if (record.violations >= 5) {
        highViolationKeys++;
      }
      memoryUsage += JSON.stringify({ key, record }).length;
    }

    return {
      totalKeys: this.store.size,
      blockedKeys,
      suspiciousIPs: this.suspiciousIPs.size,
      whitelistedIPs: this.whitelistedIPs.size,
      memoryUsage,
      highViolationKeys
    };
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of this.store.entries()) {
      if (value.resetTime < now && (!value.blocked || value.blocked < now)) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info('Enhanced rate limit store cleanup', { cleaned, remaining: this.store.size });
    }
  }

  // Get top violators with detailed information
  getTopViolators(limit: number = 10): Array<{
    key: string;
    violations: number;
    escalationLevel: number;
    lastViolation: Date;
    isBlocked: boolean;
    userAgent?: string;
    endpoint?: string;
  }> {
    const now = Date.now();
    const violators: Array<{
      key: string;
      violations: number;
      escalationLevel: number;
      lastViolation: Date;
      isBlocked: boolean;
      userAgent?: string;
      endpoint?: string;
    }> = [];

    for (const [key, record] of this.store.entries()) {
      if (record.violations && record.violations > 0) {
        violators.push({
          key,
          violations: record.violations,
          escalationLevel: record.escalationLevel,
          lastViolation: new Date(record.lastRequest),
          isBlocked: !!(record.blocked && record.blocked > now),
          userAgent: record.userAgent,
          endpoint: record.endpoint
        });
      }
    }

    return violators
      .sort((a, b) => b.violations - a.violations)
      .slice(0, limit);
  }

  // Clear all entries
  clear(): void {
    this.store.clear();
    this.suspiciousIPs.clear();
  }

  // Destroy the store
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

const enhancedRateLimitStore = new EnhancedRateLimitStore();

/**
 * Enhanced rate limit check with security monitoring
 */
export async function checkEnhancedRateLimit(
  request: NextRequest,
  config: EnhancedRateLimitConfig,
  identifier?: string
): Promise<EnhancedRateLimitResult> {
  const key = identifier || config.keyGenerator?.(request) || getEnhancedDefaultKey(request);
  const now = Date.now();
  const ip = extractIPFromKey(key);

  try {
    // Check if IP is whitelisted
    if (ip && enhancedRateLimitStore.isWhitelisted(ip)) {
      return {
        success: true,
        limit: config.maxAttempts,
        remaining: config.maxAttempts,
        resetTime: new Date(now + config.windowMs),
        riskLevel: 'low',
        userFriendlyMessage: 'Request allowed (whitelisted)'
      };
    }

    const record = enhancedRateLimitStore.get(key);
    
    // Check if currently blocked
    if (record?.blocked && record.blocked > now) {
      const retryAfter = Math.ceil((record.blocked - now) / 1000);
      const riskLevel = determineRiskLevel(record.violations, record.escalationLevel);
      
      // Log blocked attempt with enhanced details
      logger.warn('Enhanced rate limit blocked request', {
        key,
        retryAfter,
        violations: record.violations,
        escalationLevel: record.escalationLevel,
        endpoint: request.nextUrl.pathname,
        userAgent: request.headers.get('user-agent')?.substring(0, 100)
      });

      // Create security event if monitoring is enabled
      let securityEventId: string | undefined;
      if (config.enableSecurityMonitoring !== false) {
        const securityResult = await securityMonitor.monitorRequest(request, {
          userId: undefined,
          sessionId: undefined,
          ipAddress: ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          metadata: {
            rateLimitViolations: record.violations,
            escalationLevel: record.escalationLevel,
            blockedUntil: record.blocked
          }
        });
        securityEventId = securityResult.event.id;
      }

      // Emit audit event for blocked request
      emitAudit({
        event: 'security.rate_limit.blocked' as AuditEventName,
        userId: 'anonymous',
        requestId: securityEventId || createId(),
        severity: riskLevel === 'critical' ? 'high' : 'medium',
        success: false,
        metadata: {
          key,
          retryAfter,
          violations: record.violations,
          escalationLevel: record.escalationLevel,
          endpoint: request.nextUrl.pathname,
          method: request.method,
          riskLevel
        }
      });

      // Mark IP as suspicious if high violation count
      if (ip && record.violations >= 10) {
        enhancedRateLimitStore.markSuspicious(ip);
      }
      
      return {
        success: false,
        limit: config.maxAttempts,
        remaining: 0,
        resetTime: new Date(record.blocked),
        retryAfter,
        error: config.message || generateUserFriendlyMessage(retryAfter, record.violations),
        headers: generateEnhancedHeaders(config, {
          limit: config.maxAttempts,
          remaining: 0,
          resetTime: new Date(record.blocked),
          retryAfter
        }),
        securityEvent: securityEventId,
        riskLevel,
        userFriendlyMessage: generateUserFriendlyMessage(retryAfter, record.violations)
      };
    }
    
    // Initialize or reset window if expired
    if (!record || record.resetTime <= now) {
      const resetTime = now + config.windowMs;
      const newRecord: RateLimitRecord = {
        count: 1,
        resetTime,
        firstRequest: now,
        lastRequest: now,
        violations: record?.violations || 0,
        escalationLevel: record?.escalationLevel || 0,
        userAgent: request.headers.get('user-agent')?.substring(0, 100),
        endpoint: request.nextUrl.pathname
      };
      
      enhancedRateLimitStore.set(key, newRecord);
      
      return {
        success: true,
        limit: config.maxAttempts,
        remaining: config.maxAttempts - 1,
        resetTime: new Date(resetTime),
        headers: generateEnhancedHeaders(config, {
          limit: config.maxAttempts,
          remaining: config.maxAttempts - 1,
          resetTime: new Date(resetTime)
        }),
        riskLevel: 'low',
        userFriendlyMessage: 'Request allowed'
      };
    }
    
    // Increment counter
    const newCount = record.count + 1;
    const updatedRecord: RateLimitRecord = {
      ...record,
      count: newCount,
      lastRequest: now,
      userAgent: request.headers.get('user-agent')?.substring(0, 100),
      endpoint: request.nextUrl.pathname
    };
    
    if (newCount > config.maxAttempts) {
      // Calculate progressive blocking duration
      const blockDuration = config.progressiveBlocking 
        ? calculateProgressiveBlockDuration(config.blockDurationMs, record.escalationLevel)
        : config.blockDurationMs;
      
      // Block the key
      const blockedUntil = now + blockDuration;
      updatedRecord.blocked = blockedUntil;
      updatedRecord.violations = (record.violations || 0) + 1;
      updatedRecord.escalationLevel = Math.min((record.escalationLevel || 0) + 1, 10);
      
      enhancedRateLimitStore.set(key, updatedRecord);
      
      const retryAfter = Math.ceil(blockDuration / 1000);
      const riskLevel = determineRiskLevel(updatedRecord.violations, updatedRecord.escalationLevel);
      
      logger.warn('Enhanced rate limit exceeded - blocking key', {
        key,
        attempts: newCount,
        limit: config.maxAttempts,
        blockedUntil: new Date(blockedUntil),
        violations: updatedRecord.violations,
        escalationLevel: updatedRecord.escalationLevel,
        blockDuration,
        endpoint: request.nextUrl.pathname,
        riskLevel
      });

      // Create security event if monitoring is enabled
      let securityEventId: string | undefined;
      if (config.enableSecurityMonitoring !== false) {
        const securityResult = await securityMonitor.monitorRequest(request, {
          userId: undefined,
          sessionId: undefined,
          ipAddress: ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          metadata: {
            rateLimitViolations: updatedRecord.violations,
            escalationLevel: updatedRecord.escalationLevel,
            newViolation: true
          }
        });
        securityEventId = securityResult.event.id;
      }

      // Emit audit event for rate limit violation
      emitAudit({
        event: 'security.rate_limit.exceeded' as AuditEventName,
        userId: 'anonymous',
        requestId: securityEventId || createId(),
        severity: riskLevel === 'critical' ? 'high' : updatedRecord.violations > 3 ? 'high' : 'medium',
        success: false,
        metadata: {
          key,
          attempts: newCount,
          limit: config.maxAttempts,
          violations: updatedRecord.violations,
          escalationLevel: updatedRecord.escalationLevel,
          endpoint: request.nextUrl.pathname,
          method: request.method,
          blockDuration,
          riskLevel
        }
      });

      // Check for escalation threshold
      if (config.escalationThreshold && updatedRecord.violations >= config.escalationThreshold) {
        await handleEscalation(key, updatedRecord, request);
      }
      
      return {
        success: false,
        limit: config.maxAttempts,
        remaining: 0,
        resetTime: new Date(record.resetTime),
        retryAfter,
        error: config.message || generateUserFriendlyMessage(retryAfter, updatedRecord.violations),
        headers: generateEnhancedHeaders(config, {
          limit: config.maxAttempts,
          remaining: 0,
          resetTime: new Date(record.resetTime),
          retryAfter
        }),
        securityEvent: securityEventId,
        riskLevel,
        userFriendlyMessage: generateUserFriendlyMessage(retryAfter, updatedRecord.violations)
      };
    }
    
    // Update counter
    enhancedRateLimitStore.set(key, updatedRecord);
    
    const remaining = config.maxAttempts - newCount;
    const riskLevel = remaining <= 2 ? 'medium' : 'low';
    
    // Log warning when approaching limit
    if (remaining <= 2) {
      logger.warn('Enhanced rate limit approaching', {
        key,
        attempts: newCount,
        remaining,
        endpoint: request.nextUrl.pathname
      });
    }
    
    return {
      success: true,
      limit: config.maxAttempts,
      remaining,
      resetTime: new Date(record.resetTime),
      headers: generateEnhancedHeaders(config, {
        limit: config.maxAttempts,
        remaining,
        resetTime: new Date(record.resetTime)
      }),
      riskLevel,
      userFriendlyMessage: remaining <= 2 
        ? `Warning: Only ${remaining} attempts remaining`
        : 'Request allowed'
    };

  } catch (error) {
    logger.error('Enhanced rate limit check failed', { key, error });
    
    // On error, allow the request but log the issue
    return {
      success: true,
      limit: config.maxAttempts,
      remaining: config.maxAttempts,
      resetTime: new Date(now + config.windowMs),
      error: 'Rate limit check failed - allowing request',
      riskLevel: 'low'
    };
  }
}

function getEnhancedDefaultKey(request: NextRequest): string {
  // Use IP address as default key with fallbacks
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('remote-addr');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  let ip = 'unknown';
  
  if (forwarded) {
    ip = forwarded.split(',')[0].trim();
  } else if (realIp) {
    ip = realIp.trim();
  } else if (cfConnectingIP) {
    ip = cfConnectingIP.trim();
  } else if (remoteAddr) {
    ip = remoteAddr.trim();
  }
  
  // Include endpoint for more granular rate limiting
  const endpoint = request.nextUrl.pathname;
  const method = request.method;
  
  return `ip:${ip}:${method}:${endpoint}`;
}

function extractIPFromKey(key: string): string | null {
  const match = key.match(/ip:([^:]+)/);
  return match ? match[1] : null;
}

function calculateProgressiveBlockDuration(baseDuration: number, escalationLevel: number): number {
  // Exponential backoff with a maximum multiplier
  const multiplier = Math.min(Math.pow(2, escalationLevel), 32); // Max 32x
  return baseDuration * multiplier;
}

function determineRiskLevel(violations: number, escalationLevel: number): 'low' | 'medium' | 'high' | 'critical' {
  if (violations >= 20 || escalationLevel >= 8) return 'critical';
  if (violations >= 10 || escalationLevel >= 5) return 'high';
  if (violations >= 5 || escalationLevel >= 3) return 'medium';
  return 'low';
}

function generateUserFriendlyMessage(retryAfter: number, violations: number): string {
  const minutes = Math.ceil(retryAfter / 60);
  
  if (violations >= 10) {
    return `Your account has been temporarily suspended due to excessive requests. Please try again in ${minutes} minutes and contact support if this continues.`;
  } else if (violations >= 5) {
    return `Too many requests detected. Please wait ${minutes} minutes before trying again.`;
  } else {
    return `Please wait ${retryAfter < 60 ? retryAfter + ' seconds' : minutes + ' minutes'} before trying again.`;
  }
}

function generateEnhancedHeaders(
  config: EnhancedRateLimitConfig,
  result: {
    limit: number;
    remaining: number;
    resetTime: Date;
    retryAfter?: number;
  }
): Record<string, string> {
  const headers: Record<string, string> = {};

  // Standard rate limit headers (draft RFC)
  if (config.standardHeaders !== false) {
    headers['RateLimit-Limit'] = result.limit.toString();
    headers['RateLimit-Remaining'] = result.remaining.toString();
    headers['RateLimit-Reset'] = Math.ceil(result.resetTime.getTime() / 1000).toString();
    
    if (result.retryAfter) {
      headers['RateLimit-Retry-After'] = result.retryAfter.toString();
    }
  }

  // Legacy headers for backward compatibility
  if (config.legacyHeaders !== false) {
    headers['X-RateLimit-Limit'] = result.limit.toString();
    headers['X-RateLimit-Remaining'] = result.remaining.toString();
    headers['X-RateLimit-Reset'] = Math.ceil(result.resetTime.getTime() / 1000).toString();
    
    if (result.retryAfter) {
      headers['Retry-After'] = result.retryAfter.toString();
    }
  }

  return headers;
}

async function handleEscalation(key: string, record: RateLimitRecord, request: NextRequest): Promise<void> {
  const ip = extractIPFromKey(key);
  
  logger.error('Rate limit escalation threshold reached', {
    key,
    violations: record.violations,
    escalationLevel: record.escalationLevel,
    endpoint: record.endpoint,
    ip
  });

  // Mark IP as suspicious
  if (ip) {
    enhancedRateLimitStore.markSuspicious(ip);
  }

  // Emit critical audit event
  emitAudit({
    event: 'security.rate_limit.escalation' as AuditEventName,
    userId: 'anonymous',
    requestId: createId(),
    severity: 'critical',
    success: false,
    metadata: {
      key,
      violations: record.violations,
      escalationLevel: record.escalationLevel,
      endpoint: record.endpoint,
      ip,
      userAgent: record.userAgent
    }
  });

  // Additional escalation actions could be added here:
  // - Send alert to security team
  // - Add to firewall blacklist
  // - Trigger additional monitoring
}

// Enhanced rate limit monitoring
export class EnhancedRateLimitMonitor {
  static getStats() {
    return enhancedRateLimitStore.getStats();
  }

  static getAllKeys(): string[] {
    return enhancedRateLimitStore.getAllKeys();
  }

  static getRecord(key: string): RateLimitRecord | undefined {
    return enhancedRateLimitStore.get(key);
  }

  static clearRecord(key: string): void {
    enhancedRateLimitStore.delete(key);
  }

  static clearAllRecords(): void {
    enhancedRateLimitStore.clear();
  }

  static addToWhitelist(ip: string): void {
    enhancedRateLimitStore.addToWhitelist(ip);
  }

  static removeFromWhitelist(ip: string): void {
    enhancedRateLimitStore.removeFromWhitelist(ip);
  }

  static isWhitelisted(ip: string): boolean {
    return enhancedRateLimitStore.isWhitelisted(ip);
  }

  static isSuspicious(ip: string): boolean {
    return enhancedRateLimitStore.isSuspicious(ip);
  }

  static getTopViolators(limit: number = 10) {
    return enhancedRateLimitStore.getTopViolators(limit);
  }

  static getBlockedKeys(): Array<{ key: string; blockedUntil: Date; violations: number; riskLevel: string }> {
    const now = Date.now();
    const blocked: Array<{ key: string; blockedUntil: Date; violations: number; riskLevel: string }> = [];

    for (const [key, record] of enhancedRateLimitStore['store'].entries()) {
      if (record.blocked && record.blocked > now) {
        blocked.push({
          key,
          blockedUntil: new Date(record.blocked),
          violations: record.violations || 0,
          riskLevel: determineRiskLevel(record.violations, record.escalationLevel)
        });
      }
    }

    return blocked.sort((a, b) => b.violations - a.violations);
  }
}

// Enhanced pre-configured rate limiters
export const ENHANCED_RATE_LIMIT_CONFIGS = {
  // Authentication endpoints
  LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 5,
    blockDurationMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many login attempts. Please try again later.',
    standardHeaders: true,
    legacyHeaders: true,
    enableSecurityMonitoring: true,
    escalationThreshold: 10,
    progressiveBlocking: true
  },
  
  // Quiz attempts (awareness lab specific)
  QUIZ_ATTEMPT: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 20,
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
    message: 'Too many quiz attempts. Please take a break and try again later.',
    standardHeaders: true,
    legacyHeaders: true,
    enableSecurityMonitoring: true,
    escalationThreshold: 15,
    progressiveBlocking: true
  },

  // Quiz submissions
  QUIZ_SUBMISSION: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxAttempts: 10,
    blockDurationMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many quiz submissions. Please wait before submitting again.',
    standardHeaders: true,
    legacyHeaders: true,
    enableSecurityMonitoring: true,
    escalationThreshold: 8,
    progressiveBlocking: true
  },

  // Learning material access
  LEARNING_MATERIAL: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 100,
    blockDurationMs: 10 * 60 * 1000, // 10 minutes
    message: 'Too many learning material requests. Please slow down.',
    standardHeaders: true,
    legacyHeaders: true,
    enableSecurityMonitoring: true,
    escalationThreshold: 20,
    progressiveBlocking: false
  },

  // Admin operations
  ADMIN_OPERATION: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 50,
    blockDurationMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many admin operations. Please wait before continuing.',
    standardHeaders: true,
    legacyHeaders: true,
    enableSecurityMonitoring: true,
    escalationThreshold: 10,
    progressiveBlocking: true
  }
};

// Cleanup function for graceful shutdown
export function cleanupEnhancedRateLimiter(): void {
  enhancedRateLimitStore.destroy();
}