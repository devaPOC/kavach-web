'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  MapPin,
  Users,
  Building,
  AlertTriangle
} from 'lucide-react'
import {
  AwarenessSessionRequestResponse,
  DURATION_LABELS,
  SESSION_MODE_LABELS,
  AUDIENCE_TYPE_LABELS
} from '@/types/awareness-session'

interface ExpertAwarenessSessionResponseDialogProps {
  request: AwarenessSessionRequestResponse
  action: 'accept' | 'decline'
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (notes?: string) => Promise<void>
}

export default function TrainerAwarenessSessionResponseDialog({
  request,
  action,
  open,
  onOpenChange,
  onSubmit
}: ExpertAwarenessSessionResponseDialogProps) {
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>('')

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      setError('')

      await onSubmit(notes.trim() || undefined)

      // Reset form
      setNotes('')
    } catch (err: any) {
      console.error('Error submitting response:', err)
      setError(err.message || 'Failed to submit response')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setNotes('')
    setError('')
    onOpenChange(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatAudienceTypes = (types: string[]) => {
    return types.map(type => AUDIENCE_TYPE_LABELS[type as keyof typeof AUDIENCE_TYPE_LABELS]).join(', ')
  }

  const isAccepting = action === 'accept'
  const actionIcon = isAccepting ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />
  const actionColor = isAccepting ? 'text-secondary' : 'text-destructive'
  const actionBgColor = isAccepting ? 'bg-secondary/10' : 'bg-destructive/10'
  const actionTitle = isAccepting ? 'Accept Session Request' : 'Decline Session Request'
  const actionDescription = isAccepting
    ? 'You are about to accept this awareness session request. This will confirm your availability and notify the requester.'
    : 'You are about to decline this awareness session request. The admin will be notified to reassign it to another expert.'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${actionColor}`}>
            {actionIcon}
            {actionTitle}
          </DialogTitle>
          <DialogDescription>
            {actionDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Session Summary */}
          <div className={`p-4 rounded-md ${actionBgColor}`}>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Building className="h-4 w-4" />
              {request.subject}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(request.sessionDate)}</span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{DURATION_LABELS[request.duration]}</span>
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{SESSION_MODE_LABELS[request.sessionMode]} - {request.location}</span>
              </div>

              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{request.audienceSize} participants</span>
              </div>
            </div>

            <div className="mt-3 text-sm">
              <span className="font-medium">Organization:</span> {request.organizationName}
            </div>

            <div className="mt-2 text-sm">
              <span className="font-medium">Audience:</span> {formatAudienceTypes(request.audienceTypes)}
            </div>
          </div>

          {/* Warning for declining */}
          {!isAccepting && (
            <div className="bg-accent/10 border border-accent/50 p-4 rounded-md">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-accent mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-accent">Important Notice</p>
                  <p className="text-accent mt-1">
                    Declining this request will notify the admin to reassign it to another trainer.
                    Please provide a reason in the notes below to help with future assignments.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Notes Section */}
          <div className="space-y-3">
            <Label htmlFor="notes" className="text-sm font-medium">
              {isAccepting ? 'Additional Notes (Optional)' : 'Reason for Declining (Recommended)'}
            </Label>
            <Textarea
              id="notes"
              placeholder={
                isAccepting
                  ? "Add any additional notes or requirements for this session..."
                  : "Please provide a reason for declining this request..."
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {isAccepting
                ? "These notes will be shared with the requester and admin."
                : "This information will help the admin understand your availability and make better future assignments."
              }
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-destructive/10 border border-destructive p-3 rounded-md">
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Error</span>
              </div>
              <p className="text-sm text-destructive mt-1">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={
              isAccepting
                ? "bg-secondary hover:bg-secondary"
                : "bg-destructive hover:bg-destructive"
            }
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {isAccepting ? 'Accepting...' : 'Declining...'}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {actionIcon}
                {isAccepting ? 'Accept Request' : 'Decline Request'}
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
