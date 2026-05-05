import { describe, it, expect } from 'vitest';
import {
  quizCreationSchema,
  quizQuestionSchema,
  quizAttemptSchema,
  learningModuleSchema,
  QuestionType,
  AwarenessLabLanguage,
  MaterialType
} from '../awareness-lab-schemas';
import {
  sanitizeHtml,
  validateMultilingualContent,
  isValidUrl,
  validateVideoUrl,
  calculateQuizScore,
  validateQuizTime,
  validateQuizAnswers
} from '../awareness-lab-utils';
import {
  QuizError,
  QuestionError,
  ContentValidationError,
  AwarenessLabErrorCode
} from '../../errors/awareness-lab-errors';

describe('Awareness Lab Validation Schemas', () => {
  describe('Quiz Creation Schema', () => {
    it('should validate a valid quiz creation request', () => {
      const validQuiz = {
        title: 'Cybersecurity Basics',
        description: 'Learn the fundamentals of cybersecurity',
        language: AwarenessLabLanguage.ENGLISH,
        timeLimitMinutes: 30,
        maxAttempts: 3,
        questions: [
          {
            questionType: QuestionType.MCQ,
            questionData: {
              question: 'What is phishing?',
              options: ['Email scam', 'Fishing technique', 'Computer virus', 'Password manager'],
              explanation: 'Phishing is a type of social engineering attack'
            },
            correctAnswers: ['Email scam'],
            orderIndex: 0
          }
        ]
      };

      const result = quizCreationSchema.safeParse(validQuiz);
      expect(result.success).toBe(true);
    });

    it('should reject quiz with invalid time limit', () => {
      const invalidQuiz = {
        title: 'Test Quiz',
        language: AwarenessLabLanguage.ENGLISH,
        timeLimitMinutes: 200, // Too high
        maxAttempts: 3,
        questions: []
      };

      const result = quizCreationSchema.safeParse(invalidQuiz);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.path.includes('timeLimitMinutes')
        )).toBe(true);
      }
    });

    it('should reject quiz with too many questions', () => {
      const questions = Array.from({ length: 51 }, (_, i) => ({
        questionType: QuestionType.TRUE_FALSE,
        questionData: {
          question: `Question ${i + 1}?`
        },
        correctAnswers: ['true'],
        orderIndex: i
      }));

      const invalidQuiz = {
        title: 'Test Quiz',
        language: AwarenessLabLanguage.ENGLISH,
        timeLimitMinutes: 30,
        maxAttempts: 3,
        questions
      };

      const result = quizCreationSchema.safeParse(invalidQuiz);
      expect(result.success).toBe(false);
    });
  });

  describe('Quiz Question Schema', () => {
    it('should validate MCQ question with options', () => {
      const mcqQuestion = {
        questionType: QuestionType.MCQ,
        questionData: {
          question: 'What is a firewall?',
          options: ['Security barrier', 'Physical wall', 'Software bug', 'Network cable'],
          explanation: 'A firewall is a network security system'
        },
        correctAnswers: ['Security barrier'],
        orderIndex: 0
      };

      const result = quizQuestionSchema.safeParse(mcqQuestion);
      expect(result.success).toBe(true);
    });

    it('should validate True/False question', () => {
      const trueFalseQuestion = {
        questionType: QuestionType.TRUE_FALSE,
        questionData: {
          question: 'Passwords should be shared with colleagues.',
          explanation: 'Passwords should never be shared'
        },
        correctAnswers: ['false'],
        orderIndex: 0
      };

      const result = quizQuestionSchema.safeParse(trueFalseQuestion);
      expect(result.success).toBe(true);
    });

    it('should validate Multiple Select question', () => {
      const multiSelectQuestion = {
        questionType: QuestionType.MULTIPLE_SELECT,
        questionData: {
          question: 'Which are types of malware?',
          options: ['Virus', 'Trojan', 'Firewall', 'Worm', 'Antivirus'],
          explanation: 'Virus, Trojan, and Worm are types of malware'
        },
        correctAnswers: ['Virus', 'Trojan', 'Worm'],
        orderIndex: 0
      };

      const result = quizQuestionSchema.safeParse(multiSelectQuestion);
      expect(result.success).toBe(true);
    });

    it('should reject True/False with multiple correct answers', () => {
      const invalidQuestion = {
        questionType: QuestionType.TRUE_FALSE,
        questionData: {
          question: 'Test question?'
        },
        correctAnswers: ['true', 'false'], // Invalid for true/false
        orderIndex: 0
      };

      const result = quizQuestionSchema.safeParse(invalidQuestion);
      expect(result.success).toBe(false);
    });
  });

  describe('Learning Module Schema', () => {
    it('should validate a valid learning module', () => {
      const validModule = {
        title: 'Password Security',
        description: 'Learn about creating strong passwords',
        category: 'authentication',
        orderIndex: 0,
        materials: [
          {
            materialType: MaterialType.LINK,
            title: 'Password Best Practices',
            description: 'External article on password security',
            materialData: {
              url: 'https://example.com/password-guide'
            },
            orderIndex: 0
          }
        ]
      };

      const result = learningModuleSchema.safeParse(validModule);
      expect(result.success).toBe(true);
    });

    it('should reject module with invalid material URL', () => {
      const invalidModule = {
        title: 'Test Module',
        category: 'test',
        orderIndex: 0,
        materials: [
          {
            materialType: MaterialType.LINK,
            title: 'Test Material',
            materialData: {
              url: 'invalid-url'
            },
            orderIndex: 0
          }
        ]
      };

      const result = learningModuleSchema.safeParse(invalidModule);
      expect(result.success).toBe(false);
    });
  });
});

