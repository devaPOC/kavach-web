/**
 * Client-safe validation utilities for Awareness Lab
 * These utilities do NOT use DOMPurify and can be safely imported in client code
 *
 * For server-side HTML sanitization with DOMPurify, import from './awareness-lab-utils.server.ts'
 */

/**
 * Client-safe HTML sanitization placeholder
 * On client-side: returns content as-is (browser handles sanitization)
 * On server-side: returns content as-is (use awareness-lab-utils.server.ts for real sanitization)
 *
 * This is primarily used in Zod schemas for validation, where transforms must be defined.
 * Actual sanitization should be done server-side using awareness-lab-utils.server.ts
 */
export function sanitizeHtml(content: string): string {
  // This is a no-op version for client compatibility
  // Real sanitization happens server-side in awareness-lab-utils.server.ts
  return content;
}

/**
 * Validate multilingual content (Arabic and English)
 * Checks for proper character encoding and prevents malicious content
 */
export function validateMultilingualContent(content: string): boolean {
  if (!content) return false;

  // Check for null bytes and other control characters that could be malicious
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(content)) {
    return false;
  }

  // Check for script tags or javascript: protocols (additional safety)
  if (/<script|javascript:|data:|vbscript:|onload|onerror|onclick/i.test(content)) {
    return false;
  }

  // Validate Unicode ranges for Arabic and English text
  // Allow common punctuation, numbers, and whitespace
  const validCharPattern = /^[\u0000-\u007F\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\p{P}\p{N}]*$/u;

  return validCharPattern.test(content);
}

/**
 * Validate Arabic text specifically
 * Ensures content contains valid Arabic characters
 */
export function validateArabicText(text: string): boolean {
  if (!text) return true; // Empty text is valid

  // Arabic Unicode ranges
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

  return arabicPattern.test(text);
}

/**
 * Validate English text specifically
 * Ensures content contains valid English characters
 */
export function validateEnglishText(text: string): boolean {
  if (!text) return true; // Empty text is valid

  // Basic Latin characters
  const englishPattern = /[a-zA-Z]/;

  return englishPattern.test(text);
}

/**
 * Detect the primary language of text content
 * Returns 'ar' for Arabic, 'en' for English, or 'mixed' for mixed content
 */
export function detectTextLanguage(text: string): 'ar' | 'en' | 'mixed' {
  if (!text) return 'en';

  const arabicChars = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length;

  if (arabicChars > englishChars * 2) return 'ar';
  if (englishChars > arabicChars * 2) return 'en';
  return 'mixed';
}

/**
 * Validate URL format and security
 * Ensures URLs are safe and properly formatted
 */
export function isValidUrl(url: string): boolean {
  if (!url) return false;

  try {
    const urlObj = new URL(url);

    // Only allow HTTP and HTTPS protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }

    // Prevent localhost and private IP ranges in production
    const hostname = urlObj.hostname.toLowerCase();

    // Block localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return process.env.NODE_ENV === 'development';
    }

    // Block private IP ranges (basic check)
    if (hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.')) {
      return process.env.NODE_ENV === 'development';
    }

    // Block file:// and other dangerous protocols
    if (url.toLowerCase().includes('file://') ||
      url.toLowerCase().includes('javascript:') ||
      url.toLowerCase().includes('data:')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Validate video URL and extract platform information
 * Supports YouTube, Vimeo, and direct video links
 */
export function validateVideoUrl(url: string): { isValid: boolean; platform?: string; videoId?: string } {
  if (!isValidUrl(url)) {
    return { isValid: false };
  }

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // YouTube validation
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = url.match(youtubeRegex);

      if (match && match[1]) {
        return { isValid: true, platform: 'youtube', videoId: match[1] };
      }
    }

    // Vimeo validation
    if (hostname.includes('vimeo.com')) {
      const vimeoRegex = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/;
      const match = url.match(vimeoRegex);

      if (match && match[3]) {
        return { isValid: true, platform: 'vimeo', videoId: match[3] };
      }
    }

    // Direct video file validation
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv'];
    const pathname = urlObj.pathname.toLowerCase();

    if (videoExtensions.some(ext => pathname.endsWith(ext))) {
      return { isValid: true, platform: 'direct' };
    }

    return { isValid: false };
  } catch {
    return { isValid: false };
  }
}

