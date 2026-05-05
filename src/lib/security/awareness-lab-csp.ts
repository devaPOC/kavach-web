/**
 * Awareness Lab Content Security Policy (CSP) Configuration
 * Handles CSP headers for external learning materials and embedded content
 */

import { NextResponse } from 'next/server';
import { externalLinkValidator } from './awareness-lab-security';

/**
 * CSP configuration for Awareness Lab
 */
export interface AwarenessLabCSPConfig {
  allowedVideoSources: string[];
  allowedFrameSources: string[];
  allowedConnectSources: string[];
  allowedImageSources: string[];
  allowInlineStyles: boolean;
  allowInlineScripts: boolean;
  reportUri?: string;
}

export const DEFAULT_CSP_CONFIG: AwarenessLabCSPConfig = {
  allowedVideoSources: [
    'https://*.youtube.com',
    'https://*.youtu.be',
    'https://*.vimeo.com',
    'https://player.vimeo.com'
  ],
  allowedFrameSources: [
    'https://*.youtube.com',
    'https://*.youtu.be', 
    'https://*.vimeo.com',
    'https://player.vimeo.com',
    'https://docs.google.com',
    'https://drive.google.com',
    'https://*.office.com',
    'https://*.microsoft.com'
  ],
  allowedConnectSources: [
    'https://*.youtube.com',
    'https://*.vimeo.com',
    'https://docs.google.com',
    'https://drive.google.com'
  ],
  allowedImageSources: [
    'https://*.youtube.com',
    'https://*.ytimg.com',
    'https://*.vimeo.com',
    'https://*.vimeocdn.com',
    'https://docs.google.com',
    'https://drive.google.com'
  ],
  allowInlineStyles: true, // Required for some embedded content
  allowInlineScripts: false, // Keep strict for security
  reportUri: '/api/v1/security/csp-report'
};

/**
 * CSP Manager for Awareness Lab
 */
export class AwarenessLabCSPManager {
  private config: AwarenessLabCSPConfig;

  constructor(config: AwarenessLabCSPConfig = DEFAULT_CSP_CONFIG) {
    this.config = config;
  }

  /**
   * Generate CSP header for learning materials page
   */
  generateLearningMaterialsCSP(nonce: string, additionalSources?: string[]): string {
    const directives: Record<string, string[]> = {
      "default-src": ["'self'"],
      "script-src": [
        "'self'",
        `'nonce-${nonce}'`,
        // YouTube API
        "https://www.youtube.com",
        "https://s.ytimg.com",
        // Vimeo API
        "https://player.vimeo.com",
        "https://vimeo.com"
      ],
      "style-src": [
        "'self'",
        `'nonce-${nonce}'`
      ],
      "img-src": [
        "'self'",
        "data:",
        "blob:",
        ...this.config.allowedImageSources
      ],
      "media-src": [
        "'self'",
        ...this.config.allowedVideoSources
      ],
      "frame-src": [
        "'self'",
        ...this.config.allowedFrameSources
      ],
      "connect-src": [
        "'self'",
        ...this.config.allowedConnectSources
      ],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'none'"],
      "upgrade-insecure-requests": []
    };

    // Add inline styles if allowed
    if (this.config.allowInlineStyles) {
      directives["style-src"].push("'unsafe-inline'");
    }

    // Add additional sources if provided
    if (additionalSources) {
      additionalSources.forEach(source => {
        const validation = externalLinkValidator.validateExternalLink(source);
        if (validation.isValid) {
          try {
            const url = new URL(source);
            const origin = `${url.protocol}//${url.hostname}`;
            
            // Add to appropriate directives
            if (!directives["frame-src"].includes(origin)) {
              directives["frame-src"].push(origin);
            }
            if (!directives["connect-src"].includes(origin)) {
              directives["connect-src"].push(origin);
            }
          } catch {
            // Invalid URL, skip
          }
        }
      });
    }

    // Add report URI if configured
    if (this.config.reportUri) {
      directives["report-uri"] = [this.config.reportUri];
    }

    return this.buildCSPString(directives);
  }

  /**
   * Generate CSP header for quiz pages (more restrictive)
   */
  generateQuizCSP(nonce: string): string {
    const directives: Record<string, string[]> = {
      "default-src": ["'self'"],
      "script-src": [
        "'self'",
        `'nonce-${nonce}'`
      ],
      "style-src": [
        "'self'",
        `'nonce-${nonce}'`,
        "'unsafe-inline'" // Required for some UI components
      ],
      "img-src": [
        "'self'",
        "data:",
        "blob:"
      ],
      "media-src": ["'none'"],
      "frame-src": ["'none'"],
      "connect-src": ["'self'"],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'none'"],
      "upgrade-insecure-requests": []
    };

    // Add report URI if configured
    if (this.config.reportUri) {
      directives["report-uri"] = [this.config.reportUri];
    }

    return this.buildCSPString(directives);
  }

  /**
   * Generate CSP header for admin pages
   */
  generateAdminCSP(nonce: string): string {
    const directives: Record<string, string[]> = {
      "default-src": ["'self'"],
      "script-src": [
        "'self'",
        `'nonce-${nonce}'`
      ],
      "style-src": [
        "'self'",
        `'nonce-${nonce}'`,
        "'unsafe-inline'" // Required for admin UI components
      ],
      "img-src": [
        "'self'",
        "data:",
        "blob:",
        // Allow preview images from external sources
        ...this.config.allowedImageSources
      ],
      "media-src": [
        "'self'",
        ...this.config.allowedVideoSources
      ],
      "frame-src": [
        "'self'",
        // Allow preview frames for admin
        ...this.config.allowedFrameSources
      ],
      "connect-src": [
        "'self'",
        ...this.config.allowedConnectSources
      ],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'none'"],
      "upgrade-insecure-requests": []
    };

    // Add report URI if configured
    if (this.config.reportUri) {
      directives["report-uri"] = [this.config.reportUri];
    }

    return this.buildCSPString(directives);
  }

