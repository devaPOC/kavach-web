import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuestionRenderer } from '../QuestionRenderer'

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
        true: 'True',
        false: 'False',
        select_answer: 'Select an answer',
        select_all_that_apply: 'Select all that apply'
      },
      ar: {
        true: 'صحيح',
        false: 'خطأ',
        select_answer: 'اختر إجابة',
        select_all_that_apply: 'اختر كل ما ينطبق'
      }
    }
    return translations[mockLanguageContext.language]?.[key] || key
  }
}))

// Mock language utils
vi.mock('@/lib/utils/language', () => ({
  getLanguageClasses: (lang: string) => lang === 'ar' ? 'font-arabic' : 'font-sans',
  getTextDirection: (lang: string) => lang === 'ar' ? 'rtl' : 'ltr'
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
  Checkbox: ({ checked, onCheckedChange, id }: any) => (
    <input 
      type="checkbox" 
      id={id}
      checked={checked} 
      onChange={(e) => onCheckedChange(e.target.checked)}
    />
  ),
  Label: ({ children, htmlFor, className }: any) => (
    <label htmlFor={htmlFor} className={className}>{children}</label>
  )
}))

describe('MultilingualContent', () => {
  const englishMCQQuestion = {
    id: 'q1',
    questionType: 'mcq' as const,
    questionData: {
      question: 'What is phishing?',
      options: ['A type of fish', 'A cyber attack', 'A programming language', 'A database'],
      explanation: 'Phishing is a type of cyber attack where attackers try to steal sensitive information.'
    },
    correctAnswers: ['A cyber attack'],
    orderIndex: 0
  }

  const arabicMCQQuestion = {
    id: 'q2',
    questionType: 'mcq' as const,
    questionData: {
      question: 'ما هو التصيد الإلكتروني؟',
      options: ['نوع من الأسماك', 'هجوم سيبراني', 'لغة برمجة', 'قاعدة بيانات'],
      explanation: 'التصيد الإلكتروني هو نوع من الهجمات السيبرانية حيث يحاول المهاجمون سرقة المعلومات الحساسة.'
    },
    correctAnswers: ['هجوم سيبراني'],
    orderIndex: 0
  }

  const englishTrueFalseQuestion = {
    id: 'q3',
    questionType: 'true_false' as const,
    questionData: {
      question: 'Strong passwords should contain only letters.',
      explanation: 'Strong passwords should contain a mix of letters, numbers, and special characters.'
    },
    correctAnswers: ['false'],
    orderIndex: 0
  }

  const arabicTrueFalseQuestion = {
    id: 'q4',
    questionType: 'true_false' as const,
    questionData: {
      question: 'يجب أن تحتوي كلمات المرور القوية على أحرف فقط.',
      explanation: 'يجب أن تحتوي كلمات المرور القوية على مزيج من الأحرف والأرقام والرموز الخاصة.'
    },
    correctAnswers: ['false'],
    orderIndex: 0
  }

  const mockOnAnswerChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockLanguageContext.language = 'en'
    mockLanguageContext.direction = 'ltr'
  })

  describe('English Content', () => {
    it('renders English MCQ question correctly', () => {
      render(
        <QuestionRenderer
          question={englishMCQQuestion}
          questionIndex={0}
          totalQuestions={1}
          currentAnswer={[]}
          onAnswerChange={mockOnAnswerChange}
          isArabic={false}
        />
      )

      expect(screen.getByText('What is phishing?')).toBeInTheDocument()
      expect(screen.getByText('A type of fish')).toBeInTheDocument()
      expect(screen.getByText('A cyber attack')).toBeInTheDocument()
      expect(screen.getByText('A programming language')).toBeInTheDocument()
      expect(screen.getByText('A database')).toBeInTheDocument()
    })

    it('renders English True/False question correctly', () => {
      render(
        <QuestionRenderer
          question={englishTrueFalseQuestion}
          questionIndex={0}
          totalQuestions={1}
          currentAnswer={[]}
          onAnswerChange={mockOnAnswerChange}
          isArabic={false}
        />
      )

      expect(screen.getByText('Strong passwords should contain only letters.')).toBeInTheDocument()
      expect(screen.getByText('True')).toBeInTheDocument()
      expect(screen.getByText('False')).toBeInTheDocument()
    })

    it('applies correct English styling classes', () => {
      render(
        <QuestionRenderer
          question={englishMCQQuestion}
          questionIndex={0}
          totalQuestions={1}
          currentAnswer={[]}
          onAnswerChange={mockOnAnswerChange}
          isArabic={false}
        />
      )

      const questionElement = screen.getByText('What is phishing?')
      expect(questionElement).toHaveClass('font-sans')
    })
  })

  describe('Arabic Content', () => {
    beforeEach(() => {
      mockLanguageContext.language = 'ar'
      mockLanguageContext.direction = 'rtl'
    })

    it('renders Arabic MCQ question correctly', () => {
      render(
        <QuestionRenderer
          question={arabicMCQQuestion}
          questionIndex={0}
          totalQuestions={1}
          currentAnswer={[]}
          onAnswerChange={mockOnAnswerChange}
          isArabic={true}
        />
      )

      expect(screen.getByText('ما هو التصيد الإلكتروني؟')).toBeInTheDocument()
      expect(screen.getByText('نوع من الأسماك')).toBeInTheDocument()
      expect(screen.getByText('هجوم سيبراني')).toBeInTheDocument()
      expect(screen.getByText('لغة برمجة')).toBeInTheDocument()
      expect(screen.getByText('قاعدة بيانات')).toBeInTheDocument()
    })

    it('renders Arabic True/False question correctly', () => {
      render(
        <QuestionRenderer
          question={arabicTrueFalseQuestion}
          questionIndex={0}
          totalQuestions={1}
          currentAnswer={[]}
          onAnswerChange={mockOnAnswerChange}
          isArabic={true}
        />
      )

      expect(screen.getByText('يجب أن تحتوي كلمات المرور القوية على أحرف فقط.')).toBeInTheDocument()
      expect(screen.getByText('صحيح')).toBeInTheDocument()
      expect(screen.getByText('خطأ')).toBeInTheDocument()
    })

    it('applies correct Arabic styling classes', () => {
      render(
        <QuestionRenderer
          question={arabicMCQQuestion}
          questionIndex={0}
          totalQuestions={1}
          currentAnswer={[]}
          onAnswerChange={mockOnAnswerChange}
          isArabic={true}
        />
      )

      const questionElement = screen.getByText('ما هو التصيد الإلكتروني؟')
      expect(questionElement).toHaveClass('font-arabic')
    })

    it('applies RTL direction for Arabic content', () => {
      render(
        <div dir={mockLanguageContext.direction}>
          <QuestionRenderer
            question={arabicMCQQuestion}
            questionIndex={0}
            totalQuestions={1}
            currentAnswer={[]}
            onAnswerChange={mockOnAnswerChange}
            isArabic={true}
          />
        </div>
      )

      const container = screen.getByText('ما هو التصيد الإلكتروني؟').closest('div')
      expect(container?.closest('div')).toHaveAttribute('dir', 'rtl')
    })
  })

  describe('Language Switching', () => {
    it('updates content when language changes from English to Arabic', () => {
      const { rerender } = render(
        <QuestionRenderer
          question={englishMCQQuestion}
          questionIndex={0}
          totalQuestions={1}
          currentAnswer={[]}
          onAnswerChange={mockOnAnswerChange}
          isArabic={false}
        />
      )

      expect(screen.getByText('What is phishing?')).toBeInTheDocument()

      // Change language context
      mockLanguageContext.language = 'ar'
      mockLanguageContext.direction = 'rtl'

      rerender(
        <QuestionRenderer
          question={arabicMCQQuestion}
          questionIndex={0}
          totalQuestions={1}
          currentAnswer={[]}
          onAnswerChange={mockOnAnswerChange}
          isArabic={true}
        />
      )

      expect(screen.getByText('ما هو التصيد الإلكتروني؟')).toBeInTheDocument()
    })

    it('updates True/False labels based on language', () => {
      const { rerender } = render(
        <QuestionRenderer
          question={englishTrueFalseQuestion}
          questionIndex={0}
          totalQuestions={1}
          currentAnswer={[]}
          onAnswerChange={mockOnAnswerChange}
          isArabic={false}
        />
      )

      expect(screen.getByText('True')).toBeInTheDocument()
      expect(screen.getByText('False')).toBeInTheDocument()

      // Change to Arabic
      mockLanguageContext.language = 'ar'

      rerender(
        <QuestionRenderer
          question={arabicTrueFalseQuestion}
          questionIndex={0}
          totalQuestions={1}
          currentAnswer={[]}
          onAnswerChange={mockOnAnswerChange}
          isArabic={true}
        />
      )

      expect(screen.getByText('صحيح')).toBeInTheDocument()
      expect(screen.getByText('خطأ')).toBeInTheDocument()
    })
  })

  describe('Multiple Select Questions', () => {
    const multipleSelectQuestion = {
      id: 'q5',
      questionType: 'multiple_select' as const,
      questionData: {
        question: 'Which of the following are security best practices?',
        options: ['Use strong passwords', 'Share passwords with colleagues', 'Enable two-factor authentication', 'Click on suspicious links'],
        explanation: 'Strong passwords and two-factor authentication are security best practices.'
      },
      correctAnswers: ['Use strong passwords', 'Enable two-factor authentication'],
      orderIndex: 0
    }

    it('renders multiple select question correctly', () => {
      render(
        <QuestionRenderer
          question={multipleSelectQuestion}
          questionIndex={0}
          totalQuestions={1}
          currentAnswer={[]}
          onAnswerChange={mockOnAnswerChange}
          isArabic={false}
        />
      )

      expect(screen.getByText('Which of the following are security best practices?')).toBeInTheDocument()
      expect(screen.getByText('Use strong passwords')).toBeInTheDocument()
      expect(screen.getByText('Share passwords with colleagues')).toBeInTheDocument()
      expect(screen.getByText('Enable two-factor authentication')).toBeInTheDocument()
      expect(screen.getByText('Click on suspicious links')).toBeInTheDocument()
    })

    it('handles multiple selections correctly', async () => {
      const user = userEvent.setup()
      render(
        <QuestionRenderer
          question={multipleSelectQuestion}
          questionIndex={0}
          totalQuestions={1}
          currentAnswer={[]}
          onAnswerChange={mockOnAnswerChange}
          isArabic={false}
        />
      )

      const firstOption = screen.getByLabelText('Use strong passwords')
      const secondOption = screen.getByLabelText('Enable two-factor authentication')

      await user.click(firstOption)
      expect(mockOnAnswerChange).toHaveBeenCalledWith(['Use strong passwords'])

      await user.click(secondOption)
      expect(mockOnAnswerChange).toHaveBeenCalledWith(['Enable two-factor authentication'])
    })
  })

  describe('Answer Selection', () => {
    it('handles MCQ answer selection', async () => {
      const user = userEvent.setup()
      render(
        <QuestionRenderer
          question={englishMCQQuestion}
          questionIndex={0}
          totalQuestions={1}
          currentAnswer={[]}
          onAnswerChange={mockOnAnswerChange}
          isArabic={false}
        />
      )

      const answerOption = screen.getByLabelText('A cyber attack')
      await user.click(answerOption)

      expect(mockOnAnswerChange).toHaveBeenCalledWith(['A cyber attack'])
    })

    it('handles True/False answer selection', async () => {
      const user = userEvent.setup()
      render(
        <QuestionRenderer
          question={englishTrueFalseQuestion}
          questionIndex={0}
          totalQuestions={1}
          currentAnswer={[]}
          onAnswerChange={mockOnAnswerChange}
          isArabic={false}
        />
      )

      const falseOption = screen.getByLabelText('False')
      await user.click(falseOption)

      expect(mockOnAnswerChange).toHaveBeenCalledWith(['false'])
    })

    it('shows selected answers correctly', () => {
      render(
        <QuestionRenderer
          question={englishMCQQuestion}
          questionIndex={0}
          totalQuestions={1}
          currentAnswer={['A cyber attack']}
          onAnswerChange={mockOnAnswerChange}
          isArabic={false}
        />
      )

      const selectedOption = screen.getByLabelText('A cyber attack')
      expect(selectedOption).toBeChecked()
    })
  })

  describe('Responsive Design', () => {
    it('applies responsive classes for mobile layout', () => {
      render(
        <QuestionRenderer
          question={englishMCQQuestion}
          questionIndex={0}
          totalQuestions={1}
          currentAnswer={[]}
          onAnswerChange={mockOnAnswerChange}
          isArabic={false}
        />
      )

      // Check for responsive grid classes
      const optionsContainer = screen.getByText('A type of fish').closest('div')
      expect(optionsContainer).toHaveClass('space-y-3')
    })

    it('handles long text content properly', () => {
      const longTextQuestion = {
        ...englishMCQQuestion,
        questionData: {
          ...englishMCQQuestion.questionData,
          question: 'This is a very long question that should wrap properly on smaller screens and maintain readability across different device sizes and orientations.',
          options: [
            'This is a very long answer option that should also wrap properly',
            'Another long option that tests text wrapping behavior',
            'Short option',
            'Yet another extremely long answer option that contains multiple words and should demonstrate proper text wrapping and spacing'
          ]
        }
      }

      render(
        <QuestionRenderer
          question={longTextQuestion}
          questionIndex={0}
          totalQuestions={1}
          currentAnswer={[]}
          onAnswerChange={mockOnAnswerChange}
          isArabic={false}
        />
      )

      expect(screen.getByText(/This is a very long question/)).toBeInTheDocument()
      expect(screen.getByText(/This is a very long answer option/)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('provides proper labels for form controls', () => {
      render(
        <QuestionRenderer
          question={englishMCQQuestion}
          questionIndex={0}
          totalQuestions={1}
          currentAnswer={[]}
          onAnswerChange={mockOnAnswerChange}
          isArabic={false}
        />
      )

      expect(screen.getByLabelText('A type of fish')).toBeInTheDocument()
      expect(screen.getByLabelText('A cyber attack')).toBeInTheDocument()
      expect(screen.getByLabelText('A programming language')).toBeInTheDocument()
      expect(screen.getByLabelText('A database')).toBeInTheDocument()
    })

    it('maintains proper heading hierarchy', () => {
      render(
        <QuestionRenderer
          question={englishMCQQuestion}
          questionIndex={0}
          totalQuestions={1}
          currentAnswer={[]}
          onAnswerChange={mockOnAnswerChange}
          isArabic={false}
        />
      )

      const questionHeading = screen.getByRole('heading')
      expect(questionHeading).toHaveTextContent('Question 1 of 1')
    })

    it('provides proper form structure for screen readers', () => {
      render(
        <QuestionRenderer
          question={englishMCQQuestion}
          questionIndex={0}
          totalQuestions={1}
          currentAnswer={[]}
          onAnswerChange={mockOnAnswerChange}
          isArabic={false}
        />
      )

      const radioButtons = screen.getAllByRole('radio')
      expect(radioButtons).toHaveLength(4)
      
      radioButtons.forEach(radio => {
        expect(radio).toHaveAttribute('name', 'question-q1')
      })
    })
  })
})