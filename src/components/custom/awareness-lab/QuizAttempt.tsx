'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Button } from '@/components/ui'
import { Alert, AlertDescription } from '@/components/ui'
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  AlertTriangle,
  Flag,
  Timer,
  Brain,
  Target,
  Send
} from 'lucide-react'
import {
  useAwarenessLabStore,
  useAwarenessLabActions,
  useQuizTimer,
  useCurrentResults,
  useCurrentProgress,
  useShowResults,
  type Quiz,
  type QuizAttempt as QuizAttemptType
} from '@/lib/stores/awareness-lab-store'
import { useLanguage, useLocalizedText } from '@/lib/contexts/LanguageContext'
import { getLanguageClasses } from '@/lib/utils/language'
import { QuestionRenderer } from './QuestionRenderer'
import { QuizResults } from './QuizResults'
import { 
  MultilingualWrapper, 
  MultilingualText, 
  MultilingualHeading, 
  MultilingualButton 
} from './MultilingualWrapper'

interface QuizTimerProps {
  timeRemaining: number
  isActive: boolean
  isArabic?: boolean
}

const QuizTimer: React.FC<QuizTimerProps> = ({ timeRemaining, isActive, isArabic = false }) => {
  const { language } = useLanguage()
  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60

  const isLowTime = timeRemaining <= 300 // 5 minutes
  const isCriticalTime = timeRemaining <= 60 // 1 minute

  const timerColor = isCriticalTime
    ? 'text-destructive bg-destructive/10 border-destructive'
    : isLowTime
      ? 'text-accent bg-accent/10 border-accent/50'
      : 'text-primary bg-primary/10 border-primary/50'

  const effectiveIsArabic = isArabic || language === 'ar'

  return (
    <MultilingualWrapper className={`flex items-center space-x-2 px-2 sm:px-3 py-2 rounded-lg border ${timerColor} min-w-0 flex-shrink-0`}>
      <Timer className={`h-3 w-3 sm:h-4 sm:w-4 ${isCriticalTime ? 'animate-pulse' : ''} flex-shrink-0`} />
      <span className="font-mono font-semibold text-sm sm:text-base whitespace-nowrap">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
      {!isActive && (
        <MultilingualText size="xs" className="opacity-75 hidden sm:inline">
          {effectiveIsArabic ? '(متوقف)' : '(Paused)'}
        </MultilingualText>
      )}
    </MultilingualWrapper>
  )
}

interface QuizProgressProps {
  currentIndex: number
  totalQuestions: number
  answeredQuestions: Set<string>
  isArabic?: boolean
}

