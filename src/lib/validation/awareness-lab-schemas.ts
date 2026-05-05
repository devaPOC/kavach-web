import { z } from 'zod';
import { sanitizeHtml, validateMultilingualContent, isValidUrl } from './awareness-lab-utils';

// Language enum for awareness lab content
export enum AwarenessLabLanguage {
  ENGLISH = 'en',
  ARABIC = 'ar'
}

// Question types enum
export enum QuestionType {
  MCQ = 'mcq',
  TRUE_FALSE = 'true_false',
  MULTIPLE_SELECT = 'multiple_select'
}

// Material types enum
export enum MaterialType {
  LINK = 'link',
  VIDEO = 'video',
  DOCUMENT = 'document'
}

// Base schemas for common fields
export const languageSchema = z.nativeEnum(AwarenessLabLanguage);
export const questionTypeSchema = z.nativeEnum(QuestionType);
export const materialTypeSchema = z.nativeEnum(MaterialType);

// Multilingual text schema with sanitization
export const multilingualTextSchema = z
  .string()
  .min(1, 'Content is required')
  .max(5000, 'Content must be less than 5000 characters')
  .transform(sanitizeHtml)
  .refine(validateMultilingualContent, {
    message: 'Content contains invalid characters or formatting'
  });

// Optional multilingual text schema that allows empty strings
export const optionalMultilingualTextSchema = z
  .string()
  .max(5000, 'Content must be less than 5000 characters')
  .transform(sanitizeHtml)
  .refine((content) => !content || validateMultilingualContent(content), {
    message: 'Content contains invalid characters or formatting'
  })
  .optional();

// Short multilingual text for titles
export const shortMultilingualTextSchema = z
  .string()
  .min(1, 'Title is required')
  .max(255, 'Title must be less than 255 characters')
  .transform(sanitizeHtml)
  .refine(validateMultilingualContent, {
    message: 'Title contains invalid characters or formatting'
  });

// URL validation with sanitization
export const urlSchema = z
  .string()
  .min(1, 'URL is required')
  .max(2048, 'URL must be less than 2048 characters')
  .refine(isValidUrl, {
    message: 'Please enter a valid URL'
  });

// Optional URL schema
export const optionalUrlSchema = z
  .string()
  .max(2048, 'URL must be less than 2048 characters')
  .optional()
  .refine((url) => !url || isValidUrl(url), {
    message: 'Please enter a valid URL'
  });

// Time limit validation (1-180 minutes)
export const timeLimitSchema = z
  .number()
  .int('Time limit must be a whole number')
  .min(1, 'Time limit must be at least 1 minute')
  .max(180, 'Time limit cannot exceed 180 minutes');

// Attempt limit validation (1-10 attempts)
export const attemptLimitSchema = z
  .number()
  .int('Attempt limit must be a whole number')
  .min(1, 'Must allow at least 1 attempt')
  .max(10, 'Cannot exceed 10 attempts per user');

// Quiz question data schema
export const questionDataSchema = z.object({
  question: multilingualTextSchema,
  options: z
    .array(shortMultilingualTextSchema)
    .min(2, 'Must have at least 2 options')
    .max(6, 'Cannot have more than 6 options')
    .optional(),
  explanation: optionalMultilingualTextSchema
});

// Quiz question schema
export const quizQuestionSchema = z.object({
  questionType: questionTypeSchema,
  questionData: questionDataSchema,
  correctAnswers: z
    .array(z.string().min(1, 'Answer cannot be empty'))
    .min(1, 'Must have at least one correct answer')
    .max(6, 'Cannot have more than 6 correct answers'),
  orderIndex: z
    .number()
    .int('Order index must be a whole number')
    .min(0, 'Order index cannot be negative')
}).refine((data) => {
  // Validate question type specific requirements
  switch (data.questionType) {
    case QuestionType.TRUE_FALSE:
      // For true/false questions, correct answers should be 'true' or 'false'
      return data.correctAnswers.length === 1 &&
        ['true', 'false'].includes(data.correctAnswers[0]?.toLowerCase());
    
    case QuestionType.MCQ:
      // For MCQ, must have exactly one correct answer that matches an option
      if (data.correctAnswers.length !== 1) return false;
      if (!data.questionData.options || data.questionData.options.length < 2) return false;
      return data.questionData.options.includes(data.correctAnswers[0]);
    
    case QuestionType.MULTIPLE_SELECT:
      // For multiple select, all correct answers must match available options
      if (data.correctAnswers.length < 1) return false;
      if (!data.questionData.options || data.questionData.options.length < 2) return false;
      return data.correctAnswers.every(answer => data.questionData.options!.includes(answer));
    
    default:
      return false;
  }
}, {
  message: 'Correct answers do not match question options or question type requirements'
});

// Quiz creation schema
export const quizCreationSchema = z.object({
  title: shortMultilingualTextSchema,
  description: optionalMultilingualTextSchema,
  language: languageSchema,
  targetAudience: z.enum(['customer', 'expert']),
  timeLimitMinutes: timeLimitSchema,
  maxAttempts: attemptLimitSchema,
  questions: z
    .array(quizQuestionSchema)
    .min(1, 'Quiz must have at least one question')
    .max(50, 'Quiz cannot have more than 50 questions'),
  templateId: z.string().uuid().optional(),
  endDate: z.union([
    z.date(),
    z.string().transform((str) => new Date(str))
  ]).optional().refine((date) => {
    if (!date) return true;
    return date > new Date();
  }, {
    message: 'End date must be in the future'
  })
});

