/**
 * Security Validation Utilities for Awareness Lab
 * Provides comprehensive security checks for URLs, content, and domains
 */

import { AwarenessLabError, AwarenessLabErrorCode } from '@/lib/errors/awareness-lab-errors';

// Domain whitelist configuration
export interface DomainWhitelistConfig {
  allowedDomains: string[];
  blockedDomains: string[];
  allowSubdomains: boolean;
  allowLocalhost: boolean;
  allowPrivateIPs: boolean;
}

// Security validation result
export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  details?: Record<string, any>;
}

// Default domain whitelist for learning materials
export const DEFAULT_DOMAIN_WHITELIST: DomainWhitelistConfig = {
  allowedDomains: [
    // Video platforms
    'youtube.com',
    'youtu.be',
    'vimeo.com',
    'wistia.com',
    'brightcove.com',
    
    // Document platforms
    'docs.google.com',
    'drive.google.com',
    'dropbox.com',
    'onedrive.live.com',
    'sharepoint.com',
    'box.com',
    
    // Educational platforms
    'coursera.org',
    'edx.org',
    'khanacademy.org',
    'udemy.com',
    'linkedin.com', // LinkedIn Learning
    
    // Presentation platforms
    'slideshare.net',
    'prezi.com',
    'canva.com',
    
    // Interactive content
    'h5p.org',
    'articulate.com',
    
    // Trusted news and educational sites
    'wikipedia.org',
    'wikimedia.org',
    'ted.com',
    
    // Government and institutional sites
    'gov.sa', // Saudi government
    'edu.sa', // Saudi educational institutions
    'nist.gov', // US NIST
    'sans.org', // SANS Institute
    'owasp.org', // OWASP
    
    // Cybersecurity resources
    'cybersecurity.gov.sa',
    'cert.gov.sa',
    'cisa.gov',
    'us-cert.gov'
  ],
  blockedDomains: [
    // Known malicious or risky domains
    'bit.ly',
    'tinyurl.com',
    'goo.gl',
    't.co',
    'ow.ly',
    'is.gd',
    'buff.ly',
    
    // File sharing that could be risky
    'mediafire.com',
    'rapidshare.com',
    'megaupload.com',
    '4shared.com',
    
    // Social media (to prevent distractions)
    'facebook.com',
    'twitter.com',
    'instagram.com',
    'tiktok.com',
    'snapchat.com',
    
    // Gaming and entertainment
    'twitch.tv',
    'discord.com',
    'reddit.com'
  ],
  allowSubdomains: true,
  allowLocalhost: false, // Set to true in development
  allowPrivateIPs: false
};

/**
 * Domain Security Validator
 */
export class DomainSecurityValidator {
  private config: DomainWhitelistConfig;

  constructor(config: DomainWhitelistConfig = DEFAULT_DOMAIN_WHITELIST) {
    this.config = {
      ...config,
      allowLocalhost: process.env.NODE_ENV === 'development' ? true : config.allowLocalhost,
      allowPrivateIPs: process.env.NODE_ENV === 'development' ? true : config.allowPrivateIPs
    };
  }

  /**
   * Validate a URL against domain whitelist and security rules
   */
  validateUrl(url: string): SecurityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      const protocol = urlObj.protocol.toLowerCase();

      // Protocol validation
      if (!['http:', 'https:'].includes(protocol)) {
        errors.push(`Unsupported protocol: ${protocol}. Only HTTP and HTTPS are allowed.`);
        riskLevel = 'critical';
      }

      // HTTPS preference
      if (protocol === 'http:' && !this.isLocalOrPrivate(hostname)) {
        warnings.push('HTTP URLs are less secure than HTTPS. Consider using HTTPS when available.');
        if (riskLevel === 'low') riskLevel = 'medium';
      }

      // Localhost validation
      if (this.isLocalhost(hostname)) {
        if (!this.config.allowLocalhost) {
          errors.push('Localhost URLs are not allowed in production environment.');
          riskLevel = 'high';
        } else {
          warnings.push('Localhost URL detected. This will not work in production.');
        }
      }

      // Private IP validation
      if (this.isPrivateIP(hostname)) {
        if (!this.config.allowPrivateIPs) {
          errors.push('Private IP addresses are not allowed.');
          riskLevel = 'high';
        } else {
          warnings.push('Private IP address detected. This may not be accessible to all users.');
        }
      }

      // Blocked domain check
      if (this.isBlockedDomain(hostname)) {
        errors.push(`Domain "${hostname}" is in the blocked list.`);
        riskLevel = 'critical';
      }

      // Whitelist check
      if (!this.isAllowedDomain(hostname)) {
        warnings.push(`Domain "${hostname}" is not in the approved whitelist. Please verify this is a trusted source.`);
        if (riskLevel === 'low') riskLevel = 'medium';
      }

      // Suspicious patterns
      const suspiciousPatterns = this.checkSuspiciousPatterns(url);
      if (suspiciousPatterns.length > 0) {
        warnings.push(...suspiciousPatterns);
        if (riskLevel === 'low') riskLevel = 'medium';
      }

