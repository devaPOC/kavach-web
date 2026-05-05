import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAdminAwarenessStore } from '../admin-awareness-store';

// Mock fetch globally
global.fetch = vi.fn();

describe('AdminAwarenessStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useAdminAwarenessStore.getState().actions.reset();
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useAdminAwarenessStore.getState();
      
      expect(state.adminQuizzes).toEqual([]);
      expect(state.quizTemplates).toEqual([]);
      expect(state.selectedQuiz).toBeNull();
      expect(state.adminModules).toEqual([]);
      expect(state.selectedModule).toBeNull();
      expect(state.analytics.quizStats).toEqual({});
      expect(state.analytics.overviewStats).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.activeAdminTab).toBe('quizzes');
    });
  });

  describe('Quiz Management Actions', () => {
    it('should fetch admin quizzes successfully', async () => {
      const mockQuizzes = [
        {
          id: '1',
          title: 'Admin Quiz',
          description: 'An admin quiz',
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

      const { actions } = useAdminAwarenessStore.getState();
      await actions.fetchAdminQuizzes();

      const state = useAdminAwarenessStore.getState();
      expect(state.adminQuizzes).toEqual(mockQuizzes);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should create quiz successfully', async () => {
      const newQuizData = {
        title: 'New Quiz',
        description: 'A new quiz',
        language: 'en' as const,
        timeLimitMinutes: 30,
        maxAttempts: 3,
        questions: [],
      };

      const createdQuiz = {
        id: '1',
        ...newQuizData,
        isPublished: false,
        createdBy: 'admin',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => createdQuiz,
      });

      const { actions } = useAdminAwarenessStore.getState();
      const result = await actions.createQuiz(newQuizData);

      expect(result).toEqual(createdQuiz);
      const state = useAdminAwarenessStore.getState();
      expect(state.adminQuizzes).toContain(createdQuiz);
    });

    it('should handle create quiz error', async () => {
      const newQuizData = {
        title: 'New Quiz',
        description: 'A new quiz',
        language: 'en' as const,
        timeLimitMinutes: 30,
        maxAttempts: 3,
        questions: [],
      };

      (fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Validation error' }),
      });

      const { actions } = useAdminAwarenessStore.getState();
      const result = await actions.createQuiz(newQuizData);

      expect(result).toBeNull();
      const state = useAdminAwarenessStore.getState();
      expect(state.error).toBe('Validation error');
    });

    it('should update quiz successfully', async () => {
      // Set up initial quiz
      const initialQuiz = {
        id: '1',
        title: 'Original Quiz',
        description: 'Original description',
        language: 'en' as const,
        timeLimitMinutes: 30,
        maxAttempts: 3,
        isPublished: false,
        questions: [],
        createdBy: 'admin',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      useAdminAwarenessStore.setState({
        adminQuizzes: [initialQuiz],
      });

      const updateData = {
        title: 'Updated Quiz',
        isPublished: true,
      };

      const updatedQuiz = {
        ...initialQuiz,
        ...updateData,
        updatedAt: '2024-01-02T00:00:00Z',
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedQuiz,
      });

      const { actions } = useAdminAwarenessStore.getState();
      const result = await actions.updateQuiz('1', updateData);

      expect(result).toEqual(updatedQuiz);
      const state = useAdminAwarenessStore.getState();
      expect(state.adminQuizzes[0]).toEqual(updatedQuiz);
    });

    it('should delete quiz successfully', async () => {
      // Set up initial quiz
      const initialQuiz = {
        id: '1',
        title: 'Quiz to Delete',
        description: 'Will be deleted',
        language: 'en' as const,
        timeLimitMinutes: 30,
        maxAttempts: 3,
        isPublished: false,
        questions: [],
        createdBy: 'admin',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      useAdminAwarenessStore.setState({
        adminQuizzes: [initialQuiz],
        selectedQuiz: initialQuiz,
      });

      (fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      const { actions } = useAdminAwarenessStore.getState();
      const result = await actions.deleteQuiz('1');

      expect(result).toBe(true);
      const state = useAdminAwarenessStore.getState();
      expect(state.adminQuizzes).toEqual([]);
      expect(state.selectedQuiz).toBeNull();
    });

    it('should duplicate quiz successfully', async () => {
      // Set up initial quiz
      const originalQuiz = {
        id: '1',
        title: 'Original Quiz',
        description: 'Original description',
        language: 'en' as const,
        timeLimitMinutes: 30,
        maxAttempts: 3,
        isPublished: true,
        questions: [
          {
            id: 'q1',
            quizId: '1',
            questionType: 'mcq' as const,
            questionData: { question: 'Test question' },
            correctAnswers: ['a'],
            orderIndex: 0,
          },
        ],
        createdBy: 'admin',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const duplicatedQuiz = {
        id: '2',
        title: 'Original Quiz (Copy)',
        description: 'Original description',
        language: 'en' as const,
        timeLimitMinutes: 30,
        maxAttempts: 3,
        isPublished: false,
        questions: [
          {
            id: 'q2',
            quizId: '2',
            questionType: 'mcq' as const,
            questionData: { question: 'Test question' },
            correctAnswers: ['a'],
            orderIndex: 0,
          },
        ],
        createdBy: 'admin',
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      };

      useAdminAwarenessStore.setState({
        adminQuizzes: [originalQuiz],
      });

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => duplicatedQuiz,
      });

      const { actions } = useAdminAwarenessStore.getState();
      const result = await actions.duplicateQuiz('1');

      expect(result).toEqual(duplicatedQuiz);
      const state = useAdminAwarenessStore.getState();
      expect(state.adminQuizzes).toHaveLength(2);
      expect(state.adminQuizzes).toContain(duplicatedQuiz);
    });
  });

  describe('Template Management Actions', () => {
    it('should fetch templates successfully', async () => {
      const mockTemplates = [
        {
          id: '1',
          name: 'Basic Quiz Template',
          description: 'A basic template',
          templateConfig: {
            timeLimitMinutes: 30,
            maxAttempts: 3,
            language: 'en' as const,
            questionTypes: ['mcq', 'true_false'],
            defaultQuestionCount: 10,
          },
          usageCount: 5,
          createdBy: 'admin',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplates,
      });

      const { actions } = useAdminAwarenessStore.getState();
      await actions.fetchTemplates();

      const state = useAdminAwarenessStore.getState();
      expect(state.quizTemplates).toEqual(mockTemplates);
    });

    it('should use template correctly', () => {
      const template = {
        id: '1',
        name: 'Basic Quiz Template',
        description: 'A basic template',
        templateConfig: {
          timeLimitMinutes: 30,
          maxAttempts: 3,
          language: 'en' as const,
          questionTypes: ['mcq', 'true_false'],
          defaultQuestionCount: 10,
        },
        usageCount: 5,
        createdBy: 'admin',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      useAdminAwarenessStore.setState({
        quizTemplates: [template],
      });

      const { actions } = useAdminAwarenessStore.getState();
      const result = actions.useTemplate('1');

      expect(result).toEqual({
        title: '',
        description: '',
        language: 'en',
        timeLimitMinutes: 30,
        maxAttempts: 3,
        questions: [],
        templateId: '1',
      });
    });
  });

  describe('Analytics Actions', () => {
    it('should fetch quiz analytics successfully', async () => {
      const mockAnalytics = {
        quizId: '1',
        totalAttempts: 100,
        completedAttempts: 85,
        completionRate: 85,
        averageScore: 78.5,
        averageTimeMinutes: 25.3,
        questionStats: [],
        userEngagement: [],
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalytics,
      });

      const { actions } = useAdminAwarenessStore.getState();
      await actions.fetchQuizAnalytics('1');

      const state = useAdminAwarenessStore.getState();
      expect(state.analytics.quizStats['1']).toEqual(mockAnalytics);
    });

    it('should fetch overview analytics successfully', async () => {
      const mockOverview = {
        totalQuizzes: 10,
        publishedQuizzes: 8,
        totalAttempts: 500,
        totalUsers: 50,
        averageCompletionRate: 82.5,
        topPerformingQuizzes: [],
        recentActivity: [],
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOverview,
      });

      const { actions } = useAdminAwarenessStore.getState();
      await actions.fetchOverviewAnalytics();

      const state = useAdminAwarenessStore.getState();
      expect(state.analytics.overviewStats).toEqual(mockOverview);
    });
  });

  describe('UI Actions', () => {
    it('should set active admin tab correctly', () => {
      const { actions } = useAdminAwarenessStore.getState();
      
      actions.setActiveAdminTab('templates');
      expect(useAdminAwarenessStore.getState().activeAdminTab).toBe('templates');
      
      actions.setActiveAdminTab('analytics');
      expect(useAdminAwarenessStore.getState().activeAdminTab).toBe('analytics');
    });

    it('should set selected quiz correctly', () => {
      const mockQuiz = {
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
      };

      const { actions } = useAdminAwarenessStore.getState();
      
      actions.setSelectedQuiz(mockQuiz);
      expect(useAdminAwarenessStore.getState().selectedQuiz).toEqual(mockQuiz);
      
      actions.setSelectedQuiz(null);
      expect(useAdminAwarenessStore.getState().selectedQuiz).toBeNull();
    });
  });
});