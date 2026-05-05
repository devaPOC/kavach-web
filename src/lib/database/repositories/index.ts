// Export all repositories with explicit re-exports to resolve naming conflicts
export * from './email-verification-repository';
export * from './session-repository';
export * from './profile-repository';

// Export user repository classes
export { UserRepository } from './user-repository';
export { TransactionAwareUserRepository } from './transaction-aware-user-repository';

// Export awareness lab repository classes
export { QuizRepository } from './quiz-repository';
export { QuizAttemptRepository } from './quiz-attempt-repository';
export { LearningRepository } from './learning-repository';
export { TemplateRepository } from './template-repository';
export { AnalyticsRepository } from './analytics-repository';

// Export awareness session repository classes
export { AwarenessSessionRepository } from './awareness-session-repository';

// Export user repository types with aliases to avoid conflicts
export type {
    CreateUserData as UserCreateData,
    UpdateUserData as UserUpdateData
} from './user-repository';

export type {
    CreateUserData as TransactionAwareCreateUserData,
    UpdateUserData as TransactionAwareUpdateUserData
} from './transaction-aware-user-repository';

// Export awareness lab repository types
export type {
    CreateQuizData,
    UpdateQuizData,
    CreateQuestionData,
    UpdateQuestionData,
    QuizWithQuestions,
    QuizFilters
} from './quiz-repository';

export type {
    CreateAttemptData,
    UpdateAttemptData,
    AttemptFilters,
    AttemptWithDetails,
    QuizStatistics,
    UserQuizProgress
} from './quiz-attempt-repository';

export type {
    CreateModuleData,
    UpdateModuleData,
    CreateMaterialData,
    UpdateMaterialData,
    ModuleWithMaterials,
    ModuleFilters,
    ProgressFilters,
    UserModuleProgress
} from './learning-repository';

export type {
    CreateTemplateData,
    UpdateTemplateData,
    TemplateFilters,
    TemplateWithUsage
} from './template-repository';

export type {
    DateRange,
    QuizAnalytics,
    QuestionAnalytics,
    OverviewAnalytics,
    UserProgressAnalytics,
    LearningAnalytics
} from './analytics-repository';

// Export awareness session repository types
export type {
    CreateAwarenessSessionRepositoryData,
    AwarenessSessionFilters,
    PaginationOptions,
    PaginatedResult
} from './awareness-session-repository';

// Export repository instances for easy access
export { userRepository } from './user-repository';
export { emailVerificationRepository } from './email-verification-repository';
export { sessionRepository } from './session-repository';
export { transactionAwareUserRepository } from './transaction-aware-user-repository';
export { expertProfileRepository, customerProfileRepository } from './profile-repository';

// Export awareness lab repository instances
export { quizRepository } from './quiz-repository';
export { quizAttemptRepository } from './quiz-attempt-repository';
export { learningRepository } from './learning-repository';
export { templateRepository } from './template-repository';
export { analyticsRepository } from './analytics-repository';

// Export awareness session repository instances
export { awarenessSessionRepository } from './awareness-session-repository';

// Export awareness session workflow utilities
export { AwarenessSessionWorkflow, awarenessSessionWorkflow } from './awareness-session-workflow';