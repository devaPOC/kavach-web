'use client'
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Clock, Users, FileText, Globe, CheckCircle, X } from 'lucide-react'
import { useAdminAwarenessStore, type CreateTemplateRequest } from '@/lib/stores/admin-awareness-store'

interface TemplateCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTemplateCreated: () => void
}

const questionTypeOptions = [
  { value: 'mcq', label: 'Multiple Choice Questions', description: 'Single correct answer from multiple options' },
  { value: 'true_false', label: 'True/False Questions', description: 'Binary choice questions' },
  { value: 'multiple_select', label: 'Multiple Select Questions', description: 'Multiple correct answers possible' }
]

export default function TemplateCreateDialog({ 
  open, 
  onOpenChange, 
  onTemplateCreated 
}: TemplateCreateDialogProps) {
  const { isLoading, actions: { createTemplate } } = useAdminAwarenessStore()
  
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
    
    if (!validateForm()) {
      return
    }

    try {
      const result = await createTemplate(formData)
      
      if (result) {
        // Reset form
        setFormData({
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
        setErrors({})
        onTemplateCreated()
      }
    } catch (error) {
      console.error('Failed to create template:', error)
    }
  }

  const handleCancel = () => {
    // Reset form
    setFormData({
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
    setErrors({})
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Quiz Template
          </DialogTitle>
          <DialogDescription>
            Create a reusable template with predefined settings for efficient quiz creation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Basic Information</CardTitle>
              <CardDescription>
                Provide basic details about your template
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
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name}</p>
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
                  className={errors.description ? 'border-red-500' : ''}
                />
                {errors.description && (
                  <p className="text-sm text-red-600">{errors.description}</p>
                )}
                <p className="text-xs text-gray-500">
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
                Set default values that will be applied to quizzes created from this template
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
                    className={errors['templateConfig.defaultQuestionCount'] ? 'border-red-500' : ''}
                  />
                  {errors['templateConfig.defaultQuestionCount'] && (
                    <p className="text-sm text-red-600">{errors['templateConfig.defaultQuestionCount']}</p>
                  )}
                </div>
              </div>

              {/* Time and Attempts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeLimitMinutes">Time Limit (minutes) *</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="timeLimitMinutes"
                      type="number"
                      min="1"
                      max="180"
                      value={formData.templateConfig.timeLimitMinutes}
                      onChange={(e) => handleConfigChange('timeLimitMinutes', parseInt(e.target.value) || 1)}
                      className={`pl-10 ${errors['templateConfig.timeLimitMinutes'] ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors['templateConfig.timeLimitMinutes'] && (
                    <p className="text-sm text-red-600">{errors['templateConfig.timeLimitMinutes']}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxAttempts">Max Attempts *</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="maxAttempts"
                      type="number"
                      min="1"
                      max="10"
                      value={formData.templateConfig.maxAttempts}
                      onChange={(e) => handleConfigChange('maxAttempts', parseInt(e.target.value) || 1)}
                      className={`pl-10 ${errors['templateConfig.maxAttempts'] ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors['templateConfig.maxAttempts'] && (
                    <p className="text-sm text-red-600">{errors['templateConfig.maxAttempts']}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Question Types */}
              <div className="space-y-3">
                <div>
                  <Label>Supported Question Types *</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Select the question types that can be used in quizzes created from this template
                  </p>
                </div>
                
                {errors['templateConfig.questionTypes'] && (
                  <p className="text-sm text-red-600">{errors['templateConfig.questionTypes']}</p>
                )}

                <div className="space-y-3">
                  {questionTypeOptions.map((option) => (
                    <div
                      key={option.value}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        formData.templateConfig.questionTypes.includes(option.value)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleQuestionTypeToggle(option.value)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900">{option.label}</h4>
                            {formData.templateConfig.questionTypes.includes(option.value) && (
                              <CheckCircle className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Selected Types Summary */}
                {formData.templateConfig.questionTypes.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-600">Selected:</span>
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
                            className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
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
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Create Template
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}