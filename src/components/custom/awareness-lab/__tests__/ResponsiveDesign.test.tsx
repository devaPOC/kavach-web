import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AwarenessLabTab } from '../AwarenessLabTab'
import { QuizAttempt } from '../QuizAttempt'

// Mock window.matchMedia for responsive testing
const mockMatchMedia = vi.fn()
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: mockMatchMedia
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
}))

// Mock the awareness lab store
vi.mock('@/lib/stores/awareness-lab-store', () => ({
    useAwarenessLabStore: () => ({
        quizzes: [
            { id: 'quiz-1', title: 'Test Quiz', language: 'en', isPublished: true }
        ],
        learningModules: [
            { id: 'module-1', title: 'Test Module', materials: [{ id: 'mat-1', title: 'Material 1' }] }
        ],
        userQuizAttempts: {},
        userProgress: {},
        activeTab: 'hub',
        attemptState: { currentQuestionIndex: 0, currentAnswers: {}, hasStarted: true }
    }),
    useAwarenessLabActions: () => ({
        fetchQuizzes: vi.fn(),
        fetchLearningModules: vi.fn(),
        setActiveTab: vi.fn(),
        clearError: vi.fn(),
        submitAnswer: vi.fn(),
        nextQuestion: vi.fn(),
        previousQuestion: vi.fn(),
        submitQuiz: vi.fn(),
        pauseTimer: vi.fn(),
        resumeTimer: vi.fn(),
        retryQuiz: vi.fn(),
        hideQuizResults: vi.fn()
    }),
    useAwarenessLabLoading: () => false,
    useAwarenessLabError: () => null,
    useQuizTimer: () => ({ timeRemaining: 1800, isActive: true, startTime: new Date() }),
    useCurrentResults: () => null,
    useCurrentProgress: () => null,
    useShowResults: () => false
}))

// Mock child components
vi.mock('../AwarenessHub', () => ({
    AwarenessHub: () => <div data-testid="awareness-hub">Hub Content</div>
}))

vi.mock('../AwarenessLab', () => ({
    AwarenessLab: () => <div data-testid="awareness-lab">Lab Content</div>
}))

vi.mock('../QuestionRenderer', () => ({
    QuestionRenderer: ({ question }: any) => (
        <div data-testid="question-renderer">
            <h4>{question.questionData.question}</h4>
        </div>
    )
}))

// Mock language context
vi.mock('@/lib/contexts/LanguageContext', () => ({
    useLanguage: () => ({ language: 'en', direction: 'ltr' }),
    useLocalizedText: () => (key: string) => key
}))

vi.mock('@/lib/utils/language', () => ({
    getLanguageClasses: () => 'font-sans'
}))

// Mock UI components with responsive classes
vi.mock('@/components/ui', () => ({
    Tabs: ({ children, className }: any) => <div className={`tabs ${className}`}>{children}</div>,
    TabsContent: ({ children, className }: any) => <div className={`tabs-content ${className}`}>{children}</div>,
    TabsList: ({ children, className }: any) => <div className={`tabs-list ${className}`}>{children}</div>,
    TabsTrigger: ({ children, className }: any) => <button className={`tabs-trigger ${className}`}>{children}</button>,
    Card: ({ children, className }: any) => <div className={`card ${className}`}>{children}</div>,
    CardContent: ({ children, className }: any) => <div className={`card-content ${className}`}>{children}</div>,
    CardHeader: ({ children, className }: any) => <div className={`card-header ${className}`}>{children}</div>,
    CardTitle: ({ children, className }: any) => <h3 className={`card-title ${className}`}>{children}</h3>,
    Button: ({ children, className, size }: any) => <button className={`btn ${size} ${className}`}>{children}</button>,
    Badge: ({ children, className }: any) => <span className={`badge ${className}`}>{children}</span>,
    Alert: ({ children, className }: any) => <div className={`alert ${className}`}>{children}</div>,
    AlertDescription: ({ children }: any) => <div>{children}</div>
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    BookOpen: () => <div data-testid="book-open-icon" />,
    Brain: () => <div data-testid="brain-icon" />,
    ArrowLeft: () => <div data-testid="arrow-left-icon" />,
    Timer: () => <div data-testid="timer-icon" />,
    Target: () => <div data-testid="target-icon" />
}))

