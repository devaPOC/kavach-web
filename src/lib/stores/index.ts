// Awareness Lab Stores
export * from './awareness-lab-store';
export * from './admin-awareness-store';

// Re-export commonly used types and hooks
export type {
  Quiz,
  QuizQuestion,
  QuizAttempt,
  LearningModule,
  ModuleMaterial,
  LearningProgress,
  QuizTimer,
} from './awareness-lab-store';

export type {
  QuizTemplate,
  QuizAnalytics,
  OverviewAnalytics,
  CreateQuizRequest,
  UpdateQuizRequest,
  CreateTemplateRequest,
  CreateModuleRequest,
  UpdateModuleRequest,
} from './admin-awareness-store';

// Main store hooks
export {
  useAwarenessLabStore,
  useQuizzes,
  useCurrentQuiz,
  useCurrentAttempt,
  useQuizTimer,
  useLearningModules,
  useCurrentModule,
  useUserProgress,
  useAwarenessLabActions,
  useAwarenessLabLoading,
  useAwarenessLabError,
} from './awareness-lab-store';

export {
  useAdminAwarenessStore,
  useAdminQuizzes,
  useQuizTemplates,
  useSelectedQuiz,
  useAdminModules,
  useSelectedModule,
  useAnalytics,
  useAdminAwarenessActions,
  useAdminAwarenessLoading,
  useAdminAwarenessError,
} from './admin-awareness-store';

// Integration hooks
export {
  useAwarenessLabIntegration,
  useAwarenessLabPermissions,
  useQuizTimerPersistence,
  useProgressSync,
  useOfflineSync,
  useAwarenessLabApp,
} from './awareness-lab-integration';