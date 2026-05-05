import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AwarenessLabTab } from '../AwarenessLabTab'

// Mock the awareness lab store
const mockActions = {
  fetchQuizzes: vi.fn(),
  fetchLearningModules: vi.fn(),
  setActiveTab: vi.fn(),
  clearError: vi.fn()
}

const mockStoreData = {
  quizzes: [
    {
      id: 'quiz-1',
      title: 'Cybersecurity Basics',
      language: 'en',
      isPublished: true
    },
    {
      id: 'quiz-2',
      title: 'Advanced Security',
      language: 'en',
      isPublished: true
    }
  ],
  learningModules: [
    {
      id: 'module-1',
      title: 'Security Fundamentals',
      materials: [
        { id: 'material-1', title: 'Introduction' },
        { id: 'material-2', title: 'Best Practices' }
      ]
    },
    {
      id: 'module-2',
      title: 'Network Security',
      materials: [
        { id: 'material-3', title: 'Firewalls' }
      ]
    }
  ],
  userQuizAttempts: {
    'quiz-1': [
      { id: 'attempt-1', isCompleted: true, score: 85 }
    ]
  },
  userProgress: {
    'module-1-material-1': { isCompleted: true },
    'module-1-material-2': { isCompleted: true },
    'module-2-material-3': { isCompleted: false }
  },
  activeTab: 'hub'
}

vi.mock('@/lib/stores/awareness-lab-store', () => ({
  useAwarenessLabStore: () => mockStoreData,
  useAwarenessLabActions: () => mockActions,
  useAwarenessLabLoading: () => false,
  useAwarenessLabError: () => null
}))

// Mock child components
vi.mock('../AwarenessHub', () => ({
  AwarenessHub: () => <div data-testid="awareness-hub">Awareness Hub Content</div>
}))

vi.mock('../AwarenessLab', () => ({
  AwarenessLab: () => <div data-testid="awareness-lab">Awareness Lab Content</div>
}))

