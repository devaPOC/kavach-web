# Awareness Lab Validation System

This document describes the validation schemas, utilities, and error handling for the Awareness Lab feature.

## Overview

The Awareness Lab validation system provides comprehensive input validation, sanitization, and error handling for:

- Quiz creation and management
- Question validation (MCQ, True/False, Multiple Select)
- Learning module and material management
- Quiz attempt submission and scoring
- Multilingual content (Arabic and English)
- Security and anti-cheating measures

## Validation Schemas

### Quiz Schemas

#### `quizCreationSchema`
Validates quiz creation requests with the following fields:
- `title`: Required, sanitized multilingual text (max 255 chars)
- `description`: Optional multilingual text (max 5000 chars)
- `language`: Required enum (`en` | `ar`)
- `timeLimitMinutes`: Required integer (1-180 minutes)
- `maxAttempts`: Required integer (1-10 attempts)
- `questions`: Array of quiz questions (1-50 questions)
- `templateId`: Optional UUID for template-based creation

#### `quizQuestionSchema`
Validates individual quiz questions:
- `questionType`: Required enum (`mcq` | `true_false` | `multiple_select`)
- `questionData`: Object containing question content
- `correctAnswers`: Array of correct answer strings
- `orderIndex`: Integer for question ordering

**Question Type Validation:**
- **MCQ**: Requires exactly 1 correct answer and 2+ options
- **True/False**: Requires exactly 1 correct answer (`"true"` or `"false"`)
- **Multiple Select**: Requires 1+ correct answers and 2+ options

#### `quizAttemptSchema`
Validates quiz submission:
- `quizId`: Required UUID
- `answers`: Record mapping question IDs to answer arrays
- `timeTakenSeconds`: Non-negative integer

### Learning Module Schemas

#### `learningModuleSchema`
Validates learning module creation:
- `title`: Required sanitized text (max 255 chars)
- `description`: Optional multilingual text
- `category`: Required sanitized category name
- `orderIndex`: Non-negative integer
- `materials`: Optional array of materials (max 20)

#### `moduleMaterialSchema`
Validates learning materials:
- `materialType`: Required enum (`link` | `video` | `document`)
- `title`: Required sanitized text
- `description`: Optional multilingual text
- `materialData`: Object with URL, embed code, or file URL
- `orderIndex`: Non-negative integer

### Template Schemas

#### `quizTemplateSchema`
Validates quiz template creation:
- `name`: Required sanitized text
- `description`: Optional multilingual text
- `templateConfig`: Configuration object with defaults

## Validation Utilities

### Content Sanitization

#### `sanitizeHtml(content: string): string`
Sanitizes HTML content using DOMPurify:
- Removes dangerous tags (`<script>`, `<iframe>`, etc.)
- Preserves safe formatting (`<p>`, `<strong>`, `<em>`, etc.)
- Prevents XSS attacks

#### `validateMultilingualContent(content: string): boolean`
Validates multilingual content:
- Checks for valid Unicode ranges (Arabic and English)
- Prevents control characters and null bytes
- Blocks script tags and JavaScript protocols
- Ensures content safety

### URL Validation

#### `isValidUrl(url: string): boolean`
Validates URL safety:
- Only allows HTTP/HTTPS protocols
- Blocks localhost and private IPs in production
- Prevents dangerous protocols (`file://`, `javascript:`)
- Validates URL format

#### `validateVideoUrl(url: string): ValidationResult`
Specialized video URL validation:
- Supports YouTube, Vimeo, and direct video files
- Extracts platform and video ID information
- Returns validation result with metadata

### Quiz Validation

#### `validateQuizAnswers(answers, questionType, options?): ValidationResult`
Validates quiz answers against question configuration:
- Ensures answer format matches question type
- Validates answers against provided options
- Returns detailed error messages

#### `calculateQuizScore(userAnswers, correctAnswers): number`
Calculates quiz score as percentage:
- Compares user answers to correct answers
- Handles multiple select questions
- Returns rounded percentage (0-100)

#### `validateQuizTime(timeTaken, timeLimit, startTime): ValidationResult`
Validates quiz timing:
- Ensures time taken is within limits
- Includes grace period for network delays
- Validates against actual elapsed time
- Prevents time manipulation

### Language Detection

#### `detectTextLanguage(text: string): 'ar' | 'en' | 'mixed'`
Detects primary language of text content:
- Analyzes character distribution
- Returns language code or 'mixed' for multilingual content

## Error Classes

### Base Error Classes

