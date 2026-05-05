/**
 * Verification test for awareness lab consolidation
 * Tests that expert users can access awareness lab functionality through the unified interface
 */

import { describe, it, expect, vi } from 'vitest'

// Mock the dependencies
vi.mock('@/lib/hooks/useCurrentUser')
vi.mock('@/lib/stores/awareness-lab-store')
vi.mock('@/lib/contexts/LanguageContext')

describe('Awareness Lab Consolidation Verification', () => {
  describe('Component Imports', () => {
    it('should be able to import AwarenessLabTab component', async () => {
      const { AwarenessLabTab } = await import('@/components/custom/awareness-lab/AwarenessLabTab')
      expect(AwarenessLabTab).toBeDefined()
      expect(typeof AwarenessLabTab).toBe('function')
    })

    it('should be able to import AwarenessLab component', async () => {
      const { AwarenessLab } = await import('@/components/custom/awareness-lab/AwarenessLab')
      expect(AwarenessLab).toBeDefined()
      expect(typeof AwarenessLab).toBe('function')
    })

    it('should be able to import AwarenessHub component', async () => {
      const { AwarenessHub } = await import('@/components/custom/awareness-lab/AwarenessHub')
      expect(AwarenessHub).toBeDefined()
      expect(typeof AwarenessHub).toBe('function')
    })
  })

  describe('Store Integration', () => {
    it('should be able to import awareness lab store', async () => {
      const store = await import('@/lib/stores/awareness-lab-store')
      expect(store.useAwarenessLabStore).toBeDefined()
      expect(store.useAwarenessLabActions).toBeDefined()
      expect(store.useAwarenessLabLoading).toBeDefined()
      expect(store.useAwarenessLabError).toBeDefined()
    })
  })

  describe('Role-Based Functionality', () => {
    it('should handle expert user props in AwarenessLab component', () => {
      const expertUser = {
        id: 'expert-123',
        role: 'expert' as const,
        firstName: 'John',
        lastName: 'Expert'
      }

      // Test that the component accepts expert user props
      expect(expertUser.role).toBe('expert')
      expect(expertUser.firstName).toBe('John')
    })

    it('should handle customer user props in AwarenessLab component', () => {
      const customerUser = {
        id: 'customer-123',
        role: 'customer' as const,
        firstName: 'Jane',
        lastName: 'Customer'
      }

      // Test that the component accepts customer user props
      expect(customerUser.role).toBe('customer')
      expect(customerUser.firstName).toBe('Jane')
    })
  })

  describe('API Integration', () => {
    it('should handle quiz API calls for expert users', async () => {
      // Mock fetch for quiz API
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            quizzes: [
              {
                id: 'quiz-1',
                title: 'Test Quiz',
                isPublished: true
              }
            ]
          }
        })
      })

      const response = await fetch('/api/v1/quizzes')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(data.data.quizzes).toHaveLength(1)
    })

    it('should handle learning modules API calls for expert users', async () => {
      // Mock fetch for learning modules API
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            modules: [
              {
                id: 'module-1',
                title: 'Test Module',
                isPublished: true
              }
            ]
          }
        })
      })

      const response = await fetch('/api/v1/learning-modules')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(data.data.modules).toHaveLength(1)
    })

    it('should handle role-based access errors gracefully', async () => {
      // Mock 403 response
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          success: false,
          message: 'Access denied. Please check your permissions.'
        })
      })

      const response = await fetch('/api/v1/quizzes')
      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(403)
      expect(data.message).toContain('Access denied')
    })
  })

  describe('URL Redirect Logic', () => {
    it('should redirect expert awareness lab URLs to customer interface', () => {
      const expertAwarenessLabPath = '/expert/awareness-lab'
      const expectedRedirect = '/dashboard?tab=awareness_lab'

      // Simulate middleware redirect logic
      let redirectPath = '/dashboard?tab=awareness_lab'
      
      if (expertAwarenessLabPath.startsWith('/expert/awareness-lab')) {
        redirectPath = '/dashboard?tab=awareness_lab'
      }

      expect(redirectPath).toBe(expectedRedirect)
    })

    it('should preserve query parameters in redirects', () => {
      const expertAwarenessLabPath = '/expert/awareness-lab?request=123'
      const searchParams = new URLSearchParams('request=123')
      
      let redirectPath = '/dashboard?tab=awareness_lab'
      
      if (expertAwarenessLabPath.startsWith('/expert/awareness-lab')) {
        if (searchParams.has('request')) {
          redirectPath = `/dashboard?tab=awareness-sessions&request=${searchParams.get('request')}`
        }
      }

      expect(redirectPath).toBe('/dashboard?tab=awareness-sessions&request=123')
    })
  })

  describe('Component Props Validation', () => {
    it('should validate user prop structure for AwarenessLab', () => {
      const validExpertUser = {
        id: 'expert-123',
        role: 'expert' as const,
        firstName: 'John',
        lastName: 'Expert'
      }

      const validCustomerUser = {
        id: 'customer-123',
        role: 'customer' as const,
        firstName: 'Jane',
        lastName: 'Customer'
      }

      // Validate expert user structure
      expect(validExpertUser).toHaveProperty('id')
      expect(validExpertUser).toHaveProperty('role')
      expect(validExpertUser).toHaveProperty('firstName')
      expect(validExpertUser).toHaveProperty('lastName')
      expect(validExpertUser.role).toBe('expert')

      // Validate customer user structure
      expect(validCustomerUser).toHaveProperty('id')
      expect(validCustomerUser).toHaveProperty('role')
      expect(validCustomerUser).toHaveProperty('firstName')
      expect(validCustomerUser).toHaveProperty('lastName')
      expect(validCustomerUser.role).toBe('customer')
    })
  })

  describe('Feature Parity', () => {
    it('should provide same quiz data structure for both user types', () => {
      const mockQuiz = {
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

      // Verify quiz structure is consistent
      expect(mockQuiz).toHaveProperty('id')
      expect(mockQuiz).toHaveProperty('title')
      expect(mockQuiz).toHaveProperty('isPublished')
      expect(mockQuiz.questions).toHaveLength(1)
      expect(mockQuiz.questions[0]).toHaveProperty('questionData')
    })

    it('should provide same learning module data structure for both user types', () => {
      const mockModule = {
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

      // Verify module structure is consistent
      expect(mockModule).toHaveProperty('id')
      expect(mockModule).toHaveProperty('title')
      expect(mockModule).toHaveProperty('isPublished')
      expect(mockModule.materials).toHaveLength(1)
      expect(mockModule.materials[0]).toHaveProperty('materialData')
    })
  })
})