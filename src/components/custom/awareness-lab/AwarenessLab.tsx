'use client'

import React, { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Button } from '@/components/ui'
import { Alert, AlertDescription } from '@/components/ui'
import {
  Brain,
  Clock,
  CheckCircle,
  AlertCircle,
  Trophy,
  RotateCcw,
  Play,
  Timer,
  Target,
  WifiOff,
  Loader2
} from 'lucide-react'
import {
  useAwarenessLabStore,
  useAwarenessLabActions,
  useAwarenessLabLoading,
  useAwarenessLabError,
  useCurrentQuiz,
  useCurrentAttempt,
  useCurrentResults,
  useCurrentProgress,
  useShowResults,
  type Quiz
} from '@/lib/stores/awareness-lab-store'
import { useLanguage, useLocalizedText, useLocalizedDate } from '@/lib/contexts/LanguageContext'
import { getLanguageClasses } from '@/lib/utils/language'
import { QuizAttempt } from './QuizAttempt'
import { QuizResults } from './QuizResults'
import { LoadingState, QuizLoadingState } from './LoadingStates'
import { QuizPagination } from './QuizPagination'

interface QuizCardProps {
  quiz: Quiz
  attempts: any[]
  onStartQuiz: (quizId: string) => void
  isStartingQuiz?: boolean
  className?: string
}

