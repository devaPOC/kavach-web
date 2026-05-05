import { BaseService, ServiceResult, serviceSuccess, serviceError } from '../base.service';
import { getDOMPurify } from '@/lib/utils/jsdom-config';
// import DOMPurify from 'isomorphic-dompurify'; // Moved to lazy require

import { AwarenessLabErrorCode } from '@/lib/errors/awareness-lab-errors';

export interface URLValidationResult {
  isValid: boolean;
  reason?: string;
  domain?: string;
  platform?: string;
  videoId?: string;
  securityFlags?: string[];
}

export interface EmbedCodeValidationResult {
  isValid: boolean;
  sanitizedCode?: string;
  removedElements?: string[];
  securityFlags?: string[];
  trustedSource?: boolean;
}

export interface FileValidationResult {
  isValid: boolean;
  fileType?: string;
  mimeType?: string;
  size?: number;
  securityFlags?: string[];
  virusScanResult?: 'clean' | 'infected' | 'unknown';
}

export interface ContentSafetyResult {
  isSafe: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  detectedThreats?: string[];
  sanitizedContent?: string;
}

/**
 * Enhanced material validation service with comprehensive security checks
 */
export class MaterialValidationService extends BaseService {

  // Trusted domains for different material types
  private readonly TRUSTED_VIDEO_DOMAINS = [
    'youtube.com',
    'youtu.be',
    'vimeo.com',
    'wistia.com',
    'brightcove.com',
    'jwplayer.com'
  ];

  private readonly TRUSTED_DOCUMENT_DOMAINS = [
    'drive.google.com',
    'docs.google.com',
    'dropbox.com',
    'onedrive.live.com',
    'sharepoint.com',
    'box.com'
  ];

  private readonly TRUSTED_EMBED_SOURCES = [
    'youtube.com',
    'vimeo.com',
    'slideshare.net',
    'scribd.com',
    'issuu.com',
    'canva.com'
  ];

  // Allowed file types and their MIME types
  private readonly ALLOWED_FILE_TYPES: Record<string, string[]> = {
    'pdf': ['application/pdf'],
    'doc': ['application/msword'],
    'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    'ppt': ['application/vnd.ms-powerpoint'],
    'pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    'xls': ['application/vnd.ms-excel'],
    'xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    'txt': ['text/plain'],
    'jpg': ['image/jpeg'],
    'jpeg': ['image/jpeg'],
    'png': ['image/png'],
    'gif': ['image/gif'],
    'mp4': ['video/mp4'],
    'webm': ['video/webm'],
    'ogg': ['video/ogg']
  };

  // Maximum file size (50MB)
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024;

