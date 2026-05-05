'use client'
import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import {
  FileText,
  Clock,
  Users,
  Globe,
  Save,
  Eye,
  Edit,
  Calendar
} from 'lucide-react'
import MultilingualEditor from './MultilingualEditor'
import QuestionBuilder, { QuestionData } from './QuestionBuilder'

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

interface QuizEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quiz: Quiz | null
  onQuizUpdated: () => void
}

export default function QuizEditDialog({
  open,
  onOpenChange,
  quiz,
  onQuizUpdated
}: QuizEditDialogProps) {
  const [currentTab, setCurrentTab] = useState('basic')
  const [loading, setLoading] = useState(false)
  const [loadingQuiz, setLoadingQuiz] = useState(false)
  const [error, setError] = useState<string>('')

  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    language: 'en' as 'en' | 'ar',
    timeLimitMinutes: 30,
    maxAttempts: 3,
    isPublished: false,
    endDate: undefined as Date | undefined
  })

  const [questions, setQuestions] = useState<QuestionData[]>([])
  const [originalQuiz, setOriginalQuiz] = useState<any>(null)

  // Load quiz details when dialog opens
  useEffect(() => {
    if (open && quiz) {
      loadQuizDetails()
    }
  }, [open, quiz])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        title: '',
        description: '',
        language: 'en',
        timeLimitMinutes: 30,
        maxAttempts: 3,
        isPublished: false,
        endDate: undefined
      })
      setQuestions([])
      setCurrentTab('basic')
      setError('')
      setOriginalQuiz(null)
    }
  }, [open])

  const loadQuizDetails = async () => {
    if (!quiz) return

    setLoadingQuiz(true)
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
        const quizData = result.data
        setOriginalQuiz(quizData)

        setFormData({
          title: quizData.title || '',
          description: quizData.description || '',
          language: quizData.language || 'en',
          timeLimitMinutes: quizData.timeLimitMinutes || 30,
          maxAttempts: quizData.maxAttempts || 3,
          isPublished: quizData.isPublished || false,
          endDate: quizData.endDate ? new Date(quizData.endDate) : undefined
        })

        // Convert questions to the format expected by QuestionBuilder
        const formattedQuestions: QuestionData[] = (quizData.questions || []).map((q: any, index: number) => ({
          id: q.id,
          questionType: q.questionType,
          questionData: q.questionData,
          correctAnswers: q.correctAnswers,
          orderIndex: index
        }))

        setQuestions(formattedQuestions)
      } else {
        setError(result.error || 'Failed to load quiz details')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load quiz details')
    } finally {
      setLoadingQuiz(false)
    }
  }

  const validateForm = (): string[] => {
    const errors: string[] = []

    if (!formData.title.trim()) {
      errors.push('Quiz title is required')
    }

    if (formData.timeLimitMinutes < 1 || formData.timeLimitMinutes > 180) {
      errors.push('Time limit must be between 1 and 180 minutes')
    }

    if (formData.maxAttempts < 1 || formData.maxAttempts > 10) {
      errors.push('Max attempts must be between 1 and 10')
    }

    if (questions.length === 0) {
      errors.push('Quiz must have at least one question')
    }

    // Validate each question
    questions.forEach((question, index) => {
      if (!question.questionData.question.trim()) {
        errors.push(`Question ${index + 1}: Question text is required`)
      }

      if (question.questionType === 'true_false') {
        if (question.correctAnswers.length !== 1 ||
          !['true', 'false'].includes(question.correctAnswers[0]?.toLowerCase())) {
          errors.push(`Question ${index + 1}: Must have exactly one correct answer (true or false)`)
        }
      } else if (question.questionType === 'mcq' || question.questionType === 'multiple_select') {
        const options = question.questionData.options || []

        if (options.length < 2) {
          errors.push(`Question ${index + 1}: Must have at least 2 options`)
        }

        if (options.some(opt => !opt.trim())) {
          errors.push(`Question ${index + 1}: All options must have text`)
        }

        if (question.questionType === 'mcq' && question.correctAnswers.length !== 1) {
          errors.push(`Question ${index + 1}: Must have exactly one correct answer`)
        }

        if (question.questionType === 'multiple_select' && question.correctAnswers.length === 0) {
          errors.push(`Question ${index + 1}: Must have at least one correct answer`)
        }
      }
    })

    return errors
  }

  const handleSubmit = async () => {
    if (!quiz) return

    const errors = validateForm()
    if (errors.length > 0) {
      setError(errors.join('. '))
      return
    }

    setLoading(true)
    setError('')

    try {
      const payload = {
        ...formData,
        questions: questions.map(q => ({
          id: q.id, // Include ID for existing questions
          questionType: q.questionType,
          questionData: q.questionData,
          correctAnswers: q.correctAnswers,
          orderIndex: q.orderIndex
        }))
      }

      const response = await fetch(`/api/v1/admin/quizzes/${quiz.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (result.success) {
        onQuizUpdated()
      } else {
        setError(result.error || 'Failed to update quiz')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update quiz')
    } finally {
      setLoading(false)
    }
  }

  const canProceedToQuestions = formData.title.trim() &&
    formData.timeLimitMinutes >= 1 &&
    formData.maxAttempts >= 1

  if (loadingQuiz) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary/50"></div>
            <span className="ml-3">Loading quiz details...</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Quiz: {quiz?.title}
          </DialogTitle>
          <DialogDescription>
            Modify quiz settings and questions
          </DialogDescription>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="questions" disabled={!canProceedToQuestions}>
              Questions ({questions.length})
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={questions.length === 0}>
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            {/* Quiz Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quiz Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Badge className={formData.isPublished ?
                      'bg-secondary/10 text-secondary border-secondary/50' :
                      'bg-muted text-foreground border-border'}>
                      {formData.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                    <div className="text-sm text-muted-foreground mt-1">
                      {formData.isPublished ?
                        'This quiz is visible to users' :
                        'This quiz is not visible to users'}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setFormData(prev => ({ ...prev, isPublished: !prev.isPublished }))}
                  >
                    {formData.isPublished ? 'Unpublish' : 'Publish'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Basic Quiz Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quiz Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Quiz Title *</Label>
                  <MultilingualEditor
                    value={formData.title}
                    onChange={(value) => setFormData(prev => ({ ...prev, title: value }))}
                    language={formData.language}
                    placeholder="Enter quiz title..."
                    compact
                    maxLength={255}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <MultilingualEditor
                    value={formData.description}
                    onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
                    language={formData.language}
                    placeholder="Enter quiz description..."
                    maxLength={1000}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Primary Language *</Label>
                  <Select
                    value={formData.language}
                    onValueChange={(value: 'en' | 'ar') =>
                      setFormData(prev => ({ ...prev, language: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          English
                        </div>
                      </SelectItem>
                      <SelectItem value="ar">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Arabic
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Quiz Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quiz Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timeLimit">Time Limit (minutes) *</Label>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground/80" />
                      <Input
                        id="timeLimit"
                        type="number"
                        min="1"
                        max="180"
                        value={formData.timeLimitMinutes}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          timeLimitMinutes: parseInt(e.target.value) || 1
                        }))}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Between 1 and 180 minutes
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxAttempts">Max Attempts per User *</Label>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground/80" />
                      <Input
                        id="maxAttempts"
                        type="number"
                        min="1"
                        max="10"
                        value={formData.maxAttempts}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          maxAttempts: parseInt(e.target.value) || 1
                        }))}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Between 1 and 10 attempts
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date (Optional)</Label>
                  <DateTimePicker
                    value={formData.endDate}
                    onChange={(date) => setFormData(prev => ({
                      ...prev,
                      endDate: date
                    }))}
                    placeholder="Select quiz end date and time"
                    minDate={new Date()}
                  />
                  <div className="text-xs text-muted-foreground">
                    Quiz will be automatically disabled after this date
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={() => setCurrentTab('questions')}
                disabled={!canProceedToQuestions}
              >
                Next: Edit Questions
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="questions" className="space-y-6">
            <QuestionBuilder
              questions={questions}
              onChange={setQuestions}
              language={formData.language}
            />

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentTab('basic')}
              >
                Back to Basic Info
              </Button>
              <Button
                onClick={() => setCurrentTab('preview')}
                disabled={questions.length === 0}
              >
                Preview Changes
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Quiz Preview
                </CardTitle>
                <DialogDescription>
                  Review your changes before saving
                </DialogDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quiz Info Summary */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-foreground/80">Title</div>
                    <div className="text-sm">{formData.title}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground/80">Status</div>
                    <Badge className={formData.isPublished ?
                      'bg-secondary/10 text-secondary' : 'bg-muted text-foreground'}>
                      {formData.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground/80">Language</div>
                    <Badge className={formData.language === 'ar' ?
                      'bg-primary/10 text-primary' : 'bg-primary/10 text-primary'}>
                      {formData.language === 'ar' ? 'Arabic' : 'English'}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground/80">Time Limit</div>
                    <div className="text-sm">{formData.timeLimitMinutes} minutes</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground/80">Max Attempts</div>
                    <div className="text-sm">{formData.maxAttempts} attempts</div>
                  </div>
                  {formData.endDate && (
                    <div>
                      <div className="text-sm font-medium text-foreground/80">End Date</div>
                      <div className="text-sm">{formData.endDate.toLocaleDateString()} at {formData.endDate.toLocaleTimeString()}</div>
                    </div>
                  )}
                </div>

                {formData.description && (
                  <div>
                    <div className="text-sm font-medium text-foreground/80 mb-2">Description</div>
                    <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded">
                      {formData.description}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Questions Preview */}
                <div>
                  <div className="text-sm font-medium text-foreground/80 mb-3">
                    Questions ({questions.length})
                  </div>
                  <div className="space-y-3">
                    {questions.map((question, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium">Question {index + 1}</span>
                          <Badge variant="outline" className="text-xs">
                            {question.questionType === 'mcq' ? 'Multiple Choice' :
                              question.questionType === 'true_false' ? 'True/False' :
                                'Multiple Select'}
                          </Badge>
                          {question.id && (
                            <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                              Existing
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm mb-2">{question.questionData.question}</div>

                        {question.questionType === 'true_false' ? (
                          <div className="text-xs text-muted-foreground">
                            Correct answer: {question.correctAnswers[0] || 'Not set'}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {(question.questionData.options || []).map((option, optIndex) => (
                              <div key={optIndex} className="text-xs flex items-center gap-2">
                                <span className={
                                  question.correctAnswers.includes(optIndex.toString())
                                    ? 'text-secondary font-medium'
                                    : 'text-muted-foreground'
                                }>
                                  {String.fromCharCode(65 + optIndex)}. {option}
                                </span>
                                {question.correctAnswers.includes(optIndex.toString()) && (
                                  <Badge variant="outline" className="text-xs bg-secondary/10 text-secondary">
                                    Correct
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentTab('questions')}
              >
                Back to Questions
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
