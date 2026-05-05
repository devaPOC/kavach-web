import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QuizResults } from '../QuizResults'

// Mock the store
vi.mock('@/lib/stores/awareness-lab-store', () => ({
  useAwarenessLabStore: () => ({
    userQuizAttempts: {
      'quiz-1': [
        {
          id: 'attempt-1',
          score: 85,
          timeTakenSeconds: 300,
          isCompleted: true,
          startedAt: '2023-01-01T10:00:00Z',
          completedAt: '2023-01-01T10:05:00Z'
        },
        {
          id: 'attempt-2',
          score: 90,
          timeTakenSeconds: 250,
          isCompleted: true,
          startedAt: '2023-01-02T10:00:00Z',
          completedAt: '2023-01-02T10:04:10Z'
        }
      ]
    }
  }),
  useAwarenessLabActions: () => ({
    fetchUserAttempts: vi.fn()
  })
}))

// Mock UI components
vi.mock('@/components/ui', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>,
  Badge: ({ children, variant, className }: any) => <span className={`badge ${variant} ${className}`}>{children}</span>,
  Button: ({ children, onClick, className, variant }: any) => (
    <button onClick={onClick} className={`btn ${variant} ${className}`}>{children}</button>
  ),
  Alert: ({ children, variant }: any) => <div className={`alert ${variant}`}>{children}</div>,
  AlertDescription: ({ children }: any) => <div>{children}</div>
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Trophy: () => <div data-testid="trophy-icon" />,
  Award: () => <div data-testid="award-icon" />,
  Target: () => <div data-testid="target-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  Brain: () => <div data-testid="brain-icon" />,
  Timer: () => <div data-testid="timer-icon" />,
  RotateCcw: () => <div data-testid="rotate-ccw-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Star: () => <div data-testid="star-icon" />,
  Info: () => <div data-testid="info-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronUp: () => <div data-testid="chevron-up-icon" />
}))

