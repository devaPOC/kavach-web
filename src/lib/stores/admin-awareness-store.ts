'use client';

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Quiz, QuizQuestion, LearningModule, ModuleMaterial } from './awareness-lab-store';

// Admin-specific types
export interface QuizTemplate {
  id: string;
  createdBy: string;
  name: string;
  description?: string;
  templateConfig: {
    timeLimitMinutes: number;
    maxAttempts: number;
    language: 'en' | 'ar';
    questionTypes: string[];
    defaultQuestionCount: number;
  };
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuizAnalytics {
  quizId: string;
  totalAttempts: number;
  completedAttempts: number;
  completionRate: number;
  averageScore: number;
  averageTimeMinutes: number;
  questionStats: QuestionAnalytics[];
  userEngagement: UserEngagementStats[];
}

export interface QuestionAnalytics {
  questionId: string;
  questionText: string;
  totalAnswers: number;
  correctAnswers: number;
  accuracyRate: number;
  mostSelectedWrongAnswer?: string;
}

export interface UserEngagementStats {
  userId: string;
  userName: string;
  attemptCount: number;
  bestScore: number;
  averageScore: number;
  totalTimeMinutes: number;
  lastAttemptDate: string;
}

export interface OverviewAnalytics {
  totalQuizzes: number;
  publishedQuizzes: number;
  totalAttempts: number;
  totalUsers: number;
  averageCompletionRate: number;
  topPerformingQuizzes: Array<{
    quizId: string;
    title: string;
    completionRate: number;
    averageScore: number;
  }>;
  recentActivity: Array<{
    type: 'quiz_created' | 'quiz_published' | 'attempt_completed';
    timestamp: string;
    details: string;
  }>;
}

export interface CreateQuizRequest {
  title: string;
  description?: string;
  language: 'en' | 'ar';
  timeLimitMinutes: number;
  maxAttempts: number;
  questions: Omit<QuizQuestion, 'id' | 'quizId'>[];
  templateId?: string;
}

export interface UpdateQuizRequest extends Partial<CreateQuizRequest> {
  isPublished?: boolean;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  templateConfig: {
    timeLimitMinutes: number;
    maxAttempts: number;
    language: 'en' | 'ar';
    questionTypes: string[];
    defaultQuestionCount: number;
  };
}

export interface CreateModuleRequest {
  title: string;
  description?: string;
  category: string;
  targetAudience: 'customer' | 'expert';
  orderIndex: number;
  materials?: Omit<ModuleMaterial, 'id' | 'moduleId'>[];
}

export interface UpdateModuleRequest extends Partial<CreateModuleRequest> {
  isPublished?: boolean;
}

interface AdminAwarenessState {
  // Quiz management state
  adminQuizzes: Quiz[];
  quizTemplates: QuizTemplate[];
  selectedQuiz: Quiz | null;

  // Learning materials management state
  adminModules: LearningModule[];
  totalModules: number;
  selectedModule: LearningModule | null;

  // Analytics state
  analytics: {
    quizStats: Record<string, QuizAnalytics>;
    overviewStats: OverviewAnalytics | null;
  };

  // UI state
  isLoading: boolean;
  error: string | null;
  activeAdminTab: 'quizzes' | 'templates' | 'modules' | 'analytics';

  // Actions
  actions: {
    // Quiz management actions
    fetchAdminQuizzes: () => Promise<void>;
    createQuiz: (quiz: CreateQuizRequest) => Promise<Quiz | null>;
    updateQuiz: (id: string, quiz: UpdateQuizRequest) => Promise<Quiz | null>;
    deleteQuiz: (id: string) => Promise<boolean>;
    publishQuiz: (id: string) => Promise<boolean>;
    unpublishQuiz: (id: string) => Promise<boolean>;
    duplicateQuiz: (id: string) => Promise<Quiz | null>;

    // Template management actions
    fetchTemplates: () => Promise<void>;
    createTemplate: (template: CreateTemplateRequest) => Promise<QuizTemplate | null>;
    updateTemplate: (id: string, template: Partial<CreateTemplateRequest>) => Promise<QuizTemplate | null>;
    deleteTemplate: (id: string) => Promise<boolean>;
    useTemplate: (templateId: string) => CreateQuizRequest | null;

    // Learning materials management actions
    fetchAdminModules: (page?: number, limit?: number, filters?: any) => Promise<void>;
    createModule: (module: CreateModuleRequest) => Promise<LearningModule | null>;
    updateModule: (id: string, module: UpdateModuleRequest) => Promise<LearningModule | null>;
    deleteModule: (id: string) => Promise<boolean>;
    publishModule: (id: string) => Promise<boolean>;
    unpublishModule: (id: string) => Promise<boolean>;
    reorderModules: (moduleIds: string[]) => Promise<boolean>;

    // Analytics actions
    fetchQuizAnalytics: (quizId: string) => Promise<void>;
    fetchOverviewAnalytics: () => Promise<void>;
    exportAnalytics: (quizId?: string) => Promise<Blob | null>;

    // UI actions
    setActiveAdminTab: (tab: 'quizzes' | 'templates' | 'modules' | 'analytics') => void;
    setSelectedQuiz: (quiz: Quiz | null) => void;
    setSelectedModule: (module: LearningModule | null) => void;
    clearError: () => void;
    reset: () => void;
  };
}

export const useAdminAwarenessStore = create<AdminAwarenessState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        adminQuizzes: [],
        quizTemplates: [],
        selectedQuiz: null,
        adminModules: [],
        totalModules: 0,
        selectedModule: null,
        analytics: {
          quizStats: {},
          overviewStats: null,
        },
        isLoading: false,
        error: null,
        activeAdminTab: 'quizzes',

