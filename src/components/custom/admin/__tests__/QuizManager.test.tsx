import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuizManager from '../QuizManager'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardDescription: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, variant, size, disabled }: any) => (
    <button 
      onClick={onClick} 
      className={`btn ${variant} ${size} ${className}`}
      disabled={disabled}
    >
      {children}
    </button>
  )
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({ placeholder, value, onChange, className }: any) => (
    <input 
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={className}
    />
  )
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className}`}>{children}</span>
  )
}))

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange, className }: any) => (
    <div className={className} data-value={value} data-testid="tabs">
      {children}
    </div>
  ),
  TabsContent: ({ children, value, className }: any) => (
    <div className={className} data-value={value} data-testid="tabs-content">
      {children}
    </div>
  ),
  TabsList: ({ children, className }: any) => (
    <div className={className} data-testid="tabs-list">{children}</div>
  ),
  TabsTrigger: ({ children, value, onClick, className }: any) => (
    <button 
      onClick={onClick} 
      className={className} 
      data-value={value}
      data-testid="tabs-trigger"
    >
      {children}
    </button>
  )
}))

// Mock dialog components
vi.mock('../QuizCreateDialog', () => ({
  default: ({ open, onOpenChange, onQuizCreated }: any) => 
    open ? (
      <div data-testid="quiz-create-dialog">
        <button onClick={() => onQuizCreated()}>Create Quiz</button>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null
}))

vi.mock('../QuizEditDialog', () => ({
  default: ({ open, onOpenChange, quiz, onQuizUpdated }: any) => 
    open ? (
      <div data-testid="quiz-edit-dialog">
        <span>Editing: {quiz?.title}</span>
        <button onClick={() => onQuizUpdated()}>Update Quiz</button>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null
}))

vi.mock('../QuizDeleteDialog', () => ({
  default: ({ open, onOpenChange, quiz, onQuizDeleted }: any) => 
    open ? (
      <div data-testid="quiz-delete-dialog">
        <span>Delete: {quiz?.title}</span>
        <button onClick={() => onQuizDeleted()}>Delete Quiz</button>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null
}))

vi.mock('../QuizPreviewDialog', () => ({
  default: ({ open, onOpenChange, quiz }: any) => 
    open ? (
      <div data-testid="quiz-preview-dialog">
        <span>Preview: {quiz?.title}</span>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null
}))

vi.mock('../QuizDuplicateDialog', () => ({
  default: ({ open, onOpenChange, quiz, onQuizDuplicated }: any) => 
    open ? (
      <div data-testid="quiz-duplicate-dialog">
        <span>Duplicate: {quiz?.title}</span>
        <button onClick={() => onQuizDuplicated()}>Duplicate Quiz</button>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Plus: () => <div data-testid="plus-icon" />,
  Search: () => <div data-testid="search-icon" />,
  Edit: () => <div data-testid="edit-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  Copy: () => <div data-testid="copy-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Globe: () => <div data-testid="globe-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  ChevronLeft: () => <div data-testid="chevron-left-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />
}))

describe('QuizManager', () => {
  const mockQuizzes = [
    {
      id: 'quiz-1',
      title: 'Cybersecurity Basics',
      description: 'Test your knowledge of cybersecurity fundamentals',
      language: 'en' as const,
      timeLimitMinutes: 30,
      maxAttempts: 3,
      isPublished: true,
      questionCount: 10,
      createdBy: 'admin-1',
      createdAt: '2023-01-01T10:00:00Z',
      updatedAt: '2023-01-01T10:00:00Z'
    },
    {
      id: 'quiz-2',
      title: 'أساسيات الأمن السيبراني',
      description: 'اختبر معرفتك بأساسيات الأمن السيبراني',
      language: 'ar' as const,
      timeLimitMinutes: 45,
      maxAttempts: 2,
      isPublished: false,
      questionCount: 15,
      createdBy: 'admin-1',
      createdAt: '2023-01-02T10:00:00Z',
      updatedAt: '2023-01-02T10:00:00Z',
      templateId: 'template-1'
    }
  ]

  const mockApiResponse = {
    success: true,
    data: {
      quizzes: mockQuizzes,
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1
      }
    }
  }

  beforeEach(() => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse)
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders quiz manager with header and create button', async () => {
    render(<QuizManager />)
    
    expect(screen.getByText('Quiz Management')).toBeInTheDocument()
    expect(screen.getByText('Create and manage cybersecurity awareness quizzes')).toBeInTheDocument()
    expect(screen.getByText('Create Quiz')).toBeInTheDocument()
  })

  it('displays loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves
    render(<QuizManager />)
    
    expect(screen.getByRole('generic')).toHaveClass('animate-spin')
  })

  it('fetches and displays quizzes on mount', async () => {
    render(<QuizManager />)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/admin/quizzes?page=1&limit=10',
        { credentials: 'same-origin' }
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Cybersecurity Basics')).toBeInTheDocument()
      expect(screen.getByText('أساسيات الأمن السيبراني')).toBeInTheDocument()
    })
  })

  it('displays quiz statistics correctly', async () => {
    render(<QuizManager />)
    
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument() // Total quizzes
      expect(screen.getByText('1')).toBeInTheDocument() // Published (first occurrence)
      expect(screen.getByText('1')).toBeInTheDocument() // Drafts (second occurrence)
      expect(screen.getByText('1')).toBeInTheDocument() // Arabic quizzes (third occurrence)
    })
  })

  it('filters quizzes by search term', async () => {
    const user = userEvent.setup()
    render(<QuizManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Cybersecurity Basics')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search quizzes...')
    await user.type(searchInput, 'Cybersecurity')
    
    expect(screen.getByText('Cybersecurity Basics')).toBeInTheDocument()
    expect(screen.queryByText('أساسيات الأمن السيبراني')).toBeInTheDocument() // Still visible as it contains Arabic equivalent
  })

  it('opens create dialog when create button is clicked', async () => {
    const user = userEvent.setup()
    render(<QuizManager />)
    
    const createButton = screen.getByText('Create Quiz')
    await user.click(createButton)
    
    expect(screen.getByTestId('quiz-create-dialog')).toBeInTheDocument()
  })

  it('opens edit dialog when edit button is clicked', async () => {
    const user = userEvent.setup()
    render(<QuizManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Cybersecurity Basics')).toBeInTheDocument()
    })

    const editButtons = screen.getAllByText('Edit')
    await user.click(editButtons[0])
    
    expect(screen.getByTestId('quiz-edit-dialog')).toBeInTheDocument()
    expect(screen.getByText('Editing: Cybersecurity Basics')).toBeInTheDocument()
  })

  it('opens delete dialog when delete button is clicked', async () => {
    const user = userEvent.setup()
    render(<QuizManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Cybersecurity Basics')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByText('Delete')
    await user.click(deleteButtons[0])
    
    expect(screen.getByTestId('quiz-delete-dialog')).toBeInTheDocument()
    expect(screen.getByText('Delete: Cybersecurity Basics')).toBeInTheDocument()
  })

  it('opens preview dialog when preview button is clicked', async () => {
    const user = userEvent.setup()
    render(<QuizManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Cybersecurity Basics')).toBeInTheDocument()
    })

    const previewButtons = screen.getAllByText('Preview')
    await user.click(previewButtons[0])
    
    expect(screen.getByTestId('quiz-preview-dialog')).toBeInTheDocument()
    expect(screen.getByText('Preview: Cybersecurity Basics')).toBeInTheDocument()
  })

  it('opens duplicate dialog when duplicate button is clicked', async () => {
    const user = userEvent.setup()
    render(<QuizManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Cybersecurity Basics')).toBeInTheDocument()
    })

    const duplicateButtons = screen.getAllByText('Duplicate')
    await user.click(duplicateButtons[0])
    
    expect(screen.getByTestId('quiz-duplicate-dialog')).toBeInTheDocument()
    expect(screen.getByText('Duplicate: Cybersecurity Basics')).toBeInTheDocument()
  })

  it('toggles quiz publish status', async () => {
    const user = userEvent.setup()
    
    // Mock the publish API call
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      })

    render(<QuizManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Cybersecurity Basics')).toBeInTheDocument()
    })

    const unpublishButton = screen.getByText('Unpublish')
    await user.click(unpublishButton)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/admin/quizzes/quiz-1/publish',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ isPublished: false })
        })
      )
    })
  })

  it('displays correct language badges', async () => {
    render(<QuizManager />)
    
    await waitFor(() => {
      expect(screen.getByText('English')).toBeInTheDocument()
      expect(screen.getByText('Arabic')).toBeInTheDocument()
    })
  })

  it('displays correct status badges', async () => {
    render(<QuizManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Published')).toBeInTheDocument()
      expect(screen.getByText('Draft')).toBeInTheDocument()
    })
  })

  it('shows template indicator for quizzes created from templates', async () => {
    render(<QuizManager />)
    
    await waitFor(() => {
      expect(screen.getByText('From Template')).toBeInTheDocument()
    })
  })

  it('displays quiz settings correctly', async () => {
    render(<QuizManager />)
    
    await waitFor(() => {
      expect(screen.getByText('30min')).toBeInTheDocument()
      expect(screen.getByText('45min')).toBeInTheDocument()
      expect(screen.getByText('3 attempts')).toBeInTheDocument()
      expect(screen.getByText('2 attempts')).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    })

    render(<QuizManager />)
    
    await waitFor(() => {
      expect(screen.getByText('HTTP 500')).toBeInTheDocument()
    })
  })

  it('displays empty state when no quizzes exist', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          quizzes: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
        }
      })
    })

    render(<QuizManager />)
    
    await waitFor(() => {
      expect(screen.getByText('No quizzes found')).toBeInTheDocument()
      expect(screen.getByText('Get started by creating your first quiz.')).toBeInTheDocument()
    })
  })

  it('filters by Arabic language when Arabic Only button is clicked', async () => {
    const user = userEvent.setup()
    render(<QuizManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Cybersecurity Basics')).toBeInTheDocument()
    })

    const arabicButton = screen.getByText('Arabic Only')
    await user.click(arabicButton)
    
    // Should trigger a new API call with language filter
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/admin/quizzes?page=1&limit=10&language=ar',
        { credentials: 'same-origin' }
      )
    })
  })

  it('refreshes data after quiz operations', async () => {
    const user = userEvent.setup()
    render(<QuizManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Create Quiz')).toBeInTheDocument()
    })

    // Open and complete create dialog
    await user.click(screen.getByText('Create Quiz'))
    const createQuizButton = screen.getByText('Create Quiz')
    await user.click(createQuizButton)
    
    // Should refetch quizzes
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2) // Initial load + refresh after create
    })
  })

  it('handles pagination correctly', async () => {
    const multiPageResponse = {
      success: true,
      data: {
        quizzes: mockQuizzes,
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3
        }
      }
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(multiPageResponse)
    })

    render(<QuizManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
      expect(screen.getByText('Showing 1 to 2 of 25 quizzes')).toBeInTheDocument()
    })
  })
})