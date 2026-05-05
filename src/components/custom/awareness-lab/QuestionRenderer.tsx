'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Checkbox } from '@/components/ui'
import {
  CheckCircle,
  Circle,
  Square,
  CheckSquare,
  HelpCircle,
  Check,
  X
} from 'lucide-react'
import { type QuizQuestion } from '@/lib/stores/awareness-lab-store'
import { useLanguage, useLocalizedText } from '@/lib/contexts/LanguageContext'
import { getLanguageClasses } from '@/lib/utils/language'

interface QuestionRendererProps {
  question: QuizQuestion
  questionIndex: number
  totalQuestions: number
  currentAnswer: string[]
  onAnswerChange: (answer: string[]) => void
  isArabic?: boolean
  showCorrectAnswers?: boolean
  isReviewMode?: boolean
}

interface MCQOptionProps {
  option: string
  index: number
  isSelected: boolean
  isCorrect?: boolean
  isIncorrect?: boolean
  onClick: () => void
  isArabic?: boolean
  showFeedback?: boolean
}

const MCQOption: React.FC<MCQOptionProps> = ({
  option,
  index,
  isSelected,
  isCorrect,
  isIncorrect,
  onClick,
  isArabic = false,
  showFeedback = false
}) => {
  const optionLabel = String.fromCharCode(65 + index) // A, B, C, D...

  const getOptionStyles = () => {
    if (showFeedback) {
      if (isCorrect) {
        return 'border-secondary/50 bg-secondary/10 text-secondary'
      }
      if (isIncorrect) {
        return 'border-destructive bg-destructive/10 text-destructive'
      }
    }

    if (isSelected) {
      return 'border-primary/50 bg-primary/10 text-primary'
    }

    return 'border-border bg-card text-foreground hover:border-border hover:bg-muted/50'
  }

  const getIcon = () => {
    if (showFeedback) {
      if (isCorrect) {
        return <CheckCircle className="h-5 w-5 text-secondary" />
      }
      if (isIncorrect) {
        return <X className="h-5 w-5 text-destructive" />
      }
    }

    return isSelected
      ? <CheckCircle className="h-5 w-5 text-primary" />
      : <Circle className="h-5 w-5 text-muted-foreground/80" />
  }

  return (
    <button
      onClick={onClick}
      disabled={showFeedback}
      className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${getOptionStyles()} ${showFeedback ? 'cursor-default' : 'cursor-pointer'
        }`}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div className={`flex items-start space-x-3 ${isArabic ? 'flex-row-reverse space-x-reverse' : ''}`}>
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`flex items-center space-x-2 ${isArabic ? 'flex-row-reverse space-x-reverse' : ''}`}>
            <span className="text-sm font-medium text-muted-foreground">
              {optionLabel}.
            </span>
            <span className={`font-medium quiz-option-text ${isArabic ? 'font-arabic text-right' : ''}`}>
              {option}
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}

interface TrueFalseOptionProps {
  value: boolean
  label: string
  isSelected: boolean
  isCorrect?: boolean
  isIncorrect?: boolean
  onClick: () => void
  isArabic?: boolean
  showFeedback?: boolean
}

const TrueFalseOption: React.FC<TrueFalseOptionProps> = ({
  value,
  label,
  isSelected,
  isCorrect,
  isIncorrect,
  onClick,
  isArabic = false,
  showFeedback = false
}) => {
  const t = useLocalizedText();
  const getOptionStyles = () => {
    if (showFeedback) {
      if (isCorrect) {
        return 'border-secondary/50 bg-secondary/10 text-secondary'
      }
      if (isIncorrect) {
        return 'border-destructive bg-destructive/10 text-destructive'
      }
    }

    if (isSelected) {
      return 'border-primary/50 bg-primary/10 text-primary'
    }

    return 'border-border bg-card text-foreground hover:border-border hover:bg-muted/50'
  }

  const getIcon = () => {
    if (showFeedback) {
      if (isCorrect) {
        return <CheckCircle className="h-6 w-6 text-secondary" />
      }
      if (isIncorrect) {
        return <X className="h-6 w-6 text-destructive" />
      }
    }

    return isSelected
      ? <CheckCircle className="h-6 w-6 text-primary" />
      : <Circle className="h-6 w-6 text-muted-foreground/80" />
  }

  return (
    <button
      onClick={onClick}
      disabled={showFeedback}
      className={`flex-1 p-6 rounded-lg border-2 transition-all duration-200 ${getOptionStyles()} ${showFeedback ? 'cursor-default' : 'cursor-pointer'
        }`}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div className={`flex flex-col items-center space-y-3 ${isArabic ? 'text-center' : ''}`}>
        {getIcon()}
        <span className={`text-lg font-semibold ${isArabic ? 'font-arabic' : ''}`}>
          {label}
        </span>
        <span className={`text-sm text-muted-foreground ${isArabic ? 'font-arabic' : ''}`}>
          {value ? t('true') : t('false')}
        </span>
      </div>
    </button>
  )
}

interface MultipleSelectOptionProps {
  option: string
  index: number
  isSelected: boolean
  isCorrect?: boolean
  isIncorrect?: boolean
  onClick: () => void
  isArabic?: boolean
  showFeedback?: boolean
}

const MultipleSelectOption: React.FC<MultipleSelectOptionProps> = ({
  option,
  index,
  isSelected,
  isCorrect,
  isIncorrect,
  onClick,
  isArabic = false,
  showFeedback = false
}) => {
  const optionLabel = String.fromCharCode(65 + index) // A, B, C, D...

  const getOptionStyles = () => {
    if (showFeedback) {
      if (isCorrect) {
        return 'border-secondary/50 bg-secondary/10 text-secondary'
      }
      if (isIncorrect) {
        return 'border-destructive bg-destructive/10 text-destructive'
      }
    }

    if (isSelected) {
      return 'border-primary/50 bg-primary/10 text-primary'
    }

    return 'border-border bg-card text-foreground hover:border-border hover:bg-muted/50'
  }

  const getIcon = () => {
    if (showFeedback) {
      if (isCorrect) {
        return <CheckSquare className="h-5 w-5 text-secondary" />
      }
      if (isIncorrect) {
        return <X className="h-5 w-5 text-destructive" />
      }
    }

    return isSelected
      ? <CheckSquare className="h-5 w-5 text-primary" />
      : <Square className="h-5 w-5 text-muted-foreground/80" />
  }

  return (
    <button
      onClick={onClick}
      disabled={showFeedback}
      className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${getOptionStyles()} ${showFeedback ? 'cursor-default' : 'cursor-pointer'
        }`}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div className={`flex items-start space-x-3 ${isArabic ? 'flex-row-reverse space-x-reverse' : ''}`}>
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`flex items-center space-x-2 ${isArabic ? 'flex-row-reverse space-x-reverse' : ''}`}>
            <span className="text-sm font-medium text-muted-foreground">
              {optionLabel}.
            </span>
            <span className={`font-medium quiz-option-text ${isArabic ? 'font-arabic text-right' : ''}`}>
              {option}
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  questionIndex,
  totalQuestions,
  currentAnswer,
  onAnswerChange,
  isArabic = false,
  showCorrectAnswers = false,
  isReviewMode = false
}) => {
  const { questionType, questionData, correctAnswers } = question
  const { language, direction } = useLanguage()
  const t = useLocalizedText()

  // Use language from context if not explicitly provided
  const effectiveIsArabic = isArabic || language === 'ar'
  const textDirection = direction
  const languageClasses = getLanguageClasses(language)

  const getQuestionTypeLabel = () => {
    switch (questionType) {
      case 'mcq':
        return effectiveIsArabic ? 'اختيار من متعدد' : 'Multiple Choice'
      case 'true_false':
        return effectiveIsArabic ? 'صح أم خطأ' : 'True/False'
      case 'multiple_select':
        return effectiveIsArabic ? 'اختيار متعدد' : 'Multiple Select'
      default:
        return effectiveIsArabic ? 'سؤال' : 'Question'
    }
  }

  const getQuestionTypeIcon = () => {
    switch (questionType) {
      case 'mcq':
        return <Circle className="h-4 w-4" />
      case 'true_false':
        return <HelpCircle className="h-4 w-4" />
      case 'multiple_select':
        return <Square className="h-4 w-4" />
      default:
        return <HelpCircle className="h-4 w-4" />
    }
  }

  const renderMCQ = () => {
    const options = questionData.options || []

    const handleOptionClick = (selectedOption: string) => {
      if (isReviewMode) return
      // Send the actual option text instead of the index
      onAnswerChange([selectedOption])
    }

    return (
      <div className="space-y-3">
        {options.map((option, index) => {
          const isSelected = currentAnswer.includes(option)
          const isCorrect = showCorrectAnswers && correctAnswers.includes(option)
          const isIncorrect = showCorrectAnswers && isSelected && !correctAnswers.includes(option)

          return (
            <MCQOption
              key={index}
              option={option}
              index={index}
              isSelected={isSelected}
              isCorrect={isCorrect}
              isIncorrect={isIncorrect}
              onClick={() => handleOptionClick(option)}
              isArabic={effectiveIsArabic}
              showFeedback={showCorrectAnswers}
            />
          )
        })}
      </div>
    )
  }

  const renderTrueFalse = () => {
    const handleOptionClick = (value: boolean) => {
      if (isReviewMode) return
      onAnswerChange([value.toString()])
    }

    const trueSelected = currentAnswer.includes('true')
    const falseSelected = currentAnswer.includes('false')

    const trueIsCorrect = showCorrectAnswers && correctAnswers.includes('true')
    const falseIsCorrect = showCorrectAnswers && correctAnswers.includes('false')

    const trueIsIncorrect = showCorrectAnswers && trueSelected && !correctAnswers.includes('true')
    const falseIsIncorrect = showCorrectAnswers && falseSelected && !correctAnswers.includes('false')

    return (
      <div className="grid grid-cols-2 gap-4">
        <TrueFalseOption
          value={true}
          label={t('true')}
          isSelected={trueSelected}
          isCorrect={trueIsCorrect}
          isIncorrect={trueIsIncorrect}
          onClick={() => handleOptionClick(true)}
          isArabic={effectiveIsArabic}
          showFeedback={showCorrectAnswers}
        />
        <TrueFalseOption
          value={false}
          label={t('false')}
          isSelected={falseSelected}
          isCorrect={falseIsCorrect}
          isIncorrect={falseIsIncorrect}
          onClick={() => handleOptionClick(false)}
          isArabic={effectiveIsArabic}
          showFeedback={showCorrectAnswers}
        />
      </div>
    )
  }

  const renderMultipleSelect = () => {
    const options = questionData.options || []

    const handleOptionClick = (selectedOption: string) => {
      if (isReviewMode) return

      // Send the actual option text instead of the index
      const newAnswer = currentAnswer.includes(selectedOption)
        ? currentAnswer.filter(a => a !== selectedOption)
        : [...currentAnswer, selectedOption]

      onAnswerChange(newAnswer)
    }

    return (
      <div className="space-y-3">
        <div className={`text-sm text-muted-foreground mb-4 ${effectiveIsArabic ? 'font-arabic text-right' : ''}`}>
          {t('select_all_correct')}
        </div>
        {options.map((option, index) => {
          const isSelected = currentAnswer.includes(option)
          const isCorrect = showCorrectAnswers && correctAnswers.includes(option)
          const isIncorrect = showCorrectAnswers && isSelected && !correctAnswers.includes(option)

          return (
            <MultipleSelectOption
              key={index}
              option={option}
              index={index}
              isSelected={isSelected}
              isCorrect={isCorrect}
              isIncorrect={isIncorrect}
              onClick={() => handleOptionClick(option)}
              isArabic={effectiveIsArabic}
              showFeedback={showCorrectAnswers}
            />
          )
        })}
      </div>
    )
  }

  const renderQuestionContent = () => {
    switch (questionType) {
      case 'mcq':
        return renderMCQ()
      case 'true_false':
        return renderTrueFalse()
      case 'multiple_select':
        return renderMultipleSelect()
      default:
        return (
          <div className="text-center py-8 text-muted-foreground">
            Unsupported question type: {questionType}
          </div>
        )
    }
  }

  return (
    <div className="space-y-6" dir={textDirection}>
      {/* Question Header */}
      <div className="space-y-3">
        <div className={`flex items-center justify-between ${effectiveIsArabic ? 'flex-row-reverse' : ''}`}>
          <Badge variant="outline" className={`flex items-center space-x-1 ${languageClasses}`}>
            {getQuestionTypeIcon()}
            <span>{getQuestionTypeLabel()}</span>
          </Badge>

          <span className="text-sm text-muted-foreground">
            {questionIndex + 1} / {totalQuestions}
          </span>
        </div>

        <div className={`${effectiveIsArabic ? 'text-right' : 'text-left'}`}>
          <h3 className={`text-lg font-semibold text-foreground leading-relaxed quiz-question ${languageClasses} ${effectiveIsArabic ? 'font-arabic' : ''}`}>
            {questionData.question}
          </h3>
        </div>
      </div>

      {/* Question Options */}
      <div className="space-y-4">
        {renderQuestionContent()}
      </div>

      {/* Explanation (if in review mode) */}
      {showCorrectAnswers && questionData.explanation && (
        <Card className="bg-primary/10 border-primary/50">
          <CardContent className="pt-4">
            <div className={`flex items-start space-x-2 ${effectiveIsArabic ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className="flex-shrink-0 mt-0.5">
                <HelpCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className={`font-medium text-primary mb-1 ${languageClasses}`}>
                  {t('explanation')}:
                </h4>
                <p className={`text-primary ${languageClasses}`}>
                  {questionData.explanation}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Answer Status */}
      {currentAnswer.length > 0 && !showCorrectAnswers && (
        <div className={`flex items-center space-x-2 text-sm text-secondary ${effectiveIsArabic ? 'flex-row-reverse space-x-reverse justify-end' : ''}`}>
          <Check className="h-4 w-4" />
          <span className={languageClasses}>
            {t('answered')}
          </span>
        </div>
      )}
    </div>
  )
}

export default QuestionRenderer
