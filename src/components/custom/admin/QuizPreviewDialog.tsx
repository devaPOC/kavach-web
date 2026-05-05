'use client'
import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Eye, 
  Clock, 
  Users, 
  Globe, 
  FileText,
  CheckCircle,
  XCircle,
  CheckSquare,
  Play
} from 'lucide-react'

interface Quiz {
  id: string
  title: string
  description?: string
  language: 'en' | 'ar'
  timeLimitMinutes: number
  maxAttempts: number
  isPublished: boolean
  questionCount: number
  createdBy: string
  createdAt: string
  updatedAt: string
  templateId?: string
}

interface QuizPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quiz: Quiz | null
}

export default function QuizPreviewDialog({ 
  open, 
  onOpenChange, 
  quiz
}: QuizPreviewDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [quizData, setQuizData] = useState<any>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [userAnswers, setUserAnswers] = useState<Record<string, string[]>>({})
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isTimerActive, setIsTimerActive] = useState(false)

  // Load quiz details when dialog opens
  useEffect(() => {
    if (open && quiz) {
      loadQuizDetails()
    }
  }, [open, quiz])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setQuizData(null)
      setCurrentQuestion(0)
      setUserAnswers({})
      setTimeRemaining(0)
      setIsTimerActive(false)
      setError('')
    }
  }, [open])

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isTimerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setIsTimerActive(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isTimerActive, timeRemaining])

  const loadQuizDetails = async () => {
    if (!quiz) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/v1/admin/quizzes/${quiz.id}`, {
        credentials: 'same-origin'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        setQuizData(result.data)
        setTimeRemaining(result.data.timeLimitMinutes * 60)
      } else {
        setError(result.error || 'Failed to load quiz details')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load quiz details')
    } finally {
      setLoading(false)
    }
  }

  const startPreview = () => {
    setCurrentQuestion(0)
    setUserAnswers({})
    setTimeRemaining(quizData.timeLimitMinutes * 60)
    setIsTimerActive(true)
  }

  const handleAnswerChange = (questionId: string, answer: string, isMultiple: boolean = false) => {
    setUserAnswers(prev => {
      if (isMultiple) {
        const currentAnswers = prev[questionId] || []
        const newAnswers = currentAnswers.includes(answer)
          ? currentAnswers.filter(a => a !== answer)
          : [...currentAnswers, answer]
        return { ...prev, [questionId]: newAnswers }
      } else {
        return { ...prev, [questionId]: [answer] }
      }
    })
  }

  const nextQuestion = () => {
    if (currentQuestion < (quizData?.questions?.length || 0) - 1) {
      setCurrentQuestion(prev => prev + 1)
    }
  }

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1)
    }
  }

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'mcq': return <CheckCircle className="h-4 w-4" />
      case 'true_false': return <XCircle className="h-4 w-4" />
      case 'multiple_select': return <CheckSquare className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getQuestionTypeName = (type: string) => {
    switch (type) {
      case 'mcq': return 'Multiple Choice'
      case 'true_false': return 'True/False'
      case 'multiple_select': return 'Multiple Select'
      default: return 'Unknown'
    }
  }

  if (!quiz) return null

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3">Loading quiz preview...</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Error</DialogTitle>
            <DialogDescription>Failed to load quiz preview</DialogDescription>
          </DialogHeader>
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!quizData) return null

  const currentQuestionData = quizData.questions?.[currentQuestion]
  const isQuizStarted = isTimerActive || timeRemaining < quizData.timeLimitMinutes * 60

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Quiz Preview: {quiz.title}
          </DialogTitle>
          <DialogDescription>
            Preview how this quiz will appear to users
          </DialogDescription>
        </DialogHeader>

        {!isQuizStarted ? (
          // Quiz Introduction
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {quizData.title}
                </CardTitle>
                {quizData.description && (
                  <DialogDescription className="text-base">
                    {quizData.description}
                  </DialogDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quiz Information */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-sm font-medium">{quizData.questions?.length || 0}</div>
                      <div className="text-xs text-gray-500">Questions</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-sm font-medium">{quizData.timeLimitMinutes} min</div>
                      <div className="text-xs text-gray-500">Time Limit</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-sm font-medium">{quizData.maxAttempts}</div>
                      <div className="text-xs text-gray-500">Max Attempts</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-gray-500" />
                    <div>
                      <Badge className={quizData.language === 'ar' ? 
                        'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
                        {quizData.language === 'ar' ? 'Arabic' : 'English'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Instructions */}
                <div className="space-y-2">
                  <h4 className="font-medium">Instructions:</h4>
                  <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                    <li>You have {quizData.timeLimitMinutes} minutes to complete this quiz</li>
                    <li>Answer all questions to the best of your ability</li>
                    <li>You can navigate between questions using the Next/Previous buttons</li>
                    <li>The quiz will auto-submit when time expires</li>
                    <li>Make sure to review your answers before the time runs out</li>
                  </ul>
                </div>

                <div className="flex justify-center pt-4">
                  <Button onClick={startPreview} className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Start Quiz Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Quiz Questions
          <div className="space-y-6">
            {/* Timer and Progress */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className={`font-mono text-lg ${
                    timeRemaining < 300 ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
                
                <div className="text-sm text-gray-500">
                  Question {currentQuestion + 1} of {quizData.questions?.length || 0}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${((currentQuestion + 1) / (quizData.questions?.length || 1)) * 100}%` 
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Current Question */}
            {currentQuestionData && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Question {currentQuestion + 1}
                    </CardTitle>
                    <Badge variant="outline" className="flex items-center gap-1">
                      {getQuestionTypeIcon(currentQuestionData.questionType)}
                      {getQuestionTypeName(currentQuestionData.questionType)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div 
                    className={`text-base ${
                      quizData.language === 'ar' ? 'text-right' : 'text-left'
                    }`}
                    dir={quizData.language === 'ar' ? 'rtl' : 'ltr'}
                  >
                    {currentQuestionData.questionData.question}
                  </div>

                  {/* Answer Options */}
                  <div className="space-y-3">
                    {currentQuestionData.questionType === 'true_false' ? (
                      <div className="space-y-2">
                        {['true', 'false'].map((option) => (
                          <label key={option} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                              type="radio"
                              name={`question-${currentQuestionData.id}`}
                              value={option}
                              checked={userAnswers[currentQuestionData.id]?.includes(option)}
                              onChange={() => handleAnswerChange(currentQuestionData.id, option)}
                              className="w-4 h-4"
                            />
                            <span className="capitalize">{option}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(currentQuestionData.questionData.options || []).map((option: string, index: number) => (
                          <label key={index} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                            {currentQuestionData.questionType === 'mcq' ? (
                              <input
                                type="radio"
                                name={`question-${currentQuestionData.id}`}
                                value={index.toString()}
                                checked={userAnswers[currentQuestionData.id]?.includes(index.toString())}
                                onChange={() => handleAnswerChange(currentQuestionData.id, index.toString())}
                                className="w-4 h-4"
                              />
                            ) : (
                              <Checkbox
                                checked={userAnswers[currentQuestionData.id]?.includes(index.toString())}
                                onCheckedChange={() => handleAnswerChange(currentQuestionData.id, index.toString(), true)}
                              />
                            )}
                            <span 
                              className={quizData.language === 'ar' ? 'text-right' : 'text-left'}
                              dir={quizData.language === 'ar' ? 'rtl' : 'ltr'}
                            >
                              {String.fromCharCode(65 + index)}. {option}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Navigation */}
                  <div className="flex justify-between pt-4">
                    <Button
                      variant="outline"
                      onClick={prevQuestion}
                      disabled={currentQuestion === 0}
                    >
                      Previous
                    </Button>
                    
                    <div className="text-sm text-gray-500">
                      {userAnswers[currentQuestionData.id]?.length > 0 ? (
                        <span className="text-green-600">✓ Answered</span>
                      ) : (
                        <span>Not answered</span>
                      )}
                    </div>
                    
                    <Button
                      onClick={nextQuestion}
                      disabled={currentQuestion === (quizData.questions?.length || 0) - 1}
                    >
                      Next
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Question Navigation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Question Navigation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-10 gap-2">
                  {(quizData.questions || []).map((_: any, index: number) => (
                    <Button
                      key={index}
                      variant={index === currentQuestion ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentQuestion(index)}
                      className={`w-8 h-8 p-0 ${
                        userAnswers[quizData.questions[index]?.id]?.length > 0 
                          ? 'bg-green-50 border-green-200 text-green-700' 
                          : ''
                      }`}
                    >
                      {index + 1}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          {isQuizStarted && (
            <Button
              variant="outline"
              onClick={() => {
                setIsTimerActive(false)
                setCurrentQuestion(0)
                setUserAnswers({})
                setTimeRemaining(quizData.timeLimitMinutes * 60)
              }}
            >
              Reset Preview
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>
            Close Preview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}