const QuizCard: React.FC<QuizCardProps> = ({ quiz, attempts, onStartQuiz, isStartingQuiz = false, className }) => {
  const { language, direction } = useLanguage()
  const t = useLocalizedText()
  const { formatDuration } = useLocalizedDate()

  const completedAttempts = attempts.filter(attempt => attempt.isCompleted)
  const bestScore = completedAttempts.length > 0
    ? Math.max(...completedAttempts.map(attempt => attempt.score))
    : null
  const remainingAttempts = quiz.maxAttempts === -1 ? Infinity : quiz.maxAttempts - attempts.length

  // Show retake only if attempt !== 0 and user didn't pass (score < 70)
  const hasAttempts = attempts.length > 0
  const hasPassed = bestScore !== null && bestScore >= 70
  const canRetake = hasAttempts && !hasPassed && remainingAttempts > 0

  const getStatusInfo = () => {
    if (completedAttempts.length === 0) {
      return {
        badge: <Badge variant="secondary">{t('not_started')}</Badge>,
        status: 'not-started' as const
      }
    }
    if (bestScore !== null && bestScore >= 70) {
      return {
        badge: <Badge variant="default" className="bg-green-500 text-white">
          <Trophy className="h-3 w-3" />
          {language === 'ar' ? 'نجح' : 'Passed'}
        </Badge>,
        status: 'passed' as const
      }
    }
    return {
      badge: <Badge variant="destructive">{language === 'ar' ? 'يحتاج تحسين' : 'Needs Improvement'}</Badge>,
      status: 'needs-improvement' as const
    }
  }

  const { badge, status } = getStatusInfo()

  // Language-aware styling
  const isArabic = quiz.language === 'ar' || language === 'ar'
  const textDirection = direction
  const languageClasses = getLanguageClasses(language)

  return (
    <Card className={`hover:shadow-md transition-all duration-200 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0" dir={textDirection}>
            <CardTitle className={`text-lg font-semibold text-gray-900 mb-1 ${languageClasses}`}>
              {quiz.title}
            </CardTitle>
            {quiz.description && (
              <p className={`text-sm text-gray-600 line-clamp-2 ${languageClasses}`}>
                {quiz.description}
              </p>
            )}
          </div>
          {badge}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Quiz Metadata */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(quiz.timeLimitMinutes)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Brain className="h-4 w-4" />
              <span>{quiz.questions?.length || 0} {language === 'ar' ? 'أسئلة' : 'questions'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Target className="h-4 w-4" />
              <span>{quiz.language.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* End Date Information */}
        {quiz.endDate && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className={`flex items-center space-x-2 text-sm ${isArabic ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className={`text-amber-800 font-medium ${languageClasses}`}>
                {language === 'ar' ? 'ينتهي في:' : 'Ends on:'}
              </span>
              <span className="text-amber-700">
                {new Date(quiz.endDate).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        )}

        {/* Attempt Statistics */}
        {completedAttempts.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className={`flex items-center justify-between text-sm ${isArabic ? 'flex-row-reverse' : ''}`}>
              <span className={`text-gray-600 ${languageClasses}`}>{language === 'ar' ? 'أفضل نتيجة:' : 'Best Score:'}</span>
              <span className={`font-semibold ${bestScore !== null && bestScore >= 70 ? 'text-green-600' : 'text-orange-600'}`}>
                {bestScore}%
              </span>
            </div>
            <div className={`flex items-center justify-between text-sm ${isArabic ? 'flex-row-reverse' : ''}`}>
              <span className={`text-gray-600 ${languageClasses}`}>{language === 'ar' ? 'المحاولات:' : 'Attempts:'}</span>
              <span className="font-medium text-gray-900">
                {attempts.length}/{quiz.maxAttempts === -1 ? '∞' : quiz.maxAttempts}
              </span>
            </div>
            {completedAttempts.length > 1 && (
              <div className={`flex items-center justify-between text-sm ${isArabic ? 'flex-row-reverse' : ''}`}>
                <span className={`text-gray-600 ${languageClasses}`}>{language === 'ar' ? 'متوسط النتيجة:' : 'Average Score:'}</span>
                <span className="font-medium text-gray-900">
                  {Math.round(completedAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / completedAttempts.length)}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          {completedAttempts.length === 0 ? (
            <Button
              onClick={() => onStartQuiz(quiz.id)}
              disabled={isStartingQuiz}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50"
              size="lg"
            >
              {isStartingQuiz ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isStartingQuiz
                ? (language === 'ar' ? 'جاري البدء...' : 'Starting...')
                : t('start_quiz')
              }
            </Button>
          ) : canRetake ? (
            <Button
              onClick={() => onStartQuiz(quiz.id)}
              disabled={isStartingQuiz}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50"
              size="lg"
            >
              {isStartingQuiz ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              {isStartingQuiz
                ? (language === 'ar' ? 'جاري البدء...' : 'Starting...')
                : t('retake_quiz')
              }
            </Button>
          ) : hasPassed ? (
            <div className="text-center py-3 px-4 bg-green-100 rounded-lg">
              <span className={`text-sm text-green-600 font-medium ${languageClasses}`}>
                {language === 'ar' ? 'تم اجتياز الاختبار' : 'Quiz Passed'}
              </span>
              <div className={`text-xs text-green-500 mt-1 ${languageClasses}`}>
                {language === 'ar' ? 'النتيجة النهائية:' : 'Final score:'} {bestScore}%
              </div>
            </div>
          ) : remainingAttempts <= 0 ? (
            <div className="text-center py-3 px-4 bg-gray-100 rounded-lg">
              <span className={`text-sm text-gray-600 font-medium ${languageClasses}`}>
                {language === 'ar' ? 'تم الوصول للحد الأقصى من المحاولات' : 'Maximum attempts reached'}
              </span>
              {bestScore !== null && (
                <div className={`text-xs text-gray-500 mt-1 ${languageClasses}`}>
                  {language === 'ar' ? 'النتيجة النهائية:' : 'Final score:'} {bestScore}%
                </div>
              )}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

interface QuizStatsProps {
  quizzes: Quiz[]
  userQuizAttempts: Record<string, any[]>
}

const QuizStats: React.FC<QuizStatsProps> = ({ quizzes, userQuizAttempts }) => {
  const { language } = useLanguage()

  const totalQuizzes = Array.isArray(quizzes) ? quizzes.length : 0
  const completedQuizzes = Array.isArray(quizzes) ? quizzes.filter(quiz => {
    const attempts = userQuizAttempts[quiz.id] || []
    const completedAttempts = attempts.filter(attempt => attempt.isCompleted)
    return completedAttempts.some(attempt => attempt.score >= 70)
  }).length : 0

  const passedQuizzes = Array.isArray(quizzes) ? quizzes.filter(quiz => {
    const attempts = userQuizAttempts[quiz.id] || []
    const completedAttempts = attempts.filter(attempt => attempt.isCompleted)
    return completedAttempts.some(attempt => attempt.score >= 70)
  }).length : 0

  const averageScore = Array.isArray(quizzes) && quizzes.length > 0 ? quizzes.reduce((sum, quiz) => {
    const attempts = userQuizAttempts[quiz.id] || []
    const completedAttempts = attempts.filter(attempt => attempt.isCompleted)
    if (completedAttempts.length === 0) return sum
    const bestScore = Math.max(...completedAttempts.map(attempt => attempt.score))
    return sum + bestScore
  }, 0) / quizzes.filter(quiz => {
    const attempts = userQuizAttempts[quiz.id] || []
    return attempts.some(attempt => attempt.isCompleted)
  }).length : 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card className="text-center">
        <CardContent className="pt-4">
          <div className="text-2xl font-bold text-blue-600">{totalQuizzes}</div>
          <div className={`text-sm text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'إجمالي الاختبارات' : 'Total Quizzes'}
          </div>
        </CardContent>
      </Card>

      <Card className="text-center">
        <CardContent className="pt-4">
          <div className="text-2xl font-bold text-green-600">{passedQuizzes}</div>
          <div className={`text-sm text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'نجح' : 'Passed'}
          </div>
        </CardContent>
      </Card>

      <Card className="text-center">
        <CardContent className="pt-4">
          <div className="text-2xl font-bold text-orange-600">{completedQuizzes}</div>
          <div className={`text-sm text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'مكتمل' : 'Completed'}
          </div>
        </CardContent>
      </Card>

      <Card className="text-center">
        <CardContent className="pt-4">
          <div className="text-2xl font-bold text-purple-600">
            {isNaN(averageScore) ? '0' : Math.round(averageScore)}%
          </div>
          <div className={`text-sm text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'متوسط النتيجة' : 'Avg Score'}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface AwarenessLabProps {
  user?: {
    id: string;
    role: 'customer' | 'expert' | 'trainer' | 'admin';
    firstName: string;
    lastName: string;
  } | null;
}

export const AwarenessLab: React.FC<AwarenessLabProps> = ({ user }) => {
  const { language } = useLanguage()
  const t = useLocalizedText()
  const [startingQuizId, setStartingQuizId] = React.useState<string | null>(null)
  const [isRetryingQuiz, setIsRetryingQuiz] = React.useState(false)

  // Role-based functionality
  const isExpert = user?.role === 'expert'
  const isCustomer = user?.role === 'customer'
  const isAdmin = user?.role === 'admin'

  const {
    quizzes,
    userQuizAttempts,
    loadingStates,
    isOffline,
    pendingOperations,
    pagination
  } = useAwarenessLabStore()

  const currentQuiz = useCurrentQuiz()
  const currentAttempt = useCurrentAttempt()
  const currentResults = useCurrentResults()
  const currentProgress = useCurrentProgress()
  const showResults = useShowResults()

  const {
    fetchQuizzes,
    startQuiz,
    clearError,
    reset,
    retryQuiz,
    hideQuizResults,
    loadMoreQuizzes,
    goToPage
  } = useAwarenessLabActions()

  const isLoading = useAwarenessLabLoading()
  const error = useAwarenessLabError()

  // Load quizzes on component mount
  useEffect(() => {
    fetchQuizzes()
  }, [fetchQuizzes])

  // Filter quizzes based on user role and permissions
  const filteredQuizzes = Array.isArray(quizzes) ? quizzes.filter(quiz => {
    // All users can see published quizzes
    if (!quiz.isPublished) return false;

    // Check if quiz has ended
    if (quiz.endDate && new Date(quiz.endDate) < new Date()) {
      // Experts might still want to see expired quizzes for reference
      return isExpert || isAdmin;
    }

    return true;
  }) : []

  // Role-specific welcome message for the lab
  const getLabWelcomeMessage = () => {
    if (language === 'ar') {
      if (isExpert) {
        return 'اختبر معرفتك وساعد في تطوير المحتوى التعليمي'
      } else if (isCustomer) {
        return 'اختبر معرفتك في الأمن السيبراني من خلال الاختبارات التفاعلية'
      }
      return 'اختبر معرفتك في الأمن السيبراني'
    } else {
      if (isExpert) {
        return 'Test your knowledge and help develop educational content'
      } else if (isCustomer) {
        return 'Test your cybersecurity knowledge with interactive quizzes'
      }
      return 'Test your cybersecurity knowledge with interactive quizzes'
    }
  }

  const handleStartQuiz = async (quizId: string) => {
    try {
      setStartingQuizId(quizId)
      await startQuiz(quizId)
    } catch (error) {
      console.error('Failed to start quiz:', error)
    } finally {
      setStartingQuizId(null)
    }
  }

  const handleBackToQuizList = () => {
    reset()
  }

  const handleRetryQuiz = async () => {
    try {
      setIsRetryingQuiz(true)
      await retryQuiz()
    } catch (error) {
      console.error('Failed to retry quiz:', error)
    } finally {
      setIsRetryingQuiz(false)
    }
  }

  const handleBackToQuizzesFromResults = () => {
    hideQuizResults()
    reset()
  }

  // If showing results, display the results component
  if (showResults && currentQuiz && currentAttempt && currentResults && currentProgress) {
    return (
      <QuizResults
        quiz={currentQuiz}
        attempt={currentAttempt}
        results={currentResults}
        progress={currentProgress}
        onRetry={handleRetryQuiz}
        onBackToQuizzes={handleBackToQuizzesFromResults}
      />
    )
  }

  // If currently taking a quiz, show the quiz attempt interface
  if (currentQuiz && currentAttempt && !showResults) {
    return (
      <QuizAttempt
        quiz={currentQuiz}
        attempt={currentAttempt}
        onBack={handleBackToQuizList}
      />
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <button
            onClick={clearError}
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold text-gray-900 flex items-center space-x-2 ${language === 'ar' ? 'font-arabic flex-row-reverse space-x-reverse' : ''}`}>
            <Brain className={`h-6 w-6 ${isExpert ? 'text-purple-600' : 'text-blue-600'}`} />
            <span>{language === 'ar' ? 'مختبر الوعي' : 'Awareness Lab'}</span>
            {isExpert && (
              <Badge variant="outline" className="ml-2 text-purple-700 border-purple-300 bg-purple-50">
                {language === 'ar' ? 'خبير' : 'Expert'}
              </Badge>
            )}
          </h2>
          <p className={`text-gray-600 mt-1 ${language === 'ar' ? 'font-arabic text-right' : ''}`}>
            {getLabWelcomeMessage()}
          </p>
        </div>

        {filteredQuizzes.length > 0 && (
          <div className={`flex items-center space-x-2 text-sm text-gray-600 ${language === 'ar' ? 'font-arabic flex-row-reverse space-x-reverse' : ''}`}>
            <Timer className="h-4 w-4" />
            <span>
              {language === 'ar'
                ? `${filteredQuizzes.length} اختبار متاح`
                : `${filteredQuizzes.length} quizzes available`
              }
              {isExpert && Array.isArray(quizzes) && quizzes.length !== filteredQuizzes.length && (
                <span className="text-purple-600 ml-1">
                  {language === 'ar'
                    ? ` (${quizzes.length - filteredQuizzes.length} منتهي الصلاحية)`
                    : ` (${quizzes.length - filteredQuizzes.length} expired)`
                  }
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Statistics Overview */}
      {filteredQuizzes.length > 0 && (
        <QuizStats quizzes={filteredQuizzes} userQuizAttempts={userQuizAttempts} />
      )}

      {/* Quiz Grid */}
      <LoadingState
        isLoading={loadingStates.quizzes}
        error={error}
        isEmpty={filteredQuizzes.length === 0}
        emptyMessage={
          language === 'ar' ? (
            isExpert
              ? 'لا توجد اختبارات متاحة حالياً. قد تكون جميع الاختبارات منتهية الصلاحية.'
              : 'لا توجد اختبارات متاحة حالياً'
          ) : (
            isExpert
              ? 'No quizzes available at the moment. All quizzes may be expired.'
              : 'No quizzes available at the moment'
          )
        }
        retryAction={fetchQuizzes}
        loadingComponent={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <QuizLoadingState key={i} />
            ))}
          </div>
        }
      >
        {/* Offline indicator */}
        {isOffline && (
          <Alert className="mb-4">
            <WifiOff className="w-4 h-4" />
            <AlertDescription>
              {language === 'ar'
                ? 'أنت غير متصل بالإنترنت. قد لا تعمل بعض الميزات بشكل صحيح.'
                : 'You are offline. Some features may not work properly.'
              }
              {pendingOperations.length > 0 && (
                <span className="ml-2">
                  {language === 'ar'
                    ? `${pendingOperations.length} عملية في انتظار المزامنة`
                    : `${pendingOperations.length} operations pending sync`
                  }
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Role-based information for experts */}
        {isExpert && Array.isArray(quizzes) && quizzes.length > filteredQuizzes.length && (
          <Alert className="mb-4">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              {language === 'ar'
                ? `يتم إخفاء ${quizzes.length - filteredQuizzes.length} اختبار منتهي الصلاحية. كخبير، يمكنك الوصول إليها للمراجعة.`
                : `${quizzes.length - filteredQuizzes.length} expired quizzes are hidden. As an expert, you can access them for review.`
              }
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              attempts={userQuizAttempts[quiz.id] || []}
              onStartQuiz={handleStartQuiz}
              isStartingQuiz={startingQuizId === quiz.id}
            />
          ))}
        </div>

        {/* Pagination */}
        {filteredQuizzes.length > 0 && (
          <QuizPagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            hasMore={pagination.hasMore}
            isLoading={loadingStates.quizzes}
            onPageChange={goToPage}
            onLoadMore={loadMoreQuizzes}
            className="mt-8"
          />
        )}
      </LoadingState>
    </div >
  )
}

export default AwarenessLab
