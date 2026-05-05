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
      ? 'bg-primary/10 text-primary border-primary/50'
      : 'bg-primary/10 text-primary border-primary/50'
  }

  const getUsageBadgeColor = (usageCount: number) => {
    if (usageCount === 0) return 'bg-muted text-foreground border-border'
    if (usageCount < 5) return 'bg-accent/10 text-accent border-accent/50'
    return 'bg-secondary/10 text-secondary border-secondary/50'
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
                  <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/50">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-primary">Time Limit</p>
                      <p className="text-sm text-primary">
                        {template.templateConfig.timeLimitMinutes} minutes
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-secondary/10 rounded-lg border border-secondary/50">
                    <Users className="h-5 w-5 text-secondary" />
                    <div>
                      <p className="font-medium text-secondary">Max Attempts</p>
                      <p className="text-sm text-secondary">
                        {template.templateConfig.maxAttempts} attempts per user
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-lg border border-primary/50">
                    <Globe className="h-5 w-5 text-accent" />
                    <div>
                      <p className="font-medium text-primary">Language</p>
                      <p className="text-sm text-primary">
                        {template.templateConfig.language === 'ar' ? 'Arabic (RTL)' : 'English (LTR)'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-lg border border-accent/50">
                    <FileTemplate className="h-5 w-5 text-accent" />
                    <div>
                      <p className="font-medium text-accent">Default Questions</p>
                      <p className="text-sm text-accent">
                        {template.templateConfig.defaultQuestionCount} questions
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Question Types */}
              <div className="space-y-3">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Supported Question Types
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {template.templateConfig.questionTypes.map((type) => (
                    <div
                      key={type}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border"
                    >
                      <CheckCircle className="h-4 w-4 text-secondary" />
                      <div>
                        <p className="font-medium text-foreground">
                          {questionTypeLabels[type as keyof typeof questionTypeLabels]}
                        </p>
                        <p className="text-sm text-muted-foreground">
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
                  <p className="font-medium text-foreground/80">Created</p>
                  <p className="text-muted-foreground">
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
                  <p className="font-medium text-foreground/80">Last Updated</p>
                  <p className="text-muted-foreground">
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
                  <p className="font-medium text-foreground/80">Usage Count</p>
                  <p className="text-muted-foreground">
                    {template.usageCount === 0 
                      ? 'Never used' 
                      : `Used ${template.usageCount} time${template.usageCount !== 1 ? 's' : ''}`
                    }
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground/80">Template ID</p>
                  <p className="text-muted-foreground font-mono text-xs">
                    {template.id}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Instructions */}
          <Card className="bg-primary/10 border-primary/50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Copy className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium text-primary">How to use this template</h4>
                  <p className="text-sm text-primary mt-1">
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