      // URL length check
      if (url.length > 2048) {
        warnings.push('URL is unusually long, which could indicate suspicious activity.');
        if (riskLevel === 'low') riskLevel = 'medium';
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        riskLevel,
        details: {
          hostname,
          protocol,
          isWhitelisted: this.isAllowedDomain(hostname),
          isBlocked: this.isBlockedDomain(hostname),
          isLocalhost: this.isLocalhost(hostname),
          isPrivateIP: this.isPrivateIP(hostname)
        }
      };

    } catch (error) {
      return {
        isValid: false,
        errors: ['Invalid URL format'],
        warnings: [],
        riskLevel: 'high',
        details: { parseError: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Check if domain is in the allowed list
   */
  private isAllowedDomain(hostname: string): boolean {
    return this.config.allowedDomains.some(domain => {
      if (this.config.allowSubdomains) {
        return hostname === domain || hostname.endsWith(`.${domain}`);
      }
      return hostname === domain;
    });
  }

  /**
   * Check if domain is in the blocked list
   */
  private isBlockedDomain(hostname: string): boolean {
    return this.config.blockedDomains.some(domain => {
      if (this.config.allowSubdomains) {
        return hostname === domain || hostname.endsWith(`.${domain}`);
      }
      return hostname === domain;
    });
  }

  /**
   * Check if hostname is localhost
   */
  private isLocalhost(hostname: string): boolean {
    const localhostPatterns = [
      'localhost',
      '127.0.0.1',
      '::1',
      '0.0.0.0'
    ];
    return localhostPatterns.includes(hostname);
  }

  /**
   * Check if hostname is a private IP address
   */
  private isPrivateIP(hostname: string): boolean {
    // Basic private IP range check
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./, // Link-local
      /^fc00:/, // IPv6 private
      /^fd00:/ // IPv6 private
    ];
    
    return privateRanges.some(pattern => pattern.test(hostname));
  }

  /**
   * Check if hostname is localhost or private IP
   */
  private isLocalOrPrivate(hostname: string): boolean {
    return this.isLocalhost(hostname) || this.isPrivateIP(hostname);
  }

  /**
   * Check for suspicious URL patterns
   */
  private checkSuspiciousPatterns(url: string): string[] {
    const warnings: string[] = [];
    
    // Multiple redirects or suspicious parameters
    if (url.includes('redirect') && url.includes('url=')) {
      warnings.push('URL contains redirect parameters which could be used for phishing.');
    }
    
    // Base64 encoded content
    if (/[?&]data=([A-Za-z0-9+/=]+)/.test(url)) {
      warnings.push('URL contains base64 encoded data which could hide malicious content.');
    }
    
    // Suspicious file extensions in URL
    const suspiciousExtensions = ['.exe', '.scr', '.bat', '.cmd', '.com', '.pif', '.vbs', '.js'];
    if (suspiciousExtensions.some(ext => url.toLowerCase().includes(ext))) {
      warnings.push('URL contains suspicious file extensions.');
    }
    
    // IP address instead of domain
    if (/https?:\/\/\d+\.\d+\.\d+\.\d+/.test(url)) {
      warnings.push('URL uses IP address instead of domain name, which could indicate suspicious activity.');
    }
    
    // Excessive subdomains
    const hostname = new URL(url).hostname;
    const subdomainCount = hostname.split('.').length - 2; // Subtract 2 for domain.tld
    if (subdomainCount > 3) {
      warnings.push('URL has excessive subdomains which could indicate suspicious activity.');
    }
    
    return warnings;
  }

  /**
   * Update domain whitelist configuration
   */
  updateConfig(newConfig: Partial<DomainWhitelistConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Add domain to whitelist
   */
  addAllowedDomain(domain: string): void {
    if (!this.config.allowedDomains.includes(domain)) {
      this.config.allowedDomains.push(domain);
    }
  }

  /**
   * Remove domain from whitelist
   */
  removeAllowedDomain(domain: string): void {
    this.config.allowedDomains = this.config.allowedDomains.filter(d => d !== domain);
  }

  /**
   * Add domain to blocklist
   */
  addBlockedDomain(domain: string): void {
    if (!this.config.blockedDomains.includes(domain)) {
      this.config.blockedDomains.push(domain);
    }
  }

  /**
   * Remove domain from blocklist
   */
  removeBlockedDomain(domain: string): void {
    this.config.blockedDomains = this.config.blockedDomains.filter(d => d !== domain);
  }
}

/**
 * Content Security Validator
 */
export class ContentSecurityValidator {
  /**
   * Validate HTML content for security issues
   */
  static validateHtmlContent(content: string): SecurityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Check for script tags
    if (/<script[^>]*>.*?<\/script>/gi.test(content)) {
      errors.push('Content contains script tags which are not allowed.');
      riskLevel = 'critical';
    }

    // Check for event handlers
    if (/on\w+\s*=/gi.test(content)) {
      errors.push('Content contains event handlers which are not allowed.');
      riskLevel = 'critical';
    }

    // Check for javascript: protocol
    if (/javascript:/gi.test(content)) {
      errors.push('Content contains javascript: protocol which is not allowed.');
      riskLevel = 'critical';
    }

    // Check for data: protocol with HTML
    if (/data:text\/html/gi.test(content)) {
      errors.push('Content contains data:text/html which is not allowed.');
      riskLevel = 'critical';
    }

    // Check for iframe with suspicious sources
    const iframeMatches = content.match(/<iframe[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi);
    if (iframeMatches) {
      for (const iframe of iframeMatches) {
        const srcMatch = iframe.match(/src\s*=\s*["']([^"']+)["']/i);
        if (srcMatch) {
          const src = srcMatch[1];
          if (!src.startsWith('http://') && !src.startsWith('https://')) {
            errors.push(`Iframe contains suspicious source: ${src}`);
            riskLevel = 'high';
          }
        }
      }
    }

    // Check for form tags
    if (/<form[^>]*>/gi.test(content)) {
      warnings.push('Content contains form tags which may not function as expected.');
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    // Check for object/embed tags
    if (/<(object|embed)[^>]*>/gi.test(content)) {
      warnings.push('Content contains object/embed tags which may pose security risks.');
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskLevel
    };
  }

  /**
   * Validate embed code for security
   */
  static validateEmbedCode(embedCode: string): SecurityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Basic HTML validation
    const htmlValidation = this.validateHtmlContent(embedCode);
    errors.push(...htmlValidation.errors);
    warnings.push(...htmlValidation.warnings);
    riskLevel = htmlValidation.riskLevel;

    // Check for allowed embed sources
    const allowedEmbedDomains = [
      'youtube.com',
      'youtube-nocookie.com',
      'vimeo.com',
      'wistia.com',
      'brightcove.com',
      'h5p.org'
    ];

    const srcMatches = embedCode.match(/src\s*=\s*["']([^"']+)["']/gi);
    if (srcMatches) {
      for (const srcMatch of srcMatches) {
        const urlMatch = srcMatch.match(/src\s*=\s*["']([^"']+)["']/i);
        if (urlMatch) {
          const url = urlMatch[1];
          try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();
            
            const isAllowed = allowedEmbedDomains.some(domain => 
              hostname === domain || hostname.endsWith(`.${domain}`)
            );
            
            if (!isAllowed) {
              warnings.push(`Embed source "${hostname}" is not in the approved list.`);
              if (riskLevel === 'low') riskLevel = 'medium';
            }
          } catch {
            errors.push(`Invalid URL in embed code: ${url}`);
            riskLevel = 'high';
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskLevel
    };
  }
}

/**
 * File Security Validator
 */
export class FileSecurityValidator {
  private static readonly ALLOWED_MIME_TYPES = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    
    // Videos
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/avi',
    'video/mov',
    
    // Audio
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/m4a',
    
    // Text
    'text/plain',
    'text/csv',
    'text/html',
    'text/markdown'
  ];

  private static readonly BLOCKED_EXTENSIONS = [
    '.exe', '.scr', '.bat', '.cmd', '.com', '.pif', '.vbs', '.js', '.jar',
    '.app', '.deb', '.pkg', '.dmg', '.run', '.msi', '.dll', '.so'
  ];

  /**
   * Validate file based on extension and MIME type
   */
  static validateFile(filename: string, mimeType?: string): SecurityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Check file extension
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    
    if (this.BLOCKED_EXTENSIONS.includes(extension)) {
      errors.push(`File extension "${extension}" is not allowed for security reasons.`);
      riskLevel = 'critical';
    }

    // Check MIME type if provided
    if (mimeType && !this.ALLOWED_MIME_TYPES.includes(mimeType)) {
      warnings.push(`MIME type "${mimeType}" is not in the approved list.`);
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    // Check for double extensions (potential disguised executables)
    const extensionCount = (filename.match(/\./g) || []).length;
    if (extensionCount > 1) {
      const parts = filename.split('.');
      if (parts.length > 2) {
        const secondLastExtension = `.${parts[parts.length - 2]}`;
        if (this.BLOCKED_EXTENSIONS.includes(secondLastExtension)) {
          errors.push('File appears to have a disguised executable extension.');
          riskLevel = 'critical';
        }
      }
    }

    // Check filename for suspicious patterns
    if (/[<>:"|?*]/.test(filename)) {
      warnings.push('Filename contains special characters that may cause issues.');
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskLevel,
      details: {
        extension,
        mimeType,
        isAllowedMimeType: mimeType ? this.ALLOWED_MIME_TYPES.includes(mimeType) : null,
        isBlockedExtension: this.BLOCKED_EXTENSIONS.includes(extension)
      }
    };
  }
}

// Export singleton instances
export const domainValidator = new DomainSecurityValidator();
export const contentValidator = ContentSecurityValidator;
export const fileValidator = FileSecurityValidator;