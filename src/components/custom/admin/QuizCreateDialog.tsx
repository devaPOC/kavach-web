'use client'
import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  Layout as Template,
  Plus,
  Calendar
} from 'lucide-react'
import MultilingualEditor from './MultilingualEditor'
import QuestionBuilder, { QuestionData } from './QuestionBuilder'
import { TargetAudienceSelect } from '../awareness-lab/TargetAudienceSelect'

interface QuizTemplate {
  id: string
  name: string
  description?: string
  templateConfig: {
    timeLimitMinutes: number
    maxAttempts: number
    language: 'en' | 'ar'
    questionTypes: string[]
    defaultQuestionCount: number
  }
  usageCount: number
}

interface QuizCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onQuizCreated: () => void
}

export default function QuizCreateDialog({
  open,
  onOpenChange,
  onQuizCreated
}: QuizCreateDialogProps) {
  const [currentTab, setCurrentTab] = useState('basic')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [templates, setTemplates] = useState<QuizTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')

  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    language: 'en' as 'en' | 'ar',
    targetAudience: 'customer' as 'customer' | 'expert',
    timeLimitMinutes: 30,
    maxAttempts: 3,
    templateId: undefined as string | undefined,
    endDate: undefined as Date | undefined
  })

  const [questions, setQuestions] = useState<QuestionData[]>([])

  // Load templates when dialog opens
  useEffect(() => {
    if (open) {
      fetchTemplates()
    }
  }, [open])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        title: '',
        description: '',
        language: 'en',
        targetAudience: 'customer',
        timeLimitMinutes: 30,
        maxAttempts: 3,
        templateId: undefined,
        endDate: undefined
      })
      setQuestions([])
      setCurrentTab('basic')
      setError('')
      setSelectedTemplate('')
    }
  }, [open])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/v1/admin/quiz-templates', {
        credentials: 'same-origin'
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setTemplates(result.data)
        }
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err)
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setFormData(prev => ({
        ...prev,
        language: template.templateConfig.language,
        timeLimitMinutes: template.templateConfig.timeLimitMinutes,
        maxAttempts: template.templateConfig.maxAttempts,
        templateId: templateId
      }))
      setSelectedTemplate(templateId)

      // Create placeholder questions based on template
      const placeholderQuestions: QuestionData[] = []
      for (let i = 0; i < template.templateConfig.defaultQuestionCount; i++) {
        const questionType = template.templateConfig.questionTypes[
          i % template.templateConfig.questionTypes.length
        ] as 'mcq' | 'true_false' | 'multiple_select'

        placeholderQuestions.push({
          questionType,
          questionData: {
            question: '',
            options: questionType !== 'true_false' ? ['', ''] : undefined,
            explanation: ''
          },
          correctAnswers: [],
          orderIndex: i
        })
      }
      setQuestions(placeholderQuestions)
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

  const handleSubmit = async (asDraft: boolean = false) => {
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
          questionType: q.questionType,
          questionData: q.questionData,
          correctAnswers: q.correctAnswers,
          orderIndex: q.orderIndex
        })),
        isPublished: !asDraft
      }

      const response = await fetch('/api/v1/admin/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (result.success) {
        onQuizCreated()
      } else {
        setError(result.error || 'Failed to create quiz')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create quiz')
    } finally {
      setLoading(false)
    }
  }

  const canProceedToQuestions = formData.title.trim() &&
    formData.timeLimitMinutes >= 1 &&
    formData.maxAttempts >= 1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create New Quiz
          </DialogTitle>
          <DialogDescription>
            Create a new cybersecurity awareness quiz for your users
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
            {/* Template Selection */}
            {templates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Template className="h-4 w-4" />
                    Start from Template (Optional)
                  </CardTitle>
                  <CardDescription>
                    Choose a template to pre-fill quiz settings and structure
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{template.name}</span>
                            <Badge variant="outline" className="ml-2">
                              Used {template.usageCount} times
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedTemplate && (
                    <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/50">
                      <div className="text-sm text-primary">
                        Template applied! Settings and question structure have been pre-filled.
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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

                <TargetAudienceSelect
                  value={formData.targetAudience}
                  onChange={(value) => setFormData(prev => ({ ...prev, targetAudience: value }))}
                  className="space-y-2"
                />
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
                Next: Add Questions
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
                Preview Quiz
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
                <CardDescription>
                  Review your quiz before creating it
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quiz Info Summary */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-foreground/80">Title</div>
                    <div className="text-sm">{formData.title}</div>
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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleSubmit(true)}
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save as Draft
                </Button>
                <Button
                  onClick={() => handleSubmit(false)}
                  disabled={loading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {loading ? 'Creating...' : 'Create & Publish'}
                </Button>
              </div>
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
