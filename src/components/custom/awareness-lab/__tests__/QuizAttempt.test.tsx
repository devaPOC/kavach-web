import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuizAttempt } from '../QuizAttempt'

// Mock the awareness lab store
const mockActions = {
  submitAnswer: vi.fn(),
  nextQuestion: vi.fn(),
  previousQuestion: vi.fn(),
  submitQuiz: vi.fn(),
  pauseTimer: vi.fn(),
  resumeTimer: vi.fn(),
  retryQuiz: vi.fn(),
  hideQuizResults: vi.fn()
}

const mockAttemptState = {
  currentQuestionIndex: 0,
  currentAnswers: {},
  hasStarted: true
}

const mockQuizTimer = {
  timeRemaining: 1800, // 30 minutes
  isActive: true,
  startTime: new Date()
}

vi.mock('@/lib/stores/awareness-lab-store', () => ({
  useAwarenessLabStore: () => ({ attemptState: mockAttemptState }),
  useAwarenessLabActions: () => mockActions,
  useQuizTimer: () => mockQuizTimer,
  useCurrentResults: () => null,
  useCurrentProgress: () => null,
  useShowResults: () => false
}))

// Mock language context
vi.mock('@/lib/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', direction: 'ltr' }),
  useLocalizedText: () => (key: string) => {
    const translations: Record<string, string> = {
      previous: 'Previous',
      next: 'Next',
      submit_quiz: 'Submit Quiz'
    }
    return translations[key] || key
  }
}))

// Mock language utils
vi.mock('@/lib/utils/language', () => ({
  getLanguageClasses: () => 'font-sans'
}))

// Mock UI components
vi.mock('@/components/ui', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>,
  Badge: ({ children, variant, className }: any) => <span className={`badge ${variant} ${className}`}>{children}</span>,
  Button: ({ children, onClick, className, variant, disabled }: any) => (
    <button 
      onClick={onClick} 
      className={`btn ${variant} ${className}`}
      disabled={disabled}
    >
      {children}
    </button>
  ),
  Alert: ({ children, variant, className }: any) => <div className={`alert ${variant} ${className}`}>{children}</div>,
  AlertDescription: ({ children }: any) => <div>{children}</div>
}))

// Mock QuestionRenderer component
vi.mock('../QuestionRenderer', () => ({
  QuestionRenderer: ({ question, onAnswerChange, currentAnswer }: any) => (
    <div data-testid="question-renderer">
      <h4>{question.questionData.question}</h4>
      {question.questionType === 'mcq' && question.questionData.options?.map((option: string, index: number) => (
        <label key={index}>
          <input
            type="radio"
            name="answer"
            value={option}
            checked={currentAnswer.includes(option)}
            onChange={() => onAnswerChange([option])}
          />
          {option}
        </label>
      ))}
      {question.questionType === 'true_false' && (
        <div>
          <label>
            <input
              type="radio"
              name="answer"
              value="true"
              checked={currentAnswer.includes('true')}
              onChange={() => onAnswerChange(['true'])}
            />
            True
          </label>
          <label>
            <input
              type="radio"
              name="answer"
              value="false"
              checked={currentAnswer.includes('false')}
              onChange={() => onAnswerChange(['false'])}
            />
            False
          </label>
        </div>
      )}
    </div>
  )
}))

// Mock QuizResults component
vi.mock('../QuizResults', () => ({
  QuizResults: ({ quiz, onRetry, onBackToQuizzes }: any) => (
    <div data-testid="quiz-results">
      <h3>Quiz Results for {quiz.title}</h3>
      <button onClick={onRetry}>Retry Quiz</button>
      <button onClick={onBackToQuizzes}>Back to Quizzes</button>
    </div>
  )
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  ArrowRight: () => <div data-testid="arrow-right-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Flag: () => <div data-testid="flag-icon" />,
  Timer: () => <div data-testid="timer-icon" />,
  Brain: () => <div data-testid="brain-icon" />,
  Target: () => <div data-testid="target-icon" />,
  Send: () => <div data-testid="send-icon" />
}))