const QuizProgress: React.FC<QuizProgressProps> = ({
  currentIndex,
  totalQuestions,
  answeredQuestions,
  isArabic = false
}) => {
  const { language } = useLanguage()
  const progressPercentage = ((currentIndex + 1) / totalQuestions) * 100
  const answeredCount = answeredQuestions.size
  const effectiveIsArabic = isArabic || language === 'ar'

  return (
    <div className={`space-y-3 ${effectiveIsArabic ? 'font-arabic' : ''}`}>
      <div className={`flex items-center justify-between text-xs sm:text-sm text-muted-foreground ${effectiveIsArabic ? 'flex-row-reverse' : ''}`}>
        <span className="font-medium">
          {effectiveIsArabic
            ? `السؤال ${currentIndex + 1} من ${totalQuestions}`
            : `Question ${currentIndex + 1} of ${totalQuestions}`
          }
        </span>
        <span className="text-xs">
          {effectiveIsArabic
            ? `${answeredCount}/${totalQuestions} تم الإجابة`
            : `${answeredCount}/${totalQuestions} answered`
          }
        </span>
      </div>

      <div className="w-full bg-muted/80 rounded-full h-2 sm:h-3">
        <div
          className="bg-primary h-2 sm:h-3 rounded-full transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Question indicators - responsive grid */}
      <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:flex lg:flex-wrap gap-1 mt-3">
        {Array.from({ length: totalQuestions }, (_, index) => {
          const questionId = `question-${index}`
          const isAnswered = answeredQuestions.has(questionId)
          const isCurrent = index === currentIndex

          return (
            <div
              key={index}
              className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all touch-target ${isCurrent
                  ? 'border-primary/50 bg-primary text-white'
                  : isAnswered
                    ? 'border-secondary/50 bg-secondary text-white'
                    : 'border-border bg-card text-muted-foreground'
                }`}
            >
              {index + 1}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface QuizNavigationProps {
  currentIndex: number
  totalQuestions: number
  onPrevious: () => void
  onNext: () => void
  onSubmit: () => void
  canSubmit: boolean
  isSubmitting: boolean
  isArabic?: boolean
}

const QuizNavigation: React.FC<QuizNavigationProps> = ({
  currentIndex,
  totalQuestions,
  onPrevious,
  onNext,
  onSubmit,
  canSubmit,
  isSubmitting,
  isArabic = false
}) => {
  const { language } = useLanguage()
  const t = useLocalizedText()
  const isFirstQuestion = currentIndex === 0
  const isLastQuestion = currentIndex === totalQuestions - 1
  const effectiveIsArabic = isArabic || language === 'ar'

  return (
    <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-4 border-t quiz-navigation gap-3 sm:gap-0 ${effectiveIsArabic ? 'sm:flex-row-reverse' : ''}`}>
      <MultilingualButton
        onClick={onPrevious}
        disabled={isFirstQuestion}
        variant="outline"
        size="lg"
        className="touch-target min-h-[44px] order-2 sm:order-1"
        startIcon={<ArrowLeft className="h-4 w-4" />}
      >
        {t('previous')}
      </MultilingualButton>

      <div className="flex items-center justify-center order-1 sm:order-2">
        {isLastQuestion ? (
          <MultilingualButton
            onClick={onSubmit}
            disabled={!canSubmit || isSubmitting}
            size="lg"
            className="bg-secondary hover:bg-secondary text-white touch-target min-h-[44px] w-full sm:w-auto"
            startIcon={isSubmitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="h-4 w-4" />
            )}
          >
            {isSubmitting 
              ? (effectiveIsArabic ? 'جاري الإرسال...' : 'Submitting...')
              : t('submit_quiz')
            }
          </MultilingualButton>
        ) : (
          <MultilingualButton
            onClick={onNext}
            size="lg"
            className="touch-target min-h-[44px] w-full sm:w-auto"
            endIcon={<ArrowRight className="h-4 w-4" />}
          >
            {t('next')}
          </MultilingualButton>
        )}
      </div>
    </div>
  )
}

interface QuizAttemptProps {
  quiz: Quiz
  attempt: QuizAttemptType
  onBack: () => void
}

export const QuizAttempt: React.FC<QuizAttemptProps> = ({ quiz, attempt, onBack }) => {
  const { language, direction } = useLanguage()
  const t = useLocalizedText()

  const { attemptState } = useAwarenessLabStore()
  const quizTimer = useQuizTimer()
  const currentResults = useCurrentResults()
  const currentProgress = useCurrentProgress()
  const showResults = useShowResults()
  const {
    submitAnswer,
    nextQuestion,
    previousQuestion,
    submitQuiz,
    pauseTimer,
    resumeTimer,
    retryQuiz,
    hideQuizResults
  } = useAwarenessLabActions()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)

  const isArabic = quiz.language === 'ar' || language === 'ar'
  const textDirection = direction
  const languageClasses = getLanguageClasses(language)

  const currentQuestion = quiz.questions[attemptState.currentQuestionIndex]
  const answeredQuestions = new Set(Object.keys(attemptState.currentAnswers))
  const canSubmit = answeredQuestions.size > 0 // Allow partial submission

  // Handle page visibility for timer pause/resume
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        pauseTimer()
      } else {
        resumeTimer()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [pauseTimer, resumeTimer])

  // Handle beforeunload to warn about losing progress
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (attemptState.hasStarted && !attempt.isCompleted) {
        e.preventDefault()
        e.returnValue = 'You have an active quiz. Are you sure you want to leave?'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [attemptState.hasStarted, attempt.isCompleted])

  const handleAnswerChange = (questionId: string, answer: string[]) => {
    submitAnswer(questionId, answer)
  }

  const handleSubmitQuiz = async () => {
    if (!canSubmit) return

    setIsSubmitting(true)
    try {
      await submitQuiz()
      // The store will handle navigation after successful submission
    } catch (error) {
      console.error('Failed to submit quiz:', error)
    } finally {
      setIsSubmitting(false)
      setShowSubmitConfirm(false)
    }
  }

  const handleSubmitClick = () => {
    const unansweredCount = quiz.questions.length - answeredQuestions.size
    if (unansweredCount > 0) {
      setShowSubmitConfirm(true)
    } else {
      handleSubmitQuiz()
    }
  }

  const handleRetryQuiz = async () => {
    await retryQuiz()
  }

  const handleBackToQuizzes = () => {
    hideQuizResults()
    onBack()
  }

  // Show results if quiz is completed and results are available
  if (showResults && currentResults && currentProgress && attempt.isCompleted) {
    return (
      <QuizResults
        quiz={quiz}
        attempt={attempt}
        results={currentResults}
        progress={currentProgress}
        onRetry={handleRetryQuiz}
        onBackToQuizzes={handleBackToQuizzes}
      />
    )
  }

  if (!currentQuestion) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Question not found. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <MultilingualWrapper className="max-w-4xl mx-auto space-y-4 sm:space-y-6 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <MultilingualButton
          onClick={onBack}
          variant="outline"
          size="sm"
          className="touch-target min-h-[44px]"
          startIcon={<ArrowLeft className="h-4 w-4" />}
        >
          {isArabic ? 'العودة للاختبارات' : 'Back to Quizzes'}
        </MultilingualButton>

        <QuizTimer
          timeRemaining={quizTimer.timeRemaining}
          isActive={quizTimer.isActive}
          isArabic={isArabic}
        />
      </div>

      {/* Quiz Info */}
      <Card>
        <CardHeader className="pb-3 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-0">
            <div className="flex-1 min-w-0">
              <MultilingualHeading level={3} className="break-words" adaptToContent>
                {quiz.title}
              </MultilingualHeading>
              {quiz.description && (
                <MultilingualText className="text-muted-foreground mt-1 break-words" adaptToContent>
                  {quiz.description}
                </MultilingualText>
              )}
            </div>

            <div className={`flex flex-wrap items-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <Badge variant="outline" className={`flex items-center space-x-1 text-xs ${isArabic ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <Target className="h-3 w-3" />
                <span>{quiz.language.toUpperCase()}</span>
              </Badge>
              <Badge variant="secondary" className={`flex items-center space-x-1 text-xs ${isArabic ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <Brain className="h-3 w-3" />
                <span>{quiz.questions.length} {isArabic ? 'أسئلة' : 'questions'}</span>
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 sm:px-6">
          <QuizProgress
            currentIndex={attemptState.currentQuestionIndex}
            totalQuestions={quiz.questions.length}
            answeredQuestions={answeredQuestions}
            isArabic={isArabic}
          />
        </CardContent>
      </Card>

      {/* Current Question */}
      <Card>
        <CardContent className="pt-6">
          <QuestionRenderer
            question={currentQuestion}
            questionIndex={attemptState.currentQuestionIndex}
            totalQuestions={quiz.questions.length}
            currentAnswer={attemptState.currentAnswers[currentQuestion.id] || []}
            onAnswerChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
            isArabic={isArabic}
          />

          <QuizNavigation
            currentIndex={attemptState.currentQuestionIndex}
            totalQuestions={quiz.questions.length}
            onPrevious={previousQuestion}
            onNext={nextQuestion}
            onSubmit={handleSubmitClick}
            canSubmit={canSubmit}
            isSubmitting={isSubmitting}
            isArabic={isArabic}
          />
        </CardContent>
      </Card>

      {/* Submit Confirmation Dialog */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <MultilingualWrapper>
            <Card className="max-w-md mx-4">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Flag className="h-5 w-5 text-accent" />
                  <MultilingualText weight="semibold">
                    {isArabic ? 'إرسال الاختبار؟' : 'Submit Quiz?'}
                  </MultilingualText>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <MultilingualText className="text-muted-foreground">
                  {isArabic
                    ? `لديك ${quiz.questions.length - answeredQuestions.size} أسئلة لم يتم الإجابة عليها. هل أنت متأكد من أنك تريد إرسال اختبارك؟`
                    : `You have ${quiz.questions.length - answeredQuestions.size} unanswered questions. Are you sure you want to submit your quiz?`
                  }
                </MultilingualText>

                <div className="flex items-center space-x-3 gap-3">
                  <MultilingualButton
                    onClick={() => setShowSubmitConfirm(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    {isArabic ? 'متابعة الاختبار' : 'Continue Quiz'}
                  </MultilingualButton>
                  <MultilingualButton
                    onClick={handleSubmitQuiz}
                    disabled={isSubmitting}
                    className="flex-1 bg-accent hover:bg-accent"
                  >
                    {isSubmitting ? (isArabic ? 'جاري الإرسال...' : 'Submitting...') : (isArabic ? 'إرسال على أي حال' : 'Submit Anyway')}
                  </MultilingualButton>
                </div>
              </CardContent>
            </Card>
          </MultilingualWrapper>
        </div>
      )}

      {/* Low Time Warning */}
      {quizTimer.timeRemaining <= 300 && quizTimer.timeRemaining > 60 && (
        <MultilingualWrapper>
          <Alert className="border-accent/50 bg-accent/10">
            <Clock className="h-4 w-4 text-accent" />
            <AlertDescription>
              <MultilingualText className="text-accent" weight="semibold">
                {isArabic ? 'تحذير الوقت:' : 'Time Warning:'}
              </MultilingualText>
              <MultilingualText className="text-accent">
                {' '}{isArabic ? 'لديك أقل من 5 دقائق متبقية.' : 'You have less than 5 minutes remaining.'}
              </MultilingualText>
            </AlertDescription>
          </Alert>
        </MultilingualWrapper>
      )}

      {/* Critical Time Warning */}
      {quizTimer.timeRemaining <= 60 && quizTimer.timeRemaining > 0 && (
        <MultilingualWrapper>
          <Alert variant="destructive" className="animate-pulse">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <MultilingualText weight="semibold">
                {isArabic ? 'حرج:' : 'Critical:'}
              </MultilingualText>
              <MultilingualText>
                {' '}{isArabic ? 'أقل من دقيقة واحدة متبقية! سيتم إرسال اختبارك تلقائياً عند انتهاء الوقت.' : 'Less than 1 minute remaining! Your quiz will auto-submit when time expires.'}
              </MultilingualText>
            </AlertDescription>
          </Alert>
        </MultilingualWrapper>
      )}
    </MultilingualWrapper>
  )
}

export default QuizAttempt
