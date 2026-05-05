'use client';

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { User } from '@/types/user';

// Types based on the database schema and validation schemas
export interface Quiz {
  id: string;
  createdBy: string;
  templateId?: string;
  title: string;
  description?: string;
  language: 'en' | 'ar';
  timeLimitMinutes: number;
  maxAttempts: number;
  isPublished: boolean;
  endDate?: string;
  questions: QuizQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  questionType: 'mcq' | 'true_false' | 'multiple_select';
  questionData: {
    question: string;
    options?: string[];
    explanation?: string;
  };
  correctAnswers: string[];
  orderIndex: number;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  quizId: string;
  answers: Record<string, string[]>;
  score: number;
  timeTakenSeconds: number;
  isCompleted: boolean;
  startedAt: string;
  completedAt?: string;
}

export interface LearningModule {
  id: string;
  createdBy: string;
  title: string;
  description?: string;
  category: string;
  orderIndex: number;
  isPublished: boolean;
  materials: ModuleMaterial[];
  createdAt: string;
  updatedAt: string;
}

export interface ModuleMaterial {
  id: string;
  moduleId: string;
  materialType: 'link' | 'video' | 'document';
  title: string;
  description?: string;
  materialData: {
    url?: string;
    embedCode?: string;
    fileUrl?: string;
    duration?: number;
  };
  orderIndex: number;
}

export interface LearningProgress {
  id: string;
  userId: string;
  moduleId: string;
  materialId?: string;
  isCompleted: boolean;
  completedAt?: string;
  lastAccessed: string;
}

export interface QuizTimer {
  timeRemaining: number;
  isActive: boolean;
  isPaused: boolean;
  startTime: Date | null;
  endTime: Date | null;
  intervalId?: NodeJS.Timeout;
  sessionId?: string;
  lastSync?: Date;
  warningsShown: number[];
}

export interface QuizAttemptState {
  currentAnswers: Record<string, string[]>;
  currentQuestionIndex: number;
  hasStarted: boolean;
}

export interface QuizAttemptResult {
  attemptId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeTakenSeconds: number;
  isCompleted: boolean;
  results: Array<{
    questionId: string;
    userAnswers: string[];
    correctAnswers: string[];
    isCorrect: boolean;
    explanation?: string;
  }>;
}

export interface QuizProgress {
  quizId: string;
  attemptCount: number;
  maxAttempts: number;
  canAttempt: boolean;
  bestScore: number;
  hasCompletedAttempts: boolean;
  lastAttemptDate?: Date;
}

export interface PendingOperation {
  id: string;
  type: 'quiz_attempt' | 'progress_update' | 'material_access';
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

interface AwarenessLabState {
  // Quiz state
  quizzes: Quiz[];
  currentQuiz: Quiz | null;
  currentAttempt: QuizAttempt | null;
  attemptState: QuizAttemptState;
  quizTimer: QuizTimer;
  userQuizAttempts: Record<string, QuizAttempt[]>; // quizId -> attempts

  // Quiz results state
  currentResults: QuizAttemptResult | null;
  currentProgress: QuizProgress | null;
  showResults: boolean;

  // Learning materials state
  learningModules: LearningModule[];
  currentModule: LearningModule | null;
  userProgress: Record<string, LearningProgress>; // moduleId -> progress

  // UI state
  isLoading: boolean;
  loadingStates: {
    quizzes: boolean;
    currentQuiz: boolean;
    materials: boolean;
    currentModule: boolean;
    progress: boolean;
    submission: boolean;
  };
  error: string | null;
  activeTab: 'hub' | 'lab';

  // Pagination state
  pagination: {
    currentPage: number;
    totalPages: number;
    hasMore: boolean;
    limit: number;
  };

  // Offline support
  isOffline: boolean;
  pendingOperations: PendingOperation[];
  lastSyncTime: Date | null;

