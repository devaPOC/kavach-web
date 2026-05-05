'use client'
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Trash2 } from 'lucide-react'

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

interface QuizDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quiz: Quiz | null
  onQuizDeleted: () => void
}

export default function QuizDeleteDialog({ 
  open, 
  onOpenChange, 
  quiz,
  onQuizDeleted 
}: QuizDeleteDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const handleDelete = async () => {
    if (!quiz) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/v1/admin/quizzes/${quiz.id}`, {
        method: 'DELETE',
        credentials: 'same-origin'
      })

      const result = await response.json()

      if (result.success) {
        onQuizDeleted()
      } else {
        setError(result.error || 'Failed to delete quiz')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete quiz')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setError('')
    onOpenChange(false)
  }

  if (!quiz) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Quiz
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the quiz and all associated data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quiz Information */}
          <div className="p-4 bg-muted/50 rounded-lg border">
            <div className="space-y-2">
              <div>
                <div className="text-sm font-medium text-foreground/80">Quiz Title</div>
                <div className="text-sm">{quiz.title}</div>
              </div>
              
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <Badge className={quiz.isPublished ? 
                    'bg-secondary/10 text-secondary border-secondary/50' : 
                    'bg-muted text-foreground border-border'}>
                    {quiz.isPublished ? 'Published' : 'Draft'}
                  </Badge>
                </div>
                
                <div>
                  <div className="text-xs text-muted-foreground">Questions</div>
                  <div className="text-sm font-medium">{quiz.questionCount}</div>
                </div>
                
                <div>
                  <div className="text-xs text-muted-foreground">Language</div>
                  <Badge className={quiz.language === 'ar' ? 
                    'bg-primary/10 text-primary border-primary/50' : 
                    'bg-primary/10 text-primary border-primary/50'}>
                    {quiz.language === 'ar' ? 'Arabic' : 'English'}
                  </Badge>
                </div>
              </div>
              
              <div>
                <div className="text-xs text-muted-foreground">Created</div>
                <div className="text-sm">{new Date(quiz.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          {/* Warning Messages */}
          <div className="space-y-3">
            {quiz.isPublished && (
              <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-destructive">
                    <div className="font-medium">Published Quiz Warning</div>
                    <div>This quiz is currently published and visible to users. Deleting it will remove access for all users.</div>
                  </div>
                </div>
              </div>
            )}

            <div className="p-3 bg-accent/10 border border-accent/50 rounded-md">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                <div className="text-sm text-accent">
                  <div className="font-medium">Data Loss Warning</div>
                  <div>All quiz questions, user attempts, and analytics data will be permanently deleted.</div>
                </div>
              </div>
            </div>
          </div>

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
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {loading ? 'Deleting...' : 'Delete Quiz'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}