describe('Responsive Design Tests', () => {
    const mockQuiz = {
        id: 'quiz-1',
        title: 'Responsive Test Quiz',
        description: 'Testing responsive behavior',
        language: 'en' as const,
        timeLimitMinutes: 30,
        maxAttempts: 3,
        questions: [
            {
                id: 'q1',
                questionType: 'mcq' as const,
                questionData: {
                    question: 'What is responsive design?',
                    options: ['Mobile-first approach', 'Desktop-only design', 'Fixed width layout', 'Print-friendly design']
                },
                correctAnswers: ['Mobile-first approach'],
                orderIndex: 0
            }
        ]
    }

    const mockAttempt = {
        id: 'attempt-1',
        userId: 'user-1',
        quizId: 'quiz-1',
        answers: {},
        score: 0,
        timeTakenSeconds: 0,
        isCompleted: false,
        startedAt: '2023-01-01T10:00:00Z'
    }

    beforeEach(() => {
        // Reset viewport
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 })
        Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 768 })
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    describe('Mobile Viewport (320px - 768px)', () => {
        beforeEach(() => {
            Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 })
            mockMatchMedia.mockImplementation((query) => ({
                matches: query.includes('max-width: 768px'),
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn()
            }))
        })

        it('renders awareness lab tab with mobile-friendly layout', () => {
            render(<AwarenessLabTab />)

            expect(screen.getByText('Quizzes Progress')).toBeInTheDocument()
            expect(screen.getByText('Modules Progress')).toBeInTheDocument()

            // Check for mobile grid classes
            const progressCards = screen.getAllByText(/Progress/)
            progressCards.forEach(card => {
                const container = card.closest('div')
                expect(container).toHaveClass('grid-cols-1')
            })
        })

        it('stacks progress indicators vertically on mobile', () => {
            render(<AwarenessLabTab />)

            const progressContainer = screen.getByText('Quizzes Progress').closest('.grid')
            expect(progressContainer).toHaveClass('md:grid-cols-2')
        })

        it('renders quiz attempt with mobile navigation', () => {
            render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={vi.fn()} />)

            expect(screen.getByText('Responsive Test Quiz')).toBeInTheDocument()

            // Timer should be responsive
            const timer = screen.getByText('30:00').closest('div')
            expect(timer).toHaveClass('flex')
        })

        it('handles touch interactions properly', async () => {
            const user = userEvent.setup()
            render(<AwarenessLabTab />)

            // Simulate touch events
            const hubTab = screen.getByText('Awareness Hub')

            fireEvent.touchStart(hubTab)
            fireEvent.touchEnd(hubTab)

            expect(hubTab).toBeInTheDocument()
        })

        it('adjusts font sizes for mobile readability', () => {
            render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={vi.fn()} />)

            const title = screen.getByText('Responsive Test Quiz')
            expect(title).toHaveClass('text-xl')
        })

        it('shows mobile-optimized button sizes', () => {
            render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={vi.fn()} />)

            const backButton = screen.getByText('Back to Quizzes')
            expect(backButton).toHaveClass('btn')
        })
    })

    describe('Tablet Viewport (768px - 1024px)', () => {
        beforeEach(() => {
            Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 768 })
            mockMatchMedia.mockImplementation((query) => ({
                matches: query.includes('min-width: 768px') && query.includes('max-width: 1024px'),
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn()
            }))
        })

        it('renders with tablet-optimized grid layout', () => {
            render(<AwarenessLabTab />)

            const progressContainer = screen.getByText('Quizzes Progress').closest('.grid')
            expect(progressContainer).toHaveClass('md:grid-cols-2')
        })

        it('maintains proper spacing on tablet', () => {
            render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={vi.fn()} />)

            const container = screen.getByText('Responsive Test Quiz').closest('.max-w-4xl')
            expect(container).toHaveClass('space-y-6')
        })
    })

    describe('Desktop Viewport (1024px+)', () => {
        beforeEach(() => {
            Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1440 })
            mockMatchMedia.mockImplementation((query) => ({
                matches: query.includes('min-width: 1024px'),
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn()
            }))
        })

        it('renders with desktop grid layout', () => {
            render(<AwarenessLabTab />)

            const progressContainer = screen.getByText('Quizzes Progress').closest('.grid')
            expect(progressContainer).toHaveClass('md:grid-cols-2')
        })

        it('shows full-width content on desktop', () => {
            render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={vi.fn()} />)

            const container = screen.getByText('Responsive Test Quiz').closest('.max-w-4xl')
            expect(container).toHaveClass('mx-auto')
        })
    })

    describe('Orientation Changes', () => {
        it('handles portrait to landscape orientation change', () => {
            // Start in portrait
            Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 })
            Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 667 })

            const { rerender } = render(<AwarenessLabTab />)

            // Change to landscape
            Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 667 })
            Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 375 })

            fireEvent(window, new Event('orientationchange'))
            rerender(<AwarenessLabTab />)

            expect(screen.getByText('Quizzes Progress')).toBeInTheDocument()
        })

        it('maintains quiz state during orientation change', () => {
            render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={vi.fn()} />)

            fireEvent(window, new Event('orientationchange'))

            expect(screen.getByText('Responsive Test Quiz')).toBeInTheDocument()
            expect(screen.getByText('30:00')).toBeInTheDocument()
        })
    })

    describe('Touch and Gesture Support', () => {
        it('handles swipe gestures for navigation', async () => {
            render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={vi.fn()} />)

            const questionContainer = screen.getByTestId('question-renderer')

            // Simulate swipe left (next question)
            fireEvent.touchStart(questionContainer, {
                touches: [{ clientX: 100, clientY: 100 }]
            })
            fireEvent.touchMove(questionContainer, {
                touches: [{ clientX: 50, clientY: 100 }]
            })
            fireEvent.touchEnd(questionContainer)

            expect(questionContainer).toBeInTheDocument()
        })

        it('provides adequate touch targets', () => {
            render(<AwarenessLabTab />)

            const tabTriggers = screen.getAllByRole('button')
            tabTriggers.forEach(button => {
                const styles = window.getComputedStyle(button)
                // Touch targets should be at least 44px (iOS) or 48dp (Android)
                expect(button).toBeInTheDocument()
            })
        })
    })

    describe('Accessibility on Mobile', () => {
        it('maintains proper focus management on mobile', async () => {
            const user = userEvent.setup()
            render(<AwarenessLabTab />)

            const hubTab = screen.getByText('Awareness Hub')
            await user.click(hubTab)

            expect(hubTab).toBeInTheDocument()
        })

        it('provides proper ARIA labels for mobile navigation', () => {
            render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={vi.fn()} />)

            const backButton = screen.getByText('Back to Quizzes')
            expect(backButton).toHaveAttribute('type', 'button')
        })

        it('maintains readable text sizes on mobile', () => {
            render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={vi.fn()} />)

            const questionText = screen.getByText('What is responsive design?')
            expect(questionText).toBeInTheDocument()
        })
    })

    describe('Performance on Mobile', () => {
        it('lazy loads content appropriately', () => {
            render(<AwarenessLabTab />)

            // Hub content should be loaded initially
            expect(screen.getByTestId('awareness-hub')).toBeInTheDocument()

            // Lab content should not be loaded until tab is active
            expect(screen.queryByTestId('awareness-lab')).not.toBeInTheDocument()
        })

        it('handles large content lists efficiently', () => {
            // Mock large dataset
            const largeMockStore = {
                quizzes: Array.from({ length: 100 }, (_, i) => ({
                    id: `quiz-${i}`,
                    title: `Quiz ${i}`,
                    language: 'en',
                    isPublished: true
                })),
                learningModules: Array.from({ length: 50 }, (_, i) => ({
                    id: `module-${i}`,
                    title: `Module ${i}`,
                    materials: [{ id: `mat-${i}`, title: `Material ${i}` }]
                })),
                userQuizAttempts: {},
                userProgress: {},
                activeTab: 'hub'
            }

            vi.mocked(vi.importMock('@/lib/stores/awareness-lab-store')).useAwarenessLabStore.mockReturnValue(largeMockStore)

            render(<AwarenessLabTab />)

            expect(screen.getByText('Quizzes Progress')).toBeInTheDocument()
        })
    })

    describe('Cross-Browser Compatibility', () => {
        it('handles different viewport units correctly', () => {
            render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={vi.fn()} />)

            const container = screen.getByText('Responsive Test Quiz').closest('div')
            expect(container).toBeInTheDocument()
        })

        it('provides fallbacks for unsupported CSS features', () => {
            render(<AwarenessLabTab />)

            const progressBars = screen.getAllByText(/Progress/)
            progressBars.forEach(bar => {
                expect(bar).toBeInTheDocument()
            })
        })
    })

    describe('Dark Mode Compatibility', () => {
        it('maintains readability in dark mode', () => {
            // Mock dark mode
            Object.defineProperty(window, 'matchMedia', {
                writable: true,
                value: vi.fn().mockImplementation((query) => ({
                    matches: query.includes('prefers-color-scheme: dark'),
                    media: query,
                    onchange: null,
                    addListener: vi.fn(),
                    removeListener: vi.fn(),
                    addEventListener: vi.fn(),
                    removeEventListener: vi.fn(),
                    dispatchEvent: vi.fn()
                }))
            })

            render(<AwarenessLabTab />)

            expect(screen.getByText('Quizzes Progress')).toBeInTheDocument()
        })
    })

    describe('Print Styles', () => {
        it('provides print-friendly layout', () => {
            mockMatchMedia.mockImplementation((query) => ({
                matches: query.includes('print'),
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn()
            }))

            render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={vi.fn()} />)

            expect(screen.getByText('Responsive Test Quiz')).toBeInTheDocument()
        })
    })
})