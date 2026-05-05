/**
 * Comprehensive Input Sanitization Module
 * Implements HTML sanitization, URL validation, and embed code security
 */
import { getDOMPurify } from '@/lib/utils/jsdom-config';

// import DOMPurify from 'isomorphic-dompurify'; // Moved to lazy require

import { logger } from '@/lib/utils/logger';
import { auditLogger, emitAudit, AuditEventName } from '@/lib/utils/audit-logger';

// Configuration for HTML sanitization
export interface SanitizationConfig {
  allowedTags: string[];
  allowedAttributes: Record<string, string[]>;
  allowedSchemes: string[];
  maxLength: number;
  stripComments: boolean;
  stripScripts: boolean;
}

export const DEFAULT_SANITIZATION_CONFIG: SanitizationConfig = {
  allowedTags: [
    'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'code', 'pre', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
  ],
  allowedAttributes: {
    'a': ['href', 'title', 'target', 'rel'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'table': ['class'],
    'th': ['scope'],
    'td': ['colspan', 'rowspan']
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  maxLength: 50000,
  stripComments: true,
  stripScripts: true
};

// Trusted domains for external content
export const TRUSTED_DOMAINS = {
  video: [
    'youtube.com',
    'youtu.be',
    'www.youtube.com',
    'vimeo.com',
    'player.vimeo.com',
    'www.vimeo.com'
  ],
  documents: [
    'docs.google.com',
    'drive.google.com',
    'onedrive.live.com',
    'sharepoint.com',
    'office.com'
  ],
  images: [
    'imgur.com',
    'i.imgur.com',
    'unsplash.com',
    'images.unsplash.com'
  ],
  educational: [
    'coursera.org',
    'edx.org',
    'khanacademy.org',
    'ted.com',
    'www.ted.com'
  ]
};

export interface SanitizationResult {
  sanitized: string;
  isModified: boolean;
  removedElements: string[];
  warnings: string[];
  errors: string[];
}

export interface URLValidationResult {
  isValid: boolean;
  isTrusted: boolean;
  sanitizedUrl: string;
  domain: string;
  protocol: string;
  warnings: string[];
  errors: string[];
  category?: string;
}

export interface EmbedValidationResult {
  isValid: boolean;
  isTrusted: boolean;
  sanitizedCode: string;
  detectedType: string;
  warnings: string[];
  errors: string[];
  cspDirectives: string[];
}

/**
 * Comprehensive HTML Sanitizer
 */
export class HTMLSanitizer {
  private config: SanitizationConfig;

  constructor(config: SanitizationConfig = DEFAULT_SANITIZATION_CONFIG) {
    this.config = config;
    this.configureDOMPurify();
  }

  /**
   * Configure DOMPurify with security settings
   */
  private configureDOMPurify(): void {
    // Get DOMPurify with proper jsdom configuration
    const DOMPurify = getDOMPurify();

    // Configure DOMPurify hooks for additional security
    DOMPurify.addHook('beforeSanitizeElements', (node: any) => {
      // Remove any script-like elements
      if (node.nodeName && /script|object|embed|applet|meta|link/i.test(node.nodeName)) {
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
        return node;
      }
    });

    DOMPurify.addHook('beforeSanitizeAttributes', (node: any) => {
      // Remove event handlers and javascript: URLs
      if (node.hasAttributes()) {
        const attributes = Array.from(node.attributes);
        attributes.forEach((attr: any) => {
          if (attr.name.startsWith('on') ||
            attr.value.toLowerCase().includes('javascript:') ||
            attr.value.toLowerCase().includes('vbscript:') ||
            attr.value.toLowerCase().includes('data:')) {
            node.removeAttribute(attr.name);
          }
        });
      }
    });
  }

  /**
   * Sanitize HTML content with comprehensive security checks
   */
  sanitizeHTML(input: string, userId?: string, requestId?: string): SanitizationResult {
    const result: SanitizationResult = {
      sanitized: '',
      isModified: false,
      removedElements: [],
      warnings: [],
      errors: []
    };

    try {
      // Input validation
      if (typeof input !== 'string') {
        result.errors.push('Input must be a string');
        return result;
      }

      if (input.length > this.config.maxLength) {
        result.errors.push(`Input exceeds maximum length of ${this.config.maxLength} characters`);
        return result;
      }

      // Store original for comparison
      const original = input;

      // Configure DOMPurify options
      const purifyConfig = {
        ALLOWED_TAGS: this.config.allowedTags,
        ALLOWED_ATTR: Object.keys(this.config.allowedAttributes).reduce((acc, tag) => {
          return acc.concat(this.config.allowedAttributes[tag]);
        }, [] as string[]),
        ALLOWED_URI_REGEXP: new RegExp(`^(?:(?:${this.config.allowedSchemes.join('|')}):)`),
        FORBID_TAGS: ['script', 'object', 'embed', 'applet', 'meta', 'link', 'style'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
        REMOVE_DATA_URI_TAGS: true,
        REMOVE_UNKNOWN_TAGS: true,
        REMOVE_EMPTY_ELEMENTS: true,
        TRIM_WHITESPACE: true
      };

      // Sanitize the content with proper jsdom configuration
      const DOMPurify = getDOMPurify();
      result.sanitized = DOMPurify.sanitize(input, purifyConfig);

      // Check if content was modified
      result.isModified = original !== result.sanitized;

      // Detect removed elements
      if (result.isModified) {
        result.removedElements = this.detectRemovedElements(original, result.sanitized);

        if (result.removedElements.length > 0) {
          result.warnings.push(`Removed potentially unsafe elements: ${result.removedElements.join(', ')}`);
        }
      }

      // Additional security checks
      this.performSecurityChecks(result.sanitized, result);

      // Log sanitization if content was modified or warnings exist
      if (result.isModified || result.warnings.length > 0) {
        this.logSanitization(userId, requestId, original, result);
      }

    } catch (error) {
      logger.error('HTML sanitization failed', { error, userId, requestId });
      result.errors.push('Sanitization failed due to internal error');
    }

    return result;
  }

  /**
   * Detect removed elements by comparing original and sanitized content
   */
  private detectRemovedElements(original: string, sanitized: string): string[] {
    const removedElements: string[] = [];

    // Common dangerous patterns to check for
    const dangerousPatterns = [
      /<script[^>]*>/gi,
      /<object[^>]*>/gi,
      /<embed[^>]*>/gi,
      /<applet[^>]*>/gi,
      /<meta[^>]*>/gi,
      /<link[^>]*>/gi,
      /<style[^>]*>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /data:/gi,
      /on\w+\s*=/gi
    ];

    dangerousPatterns.forEach(pattern => {
      const matches = original.match(pattern);
      if (matches && !sanitized.match(pattern)) {
        removedElements.push(pattern.source);
      }
    });

    return removedElements;
  }

  /**
   * Perform additional security checks on sanitized content
   */
  private performSecurityChecks(content: string, result: SanitizationResult): void {
    // Check for suspicious patterns that might have survived sanitization
    const suspiciousPatterns = [
      { pattern: /eval\s*\(/gi, warning: 'Potential eval() usage detected' },
      { pattern: /Function\s*\(/gi, warning: 'Potential Function constructor usage detected' },
      { pattern: /setTimeout\s*\(/gi, warning: 'Potential setTimeout usage detected' },
      { pattern: /setInterval\s*\(/gi, warning: 'Potential setInterval usage detected' },
      { pattern: /document\./gi, warning: 'Direct document access detected' },
      { pattern: /window\./gi, warning: 'Direct window access detected' }
    ];

    suspiciousPatterns.forEach(({ pattern, warning }) => {
      if (pattern.test(content)) {
        result.warnings.push(warning);
      }
    });

    // Check for excessive nesting (potential DoS)
    const nestingLevel = this.calculateNestingLevel(content);
    if (nestingLevel > 20) {
      result.warnings.push(`Excessive HTML nesting detected (${nestingLevel} levels)`);
    }

    // Check for large attribute values
    const largeAttributePattern = /\w+\s*=\s*["'][^"']{1000,}["']/g;
    if (largeAttributePattern.test(content)) {
      result.warnings.push('Large attribute values detected');
    }
  }

  /**
   * Calculate HTML nesting level
   */
  private calculateNestingLevel(html: string): number {
    let maxLevel = 0;
    let currentLevel = 0;

    const tagPattern = /<\/?[^>]+>/g;
    let match;

    while ((match = tagPattern.exec(html)) !== null) {
      const tag = match[0];
      if (tag.startsWith('</')) {
        currentLevel--;
      } else if (!tag.endsWith('/>')) {
        currentLevel++;
        maxLevel = Math.max(maxLevel, currentLevel);
      }
    }

    return maxLevel;
  }

  /**
   * Log sanitization results for audit purposes
   */
  private logSanitization(
    userId: string | undefined,
    requestId: string | undefined,
    original: string,
    result: SanitizationResult
  ): void {
    const logData = {
      userId,
      requestId,
      originalLength: original.length,
      sanitizedLength: result.sanitized.length,
      isModified: result.isModified,
      removedElements: result.removedElements,
      warnings: result.warnings,
      errors: result.errors
    };

    if (result.errors.length > 0) {
      emitAudit({
        event: 'security.sanitization.failed' as AuditEventName,
        userId: userId || 'anonymous',
        requestId: requestId || 'unknown',
        severity: 'high',
        success: false,
        metadata: logData
      });
    } else if (result.isModified || result.warnings.length > 0) {
      emitAudit({
        event: 'security.sanitization.modified' as AuditEventName,
        userId: userId || 'anonymous',
        requestId: requestId || 'unknown',
        severity: 'medium',
        success: true,
        metadata: logData
      });
    }
  }
}

/**
 * URL Validator with domain whitelisting and security scanning
 */
export class URLValidator {
  private trustedDomains: Set<string>;

  constructor() {
    this.trustedDomains = new Set([
      ...TRUSTED_DOMAINS.video,
      ...TRUSTED_DOMAINS.documents,
      ...TRUSTED_DOMAINS.images,
      ...TRUSTED_DOMAINS.educational
    ]);
  }

  /**
   * Validate and sanitize URL with comprehensive security checks
   */
  validateURL(input: string, userId?: string, requestId?: string): URLValidationResult {
    const result: URLValidationResult = {
      isValid: false,
      isTrusted: false,
      sanitizedUrl: '',
      domain: '',
      protocol: '',
      warnings: [],
      errors: []
    };

    try {
      // Basic input validation
      if (typeof input !== 'string' || !input.trim()) {
        result.errors.push('URL must be a non-empty string');
        return result;
      }

      const trimmedInput = input.trim();

      // Check for obvious malicious patterns
      if (this.containsMaliciousPatterns(trimmedInput)) {
        result.errors.push('URL contains malicious patterns');
        this.logURLValidation(userId, requestId, trimmedInput, result, 'malicious_pattern');
        return result;
      }

      // Parse URL
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(trimmedInput);
      } catch (error) {
        result.errors.push('Invalid URL format');
        return result;
      }

      result.protocol = parsedUrl.protocol;
      result.domain = parsedUrl.hostname.toLowerCase();

      // Validate protocol
      if (!['http:', 'https:'].includes(result.protocol)) {
        result.errors.push('Only HTTP and HTTPS protocols are allowed');
        return result;
      }

      // Check for suspicious URL patterns
      this.checkSuspiciousPatterns(parsedUrl, result);

      // Check domain trust level
      result.isTrusted = this.isDomainTrusted(result.domain);
      result.category = this.getDomainCategory(result.domain);

      if (!result.isTrusted) {
        result.warnings.push(`Domain ${result.domain} is not in the trusted domains list`);
      }

      // Sanitize URL
      result.sanitizedUrl = this.sanitizeURL(parsedUrl);
      result.isValid = result.errors.length === 0;

      // Log validation results
      if (!result.isValid || result.warnings.length > 0) {
        this.logURLValidation(userId, requestId, trimmedInput, result, 'validation');
      }

    } catch (error) {
      logger.error('URL validation failed', { error, input, userId, requestId });
      result.errors.push('URL validation failed due to internal error');
    }

    return result;
  }

  /**
   * Check for malicious patterns in URL
   */
  private containsMaliciousPatterns(url: string): boolean {
    const maliciousPatterns = [
      /javascript:/i,
      /vbscript:/i,
      /data:/i,
      /file:/i,
      /ftp:/i,
      /<script/i,
      /onclick/i,
      /onerror/i,
      /onload/i,
      /eval\(/i,
      /document\./i,
      /window\./i,
      /\.exe$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.scr$/i
    ];

    return maliciousPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Check for suspicious URL patterns
   */
  private checkSuspiciousPatterns(parsedUrl: URL, result: URLValidationResult): void {
    // Check for URL shorteners (potential security risk)
    const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'short.link'];
    if (shorteners.some(shortener => parsedUrl.hostname.includes(shortener))) {
      result.warnings.push('URL shortener detected - exercise caution');
    }

    // Check for suspicious query parameters
    const suspiciousParams = ['redirect', 'url', 'goto', 'next', 'continue', 'return'];
    suspiciousParams.forEach(param => {
      if (parsedUrl.searchParams.has(param)) {
        result.warnings.push(`Suspicious parameter detected: ${param}`);
      }
    });

    // Check for excessive redirects in URL
    const redirectCount = (parsedUrl.href.match(/redirect/gi) || []).length;
    if (redirectCount > 2) {
      result.warnings.push('Multiple redirect indicators detected');
    }

    // Check for suspicious TLD
    const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf'];
    if (suspiciousTlds.some(tld => parsedUrl.hostname.endsWith(tld))) {
      result.warnings.push('Suspicious top-level domain detected');
    }

    // Check for IP addresses instead of domains
    const ipPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    if (ipPattern.test(parsedUrl.hostname)) {
      result.warnings.push('IP address used instead of domain name');
    }
  }

  /**
   * Check if domain is trusted
   */
  private isDomainTrusted(domain: string): boolean {
    return this.trustedDomains.has(domain) ||
      Array.from(this.trustedDomains).some(trusted => domain.endsWith(`.${trusted}`));
  }

  /**
   * Get domain category
   */
  private getDomainCategory(domain: string): string | undefined {
    for (const [category, domains] of Object.entries(TRUSTED_DOMAINS)) {
      if (domains.some(trusted => domain === trusted || domain.endsWith(`.${trusted}`))) {
        return category;
      }
    }
    return undefined;
  }

  /**
   * Sanitize URL by removing dangerous parameters
   */
  private sanitizeURL(parsedUrl: URL): string {
    // Remove potentially dangerous parameters
    const dangerousParams = [
      'javascript', 'script', 'eval', 'onclick', 'onerror', 'onload',
      'document', 'window', 'alert', 'confirm', 'prompt'
    ];

    dangerousParams.forEach(param => {
      parsedUrl.searchParams.delete(param);
    });

    // Ensure HTTPS for trusted domains when possible
    if (parsedUrl.protocol === 'http:' && this.isDomainTrusted(parsedUrl.hostname)) {
      parsedUrl.protocol = 'https:';
    }

    return parsedUrl.toString();
  }

  /**
   * Log URL validation results
   */
  private logURLValidation(
    userId: string | undefined,
    requestId: string | undefined,
    originalUrl: string,
    result: URLValidationResult,
    reason: string
  ): void {
    const logData = {
      userId,
      requestId,
      originalUrl,
      domain: result.domain,
      protocol: result.protocol,
      isTrusted: result.isTrusted,
      category: result.category,
      warnings: result.warnings,
      errors: result.errors,
      reason
    };

    if (result.errors.length > 0) {
      emitAudit({
        event: 'security.url.validation.failed' as AuditEventName,
        userId: userId || 'anonymous',
        requestId: requestId || 'unknown',
        severity: 'high',
        success: false,
        metadata: logData
      });
    } else if (result.warnings.length > 0) {
      emitAudit({
        event: 'security.url.validation.warning' as AuditEventName,
        userId: userId || 'anonymous',
        requestId: requestId || 'unknown',
        severity: 'medium',
        success: true,
        metadata: logData
      });
    }
  }
}

/**
 * Embed Code Validator for iframe and other embedded content
 */
export class EmbedCodeValidator {
  private htmlSanitizer: HTMLSanitizer;
  private urlValidator: URLValidator;

  constructor() {
    this.htmlSanitizer = new HTMLSanitizer();
    this.urlValidator = new URLValidator();
  }

  /**
   * Validate and sanitize embed code
   */
  validateEmbedCode(input: string, userId?: string, requestId?: string): EmbedValidationResult {
    const result: EmbedValidationResult = {
      isValid: false,
      isTrusted: false,
      sanitizedCode: '',
      detectedType: 'unknown',
      warnings: [],
      errors: [],
      cspDirectives: []
    };

    try {
      // Basic input validation
      if (typeof input !== 'string' || !input.trim()) {
        result.errors.push('Embed code must be a non-empty string');
        return result;
      }

      const trimmedInput = input.trim();

      // Detect embed type
      result.detectedType = this.detectEmbedType(trimmedInput);

      // Validate based on type
      switch (result.detectedType) {
        case 'iframe':
          return this.validateIframeEmbed(trimmedInput, userId, requestId);
        case 'script':
          result.errors.push('Script embeds are not allowed for security reasons');
          return result;
        case 'object':
        case 'embed':
          result.errors.push('Object and embed tags are not allowed for security reasons');
          return result;
        default:
          return this.validateGenericEmbed(trimmedInput, userId, requestId);
      }

    } catch (error) {
      logger.error('Embed code validation failed', { error, input, userId, requestId });
      result.errors.push('Embed code validation failed due to internal error');
    }

    return result;
  }

  /**
   * Detect the type of embed code
   */
  private detectEmbedType(code: string): string {
    const lowerCode = code.toLowerCase();

    if (lowerCode.includes('<iframe')) return 'iframe';
    if (lowerCode.includes('<script')) return 'script';
    if (lowerCode.includes('<object')) return 'object';
    if (lowerCode.includes('<embed')) return 'embed';
    if (lowerCode.includes('<video')) return 'video';
    if (lowerCode.includes('<audio')) return 'audio';

    return 'unknown';
  }

  /**
   * Validate iframe embed code
   */
  private validateIframeEmbed(code: string, userId?: string, requestId?: string): EmbedValidationResult {
    const result: EmbedValidationResult = {
      isValid: false,
      isTrusted: false,
      sanitizedCode: '',
      detectedType: 'iframe',
      warnings: [],
      errors: [],
      cspDirectives: []
    };

    // Extract iframe src URL
    const srcMatch = code.match(/src\s*=\s*["']([^"']+)["']/i);
    if (!srcMatch) {
      result.errors.push('Iframe must have a valid src attribute');
      return result;
    }

    const srcUrl = srcMatch[1];

    // Validate the URL
    const urlValidation = this.urlValidator.validateURL(srcUrl, userId, requestId);
    if (!urlValidation.isValid) {
      result.errors.push(...urlValidation.errors);
      return result;
    }

    result.warnings.push(...urlValidation.warnings);
    result.isTrusted = urlValidation.isTrusted;

    // Sanitize the iframe code
    const sanitizationResult = this.sanitizeIframeCode(code, urlValidation.sanitizedUrl);
    result.sanitizedCode = sanitizationResult.code;
    result.warnings.push(...sanitizationResult.warnings);

    // Generate CSP directives
    result.cspDirectives = this.generateCSPDirectives(urlValidation.domain, urlValidation.category);

    result.isValid = result.errors.length === 0;

    // Log validation
    this.logEmbedValidation(userId, requestId, code, result);

    return result;
  }

  /**
   * Validate generic embed code
   */
  private validateGenericEmbed(code: string, userId?: string, requestId?: string): EmbedValidationResult {
    const result: EmbedValidationResult = {
      isValid: false,
      isTrusted: false,
      sanitizedCode: '',
      detectedType: 'generic',
      warnings: [],
      errors: [],
      cspDirectives: []
    };

    // Use HTML sanitizer for generic content
    const sanitizationResult = this.htmlSanitizer.sanitizeHTML(code, userId, requestId);

    if (sanitizationResult.errors.length > 0) {
      result.errors.push(...sanitizationResult.errors);
      return result;
    }

    result.sanitizedCode = sanitizationResult.sanitized;
    result.warnings.push(...sanitizationResult.warnings);
    result.isValid = true;

    // Check if content was significantly modified
    if (sanitizationResult.isModified) {
      result.warnings.push('Embed code was modified during sanitization');
    }

    return result;
  }

  /**
   * Sanitize iframe code
   */
  private sanitizeIframeCode(code: string, sanitizedUrl: string): { code: string; warnings: string[] } {
    const warnings: string[] = [];
    let sanitizedCode = code;

    // Replace src with sanitized URL
    sanitizedCode = sanitizedCode.replace(/src\s*=\s*["'][^"']+["']/i, `src="${sanitizedUrl}"`);

    // Add security attributes
    const securityAttributes = [
      'sandbox="allow-scripts allow-same-origin allow-presentation"',
      'referrerpolicy="strict-origin-when-cross-origin"',
      'loading="lazy"'
    ];

    // Check if security attributes are already present
    securityAttributes.forEach(attr => {
      const attrName = attr.split('=')[0];
      if (!new RegExp(`\\b${attrName}\\s*=`, 'i').test(sanitizedCode)) {
        sanitizedCode = sanitizedCode.replace(/<iframe/i, `<iframe ${attr}`);
      }
    });

    // Remove dangerous attributes
    const dangerousAttrs = ['onload', 'onerror', 'onclick', 'onmouseover'];
    dangerousAttrs.forEach(attr => {
      const regex = new RegExp(`\\s+${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
      if (regex.test(sanitizedCode)) {
        sanitizedCode = sanitizedCode.replace(regex, '');
        warnings.push(`Removed dangerous attribute: ${attr}`);
      }
    });

    return { code: sanitizedCode, warnings };
  }

  /**
   * Generate CSP directives for embed content
   */
  private generateCSPDirectives(domain: string, category?: string): string[] {
    const directives: string[] = [];

    // Base frame-src directive
    directives.push(`frame-src https://${domain}`);

    // Category-specific directives
    switch (category) {
      case 'video':
        directives.push(`media-src https://${domain}`);
        if (domain.includes('youtube')) {
          directives.push('script-src https://*.youtube.com https://*.ytimg.com');
        } else if (domain.includes('vimeo')) {
          directives.push('script-src https://*.vimeo.com https://*.vimeocdn.com');
        }
        break;

      case 'documents':
        directives.push(`connect-src https://${domain}`);
        break;

      case 'images':
        directives.push(`img-src https://${domain}`);
        break;
    }

    return directives;
  }

  /**
   * Log embed validation results
   */
  private logEmbedValidation(
    userId: string | undefined,
    requestId: string | undefined,
    originalCode: string,
    result: EmbedValidationResult
  ): void {
    const logData = {
      userId,
      requestId,
      originalLength: originalCode.length,
      sanitizedLength: result.sanitizedCode.length,
      detectedType: result.detectedType,
      isTrusted: result.isTrusted,
      warnings: result.warnings,
      errors: result.errors,
      cspDirectives: result.cspDirectives
    };

    if (result.errors.length > 0) {
      emitAudit({
        event: 'security.embed.validation.failed' as AuditEventName,
        userId: userId || 'anonymous',
        requestId: requestId || 'unknown',
        severity: 'high',
        success: false,
        metadata: logData
      });
    } else if (result.warnings.length > 0) {
      emitAudit({
        event: 'security.embed.validation.warning' as AuditEventName,
        userId: userId || 'anonymous',
        requestId: requestId || 'unknown',
        severity: 'medium',
        success: true,
        metadata: logData
      });
    }
  }
}

// Export singleton instances
export const htmlSanitizer = new HTMLSanitizer();
export const urlValidator = new URLValidator();
export const embedCodeValidator = new EmbedCodeValidator();

// Export utility functions
export function sanitizeUserInput(input: string, userId?: string, requestId?: string): string {
  const result = htmlSanitizer.sanitizeHTML(input, userId, requestId);
  if (result.errors.length > 0) {
    throw new Error(`Input sanitization failed: ${result.errors.join(', ')}`);
  }
  return result.sanitized;
}

export function validateAndSanitizeURL(url: string, userId?: string, requestId?: string): string {
  const result = urlValidator.validateURL(url, userId, requestId);
  if (!result.isValid) {
    throw new Error(`URL validation failed: ${result.errors.join(', ')}`);
  }
  return result.sanitizedUrl;
}

export function validateAndSanitizeEmbed(code: string, userId?: string, requestId?: string): string {
  const result = embedCodeValidator.validateEmbedCode(code, userId, requestId);
  if (!result.isValid) {
    throw new Error(`Embed code validation failed: ${result.errors.join(', ')}`);
  }
  return result.sanitizedCode;
}