/**
 * Validate quiz answers against question configuration
 * Ensures answers are valid for the given question type and options
 */
export function validateQuizAnswers(
  answers: string[],
  questionType: string,
  questionOptions?: string[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!answers || answers.length === 0) {
    errors.push('At least one answer is required');
    return { isValid: false, errors };
  }

  switch (questionType) {
    case 'true_false':
      if (answers.length !== 1) {
        errors.push('True/False questions must have exactly one answer');
      }
      if (!['true', 'false'].includes(answers[0]?.toLowerCase())) {
        errors.push('True/False answers must be "true" or "false"');
      }
      break;

    case 'mcq':
      if (answers.length !== 1) {
        errors.push('Multiple choice questions must have exactly one answer');
      }
      if (questionOptions && !questionOptions.includes(answers[0])) {
        errors.push('Answer must be one of the provided options');
      }
      break;

    case 'multiple_select':
      if (answers.length === 0) {
        errors.push('Multiple select questions must have at least one answer');
      }
      if (questionOptions) {
        const invalidAnswers = answers.filter(answer => !questionOptions.includes(answer));
        if (invalidAnswers.length > 0) {
          errors.push('All answers must be from the provided options');
        }
      }
      break;

    default:
      errors.push('Invalid question type');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Calculate quiz score based on correct answers
 * Returns percentage score (0-100)
 */
export function calculateQuizScore(
  userAnswers: Record<string, string[]>,
  correctAnswers: Record<string, string[]>
): number {
  const totalQuestions = Object.keys(correctAnswers).length;

  if (totalQuestions === 0) return 0;

  let correctCount = 0;

  for (const [questionId, correct] of Object.entries(correctAnswers)) {
    const userAnswer = userAnswers[questionId];

    if (!userAnswer) continue;

    // Sort arrays for comparison
    const sortedCorrect = [...correct].sort();
    const sortedUser = [...userAnswer].sort();

    // Check if arrays are equal
    if (sortedCorrect.length === sortedUser.length &&
      sortedCorrect.every((val, index) => val === sortedUser[index])) {
      correctCount++;
    }
  }

  return Math.round((correctCount / totalQuestions) * 100);
}

/**
 * Validate time limit for quiz attempts
 * Ensures time taken is within acceptable bounds
 */
export function validateQuizTime(
  timeTakenSeconds: number,
  timeLimitMinutes: number,
  startTime: Date
): { isValid: boolean; error?: string } {
  const timeLimitSeconds = timeLimitMinutes * 60;
  const maxAllowedTime = timeLimitSeconds + 30; // 30 second grace period

  if (timeTakenSeconds < 0) {
    return { isValid: false, error: 'Invalid time taken' };
  }

  if (timeTakenSeconds > maxAllowedTime) {
    return { isValid: false, error: 'Quiz submission exceeded time limit' };
  }

  // Validate against actual elapsed time
  const actualElapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
  const timeDifference = Math.abs(actualElapsed - timeTakenSeconds);

  // Allow up to 60 seconds difference for network delays and client-server time sync
  if (timeDifference > 60) {
    return { isValid: false, error: 'Time validation failed' };
  }

  return { isValid: true };
}

/**
 * Validate embed code for security
 * Ensures embed codes are safe and from trusted sources
 */
export function validateEmbedCode(embedCode: string): boolean {
  if (!embedCode) return true; // Empty is valid

  // Basic HTML validation - should be iframe or similar safe tags
  const allowedTags = ['iframe', 'embed', 'object'];
  const tagRegex = /<(\w+)/;
  const match = embedCode.match(tagRegex);

  if (match && !allowedTags.includes(match[1].toLowerCase())) {
    return false;
  }

  // Check for dangerous attributes
  const dangerousPatterns = [
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /onload/i,
    /onerror/i,
    /onclick/i,
    /<script/i
  ];

  return !dangerousPatterns.some(pattern => pattern.test(embedCode));
}
