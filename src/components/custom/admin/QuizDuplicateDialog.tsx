'use client'
import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Copy, 
  FileText, 
  Clock, 
  Users, 
  Globe,
  Layout as Template,
  Save
} from 'lucide-react'
import MultilingualEditor from './MultilingualEditor'

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

interface QuizDuplicateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quiz: Quiz | null
  onQuizDuplicated: () => void
}

export default function QuizDuplicateDialog({ 
  open, 
  onOpenChange, 
  quiz,
  onQuizDuplicated 
}: QuizDuplicateDialogProps) {
  const [loading, setLoading] = useState(false)
  const [loadingQuiz, setLoadingQuiz] = useState(false)
  const [error, setError] = useState<string>('')
  const [quizData, setQuizData] = useState<any>(null)
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    language: 'en' as 'en' | 'ar',
    timeLimitMinutes: 30,
    maxAttempts: 3,
    copyQuestions: true,
    createAsTemplate: false,
    templateName: ''
  })

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
        copyQuestions: true,
        createAsTemplate: false,
        templateName: ''
      })
      setQuizData(null)
      setError('')
    }
  }, [open])

  // Update form when quiz data loads
  useEffect(() => {
    if (quizData && quiz) {
      setFormData(prev => ({
        ...prev,
        title: `Copy of ${quizData.title}`,
        description: quizData.description || '',
        language: quizData.language || 'en',
        timeLimitMinutes: quizData.timeLimitMinutes || 30,
        maxAttempts: quizData.maxAttempts || 3,
        templateName: `${quizData.title} Template`
      }))
    }
  }, [quizData, quiz])

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
        setQuizData(result.data)
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
    
    if (formData.createAsTemplate && !formData.templateName.trim()) {
      errors.push('Template name is required when creating as template')
    }
    
    return errors
  }

  const handleDuplicate = async () => {
    if (!quiz || !quizData) return

    const errors = validateForm()
    if (errors.length > 0) {
      setError(errors.join('. '))
      return
    }

    setLoading(true)
    setError('')

    try {
      // First create the duplicated quiz
      const quizPayload = {
        title: formData.title,
        description: formData.description,
        language: formData.language,
        timeLimitMinutes: formData.timeLimitMinutes,
        maxAttempts: formData.maxAttempts,
        questions: formData.copyQuestions ? quizData.questions.map((q: any) => ({
          questionType: q.questionType,
          questionData: q.questionData,
          correctAnswers: q.correctAnswers,
          orderIndex: q.orderIndex
        })) : [],
        isPublished: false // Always create as draft
      }

      const quizResponse = await fetch('/api/v1/admin/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify(quizPayload)
      })

      const quizResult = await quizResponse.json()

      if (!quizResult.success) {
        throw new Error(quizResult.error || 'Failed to duplicate quiz')
      }

      // If creating as template, create the template
      if (formData.createAsTemplate) {
        const templatePayload = {
          name: formData.templateName,
          description: `Template created from: ${quizData.title}`,
          templateConfig: {
            timeLimitMinutes: formData.timeLimitMinutes,
            maxAttempts: formData.maxAttempts,
            language: formData.language,
            questionTypes: [...new Set(quizData.questions.map((q: any) => q.questionType))],
            defaultQuestionCount: quizData.questions.length
          }
        }

        const templateResponse = await fetch('/api/v1/admin/quiz-templates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'same-origin',
          body: JSON.stringify(templatePayload)
        })

        const templateResult = await templateResponse.json()
        
        if (!templateResult.success) {
          console.warn('Failed to create template:', templateResult.error)
          // Don't fail the whole operation if template creation fails
        }
      }

      onQuizDuplicated()
    } catch (err: any) {
      setError(err.message || 'Failed to duplicate quiz')
    } finally {
      setLoading(false)
    }
  }

  if (!quiz) return null

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicate Quiz: {quiz.title}
          </DialogTitle>
          <DialogDescription>
            Create a copy of this quiz with customizable settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Original Quiz Information */}
          <div className="p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground/80">Original Quiz</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Title</div>
                <div className="font-medium">{quiz.title}</div>
              </div>
              
              <div>
                <div className="text-muted-foreground">Questions</div>
                <div className="font-medium">{quiz.questionCount}</div>
              </div>
              
              <div>
                <div className="text-muted-foreground">Language</div>
                <Badge className={quiz.language === 'ar' ? 
                  'bg-primary/10 text-primary' : 'bg-primary/10 text-primary'}>
                  {quiz.language === 'ar' ? 'Arabic' : 'English'}
                </Badge>
              </div>
              
              <div>
                <div className="text-muted-foreground">Settings</div>
                <div className="font-medium">{quiz.timeLimitMinutes}min, {quiz.maxAttempts} attempts</div>
              </div>
            </div>
          </div>

          {/* Duplication Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="copyQuestions"
                checked={formData.copyQuestions}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, copyQuestions: checked as boolean }))
                }
              />
              <Label htmlFor="copyQuestions" className="text-sm font-medium">
                Copy all questions and answers
              </Label>
            </div>
            
            <div className="text-xs text-muted-foreground ml-6">
              {formData.copyQuestions 
                ? `Will copy all ${quiz.questionCount} questions with their answers and explanations`
                : 'Will create an empty quiz with the same settings'
              }
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="createAsTemplate"
                checked={formData.createAsTemplate}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, createAsTemplate: checked as boolean }))
                }
              />
              <Label htmlFor="createAsTemplate" className="text-sm font-medium">
                Also create as quiz template
              </Label>
            </div>
            
            <div className="text-xs text-muted-foreground ml-6">
              Creates a reusable template based on this quiz's structure and settings
            </div>
          </div>

          {/* New Quiz Settings */}
          <div className="space-y-4">
            <h4 className="font-medium">New Quiz Settings</h4>
            
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

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="language">Language *</Label>
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

              <div className="space-y-2">
                <Label htmlFor="timeLimit">Time Limit (min) *</Label>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxAttempts">Max Attempts *</Label>
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
              </div>
            </div>
          </div>

          {/* Template Settings */}
          {formData.createAsTemplate && (
            <div className="space-y-4 p-4 bg-primary/10 rounded-lg border border-primary/50">
              <div className="flex items-center gap-2">
                <Template className="h-4 w-4 text-primary" />
                <span className="font-medium text-primary">Template Settings</span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="templateName">Template Name *</Label>
                <Input
                  id="templateName"
                  value={formData.templateName}
                  onChange={(e) => setFormData(prev => ({ ...prev, templateName: e.target.value }))}
                  placeholder="Enter template name..."
                  maxLength={255}
                />
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDuplicate}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Duplicating...' : 'Duplicate Quiz'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}