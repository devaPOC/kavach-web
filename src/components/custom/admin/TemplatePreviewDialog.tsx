'use client'
import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  Eye, 
  FileText as FileTemplate, 
  Clock, 
  Users, 
  Globe, 
  CheckCircle, 
  TrendingUp,
  Settings,
  Copy
} from 'lucide-react'
import { type QuizTemplate } from '@/lib/stores/admin-awareness-store'

interface TemplatePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: QuizTemplate | null
}

const questionTypeLabels = {
  'mcq': 'Multiple Choice Questions',
  'true_false': 'True/False Questions',
  'multiple_select': 'Multiple Select Questions'
}

export default function TemplatePreviewDialog({ 
  open, 
  onOpenChange, 
  template
}: TemplatePreviewDialogProps) {

  const handleClose = () => {
    onOpenChange(false)
  }

  const handleUseTemplate = () => {
    // This would typically navigate to quiz creation with the template pre-selected
    // For now, we'll just close the dialog
    console.log('Use template:', template?.id)
    onOpenChange(false)
  }

  if (!template) {
    return null
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Template Preview
          </DialogTitle>
          <DialogDescription>
            Review template configuration and settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <FileTemplate className="h-5 w-5" />
                    {template.name}
                  </CardTitle>
                  {template.description && (
                    <CardDescription className="mt-2 text-base">
                      {template.description}
                    </CardDescription>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-4">
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
          </Card>

          {/* Template Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Template Configuration
              </CardTitle>
              <CardDescription>
                Default settings that will be applied to new quizzes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Settings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Time Limit</p>
                      <p className="text-sm text-blue-700">
                        {template.templateConfig.timeLimitMinutes} minutes
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <Users className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">Max Attempts</p>
                      <p className="text-sm text-green-700">
                        {template.templateConfig.maxAttempts} attempts per user
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <Globe className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-purple-900">Language</p>
                      <p className="text-sm text-purple-700">
                        {template.templateConfig.language === 'ar' ? 'Arabic (RTL)' : 'English (LTR)'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <FileTemplate className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="font-medium text-orange-900">Default Questions</p>
                      <p className="text-sm text-orange-700">
                        {template.templateConfig.defaultQuestionCount} questions
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Question Types */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Supported Question Types
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {template.templateConfig.questionTypes.map((type) => (
                    <div
                      key={type}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {questionTypeLabels[type as keyof typeof questionTypeLabels]}
                        </p>
                        <p className="text-sm text-gray-600">
                          {type === 'mcq' && 'Single correct answer from multiple options'}
                          {type === 'true_false' && 'Binary choice questions'}
                          {type === 'multiple_select' && 'Multiple correct answers possible'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Template Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Template Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-700">Created</p>
                  <p className="text-gray-600">
                    {new Date(template.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Last Updated</p>
                  <p className="text-gray-600">
                    {new Date(template.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Usage Count</p>
                  <p className="text-gray-600">
                    {template.usageCount === 0 
                      ? 'Never used' 
                      : `Used ${template.usageCount} time${template.usageCount !== 1 ? 's' : ''}`
                    }
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Template ID</p>
                  <p className="text-gray-600 font-mono text-xs">
                    {template.id}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Instructions */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Copy className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">How to use this template</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    When creating a new quiz, select this template to automatically apply these settings. 
                    You can then customize the quiz title, description, and add questions while keeping 
                    the template's configuration as defaults.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
          >
            Close
          </Button>
          <Button
            onClick={handleUseTemplate}
            className="flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            Use This Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}