  // Actions
  actions: {
    // Quiz actions
    fetchQuizzes: (page?: number) => Promise<void>;
    fetchQuizById: (quizId: string) => Promise<Quiz | null>;
    loadMoreQuizzes: () => Promise<void>;
    goToPage: (page: number) => Promise<void>;
    startQuiz: (quizId: string) => Promise<void>;
    submitAnswer: (questionId: string, answer: string[]) => void;
    nextQuestion: () => void;
    previousQuestion: () => void;
    submitQuiz: () => Promise<void>;
    fetchUserAttempts: (quizId: string) => Promise<void>;

    // Quiz results actions
    fetchQuizProgress: (quizId: string) => Promise<void>;
    retryQuiz: () => Promise<void>;
    showQuizResults: () => void;
    hideQuizResults: () => void;

    // Learning actions
    fetchLearningModules: () => Promise<void>;
    fetchModuleById: (moduleId: string) => Promise<LearningModule | null>;
    markMaterialComplete: (moduleId: string, materialId: string) => Promise<void>;
    updateProgress: (moduleId: string, materialId?: string, isCompleted?: boolean) => Promise<void>;

    // Timer actions
    startTimer: (durationMinutes: number) => void;
    pauseTimer: () => void;
    resumeTimer: () => void;
    stopTimer: () => void;
    restoreTimer: () => void;

    // UI actions
    setActiveTab: (tab: 'hub' | 'lab') => void;
    setCurrentModule: (module: LearningModule | null) => void;
    clearError: () => void;
    reset: () => void;

    // Offline/sync actions
    setOfflineStatus: (isOffline: boolean) => void;
    syncPendingOperations: () => Promise<void>;
    addPendingOperation: (operation: any) => void;
    removePendingOperation: (operationId: string) => void;

    // Role-based error handling
    handleRoleBasedError: (error: any, operation: string) => void;
  };
}

const initialAttemptState: QuizAttemptState = {
  currentAnswers: {},
  currentQuestionIndex: 0,
  hasStarted: false,
};

const initialTimerState: QuizTimer = {
  timeRemaining: 0,
  isActive: false,
  isPaused: false,
  startTime: null,
  endTime: null,
  warningsShown: [],
};

export const useAwarenessLabStore = create<AwarenessLabState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        quizzes: [],
        currentQuiz: null,
        currentAttempt: null,
        attemptState: initialAttemptState,
        quizTimer: initialTimerState,
        userQuizAttempts: {},

        // Quiz results state
        currentResults: null,
        currentProgress: null,
        showResults: false,
        learningModules: [],
        currentModule: null,
        userProgress: {},
        isLoading: false,
        loadingStates: {
          quizzes: false,
          currentQuiz: false,
          materials: false,
          currentModule: false,
          progress: false,
          submission: false,
        },
        error: null,
        activeTab: 'hub',

        // Pagination state
        pagination: {
          currentPage: 1,
          totalPages: 1,
          hasMore: false,
          limit: 20,
        },

        // Offline support
        isOffline: false,
        pendingOperations: [],
        lastSyncTime: null,

