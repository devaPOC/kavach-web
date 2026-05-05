/**
 * Security Middleware for Awareness Lab
 * Integrates input sanitization, validation, and security monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { htmlSanitizer, urlValidator, embedCodeValidator } from './input-sanitizer';
import { AwarenessLabRateLimiter } from './awareness-lab-security';
import { logger } from '@/lib/utils/logger';
import { emitAudit, AuditEventName } from '@/lib/utils/audit-logger';
import { createId } from '@paralleldrive/cuid2';

export interface SecurityMiddlewareConfig {
  enableInputSanitization: boolean;
  enableRateLimiting: boolean;
  enableSecurityHeaders: boolean;
  enableAuditLogging: boolean;
  maxRequestSize: number;
  trustedOrigins: string[];
}

export const DEFAULT_SECURITY_CONFIG: SecurityMiddlewareConfig = {
  enableInputSanitization: true,
  enableRateLimiting: true,
  enableSecurityHeaders: true,
  enableAuditLogging: true,
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  trustedOrigins: [
    'https://localhost:3000',
    'https://kavach.vercel.app',
    'https://www.kavach.com'
  ]
};

export interface SecurityContext {
  requestId: string;
  userId?: string;
  userAgent: string;
  ipAddress: string;
  origin?: string;
  timestamp: Date;
}

export interface SecurityValidationResult {
  isValid: boolean;
  sanitizedData?: any;
  errors: string[];
  warnings: string[];
  securityScore: number;
  blocked: boolean;
}

/**
 * Main Security Middleware Class
 */
export class SecurityMiddleware {
  private config: SecurityMiddlewareConfig;

  constructor(config: SecurityMiddlewareConfig = DEFAULT_SECURITY_CONFIG) {
    this.config = config;
  }

  /**
   * Apply security middleware to request
   */
  async applySecurityMiddleware(
    request: NextRequest,
    context: SecurityContext
  ): Promise<{ response?: NextResponse; continue: boolean }> {
    try {
      // Check rate limiting first
      if (this.config.enableRateLimiting) {
        const rateLimitResult = await this.checkRateLimit(request, context);
        if (rateLimitResult.blocked) {
          return {
            response: this.createRateLimitResponse(rateLimitResult),
            continue: false
          };
        }
      }

      // Validate request size
      const sizeValidation = await this.validateRequestSize(request, context);
      if (!sizeValidation.isValid) {
        return {
          response: this.createErrorResponse(400, 'Request too large', sizeValidation.errors),
          continue: false
        };
      }

      // Validate origin if specified
      if (request.headers.get('origin')) {
        const originValidation = this.validateOrigin(request, context);
        if (!originValidation.isValid) {
          return {
            response: this.createErrorResponse(403, 'Invalid origin', originValidation.errors),
            continue: false
          };
        }
      }

      // Log security event
      if (this.config.enableAuditLogging) {
        this.logSecurityEvent(context, 'middleware.applied', 'info');
      }

      return { continue: true };

    } catch (error) {
      logger.error('Security middleware error', { error, requestId: context.requestId });
      
      // Log security error
      if (this.config.enableAuditLogging) {
        emitAudit({
          event: 'security.middleware.error' as AuditEventName,
          userId: context.userId || 'anonymous',
          requestId: context.requestId,
          severity: 'high',
          success: false,
          metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
        });
      }

      return {
        response: this.createErrorResponse(500, 'Security validation failed'),
        continue: false
      };
    }
  }

  /**
   * Validate and sanitize request body data
   */
  async validateRequestData(
    data: any,
    context: SecurityContext,
    validationRules?: ValidationRules
  ): Promise<SecurityValidationResult> {
    const result: SecurityValidationResult = {
      isValid: true,
      sanitizedData: {},
      errors: [],
      warnings: [],
      securityScore: 100,
      blocked: false
    };

    try {
      if (!data || typeof data !== 'object') {
        result.errors.push('Invalid request data format');
        result.isValid = false;
        return result;
      }

      result.sanitizedData = await this.sanitizeObjectData(data, context, validationRules);
      
      // Calculate security score based on sanitization results
      result.securityScore = this.calculateSecurityScore(result.warnings, result.errors);
      
      // Determine if request should be blocked
      result.blocked = result.securityScore < 50 || result.errors.length > 0;

      // Log validation results
      if (this.config.enableAuditLogging && (result.warnings.length > 0 || result.errors.length > 0)) {
        this.logValidationResults(context, result);
      }

    } catch (error) {
      logger.error('Request data validation failed', { error, requestId: context.requestId });
      result.errors.push('Data validation failed due to internal error');
      result.isValid = false;
      result.blocked = true;
    }

    return result;
  }