// Quiz update schema (partial)
export const quizUpdateSchema = quizCreationSchema.partial().extend({
  isPublished: z.boolean().optional(),
  endDate: z.union([
    z.date(),
    z.string().transform((str) => new Date(str))
  ]).optional().refine((date) => {
    if (!date) return true;
    return date > new Date();
  }, {
    message: 'End date must be in the future'
  })
});

// Quiz attempt submission schema
export const quizAttemptSchema = z.object({
  quizId: z.string().uuid('Invalid quiz ID'),
  answers: z.record(
    z.string().uuid('Invalid question ID'),
    z.array(z.string().min(1, 'Answer cannot be empty'))
  ),
  timeTakenSeconds: z
    .number()
    .int('Time taken must be a whole number')
    .min(0, 'Time taken cannot be negative')
});

// Quiz template schema
export const quizTemplateSchema = z.object({
  name: shortMultilingualTextSchema,
  description: optionalMultilingualTextSchema,
  templateConfig: z.object({
    timeLimitMinutes: timeLimitSchema,
    maxAttempts: attemptLimitSchema,
    language: languageSchema,
    questionTypes: z
      .array(questionTypeSchema)
      .min(1, 'Must specify at least one question type'),
    defaultQuestionCount: z
      .number()
      .int('Question count must be a whole number')
      .min(1, 'Must have at least 1 question')
      .max(50, 'Cannot exceed 50 questions')
  })
});

// Learning module material data schema
export const materialDataSchema = z.object({
  url: optionalUrlSchema,
  embedCode: z.string().max(2000, 'Embed code too long').optional(),
  fileUrl: optionalUrlSchema,
  duration: z
    .number()
    .int('Duration must be a whole number')
    .min(0, 'Duration cannot be negative')
    .optional()
}).refine((data) => {
  // At least one content source must be provided
  return data.url || data.embedCode || data.fileUrl;
}, {
  message: 'Must provide at least one content source (URL, embed code, or file URL)'
});

// Learning module material schema
export const moduleMaterialSchema = z.object({
  materialType: materialTypeSchema,
  title: shortMultilingualTextSchema,
  description: optionalMultilingualTextSchema,
  materialData: materialDataSchema,
  orderIndex: z
    .number()
    .int('Order index must be a whole number')
    .min(0, 'Order index cannot be negative')
});

// Learning module schema
export const learningModuleSchema = z.object({
  title: shortMultilingualTextSchema,
  description: optionalMultilingualTextSchema,
  category: z
    .string()
    .min(1, 'Category is required')
    .max(100, 'Category must be less than 100 characters')
    .transform(sanitizeHtml),
  targetAudience: z.enum(['customer', 'expert']),
  orderIndex: z
    .number()
    .int('Order index must be a whole number')
    .min(0, 'Order index cannot be negative'),
  materials: z
    .array(moduleMaterialSchema)
    .max(20, 'Module cannot have more than 20 materials')
    .optional()
});

// Learning module update schema
export const learningModuleUpdateSchema = learningModuleSchema.partial().extend({
  isPublished: z.boolean().optional()
});

// Progress tracking schema
export const progressUpdateSchema = z.object({
  moduleId: z.string().uuid('Invalid module ID'),
  materialId: z.string().uuid('Invalid material ID').optional(),
  isCompleted: z.boolean()
});

// Analytics filter schema
export const analyticsFilterSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  userId: z.string().uuid().optional(),
  quizId: z.string().uuid().optional(),
  completedOnly: z.boolean().optional()
});

// Export type definitions
export type QuizCreationData = z.infer<typeof quizCreationSchema>;
export type QuizUpdateData = z.infer<typeof quizUpdateSchema>;
export type QuizQuestionData = z.infer<typeof quizQuestionSchema>;
export type QuizAttemptData = z.infer<typeof quizAttemptSchema>;
export type QuizTemplateData = z.infer<typeof quizTemplateSchema>;
export type LearningModuleData = z.infer<typeof learningModuleSchema>;
export type LearningModuleUpdateData = z.infer<typeof learningModuleUpdateSchema>;
export type ModuleMaterialData = z.infer<typeof moduleMaterialSchema>;
export type ProgressUpdateData = z.infer<typeof progressUpdateSchema>;
export type AnalyticsFilterData = z.infer<typeof analyticsFilterSchema>;

// Schema collections for easy access
export const awarenessLabSchemas = {
  quiz: {
    creation: quizCreationSchema,
    update: quizUpdateSchema,
    question: quizQuestionSchema,
    attempt: quizAttemptSchema
  },
  template: {
    creation: quizTemplateSchema,
    update: quizTemplateSchema.partial()
  },
  learning: {
    module: learningModuleSchema,
    moduleUpdate: learningModuleUpdateSchema,
    material: moduleMaterialSchema,
    progress: progressUpdateSchema
  },
  analytics: {
    filter: analyticsFilterSchema
  }
} as const;