#### `AwarenessLabError`
Base class for all awareness lab errors:
- Extends native Error class
- Includes error codes, categories, and HTTP status codes
- Supports request IDs for tracing
- Provides structured error details

### Specialized Error Classes

#### `QuizError`
Quiz-specific errors:
- `QuizError.notFound(quizId)`
- `QuizError.attemptLimitExceeded(quizId, maxAttempts, currentAttempts)`
- `QuizError.timeExpired(quizId, timeLimitMinutes)`
- `QuizError.alreadyCompleted(quizId, attemptId)`

#### `QuestionError`
Question validation errors:
- `QuestionError.invalidType(questionType)`
- `QuestionError.invalidOptions(questionId, reason)`
- `QuestionError.missingCorrectAnswers(questionId)`

#### `ContentValidationError`
Content validation errors:
- `ContentValidationError.invalidMultilingualContent(field, content)`
- `ContentValidationError.contentTooLong(field, maxLength, actualLength)`
- `ContentValidationError.unsafeContent(field, reason)`

#### `LearningModuleError`
Learning module errors:
- `LearningModuleError.notFound(moduleId)`
- `LearningModuleError.notPublished(moduleId)`
- `LearningModuleError.invalidMaterialUrl(url, reason)`

## Usage Examples

### Basic Quiz Validation

```typescript
import { quizCreationSchema, QuestionType, AwarenessLabLanguage } from '@/lib/validation/awareness-lab-schemas';

const quizData = {
  title: 'Cybersecurity Basics',
  description: 'Learn fundamental security concepts',
  language: AwarenessLabLanguage.ENGLISH,
  timeLimitMinutes: 30,
  maxAttempts: 3,
  questions: [
    {
      questionType: QuestionType.MCQ,
      questionData: {
        question: 'What is phishing?',
        options: ['Email scam', 'Fishing technique', 'Computer virus'],
        explanation: 'Phishing is a social engineering attack'
      },
      correctAnswers: ['Email scam'],
      orderIndex: 0
    }
  ]
};

const result = quizCreationSchema.safeParse(quizData);
if (result.success) {
  // Quiz data is valid
  console.log('Valid quiz:', result.data);
} else {
  // Handle validation errors
  console.error('Validation errors:', result.error.issues);
}
```

### Content Sanitization

```typescript
import { sanitizeHtml, validateMultilingualContent } from '@/lib/validation/awareness-lab-utils';

const userInput = '<p>Safe content</p><script>alert("xss")</script>';
const sanitized = sanitizeHtml(userInput); // Returns: '<p>Safe content</p>'

const isValid = validateMultilingualContent(sanitized); // Returns: true
```

### Error Handling

```typescript
import { QuizError } from '@/lib/errors/awareness-lab-errors';

try {
  // Quiz operation that might fail
  await submitQuizAttempt(quizId, answers);
} catch (error) {
  if (error instanceof QuizError) {
    switch (error.code) {
      case 'ATTEMPT_LIMIT_EXCEEDED':
        console.log(`Max attempts (${error.details?.maxAttempts}) exceeded`);
        break;
      case 'QUIZ_TIME_EXPIRED':
        console.log('Quiz time limit expired');
        break;
      default:
        console.log('Quiz error:', error.message);
    }
  }
}
```

## Security Features

### XSS Prevention
- All user input is sanitized using DOMPurify
- Dangerous HTML tags and attributes are removed
- Script tags and JavaScript protocols are blocked

### Content Validation
- Multilingual content is validated for proper character encoding
- Control characters and null bytes are rejected
- Malicious patterns are detected and blocked

### URL Security
- Only HTTP/HTTPS protocols are allowed
- Private IP ranges and localhost are blocked in production
- File and JavaScript protocols are prevented

### Anti-Cheating Measures
- Server-side validation of all quiz submissions
- Time validation with grace periods for network delays
- Answer validation against question configuration
- Attempt limit enforcement

## Configuration

### Environment Variables
- `NODE_ENV`: Controls localhost/private IP validation
- Development mode allows localhost URLs for testing

### Validation Limits
- Quiz questions: 1-50 per quiz
- Question options: 2-6 per question
- Time limits: 1-180 minutes
- Attempt limits: 1-10 per user
- Content length: Up to 5000 characters
- Module materials: Up to 20 per module

## Testing

Comprehensive test suite covers:
- Schema validation for all input types
- Content sanitization and security
- Error class functionality
- Edge cases and boundary conditions
- Multilingual content handling

Run tests with:
```bash
npm test -- src/lib/validation/__tests__/awareness-lab-validation.test.ts
```