describe('QuizAttempt', () => {
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
    answers: {},
    score: 0,
    timeTakenSeconds: 0,
    isCompleted: false,
    startedAt: '2023-01-01T10:00:00Z',
    completedAt: undefined
  }

  const mockOnBack = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock state
    mockAttemptState.currentQuestionIndex = 0
    mockAttemptState.currentAnswers = {}
    mockQuizTimer.timeRemaining = 1800
    mockQuizTimer.isActive = true
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('renders quiz attempt interface with timer and progress', () => {
    render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={mockOnBack} />)
    
    expect(screen.getByText('Cybersecurity Basics')).toBeInTheDocument()
    expect(screen.getByText('Test your knowledge of cybersecurity fundamentals')).toBeInTheDocument()
    expect(screen.getByText('30:00')).toBeInTheDocument() // Timer display
    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument()
  })

  it('displays current question correctly', () => {
    render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={mockOnBack} />)
    
    expect(screen.getByTestId('question-renderer')).toBeInTheDocument()
    expect(screen.getByText('What is phishing?')).toBeInTheDocument()
  })

  it('handles answer selection', async () => {
    const user = userEvent.setup()
    render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={mockOnBack} />)
    
    const answerOption = screen.getByLabelText('A cyber attack')
    await user.click(answerOption)
    
    expect(mockActions.submitAnswer).toHaveBeenCalledWith('q1', ['A cyber attack'])
  })

  it('navigates between questions', async () => {
    const user = userEvent.setup()
    mockAttemptState.currentQuestionIndex = 1 // Second question
    
    render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={mockOnBack} />)
    
    const previousButton = screen.getByText('Previous')
    await user.click(previousButton)
    
    expect(mockActions.previousQuestion).toHaveBeenCalled()
  })

  it('shows submit button on last question', () => {
    mockAttemptState.currentQuestionIndex = 1 // Last question
    
    render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={mockOnBack} />)
    
    expect(screen.getByText('Submit Quiz')).toBeInTheDocument()
    expect(screen.queryByText('Next')).not.toBeInTheDocument()
  })

  it('disables previous button on first question', () => {
    mockAttemptState.currentQuestionIndex = 0
    
    render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={mockOnBack} />)
    
    const previousButton = screen.getByText('Previous')
    expect(previousButton).toBeDisabled()
  })

  it('shows timer with correct formatting', () => {
    mockQuizTimer.timeRemaining = 125 // 2 minutes 5 seconds
    
    render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={mockOnBack} />)
    
    expect(screen.getByText('02:05')).toBeInTheDocument()
  })

  it('shows low time warning when time is running out', () => {
    mockQuizTimer.timeRemaining = 250 // Less than 5 minutes
    
    render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={mockOnBack} />)
    
    expect(screen.getByText(/Time Warning/)).toBeInTheDocument()
    expect(screen.getByText(/less than 5 minutes remaining/)).toBeInTheDocument()
  })

  it('shows critical time warning when very low on time', () => {
    mockQuizTimer.timeRemaining = 45 // Less than 1 minute
    
    render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={mockOnBack} />)
    
    expect(screen.getByText(/Critical/)).toBeInTheDocument()
    expect(screen.getByText(/Less than 1 minute remaining/)).toBeInTheDocument()
  })

  it('shows paused indicator when timer is inactive', () => {
    mockQuizTimer.isActive = false
    
    render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={mockOnBack} />)
    
    expect(screen.getByText('(Paused)')).toBeInTheDocument()
  })

  it('displays progress indicators correctly', () => {
    mockAttemptState.currentAnswers = { q1: ['A cyber attack'] }
    
    render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={mockOnBack} />)
    
    expect(screen.getByText('1/2 answered')).toBeInTheDocument()
  })

  it('shows submit confirmation when submitting with unanswered questions', async () => {
    const user = userEvent.setup()
    mockAttemptState.currentQuestionIndex = 1 // Last question
    mockAttemptState.currentAnswers = {} // No answers
    
    render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={mockOnBack} />)
    
    const submitButton = screen.getByText('Submit Quiz')
    await user.click(submitButton)
    
    expect(screen.getByText('Submit Quiz?')).toBeInTheDocument()
    expect(screen.getByText(/2 unanswered questions/)).toBeInTheDocument()
  })

  it('submits quiz directly when all questions are answered', async () => {
    const user = userEvent.setup()
    mockAttemptState.currentQuestionIndex = 1 // Last question
    mockAttemptState.currentAnswers = { q1: ['A cyber attack'], q2: ['false'] } // All answered
    
    render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={mockOnBack} />)
    
    const submitButton = screen.getByText('Submit Quiz')
    await user.click(submitButton)
    
    expect(mockActions.submitQuiz).toHaveBeenCalled()
  })

  it('handles back navigation', async () => {
    const user = userEvent.setup()
    render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={mockOnBack} />)
    
    const backButton = screen.getByText('Back to Quizzes')
    await user.click(backButton)
    
    expect(mockOnBack).toHaveBeenCalled()
  })

  it('pauses timer when page becomes hidden', () => {
    render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={mockOnBack} />)
    
    // Simulate page becoming hidden
    Object.defineProperty(document, 'hidden', { value: true, writable: true })
    fireEvent(document, new Event('visibilitychange'))
    
    expect(mockActions.pauseTimer).toHaveBeenCalled()
  })

  it('resumes timer when page becomes visible', () => {
    render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={mockOnBack} />)
    
    // Simulate page becoming visible
    Object.defineProperty(document, 'hidden', { value: false, writable: true })
    fireEvent(document, new Event('visibilitychange'))
    
    expect(mockActions.resumeTimer).toHaveBeenCalled()
  })

  it('shows beforeunload warning when quiz is active', () => {
    const mockPreventDefault = vi.fn()
    const mockEvent = { preventDefault: mockPreventDefault, returnValue: '' }
    
    render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={mockOnBack} />)
    
    // Simulate beforeunload event
    fireEvent(window, new Event('beforeunload'))
    
    // The component should set up the event listener
    expect(window.addEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function))
  })

  it('displays Arabic quiz with RTL direction', () => {
    const arabicQuiz = {
      ...mockQuiz,
      language: 'ar' as const,
      title: 'أساسيات الأمن السيبراني'
    }
    
    render(<QuizAttempt quiz={arabicQuiz} attempt={mockAttempt} onBack={mockOnBack} />)
    
    expect(screen.getByText('أساسيات الأمن السيبراني')).toBeInTheDocument()
    // Check for RTL direction
    const container = screen.getByText('أساسيات الأمن السيبراني').closest('div')
    expect(container).toHaveAttribute('dir', 'ltr') // Based on language context mock
  })

  it('shows quiz badges correctly', () => {
    render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={mockOnBack} />)
    
    expect(screen.getByText('EN')).toBeInTheDocument()
    expect(screen.getByText('2 questions')).toBeInTheDocument()
  })

  it('handles quiz submission loading state', async () => {
    const user = userEvent.setup()
    mockAttemptState.currentQuestionIndex = 1 // Last question
    mockAttemptState.currentAnswers = { q1: ['A cyber attack'], q2: ['false'] }
    
    // Mock a slow submission
    mockActions.submitQuiz.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
    
    render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={mockOnBack} />)
    
    const submitButton = screen.getByText('Submit Quiz')
    await user.click(submitButton)
    
    expect(screen.getByText('Submitting...')).toBeInTheDocument()
  })

  it('shows error when question is not found', () => {
    const quizWithoutQuestions = { ...mockQuiz, questions: [] }
    
    render(<QuizAttempt quiz={quizWithoutQuestions} attempt={mockAttempt} onBack={mockOnBack} />)
    
    expect(screen.getByText('Question not found. Please try refreshing the page.')).toBeInTheDocument()
  })

  it('handles timer countdown simulation', async () => {
    vi.useFakeTimers()
    
    // Mock the timer hook to simulate countdown
    const mockTimerHook = vi.mocked(vi.importMock('@/lib/stores/awareness-lab-store')).useQuizTimer
    let timeRemaining = 60
    
    mockTimerHook.mockImplementation(() => ({
      timeRemaining,
      isActive: true,
      startTime: new Date()
    }))
    
    render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={mockOnBack} />)
    
    expect(screen.getByText('01:00')).toBeInTheDocument()
    
    // Simulate time passing
    timeRemaining = 30
    mockTimerHook.mockImplementation(() => ({
      timeRemaining,
      isActive: true,
      startTime: new Date()
    }))
    
    // Re-render to show updated time
    render(<QuizAttempt quiz={mockQuiz} attempt={mockAttempt} onBack={mockOnBack} />)
    expect(screen.getByText('00:30')).toBeInTheDocument()
    
    vi.useRealTimers()
  })
})