        actions: {
          // Quiz management actions
          fetchAdminQuizzes: async () => {
            set({ isLoading: true, error: null });
            try {
              const response = await fetch('/api/v1/admin/quizzes');
              if (!response.ok) {
                throw new Error('Failed to fetch admin quizzes');
              }
              const result = await response.json();
              // Extract quizzes from the structured API response
              const quizzes = result.success ? (result.data?.quizzes || []) : [];
              set({ adminQuizzes: quizzes, isLoading: false });
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to fetch admin quizzes',
                isLoading: false
              });
            }
          },

          createQuiz: async (quiz: CreateQuizRequest) => {
            set({ isLoading: true, error: null });
            try {
              const response = await fetch('/api/v1/admin/quizzes', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(quiz),
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create quiz');
              }

              const result = await response.json();
              // Extract quiz from the structured API response
              const newQuiz = result.success ? result.data : null;

              if (!newQuiz) {
                throw new Error('Failed to create quiz');
              }

              set((state) => ({
                adminQuizzes: [...state.adminQuizzes, newQuiz],
                isLoading: false,
              }));

              return newQuiz;
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to create quiz',
                isLoading: false
              });
              return null;
            }
          },

          updateQuiz: async (id: string, quiz: UpdateQuizRequest) => {
            set({ isLoading: true, error: null });
            try {
              const response = await fetch(`/api/v1/admin/quizzes/${id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(quiz),
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update quiz');
              }

              const updatedQuiz = await response.json();

              set((state) => ({
                adminQuizzes: state.adminQuizzes.map((q) =>
                  q.id === id ? updatedQuiz : q
                ),
                selectedQuiz: state.selectedQuiz?.id === id ? updatedQuiz : state.selectedQuiz,
                isLoading: false,
              }));

              return updatedQuiz;
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to update quiz',
                isLoading: false
              });
              return null;
            }
          },

          deleteQuiz: async (id: string) => {
            set({ isLoading: true, error: null });
            try {
              const response = await fetch(`/api/v1/admin/quizzes/${id}`, {
                method: 'DELETE',
              });

              if (!response.ok) {
                throw new Error('Failed to delete quiz');
              }

              set((state) => ({
                adminQuizzes: state.adminQuizzes.filter((q) => q.id !== id),
                selectedQuiz: state.selectedQuiz?.id === id ? null : state.selectedQuiz,
                isLoading: false,
              }));

              return true;
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to delete quiz',
                isLoading: false
              });
              return false;
            }
          },

          publishQuiz: async (id: string) => {
            return await get().actions.updateQuiz(id, { isPublished: true }) !== null;
          },

          unpublishQuiz: async (id: string) => {
            return await get().actions.updateQuiz(id, { isPublished: false }) !== null;
          },

          duplicateQuiz: async (id: string) => {
            const { adminQuizzes, actions } = get();
            const originalQuiz = adminQuizzes.find((q) => q.id === id);

            if (!originalQuiz) {
              set({ error: 'Quiz not found' });
              return null;
            }

            const duplicateData: CreateQuizRequest = {
              title: `${originalQuiz.title} (Copy)`,
              description: originalQuiz.description,
              language: originalQuiz.language,
              timeLimitMinutes: originalQuiz.timeLimitMinutes,
              maxAttempts: originalQuiz.maxAttempts,
              questions: originalQuiz.questions.map(({ id, quizId, ...question }) => question),
            };

            return await actions.createQuiz(duplicateData);
          },

          // Template management actions
          fetchTemplates: async () => {
            set({ isLoading: true, error: null });
            try {
              const response = await fetch('/api/v1/admin/quiz-templates');
              if (!response.ok) {
                throw new Error('Failed to fetch templates');
              }
              const templates = await response.json();
              set({ quizTemplates: templates, isLoading: false });
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to fetch templates',
                isLoading: false
              });
            }
          },

          createTemplate: async (template: CreateTemplateRequest) => {
            set({ isLoading: true, error: null });
            try {
              const response = await fetch('/api/v1/admin/quiz-templates', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(template),
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create template');
              }

              const newTemplate = await response.json();

              set((state) => ({
                quizTemplates: [...state.quizTemplates, newTemplate],
                isLoading: false,
              }));

              return newTemplate;
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to create template',
                isLoading: false
              });
              return null;
            }
          },

          updateTemplate: async (id: string, template: Partial<CreateTemplateRequest>) => {
            set({ isLoading: true, error: null });
            try {
              const response = await fetch(`/api/v1/admin/quiz-templates/${id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(template),
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update template');
              }

              const updatedTemplate = await response.json();

              set((state) => ({
                quizTemplates: state.quizTemplates.map((t) =>
                  t.id === id ? updatedTemplate : t
                ),
                isLoading: false,
              }));

              return updatedTemplate;
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to update template',
                isLoading: false
              });
              return null;
            }
          },

          deleteTemplate: async (id: string) => {
            set({ isLoading: true, error: null });
            try {
              const response = await fetch(`/api/v1/admin/quiz-templates/${id}`, {
                method: 'DELETE',
              });

              if (!response.ok) {
                throw new Error('Failed to delete template');
              }

              set((state) => ({
                quizTemplates: state.quizTemplates.filter((t) => t.id !== id),
                isLoading: false,
              }));

              return true;
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to delete template',
                isLoading: false
              });
              return false;
            }
          },

          useTemplate: (templateId: string) => {
            const { quizTemplates } = get();
            const template = quizTemplates.find((t) => t.id === templateId);

            if (!template) {
              set({ error: 'Template not found' });
              return null;
            }

            return {
              title: '',
              description: '',
              language: template.templateConfig.language,
              timeLimitMinutes: template.templateConfig.timeLimitMinutes,
              maxAttempts: template.templateConfig.maxAttempts,
              questions: [],
              templateId,
            };
          },

          // Learning materials management actions
          fetchAdminModules: async (page: number = 1, limit: number = 20, filters: any = {}) => {
            set({ isLoading: true, error: null });
            try {
              // Build query parameters
              const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString()
              });

              if (filters.category) params.append('category', filters.category);
              if (filters.isPublished !== undefined) params.append('isPublished', filters.isPublished.toString());
              if (filters.createdBy) params.append('createdBy', filters.createdBy);

              const response = await fetch(`/api/v1/admin/learning-modules?${params}`);
              if (!response.ok) {
                throw new Error('Failed to fetch admin modules');
              }
              const result = await response.json();
              
              if (result.success && result.data) {
                // Extract modules from the structured API response
                const modulesData = result.data.modules || [];

                // Ensure materials array is always present
                const modules = modulesData.map((module: any) => ({
                  ...module,
                  materials: module.materials || []
                }));

                set({ 
                  adminModules: modules, 
                  isLoading: false,
                  totalModules: result.data.pagination?.total || 0
                });
              } else {
                set({
                  error: result.error || 'Failed to fetch admin modules',
                  isLoading: false
                });
              }
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to fetch admin modules',
                isLoading: false
              });
            }
          },

          createModule: async (module: CreateModuleRequest) => {
            set({ isLoading: true, error: null });
            try {
              const response = await fetch('/api/v1/admin/learning-modules', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(module),
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create module');
              }

              const newModule = await response.json();

              set((state) => ({
                adminModules: [...state.adminModules, newModule],
                isLoading: false,
              }));

              return newModule;
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to create module',
                isLoading: false
              });
              return null;
            }
          },

          updateModule: async (id: string, module: UpdateModuleRequest) => {
            set({ isLoading: true, error: null });
            try {
              const response = await fetch(`/api/v1/admin/learning-modules/${id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(module),
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update module');
              }

              const updatedModule = await response.json();

              set((state) => ({
                adminModules: state.adminModules.map((m) =>
                  m.id === id ? updatedModule : m
                ),
                selectedModule: state.selectedModule?.id === id ? updatedModule : state.selectedModule,
                isLoading: false,
              }));

              return updatedModule;
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to update module',
                isLoading: false
              });
              return null;
            }
          },

          deleteModule: async (id: string) => {
            set({ isLoading: true, error: null });
            try {
              const response = await fetch(`/api/v1/admin/learning-modules/${id}`, {
                method: 'DELETE',
              });

              if (!response.ok) {
                throw new Error('Failed to delete module');
              }

              set((state) => ({
                adminModules: state.adminModules.filter((m) => m.id !== id),
                selectedModule: state.selectedModule?.id === id ? null : state.selectedModule,
                isLoading: false,
              }));

              return true;
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to delete module',
                isLoading: false
              });
              return false;
            }
          },

          publishModule: async (id: string) => {
            return await get().actions.updateModule(id, { isPublished: true }) !== null;
          },

          unpublishModule: async (id: string) => {
            return await get().actions.updateModule(id, { isPublished: false }) !== null;
          },

          reorderModules: async (moduleIds: string[]) => {
            set({ isLoading: true, error: null });
            try {
              const response = await fetch('/api/v1/admin/learning-modules/reorder', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ moduleIds }),
              });

              if (!response.ok) {
                throw new Error('Failed to reorder modules');
              }

              // Refresh modules to get updated order
              await get().actions.fetchAdminModules();

              return true;
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to reorder modules',
                isLoading: false
              });
              return false;
            }
          },

          // Analytics actions
          fetchQuizAnalytics: async (quizId: string) => {
            set({ isLoading: true, error: null });
            try {
              const response = await fetch(`/api/v1/admin/analytics/quizzes/${quizId}/stats`);
              if (!response.ok) {
                throw new Error('Failed to fetch quiz analytics');
              }
              const analytics = await response.json();

              set((state) => ({
                analytics: {
                  ...state.analytics,
                  quizStats: {
                    ...state.analytics.quizStats,
                    [quizId]: analytics,
                  },
                },
                isLoading: false,
              }));
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to fetch quiz analytics',
                isLoading: false
              });
            }
          },

          fetchOverviewAnalytics: async () => {
            set({ isLoading: true, error: null });
            try {
              const response = await fetch('/api/v1/admin/analytics/overview');
              if (!response.ok) {
                throw new Error('Failed to fetch overview analytics');
              }
              const overviewStats = await response.json();

              set((state) => ({
                analytics: {
                  ...state.analytics,
                  overviewStats,
                },
                isLoading: false,
              }));
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to fetch overview analytics',
                isLoading: false
              });
            }
          },

          exportAnalytics: async (quizId?: string) => {
            try {
              const url = quizId
                ? `/api/v1/admin/analytics/quizzes/${quizId}/export`
                : '/api/v1/admin/analytics/export';

              const response = await fetch(url);
              if (!response.ok) {
                throw new Error('Failed to export analytics');
              }

              return await response.blob();
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to export analytics'
              });
              return null;
            }
          },

          // UI actions
          setActiveAdminTab: (tab: 'quizzes' | 'templates' | 'modules' | 'analytics') => {
            set({ activeAdminTab: tab });
          },

          setSelectedQuiz: (quiz: Quiz | null) => {
            set({ selectedQuiz: quiz });
          },

          setSelectedModule: (module: LearningModule | null) => {
            set({ selectedModule: module });
          },

          clearError: () => {
            set({ error: null });
          },

          reset: () => {
            set({
              selectedQuiz: null,
              selectedModule: null,
              error: null,
              isLoading: false,
            });
          },
        },
      }),
      {
        name: 'admin-awareness-storage',
        partialize: (state) => ({
          // Only persist UI preferences
          activeAdminTab: state.activeAdminTab,
        }),
      }
    ),
    {
      name: 'admin-awareness-store',
    }
  )
);

// Selector hooks for better performance
export const useAdminQuizzes = () => useAdminAwarenessStore((state) => state.adminQuizzes);
export const useQuizTemplates = () => useAdminAwarenessStore((state) => state.quizTemplates);
export const useSelectedQuiz = () => useAdminAwarenessStore((state) => state.selectedQuiz);
export const useAdminModules = () => useAdminAwarenessStore((state) => state.adminModules);
export const useSelectedModule = () => useAdminAwarenessStore((state) => state.selectedModule);
export const useAnalytics = () => useAdminAwarenessStore((state) => state.analytics);
export const useAdminAwarenessActions = () => useAdminAwarenessStore((state) => state.actions);
export const useAdminAwarenessLoading = () => useAdminAwarenessStore((state) => state.isLoading);
export const useAdminAwarenessError = () => useAdminAwarenessStore((state) => state.error);
