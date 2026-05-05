import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MultilingualEditor from '../MultilingualEditor'

// Mock language context
const mockLanguageContext = {
  language: 'en',
  direction: 'ltr',
  setLanguage: vi.fn()
}

vi.mock('@/lib/contexts/LanguageContext', () => ({
  useLanguage: () => mockLanguageContext,
  useLocalizedText: () => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        english: 'English',
        arabic: 'Arabic',
        preview: 'Preview',
        edit: 'Edit',
        language_switch: 'Switch Language',
        content_placeholder: 'Enter content...'
      },
      ar: {
        english: 'الإنجليزية',
        arabic: 'العربية',
        preview: 'معاينة',
        edit: 'تحرير',
        language_switch: 'تبديل اللغة',
        content_placeholder: 'أدخل المحتوى...'
      }
    }
    return translations[mockLanguageContext.language]?.[key] || key
  }
}))

// Mock UI components
vi.mock('@/components/ui', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>,
  Button: ({ children, onClick, className, variant, size }: any) => (
    <button onClick={onClick} className={`btn ${variant} ${size} ${className}`}>
      {children}
    </button>
  ),
  Tabs: ({ children, value, onValueChange, className }: any) => (
    <div className={className} data-value={value}>
      <div onClick={() => onValueChange('en')}>English Tab</div>
      <div onClick={() => onValueChange('ar')}>Arabic Tab</div>
      {children}
    </div>
  ),
  TabsContent: ({ children, value, className }: any) => (
    <div className={className} data-value={value}>{children}</div>
  ),
  TabsList: ({ children, className }: any) => <div className={className}>{children}</div>,
  TabsTrigger: ({ children, value, className }: any) => (
    <button className={className} data-value={value}>{children}</button>
  ),
  Textarea: ({ value, onChange, placeholder, className, dir }: any) => (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      dir={dir}
    />
  ),
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className}`}>{children}</span>
  ),
  Alert: ({ children, variant }: any) => <div className={`alert ${variant}`}>{children}</div>,
  AlertDescription: ({ children }: any) => <div>{children}</div>
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Globe: () => <div data-testid="globe-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  Edit: () => <div data-testid="edit-icon" />,
  Languages: () => <div data-testid="languages-icon" />,
  Type: () => <div data-testid="type-icon" />,
  AlignLeft: () => <div data-testid="align-left-icon" />,
  AlignRight: () => <div data-testid="align-right-icon" />
}))

describe('MultilingualEditor', () => {
  const mockOnChange = vi.fn()
  const mockOnLanguageChange = vi.fn()

  const defaultProps = {
    value: {
      en: 'English content',
      ar: 'محتوى عربي'
    },
    onChange: mockOnChange,
    onLanguageChange: mockOnLanguageChange,
    placeholder: {
      en: 'Enter English content...',
      ar: 'أدخل المحتوى العربي...'
    },
    label: 'Content Editor',
    required: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockLanguageContext.language = 'en'
    mockLanguageContext.direction = 'ltr'
  })

  it('renders multilingual editor with language tabs', () => {
    render(<MultilingualEditor {...defaultProps} />)
    
    expect(screen.getByText('Content Editor')).toBeInTheDocument()
    expect(screen.getByText('English Tab')).toBeInTheDocument()
    expect(screen.getByText('Arabic Tab')).toBeInTheDocument()
  })

  it('displays content in correct language tab', () => {
    render(<MultilingualEditor {...defaultProps} />)
    
    expect(screen.getByDisplayValue('English content')).toBeInTheDocument()
  })

  it('switches between language tabs', async () => {
    const user = userEvent.setup()
    render(<MultilingualEditor {...defaultProps} />)
    
    const arabicTab = screen.getByText('Arabic Tab')
    await user.click(arabicTab)
    
    expect(mockOnLanguageChange).toHaveBeenCalledWith('ar')
  })

  it('handles content changes in English', async () => {
    const user = userEvent.setup()
    render(<MultilingualEditor {...defaultProps} />)
    
    const textarea = screen.getByDisplayValue('English content')
    await user.clear(textarea)
    await user.type(textarea, 'Updated English content')
    
    expect(mockOnChange).toHaveBeenCalledWith({
      en: 'Updated English content',
      ar: 'محتوى عربي'
    })
  })

  it('handles content changes in Arabic', async () => {
    const user = userEvent.setup()
    mockLanguageContext.language = 'ar'
    mockLanguageContext.direction = 'rtl'
    
    render(<MultilingualEditor {...defaultProps} />)
    
    const textarea = screen.getByDisplayValue('محتوى عربي')
    await user.clear(textarea)
    await user.type(textarea, 'محتوى عربي محدث')
    
    expect(mockOnChange).toHaveBeenCalledWith({
      en: 'English content',
      ar: 'محتوى عربي محدث'
    })
  })

  it('applies RTL direction for Arabic content', () => {
    mockLanguageContext.language = 'ar'
    mockLanguageContext.direction = 'rtl'
    
    render(<MultilingualEditor {...defaultProps} />)
    
    const textarea = screen.getByDisplayValue('محتوى عربي')
    expect(textarea).toHaveAttribute('dir', 'rtl')
  })

  it('applies LTR direction for English content', () => {
    render(<MultilingualEditor {...defaultProps} />)
    
    const textarea = screen.getByDisplayValue('English content')
    expect(textarea).toHaveAttribute('dir', 'ltr')
  })

  it('shows correct placeholder text for each language', () => {
    const { rerender } = render(<MultilingualEditor {...defaultProps} value={{ en: '', ar: '' }} />)
    
    expect(screen.getByPlaceholderText('Enter English content...')).toBeInTheDocument()
    
    mockLanguageContext.language = 'ar'
    rerender(<MultilingualEditor {...defaultProps} value={{ en: '', ar: '' }} />)
    
    expect(screen.getByPlaceholderText('أدخل المحتوى العربي...')).toBeInTheDocument()
  })

  it('displays character count for content', () => {
    render(<MultilingualEditor {...defaultProps} showCharCount />)
    
    // English content has 15 characters
    expect(screen.getByText('15 characters')).toBeInTheDocument()
  })

  it('shows validation error when required field is empty', () => {
    const propsWithValidation = {
      ...defaultProps,
      required: true,
      value: { en: '', ar: '' }
    }
    
    render(<MultilingualEditor {...propsWithValidation} />)
    
    expect(screen.getByText('This field is required')).toBeInTheDocument()
  })

  it('shows validation error when content exceeds max length', () => {
    const longContent = 'a'.repeat(1001)
    const propsWithLongContent = {
      ...defaultProps,
      value: { en: longContent, ar: 'محتوى عربي' },
      maxLength: 1000
    }
    
    render(<MultilingualEditor {...propsWithLongContent} />)
    
    expect(screen.getByText('Content exceeds maximum length of 1000 characters')).toBeInTheDocument()
  })

  it('toggles between edit and preview modes', async () => {
    const user = userEvent.setup()
    render(<MultilingualEditor {...defaultProps} showPreview />)
    
    const previewButton = screen.getByTestId('eye-icon').closest('button')
    await user.click(previewButton!)
    
    // Should show preview content
    expect(screen.getByText('English content')).toBeInTheDocument()
    
    const editButton = screen.getByTestId('edit-icon').closest('button')
    await user.click(editButton!)
    
    // Should show textarea again
    expect(screen.getByDisplayValue('English content')).toBeInTheDocument()
  })

  it('handles empty content gracefully', () => {
    const emptyProps = {
      ...defaultProps,
      value: { en: '', ar: '' }
    }
    
    render(<MultilingualEditor {...emptyProps} />)
    
    expect(screen.getByPlaceholderText('Enter English content...')).toBeInTheDocument()
  })

  it('handles missing language content', () => {
    const partialProps = {
      ...defaultProps,
      value: { en: 'English only' }
    }
    
    render(<MultilingualEditor {...partialProps} />)
    
    expect(screen.getByDisplayValue('English only')).toBeInTheDocument()
  })

  it('shows language completion status', () => {
    render(<MultilingualEditor {...defaultProps} showCompletionStatus />)
    
    expect(screen.getByText('English')).toBeInTheDocument()
    expect(screen.getByText('Arabic')).toBeInTheDocument()
    
    // Should show completion badges
    const badges = screen.getAllByText('Complete')
    expect(badges).toHaveLength(2)
  })

  it('shows incomplete status for empty content', () => {
    const incompleteProps = {
      ...defaultProps,
      value: { en: 'English content', ar: '' },
      showCompletionStatus: true
    }
    
    render(<MultilingualEditor {...incompleteProps} />)
    
    expect(screen.getByText('Complete')).toBeInTheDocument() // English
    expect(screen.getByText('Incomplete')).toBeInTheDocument() // Arabic
  })

  it('applies correct CSS classes for different languages', () => {
    render(<MultilingualEditor {...defaultProps} />)
    
    const englishTextarea = screen.getByDisplayValue('English content')
    expect(englishTextarea).toHaveClass('font-sans')
    
    mockLanguageContext.language = 'ar'
    const { rerender } = render(<MultilingualEditor {...defaultProps} />)
    
    rerender(<MultilingualEditor {...defaultProps} />)
    const arabicTextarea = screen.getByDisplayValue('محتوى عربي')
    expect(arabicTextarea).toHaveClass('font-arabic')
  })

  it('handles keyboard shortcuts for language switching', async () => {
    const user = userEvent.setup()
    render(<MultilingualEditor {...defaultProps} />)
    
    const textarea = screen.getByDisplayValue('English content')
    textarea.focus()
    
    // Simulate Ctrl+Shift+L for language switch
    await user.keyboard('{Control>}{Shift>}l{/Shift}{/Control}')
    
    expect(mockOnLanguageChange).toHaveBeenCalledWith('ar')
  })

  it('supports rich text formatting options', () => {
    const richTextProps = {
      ...defaultProps,
      enableRichText: true
    }
    
    render(<MultilingualEditor {...richTextProps} />)
    
    // Should show formatting toolbar
    expect(screen.getByTestId('type-icon')).toBeInTheDocument()
  })

  it('handles copy/paste between languages', async () => {
    const user = userEvent.setup()
    render(<MultilingualEditor {...defaultProps} />)
    
    const textarea = screen.getByDisplayValue('English content')
    
    // Select all and copy
    await user.click(textarea)
    await user.keyboard('{Control>}a{/Control}')
    await user.keyboard('{Control>}c{/Control}')
    
    // Switch to Arabic tab and paste
    const arabicTab = screen.getByText('Arabic Tab')
    await user.click(arabicTab)
    
    const arabicTextarea = screen.getByDisplayValue('محتوى عربي')
    await user.click(arabicTextarea)
    await user.keyboard('{Control>}v{/Control}')
    
    // Should trigger onChange with pasted content
    expect(mockOnChange).toHaveBeenCalled()
  })

  it('validates content synchronization between languages', () => {
    const syncProps = {
      ...defaultProps,
      requireBothLanguages: true,
      value: { en: 'English content', ar: '' }
    }
    
    render(<MultilingualEditor {...syncProps} />)
    
    expect(screen.getByText('Both languages are required')).toBeInTheDocument()
  })

  it('handles auto-translation suggestions', async () => {
    const user = userEvent.setup()
    const translationProps = {
      ...defaultProps,
      enableAutoTranslation: true
    }
    
    render(<MultilingualEditor {...translationProps} />)
    
    const translateButton = screen.getByText('Translate')
    await user.click(translateButton)
    
    // Should show translation suggestion
    expect(screen.getByText('Translation suggestion available')).toBeInTheDocument()
  })

  it('maintains focus when switching between tabs', async () => {
    const user = userEvent.setup()
    render(<MultilingualEditor {...defaultProps} />)
    
    const englishTextarea = screen.getByDisplayValue('English content')
    await user.click(englishTextarea)
    
    const arabicTab = screen.getByText('Arabic Tab')
    await user.click(arabicTab)
    
    const arabicTextarea = screen.getByDisplayValue('محتوى عربي')
    expect(arabicTextarea).toHaveFocus()
  })
})