        actions: {
          // Quiz actions
          fetchQuizzes: async (page = 1) => {
            const state = get();
            const limit = state.pagination.limit;

            set((state) => ({
              loadingStates: { ...state.loadingStates, quizzes: true },
              error: null
            }));

            try {
              const response = await fetch(`/api/v1/quizzes?page=${page}&limit=${limit}`);

              // Handle role-based access errors
              if (response.status === 403) {
                throw new Error('Access denied. Please check your permissions.');
              }

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch quizzes');
              }

              const result = await response.json();

              // Handle offline response
              if (result.error === 'offline') {
                set((state) => ({
                  isOffline: true,
                  loadingStates: { ...state.loadingStates, quizzes: false },
                  error: 'You are currently offline. Showing cached content.'
                }));
                return;
              }

              // Extract quizzes and pagination from the structured API response
              const quizzes = result.success ? (result.data?.quizzes || []) : [];
              const pagination = result.data?.pagination || { page: 1, limit: 20, hasMore: false };

              set((state) => ({
                quizzes: page === 1 ? quizzes : [...state.quizzes, ...quizzes],
                pagination: {
                  currentPage: pagination.page,
                  totalPages: Math.ceil((pagination.total || quizzes.length) / limit),
                  hasMore: pagination.hasMore,
                  limit: pagination.limit || limit,
                },
                loadingStates: { ...state.loadingStates, quizzes: false },
                isOffline: false,
                lastSyncTime: new Date()
              }));
            } catch (error) {
              const isNetworkError = error instanceof TypeError && error.message.includes('fetch');
              const errorMessage = error instanceof Error ? error.message : 'Failed to fetch quizzes';

              set((state) => ({
                error: errorMessage,
                loadingStates: { ...state.loadingStates, quizzes: false },
                isOffline: isNetworkError
              }));
            }
          },