  /**
   * Check rate limiting for the request
   */
  private async checkRateLimit(
    request: NextRequest,
    context: SecurityContext
  ): Promise<{ blocked: boolean; reason?: string; retryAfter?: number }> {
    const pathname = request.nextUrl.pathname;

    // Determine rate limit type based on endpoint
    if (pathname.includes('/api/v1/awareness-lab/quiz') && request.method === 'POST') {
      if (pathname.includes('/attempt')) {
        const result = await AwarenessLabRateLimiter.checkQuizAttemptLimit(request);
        return {
          blocked: !result.success,
          reason: result.success ? undefined : 'Quiz attempt rate limit exceeded',
          retryAfter: result.retryAfter
        };
      } else if (pathname.includes('/submit')) {
        const result = await AwarenessLabRateLimiter.checkQuizSubmissionLimit(request);
        return {
          blocked: !result.success,
          reason: result.success ? undefined : 'Quiz submission rate limit exceeded',
          retryAfter: result.retryAfter
        };
      }
    }

    if (pathname.includes('/api/v1/awareness-lab/learning-materials')) {
      const result = await AwarenessLabRateLimiter.checkLearningMaterialLimit(request);
      return {
        blocked: !result.success,
        reason: result.success ? undefined : 'Learning material rate limit exceeded',
        retryAfter: result.retryAfter
      };
    }

    if (pathname.includes('/api/admin/awareness-lab') && request.method === 'POST') {
      const result = await AwarenessLabRateLimiter.checkAdminQuizCreationLimit(request);
      return {
        blocked: !result.success,
        reason: result.success ? undefined : 'Admin quiz creation rate limit exceeded',
        retryAfter: result.retryAfter
      };
    }

    return { blocked: false };
  }

  /**
   * Validate request size
   */
  private async validateRequestSize(
    request: NextRequest,
    context: SecurityContext
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const contentLength = request.headers.get('content-length');
    
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (size > this.config.maxRequestSize) {
        this.logSecurityEvent(context, 'request.size.exceeded', 'warn', {
          requestSize: size,
          maxSize: this.config.maxRequestSize
        });
        
        return {
          isValid: false,
          errors: [`Request size ${size} exceeds maximum allowed size ${this.config.maxRequestSize}`]
        };
      }
    }

