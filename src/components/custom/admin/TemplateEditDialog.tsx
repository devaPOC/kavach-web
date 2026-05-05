'use client'
import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Clock, Users, FileText, Globe, CheckCircle, X, Edit } from 'lucide-react'
import { useAdminAwarenessStore, type QuizTemplate, type CreateTemplateRequest } from '@/lib/stores/admin-awareness-store'

interface TemplateEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: QuizTemplate | null
  onTemplateUpdated: () => void
}

const questionTypeOptions = [
  { value: 'mcq', label: 'Multiple Choice Questions', description: 'Single correct answer from multiple options' },
  { value: 'true_false', label: 'True/False Questions', description: 'Binary choice questions' },
  { value: 'multiple_select', label: 'Multiple Select Questions', description: 'Multiple correct answers possible' }
]

export default function TemplateEditDialog({ 
  open, 
  onOpenChange, 
  template,
  onTemplateUpdated 
}: TemplateEditDialogProps) {
  const { isLoading, actions: { updateTemplate } } = useAdminAwarenessStore()
  
  const [formData, setFormData] = useState<CreateTemplateRequest>({
    name: '',
    description: '',
    templateConfig: {
      timeLimitMinutes: 15,
      maxAttempts: 3,
      language: 'en',
      questionTypes: ['mcq'],
      defaultQuestionCount: 10
    }
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize form data when template changes
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description || '',
        templateConfig: { ...template.templateConfig }
      })
      setErrors({})
    }
  }, [template])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleConfigChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      templateConfig: {
        ...prev.templateConfig,
        [field]: value
      }
    }))
    
    // Clear error when user makes changes
    if (errors[`templateConfig.${field}`]) {
      setErrors(prev => ({ ...prev, [`templateConfig.${field}`]: '' }))
    }
  }

  const handleQuestionTypeToggle = (questionType: string) => {
    const currentTypes = formData.templateConfig.questionTypes
    const newTypes = currentTypes.includes(questionType)
      ? currentTypes.filter(type => type !== questionType)
      : [...currentTypes, questionType]
    
    handleConfigChange('questionTypes', newTypes)
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required'
    } else if (formData.name.length < 3) {
      newErrors.name = 'Template name must be at least 3 characters'
    } else if (formData.name.length > 100) {
      newErrors.name = 'Template name must be less than 100 characters'
    }

    // Validate description
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters'
    }

    // Validate time limit
    if (formData.templateConfig.timeLimitMinutes < 1) {
      newErrors['templateConfig.timeLimitMinutes'] = 'Time limit must be at least 1 minute'
    } else if (formData.templateConfig.timeLimitMinutes > 180) {
      newErrors['templateConfig.timeLimitMinutes'] = 'Time limit cannot exceed 180 minutes'
    }

    // Validate max attempts
    if (formData.templateConfig.maxAttempts < 1) {
      newErrors['templateConfig.maxAttempts'] = 'Max attempts must be at least 1'
    } else if (formData.templateConfig.maxAttempts > 10) {
      newErrors['templateConfig.maxAttempts'] = 'Max attempts cannot exceed 10'
    }

    // Validate question types
    if (formData.templateConfig.questionTypes.length === 0) {
      newErrors['templateConfig.questionTypes'] = 'At least one question type must be selected'
    }

    // Validate default question count
    if (formData.templateConfig.defaultQuestionCount < 1) {
      newErrors['templateConfig.defaultQuestionCount'] = 'Default question count must be at least 1'
    } else if (formData.templateConfig.defaultQuestionCount > 50) {
      newErrors['templateConfig.defaultQuestionCount'] = 'Default question count cannot exceed 50'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!template || !validateForm()) {
      return
    }

    try {
      const result = await updateTemplate(template.id, formData)
      
      if (result) {
        onTemplateUpdated()
      }
    } catch (error) {
      console.error('Failed to update template:', error)
    }
  }

  const handleCancel = () => {
    if (template) {
      // Reset form to original template data
      setFormData({
        name: template.name,
        description: template.description || '',
        templateConfig: { ...template.templateConfig }
      })
    }
    setErrors({})
    onOpenChange(false)
  }

  if (!template) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Quiz Template
          </DialogTitle>
          <DialogDescription>
            Update the template settings and configuration.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Info */}
          <Card className="bg-primary/10 border-primary/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary">Template Usage</p>
                  <p className="text-xs text-primary">
                    This template has been used {template.usageCount} time{template.usageCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <Badge className="bg-primary/10 text-primary border-primary/50">
                  {template.usageCount === 0 ? 'Unused' : `${template.usageCount} uses`}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Basic Information</CardTitle>
              <CardDescription>
                Update basic details about your template
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Cybersecurity Basics Template"
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe what this template is for and when to use it..."
                  rows={3}
                  className={errors.description ? 'border-destructive' : ''}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {formData.description?.length || 0}/500 characters
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Template Configuration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Template Configuration</CardTitle>
              <CardDescription>
                Update default values that will be applied to quizzes created from this template
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Language and Basic Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Default Language *</Label>
                  <Select
                    value={formData.templateConfig.language}
                    onValueChange={(value: 'en' | 'ar') => handleConfigChange('language', value)}
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
                  <Label htmlFor="defaultQuestionCount">Default Question Count *</Label>
                  <Input
                    id="defaultQuestionCount"
                    type="number"
                    min="1"
                    max="50"
                    value={formData.templateConfig.defaultQuestionCount}
                    onChange={(e) => handleConfigChange('defaultQuestionCount', parseInt(e.target.value) || 1)}
                    className={errors['templateConfig.defaultQuestionCount'] ? 'border-destructive' : ''}
                  />
                  {errors['templateConfig.defaultQuestionCount'] && (
                    <p className="text-sm text-destructive">{errors['templateConfig.defaultQuestionCount']}</p>
                  )}
                </div>
              </div>

              {/* Time and Attempts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeLimitMinutes">Time Limit (minutes) *</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/80" />
                    <Input
                      id="timeLimitMinutes"
                      type="number"
                      min="1"
                      max="180"
                      value={formData.templateConfig.timeLimitMinutes}
                      onChange={(e) => handleConfigChange('timeLimitMinutes', parseInt(e.target.value) || 1)}
                      className={`pl-10 ${errors['templateConfig.timeLimitMinutes'] ? 'border-destructive' : ''}`}
                    />
                  </div>
                  {errors['templateConfig.timeLimitMinutes'] && (
                    <p className="text-sm text-destructive">{errors['templateConfig.timeLimitMinutes']}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxAttempts">Max Attempts *</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/80" />
                    <Input
                      id="maxAttempts"
                      type="number"
                      min="1"
                      max="10"
                      value={formData.templateConfig.maxAttempts}
                      onChange={(e) => handleConfigChange('maxAttempts', parseInt(e.target.value) || 1)}
                      className={`pl-10 ${errors['templateConfig.maxAttempts'] ? 'border-destructive' : ''}`}
                    />
                  </div>
                  {errors['templateConfig.maxAttempts'] && (
                    <p className="text-sm text-destructive">{errors['templateConfig.maxAttempts']}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Question Types */}
              <div className="space-y-3">
                <div>
                  <Label>Supported Question Types *</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select the question types that can be used in quizzes created from this template
                  </p>
                </div>
                
                {errors['templateConfig.questionTypes'] && (
                  <p className="text-sm text-destructive">{errors['templateConfig.questionTypes']}</p>
                )}

                <div className="space-y-3">
                  {questionTypeOptions.map((option) => (
                    <div
                      key={option.value}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        formData.templateConfig.questionTypes.includes(option.value)
                          ? 'border-primary/50 bg-primary/10'
                          : 'border-border hover:border-border'
                      }`}
                      onClick={() => handleQuestionTypeToggle(option.value)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-foreground">{option.label}</h4>
                            {formData.templateConfig.questionTypes.includes(option.value) && (
                              <CheckCircle className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Selected Types Summary */}
                {formData.templateConfig.questionTypes.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">Selected:</span>
                    {formData.templateConfig.questionTypes.map((type) => {
                      const option = questionTypeOptions.find(opt => opt.value === type)
                      return (
                        <Badge key={type} variant="secondary" className="flex items-center gap-1">
                          {option?.label}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleQuestionTypeToggle(type)
                            }}
                            className="ml-1 hover:bg-muted/80 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Update Template
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}