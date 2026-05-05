// Base service exports
export {
  BaseService,
  serviceSuccess,
  serviceError,
  type ServiceResult
} from './base.service';

// Authentication services
export {
  authenticationService,
  type SignupData,
  type LoginData,
  type AuthResult,
  type VerifyEmailData,
  type SignupResult,
  type VerifyEmailResult,
  type LogoutResult,
  type RefreshTokenResult,
  type RequestContext,
  type AuthenticatedContext
} from './auth';

// User services
export {
  UserService,
  userService,
  type UpdateProfileData,
  type ChangePasswordData,
  type UserProfile
} from './user/user.service';

// Admin services
export {
  AdminService,
  adminService,
  type CreateUserData,
  type UpdateUserData,
  type UserListItem,
  type AdminStats
} from './admin/admin.service';

// Awareness Lab services
export {
  QuizService,
  quizService,
  LearningService,
  learningService,
  TemplateService,
  templateService,
  AnalyticsService,
  analyticsService,
  awarenessLabServices,
  type QuizAttemptResult,
  type QuizProgress,
  type ModuleProgress,
  type MaterialProgress,
  type LearningStats,
  type TemplateUsageStats,
  type TemplateConfig,
  type PopularTemplate,
  type QuizPerformanceMetrics,
  type SystemOverview,
  type UserEngagementMetrics,
  type ContentPerformance,
  type DateRangeFilter,
  type AwarenessLabServices
} from './awareness-lab';

// Awareness Session services
export {
  AwarenessSessionService,
  awarenessSessionService
} from './awareness-session.service';
