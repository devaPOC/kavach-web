'use client'
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, Trash2, FileText as FileTemplate, Clock, Users, Globe } from 'lucide-react'
import { useAdminAwarenessStore, type QuizTemplate } from '@/lib/stores/admin-awareness-store'

interface TemplateDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: QuizTemplate | null
  onTemplateDeleted: () => void
}

export default function TemplateDeleteDialog({ 
  open, 
  onOpenChange, 
  template,
  onTemplateDeleted 
}: TemplateDeleteDialogProps) {
  const { isLoading, actions: { deleteTemplate } } = useAdminAwarenessStore()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!template) return

    setIsDeleting(true)
    try {
      const success = await deleteTemplate(template.id)
      
      if (success) {
        onTemplateDeleted()
      }
    } catch (error) {
      console.error('Failed to delete template:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancel = () => {
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Template
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. The template will be permanently removed from the system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive rounded-lg">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-medium text-destructive">Warning</h4>
              <p className="text-sm text-destructive mt-1">
                Deleting this template will permanently remove it from the system. 
                {template.usageCount > 0 && (
                  <span className="font-medium">
                    {' '}This template has been used {template.usageCount} time{template.usageCount !== 1 ? 's' : ''} to create quizzes.
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Template Details */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <FileTemplate className="h-4 w-4" />
                    {template.name}
                  </h3>
                  {template.description && (
                    <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={getLanguageBadgeColor(template.templateConfig.language)}>
                    <Globe className="h-3 w-3 mr-1" />
                    {template.templateConfig.language === 'ar' ? 'Arabic' : 'English'}
                  </Badge>
                  <Badge className={getUsageBadgeColor(template.usageCount)}>
                    {getUsageLabel(template.usageCount)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>{template.templateConfig.timeLimitMinutes} minutes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    <span>{template.templateConfig.maxAttempts} attempts</span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground/80">
                  Created {new Date(template.createdAt).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Impact Notice */}
          {template.usageCount > 0 && (
            <div className="p-3 bg-accent/10 border border-accent/50 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                <div className="text-sm text-accent">
                  <p className="font-medium">Impact on existing quizzes:</p>
                  <p className="mt-1">
                    Quizzes created from this template will continue to work normally. 
                    Only the template itself will be deleted.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}