describe('Awareness Lab Validation Utilities', () => {
  describe('sanitizeHtml', () => {
    it('should remove dangerous HTML tags', () => {
      const dangerousHtml = '<script>alert("xss")</script><p>Safe content</p>';
      const sanitized = sanitizeHtml(dangerousHtml);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('<p>Safe content</p>');
    });

    it('should preserve safe formatting tags', () => {
      const safeHtml = '<p>This is <strong>bold</strong> and <em>italic</em> text.</p>';
      const sanitized = sanitizeHtml(safeHtml);
      
      expect(sanitized).toBe(safeHtml);
    });

    it('should handle empty or null input', () => {
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml(null as any)).toBe(null);
    });
  });

  describe('validateMultilingualContent', () => {
    it('should accept valid English content', () => {
      const englishText = 'This is valid English content with numbers 123 and punctuation!';
      expect(validateMultilingualContent(englishText)).toBe(true);
    });

    it('should accept valid Arabic content', () => {
      const arabicText = 'هذا نص عربي صحيح مع أرقام ١٢٣ وعلامات ترقيم!';
      expect(validateMultilingualContent(arabicText)).toBe(true);
    });

    it('should reject content with script tags', () => {
      const maliciousContent = 'Normal text <script>alert("xss")</script>';
      expect(validateMultilingualContent(maliciousContent)).toBe(false);
    });

    it('should reject content with null bytes', () => {
      const maliciousContent = 'Text with null byte\x00';
      expect(validateMultilingualContent(maliciousContent)).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should accept valid HTTPS URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('https://subdomain.example.com/path?query=value')).toBe(true);
    });

    it('should accept valid HTTP URLs', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
    });

    it('should reject invalid protocols', () => {
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('file:///etc/passwd')).toBe(false);
      expect(isValidUrl('javascript:alert("xss")')).toBe(false);
    });

    it('should reject malformed URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('http://')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('validateVideoUrl', () => {
    it('should validate YouTube URLs', () => {
      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const result = validateVideoUrl(youtubeUrl);
      
      expect(result.isValid).toBe(true);
      expect(result.platform).toBe('youtube');
      expect(result.videoId).toBe('dQw4w9WgXcQ');
    });

    it('should validate Vimeo URLs', () => {
      const vimeoUrl = 'https://vimeo.com/123456789';
      const result = validateVideoUrl(vimeoUrl);
      
      expect(result.isValid).toBe(true);
      expect(result.platform).toBe('vimeo');
      expect(result.videoId).toBe('123456789');
    });

    it('should validate direct video file URLs', () => {
      const videoUrl = 'https://example.com/video.mp4';
      const result = validateVideoUrl(videoUrl);
      
      expect(result.isValid).toBe(true);
      expect(result.platform).toBe('direct');
    });

    it('should reject non-video URLs', () => {
      const nonVideoUrl = 'https://example.com/document.pdf';
      const result = validateVideoUrl(nonVideoUrl);
      
      expect(result.isValid).toBe(false);
    });
  });

  describe('calculateQuizScore', () => {
    it('should calculate correct score for all correct answers', () => {
      const userAnswers = {
        'q1': ['answer1'],
        'q2': ['answer2'],
        'q3': ['answer3']
      };
      const correctAnswers = {
        'q1': ['answer1'],
        'q2': ['answer2'],
        'q3': ['answer3']
      };

      const score = calculateQuizScore(userAnswers, correctAnswers);
      expect(score).toBe(100);
    });

    it('should calculate correct score for partial correct answers', () => {
      const userAnswers = {
        'q1': ['answer1'],
        'q2': ['wrong'],
        'q3': ['answer3']
      };
      const correctAnswers = {
        'q1': ['answer1'],
        'q2': ['answer2'],
        'q3': ['answer3']
      };

      const score = calculateQuizScore(userAnswers, correctAnswers);
      expect(score).toBe(67); // 2 out of 3 correct, rounded
    });

    it('should handle multiple select questions', () => {
      const userAnswers = {
        'q1': ['answer1', 'answer2'],
        'q2': ['answer3']
      };
      const correctAnswers = {
        'q1': ['answer1', 'answer2'],
        'q2': ['answer3']
      };

      const score = calculateQuizScore(userAnswers, correctAnswers);
      expect(score).toBe(100);
    });
  });

  describe('validateQuizTime', () => {
    it('should accept valid time within limit', () => {
      const startTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      const result = validateQuizTime(600, 15, startTime); // 10 minutes taken, 15 minute limit
      
      expect(result.isValid).toBe(true);
    });

    it('should reject time exceeding limit', () => {
      const startTime = new Date(Date.now() - 20 * 60 * 1000); // 20 minutes ago
      const result = validateQuizTime(1200, 15, startTime); // 20 minutes taken, 15 minute limit
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeded time limit');
    });

    it('should reject negative time', () => {
      const startTime = new Date();
      const result = validateQuizTime(-100, 15, startTime);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid time taken');
    });
  });

  describe('validateQuizAnswers', () => {
    it('should validate correct MCQ answers', () => {
      const result = validateQuizAnswers(['option1'], 'mcq', ['option1', 'option2', 'option3']);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate correct True/False answers', () => {
      const result = validateQuizAnswers(['true'], 'true_false');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate correct Multiple Select answers', () => {
      const result = validateQuizAnswers(['option1', 'option3'], 'multiple_select', ['option1', 'option2', 'option3']);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid MCQ answers', () => {
      const result = validateQuizAnswers(['invalid'], 'mcq', ['option1', 'option2']);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject multiple answers for MCQ', () => {
      const result = validateQuizAnswers(['option1', 'option2'], 'mcq', ['option1', 'option2']);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('exactly one answer'))).toBe(true);
    });
  });
});