// Mock UI components
vi.mock('@/components/ui', () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div data-testid="tabs" data-value={value}>
      <div onClick={() => onValueChange && onValueChange('hub')}>Hub Tab</div>
      <div onClick={() => onValueChange && onValueChange('lab')}>Lab Tab</div>
      {children}
    </div>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tabs-content-${value}`}>{children}</div>
  ),
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value, onClick }: any) => (
    <button data-testid={`tab-trigger-${value}`} onClick={onClick}>
      {children}
    </button>
  ),
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  Badge: ({ children }: any) => <span>{children}</span>,
  Alert: ({ children, variant }: any) => <div className={`alert ${variant}`}>{children}</div>,
  AlertDescription: ({ children }: any) => <div>{children}</div>
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  BookOpen: () => <div data-testid="book-open-icon" />,
  Brain: () => <div data-testid="brain-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />
}))

describe('AwarenessLabTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockActions.fetchQuizzes.mockResolvedValue(undefined)
    mockActions.fetchLearningModules.mockResolvedValue(undefined)
  })

  it('renders awareness lab tab with progress indicators', async () => {
    render(<AwarenessLabTab />)
    
    expect(screen.getByText('Quizzes Progress')).toBeInTheDocument()
    expect(screen.getByText('Modules Progress')).toBeInTheDocument()
    expect(screen.getByTestId('tabs')).toBeInTheDocument()
  })

  it('fetches data on component mount', async () => {
    render(<AwarenessLabTab />)
    
    await waitFor(() => {
      expect(mockActions.fetchQuizzes).toHaveBeenCalled()
      expect(mockActions.fetchLearningModules).toHaveBeenCalled()
    })
  })

  it('calculates quiz progress correctly', () => {
    render(<AwarenessLabTab />)
    
    // Should show 1 completed out of 2 total quizzes (50%)
    expect(screen.getByText('1/2')).toBeInTheDocument()
    expect(screen.getByText('50% Complete')).toBeInTheDocument()
  })

  it('calculates module progress correctly', () => {
    render(<AwarenessLabTab />)
    
    // Module 1: 2/2 materials completed = 100%
    // Module 2: 0/1 materials completed = 0%
    // Overall: 1/2 modules completed = 50%
    expect(screen.getByText('1/2')).toBeInTheDocument()
    expect(screen.getByText('50% Complete')).toBeInTheDocument()
  })

  it('displays correct progress indicators with icons', () => {
    render(<AwarenessLabTab />)
    
    expect(screen.getByTestId('brain-icon')).toBeInTheDocument() // Quiz progress
    expect(screen.getByTestId('book-open-icon')).toBeInTheDocument() // Module progress
  })

  it('switches between hub and lab tabs', async () => {
    const user = userEvent.setup()
    render(<AwarenessLabTab />)
    
    // Should start with hub tab active
    expect(screen.getByTestId('awareness-hub')).toBeInTheDocument()
    
    // Click lab tab
    const labTab = screen.getByText('Lab Tab')
    await user.click(labTab)
    
    expect(mockActions.setActiveTab).toHaveBeenCalledWith('lab')
  })

  it('renders tab triggers with correct icons and labels', () => {
    render(<AwarenessLabTab />)
    
    expect(screen.getByText('Awareness Hub')).toBeInTheDocument()
    expect(screen.getByText('Awareness Lab')).toBeInTheDocument()
  })

  it('shows awareness hub content when hub tab is active', () => {
    mockStoreData.activeTab = 'hub'
    render(<AwarenessLabTab />)
    
    expect(screen.getByTestId('awareness-hub')).toBeInTheDocument()
    expect(screen.getByText('Awareness Hub Content')).toBeInTheDocument()
  })

  it('shows awareness lab content when lab tab is active', () => {
    mockStoreData.activeTab = 'lab'
    render(<AwarenessLabTab />)
    
    expect(screen.getByTestId('awareness-lab')).toBeInTheDocument()
    expect(screen.getByText('Awareness Lab Content')).toBeInTheDocument()
  })

  it('handles zero progress correctly', () => {
    // Mock empty data
    const emptyMockData = {
      ...mockStoreData,
      quizzes: [],
      learningModules: [],
      userQuizAttempts: {},
      userProgress: {}
    }
    
    vi.mocked(vi.importMock('@/lib/stores/awareness-lab-store')).useAwarenessLabStore.mockReturnValue(emptyMockData)
    
    render(<AwarenessLabTab />)
    
    expect(screen.getByText('0/0')).toBeInTheDocument()
    expect(screen.getByText('0% Complete')).toBeInTheDocument()
  })

  it('handles error state correctly', () => {
    vi.mocked(vi.importMock('@/lib/stores/awareness-lab-store')).useAwarenessLabError.mockReturnValue('Failed to load data')
    
    render(<AwarenessLabTab />)
    
    expect(screen.getByText('Failed to load data')).toBeInTheDocument()
    expect(screen.getByText('Dismiss')).toBeInTheDocument()
  })

  it('clears error when dismiss button is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(vi.importMock('@/lib/stores/awareness-lab-store')).useAwarenessLabError.mockReturnValue('Failed to load data')
    
    render(<AwarenessLabTab />)
    
    const dismissButton = screen.getByText('Dismiss')
    await user.click(dismissButton)
    
    expect(mockActions.clearError).toHaveBeenCalled()
  })

  it('shows loading state when data is being fetched', () => {
    vi.mocked(vi.importMock('@/lib/stores/awareness-lab-store')).useAwarenessLabLoading.mockReturnValue(true)
    
    render(<AwarenessLabTab />)
    
    // Component should still render but might show loading indicators
    expect(screen.getByTestId('tabs')).toBeInTheDocument()
  })

  it('calculates quiz completion based on passing score', () => {
    const mockDataWithFailingScore = {
      ...mockStoreData,
      userQuizAttempts: {
        'quiz-1': [
          { id: 'attempt-1', isCompleted: true, score: 60 } // Below 70% passing
        ],
        'quiz-2': [
          { id: 'attempt-2', isCompleted: true, score: 80 } // Above 70% passing
        ]
      }
    }
    
    vi.mocked(vi.importMock('@/lib/stores/awareness-lab-store')).useAwarenessLabStore.mockReturnValue(mockDataWithFailingScore)
    
    render(<AwarenessLabTab />)
    
    // Only quiz-2 should count as completed (score >= 70%)
    expect(screen.getByText('1/2')).toBeInTheDocument()
    expect(screen.getByText('50% Complete')).toBeInTheDocument()
  })

  it('handles modules without materials correctly', () => {
    const mockDataWithEmptyModule = {
      ...mockStoreData,
      learningModules: [
        {
          id: 'module-1',
          title: 'Security Fundamentals',
          materials: []
        },
        {
          id: 'module-2',
          title: 'Network Security',
          materials: [
            { id: 'material-1', title: 'Firewalls' }
          ]
        }
      ]
    }
    
    vi.mocked(vi.importMock('@/lib/stores/awareness-lab-store')).useAwarenessLabStore.mockReturnValue(mockDataWithEmptyModule)
    
    render(<AwarenessLabTab />)
    
    // Module with no materials shouldn't count toward completion
    expect(screen.getByText('0/1')).toBeInTheDocument() // Only module-2 counts
  })

  it('displays progress bars with correct styling', () => {
    render(<AwarenessLabTab />)
    
    const progressBars = screen.getAllByRole('generic').filter(el => 
      el.className?.includes('bg-blue-600')
    )
    
    // Should have progress bars for both quizzes and modules
    expect(progressBars.length).toBeGreaterThan(0)
  })

  it('handles multiple quiz attempts correctly', () => {
    const mockDataWithMultipleAttempts = {
      ...mockStoreData,
      userQuizAttempts: {
        'quiz-1': [
          { id: 'attempt-1', isCompleted: true, score: 60 },
          { id: 'attempt-2', isCompleted: true, score: 85 } // Best score
        ]
      }
    }
    
    vi.mocked(vi.importMock('@/lib/stores/awareness-lab-store')).useAwarenessLabStore.mockReturnValue(mockDataWithMultipleAttempts)
    
    render(<AwarenessLabTab />)
    
    // Should count as completed because best score (85%) is above passing threshold
    expect(screen.getByText('1/2')).toBeInTheDocument()
  })

  it('renders with proper accessibility attributes', () => {
    render(<AwarenessLabTab />)
    
    // Check for proper tab structure
    expect(screen.getByTestId('tabs')).toBeInTheDocument()
    expect(screen.getByTestId('tabs-list')).toBeInTheDocument()
  })
})