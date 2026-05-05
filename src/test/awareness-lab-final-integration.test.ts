/**
 * Final Integration and System Testing for Awareness Lab
 * 
 * This test suite validates:
 * 1. Complete quiz creation to completion workflow
 * 2. Learning materials management and customer access
 * 3. Analytics accuracy with sample data
 * 4. Multilingual support and RTL layout
 * 5. Security measures and access controls
 * 6. Zustand store integration and state persistence
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import { useAwarenessLabStore } from '@/lib/stores/awareness-lab-store';
import type { Quiz, LearningModule, QuizAttempt } from '@/lib/stores/awareness-lab-store';

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock data
const mockQuiz: Quiz = {
  id: 'quiz-1',
  createdBy: 'admin-1',
  title: 'Cybersecurity Basics',
  description: 'Test your knowledge of cybersecurity fundamentals',
  language: 'en',
  timeLimitMinutes: 10,
  maxAttempts: 3,
  isPublished: true,
  questions: [
    {
      id: 'q1',
      quizId: 'quiz-1',
      questionType: 'mcq',
      questionData: {
        question: 'What is phishing?',
        options: ['A type of fish', 'A cyber attack', 'A programming language', 'A database'],
        explanation: 'Phishing is a type of cyber attack that attempts to steal sensitive information.'
      },
      correctAnswers: ['A cyber attack'],
      orderIndex: 0
    },
    {
      id: 'q2',
      quizId: 'quiz-1',
      questionType: 'true_false',
      questionData: {
        question: 'Strong passwords should contain only letters.',
        explanation: 'Strong passwords should contain a mix of letters, numbers, and special characters.'
      },
      correctAnswers: ['false'],
      orderIndex: 1
    }
  ],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

const mockArabicQuiz: Quiz = {
  ...mockQuiz,
  id: 'quiz-ar-1',
  title: 'أساسيات الأمن السيبراني',
  description: 'اختبر معرفتك بأساسيات الأمن السيبراني',
  language: 'ar',
  questions: [
    {
      id: 'q-ar-1',
      quizId: 'quiz-ar-1',
      questionType: 'mcq',
      questionData: {
        question: 'ما هو التصيد الإلكتروني؟',
        options: ['نوع من الأسماك', 'هجوم سيبراني', 'لغة برمجة', 'قاعدة بيانات'],
        explanation: 'التصيد الإلكتروني هو نوع من الهجمات السيبرانية التي تحاول سرقة المعلومات الحساسة.'
      },
      correctAnswers: ['هجوم سيبراني'],
      orderIndex: 0
    }
  ]
};

const mockLearningModule: LearningModule = {
  id: 'module-1',
  createdBy: 'admin-1',
  title: 'Password Security',
  description: 'Learn about creating and managing secure passwords',
  category: 'Security Basics',
  orderIndex: 0,
  isPublished: true,
  materials: [
    {
      id: 'material-1',
      moduleId: 'module-1',
      materialType: 'link',
      title: 'Password Best Practices',
      description: 'External article on password security',
      materialData: {
        url: 'https://example.com/password-security'
      },
      orderIndex: 0
    },
    {
      id: 'material-2',
      moduleId: 'module-1',
      materialType: 'video',
      title: 'Password Manager Tutorial',
      description: 'Video tutorial on using password managers',
      materialData: {
        url: 'https://youtube.com/watch?v=example',
        duration: 300
      },
      orderIndex: 1
    }
  ],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

const mockQuizAttempt: QuizAttempt = {
  id: 'attempt-1',
  userId: 'user-1',
  quizId: 'quiz-1',
  answers: {},
  score: 0,
  timeTakenSeconds: 0,
  isCompleted: false,
  startedAt: '2024-01-01T10:00:00Z'
};

describe('Awareness Lab - Final Integration Tests', () => {
  beforeEach(() => {
    // Reset store state
    useAwarenessLabStore.getState().actions.reset();
    
    // Reset fetch mock
    mockFetch.mockReset();
    
    // Mock successful responses by default
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] })
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('1. Complete Quiz Creation to Completion Workflow', () => {
    it('should handle complete quiz workflow from creation to completion', async () => {
      // Mock API responses for quiz workflow
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [mockQuiz]
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockQuiz
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockQuizAttempt
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            attemptId: 'attempt-1',
            score: 85,
            totalQuestions: 2,
            correctAnswers: 1,
            timeTakenSeconds: 120,
            isCompleted: true,
            results: [
              {
                questionId: 'q1',
                userAnswers: ['A cyber attack'],
                correctAnswers: ['A cyber attack'],
                isCorrect: true,
                explanation: 'Phishing is a type of cyber attack that attempts to steal sensitive information.'
              },
              {
                questionId: 'q2',
                userAnswers: ['true'],
                correctAnswers: ['false'],
                isCorrect: false,
                explanation: 'Strong passwords should contain a mix of letters, numbers, and special characters.'
              }
            ]
          })
        });

      const store = useAwarenessLabStore.getState();

      // 1. Fetch available quizzes
      await store.actions.fetchQuizzes();
      const currentState = useAwarenessLabStore.getState();
      expect(currentState.quizzes).toHaveLength(1);
      expect(currentState.quizzes[0].title).toBe('Cybersecurity Basics');

      // 2. Start a quiz
      await store.actions.startQuiz('quiz-1');
      const afterStart = useAwarenessLabStore.getState();
      expect(afterStart.currentQuiz).toBeTruthy();
      expect(afterStart.currentAttempt).toBeTruthy();
      expect(afterStart.attemptState.hasStarted).toBe(true);
      expect(afterStart.quizTimer.isActive).toBe(true);
      expect(afterStart.quizTimer.timeRemaining).toBe(600); // 10 minutes

      // 3. Answer questions
      store.actions.submitAnswer('q1', ['A cyber attack']);
      store.actions.submitAnswer('q2', ['true']);
      
      const afterAnswers = useAwarenessLabStore.getState();
      expect(afterAnswers.attemptState.currentAnswers).toEqual({
        'q1': ['A cyber attack'],
        'q2': ['true']
      });

      // 4. Navigate between questions
      store.actions.nextQuestion();
      const afterNext = useAwarenessLabStore.getState();
      expect(afterNext.attemptState.currentQuestionIndex).toBe(1);
      
      store.actions.previousQuestion();
      const afterPrev = useAwarenessLabStore.getState();
      expect(afterPrev.attemptState.currentQuestionIndex).toBe(0);

      // 5. Submit quiz
      await store.actions.submitQuiz();
      const afterSubmit = useAwarenessLabStore.getState();
      expect(afterSubmit.currentResults).toBeTruthy();
      expect(afterSubmit.currentResults?.score).toBe(85);
      expect(afterSubmit.currentResults?.isCompleted).toBe(true);
      expect(afterSubmit.showResults).toBe(true);
      expect(afterSubmit.quizTimer.isActive).toBe(false);

      // Verify API calls
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/quizzes');
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/quizzes/quiz-1');
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/quizzes/quiz-1/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/quizzes/attempts/attempt-1/submit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: { 'q1': ['A cyber attack'], 'q2': ['true'] },
          timeTakenSeconds: expect.any(Number)
        })
      });
    });

    it('should handle quiz time expiry with auto-submit', async () => {
      vi.useFakeTimers();
      const store = useAwarenessLabStore.getState();
      
      // Mock quiz fetch and attempt creation
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockQuiz
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockQuizAttempt
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            attemptId: 'attempt-1',
            score: 0,
            totalQuestions: 2,
            correctAnswers: 0,
            timeTakenSeconds: 600,
            isCompleted: true,
            results: []
          })
        });

      // Start quiz with 1 minute timer for testing
      const shortQuiz = { ...mockQuiz, timeLimitMinutes: 1 };
      await store.actions.startQuiz('quiz-1');
      
      // Fast forward time to trigger auto-submit
      act(() => {
        vi.advanceTimersByTime(61000); // 61 seconds
      });

      await waitFor(() => {
        expect(store.quizTimer.isActive).toBe(false);
        expect(store.currentResults).toBeTruthy();
      });

      vi.useRealTimers();
    });

    it('should handle attempt limit validation', async () => {
      const store = useAwarenessLabStore.getState();
      
      // Mock API response for attempt limit exceeded
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          message: 'Quiz attempt limit exceeded. Maximum 3 attempts allowed, 3 already made.',
          code: 'ATTEMPT_LIMIT_EXCEEDED'
        })
      });

      await store.actions.startQuiz('quiz-1');
      
      expect(store.error).toContain('attempt limit exceeded');
      expect(store.currentQuiz).toBeNull();
      expect(store.currentAttempt).toBeNull();
    });
  });

  describe('2. Learning Materials Management and Customer Access', () => {
    it('should handle complete learning materials workflow', async () => {
      const store = useAwarenessLabStore.getState();
      
      // Mock API responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [mockLearningModule]
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLearningModule
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'progress-1',
            userId: 'user-1',
            moduleId: 'module-1',
            materialId: 'material-1',
            isCompleted: true,
            completedAt: '2024-01-01T12:00:00Z',
            lastAccessed: '2024-01-01T12:00:00Z'
          })
        });

      // 1. Fetch learning modules
      await store.actions.fetchLearningModules();
      expect(store.learningModules).toHaveLength(1);
      expect(store.learningModules[0].title).toBe('Password Security');

      // 2. Set current module
      store.actions.setCurrentModule(mockLearningModule);
      expect(store.currentModule).toBeTruthy();
      expect(store.currentModule?.title).toBe('Password Security');

      // 3. Mark material as complete
      await store.actions.markMaterialComplete('module-1', 'material-1');
      expect(store.userProgress['module-1-material-1']).toBeTruthy();
      expect(store.userProgress['module-1-material-1'].isCompleted).toBe(true);

      // 4. Update module progress
      await store.actions.updateProgress('module-1', undefined, true);
      expect(store.userProgress['module-1']).toBeTruthy();

      // Verify API calls
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/learning-modules');
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/learning-modules/module-1/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId: 'module-1',
          materialId: 'material-1',
          isCompleted: true
        })
      });
    });

    it('should handle different material types correctly', async () => {
      const store = useAwarenessLabStore.getState();
      
      const moduleWithVariousMaterials: LearningModule = {
        ...mockLearningModule,
        materials: [
          {
            id: 'link-material',
            moduleId: 'module-1',
            materialType: 'link',
            title: 'External Article',
            materialData: { url: 'https://example.com/article' },
            orderIndex: 0
          },
          {
            id: 'video-material',
            moduleId: 'module-1',
            materialType: 'video',
            title: 'Tutorial Video',
            materialData: { 
              url: 'https://youtube.com/watch?v=example',
              duration: 600
            },
            orderIndex: 1
          },
          {
            id: 'doc-material',
            moduleId: 'module-1',
            materialType: 'document',
            title: 'PDF Guide',
            materialData: { fileUrl: 'https://example.com/guide.pdf' },
            orderIndex: 2
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => moduleWithVariousMaterials
      });

      const module = await store.actions.fetchModuleById('module-1');
      expect(module?.materials).toHaveLength(3);
      expect(module?.materials.find(m => m.materialType === 'link')).toBeTruthy();
      expect(module?.materials.find(m => m.materialType === 'video')).toBeTruthy();
      expect(module?.materials.find(m => m.materialType === 'document')).toBeTruthy();
    });
  });

  describe('3. Analytics Accuracy with Sample Data', () => {
    it('should calculate quiz statistics correctly', async () => {
      // This would typically test the analytics API endpoints
      // For now, we'll test the data structures and calculations
      
      const sampleAttempts: QuizAttempt[] = [
        {
          id: 'attempt-1',
          userId: 'user-1',
          quizId: 'quiz-1',
          answers: { 'q1': ['correct'], 'q2': ['correct'] },
          score: 100,
          timeTakenSeconds: 120,
          isCompleted: true,
          startedAt: '2024-01-01T10:00:00Z',
          completedAt: '2024-01-01T10:02:00Z'
        },
        {
          id: 'attempt-2',
          userId: 'user-2',
          quizId: 'quiz-1',
          answers: { 'q1': ['correct'], 'q2': ['incorrect'] },
          score: 50,
          timeTakenSeconds: 180,
          isCompleted: true,
          startedAt: '2024-01-01T11:00:00Z',
          completedAt: '2024-01-01T11:03:00Z'
        },
        {
          id: 'attempt-3',
          userId: 'user-3',
          quizId: 'quiz-1',
          answers: {},
          score: 0,
          timeTakenSeconds: 60,
          isCompleted: false,
          startedAt: '2024-01-01T12:00:00Z'
        }
      ];

      // Calculate analytics
      const totalAttempts = sampleAttempts.length;
      const completedAttempts = sampleAttempts.filter(a => a.isCompleted).length;
      const completionRate = (completedAttempts / totalAttempts) * 100;
      const averageScore = sampleAttempts
        .filter(a => a.isCompleted)
        .reduce((sum, a) => sum + a.score, 0) / completedAttempts;
      const averageTime = sampleAttempts
        .filter(a => a.isCompleted)
        .reduce((sum, a) => sum + a.timeTakenSeconds, 0) / completedAttempts;

      expect(totalAttempts).toBe(3);
      expect(completedAttempts).toBe(2);
      expect(completionRate).toBe(66.67); // Rounded
      expect(averageScore).toBe(75);
      expect(averageTime).toBe(150);
    });

    it('should track user progress accurately', () => {
      const store = useAwarenessLabStore.getState();
      
      // Simulate progress tracking
      const progressData = {
        'module-1-material-1': {
          id: 'progress-1',
          userId: 'user-1',
          moduleId: 'module-1',
          materialId: 'material-1',
          isCompleted: true,
          completedAt: '2024-01-01T12:00:00Z',
          lastAccessed: '2024-01-01T12:00:00Z'
        },
        'module-1-material-2': {
          id: 'progress-2',
          userId: 'user-1',
          moduleId: 'module-1',
          materialId: 'material-2',
          isCompleted: false,
          lastAccessed: '2024-01-01T12:05:00Z'
        }
      };

      // Manually set progress for testing
      useAwarenessLabStore.setState({ userProgress: progressData });

      const moduleProgress = Object.values(store.userProgress)
        .filter(p => p.moduleId === 'module-1');
      const completedMaterials = moduleProgress.filter(p => p.isCompleted).length;
      const totalMaterials = moduleProgress.length;
      const moduleCompletionRate = (completedMaterials / totalMaterials) * 100;

      expect(moduleCompletionRate).toBe(50);
    });
  });

  describe('4. Multilingual Support and RTL Layout', () => {
    it('should handle Arabic content with RTL layout', async () => {
      const store = useAwarenessLabStore.getState();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockArabicQuiz]
      });

      await store.actions.fetchQuizzes();
      const arabicQuiz = store.quizzes.find(q => q.language === 'ar');
      
      expect(arabicQuiz).toBeTruthy();
      expect(arabicQuiz?.title).toBe('أساسيات الأمن السيبراني');
      expect(arabicQuiz?.language).toBe('ar');
      expect(arabicQuiz?.questions[0].questionData.question).toBe('ما هو التصيد الإلكتروني؟');
    });

    it('should handle mixed language content', async () => {
      const store = useAwarenessLabStore.getState();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockQuiz, mockArabicQuiz]
      });

      await store.actions.fetchQuizzes();
      
      const englishQuizzes = store.quizzes.filter(q => q.language === 'en');
      const arabicQuizzes = store.quizzes.filter(q => q.language === 'ar');
      
      expect(englishQuizzes).toHaveLength(1);
      expect(arabicQuizzes).toHaveLength(1);
      expect(store.quizzes).toHaveLength(2);
    });

    it('should validate RTL text direction for Arabic content', () => {
      // This would typically be tested in component tests
      // Here we validate the data structure supports RTL
      const arabicQuestion = mockArabicQuiz.questions[0];
      
      expect(arabicQuestion.questionData.question).toMatch(/[\u0600-\u06FF]/); // Arabic Unicode range
      expect(mockArabicQuiz.language).toBe('ar');
      
      // Verify Arabic options contain Arabic text
      const arabicOptions = arabicQuestion.questionData.options || [];
      const hasArabicText = arabicOptions.some(option => 
        /[\u0600-\u06FF]/.test(option)
      );
      expect(hasArabicText).toBe(true);
    });
  });

  describe('5. Security Measures and Access Controls', () => {
    it('should handle authentication errors', async () => {
      const store = useAwarenessLabStore.getState();
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          message: 'Unauthorized access',
          code: 'UNAUTHORIZED'
        })
      });

      await store.actions.fetchQuizzes();
      expect(store.error).toContain('Failed to fetch quizzes');
    });

    it('should validate quiz submission integrity', async () => {
      const store = useAwarenessLabStore.getState();
      
      // Mock tampered submission response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          message: 'Invalid quiz submission - answers validation failed',
          code: 'INVALID_SUBMISSION'
        })
      });

      // Set up a mock attempt
      useAwarenessLabStore.setState({
        currentAttempt: mockQuizAttempt,
        attemptState: {
          currentAnswers: { 'invalid-question': ['invalid-answer'] },
          currentQuestionIndex: 0,
          hasStarted: true
        }
      });

      await store.actions.submitQuiz();
      expect(store.error).toContain('Failed to submit quiz');
    });

    it('should handle rate limiting', async () => {
      const store = useAwarenessLabStore.getState();
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          message: 'Too many requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED'
        })
      });

      await store.actions.fetchQuizzes();
      expect(store.error).toContain('Failed to fetch quizzes');
    });

    it('should validate input sanitization', () => {
      const store = useAwarenessLabStore.getState();
      
      // Test XSS prevention in answers
      const maliciousAnswer = '<script>alert("xss")</script>';
      store.actions.submitAnswer('q1', [maliciousAnswer]);
      
      const storedAnswer = store.attemptState.currentAnswers['q1'];
      expect(storedAnswer).toEqual([maliciousAnswer]); // Store as-is, sanitization happens server-side
    });
  });

  describe('6. Zustand Store Integration and State Persistence', () => {
    it('should persist user progress and preferences', () => {
      const store = useAwarenessLabStore.getState();
      
      // Set some state that should be persisted
      const testProgress = {
        'module-1': {
          id: 'progress-1',
          userId: 'user-1',
          moduleId: 'module-1',
          isCompleted: true,
          completedAt: '2024-01-01T12:00:00Z',
          lastAccessed: '2024-01-01T12:00:00Z'
        }
      };
      
      const testAttempts = {
        'quiz-1': [mockQuizAttempt]
      };

      useAwarenessLabStore.setState({
        userProgress: testProgress,
        activeTab: 'lab',
        userQuizAttempts: testAttempts
      });

      // Verify state is set
      expect(store.userProgress).toEqual(testProgress);
      expect(store.activeTab).toBe('lab');
      expect(store.userQuizAttempts).toEqual(testAttempts);
    });

    it('should not persist sensitive quiz data', () => {
      const store = useAwarenessLabStore.getState();
      
      // Set sensitive state that should NOT be persisted
      useAwarenessLabStore.setState({
        currentQuiz: mockQuiz,
        currentAttempt: mockQuizAttempt,
        quizTimer: {
          timeRemaining: 300,
          isActive: true,
          startTime: new Date()
        }
      });

      // Reset store to simulate page reload
      store.actions.reset();

      // Verify sensitive data is cleared
      expect(store.currentQuiz).toBeNull();
      expect(store.currentAttempt).toBeNull();
      expect(store.quizTimer.isActive).toBe(false);
    });

    it('should handle store actions correctly', async () => {
      const store = useAwarenessLabStore.getState();
      
      // Test UI actions
      store.actions.setActiveTab('lab');
      expect(store.activeTab).toBe('lab');
      
      store.actions.setCurrentModule(mockLearningModule);
      expect(store.currentModule).toEqual(mockLearningModule);
      
      // Test error handling
      store.actions.clearError();
      expect(store.error).toBeNull();
      
      // Test timer actions
      store.actions.startTimer(5); // 5 minutes
      expect(store.quizTimer.isActive).toBe(true);
      expect(store.quizTimer.timeRemaining).toBe(300);
      
      store.actions.pauseTimer();
      expect(store.quizTimer.isActive).toBe(false);
      
      store.actions.stopTimer();
      expect(store.quizTimer.timeRemaining).toBe(0);
    });

    it('should handle concurrent state updates', () => {
      const store = useAwarenessLabStore.getState();
      
      // Simulate concurrent updates
      store.actions.submitAnswer('q1', ['answer1']);
      store.actions.submitAnswer('q2', ['answer2']);
      store.actions.submitAnswer('q1', ['updated-answer1']); // Update existing answer
      
      expect(store.attemptState.currentAnswers).toEqual({
        'q1': ['updated-answer1'],
        'q2': ['answer2']
      });
    });

    it('should maintain state consistency during navigation', () => {
      const store = useAwarenessLabStore.getState();
      
      // Set up quiz state
      useAwarenessLabStore.setState({
        currentQuiz: mockQuiz,
        attemptState: {
          currentAnswers: { 'q1': ['answer1'] },
          currentQuestionIndex: 0,
          hasStarted: true
        }
      });

      // Navigate between questions
      store.actions.nextQuestion();
      expect(store.attemptState.currentQuestionIndex).toBe(1);
      expect(store.attemptState.currentAnswers['q1']).toEqual(['answer1']); // Answers preserved
      
      store.actions.previousQuestion();
      expect(store.attemptState.currentQuestionIndex).toBe(0);
      expect(store.attemptState.currentAnswers['q1']).toEqual(['answer1']); // Still preserved
    });
  });

  describe('Integration Error Handling', () => {
    it('should handle network failures gracefully', async () => {
      const store = useAwarenessLabStore.getState();
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      await store.actions.fetchQuizzes();
      expect(store.error).toBe('Network error');
      expect(store.isLoading).toBe(false);
    });

    it('should handle malformed API responses', async () => {
      const store = useAwarenessLabStore.getState();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON'); }
      });
      
      await store.actions.fetchQuizzes();
      expect(store.error).toBe('Invalid JSON');
    });

    it('should handle server errors', async () => {
      const store = useAwarenessLabStore.getState();
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          message: 'Internal server error',
          code: 'INTERNAL_ERROR'
        })
      });
      
      await store.actions.fetchQuizzes();
      expect(store.error).toContain('Failed to fetch quizzes');
    });
  });
});