describe('Awareness Lab Error Classes', () => {
  describe('QuizError', () => {
    it('should create quiz not found error', () => {
      const error = QuizError.notFound('quiz-123', 'req-456');
      
      expect(error.code).toBe(AwarenessLabErrorCode.QUIZ_NOT_FOUND);
      expect(error.message).toContain('quiz-123');
      expect(error.statusCode).toBe(404);
      expect(error.requestId).toBe('req-456');
    });

    it('should create attempt limit exceeded error', () => {
      const error = QuizError.attemptLimitExceeded('quiz-123', 3, 3, 'req-456');
      
      expect(error.code).toBe(AwarenessLabErrorCode.ATTEMPT_LIMIT_EXCEEDED);
      expect(error.message).toContain('Maximum 3 attempts');
      expect(error.statusCode).toBe(429);
      expect(error.details?.maxAttempts).toBe(3);
      expect(error.details?.currentAttempts).toBe(3);
    });

    it('should create time expired error', () => {
      const error = QuizError.timeExpired('quiz-123', 30, 'req-456');
      
      expect(error.code).toBe(AwarenessLabErrorCode.QUIZ_TIME_EXPIRED);
      expect(error.message).toContain('30 minutes');
      expect(error.statusCode).toBe(410);
    });
  });

  describe('ContentValidationError', () => {
    it('should create invalid multilingual content error', () => {
      const error = ContentValidationError.invalidMultilingualContent('title', 'bad content', 'req-456');
      
      expect(error.code).toBe(AwarenessLabErrorCode.INVALID_MULTILINGUAL_CONTENT);
      expect(error.field).toBe('title');
      expect(error.statusCode).toBe(400);
    });

    it('should create content too long error', () => {
      const error = ContentValidationError.contentTooLong('description', 1000, 1500, 'req-456');
      
      expect(error.code).toBe(AwarenessLabErrorCode.CONTENT_TOO_LONG);
      expect(error.message).toContain('1000 characters');
      expect(error.message).toContain('1500 provided');
      expect(error.details?.maxLength).toBe(1000);
      expect(error.details?.actualLength).toBe(1500);
    });
  });

  describe('QuestionError', () => {
    it('should create invalid question type error', () => {
      const error = QuestionError.invalidType('invalid_type', 'req-456');
      
      expect(error.code).toBe(AwarenessLabErrorCode.INVALID_QUESTION_TYPE);
      expect(error.message).toContain('invalid_type');
      expect(error.statusCode).toBe(400);
    });

    it('should create missing correct answers error', () => {
      const error = QuestionError.missingCorrectAnswers('question-123', 'req-456');
      
      expect(error.code).toBe(AwarenessLabErrorCode.MISSING_CORRECT_ANSWERS);
      expect(error.details?.questionId).toBe('question-123');
    });
  });
});