'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Button } from '@/components/ui'
import { Alert, AlertDescription } from '@/components/ui'
import { 
  Trophy, 
  Target, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RotateCcw,
  ArrowLeft,
  Award,
  Brain,
  Timer,
  Star,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react'
import { 
  useAwarenessLabStore,
  useAwarenessLabActions,
  type Quiz,
  type QuizAttempt
} from '@/lib/stores/awareness-lab-store'

interface QuizAttemptResult {
  attemptId: string
  score: number
  totalQuestions: number
  correctAnswers: number
  timeTakenSeconds: number
  isCompleted: boolean
  results: Array<{
    questionId: string
    userAnswers: string[]
    correctAnswers: string[]
    isCorrect: boolean
    explanation?: string
  }>
}

interface QuizProgress {
  quizId: string
  attemptCount: number
  maxAttempts: number
  canAttempt: boolean
  bestScore: number
  hasCompletedAttempts: boolean
  lastAttemptDate?: Date
}

interface QuizResultsProps {
  quiz: Quiz
  attempt: QuizAttempt
  results: QuizAttemptResult
  progress: QuizProgress
  onRetry: () => void
  onBackToQuizzes: () => void
}

interface ScoreDisplayProps {
  score: number
  totalQuestions: number
  correctAnswers: number
  isArabic?: boolean
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ 
  score, 
  totalQuestions, 
  correctAnswers, 
  isArabic = false 
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 70) return 'text-blue-600 bg-blue-50 border-blue-200'
    if (score >= 50) return 'text-orange-600 bg-orange-50 border-orange-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <Trophy className="h-8 w-8 text-green-600" />
    if (score >= 70) return <Award className="h-8 w-8 text-blue-600" />
    if (score >= 50) return <Target className="h-8 w-8 text-orange-600" />
    return <AlertTriangle className="h-8 w-8 text-red-600" />
  }

  const getScoreMessage = (score: number) => {
    if (score >= 90) return 'Excellent! Outstanding performance!'
    if (score >= 70) return 'Great job! You passed the quiz!'
    if (score >= 50) return 'Good effort! Room for improvement.'
    return 'Keep learning! Try again to improve.'
  }

  return (
    <Card className={`border-2 ${getScoreColor(score)}`}>
      <CardContent className="pt-6">
        <div className={`text-center space-y-4 ${isArabic ? 'font-arabic' : ''}`}>
          <div className="flex justify-center">
            {getScoreIcon(score)}
          </div>
          
          <div className="space-y-2">
            <div className="text-4xl font-bold">
              {score}%
            </div>
            <div className="text-lg font-medium">
              {getScoreMessage(score)}
            </div>
          </div>
          
          <div className="flex justify-center space-x-6 text-sm">
            <div className="text-center">
              <div className="font-semibold text-green-600">{correctAnswers}</div>
              <div className="text-gray-600">Correct</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-red-600">{totalQuestions - correctAnswers}</div>
              <div className="text-gray-600">Incorrect</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-blue-600">{totalQuestions}</div>
              <div className="text-gray-600">Total</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface AttemptHistoryProps {
  attempts: QuizAttempt[]
  currentAttemptId: string
  isArabic?: boolean
}

const AttemptHistory: React.FC<AttemptHistoryProps> = ({ 
  attempts, 
  currentAttemptId, 
  isArabic = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const sortedAttempts = attempts
    .filter(attempt => attempt.isCompleted)
    .sort((a, b) => new Date(b.completedAt || b.startedAt).getTime() - new Date(a.completedAt || a.startedAt).getTime())

  const bestScore = Math.max(...sortedAttempts.map(attempt => attempt.score))
  const averageScore = sortedAttempts.length > 0 
    ? Math.round(sortedAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / sortedAttempts.length)
    : 0

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (sortedAttempts.length <= 1) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className={`text-lg ${isArabic ? 'font-arabic' : ''}`}>
            Attempt History
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1"
          >
            <span>{isExpanded ? 'Hide' : 'Show'}</span>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{sortedAttempts.length}</div>
            <div className="text-sm text-gray-600">Attempts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{bestScore}%</div>
            <div className="text-sm text-gray-600">Best Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{averageScore}%</div>
            <div className="text-sm text-gray-600">Average</div>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-3">
            {sortedAttempts.map((attempt, index) => {
              const isCurrent = attempt.id === currentAttemptId
              const isBest = attempt.score === bestScore
              
              return (
                <div
                  key={attempt.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isCurrent 
                      ? 'border-blue-200 bg-blue-50' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isCurrent 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-300 text-gray-700'
                    }`}>
                      {index + 1}
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-semibold ${
                          attempt.score >= 70 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {attempt.score}%
                        </span>
                        {isBest && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                        {isCurrent && <Badge variant="secondary" className="text-xs">Current</Badge>}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatDate(attempt.completedAt || attempt.startedAt)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(attempt.timeTakenSeconds)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

interface QuestionFeedbackProps {
  question: any
  result: QuizAttemptResult['results'][0]
  questionIndex: number
  isArabic?: boolean
}

const QuestionFeedback: React.FC<QuestionFeedbackProps> = ({ 
  question, 
  result, 
  questionIndex,
  isArabic = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const textDirection = isArabic ? 'rtl' : 'ltr'

  // Helper function to format answers for display
  const formatAnswerForDisplay = (answer: string, questionType: string): string => {
    switch (questionType) {
      case 'true_false':
        if (answer === 'true') return 'True'
        if (answer === 'false') return 'False'
        return answer
      default:
        return answer
    }
  }

  // Format answers for display
  const userAnswersText = result.userAnswers.map(answer => 
    formatAnswerForDisplay(answer, question.questionType)
  )

  // Format correct answers for display
  const correctAnswersText = result.correctAnswers.map(answer => 
    formatAnswerForDisplay(answer, question.questionType)
  )
  
  return (
    <Card className={`border-l-4 ${result.isCorrect ? 'border-l-green-500' : 'border-l-red-500'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1" dir={textDirection}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              result.isCorrect 
                ? 'bg-green-100 text-green-600' 
                : 'bg-red-100 text-red-600'
            }`}>
              {result.isCorrect ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-sm font-medium text-gray-600">
                  Question {questionIndex + 1}
                </span>
                <Badge variant={result.isCorrect ? 'default' : 'destructive'} className="text-xs">
                  {result.isCorrect ? 'Correct' : 'Incorrect'}
                </Badge>
              </div>
              
              <p className={`text-gray-900 ${isArabic ? 'font-arabic' : ''}`}>
                {question.questionData.question}
              </p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0 ml-2"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0 space-y-4" dir={textDirection}>
          {/* User's Answer */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-1">
              <span>Your Answer:</span>
            </h4>
            <div className="space-y-1">
              {userAnswersText.map((answer, index) => (
                <div
                  key={index}
                  className={`p-2 rounded border ${
                    result.isCorrect 
                      ? 'border-green-200 bg-green-50 text-green-800'
                      : 'border-red-200 bg-red-50 text-red-800'
                  } ${isArabic ? 'font-arabic' : ''}`}
                >
                  {answer}
                </div>
              ))}
              {userAnswersText.length === 0 && (
                <div className="p-2 rounded border border-gray-200 bg-gray-50 text-gray-600 italic">
                  No answer provided
                </div>
              )}
            </div>
          </div>
          
          {/* Correct Answer */}
          {!result.isCorrect && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Correct Answer:</span>
              </h4>
              <div className="space-y-1">
                {correctAnswersText.map((answer, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded border border-green-200 bg-green-50 text-green-800 ${isArabic ? 'font-arabic' : ''}`}
                  >
                    {answer}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Explanation */}
          {result.explanation && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-1">
                <Info className="h-4 w-4 text-blue-600" />
                <span>Explanation:</span>
              </h4>
              <div className={`p-3 rounded border border-blue-200 bg-blue-50 text-blue-800 ${isArabic ? 'font-arabic' : ''}`}>
                {result.explanation}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

export const QuizResults: React.FC<QuizResultsProps> = ({
  quiz,
  attempt,
  results,
  progress,
  onRetry,
  onBackToQuizzes
}) => {
  const { userQuizAttempts } = useAwarenessLabStore()
  const { fetchUserAttempts } = useAwarenessLabActions()
  
  const [showAllQuestions, setShowAllQuestions] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  
  const isArabic = quiz.language === 'ar'
  const textDirection = isArabic ? 'rtl' : 'ltr'
  
  const attempts = userQuizAttempts[quiz.id] || []
  const isPassed = results.score >= 70
  
  // Show retake only if attempt !== 0 and user didn't pass (score < 70)
  const hasAttempts = progress.attemptCount > 0
  const canRetry = hasAttempts && !isPassed && progress.canAttempt
  
  // Load attempt history on mount
  useEffect(() => {
    fetchUserAttempts(quiz.id)
  }, [quiz.id, fetchUserAttempts])

  const handleRetry = async () => {
    try {
      setIsRetrying(true)
      await onRetry()
    } catch (error) {
      console.error('Failed to retry quiz:', error)
    } finally {
      setIsRetrying(false)
    }
  }
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }
  
  const incorrectQuestions = results.results.filter(r => !r.isCorrect)
  const questionsToShow = showAllQuestions ? results.results : incorrectQuestions
  
  return (
    <div className="max-w-4xl mx-auto space-y-6" dir={textDirection}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          onClick={onBackToQuizzes}
          variant="ghost"
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Quizzes</span>
        </Button>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Brain className="h-4 w-4" />
          <span>{quiz.title}</span>
        </div>
      </div>

      {/* Quiz Results Header */}
      <Card>
        <CardHeader>
          <CardTitle className={`text-xl ${isArabic ? 'font-arabic' : ''}`}>
            Quiz Results
          </CardTitle>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Timer className="h-4 w-4" />
              <span>Completed in {formatTime(results.timeTakenSeconds)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Target className="h-4 w-4" />
              <span>{quiz.language.toUpperCase()}</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Score Display */}
      <ScoreDisplay
        score={results.score}
        totalQuestions={results.totalQuestions}
        correctAnswers={results.correctAnswers}
        isArabic={isArabic}
      />

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className={`text-lg ${isArabic ? 'font-arabic' : ''}`}>
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{results.score}%</div>
              <div className="text-sm text-gray-600">Your Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{progress.bestScore}%</div>
              <div className="text-sm text-gray-600">Best Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{progress.attemptCount}</div>
              <div className="text-sm text-gray-600">Attempts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {progress.maxAttempts === -1 ? '∞' : progress.maxAttempts - progress.attemptCount}
              </div>
              <div className="text-sm text-gray-600">Remaining</div>
            </div>
          </div>
          
          {/* Progress Visualization */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress to 70% (Passing)</span>
              <span>{Math.min(results.score, 70)}/70%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  results.score >= 70 ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min((results.score / 70) * 100, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attempt History */}
      <AttemptHistory
        attempts={attempts}
        currentAttemptId={attempt.id}
        isArabic={isArabic}
      />

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {canRetry ? (
              <Button
                onClick={handleRetry}
                disabled={isRetrying}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center space-x-2 disabled:opacity-50"
                size="lg"
              >
                {isRetrying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                <span>{isRetrying ? 'Starting...' : 'Retake Quiz'}</span>
              </Button>
            ) : isPassed ? (
              <div className="flex-1 text-center py-3 px-4 bg-green-100 rounded-lg">
                <span className="text-sm text-green-600 font-medium">
                  Quiz Passed - No retake needed
                </span>
              </div>
            ) : !progress.canAttempt ? (
              <div className="flex-1 text-center py-3 px-4 bg-gray-100 rounded-lg">
                <span className="text-sm text-gray-600 font-medium">
                  Maximum attempts reached
                </span>
              </div>
            ) : null}
            
            <Button
              onClick={onBackToQuizzes}
              variant="outline"
              className="flex-1 flex items-center justify-center space-x-2"
              size="lg"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Quizzes</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Question Feedback */}
      {results.results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className={`text-lg ${isArabic ? 'font-arabic' : ''}`}>
                Question Review
              </CardTitle>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllQuestions(!showAllQuestions)}
                >
                  {showAllQuestions ? 'Show Incorrect Only' : 'Show All Questions'}
                </Button>
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              {showAllQuestions 
                ? `Showing all ${results.results.length} questions`
                : `Showing ${incorrectQuestions.length} incorrect questions`
              }
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {questionsToShow.length === 0 ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Excellent! You answered all questions correctly.
                </AlertDescription>
              </Alert>
            ) : (
              questionsToShow.map((result, index) => {
                const questionIndex = results.results.findIndex(r => r.questionId === result.questionId)
                const question = quiz.questions[questionIndex]
                
                return (
                  <QuestionFeedback
                    key={result.questionId}
                    question={question}
                    result={result}
                    questionIndex={questionIndex}
                    isArabic={isArabic}
                  />
                )
              })
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default QuizResults