          fetchQuizById: async (quizId: string) => {
            try {
              const response = await fetch(`/api/v1/quizzes/${quizId}`);

              // Handle role-based access errors
              if (response.status === 403) {
                throw new Error('Access denied. You do not have permission to access this quiz.');
              }

              if (response.status === 404) {
                throw new Error('Quiz not found or no longer available.');
              }

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch quiz');
              }

              const result = await response.json();
              // Extract quiz from the structured API response
              const quiz = result.success ? result.data : null;
              return quiz;
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to fetch quiz';
              set({ error: errorMessage });
              return null;
            }
          },

          loadMoreQuizzes: async () => {
            const state = get();
            if (!state.pagination.hasMore || state.loadingStates.quizzes) return;

            await get().actions.fetchQuizzes(state.pagination.currentPage + 1);
          },

          goToPage: async (page: number) => {
            const state = get();
            if (page === state.pagination.currentPage || state.loadingStates.quizzes) return;

            // Reset quizzes when going to a specific page (not appending)
            set((state) => ({ quizzes: [] }));
            await get().actions.fetchQuizzes(page);
          },

          startQuiz: async (quizId: string) => {
            const { actions } = get();
            set({ isLoading: true, error: null });

            try {
              // Fetch the quiz details
              const quiz = await actions.fetchQuizById(quizId);
              if (!quiz) {
                throw new Error('Quiz not found');
              }

              // Create a new attempt
              const response = await fetch(`/api/v1/quizzes/${quizId}/attempts`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
              });

              // Handle role-based access errors
              if (response.status === 403) {
                throw new Error('Access denied. You do not have permission to take this quiz.');
              }

              if (response.status === 404) {
                throw new Error('Quiz not found or no longer available.');
              }

              if (response.status === 409) {
                throw new Error('You have reached the maximum number of attempts for this quiz.');
              }

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to start quiz');
              }

              const result = await response.json();
              // Extract attempt from the structured API response
              const attemptData = result.success ? result.data : null;

              if (!attemptData) {
                throw new Error('Failed to create quiz attempt');
              }

              // Transform the attempt data to match QuizAttempt interface
              const attempt: QuizAttempt = {
                id: attemptData.attemptId,
                userId: '', // Will be filled by backend when needed
                quizId: attemptData.quizId,
                answers: {},
                score: 0,
                timeTakenSeconds: 0,
                isCompleted: false,
                startedAt: attemptData.startedAt,
              };

              // Initialize quiz state
              set({
                currentQuiz: quiz,
                currentAttempt: attempt,
                attemptState: {
                  currentAnswers: {},
                  currentQuestionIndex: 0,
                  hasStarted: true,
                },
                isLoading: false,
              });

              // Start the timer
              actions.startTimer(attemptData.timeLimitMinutes || quiz.timeLimitMinutes);

            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to start quiz',
                isLoading: false
              });
            }
          },

          submitAnswer: (questionId: string, answer: string[]) => {
            set((state) => ({
              attemptState: {
                ...state.attemptState,
                currentAnswers: {
                  ...state.attemptState.currentAnswers,
                  [questionId]: answer,
                },
              },
            }));
          },

          nextQuestion: () => {
            set((state) => {
              const { currentQuiz, attemptState } = state;
              if (!currentQuiz) return state;

              const nextIndex = Math.min(
                attemptState.currentQuestionIndex + 1,
                currentQuiz.questions.length - 1
              );

              return {
                attemptState: {
                  ...attemptState,
                  currentQuestionIndex: nextIndex,
                },
              };
            });
          },

          previousQuestion: () => {
            set((state) => ({
              attemptState: {
                ...state.attemptState,
                currentQuestionIndex: Math.max(state.attemptState.currentQuestionIndex - 1, 0),
              },
            }));
          },

          submitQuiz: async () => {
            const { currentAttempt, attemptState, quizTimer, actions } = get();
            if (!currentAttempt) return;

            set({ isLoading: true, error: null });

            try {
              // Calculate time taken
              const timeTaken = quizTimer.startTime
                ? Math.floor((Date.now() - quizTimer.startTime.getTime()) / 1000)
                : 0;

              const response = await fetch(`/api/v1/quizzes/attempts/${currentAttempt.id}/submit`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  answers: attemptState.currentAnswers,
                  timeTakenSeconds: timeTaken,
                }),
              });

              if (!response.ok) {
                throw new Error('Failed to submit quiz');
              }

              const result = await response.json();
              // Extract results from the structured API response
              const results = result.success ? result.data : null;

              if (!results) {
                throw new Error('Failed to get quiz results');
              }

              // Stop timer and update state
              actions.stopTimer();
              set({
                currentAttempt: {
                  ...currentAttempt,
                  isCompleted: true,
                  score: results.score,
                  timeTakenSeconds: timeTaken,
                  completedAt: new Date().toISOString()
                },
                currentResults: results,
                showResults: true,
                isLoading: false,
              });

              // Fetch updated progress and attempts
              if (currentAttempt.quizId) {
                await actions.fetchUserAttempts(currentAttempt.quizId);
                await actions.fetchQuizProgress(currentAttempt.quizId);
              }

            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to submit quiz',
                isLoading: false
              });
            }
          },

          fetchUserAttempts: async (quizId: string) => {
            try {
              const response = await fetch(`/api/v1/quizzes/${quizId}/my-attempts`);
              if (!response.ok) {
                throw new Error('Failed to fetch attempts');
              }
              const result = await response.json();
              const attempts = result.data || [];

              set((state) => ({
                userQuizAttempts: {
                  ...state.userQuizAttempts,
                  [quizId]: attempts,
                },
              }));
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to fetch attempts'
              });
            }
          },

          // Learning actions
          fetchLearningModules: async () => {
            set({ isLoading: true, error: null });
            try {
              const response = await fetch('/api/v1/learning-modules');

              // Handle role-based access errors
              if (response.status === 403) {
                throw new Error('Access denied. Please check your permissions.');
              }

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch learning modules');
              }

              const result = await response.json();
              // Extract modules from the structured API response
              const modules = result.success ? (result.data?.modules || result.data || []) : [];
              set({ learningModules: modules, isLoading: false });
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to fetch learning modules';
              set({ error: errorMessage, isLoading: false });
            }
          },

          fetchModuleById: async (moduleId: string) => {
            try {
              const response = await fetch(`/api/v1/learning-modules/${moduleId}`);
              if (!response.ok) {
                throw new Error('Failed to fetch module');
              }
              const result = await response.json();
              // Extract module from the structured API response
              const module = result.success ? result.data : null;
              return module;
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to fetch module'
              });
              return null;
            }
          },

          markMaterialComplete: async (moduleId: string, materialId: string) => {
            await get().actions.updateProgress(moduleId, materialId, true);
          },

          updateProgress: async (moduleId: string, materialId?: string, isCompleted: boolean = true) => {
            try {
              const response = await fetch(`/api/v1/learning-modules/${moduleId}/progress`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  moduleId,
                  materialId,
                  isCompleted,
                }),
              });

              // Handle role-based access errors
              if (response.status === 403) {
                throw new Error('Access denied. You do not have permission to update progress for this module.');
              }

              if (response.status === 404) {
                throw new Error('Module or material not found.');
              }

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to update progress');
              }

              const result = await response.json();
              // Extract progress from the structured API response
              const progress = result.success ? result.data : null;

              if (progress) {
                const progressKey = materialId ? `${moduleId}-${materialId}` : moduleId;

                set((state) => ({
                  userProgress: {
                    ...state.userProgress,
                    [progressKey]: progress,
                  },
                }));
              }

            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to update progress';
              set({ error: errorMessage });
            }
          },

          // Timer actions - Enhanced with better state management and cross-tab sync
          startTimer: (durationMinutes: number) => {
            const { actions } = get();

            // Clear any existing timer
            actions.stopTimer();

            const startTime = new Date();
            const endTime = new Date(startTime.getTime() + (durationMinutes * 60 * 1000));
            const timeRemaining = durationMinutes * 60; // Convert to seconds
            const sessionId = Math.random().toString(36).substr(2, 9);

            // Save to localStorage for cross-tab sync
            const timerData = {
              timeRemaining,
              isActive: true,
              isPaused: false,
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
              sessionId,
              lastSync: new Date().toISOString(),
              warningsShown: []
            };

            try {
              localStorage.setItem(`quiz_timer_${get().currentQuiz?.id}`, JSON.stringify(timerData));
            } catch (error) {
              console.warn('Failed to save timer to localStorage:', error);
            }

            const intervalId = setInterval(() => {
              const { quizTimer, actions: currentActions, currentQuiz } = get();

              if (quizTimer.timeRemaining <= 1) {
                // Time's up - auto submit
                console.log('Timer expired, auto-submitting quiz...');
                currentActions.stopTimer();
                currentActions.submitQuiz();
                return;
              }

              const newTimeRemaining = quizTimer.timeRemaining - 1;
              const newWarningsShown = [...quizTimer.warningsShown];

              // Check for warnings (5 minutes, 2 minutes, 1 minute)
              const minutesRemaining = Math.floor(newTimeRemaining / 60);
              if (minutesRemaining === 5 && !newWarningsShown.includes(5)) {
                newWarningsShown.push(5);
                console.log('Warning: 5 minutes remaining');
              } else if (minutesRemaining === 2 && !newWarningsShown.includes(2)) {
                newWarningsShown.push(2);
                console.log('Warning: 2 minutes remaining');
              } else if (minutesRemaining === 1 && !newWarningsShown.includes(1)) {
                newWarningsShown.push(1);
                console.log('Critical warning: 1 minute remaining');
              }

              const updatedTimer = {
                ...quizTimer,
                timeRemaining: newTimeRemaining,
                warningsShown: newWarningsShown,
                lastSync: new Date()
              };

              // Update localStorage
              try {
                const timerData = {
                  ...updatedTimer,
                  startTime: updatedTimer.startTime?.toISOString(),
                  endTime: updatedTimer.endTime?.toISOString(),
                  lastSync: updatedTimer.lastSync?.toISOString()
                };
                localStorage.setItem(`quiz_timer_${currentQuiz?.id}`, JSON.stringify(timerData));
              } catch (error) {
                console.warn('Failed to update timer in localStorage:', error);
              }

              set((state) => ({
                quizTimer: updatedTimer,
              }));
            }, 1000);

            set({
              quizTimer: {
                timeRemaining,
                isActive: true,
                isPaused: false,
                startTime,
                endTime,
                intervalId,
                sessionId,
                lastSync: new Date(),
                warningsShown: [],
              },
            });
          },

          pauseTimer: () => {
            set((state) => {
              if (state.quizTimer.intervalId) {
                clearInterval(state.quizTimer.intervalId);
              }

              const pausedTimer = {
                ...state.quizTimer,
                isPaused: true,
                isActive: false,
                intervalId: undefined,
                lastSync: new Date()
              };

              // Update localStorage
              try {
                const timerData = {
                  ...pausedTimer,
                  startTime: pausedTimer.startTime?.toISOString(),
                  endTime: pausedTimer.endTime?.toISOString(),
                  lastSync: pausedTimer.lastSync?.toISOString()
                };
                localStorage.setItem(`quiz_timer_${state.currentQuiz?.id}`, JSON.stringify(timerData));
              } catch (error) {
                console.warn('Failed to update paused timer in localStorage:', error);
              }

              return {
                quizTimer: pausedTimer,
              };
            });
          },

          resumeTimer: () => {
            const { quizTimer, currentQuiz } = get();
            if (quizTimer.timeRemaining <= 0 || !quizTimer.isPaused) return;

            const intervalId = setInterval(() => {
              const { quizTimer: currentTimer, actions, currentQuiz } = get();

              if (currentTimer.timeRemaining <= 1) {
                console.log('Timer expired during resume, auto-submitting quiz...');
                actions.stopTimer();
                actions.submitQuiz();
                return;
              }

              const newTimeRemaining = currentTimer.timeRemaining - 1;
              const newWarningsShown = [...currentTimer.warningsShown];

              // Check for warnings
              const minutesRemaining = Math.floor(newTimeRemaining / 60);
              if (minutesRemaining === 5 && !newWarningsShown.includes(5)) {
                newWarningsShown.push(5);
                console.log('Warning: 5 minutes remaining');
              } else if (minutesRemaining === 2 && !newWarningsShown.includes(2)) {
                newWarningsShown.push(2);
                console.log('Warning: 2 minutes remaining');
              } else if (minutesRemaining === 1 && !newWarningsShown.includes(1)) {
                newWarningsShown.push(1);
                console.log('Critical warning: 1 minute remaining');
              }

              const updatedTimer = {
                ...currentTimer,
                timeRemaining: newTimeRemaining,
                warningsShown: newWarningsShown,
                lastSync: new Date()
              };

              // Update localStorage
              try {
                const timerData = {
                  ...updatedTimer,
                  startTime: updatedTimer.startTime?.toISOString(),
                  endTime: updatedTimer.endTime?.toISOString(),
                  lastSync: updatedTimer.lastSync?.toISOString()
                };
                localStorage.setItem(`quiz_timer_${currentQuiz?.id}`, JSON.stringify(timerData));
              } catch (error) {
                console.warn('Failed to update resumed timer in localStorage:', error);
              }

              set((state) => ({
                quizTimer: updatedTimer,
              }));
            }, 1000);

            const resumedTimer = {
              ...quizTimer,
              isActive: true,
              isPaused: false,
              intervalId,
              lastSync: new Date()
            };

            // Update localStorage
            try {
              const timerData = {
                ...resumedTimer,
                startTime: resumedTimer.startTime?.toISOString(),
                endTime: resumedTimer.endTime?.toISOString(),
                lastSync: resumedTimer.lastSync?.toISOString()
              };
              localStorage.setItem(`quiz_timer_${currentQuiz?.id}`, JSON.stringify(timerData));
            } catch (error) {
              console.warn('Failed to update resumed timer in localStorage:', error);
            }

            set((state) => ({
              quizTimer: resumedTimer,
            }));
          },

          stopTimer: () => {
            set((state) => {
              if (state.quizTimer.intervalId) {
                clearInterval(state.quizTimer.intervalId);
              }

              // Clear localStorage
              try {
                localStorage.removeItem(`quiz_timer_${state.currentQuiz?.id}`);
              } catch (error) {
                console.warn('Failed to clear timer from localStorage:', error);
              }

              return {
                quizTimer: initialTimerState,
              };
            });
          },

          // New action to restore timer from localStorage
          restoreTimer: () => {
            const { currentQuiz, currentAttempt } = get();
            if (!currentQuiz || !currentAttempt || currentAttempt.isCompleted) return;

            try {
              const stored = localStorage.getItem(`quiz_timer_${currentQuiz.id}`);
              if (!stored) return;

              const timerData = JSON.parse(stored);

              // Check if data is recent (within 30 seconds)
              const lastSync = new Date(timerData.lastSync);
              const now = new Date();
              if (now.getTime() - lastSync.getTime() > 30000) {
                // Data is stale, calculate from attempt start time
                const attemptStart = new Date(currentAttempt.startedAt);
                const elapsed = Math.floor((now.getTime() - attemptStart.getTime()) / 1000);
                const remaining = Math.max(0, (currentQuiz.timeLimitMinutes * 60) - elapsed);

                if (remaining > 0) {
                  get().actions.startTimer(Math.ceil(remaining / 60));
                } else {
                  get().actions.submitQuiz();
                }
                return;
              }

              // Restore timer state
              const restoredTimer: QuizTimer = {
                timeRemaining: timerData.timeRemaining,
                isActive: timerData.isActive && !timerData.isPaused,
                isPaused: timerData.isPaused || false,
                startTime: timerData.startTime ? new Date(timerData.startTime) : null,
                endTime: timerData.endTime ? new Date(timerData.endTime) : null,
                sessionId: timerData.sessionId,
                lastSync: new Date(timerData.lastSync),
                warningsShown: timerData.warningsShown || []
              };

              set({ quizTimer: restoredTimer });

              // Resume timer if it was active
              if (timerData.isActive && !timerData.isPaused && timerData.timeRemaining > 0) {
                get().actions.resumeTimer();
              }
            } catch (error) {
              console.warn('Failed to restore timer from localStorage:', error);
            }
          },

          // UI actions
          setActiveTab: (tab: 'hub' | 'lab') => {
            set({ activeTab: tab });
          },

          setCurrentModule: (module: LearningModule | null) => {
            set({ currentModule: module });
          },

          clearError: () => {
            set({ error: null });
          },

          reset: () => {
            const { actions } = get();
            actions.stopTimer();
            set({
              currentQuiz: null,
              currentAttempt: null,
              attemptState: initialAttemptState,
              quizTimer: initialTimerState,
              currentModule: null,
              currentResults: null,
              currentProgress: null,
              showResults: false,
              error: null,
              isLoading: false,
              loadingStates: {
                quizzes: false,
                currentQuiz: false,
                materials: false,
                currentModule: false,
                progress: false,
                submission: false,
              },
            });
          },

          // Quiz results actions
          fetchQuizProgress: async (quizId: string) => {
            try {
              const response = await fetch(`/api/v1/quizzes/${quizId}/progress`);
              if (!response.ok) {
                throw new Error('Failed to fetch quiz progress');
              }
              const result = await response.json();
              const progress = result.data || null;
              set({ currentProgress: progress });
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to fetch quiz progress'
              });
            }
          },

          retryQuiz: async () => {
            const { currentQuiz, actions } = get();
            if (!currentQuiz) return;

            // Reset quiz state and start a new attempt
            set({
              currentAttempt: null,
              attemptState: initialAttemptState,
              currentResults: null,
              showResults: false,
              error: null,
            });

            // Start a new quiz attempt
            await actions.startQuiz(currentQuiz.id);
          },

          showQuizResults: () => {
            set({ showResults: true });
          },

          hideQuizResults: () => {
            set({ showResults: false });
          },

          // Offline support actions
          addPendingOperation: (operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>) => {
            const pendingOp: PendingOperation = {
              ...operation,
              id: Math.random().toString(36).substr(2, 9),
              timestamp: new Date(),
              retryCount: 0,
            };

            set((state) => ({
              pendingOperations: [...state.pendingOperations, pendingOp]
            }));
          },

          removePendingOperation: (operationId: string) => {
            set((state) => ({
              pendingOperations: state.pendingOperations.filter(op => op.id !== operationId)
            }));
          },

          syncPendingOperations: async () => {
            const { pendingOperations, actions } = get();

            for (const operation of pendingOperations) {
              try {
                switch (operation.type) {
                  case 'quiz_attempt':
                    await fetch(`/api/v1/quizzes/attempts/${operation.data.attemptId}/submit`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(operation.data),
                    });
                    break;

                  case 'progress_update':
                    await fetch(`/api/v1/learning-modules/${operation.data.moduleId}/progress`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(operation.data),
                    });
                    break;
                }

                actions.removePendingOperation(operation.id);
              } catch (error) {
                // Increment retry count
                set((state) => ({
                  pendingOperations: state.pendingOperations.map(op =>
                    op.id === operation.id
                      ? { ...op, retryCount: op.retryCount + 1 }
                      : op
                  )
                }));

                // Remove if max retries exceeded
                if (operation.retryCount >= operation.maxRetries) {
                  actions.removePendingOperation(operation.id);
                }
              }
            }

            set({ lastSyncTime: new Date() });
          },

          setOfflineStatus: (isOffline: boolean) => {
            set({ isOffline });

            // Try to sync when coming back online
            if (!isOffline) {
              get().actions.syncPendingOperations();
            }
          },

          // Role-based error handling
          handleRoleBasedError: (error: any, operation: string) => {
            let errorMessage = 'An error occurred';

            if (error.status === 403) {
              errorMessage = `Access denied for ${operation}. Please check your permissions or contact support.`;
            } else if (error.status === 401) {
              errorMessage = 'Authentication required. Please log in again.';
            } else if (error.status === 404) {
              errorMessage = `The requested ${operation} resource was not found.`;
            } else if (error.message) {
              errorMessage = error.message;
            }

            set({ error: errorMessage });
          },
        },
      }),
      {
        name: 'awareness-lab-storage',
        partialize: (state) => ({
          // Only persist user progress and preferences
          userProgress: state.userProgress,
          activeTab: state.activeTab,
          userQuizAttempts: state.userQuizAttempts,
        }),
      }
    ),
    {
      name: 'awareness-lab-store',
    }
  )
);

