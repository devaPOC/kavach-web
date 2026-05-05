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
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import type { AwarenessSessionRequestResponse } from '@/types/awareness-session'

interface ExpertOption {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface AwarenessSessionReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: AwarenessSessionRequestResponse | null
  experts: ExpertOption[]
  onRequestUpdated: () => void
}

export default function AwarenessSessionReviewDialog({
  open,
  onOpenChange,
  request,
  experts,
  onRequestUpdated
}: AwarenessSessionReviewDialogProps) {
  const [action, setAction] = useState<'approve' | 'reject' | ''>('')
  const [selectedExpertId, setSelectedExpertId] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Reset form when dialog opens/closes or request changes
  useEffect(() => {
    if (!open || !request) {
      setAction('')
      setSelectedExpertId('')
      setNotes('')
      setError('')
      setIsSubmitting(false)
    }
  }, [open, request])

  const handleSubmit = async () => {
    if (!request || !action) return

    // Validation
    if (action === 'approve' && !selectedExpertId) {
      setError('Please select an expert to assign')
      return
    }

    if (action === 'reject' && !notes.trim()) {
      setError('Please provide a reason for rejection')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch(`/api/v1/admin/awareness-sessions/${request.id}/review`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          notes: notes.trim() || undefined,
          expertId: action === 'approve' ? selectedExpertId : undefined,
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
        setError(result.error || 'Failed to process review')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process review')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    // Reset all form state
    setAction('')
    setSelectedExpertId('')
    setNotes('')
    setError('')
    setIsSubmitting(false)
    // Close the dialog
    onOpenChange(false)
  }

  const availableExperts = experts.filter(expert => expert.id !== request?.assignedExpertId)

  if (!request) return null

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen && !isSubmitting) {
        handleClose()
      }
    }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action === 'approve' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : action === 'reject' ? (
              <XCircle className="h-5 w-5 text-red-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            )}
            Review Awareness Session Request
          </DialogTitle>
          <DialogDescription>
            Review and {action ? action : 'approve or reject'} the awareness session request from {request.organizationName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Request Summary */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <h4 className="font-medium text-gray-900">Request Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Organization:</span>
                <div className="font-medium">{request.organizationName}</div>
              </div>
              <div>
                <span className="text-gray-500">Session Date:</span>
                <div className="font-medium">{new Date(request.sessionDate).toLocaleDateString()}</div>
              </div>
              <div>
                <span className="text-gray-500">Subject:</span>
                <div className="font-medium">{request.subject}</div>
              </div>
              <div>
                <span className="text-gray-500">Audience Size:</span>
                <div className="font-medium">{request.audienceSize} people</div>
              </div>
            </div>
          </div>

          {/* Action Selection */}
          {!action && (
            <div className="space-y-4">
              <Label>Choose Action</Label>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center gap-2 border-green-200 hover:bg-green-50"
                  onClick={() => setAction('approve')}
                >
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <span>Approve Request</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center gap-2 border-red-200 hover:bg-red-50"
                  onClick={() => setAction('reject')}
                >
                  <XCircle className="h-6 w-6 text-red-600" />
                  <span>Reject Request</span>
                </Button>
              </div>
            </div>
          )}

          {/* Approve Action */}
          {action === 'approve' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">Approving request and assigning to expert</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expert-select">Assign Expert *</Label>
                <Select value={selectedExpertId} onValueChange={setSelectedExpertId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an expert to assign" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableExperts.map((expert) => (
                      <SelectItem key={expert.id} value={expert.id}>
                        {expert.firstName} {expert.lastName} ({expert.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="approval-notes">Notes (Optional)</Label>
                <Textarea
                  id="approval-notes"
                  placeholder="Add any notes for the expert or internal reference..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Reject Action */}
          {action === 'reject' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-700">Rejecting request - reason will be sent to requester</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rejection-reason">Reason for Rejection *</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Please provide a clear reason for rejecting this request..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  required
                />
                <p className="text-xs text-gray-500">
                  This reason will be included in the notification email to the requester
                </p>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          {action && (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {isSubmitting ? 'Processing...' : action === 'approve' ? 'Approve & Assign' : 'Reject Request'}
            </Button>
          )}
          {!action && (
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}