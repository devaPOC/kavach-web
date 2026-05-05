'use client'
import React, { useState, useEffect } from 'react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserCheck, User, Mail } from 'lucide-react'
import type { AwarenessSessionRequestResponse } from '@/types/awareness-session'

interface ExpertOption {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface AwarenessSessionExpertAssignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: AwarenessSessionRequestResponse | null
  experts: ExpertOption[]
  onRequestUpdated: () => void
}

export default function AwarenessSessionExpertAssignDialog({
  open,
  onOpenChange,
  request,
  experts,
  onRequestUpdated
}: AwarenessSessionExpertAssignDialogProps) {
  const [selectedExpertId, setSelectedExpertId] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Reset form when dialog opens/closes or request changes
  useEffect(() => {
    if (!open || !request) {
      setSelectedExpertId('')
      setNotes('')
      setError('')
      setIsSubmitting(false)
    }
  }, [open, request])

  const handleSubmit = async () => {
    if (!request || !selectedExpertId) {
      setError('Please select an expert to assign')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch(`/api/v1/admin/awareness-sessions/${request.id}/assign`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expertId: selectedExpertId,
          notes: notes.trim() || undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || result.error || `HTTP ${response.status}`)
      }

      if (result.success) {
        // Immediately close dialog and reset state
        handleClose()
        // Then update the parent component
        onRequestUpdated()
      } else {
        setError(result.error || 'Failed to assign expert')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to assign expert')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetFormState = () => {
    // Reset all form state without calling onOpenChange
    setSelectedExpertId('')
    setNotes('')
    setError('')
    setIsSubmitting(false)
  }

  const handleClose = () => {
    resetFormState()
    onOpenChange(false)
  }

  const selectedExpert = experts.find(expert => expert.id === selectedExpertId)
  const availableExperts = experts.filter(expert => expert.id !== request?.assignedExpertId)

  if (!request) return null

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen && !isSubmitting) {
        resetFormState()
      }
      onOpenChange(newOpen)
    }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Assign Expert to Awareness Session
          </DialogTitle>
          <DialogDescription>
            Assign an expert to handle the awareness session request from {request.organizationName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Request Summary */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <h4 className="font-medium text-foreground">Request Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Organization:</span>
                <div className="font-medium">{request.organizationName}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Session Date:</span>
                <div className="font-medium">{new Date(request.sessionDate).toLocaleDateString()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Subject:</span>
                <div className="font-medium">{request.subject}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Audience Size:</span>
                <div className="font-medium">{request.audienceSize} people</div>
              </div>
            </div>
          </div>

          {/* Current Assignment Status */}
          {request.assignedExpertId && (
            <div className="p-3 bg-primary/10 border border-primary/50 rounded-md">
              <p className="text-sm text-primary">
                This request is currently assigned to an expert. Selecting a new expert will reassign the request.
              </p>
            </div>
          )}

          {/* Expert Selection */}
          <div className="space-y-2">
            <Label htmlFor="expert-select">Select Expert *</Label>
            <Select value={selectedExpertId} onValueChange={setSelectedExpertId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an expert to assign" />
              </SelectTrigger>
              <SelectContent>
                {availableExperts.map((expert) => (
                  <SelectItem key={expert.id} value={expert.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <div>
                        <div className="font-medium">
                          {expert.firstName} {expert.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">{expert.email}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableExperts.length === 0 && (
              <p className="text-sm text-muted-foreground">No available experts to assign</p>
            )}
          </div>

          {/* Selected Expert Preview */}
          {selectedExpert && (
            <div className="p-4 bg-primary/10 border border-primary/50 rounded-lg">
              <h4 className="font-medium text-primary mb-2">Selected Expert</h4>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-primary">
                    {selectedExpert.firstName} {selectedExpert.lastName}
                  </p>
                  <div className="flex items-center gap-1 text-sm text-primary">
                    <Mail className="h-3 w-3" />
                    {selectedExpert.email}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Assignment Notes */}
          <div className="space-y-2">
            <Label htmlFor="assignment-notes">Assignment Notes (Optional)</Label>
            <Textarea
              id="assignment-notes"
              placeholder="Add any notes or instructions for the expert..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              These notes will be included in the notification email to the expert
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedExpertId}
            className="bg-primary hover:bg-primary"
          >
            {isSubmitting ? 'Assigning...' : 'Assign Expert'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
