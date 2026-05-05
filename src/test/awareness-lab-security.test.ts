/**
 * Awareness Lab Security Tests
 * Tests for security measures including validation, rate limiting, and CSP
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  QuizSubmissionValidator,
  ExternalLinkValidator,
  QuizSessionValidator,
  AwarenessLabRateLimiter
} from '@/lib/security/awareness-lab-security';
import {
  AwarenessLabCSPManager,
  CSPViolationReporter
} from '@/lib/security/awareness-lab-csp';
import { AwarenessLabSecurityMiddleware } from '@/lib/security/awareness-lab-middleware';

describe('Quiz Submission Validator', () => {
  let validator: QuizSubmissionValidator;

  beforeEach(() => {
    validator = new QuizSubmissionValidator();
  });

  it('should validate correct quiz submission', () => {
    const answers = {
      'q1': ['A'],
      'q2': ['true']
    };
    const timeTakenSeconds = 300;
    const quizData = {
      id: 'quiz1',
      timeLimitMinutes: 10,
      questions: [
        {
          id: 'q1',
          questionType: 'mcq',
          questionData: { options: ['A', 'B', 'C'] }
        },
        {
          id: 'q2',
          questionType: 'true_false',
          questionData: { options: ['true', 'false'] }
        }
      ]
    };
    const attemptData = {
      userId: 'user1',
      startedAt: new Date(Date.now() - 300000), // 5 minutes ago
      isCompleted: false
    };

    const result = validator.validateSubmission(
      answers,
      timeTakenSeconds,
      quizData,
      attemptData,
      'user1',
      'req123'
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.securityScore).toBeGreaterThan(80);
  });

  it('should detect time limit exceeded', () => {
    const answers = { 'q1': ['A'] };
    const timeTakenSeconds = 700; // 11+ minutes
    const quizData = {
      id: 'quiz1',
      timeLimitMinutes: 10,
      questions: [{ id: 'q1', questionType: 'mcq' }]
    };
    const attemptData = {
      userId: 'user1',
      startedAt: new Date(Date.now() - 700000),
      isCompleted: false
    };

    const result = validator.validateSubmission(
      answers,
      timeTakenSeconds,
      quizData,
      attemptData,
      'user1',
      'req123'
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Time limit exceeded');
  });

  it('should detect suspicious fast completion', () => {
    const answers = { 'q1': ['A'], 'q2': ['B'], 'q3': ['C'] };
    const timeTakenSeconds = 5; // Too fast
    const quizData = {
      id: 'quiz1',
      timeLimitMinutes: 10,
      questions: [
        { id: 'q1', questionType: 'mcq' },
        { id: 'q2', questionType: 'mcq' },
        { id: 'q3', questionType: 'mcq' }
      ]
    };
    const attemptData = {
      userId: 'user1',
      startedAt: new Date(Date.now() - 5000),
      isCompleted: false
    };

    const result = validator.validateSubmission(
      answers,
      timeTakenSeconds,
      quizData,
      attemptData,
      'user1',
      'req123'
    );

    expect(result.warnings).toContain('Suspiciously fast completion time');
  });

  it('should detect sequential answer patterns', () => {
    const answers = {
      'q1': ['A'],
      'q2': ['B'],
      'q3': ['C'],
      'q4': ['D'],
      'q5': ['A']
    };
    const timeTakenSeconds = 100;
    const quizData = {
      id: 'quiz1',
      timeLimitMinutes: 10,
      questions: Array.from({ length: 5 }, (_, i) => ({
        id: `q${i + 1}`,
        questionType: 'mcq'
      }))
    };
    const attemptData = {
      userId: 'user1',
      startedAt: new Date(Date.now() - 100000),
      isCompleted: false
    };

    const result = validator.validateSubmission(
      answers,
      timeTakenSeconds,
      quizData,
      attemptData,
      'user1',
      'req123'
    );

    expect(result.warnings).toContain('Sequential answer pattern detected');
  });

  it('should validate answer format by question type', () => {
    const answers = {
      'q1': ['A', 'B'], // MCQ should have only one answer
      'q2': [] // Multiple select should have at least one answer
    };
    const timeTakenSeconds = 300;
    const quizData = {
      id: 'quiz1',
      timeLimitMinutes: 10,
      questions: [
        {
          id: 'q1',
          questionType: 'mcq',
          questionData: { options: ['A', 'B', 'C'] }
        },
        {
          id: 'q2',
          questionType: 'multiple_select',
          questionData: { options: ['X', 'Y', 'Z'] }
        }
      ]
    };
    const attemptData = {
      userId: 'user1',
      startedAt: new Date(Date.now() - 300000),
      isCompleted: false
    };

    const result = validator.validateSubmission(
      answers,
      timeTakenSeconds,
      quizData,
      attemptData,
      'user1',
      'req123'
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Single choice question q1 must have exactly one answer');
    expect(result.errors).toContain('Multiple select question q2 must have at least one answer');
  });
});

describe('External Link Validator', () => {
  let validator: ExternalLinkValidator;

  beforeEach(() => {
    validator = new ExternalLinkValidator();
  });

  it('should validate allowed YouTube URLs', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const result = validator.validateExternalLink(url);

    expect(result.isValid).toBe(true);
    expect(result.isApproved).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.sanitizedUrl).toBe(url);
  });

  it('should validate allowed Vimeo URLs', () => {
    const url = 'https://vimeo.com/123456789';
    const result = validator.validateExternalLink(url);

    expect(result.isValid).toBe(true);
    expect(result.isApproved).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject non-HTTPS URLs', () => {
    const url = 'http://example.com/video';
    const result = validator.validateExternalLink(url);

    expect(result.isValid).toBe(true); // Valid format
    expect(result.isApproved).toBe(false); // Not approved domain
    expect(result.warnings).toContain('Domain example.com is not in the approved list');
  });

  it('should reject malicious URLs', () => {
    const url = 'javascript:alert("xss")';
    const result = validator.validateExternalLink(url);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Only HTTP and HTTPS protocols are allowed');
  });

  it('should detect suspicious patterns', () => {
    const url = 'https://youtube.com/watch?v=123&onclick=alert()';
    const result = validator.validateExternalLink(url);

    expect(result.warnings).toContain('URL contains potentially suspicious patterns');
  });

  it('should sanitize URLs by removing dangerous parameters', () => {
    const url = 'https://youtube.com/watch?v=123&javascript=alert()&script=evil';
    const result = validator.validateExternalLink(url);

    expect(result.sanitizedUrl).not.toContain('javascript=');
    expect(result.sanitizedUrl).not.toContain('script=');
    expect(result.sanitizedUrl).toContain('v=123');
  });
});

describe('CSP Manager', () => {
  let cspManager: AwarenessLabCSPManager;

  beforeEach(() => {
    cspManager = new AwarenessLabCSPManager();
  });

  it('should generate restrictive CSP for quiz pages', () => {
    const nonce = 'test-nonce-123';
    const csp = cspManager.generateQuizCSP(nonce);

    expect(csp).toContain(`script-src 'self' 'nonce-${nonce}'`);
    expect(csp).toContain(`frame-src 'none'`);
    expect(csp).toContain(`object-src 'none'`);
    expect(csp).toContain(`frame-ancestors 'none'`);
  });

  it('should generate permissive CSP for learning materials', () => {
    const nonce = 'test-nonce-123';
    const csp = cspManager.generateLearningMaterialsCSP(nonce);

    expect(csp).toContain(`script-src 'self' 'nonce-${nonce}'`);
    expect(csp).toContain('https://*.youtube.com');
    expect(csp).toContain('https://*.vimeo.com');
    expect(csp).toContain('frame-src');
  });

  it('should add additional sources to CSP', () => {
    const nonce = 'test-nonce-123';
    const additionalSources = ['https://docs.google.com/document/123'];
    const csp = cspManager.generateLearningMaterialsCSP(nonce, additionalSources);

    expect(csp).toContain('https://docs.google.com');
  });

  it('should validate external content by type', () => {
    const videoUrl = 'https://www.youtube.com/watch?v=123';
    const result = cspManager.validateExternalContent(videoUrl, 'video');

    expect(result.isAllowed).toBe(true);
    expect(result.cspDirective).toContain('frame-src');
    expect(result.cspDirective).toContain('media-src');
  });

  it('should reject disallowed domains', () => {
    const maliciousUrl = 'https://evil.com/video';
    const result = cspManager.validateExternalContent(maliciousUrl, 'video');

    expect(result.isAllowed).toBe(false);
    expect(result.errors).toContain('Domain evil.com is not allowed for video content');
  });
});

describe('Rate Limiter', () => {
  it('should have appropriate limits for different operations', () => {
    expect(AwarenessLabRateLimiter.CONFIGS.QUIZ_ATTEMPT.maxAttempts).toBe(20);
    expect(AwarenessLabRateLimiter.CONFIGS.QUIZ_SUBMISSION.maxAttempts).toBe(10);
    expect(AwarenessLabRateLimiter.CONFIGS.LEARNING_MATERIAL_ACCESS.maxAttempts).toBe(100);
    expect(AwarenessLabRateLimiter.CONFIGS.ADMIN_QUIZ_CREATION.maxAttempts).toBe(50);
  });

  it('should have appropriate time windows', () => {
    expect(AwarenessLabRateLimiter.CONFIGS.QUIZ_ATTEMPT.windowMs).toBe(60 * 60 * 1000); // 1 hour
    expect(AwarenessLabRateLimiter.CONFIGS.QUIZ_SUBMISSION.windowMs).toBe(5 * 60 * 1000); // 5 minutes
  });
});

describe('Security Middleware', () => {
  let middleware: AwarenessLabSecurityMiddleware;

  beforeEach(() => {
    middleware = new AwarenessLabSecurityMiddleware();
  });

  it('should create middleware with default config', () => {
    expect(middleware).toBeDefined();
  });

  it('should generate unique request IDs', () => {
    const id1 = (middleware as any).generateRequestId();
    const id2 = (middleware as any).generateRequestId();

    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
  });

  it('should generate cryptographic nonces', () => {
    const nonce1 = (middleware as any).generateNonce();
    const nonce2 = (middleware as any).generateNonce();

    expect(nonce1).not.toBe(nonce2);
    expect(nonce1.length).toBeGreaterThan(10);
    expect(nonce2.length).toBeGreaterThan(10);
  });
});

describe('CSP Violation Reporter', () => {
  it('should handle CSP violation reports', async () => {
    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        'csp-report': {
          'document-uri': 'https://example.com/quiz',
          'violated-directive': 'script-src',
          'blocked-uri': 'https://evil.com/script.js'
        }
      }),
      headers: {
        get: vi.fn().mockReturnValue('Mozilla/5.0')
      }
    } as any;

    const response = await CSPViolationReporter.handleViolationReport(mockRequest);

    expect(response.status).toBe(200);
    expect(mockRequest.json).toHaveBeenCalled();
  });

  it('should handle malformed violation reports', async () => {
    const mockRequest = {
      json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      headers: {
        get: vi.fn().mockReturnValue('Mozilla/5.0')
      }
    } as any;

    const response = await CSPViolationReporter.handleViolationReport(mockRequest);

    expect(response.status).toBe(400);
  });
});

describe('Integration Tests', () => {
  it('should validate complete quiz submission flow', () => {
    const validator = new QuizSubmissionValidator();

    // Simulate a legitimate quiz submission
    const answers = {
      'q1': ['A'],
      'q2': ['true'],
      'q3': ['X', 'Y'] // Multiple select
    };
    const timeTakenSeconds = 420; // 7 minutes
    const quizData = {
      id: 'quiz1',
      timeLimitMinutes: 15,
      questions: [
        {
          id: 'q1',
          questionType: 'mcq',
          questionData: {
            question: 'What is 2+2?',
            options: ['A', 'B', 'C', 'D']
          },
          correctAnswers: ['A']
        },
        {
          id: 'q2',
          questionType: 'true_false',
          questionData: {
            question: 'The sky is blue',
            options: ['true', 'false']
          },
          correctAnswers: ['true']
        },
        {
          id: 'q3',
          questionType: 'multiple_select',
          questionData: {
            question: 'Select all that apply',
            options: ['X', 'Y', 'Z']
          },
          correctAnswers: ['X', 'Y']
        }
      ]
    };
    const attemptData = {
      userId: 'user1',
      startedAt: new Date(Date.now() - 420000), // 7 minutes ago
      isCompleted: false
    };

    const result = validator.validateSubmission(
      answers,
      timeTakenSeconds,
      quizData,
      attemptData,
      'user1',
      'req123'
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.securityScore).toBe(100);
  });

  it('should handle external link validation in learning materials', () => {
    const validator = new ExternalLinkValidator();
    const cspManager = new AwarenessLabCSPManager();

    const urls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://vimeo.com/123456789',
      'https://docs.google.com/document/d/123/edit'
    ];

    const validationResults = urls.map(url => validator.validateExternalLink(url));
    const allValid = validationResults.every(result => result.isValid);
    const allApproved = validationResults.every(result => result.isApproved);

    expect(allValid).toBe(true);
    expect(allApproved).toBe(true);

    // Test CSP generation with these URLs
    const nonce = 'test-nonce';
    const csp = cspManager.generateLearningMaterialsCSP(nonce, urls);

    expect(csp).toContain('youtube.com');
    expect(csp).toContain('vimeo.com');
    expect(csp).toContain('docs.google.com');
  });
});