describe('QuizResults', () => {
  const mockQuiz = {
    id: 'quiz-1',
    title: 'Cybersecurity Basics',
    description: 'Test your knowledge of cybersecurity fundamentals',
    language: 'en' as const,
    timeLimitMinutes: 30,
    maxAttempts: 3,
    questions: [
      {
        id: 'q1',
        questionType: 'mcq' as const,
        questionData: {
          question: 'What is phishing?',
          options: ['A type of fish', 'A cyber attack', 'A programming language', 'A database'],
          explanation: 'Phishing is a type of cyber attack where attackers try to steal sensitive information.'
        },
        correctAnswers: ['A cyber attack'],
        orderIndex: 0
      },
      {
        id: 'q2',
        questionType: 'true_false' as const,
        questionData: {
          question: 'Strong passwords should contain only letters.',
          explanation: 'Strong passwords should contain a mix of letters, numbers, and special characters.'
        },
        correctAnswers: ['false'],
        orderIndex: 1
      }
    ]
  }

  const mockAttempt = {
    id: 'attempt-1',
    userId: 'user-1',
    quizId: 'quiz-1',
    answers: {
      'q1': ['A cyber attack'],
      'q2': ['false']
    },
    score: 85,
    timeTakenSeconds: 300,
    isCompleted: true,
    startedAt: '2023-01-01T10:00:00Z',
    completedAt: '2023-01-01T10:05:00Z'
  }

  const mockResults = {
    attemptId: 'attempt-1',
    score: 85,
    totalQuestions: 2,
    correctAnswers: 2,
    timeTakenSeconds: 300,
    isCompleted: true,
    results: [
      {
        questionId: 'q1',
        userAnswers: ['A cyber attack'],
        correctAnswers: ['A cyber attack'],
        isCorrect: true,
        explanation: 'Phishing is a type of cyber attack where attackers try to steal sensitive information.'
      },
      {
        questionId: 'q2',
        userAnswers: ['false'],
        correctAnswers: ['false'],
        isCorrect: true,
        explanation: 'Strong passwords should contain a mix of letters, numbers, and special characters.'
      }
    ]
  }

  const mockProgress = {
    quizId: 'quiz-1',
    attemptCount: 2,
    maxAttempts: 3,
    canAttempt: true,
    bestScore: 90,
    hasCompletedAttempts: true,
    lastAttemptDate: new Date('2023-01-02T10:04:10Z')
  }

  const mockProps = {
    quiz: mockQuiz,
    attempt: mockAttempt,
    results: mockResults,
    progress: mockProgress,
    onRetry: vi.fn(),
    onBackToQuizzes: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders quiz results with correct score', () => {
    render(<QuizResults {...mockProps} />)
    
    expect(screen.getByText('85%')).toBeInTheDocument()
    expect(screen.getByText('Quiz Results')).toBeInTheDocument()
    expect(screen.getByText('Cybersecurity Basics')).toBeInTheDocument()
  })

  it('displays performance insights correctly', () => {
    render(<QuizResults {...mockProps} />)
    
    expect(screen.getByText('Performance Insights')).toBeInTheDocument()
    expect(screen.getByText('Your Score')).toBeInTheDocument()
    expect(screen.getByText('Best Score')).toBeInTheDocument()
    expect(screen.getByText('90%')).toBeInTheDocument() // Best score
    expect(screen.getByText('Attempts')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument() // Attempt count
  })

  it('shows retry button when attempts are available', () => {
    render(<QuizResults {...mockProps} />)
    
    const retryButton = screen.getByText('Retake Quiz')
    expect(retryButton).toBeInTheDocument()
    
    fireEvent.click(retryButton)
    expect(mockProps.onRetry).toHaveBeenCalledTimes(1)
  })

  it('shows maximum attempts reached when no attempts left', () => {
    const propsWithNoAttempts = {
      ...mockProps,
      progress: {
        ...mockProgress,
        canAttempt: false
      }
    }
    
    render(<QuizResults {...propsWithNoAttempts} />)
    
    expect(screen.getByText('Maximum attempts reached')).toBeInTheDocument()
    expect(screen.queryByText('Retake Quiz')).not.toBeInTheDocument()
  })

  it('calls onBackToQuizzes when back button is clicked', () => {
    render(<QuizResults {...mockProps} />)
    
    const backButtons = screen.getAllByText('Back to Quizzes')
    fireEvent.click(backButtons[0])
    
    expect(mockProps.onBackToQuizzes).toHaveBeenCalledTimes(1)
  })

  it('displays correct score message for excellent performance', () => {
    const excellentProps = {
      ...mockProps,
      results: {
        ...mockResults,
        score: 95
      }
    }
    
    render(<QuizResults {...excellentProps} />)
    
    expect(screen.getByText('Excellent! Outstanding performance!')).toBeInTheDocument()
    expect(screen.getByTestId('trophy-icon')).toBeInTheDocument()
  })

  it('displays correct score message for passing performance', () => {
    const passingProps = {
      ...mockProps,
      results: {
        ...mockResults,
        score: 75
      }
    }
    
    render(<QuizResults {...passingProps} />)
    
    expect(screen.getByText('Great job! You passed the quiz!')).toBeInTheDocument()
  })

  it('displays correct score message for needs improvement', () => {
    const needsImprovementProps = {
      ...mockProps,
      results: {
        ...mockResults,
        score: 45
      }
    }
    
    render(<QuizResults {...needsImprovementProps} />)
    
    expect(screen.getByText('Keep learning! Try again to improve.')).toBeInTheDocument()
  })

  it('shows question review section', () => {
    render(<QuizResults {...mockProps} />)
    
    expect(screen.getByText('Question Review')).toBeInTheDocument()
    expect(screen.getByText('Show All Questions')).toBeInTheDocument()
  })

  it('toggles between showing all questions and incorrect only', () => {
    render(<QuizResults {...mockProps} />)
    
    const toggleButton = screen.getByText('Show All Questions')
    fireEvent.click(toggleButton)
    
    expect(screen.getByText('Show Incorrect Only')).toBeInTheDocument()
  })

  it('displays attempt history when multiple attempts exist', () => {
    render(<QuizResults {...mockProps} />)
    
    expect(screen.getByText('Attempt History')).toBeInTheDocument()
    expect(screen.getByText('Show')).toBeInTheDocument()
  })

  it('formats time correctly', () => {
    render(<QuizResults {...mockProps} />)
    
    expect(screen.getByText('Completed in 5m 0s')).toBeInTheDocument()
  })

  it('handles Arabic language correctly', () => {
    const arabicProps = {
      ...mockProps,
      quiz: {
        ...mockQuiz,
        language: 'ar' as const
      }
    }
    
    render(<QuizResults {...arabicProps} />)
    
    // Check that RTL direction is applied
    const container = screen.getByText('Quiz Results').closest('div')
    expect(container).toHaveAttribute('dir', 'rtl')
  })
})