/**
 * End-to-End Workflow Testing for Awareness Lab
 * 
 * This test suite validates complete user workflows including:
 * - Customer dashboard integration
 * - Quiz taking experience
 * - Learning materials access
 * - Multilingual UI rendering
 * - State persistence across sessions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from '@testing-library/react';
import React from 'react';

// Import components
import { AwarenessLabTab } from '@/components/custom/awareness-lab/AwarenessLabTab';
import { AwarenessHub } from '@/components/custom/awareness-lab/AwarenessHub';
import { AwarenessLab } from '@/components/custom/awareness-lab/AwarenessLab';
import { QuizAttempt } from '@/components/custom/awareness-lab/QuizAttempt';
import { QuizResults } from '@/components/custom/awareness-lab/QuizResults';
import { useAwarenessLabStore } from '@/lib/stores/awareness-lab-store';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage for persistence testing
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock data
const mockQuizzes = [
  {
    id: 'quiz-1',
    title: 'Cybersecurity Basics',
    description: 'Test your knowledge of cybersecurity fundamentals',
    language: 'en',
    timeLimitMinutes: 10,
    maxAttempts: 3,
    isPublished: true,
    questions: [
      {
        id: 'q1',
        questionType: 'mcq',
        questionData: {
          question: 'What is phishing?',
          options: ['A type of fish', 'A cyber attack', 'A programming language', 'A database']
        },
        correctAnswers: ['A cyber attack'],
        orderIndex: 0
      }
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'quiz-ar-1',
    title: 'أساسيات الأمن السيبراني',
    description: 'اختبر معرفتك بأساسيات الأمن السيبراني',
    language: 'ar',
    timeLimitMinutes: 15,
    maxAttempts: 2,
    isPublished: true,
    questions: [
      {
        id: 'q-ar-1',
        questionType: 'true_false',
        questionData: {
          question: 'هل كلمات المرور القوية تحتوي على أحرف فقط؟'
        },
        correctAnswers: ['false'],
        orderIndex: 0
      }
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

const mockLearningModules = [
  {
    id: 'module-1',
    title: 'Password Security',
    description: 'Learn about creating and managing secure passwords',
    category: 'Security Basics',
    orderIndex: 0,
    isPublished: true,
    materials: [
      {
        id: 'material-1',
        materialType: 'link',
        title: 'Password Best Practices',
        description: 'External article on password security',
        materialData: { url: 'https://example.com/password-security' },
        orderIndex: 0
      },
      {
        id: 'material-2',
        materialType: 'video',
        title: 'Password Manager Tutorial',
        materialData: { url: 'https://youtube.com/watch?v=example' },
        orderIndex: 1
      }
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div>{children}</div>;
};

describe('Awareness Lab - End-to-End Workflow Tests', () => {
  beforeEach(() => {
    // Reset store
    useAwarenessLabStore.getState().actions.reset();
    
    // Reset mocks
    mockFetch.mockReset();
    mockLocalStorage.getItem.mockReset();
    mockLocalStorage.setItem.mockReset();
    
    // Default successful responses
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] })
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Customer Dashboard Integration', () => {
    it('should render awareness lab tab in customer dashboard', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockQuizzes })
        .mockResolvedValueOnce({ ok: true, json: async () => mockLearningModules });

      render(
        <TestWrapper>
          <AwarenessLabTab />
        </TestWrapper>
      );

      // Check if main tab navigation is present
      expect(screen.getByText('Awareness Hub')).toBeInTheDocument();
      expect(screen.getByText('Awareness Lab')).toBeInTheDocument();

      // Default should show Hub
      await waitFor(() => {
        expect(screen.getByText('Learning Modules')).toBeInTheDocument();
      });
    });

    it('should switch between Hub and Lab tabs', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockLearningModules })
        .mockResolvedValueOnce({ ok: true, json: async () => mockQuizzes });

      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <AwarenessLabTab />
        </TestWrapper>
      );

      // Initially on Hub
      await waitFor(() => {
        expect(screen.getByText('Learning Modules')).toBeInTheDocument();
      });

      // Switch to Lab
      const labTab = screen.getByText('Awareness Lab');
      await user.click(labTab);

      await waitFor(() => {
        expect(screen.getByText('Available Quizzes')).toBeInTheDocument();
      });

      // Switch back to Hub
      const hubTab = screen.getByText('Awareness Hub');
      await user.click(hubTab);

      await waitFor(() => {
        expect(screen.getByText('Learning Modules')).toBeInTheDocument();
      });
    });
  });

  describe('Complete Quiz Taking Workflow', () => {
    it('should handle complete quiz workflow from start to results', async () => {
      vi.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      // Mock API responses
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockQuizzes })
        .mockResolvedValueOnce({ ok: true, json: async () => mockQuizzes[0] })
        .mockResolvedValueOnce({ 
          ok: true, 
          json: async () => ({
            id: 'attempt-1',
            userId: 'user-1',
            quizId: 'quiz-1',
            answers: {},
            score: 0,
            timeTakenSeconds: 0,
            isCompleted: false,
            startedAt: new Date().toISOString()
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            attemptId: 'attempt-1',
            score: 100,
            totalQuestions: 1,
            correctAnswers: 1,
            timeTakenSeconds: 120,
            isCompleted: true,
            results: [{
              questionId: 'q1',
              userAnswers: ['A cyber attack'],
              correctAnswers: ['A cyber attack'],
              isCorrect: true
            }]
          })
        });

      render(
        <TestWrapper>
          <AwarenessLab />
        </TestWrapper>
      );

      // Wait for quizzes to load
      await waitFor(() => {
        expect(screen.getByText('Cybersecurity Basics')).toBeInTheDocument();
      });

      // Start quiz
      const startButton = screen.getByText('Start Quiz');
      await user.click(startButton);

      // Should show quiz attempt interface
      await waitFor(() => {
        expect(screen.getByText('What is phishing?')).toBeInTheDocument();
      });

      // Answer the question
      const correctOption = screen.getByText('A cyber attack');
      await user.click(correctOption);

      // Submit quiz
      const submitButton = screen.getByText('Submit Quiz');
      await user.click(submitButton);

      // Should show results
      await waitFor(() => {
        expect(screen.getByText('Quiz Results')).toBeInTheDocument();
        expect(screen.getByText('Score: 100%')).toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it('should handle quiz timer countdown and auto-submit', async () => {
      vi.useFakeTimers();
      
      // Mock short quiz for testing
      const shortQuiz = {
        ...mockQuizzes[0],
        timeLimitMinutes: 1 // 1 minute for testing
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => [shortQuiz] })
        .mockResolvedValueOnce({ ok: true, json: async () => shortQuiz })
        .mockResolvedValueOnce({ 
          ok: true, 
          json: async () => ({
            id: 'attempt-1',
            userId: 'user-1',
            quizId: 'quiz-1',
            answers: {},
            score: 0,
            timeTakenSeconds: 0,
            isCompleted: false,
            startedAt: new Date().toISOString()
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            attemptId: 'attempt-1',
            score: 0,
            totalQuestions: 1,
            correctAnswers: 0,
            timeTakenSeconds: 60,
            isCompleted: true,
            results: []
          })
        });

      render(
        <TestWrapper>
          <QuizAttempt />
        </TestWrapper>
      );

      // Start the quiz (this would be triggered by parent component)
      act(() => {
        useAwarenessLabStore.getState().actions.startQuiz('quiz-1');
      });

      // Wait for timer to appear
      await waitFor(() => {
        expect(screen.getByText(/Time Remaining:/)).toBeInTheDocument();
      });

      // Fast forward time to trigger auto-submit
      act(() => {
        vi.advanceTimersByTime(61000); // 61 seconds
      });

      // Should auto-submit and show results
      await waitFor(() => {
        expect(screen.getByText('Time\'s up!')).toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it('should handle attempt limit validation', async () => {
      const user = userEvent.setup();

      // Mock attempt limit exceeded response
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockQuizzes })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({
            message: 'Quiz attempt limit exceeded. Maximum 3 attempts allowed, 3 already made.',
            code: 'ATTEMPT_LIMIT_EXCEEDED'
          })
        });

      render(
        <TestWrapper>
          <AwarenessLab />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Cybersecurity Basics')).toBeInTheDocument();
      });

      const startButton = screen.getByText('Start Quiz');
      await user.click(startButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/attempt limit exceeded/i)).toBeInTheDocument();
      });
    });
  });

  describe('Learning Materials Workflow', () => {
    it('should display and interact with learning modules', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({ 
        ok: true, 
        json: async () => mockLearningModules 
      });

      render(
        <TestWrapper>
          <AwarenessHub />
        </TestWrapper>
      );

      // Wait for modules to load
      await waitFor(() => {
        expect(screen.getByText('Password Security')).toBeInTheDocument();
      });

      // Click on module to view details
      const moduleCard = screen.getByText('Password Security');
      await user.click(moduleCard);

      // Should show module materials
      await waitFor(() => {
        expect(screen.getByText('Password Best Practices')).toBeInTheDocument();
        expect(screen.getByText('Password Manager Tutorial')).toBeInTheDocument();
      });
    });

    it('should handle material completion tracking', async () => {
      const user = userEvent.setup();

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockLearningModules })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'progress-1',
            userId: 'user-1',
            moduleId: 'module-1',
            materialId: 'material-1',
            isCompleted: true,
            completedAt: new Date().toISOString(),
            lastAccessed: new Date().toISOString()
          })
        });

      render(
        <TestWrapper>
          <AwarenessHub />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Password Security')).toBeInTheDocument();
      });

      // Mark material as complete (this would be a button/checkbox in the actual component)
      const completeButton = screen.getByText('Mark as Complete');
      await user.click(completeButton);

      // Should update progress
      await waitFor(() => {
        expect(screen.getByText('✓ Completed')).toBeInTheDocument();
      });
    });
  });

  describe('Multilingual Support and RTL Layout', () => {
    it('should render Arabic content with proper RTL layout', async () => {
      mockFetch.mockResolvedValueOnce({ 
        ok: true, 
        json: async () => [mockQuizzes[1]] // Arabic quiz
      });

      render(
        <TestWrapper>
          <AwarenessLab />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('أساسيات الأمن السيبراني')).toBeInTheDocument();
      });

      // Check if RTL direction is applied (this would be in the actual component)
      const arabicQuizCard = screen.getByText('أساسيات الأمن السيبراني').closest('div');
      expect(arabicQuizCard).toHaveAttribute('dir', 'rtl');
    });

    it('should handle mixed language content correctly', async () => {
      mockFetch.mockResolvedValueOnce({ 
        ok: true, 
        json: async () => mockQuizzes // Both English and Arabic
      });

      render(
        <TestWrapper>
          <AwarenessLab />
        </TestWrapper>
      );

      await waitFor(() => {
        // Both English and Arabic quizzes should be visible
        expect(screen.getByText('Cybersecurity Basics')).toBeInTheDocument();
        expect(screen.getByText('أساسيات الأمن السيبراني')).toBeInTheDocument();
      });

      // English content should be LTR
      const englishQuiz = screen.getByText('Cybersecurity Basics').closest('div');
      expect(englishQuiz).toHaveAttribute('dir', 'ltr');

      // Arabic content should be RTL
      const arabicQuiz = screen.getByText('أساسيات الأمن السيبراني').closest('div');
      expect(arabicQuiz).toHaveAttribute('dir', 'rtl');
    });
  });

  describe('State Persistence and Recovery', () => {
    it('should persist user progress across sessions', async () => {
      // Mock localStorage with existing progress
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        state: {
          userProgress: {
            'module-1-material-1': {
              id: 'progress-1',
              userId: 'user-1',
              moduleId: 'module-1',
              materialId: 'material-1',
              isCompleted: true,
              completedAt: '2024-01-01T12:00:00Z',
              lastAccessed: '2024-01-01T12:00:00Z'
            }
          },
          activeTab: 'lab'
        }
      }));

      mockFetch.mockResolvedValueOnce({ 
        ok: true, 
        json: async () => mockLearningModules 
      });

      render(
        <TestWrapper>
          <AwarenessLabTab />
        </TestWrapper>
      );

      // Should restore active tab
      await waitFor(() => {
        expect(screen.getByText('Available Quizzes')).toBeInTheDocument();
      });

      // Should restore progress when viewing modules
      const hubTab = screen.getByText('Awareness Hub');
      fireEvent.click(hubTab);

      await waitFor(() => {
        expect(screen.getByText('✓ Completed')).toBeInTheDocument();
      });
    });

    it('should handle corrupted localStorage gracefully', async () => {
      // Mock corrupted localStorage data
      mockLocalStorage.getItem.mockReturnValue('invalid-json');

      mockFetch.mockResolvedValueOnce({ 
        ok: true, 
        json: async () => mockLearningModules 
      });

      render(
        <TestWrapper>
          <AwarenessLabTab />
        </TestWrapper>
      );

      // Should still render without errors
      await waitFor(() => {
        expect(screen.getByText('Awareness Hub')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(
        <TestWrapper>
          <AwarenessLab />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });

      // Should show retry option
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should handle server errors with user-friendly messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          message: 'Internal server error',
          code: 'INTERNAL_ERROR'
        })
      });

      render(
        <TestWrapper>
          <AwarenessLab />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
      });
    });

    it('should recover from errors when retrying', async () => {
      const user = userEvent.setup();

      // First call fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true, json: async () => mockQuizzes });

      render(
        <TestWrapper>
          <AwarenessLab />
        </TestWrapper>
      );

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);

      // Should recover and show content
      await waitFor(() => {
        expect(screen.getByText('Cybersecurity Basics')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Accessibility', () => {
    it('should handle large datasets efficiently', async () => {
      // Create large dataset
      const largeQuizList = Array.from({ length: 100 }, (_, i) => ({
        ...mockQuizzes[0],
        id: `quiz-${i}`,
        title: `Quiz ${i + 1}`
      }));

      mockFetch.mockResolvedValueOnce({ 
        ok: true, 
        json: async () => largeQuizList 
      });

      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <AwarenessLab />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Quiz 1')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (adjust threshold as needed)
      expect(renderTime).toBeLessThan(1000); // 1 second
    });

    it('should be accessible with proper ARIA labels', async () => {
      mockFetch.mockResolvedValueOnce({ 
        ok: true, 
        json: async () => mockQuizzes 
      });

      render(
        <TestWrapper>
          <AwarenessLab />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Cybersecurity Basics')).toBeInTheDocument();
      });

      // Check for accessibility attributes
      const quizCard = screen.getByRole('button', { name: /start quiz/i });
      expect(quizCard).toHaveAttribute('aria-label');
      
      const timer = screen.getByRole('timer');
      expect(timer).toBeInTheDocument();
    });
  });
});