  /**
   * Validate material URL with comprehensive security checks
   */
  async validateMaterialUrl(
    url: string,
    materialType: 'link' | 'video' | 'document'
  ): Promise<ServiceResult<URLValidationResult>> {
    try {
      if (!url || typeof url !== 'string') {
        return serviceSuccess({
          isValid: false,
          reason: 'URL is required and must be a string'
        });
      }

      // Basic URL format validation
      let urlObj: URL;
      try {
        urlObj = new URL(url.trim());
      } catch (error) {
        return serviceSuccess({
          isValid: false,
          reason: 'Invalid URL format'
        });
      }

      const securityFlags: string[] = [];
      const hostname = urlObj.hostname.toLowerCase();

      // Protocol validation
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return serviceSuccess({
          isValid: false,
          reason: 'Only HTTP and HTTPS protocols are allowed',
          securityFlags: ['invalid_protocol']
        });
      }

      // Security checks for dangerous protocols and patterns
      if (this.containsDangerousPatterns(url)) {
        return serviceSuccess({
          isValid: false,
          reason: 'URL contains potentially dangerous content',
          securityFlags: ['dangerous_pattern']
        });
      }

      // Block private/local addresses in production
      if (this.isPrivateAddress(hostname)) {
        if (process.env.NODE_ENV === 'production') {
          return serviceSuccess({
            isValid: false,
            reason: 'Private and local addresses are not allowed',
            securityFlags: ['private_address']
          });
        } else {
          securityFlags.push('private_address_dev');
        }
      }

      // Material type specific validation
      const typeValidation = await this.validateByMaterialType(url, materialType, urlObj);
      if (!typeValidation.isValid) {
        return serviceSuccess(typeValidation);
      }

      // Domain reputation check (basic implementation)
      const domainCheck = await this.checkDomainReputation(hostname);
      if (!domainCheck.isValid) {
        securityFlags.push('suspicious_domain');
      }

      const result: URLValidationResult = {
        ...typeValidation,
        domain: hostname,
        securityFlags: securityFlags.length > 0 ? securityFlags : undefined
      };

      this.audit({
        event: 'awareness.external.link.validated',
        resource: url,
        metadata: {
          materialType,
          domain: hostname,
          isValid: true,
          securityFlags
        }
      });

      return serviceSuccess(result);
    } catch (error) {
      this.handleError(error, 'MaterialValidationService.validateMaterialUrl');
    }
  }

  /**
   * Sanitize and validate embed code
   */
  async sanitizeEmbedCode(embedCode: string): Promise<ServiceResult<EmbedCodeValidationResult>> {
    try {
      if (!embedCode || typeof embedCode !== 'string') {
        return serviceSuccess({
          isValid: true,
          sanitizedCode: '',
          trustedSource: false
        });
      }

      const trimmedCode = embedCode.trim();
      const securityFlags: string[] = [];
      const removedElements: string[] = [];

      // Check for dangerous patterns before sanitization
      if (this.containsDangerousPatterns(trimmedCode)) {
        return serviceSuccess({
          isValid: false,
          securityFlags: ['dangerous_pattern'],
          reason: 'Embed code contains potentially dangerous content'
        });
      }

      // Configure DOMPurify for embed code sanitization
      const purifyConfig = {
        ALLOWED_TAGS: ['iframe', 'embed', 'object', 'param'],
        ALLOWED_ATTR: [
          'src', 'width', 'height', 'frameborder', 'allowfullscreen',
          'allow', 'title', 'name', 'value', 'type'
        ],
        FORBID_ATTR: [
          'onload', 'onerror', 'onclick', 'onmouseover', 'onfocus',
          'onblur', 'onchange', 'onsubmit', 'onreset'
        ],
        KEEP_CONTENT: false,
        RETURN_DOM: false,
        RETURN_DOM_FRAGMENT: false,
        RETURN_DOM_IMPORT: false,
        SANITIZE_DOM: true
      };

      // Sanitize the embed code with proper jsdom configuration
      const DOMPurify = getDOMPurify();
      const sanitizedCode = DOMPurify.sanitize(trimmedCode, purifyConfig);

      // Check if content was removed during sanitization
      if (sanitizedCode.length < trimmedCode.length * 0.8) {
        securityFlags.push('significant_content_removed');
      }

      // Validate trusted sources
      const trustedSource = this.isFromTrustedEmbedSource(sanitizedCode);
      if (!trustedSource) {
        securityFlags.push('untrusted_source');
      }

      // Additional security validation
      const additionalValidation = this.validateEmbedSecurity(sanitizedCode);
      if (!additionalValidation.isValid) {
        return serviceSuccess({
          isValid: false,
          securityFlags: [...securityFlags, ...additionalValidation.flags],
          reason: additionalValidation.reason
        });
      }

      const result: EmbedCodeValidationResult = {
        isValid: true,
        sanitizedCode,
        removedElements: removedElements.length > 0 ? removedElements : undefined,
        securityFlags: securityFlags.length > 0 ? securityFlags : undefined,
        trustedSource
      };

      this.audit({
        event: 'system.health.check',
        metadata: {
          originalLength: trimmedCode.length,
          sanitizedLength: sanitizedCode.length,
          trustedSource,
          securityFlags
        }
      });

      return serviceSuccess(result);
    } catch (error) {
      this.handleError(error, 'MaterialValidationService.sanitizeEmbedCode');
    }
  }

  /**
   * Validate uploaded file with security scanning
   */
  async validateUploadedFile(file: File): Promise<ServiceResult<FileValidationResult>> {
    try {
      if (!file) {
        return serviceSuccess({
          isValid: false,
          reason: 'File is required'
        });
      }

      const securityFlags: string[] = [];

      // File size validation
      if (file.size > this.MAX_FILE_SIZE) {
        return serviceSuccess({
          isValid: false,
          reason: `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`,
          securityFlags: ['file_too_large']
        });
      }

      if (file.size === 0) {
        return serviceSuccess({
          isValid: false,
          reason: 'File is empty',
          securityFlags: ['empty_file']
        });
      }

      // File type validation
      const fileExtension = this.getFileExtension(file.name);
      const allowedMimeTypes = this.ALLOWED_FILE_TYPES[fileExtension];

      if (!allowedMimeTypes) {
        return serviceSuccess({
          isValid: false,
          reason: `File type '${fileExtension}' is not allowed`,
          securityFlags: ['disallowed_file_type']
        });
      }

      // MIME type validation
      if (!allowedMimeTypes.includes(file.type)) {
        securityFlags.push('mime_type_mismatch');
      }

      // File name validation
      if (!this.isValidFileName(file.name)) {
        return serviceSuccess({
          isValid: false,
          reason: 'File name contains invalid characters',
          securityFlags: ['invalid_filename']
        });
      }

      // Basic virus scanning (placeholder - would integrate with actual antivirus service)
      const virusScanResult = await this.performBasicVirusScan(file);

      if (virusScanResult === 'infected') {
        return serviceSuccess({
          isValid: false,
          reason: 'File failed security scan',
          securityFlags: ['virus_detected']
        });
      }

      const result: FileValidationResult = {
        isValid: true,
        fileType: fileExtension,
        mimeType: file.type,
        size: file.size,
        securityFlags: securityFlags.length > 0 ? securityFlags : undefined,
        virusScanResult
      };

      this.audit({
        event: 'awareness.external.link.validated',
        metadata: {
          fileName: file.name,
          fileType: fileExtension,
          fileSize: file.size,
          mimeType: file.type,
          virusScanResult,
          securityFlags
        }
      });

      return serviceSuccess(result);
    } catch (error) {
      this.handleError(error, 'MaterialValidationService.validateUploadedFile');
    }
  }

  /**
   * Perform content safety check
   */
  async performContentSafetyCheck(content: string): Promise<ServiceResult<ContentSafetyResult>> {
    try {
      if (!content || typeof content !== 'string') {
        return serviceSuccess({
          isSafe: true,
          riskLevel: 'low',
          sanitizedContent: ''
        });
      }

      const detectedThreats: string[] = [];
      let riskLevel: 'low' | 'medium' | 'high' = 'low';

      // Check for dangerous patterns
      if (this.containsDangerousPatterns(content)) {
        detectedThreats.push('dangerous_patterns');
        riskLevel = 'high';
      }

      // Check for suspicious URLs
      const urlMatches = content.match(/https?:\/\/[^\s<>"]+/gi);
      if (urlMatches) {
        for (const url of urlMatches) {
          const urlValidation = await this.validateMaterialUrl(url, 'link');
          if (urlValidation.success && !urlValidation.data.isValid) {
            detectedThreats.push('suspicious_url');
            riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
          }
        }
      }

      // Sanitize content with proper jsdom configuration
      const DOMPurify = getDOMPurify();
      const sanitizedContent = DOMPurify.sanitize(content, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'a'],
        ALLOWED_ATTR: ['href'],
        KEEP_CONTENT: true
      });

      const result: ContentSafetyResult = {
        isSafe: riskLevel !== 'high',
        riskLevel,
        detectedThreats: detectedThreats.length > 0 ? detectedThreats : undefined,
        sanitizedContent
      };

      return serviceSuccess(result);
    } catch (error) {
      this.handleError(error, 'MaterialValidationService.performContentSafetyCheck');
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Check if URL contains dangerous patterns
   */
  private containsDangerousPatterns(content: string): boolean {
    const dangerousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /file:/i,
      /<script/i,
      /onload/i,
      /onerror/i,
      /onclick/i,
      /onmouseover/i,
      /onfocus/i,
      /eval\(/i,
      /document\.write/i,
      /innerHTML/i
    ];

    return dangerousPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Check if hostname is a private/local address
   */
  private isPrivateAddress(hostname: string): boolean {
    const privatePatterns = [
      /^localhost$/i,
      /^127\./,
      /^192\.168\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^0\./,
      /^169\.254\./,
      /^::1$/,
      /^fe80:/i
    ];

    return privatePatterns.some(pattern => pattern.test(hostname));
  }

  /**
   * Validate URL by material type
   */
  private async validateByMaterialType(
    url: string,
    materialType: string,
    urlObj: URL
  ): Promise<URLValidationResult> {
    const hostname = urlObj.hostname.toLowerCase();

    switch (materialType) {
      case 'video':
        return this.validateVideoUrl(url, hostname);
      case 'document':
        return this.validateDocumentUrl(url, hostname);
      case 'link':
        return this.validateLinkUrl(url, hostname);
      default:
        return { isValid: true, domain: hostname };
    }
  }

  /**
   * Validate video URL
   */
  private validateVideoUrl(url: string, hostname: string): URLValidationResult {
    // Check if it's from a known video platform for enhanced metadata
    const isTrustedDomain = this.TRUSTED_VIDEO_DOMAINS.some(domain =>
      hostname.includes(domain)
    );

    if (isTrustedDomain) {
      // Extract video ID for supported platforms
      const videoInfo = this.extractVideoInfo(url, hostname);
      return {
        isValid: true,
        domain: hostname,
        platform: videoInfo.platform,
        videoId: videoInfo.videoId
      };
    }

    // Check if it's a direct video file
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov'];
    const pathname = new URL(url).pathname.toLowerCase();

    if (videoExtensions.some(ext => pathname.endsWith(ext))) {
      return {
        isValid: true,
        domain: hostname,
        platform: 'direct'
      };
    }

    // Allow any other URL for video materials
    return {
      isValid: true,
      domain: hostname,
      platform: 'external'
    };
  }

  /**
   * Validate document URL
   */
  private validateDocumentUrl(url: string, hostname: string): URLValidationResult {
    // Check if it's from a known document platform for enhanced metadata
    const isTrustedDomain = this.TRUSTED_DOCUMENT_DOMAINS.some(domain =>
      hostname.includes(domain)
    );

    if (isTrustedDomain) {
      return {
        isValid: true,
        domain: hostname,
        platform: 'trusted_document_service'
      };
    }

    // Check if it's a direct document file
    const docExtensions = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'];
    const pathname = new URL(url).pathname.toLowerCase();

    if (docExtensions.some(ext => pathname.endsWith(ext))) {
      return {
        isValid: true,
        domain: hostname,
        platform: 'direct'
      };
    }

    // Allow any other URL for document materials
    return {
      isValid: true,
      domain: hostname,
      platform: 'external'
    };
  }

  /**
   * Validate general link URL
   */
  private validateLinkUrl(url: string, hostname: string): URLValidationResult {
    // For general links, we're more permissive but still check for basic security
    return {
      isValid: true,
      domain: hostname,
      platform: 'general'
    };
  }

  /**
   * Extract video information from URL
   */
  private extractVideoInfo(url: string, hostname: string): { platform?: string; videoId?: string } {
    // YouTube
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = url.match(youtubeRegex);
      if (match && match[1]) {
        return { platform: 'youtube', videoId: match[1] };
      }
    }

    // Vimeo
    if (hostname.includes('vimeo.com')) {
      const vimeoRegex = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/;
      const match = url.match(vimeoRegex);
      if (match && match[3]) {
        return { platform: 'vimeo', videoId: match[3] };
      }
    }

    return {};
  }

  /**
   * Check domain reputation (basic implementation)
   */
  private async checkDomainReputation(hostname: string): Promise<{ isValid: boolean; reason?: string }> {
    // This is a placeholder for actual domain reputation checking
    // In a real implementation, you would integrate with services like:
    // - Google Safe Browsing API
    // - VirusTotal API
    // - Custom domain blacklists

    const knownBadDomains = [
      'malware-site.com',
      'phishing-example.com',
      'suspicious-domain.net'
    ];

    if (knownBadDomains.includes(hostname)) {
      return { isValid: false, reason: 'Domain flagged as suspicious' };
    }

    return { isValid: true };
  }

  /**
   * Check if embed code is from trusted source
   */
  private isFromTrustedEmbedSource(embedCode: string): boolean {
    const srcMatch = embedCode.match(/src=["']([^"']+)["']/i);
    if (!srcMatch) return false;

    try {
      const srcUrl = new URL(srcMatch[1]);
      const hostname = srcUrl.hostname.toLowerCase();

      return this.TRUSTED_EMBED_SOURCES.some(domain =>
        hostname.includes(domain)
      );
    } catch {
      return false;
    }
  }

  /**
   * Additional embed security validation
   */
  private validateEmbedSecurity(embedCode: string): { isValid: boolean; reason?: string; flags: string[] } {
    const flags: string[] = [];

    // Check for multiple iframes (potential security risk)
    const iframeCount = (embedCode.match(/<iframe/gi) || []).length;
    if (iframeCount > 1) {
      flags.push('multiple_iframes');
    }

    // Check for suspicious attributes
    if (/sandbox/i.test(embedCode)) {
      flags.push('sandbox_attribute');
    }

    // Check for data URLs in src
    if (/src=["']data:/i.test(embedCode)) {
      return { isValid: false, reason: 'Data URLs are not allowed in embed codes', flags };
    }

    return { isValid: true, flags };
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return '';
    return filename.substring(lastDot + 1).toLowerCase();
  }

  /**
   * Validate filename for security
   */
  private isValidFileName(filename: string): boolean {
    // Check for dangerous characters
    const dangerousChars = /[<>:"|?*\x00-\x1f]/;
    if (dangerousChars.test(filename)) return false;

    // Check for reserved names (Windows)
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
    if (reservedNames.test(filename)) return false;

    // Check length
    if (filename.length > 255) return false;

    return true;
  }

  /**
   * Basic virus scanning (placeholder implementation)
   */
  private async performBasicVirusScan(file: File): Promise<'clean' | 'infected' | 'unknown'> {
    // This is a placeholder for actual virus scanning
    // In a real implementation, you would integrate with:
    // - ClamAV
    // - VirusTotal API
    // - Cloud-based scanning services

    // For now, just check file size and basic patterns
    if (file.size > this.MAX_FILE_SIZE) {
      return 'unknown';
    }

    // Check filename for suspicious patterns
    const suspiciousPatterns = [
      /\.exe$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.scr$/i,
      /\.vbs$/i,
      /\.js$/i
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
      return 'infected';
    }

    return 'clean';
  }
}

// Export singleton instance
export const materialValidationService = new MaterialValidationService();
