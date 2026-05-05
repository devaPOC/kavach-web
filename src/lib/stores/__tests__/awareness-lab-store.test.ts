import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useAwarenessLabStore } from '../awareness-lab-store';

// Mock fetch globally
global.fetch = vi.fn();

describe('AwarenessLabStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useAwarenessLabStore.getState().actions.reset();
    // Also clear the store state completely
    useAwarenessLabStore.setState({
      quizzes: [],
      currentQuiz: null,
      currentAttempt: null,
      attemptState: {
        currentAnswers: {},
        currentQuestionIndex: 0,
        hasStarted: false,
      },
      quizTimer: {
        timeRemaining: 0,
        isActive: false,
        startTime: null,
      },
      userQuizAttempts: {},
      learningModules: [],
      currentModule: null,
      userProgress: {},
      isLoading: false,
      error: null,
      activeTab: 'hub',
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any timers
    const { quizTimer } = useAwarenessLabStore.getState();
    if (quizTimer.intervalId) {
      clearInterval(quizTimer.intervalId);
    }
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useAwarenessLabStore.getState();
      
      expect(state.quizzes).toEqual([]);
      expect(state.currentQuiz).toBeNull();
      expect(state.currentAttempt).toBeNull();
      expect(state.learningModules).toEqual([]);
      expect(state.currentModule).toBeNull();
      expect(state.userProgress).toEqual({});
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.activeTab).toBe('hub');
      expect(state.quizTimer.isActive).toBe(false);
      expect(state.quizTimer.timeRemaining).toBe(0);
    });
  });

  describe('Quiz Actions', () => {
    it('should fetch quizzes successfully', async () => {
      const mockQuizzes = [
        {
          id: '1',
          title: 'Test Quiz',
          description: 'A test quiz',
          language: 'en' as const,
          timeLimitMinutes: 30,
          maxAttempts: 3,
          isPublished: true,
          questions: [],
          createdBy: 'admin',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockQuizzes,
      });

      const { actions } = useAwarenessLabStore.getState();
      await actions.fetchQuizzes();

      const state = useAwarenessLabStore.getState();
      expect(state.quizzes).toEqual(mockQuizzes);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle fetch quizzes error', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { actions } = useAwarenessLabStore.getState();
      await actions.fetchQuizzes();

      const state = useAwarenessLabStore.getState();
      expect(state.quizzes).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Network error');
    });

    it('should submit answer correctly', () => {
      const { actions } = useAwarenessLabStore.getState();
      
      actions.submitAnswer('question-1', ['answer-a']);
      
      const state = useAwarenessLabStore.getState();
      expect(state.attemptState.currentAnswers['question-1']).toEqual(['answer-a']);
    });

    it('should navigate questions correctly', () => {
      const { actions } = useAwarenessLabStore.getState();
      
      // Set up a mock quiz with multiple questions
      useAwarenessLabStore.setState({
        currentQuiz: {
          id: '1',
          title: 'Test Quiz',
          description: 'A test quiz',
          language: 'en' as const,
          timeLimitMinutes: 30,
          maxAttempts: 3,
          isPublished: true,
          questions: [
            { id: 'q1', quizId: '1', questionType: 'mcq' as const, questionData: { question: 'Q1', options: ['Option A', 'Option B', 'Option C'] }, correctAnswers: ['Option A'], orderIndex: 0 },
            { id: 'q2', quizId: '1', questionType: 'mcq' as const, questionData: { question: 'Q2', options: ['Option A', 'Option B', 'Option C'] }, correctAnswers: ['Option B'], orderIndex: 1 },
            { id: 'q3', quizId: '1', questionType: 'mcq' as const, questionData: { question: 'Q3', options: ['Option A', 'Option B', 'Option C'] }, correctAnswers: ['Option C'], orderIndex: 2 },
          ],
          createdBy: 'admin',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        attemptState: {
          currentAnswers: {},
          currentQuestionIndex: 0,
          hasStarted: true,
        },
      });

      // Test next question
      actions.nextQuestion();
      expect(useAwarenessLabStore.getState().attemptState.currentQuestionIndex).toBe(1);

      // Test next question again
      actions.nextQuestion();
      expect(useAwarenessLabStore.getState().attemptState.currentQuestionIndex).toBe(2);

      // Test next question at end (should stay at last question)
      actions.nextQuestion();
      expect(useAwarenessLabStore.getState().attemptState.currentQuestionIndex).toBe(2);

      // Test previous question
      actions.previousQuestion();
      expect(useAwarenessLabStore.getState().attemptState.currentQuestionIndex).toBe(1);

      // Test previous question again
      actions.previousQuestion();
      expect(useAwarenessLabStore.getState().attemptState.currentQuestionIndex).toBe(0);

      // Test previous question at start (should stay at 0)
      actions.previousQuestion();
      expect(useAwarenessLabStore.getState().attemptState.currentQuestionIndex).toBe(0);
    });
  });

  describe('Timer Actions', () => {
    it('should start timer correctly', () => {
      const { actions } = useAwarenessLabStore.getState();
      
      actions.startTimer(5); // 5 minutes
      
      const state = useAwarenessLabStore.getState();
      expect(state.quizTimer.isActive).toBe(true);
      expect(state.quizTimer.timeRemaining).toBe(300); // 5 * 60 seconds
      expect(state.quizTimer.startTime).toBeInstanceOf(Date);
      expect(state.quizTimer.intervalId).toBeDefined();
    });

    it('should pause and resume timer correctly', () => {
      const { actions } = useAwarenessLabStore.getState();
      
      actions.startTimer(5);
      
      // Pause timer
      actions.pauseTimer();
      let state = useAwarenessLabStore.getState();
      expect(state.quizTimer.isActive).toBe(false);
      expect(state.quizTimer.intervalId).toBeUndefined();

      // Resume timer
      actions.resumeTimer();
      state = useAwarenessLabStore.getState();
      expect(state.quizTimer.isActive).toBe(true);
      expect(state.quizTimer.intervalId).toBeDefined();
    });

    it('should stop timer correctly', () => {
      const { actions } = useAwarenessLabStore.getState();
      
      actions.startTimer(5);
      actions.stopTimer();
      
      const state = useAwarenessLabStore.getState();
      expect(state.quizTimer.isActive).toBe(false);
      expect(state.quizTimer.timeRemaining).toBe(0);
      expect(state.quizTimer.startTime).toBeNull();
      expect(state.quizTimer.intervalId).toBeUndefined();
    });
  });

  describe('Learning Module Actions', () => {
    it('should fetch learning modules successfully', async () => {
      const mockModules = [
        {
          id: '1',
          title: 'Test Module',
          description: 'A test module',
          category: 'Security',
          orderIndex: 0,
          isPublished: true,
          materials: [],
          createdBy: 'admin',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockModules,
      });

      const { actions } = useAwarenessLabStore.getState();
      await actions.fetchLearningModules();

      const state = useAwarenessLabStore.getState();
      expect(state.learningModules).toEqual(mockModules);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should update progress correctly', async () => {
      const mockProgress = {
        id: 'progress-1',
        userId: 'user-1',
        moduleId: 'module-1',
        materialId: 'material-1',
        isCompleted: true,
        completedAt: '2024-01-01T00:00:00Z',
        lastAccessed: '2024-01-01T00:00:00Z',
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProgress,
      });

      const { actions } = useAwarenessLabStore.getState();
      await actions.updateProgress('module-1', 'material-1', true);

      const state = useAwarenessLabStore.getState();
      expect(state.userProgress['module-1-material-1']).toEqual(mockProgress);
    });
  });

  describe('UI Actions', () => {
    it('should set active tab correctly', () => {
      const { actions } = useAwarenessLabStore.getState();
      
      actions.setActiveTab('lab');
      expect(useAwarenessLabStore.getState().activeTab).toBe('lab');
      
      actions.setActiveTab('hub');
      expect(useAwarenessLabStore.getState().activeTab).toBe('hub');
    });

    it('should set current module correctly', () => {
      const mockModule = {
        id: '1',
        title: 'Test Module',
        description: 'A test module',
        category: 'Security',
        orderIndex: 0,
        isPublished: true,
        materials: [],
        createdBy: 'admin',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const { actions } = useAwarenessLabStore.getState();
      
      actions.setCurrentModule(mockModule);
      expect(useAwarenessLabStore.getState().currentModule).toEqual(mockModule);
      
      actions.setCurrentModule(null);
      expect(useAwarenessLabStore.getState().currentModule).toBeNull();
    });

    it('should clear error correctly', () => {
      const { actions } = useAwarenessLabStore.getState();
      
      // Set an error first
      useAwarenessLabStore.setState({ error: 'Test error' });
      expect(useAwarenessLabStore.getState().error).toBe('Test error');
      
      // Clear the error
      actions.clearError();
      expect(useAwarenessLabStore.getState().error).toBeNull();
    });

    it('should reset store correctly', () => {
      const { actions } = useAwarenessLabStore.getState();
      
      // Set some state first
      useAwarenessLabStore.setState({
        currentQuiz: { id: '1' } as any,
        currentAttempt: { id: '1' } as any,
        currentModule: { id: '1' } as any,
        error: 'Test error',
        isLoading: true,
      });
      
      // Reset the store
      actions.reset();
      
      const state = useAwarenessLabStore.getState();
      expect(state.currentQuiz).toBeNull();
      expect(state.currentAttempt).toBeNull();
      expect(state.currentModule).toBeNull();
      expect(state.error).toBeNull();
      expect(state.isLoading).toBe(false);
    });
  });
});