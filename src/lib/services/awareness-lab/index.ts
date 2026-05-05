/**
 * Awareness Lab Services
 * 
 * This module exports all the core business logic services for the Awareness Lab feature.
 * These services handle quiz management, learning materials, templates, and analytics.
 */

// Service exports
export { QuizService, quizService } from './quiz.service';
export { LearningService, learningService } from './learning.service';
export { TemplateService, templateService } from './template.service';
export { AnalyticsService, analyticsService } from './analytics.service';

// New enhanced services
export { MaterialValidationService, materialValidationService } from './material-validation.service';
export { MaterialOrganizationService, materialOrganizationService } from './material-organization.service';
export { ModulePublishingService, modulePublishingService } from './module-publishing.service';

// Import services for the collection
import { quizService } from './quiz.service';
import { learningService } from './learning.service';
import { templateService } from './template.service';
import { analyticsService } from './analytics.service';
import { materialValidationService } from './material-validation.service';
import { materialOrganizationService } from './material-organization.service';
import { modulePublishingService } from './module-publishing.service';

// Type exports for external use
export type {
  QuizAttemptResult,
  QuizProgress
} from './quiz.service';

export type {
  ModuleProgress,
  MaterialProgress,
  LearningStats
} from './learning.service';

export type {
  TemplateUsageStats,
  TemplateConfig,
  PopularTemplate
} from './template.service';

export type {
  QuizPerformanceMetrics,
  SystemOverview,
  UserEngagementMetrics,
  ContentPerformance,
  DateRangeFilter
} from './analytics.service';

// New service types
export type {
  URLValidationResult,
  EmbedCodeValidationResult,
  FileValidationResult,
  ContentSafetyResult
} from './material-validation.service';

export type {
  MaterialReorderResult,
  BulkOperationResult,
  MaterialDependency,
  DragDropReorderData
} from './material-organization.service';

export type {
  ModuleValidationResult,
  ModuleCompletenessCheck,
  ModulePreviewData
} from './module-publishing.service';

// Service collection for easy access
export const awarenessLabServices = {
  quiz: quizService,
  learning: learningService,
  template: templateService,
  analytics: analyticsService,
  materialValidation: materialValidationService,
  materialOrganization: materialOrganizationService,
  modulePublishing: modulePublishingService
} as const;

// Service types for dependency injection or testing
export type AwarenessLabServices = typeof awarenessLabServices;