    return { isValid: true, errors: [] };
  }

  /**
   * Validate request origin
   */
  private validateOrigin(
    request: NextRequest,
    context: SecurityContext
  ): { isValid: boolean; errors: string[] } {
    const origin = request.headers.get('origin');
    
    if (origin && !this.config.trustedOrigins.includes(origin)) {
      this.logSecurityEvent(context, 'request.origin.untrusted', 'warn', { origin });
      
      return {
        isValid: false,
        errors: [`Untrusted origin: ${origin}`]
      };
    }

    return { isValid: true, errors: [] };
  }

  /**
   * Sanitize object data recursively
   */
  private async sanitizeObjectData(
    data: any,
    context: SecurityContext,
    rules?: ValidationRules
  ): Promise<any> {
    if (Array.isArray(data)) {
      return Promise.all(data.map(item => this.sanitizeObjectData(item, context, rules)));
    }

    if (data && typeof data === 'object') {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        const fieldRules = rules?.fields?.[key];
        sanitized[key] = await this.sanitizeValue(value, key, context, fieldRules);
      }
      
      return sanitized;
    }

    return data;
  }

  /**
   * Sanitize individual value based on type and rules
   */
  private async sanitizeValue(
    value: any,
    fieldName: string,
    context: SecurityContext,
    rules?: FieldValidationRules
  ): Promise<any> {
    if (typeof value === 'string') {
      // Apply sanitization based on field type
      switch (rules?.type) {
        case 'html':
          const htmlResult = htmlSanitizer.sanitizeHTML(value, context.userId, context.requestId);
          if (htmlResult.warnings.length > 0) {
            this.logFieldSanitization(context, fieldName, 'html', htmlResult.warnings);
          }
          return htmlResult.sanitized;

        case 'url':
          const urlResult = urlValidator.validateURL(value, context.userId, context.requestId);
          if (!urlResult.isValid) {
            throw new Error(`Invalid URL in field ${fieldName}: ${urlResult.errors.join(', ')}`);
          }
          if (urlResult.warnings.length > 0) {
            this.logFieldSanitization(context, fieldName, 'url', urlResult.warnings);
          }
          return urlResult.sanitizedUrl;

        case 'embed':
          const embedResult = embedCodeValidator.validateEmbedCode(value, context.userId, context.requestId);
          if (!embedResult.isValid) {
            throw new Error(`Invalid embed code in field ${fieldName}: ${embedResult.errors.join(', ')}`);
          }
          if (embedResult.warnings.length > 0) {
            this.logFieldSanitization(context, fieldName, 'embed', embedResult.warnings);
          }
          return embedResult.sanitizedCode;

        case 'text':
        default:
          // Basic text sanitization - remove potential XSS patterns
          return this.sanitizeText(value);
      }
    }

    return value;
  }

  /**
   * Basic text sanitization
   */
  private sanitizeText(text: string): string {
    return text
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  /**
   * Calculate security score
   */
  private calculateSecurityScore(warnings: string[], errors: string[]): number {
    let score = 100;
    score -= errors.length * 25; // Major deduction for errors
    score -= warnings.length * 10; // Minor deduction for warnings
    return Math.max(0, score);
  }

  /**
   * Create rate limit response
   */
  private createRateLimitResponse(rateLimitResult: any): NextResponse {
    const response = NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: rateLimitResult.reason || 'Too many requests',
        retryAfter: rateLimitResult.retryAfter
      },
      { status: 429 }
    );

    if (rateLimitResult.retryAfter) {
      response.headers.set('Retry-After', rateLimitResult.retryAfter.toString());
    }

    return response;
  }

  /**
   * Create error response
   */
  private createErrorResponse(status: number, message: string, errors?: string[]): NextResponse {
    return NextResponse.json(
      {
        error: message,
        details: errors || []
      },
      { status }
    );
  }

  /**
   * Log security event
   */
  private logSecurityEvent(
    context: SecurityContext,
    event: string,
    level: 'info' | 'warn' | 'error',
    metadata?: any
  ): void {
    const logData = {
      requestId: context.requestId,
      userId: context.userId,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      origin: context.origin,
      timestamp: context.timestamp,
      ...metadata
    };

    logger[level](`Security event: ${event}`, logData);

    if (this.config.enableAuditLogging) {
      emitAudit({
        event: `security.${event}` as AuditEventName,
        userId: context.userId || 'anonymous',
        requestId: context.requestId,
        severity: level === 'error' ? 'high' : level === 'warn' ? 'medium' : 'low',
        success: level !== 'error',
        metadata: logData
      });
    }
  }

  /**
   * Log validation results
   */
  private logValidationResults(context: SecurityContext, result: SecurityValidationResult): void {
    emitAudit({
      event: 'security.validation.completed' as AuditEventName,
      userId: context.userId || 'anonymous',
      requestId: context.requestId,
      severity: result.errors.length > 0 ? 'high' : result.warnings.length > 0 ? 'medium' : 'low',
      success: result.isValid,
      metadata: {
        securityScore: result.securityScore,
        errors: result.errors,
        warnings: result.warnings,
        blocked: result.blocked
      }
    });
  }

  /**
   * Log field sanitization
   */
  private logFieldSanitization(
    context: SecurityContext,
    fieldName: string,
    type: string,
    warnings: string[]
  ): void {
    emitAudit({
      event: 'security.field.sanitized' as AuditEventName,
      userId: context.userId || 'anonymous',
      requestId: context.requestId,
      severity: 'medium',
      success: true,
      metadata: {
        fieldName,
        type,
        warnings
      }
    });
  }
}

/**
 * Validation rules interface
 */
export interface ValidationRules {
  fields?: Record<string, FieldValidationRules>;
}

export interface FieldValidationRules {
  type: 'text' | 'html' | 'url' | 'embed';
  required?: boolean;
  maxLength?: number;
  pattern?: RegExp;
}

/**
 * Create security context from request
 */
export function createSecurityContext(request: NextRequest, userId?: string): SecurityContext {
  return {
    requestId: createId(),
    userId,
    userAgent: request.headers.get('user-agent') || 'unknown',
    ipAddress: request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown',
    origin: request.headers.get('origin') || undefined,
    timestamp: new Date()
  };
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.youtube.com https://*.vimeo.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "media-src 'self' https://*.youtube.com https://*.vimeo.com; " +
    "frame-src 'self' https://*.youtube.com https://*.vimeo.com https://*.google.com; " +
    "connect-src 'self' https:; " +
    "font-src 'self' data:; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';"
  );

  // Other security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

// Export singleton instance
export const securityMiddleware = new SecurityMiddleware();