// Selector hooks for better performance
export const useQuizzes = () => useAwarenessLabStore((state) => state.quizzes);
export const useCurrentQuiz = () => useAwarenessLabStore((state) => state.currentQuiz);
export const useCurrentAttempt = () => useAwarenessLabStore((state) => state.currentAttempt);
export const useQuizTimer = () => useAwarenessLabStore((state) => state.quizTimer);
export const useLearningModules = () => useAwarenessLabStore((state) => state.learningModules);
export const useCurrentModule = () => useAwarenessLabStore((state) => state.currentModule);
export const useUserProgress = () => useAwarenessLabStore((state) => state.userProgress);
export const useAwarenessLabActions = () => useAwarenessLabStore((state) => state.actions);
export const useAwarenessLabLoading = () => useAwarenessLabStore((state) => state.isLoading);
export const useAwarenessLabError = () => useAwarenessLabStore((state) => state.error);

// Quiz results selectors
export const useCurrentResults = () => useAwarenessLabStore((state) => state.currentResults);
export const useCurrentProgress = () => useAwarenessLabStore((state) => state.currentProgress);
export const useShowResults = () => useAwarenessLabStore((state) => state.showResults);
export const useUserQuizAttempts = () => useAwarenessLabStore((state) => state.userQuizAttempts);