  /**
   * Build CSP string from directives
   */
  private buildCSPString(directives: Record<string, string[]>): string {
    return Object.entries(directives)
      .map(([key, values]) => {
        if (values.length === 0) {
          return key;
        }
        return `${key} ${values.join(' ')}`;
      })
      .join('; ');
  }

  /**
   * Add CSP headers to response based on route
   */
  addCSPHeaders(response: NextResponse, route: string, nonce: string, additionalSources?: string[]): NextResponse {
    let csp: string;

    if (route.includes('/awareness-lab') || route.includes('/quizzes')) {
      if (route.includes('/admin')) {
        csp = this.generateAdminCSP(nonce);
      } else if (route.includes('/learning-modules') || route.includes('/materials')) {
        csp = this.generateLearningMaterialsCSP(nonce, additionalSources);
      } else {
        csp = this.generateQuizCSP(nonce);
      }
    } else if (route.includes('/admin')) {
      csp = this.generateAdminCSP(nonce);
    } else {
      // Default CSP for other routes
      csp = this.generateQuizCSP(nonce);
    }

    // Use report-only in development, enforce in production
    const headerName = process.env.NODE_ENV === 'production' 
      ? 'Content-Security-Policy'
      : 'Content-Security-Policy-Report-Only';

    response.headers.set(headerName, csp);
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
  }

  /**
   * Validate and sanitize external content URL
   */
  validateExternalContent(url: string, contentType: 'video' | 'document' | 'link'): ContentValidationResult {
    const validation = externalLinkValidator.validateExternalLink(url);
    
    if (!validation.isValid) {
      return {
        isAllowed: false,
        sanitizedUrl: '',
        cspDirective: '',
        errors: validation.errors,
        warnings: validation.warnings
      };
    }

    try {
      const parsedUrl = new URL(url);
      const domain = parsedUrl.hostname.toLowerCase();
      
      // Check if domain is allowed for this content type
      const isAllowed = this.isDomainAllowedForContentType(domain, contentType);
      
      if (!isAllowed) {
        return {
          isAllowed: false,
          sanitizedUrl: validation.sanitizedUrl,
          cspDirective: '',
          errors: [`Domain ${domain} is not allowed for ${contentType} content`],
          warnings: validation.warnings
        };
      }

      // Generate appropriate CSP directive
      const cspDirective = this.generateContentCSPDirective(parsedUrl, contentType);

      return {
        isAllowed: true,
        sanitizedUrl: validation.sanitizedUrl,
        cspDirective,
        errors: [],
        warnings: validation.warnings
      };

    } catch (error) {
      return {
        isAllowed: false,
        sanitizedUrl: '',
        cspDirective: '',
        errors: ['Invalid URL format'],
        warnings: []
      };
    }
  }

  /**
   * Check if domain is allowed for specific content type
   */
  private isDomainAllowedForContentType(domain: string, contentType: string): boolean {
    switch (contentType) {
      case 'video':
        return this.config.allowedVideoSources.some(source => 
          domain === source.replace('https://', '').replace('*', '') ||
          domain.endsWith(source.replace('https://*.', ''))
        );
      
      case 'document':
      case 'link':
        return this.config.allowedFrameSources.some(source => 
          domain === source.replace('https://', '').replace('*', '') ||
          domain.endsWith(source.replace('https://*.', ''))
        );
      
      default:
        return false;
    }
  }

  /**
   * Generate CSP directive for specific content
   */
  private generateContentCSPDirective(url: URL, contentType: string): string {
    const origin = `${url.protocol}//${url.hostname}`;
    
    switch (contentType) {
      case 'video':
        return `frame-src ${origin}; media-src ${origin}; img-src ${origin}`;
      
      case 'document':
        return `frame-src ${origin}; connect-src ${origin}`;
      
      case 'link':
        return `connect-src ${origin}`;
      
      default:
        return `connect-src ${origin}`;
    }
  }
}

/**
 * Content validation result interface
 */
export interface ContentValidationResult {
  isAllowed: boolean;
  sanitizedUrl: string;
  cspDirective: string;
  errors: string[];
  warnings: string[];
}

/**
 * CSP violation report handler
 */
export class CSPViolationReporter {
  
  /**
   * Handle CSP violation report
   */
  static async handleViolationReport(request: Request): Promise<Response> {
    try {
      const report = await request.json();
      
      // Log CSP violation
      console.warn('CSP Violation Report:', {
        timestamp: new Date().toISOString(),
        userAgent: request.headers.get('user-agent'),
        report: report['csp-report'] || report
      });

      // You could also send this to an external monitoring service
      // await sendToMonitoringService(report);

      return new Response('OK', { status: 200 });
    } catch (error) {
      console.error('Failed to process CSP violation report:', error);
      return new Response('Bad Request', { status: 400 });
    }
  }
}

// Export singleton instance
export const awarenessLabCSPManager = new AwarenessLabCSPManager();