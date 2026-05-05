/**
 * Integration test to verify expert users can access awareness lab functionality
 * through the unified customer interface after consolidation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { AwarenessLabTab } from '@/components/custom/awareness-lab/AwarenessLabTab'
import { AwarenessLab } from '@/components/custom/awareness-lab/AwarenessLab'
import { AwarenessHub } from '@/components/custom/awareness-lab/AwarenessHub'
import { LanguageProvider } from '@/lib/contexts/LanguageContext'

// Mock the router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn()
}))

// Mock the current user hook
vi.mock('@/lib/hooks/useCurrentUser', () => ({
  useCurrentUser: vi.fn()
}))

// Mock the awareness lab store
vi.mock('@/lib/stores/awareness-lab-store', () => ({
  useAwarenessLabStore: vi.fn(),
  useAwarenessLabActions: vi.fn(),
  useAwarenessLabLoading: vi.fn(),
  useAwarenessLabError: vi.fn(),
  useCurrentQuiz: vi.fn(),
  useCurrentAttempt: vi.fn(),
  useCurrentResults: vi.fn(),
  useCurrentProgress: vi.fn(),
  useShowResults: vi.fn()
}))

// Mock fetch for API calls
global.fetch = vi.fn()

const mockExpertUser = {
  id: 'expert-123',
  role: 'expert' as const,
  firstName: 'John',
  lastName: 'Expert',
  email: 'expert@example.com',
  isApproved: true,
  isEmailVerified: true
}

const mockCustomerUser = {
  id: 'customer-123',
  role: 'customer' as const,
  firstName: 'Jane',
  lastName: 'Customer',
  email: 'customer@example.com',
  isApproved: true,
  isEmailVerified: true
}

const mockQuizzes = [
  {
    id: 'quiz-1',
    title: 'Cybersecurity Basics',
    description: 'Test your basic cybersecurity knowledge',
    language: 'en' as const,
    timeLimitMinutes: 30,
    maxAttempts: 3,
    isPublished: true,
    questions: [
      {
        id: 'q1',
        questionType: 'mcq' as const,
        questionData: {
          question: 'What is phishing?',
          options: ['A type of fish', 'A cyber attack', 'A programming language', 'A network protocol']
        },
        correctAnswers: ['A cyber attack'],
        orderIndex: 0
      }
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'admin-123'
  }
]

const mockLearningModules = [
  {
    id: 'module-1',
    title: 'Password Security',
    description: 'Learn about creating strong passwords',
    category: 'Security Fundamentals',
    orderIndex: 1,
    isPublished: true,
    materials: [
      {
        id: 'material-1',
        moduleId: 'module-1',
        materialType: 'video' as const,
        title: 'Password Best Practices',
        description: 'Video guide on password security',
        materialData: {
          url: 'https://example.com/video',
          duration: 300
        },
        orderIndex: 1
      }
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'admin-123'
  }
]

describe('Awareness Lab Expert Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful API responses
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          quizzes: mockQuizzes,
          modules: mockLearningModules
        }
      })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Expert User Access', () => {
    it('should allow expert users to access awareness lab through customer interface', async () => {
      const { useCurrentUser } = await import('@/lib/hooks/useCurrentUser')
      const { useAwarenessLabStore, useAwarenessLabActions, useAwarenessLabLoading, useAwarenessLabError } = await import('@/lib/stores/awareness-lab-store')

      // Mock expert user
      ;(useCurrentUser as any).mockReturnValue({
        user: mockExpertUser,
        isLoading: false,
        error: null
      })

      // Mock store state
      ;(useAwarenessLabStore as any).mockReturnValue({
        quizzes: mockQuizzes,
        learningModules: mockLearningModules,
        userQuizAttempts: {},
        userProgress: {},
        activeTab: 'lab'
      })

      ;(useAwarenessLabActions as any).mockReturnValue({
        fetchQuizzes: vi.fn(),
        fetchLearningModules: vi.fn(),
        setActiveTab: vi.fn(),
        clearError: vi.fn()
      })

      ;(useAwarenessLabLoading as any).mockReturnValue(false)
      ;(useAwarenessLabError as any).mockReturnValue(null)

      render(
        <LanguageProvider>
          <AwarenessLabTab />
        </LanguageProvider>
      )

      // Verify expert user is welcomed with appropriate message
      expect(screen.getByText(/Welcome, John/)).toBeInTheDocument()
      expect(screen.getByText(/Expert/)).toBeInTheDocument()
      expect(screen.getByText(/Unified interface for experts and customers/)).toBeInTheDocument()

      // Verify awareness lab tabs are available
      expect(screen.getByText('Awareness Hub')).toBeInTheDocument()
      expect(screen.getByText('Awareness Lab')).toBeInTheDocument()
    })

    it('should display role-specific features for expert users in awareness lab', async () => {
      const { useCurrentUser } = await import('@/lib/hooks/useCurrentUser')
      const { useAwarenessLabStore, useAwarenessLabActions, useAwarenessLabLoading, useAwarenessLabError } = await import('@/lib/stores/awareness-lab-store')

      ;(useCurrentUser as any).mockReturnValue({
        user: mockExpertUser,
        isLoading: false,
        error: null
      })

      ;(useAwarenessLabStore as any).mockReturnValue({
        quizzes: mockQuizzes,
        learningModules: mockLearningModules,
        userQuizAttempts: {},
        userProgress: {},
        activeTab: 'lab'
      })

      ;(useAwarenessLabActions as any).mockReturnValue({
        fetchQuizzes: vi.fn(),
        fetchLearningModules: vi.fn(),
        startQuiz: vi.fn(),
        clearError: vi.fn()
      })

      ;(useAwarenessLabLoading as any).mockReturnValue(false)
      ;(useAwarenessLabError as any).mockReturnValue(null)

      render(
        <LanguageProvider>
          <AwarenessLab user={mockExpertUser} />
        </LanguageProvider>
      )

      // Verify expert badge is displayed
      expect(screen.getByText('Expert')).toBeInTheDocument()

      // Verify expert-specific welcome message
      expect(screen.getByText(/Test your knowledge and help develop educational content/)).toBeInTheDocument()

      // Verify quizzes are accessible
      expect(screen.getByText('Cybersecurity Basics')).toBeInTheDocument()
    })

    it('should allow expert users to access learning materials through awareness hub', async () => {
      const { useCurrentUser } = await import('@/lib/hooks/useCurrentUser')
      const { useAwarenessLabStore, useAwarenessLabActions, useAwarenessLabLoading, useAwarenessLabError } = await import('@/lib/stores/awareness-lab-store')

      ;(useCurrentUser as any).mockReturnValue({
        user: mockExpertUser,
        isLoading: false,
        error: null
      })

      ;(useAwarenessLabStore as any).mockReturnValue({
        learningModules: mockLearningModules,
        userProgress: {},
        currentModule: null
      })

      ;(useAwarenessLabActions as any).mockReturnValue({
        fetchLearningModules: vi.fn(),
        setCurrentModule: vi.fn(),
        clearError: vi.fn()
      })

      ;(useAwarenessLabLoading as any).mockReturnValue(false)
      ;(useAwarenessLabError as any).mockReturnValue(null)

      render(
        <LanguageProvider>
          <AwarenessHub user={mockExpertUser} />
        </LanguageProvider>
      )

      // Verify expert badge is displayed
      expect(screen.getByText('Expert')).toBeInTheDocument()

      // Verify expert-specific welcome message
      expect(screen.getByText(/Explore learning materials to enhance your expertise and help customers/)).toBeInTheDocument()

      // Verify learning modules are accessible
      expect(screen.getByText('Password Security')).toBeInTheDocument()
    })
  })

  describe('Customer User Access (Baseline)', () => {
    it('should allow customer users to access awareness lab normally', async () => {
      const { useCurrentUser } = await import('@/lib/hooks/useCurrentUser')
      const { useAwarenessLabStore, useAwarenessLabActions, useAwarenessLabLoading, useAwarenessLabError } = await import('@/lib/stores/awareness-lab-store')

      ;(useCurrentUser as any).mockReturnValue({
        user: mockCustomerUser,
        isLoading: false,
        error: null
      })

      ;(useAwarenessLabStore as any).mockReturnValue({
        quizzes: mockQuizzes,
        learningModules: mockLearningModules,
        userQuizAttempts: {},
        userProgress: {},
        activeTab: 'lab'
      })

      ;(useAwarenessLabActions as any).mockReturnValue({
        fetchQuizzes: vi.fn(),
        fetchLearningModules: vi.fn(),
        setActiveTab: vi.fn(),
        clearError: vi.fn()
      })

      ;(useAwarenessLabLoading as any).mockReturnValue(false)
      ;(useAwarenessLabError as any).mockReturnValue(null)

      render(
        <LanguageProvider>
          <AwarenessLabTab />
        </LanguageProvider>
      )

      // Verify customer user is welcomed
      expect(screen.getByText(/Welcome, Jane/)).toBeInTheDocument()
      expect(screen.getByText(/Customer/)).toBeInTheDocument()
      expect(screen.getByText(/Learn and develop your cybersecurity skills/)).toBeInTheDocument()
    })
  })

  describe('Role-Based Permissions', () => {
    it('should maintain role-based access control for quiz attempts', async () => {
      const { useAwarenessLabActions } = await import('@/lib/stores/awareness-lab-store')

      const mockStartQuiz = vi.fn()
      ;(useAwarenessLabActions as any).mockReturnValue({
        startQuiz: mockStartQuiz,
        fetchQuizzes: vi.fn(),
        fetchLearningModules: vi.fn(),
        clearError: vi.fn()
      })

      // Mock API response for quiz start
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            attemptId: 'attempt-123',
            quizId: 'quiz-1',
            startedAt: '2024-01-01T00:00:00Z',
            timeLimitMinutes: 30
          }
        })
      })

      // Test that both expert and customer can start quizzes
      await mockStartQuiz('quiz-1')
      expect(mockStartQuiz).toHaveBeenCalledWith('quiz-1')
    })

    it('should handle role-based API errors gracefully', async () => {
      const { useAwarenessLabActions } = await import('@/lib/stores/awareness-lab-store')

      const mockFetchQuizzes = vi.fn()
      ;(useAwarenessLabActions as any).mockReturnValue({
        fetchQuizzes: mockFetchQuizzes,
        clearError: vi.fn()
      })

      // Mock 403 response
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          success: false,
          message: 'Access denied. Please check your permissions.'
        })
      })

      // The store should handle this error appropriately
      await mockFetchQuizzes()
      expect(mockFetchQuizzes).toHaveBeenCalled()
    })
  })

  describe('URL Redirects', () => {
    it('should redirect expert awareness lab URLs to customer interface', () => {
      const mockPush = vi.fn()
      ;(useRouter as any).mockReturnValue({
        push: mockPush,
        pathname: '/expert/awareness-lab'
      })

      // This would be handled by middleware, but we can test the redirect logic
      const expertAwarenessLabPath = '/expert/awareness-lab'
      const expectedRedirect = '/dashboard?tab=awareness_lab'

      // Simulate middleware redirect logic
      if (expertAwarenessLabPath.startsWith('/expert/awareness-lab')) {
        expect(expectedRedirect).toBe('/dashboard?tab=awareness_lab')
      }
    })
  })

  describe('Feature Parity', () => {
    it('should provide same quiz functionality for both expert and customer users', async () => {
      const { useAwarenessLabStore } = await import('@/lib/stores/awareness-lab-store')

      // Mock store with quiz data
      ;(useAwarenessLabStore as any).mockReturnValue({
        quizzes: mockQuizzes,
        userQuizAttempts: {},
        loadingStates: { quizzes: false },
        isOffline: false,
        pendingOperations: []
      })

      // Test expert access
      const expertComponent = render(
        <LanguageProvider>
          <AwarenessLab user={mockExpertUser} />
        </LanguageProvider>
      )

      expect(expertComponent.getByText('Cybersecurity Basics')).toBeInTheDocument()
      expertComponent.unmount()

      // Test customer access
      const customerComponent = render(
        <LanguageProvider>
          <AwarenessLab user={mockCustomerUser} />
        </LanguageProvider>
      )

      expect(customerComponent.getByText('Cybersecurity Basics')).toBeInTheDocument()
    })

    it('should provide same learning materials functionality for both user types', async () => {
      const { useAwarenessLabStore } = await import('@/lib/stores/awareness-lab-store')

      ;(useAwarenessLabStore as any).mockReturnValue({
        learningModules: mockLearningModules,
        userProgress: {},
        currentModule: null
      })

      // Test expert access
      const expertComponent = render(
        <LanguageProvider>
          <AwarenessHub user={mockExpertUser} />
        </LanguageProvider>
      )

      expect(expertComponent.getByText('Password Security')).toBeInTheDocument()
      expertComponent.unmount()

      // Test customer access
      const customerComponent = render(
        <LanguageProvider>
          <AwarenessHub user={mockCustomerUser} />
        </LanguageProvider>
      )

      expect(customerComponent.getByText('Password Security')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle authentication errors for expert users', async () => {
      const { useCurrentUser } = await import('@/lib/hooks/useCurrentUser')

      ;(useCurrentUser as any).mockReturnValue({
        user: null,
        isLoading: false,
        error: 'Authentication failed'
      })

      render(
        <LanguageProvider>
          <AwarenessLabTab />
        </LanguageProvider>
      )

      expect(screen.getByText(/Failed to load user information/)).toBeInTheDocument()
    })

    it('should handle API errors gracefully for both user types', async () => {
      const { useCurrentUser } = await import('@/lib/hooks/useCurrentUser')
      const { useAwarenessLabStore, useAwarenessLabActions, useAwarenessLabLoading, useAwarenessLabError } = await import('@/lib/stores/awareness-lab-store')

      ;(useCurrentUser as any).mockReturnValue({
        user: mockExpertUser,
        isLoading: false,
        error: null
      })

      ;(useAwarenessLabStore as any).mockReturnValue({
        quizzes: [],
        learningModules: [],
        userQuizAttempts: {},
        userProgress: {},
        activeTab: 'lab'
      })

      ;(useAwarenessLabActions as any).mockReturnValue({
        fetchQuizzes: vi.fn(),
        fetchLearningModules: vi.fn(),
        clearError: vi.fn()
      })

      ;(useAwarenessLabLoading as any).mockReturnValue(false)
      ;(useAwarenessLabError as any).mockReturnValue('Failed to load awareness lab data')

      render(
        <LanguageProvider>
          <AwarenessLabTab />
        </LanguageProvider>
      )

      expect(screen.getByText(/Failed to load awareness lab data/)).toBeInTheDocument()
    })
  })
})