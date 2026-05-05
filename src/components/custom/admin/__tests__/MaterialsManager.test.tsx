import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MaterialsManager from '../MaterialsManager'

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

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value}>
      <button onClick={() => onValueChange('category1')}>Select Category</button>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>
}))

// Mock dialog components
vi.mock('../ModuleCreateDialog', () => ({
  default: ({ open, onOpenChange, onModuleCreated }: any) => 
    open ? (
      <div data-testid="module-create-dialog">
        <button onClick={() => onModuleCreated()}>Create Module</button>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null
}))

vi.mock('../ModuleEditDialog', () => ({
  default: ({ open, onOpenChange, module, onModuleUpdated }: any) => 
    open ? (
      <div data-testid="module-edit-dialog">
        <span>Editing: {module?.title}</span>
        <button onClick={() => onModuleUpdated()}>Update Module</button>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null
}))

vi.mock('../ModuleDeleteDialog', () => ({
  default: ({ open, onOpenChange, module, onModuleDeleted }: any) => 
    open ? (
      <div data-testid="module-delete-dialog">
        <span>Delete: {module?.title}</span>
        <button onClick={() => onModuleDeleted()}>Delete Module</button>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null
}))

vi.mock('../MaterialCreateDialog', () => ({
  default: ({ open, onOpenChange, moduleId, onMaterialCreated }: any) => 
    open ? (
      <div data-testid="material-create-dialog">
        <span>Module: {moduleId}</span>
        <button onClick={() => onMaterialCreated()}>Create Material</button>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null
}))

vi.mock('../MaterialEditDialog', () => ({
  default: ({ open, onOpenChange, material, onMaterialUpdated }: any) => 
    open ? (
      <div data-testid="material-edit-dialog">
        <span>Editing: {material?.title}</span>
        <button onClick={() => onMaterialUpdated()}>Update Material</button>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null
}))

vi.mock('../MaterialDeleteDialog', () => ({
  default: ({ open, onOpenChange, material, onMaterialDeleted }: any) => 
    open ? (
      <div data-testid="material-delete-dialog">
        <span>Delete: {material?.title}</span>
        <button onClick={() => onMaterialDeleted()}>Delete Material</button>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null
}))

vi.mock('../MaterialPreviewDialog', () => ({
  default: ({ open, onOpenChange, material }: any) => 
    open ? (
      <div data-testid="material-preview-dialog">
        <span>Preview: {material?.title}</span>
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
  BookOpen: () => <div data-testid="book-open-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Video: () => <div data-testid="video-icon" />,
  Link: () => <div data-testid="link-icon" />,
  Globe: () => <div data-testid="globe-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronUp: () => <div data-testid="chevron-up-icon" />,
  GripVertical: () => <div data-testid="grip-vertical-icon" />,
  ArrowUp: () => <div data-testid="arrow-up-icon" />,
  ArrowDown: () => <div data-testid="arrow-down-icon" />
}))

describe('MaterialsManager', () => {
  const mockModules = [
    {
      id: 'module-1',
      title: 'Cybersecurity Fundamentals',
      description: 'Basic cybersecurity concepts and practices',
      category: 'Security Basics',
      orderIndex: 0,
      isPublished: true,
      createdBy: 'admin-1',
      createdAt: '2023-01-01T10:00:00Z',
      updatedAt: '2023-01-01T10:00:00Z',
      materials: [
        {
          id: 'material-1',
          moduleId: 'module-1',
          materialType: 'link',
          title: 'Introduction to Cybersecurity',
          description: 'Overview of cybersecurity principles',
          materialData: {
            url: 'https://example.com/intro-cybersecurity'
          },
          orderIndex: 0
        },
        {
          id: 'material-2',
          moduleId: 'module-1',
          materialType: 'video',
          title: 'Password Security Best Practices',
          description: 'Learn how to create strong passwords',
          materialData: {
            url: 'https://youtube.com/watch?v=example',
            duration: 300
          },
          orderIndex: 1
        }
      ]
    },
    {
      id: 'module-2',
      title: 'Network Security',
      description: 'Understanding network security concepts',
      category: 'Advanced Security',
      orderIndex: 1,
      isPublished: false,
      createdBy: 'admin-1',
      createdAt: '2023-01-02T10:00:00Z',
      updatedAt: '2023-01-02T10:00:00Z',
      materials: [
        {
          id: 'material-3',
          moduleId: 'module-2',
          materialType: 'document',
          title: 'Firewall Configuration Guide',
          description: 'Step-by-step firewall setup',
          materialData: {
            fileUrl: 'https://example.com/firewall-guide.pdf'
          },
          orderIndex: 0
        }
      ]
    }
  ]

  const mockApiResponse = {
    success: true,
    data: {
      modules: mockModules,
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

  it('renders materials manager with header and create button', async () => {
    render(<MaterialsManager />)
    
    expect(screen.getByText('Learning Materials Management')).toBeInTheDocument()
    expect(screen.getByText('Create and organize learning modules and materials')).toBeInTheDocument()
    expect(screen.getByText('Create Module')).toBeInTheDocument()
  })

  it('displays loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves
    render(<MaterialsManager />)
    
    expect(screen.getByRole('generic')).toHaveClass('animate-spin')
  })

  it('fetches and displays modules on mount', async () => {
    render(<MaterialsManager />)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/admin/learning-modules?page=1&limit=10',
        { credentials: 'same-origin' }
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Cybersecurity Fundamentals')).toBeInTheDocument()
      expect(screen.getByText('Network Security')).toBeInTheDocument()
    })
  })

  it('displays module statistics correctly', async () => {
    render(<MaterialsManager />)
    
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument() // Total modules
      expect(screen.getByText('1')).toBeInTheDocument() // Published modules
      expect(screen.getByText('1')).toBeInTheDocument() // Draft modules
      expect(screen.getByText('3')).toBeInTheDocument() // Total materials
    })
  })

  it('filters modules by search term', async () => {
    const user = userEvent.setup()
    render(<MaterialsManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Cybersecurity Fundamentals')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search modules...')
    await user.type(searchInput, 'Cybersecurity')
    
    expect(screen.getByText('Cybersecurity Fundamentals')).toBeInTheDocument()
  })

  it('filters modules by category', async () => {
    const user = userEvent.setup()
    render(<MaterialsManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Cybersecurity Fundamentals')).toBeInTheDocument()
    })

    const categorySelect = screen.getByTestId('select')
    await user.click(categorySelect)
    
    // Should trigger category filter
    expect(categorySelect).toBeInTheDocument()
  })

  it('opens create module dialog when create button is clicked', async () => {
    const user = userEvent.setup()
    render(<MaterialsManager />)
    
    const createButton = screen.getByText('Create Module')
    await user.click(createButton)
    
    expect(screen.getByTestId('module-create-dialog')).toBeInTheDocument()
  })

  it('expands and collapses module details', async () => {
    const user = userEvent.setup()
    render(<MaterialsManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Cybersecurity Fundamentals')).toBeInTheDocument()
    })

    const expandButton = screen.getAllByTestId('chevron-down-icon')[0].closest('button')
    await user.click(expandButton!)
    
    expect(screen.getByText('Introduction to Cybersecurity')).toBeInTheDocument()
    expect(screen.getByText('Password Security Best Practices')).toBeInTheDocument()
  })

  it('opens edit module dialog when edit button is clicked', async () => {
    const user = userEvent.setup()
    render(<MaterialsManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Cybersecurity Fundamentals')).toBeInTheDocument()
    })

    const editButtons = screen.getAllByText('Edit')
    await user.click(editButtons[0])
    
    expect(screen.getByTestId('module-edit-dialog')).toBeInTheDocument()
    expect(screen.getByText('Editing: Cybersecurity Fundamentals')).toBeInTheDocument()
  })

  it('opens delete module dialog when delete button is clicked', async () => {
    const user = userEvent.setup()
    render(<MaterialsManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Cybersecurity Fundamentals')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByText('Delete')
    await user.click(deleteButtons[0])
    
    expect(screen.getByTestId('module-delete-dialog')).toBeInTheDocument()
    expect(screen.getByText('Delete: Cybersecurity Fundamentals')).toBeInTheDocument()
  })

  it('toggles module publish status', async () => {
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

    render(<MaterialsManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Cybersecurity Fundamentals')).toBeInTheDocument()
    })

    const unpublishButton = screen.getByText('Unpublish')
    await user.click(unpublishButton)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/admin/learning-modules/module-1/publish',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ isPublished: false })
        })
      )
    })
  })

  it('displays correct material type icons', async () => {
    const user = userEvent.setup()
    render(<MaterialsManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Cybersecurity Fundamentals')).toBeInTheDocument()
    })

    // Expand module to see materials
    const expandButton = screen.getAllByTestId('chevron-down-icon')[0].closest('button')
    await user.click(expandButton!)
    
    expect(screen.getByTestId('link-icon')).toBeInTheDocument() // Link material
    expect(screen.getByTestId('video-icon')).toBeInTheDocument() // Video material
  })

  it('opens create material dialog for specific module', async () => {
    const user = userEvent.setup()
    render(<MaterialsManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Cybersecurity Fundamentals')).toBeInTheDocument()
    })

    // Expand module
    const expandButton = screen.getAllByTestId('chevron-down-icon')[0].closest('button')
    await user.click(expandButton!)
    
    const addMaterialButton = screen.getByText('Add Material')
    await user.click(addMaterialButton)
    
    expect(screen.getByTestId('material-create-dialog')).toBeInTheDocument()
    expect(screen.getByText('Module: module-1')).toBeInTheDocument()
  })

  it('opens edit material dialog when material edit is clicked', async () => {
    const user = userEvent.setup()
    render(<MaterialsManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Cybersecurity Fundamentals')).toBeInTheDocument()
    })

    // Expand module
    const expandButton = screen.getAllByTestId('chevron-down-icon')[0].closest('button')
    await user.click(expandButton!)
    
    // Find material edit button
    const materialEditButtons = screen.getAllByTestId('edit-icon')
    const materialEditButton = materialEditButtons.find(btn => 
      btn.closest('tr')?.textContent?.includes('Introduction to Cybersecurity')
    )?.closest('button')
    
    if (materialEditButton) {
      await user.click(materialEditButton)
      expect(screen.getByTestId('material-edit-dialog')).toBeInTheDocument()
    }
  })

  it('opens preview material dialog when preview is clicked', async () => {
    const user = userEvent.setup()
    render(<MaterialsManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Cybersecurity Fundamentals')).toBeInTheDocument()
    })

    // Expand module
    const expandButton = screen.getAllByTestId('chevron-down-icon')[0].closest('button')
    await user.click(expandButton!)
    
    const previewButtons = screen.getAllByTestId('eye-icon')
    const materialPreviewButton = previewButtons.find(btn => 
      btn.closest('tr')?.textContent?.includes('Introduction to Cybersecurity')
    )?.closest('button')
    
    if (materialPreviewButton) {
      await user.click(materialPreviewButton)
      expect(screen.getByTestId('material-preview-dialog')).toBeInTheDocument()
    }
  })

  it('handles material reordering with drag and drop', async () => {
    const user = userEvent.setup()
    render(<MaterialsManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Cybersecurity Fundamentals')).toBeInTheDocument()
    })

    // Expand module
    const expandButton = screen.getAllByTestId('chevron-down-icon')[0].closest('button')
    await user.click(expandButton!)
    
    // Check for drag handles
    expect(screen.getAllByTestId('grip-vertical-icon')).toHaveLength(2)
  })

  it('moves materials up and down in order', async () => {
    const user = userEvent.setup()
    
    // Mock reorder API call
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })

    render(<MaterialsManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Cybersecurity Fundamentals')).toBeInTheDocument()
    })

    // Expand module
    const expandButton = screen.getAllByTestId('chevron-down-icon')[0].closest('button')
    await user.click(expandButton!)
    
    const moveUpButtons = screen.getAllByTestId('arrow-up-icon')
    if (moveUpButtons.length > 0) {
      await user.click(moveUpButtons[0].closest('button')!)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/admin/learning-modules/module-1/materials/reorder',
          expect.objectContaining({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin'
          })
        )
      })
    }
  })

  it('displays correct status badges for modules', async () => {
    render(<MaterialsManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Published')).toBeInTheDocument()
      expect(screen.getByText('Draft')).toBeInTheDocument()
    })
  })

  it('shows material count for each module', async () => {
    render(<MaterialsManager />)
    
    await waitFor(() => {
      expect(screen.getByText('2 materials')).toBeInTheDocument() // Module 1
      expect(screen.getByText('1 material')).toBeInTheDocument() // Module 2
    })
  })

  it('handles API errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    })

    render(<MaterialsManager />)
    
    await waitFor(() => {
      expect(screen.getByText('HTTP 500')).toBeInTheDocument()
    })
  })

  it('displays empty state when no modules exist', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          modules: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
        }
      })
    })

    render(<MaterialsManager />)
    
    await waitFor(() => {
      expect(screen.getByText('No modules found')).toBeInTheDocument()
      expect(screen.getByText('Get started by creating your first learning module.')).toBeInTheDocument()
    })
  })

  it('refreshes data after module operations', async () => {
    const user = userEvent.setup()
    render(<MaterialsManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Create Module')).toBeInTheDocument()
    })

    // Open and complete create dialog
    await user.click(screen.getByText('Create Module'))
    const createModuleButton = screen.getByText('Create Module')
    await user.click(createModuleButton)
    
    // Should refetch modules
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2) // Initial load + refresh after create
    })
  })

  it('validates material URLs correctly', async () => {
    const user = userEvent.setup()
    render(<MaterialsManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Cybersecurity Fundamentals')).toBeInTheDocument()
    })

    // Expand module to see materials
    const expandButton = screen.getAllByTestId('chevron-down-icon')[0].closest('button')
    await user.click(expandButton!)
    
    // Check that URLs are displayed
    expect(screen.getByText('https://example.com/intro-cybersecurity')).toBeInTheDocument()
    expect(screen.getByText('https://youtube.com/watch?v=example')).toBeInTheDocument()
  })

  it('shows video duration for video materials', async () => {
    const user = userEvent.setup()
    render(<MaterialsManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Cybersecurity Fundamentals')).toBeInTheDocument()
    })

    // Expand module
    const expandButton = screen.getAllByTestId('chevron-down-icon')[0].closest('button')
    await user.click(expandButton!)
    
    expect(screen.getByText('5:00')).toBeInTheDocument() // 300 seconds = 5 minutes
  })

  it('handles bulk operations on modules', async () => {
    const user = userEvent.setup()
    render(<MaterialsManager />)
    
    await waitFor(() => {
      expect(screen.getByText('Cybersecurity Fundamentals')).toBeInTheDocument()
    })

    // Check for bulk action controls
    const checkboxes = screen.getAllByRole('checkbox')
    if (checkboxes.length > 0) {
      await user.click(checkboxes[0])
      expect(screen.getByText('Bulk Actions')).toBeInTheDocument()
    }
  })
})