'use client'
import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Search,
  FileText as FileTemplate,
  Clock,
  Users,
  Globe,
  CheckCircle,
  TrendingUp,
  X,
  Eye
} from 'lucide-react'
import { useAdminAwarenessStore, type QuizTemplate, type CreateQuizRequest } from '@/lib/stores/admin-awareness-store'

interface TemplateSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTemplateSelected: (quizData: CreateQuizRequest) => void
  onSkipTemplate: () => void
}

export default function TemplateSelector({
  open,
  onOpenChange,
  onTemplateSelected,
  onSkipTemplate
}: TemplateSelectorProps) {
  const {
    quizTemplates,
    isLoading,
    actions: { fetchTemplates, useTemplate }
  } = useAdminAwarenessStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<QuizTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<QuizTemplate | null>(null)

  useEffect(() => {
    if (open) {
      fetchTemplates()
    }
  }, [open, fetchTemplates])

  const handleTemplateSelect = (template: QuizTemplate) => {
    setSelectedTemplate(template)
  }

  const handleUseTemplate = () => {
    if (!selectedTemplate) return

    const quizData = useTemplate(selectedTemplate.id)
    if (quizData) {
      onTemplateSelected(quizData)
      handleClose()
    }
  }

  const resetState = () => {
    setSelectedTemplate(null)
    setPreviewTemplate(null)
    setSearchTerm('')
  }

  const handleSkip = () => {
    onSkipTemplate()
    resetState()
    onOpenChange(false)
  }

  const handleClose = () => {
    resetState()
    onOpenChange(false)
  }

  const getLanguageBadgeColor = (language: string) => {
    return language === 'ar'
      ? 'bg-purple-100 text-purple-800 border-purple-200'
      : 'bg-blue-100 text-blue-800 border-blue-200'
  }

  const getUsageBadgeColor = (usageCount: number) => {
    if (usageCount === 0) return 'bg-gray-100 text-gray-800 border-gray-200'
    if (usageCount < 5) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-green-100 text-green-800 border-green-200'
  }

  const getUsageLabel = (usageCount: number) => {
    if (usageCount === 0) return 'Unused'
    if (usageCount === 1) return '1 use'
    return `${usageCount} uses`
  }

  // Filter templates based on search
  const filteredTemplates = quizTemplates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Sort templates by usage count (most used first) and then by creation date
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    if (a.usageCount !== b.usageCount) {
      return b.usageCount - a.usageCount
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <>
      <Dialog open={open} onOpenChange={(newOpen) => {
        if (!newOpen) {
          resetState()
        }
        onOpenChange(newOpen)
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileTemplate className="h-5 w-5" />
              Choose a Template
            </DialogTitle>
            <DialogDescription>
              Select a template to start with predefined settings, or skip to create a quiz from scratch.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Templates Grid */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : sortedTemplates.length === 0 ? (
                <div className="text-center py-8">
                  <FileTemplate className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm ? 'No templates found' : 'No templates available'}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm
                      ? 'Try adjusting your search terms.'
                      : 'Create your first template to get started with reusable quiz configurations.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sortedTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${selectedTemplate?.id === template.id
                          ? 'ring-2 ring-blue-500 bg-blue-50'
                          : 'hover:bg-gray-50'
                        }`}
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                              {template.name}
                            </CardTitle>
                            {template.description && (
                              <CardDescription className="text-sm text-gray-600 line-clamp-2">
                                {template.description}
                              </CardDescription>
                            )}
                          </div>
                          {selectedTemplate?.id === template.id && (
                            <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={getLanguageBadgeColor(template.templateConfig.language)}>
                            <Globe className="h-3 w-3 mr-1" />
                            {template.templateConfig.language === 'ar' ? 'Arabic' : 'English'}
                          </Badge>
                          <Badge className={getUsageBadgeColor(template.usageCount)}>
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {getUsageLabel(template.usageCount)}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <div className="space-y-2 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            <span>{template.templateConfig.timeLimitMinutes} minutes</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3" />
                            <span>{template.templateConfig.maxAttempts} max attempts</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileTemplate className="h-3 w-3" />
                            <span>{template.templateConfig.defaultQuestionCount} questions</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setPreviewTemplate(template)
                            }}
                            className="flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Preview
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Template Preview */}
            {selectedTemplate && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900 mb-1">Selected Template</h4>
                      <p className="text-sm text-blue-700">{selectedTemplate.name}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-blue-600">
                        <span>{selectedTemplate.templateConfig.timeLimitMinutes}min</span>
                        <span>{selectedTemplate.templateConfig.maxAttempts} attempts</span>
                        <span>{selectedTemplate.templateConfig.language === 'ar' ? 'Arabic' : 'English'}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTemplate(null)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Separator />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleSkip}
            >
              Skip Template
            </Button>
            <Button
              onClick={handleUseTemplate}
              disabled={!selectedTemplate}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Use Selected Template
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>

      {/* Template Preview Dialog - must be outside parent Dialog to avoid conflicts */}
      <Dialog open={!!previewTemplate} onOpenChange={(isOpen) => {
        if (!isOpen) setPreviewTemplate(null)
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Template Preview
            </DialogTitle>
          </DialogHeader>

          {previewTemplate && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileTemplate className="h-4 w-4" />
                    {previewTemplate.name}
                  </CardTitle>
                  {previewTemplate.description && (
                    <CardDescription>{previewTemplate.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700">Time Limit</p>
                      <p className="text-gray-600">{previewTemplate.templateConfig.timeLimitMinutes} minutes</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Max Attempts</p>
                      <p className="text-gray-600">{previewTemplate.templateConfig.maxAttempts}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Language</p>
                      <p className="text-gray-600">
                        {previewTemplate.templateConfig.language === 'ar' ? 'Arabic' : 'English'}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Default Questions</p>
                      <p className="text-gray-600">{previewTemplate.templateConfig.defaultQuestionCount}</p>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div>
                    <p className="font-medium text-gray-700 mb-2">Question Types</p>
                    <div className="flex flex-wrap gap-2">
                      {previewTemplate.templateConfig.questionTypes.map((type) => (
                        <Badge key={type} variant="secondary">
                          {type === 'mcq' && 'Multiple Choice'}
                          {type === 'true_false' && 'True/False'}
                          {type === 'multiple_select' && 'Multiple Select'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (previewTemplate) {
                  setSelectedTemplate(previewTemplate)
                  setPreviewTemplate(null)
                }
              }}
              className="flex items-center gap-2"
              disabled={!previewTemplate}
            >
              <CheckCircle className="h-4 w-4" />
              Select This Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
