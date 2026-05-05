'use client'
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertTriangle, X } from 'lucide-react'

interface ServiceRequestActionsProps {
  task: {
    id: string
    status: string
    title: string
  }
  onCancel?: () => void
  onEdit?: () => void
}

export default function ServiceRequestActions({ task, onCancel, onEdit }: ServiceRequestActionsProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  const canCancel = ['pending', 'assigned'].includes(task.status)
  const canEdit = ['pending'].includes(task.status)

  const handleCancel = async () => {
    setIsCancelling(true)
    try {
      const response = await fetch(`/api/v1/customer/service-requests/${task.id}/cancel`, {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        setShowCancelDialog(false)
        if (onCancel) {
          onCancel()
        }
        alert('Service request cancelled successfully')
      } else {
        const error = await response.json()
        alert(`Failed to cancel request: ${error.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to cancel service request:', error)
      alert('Failed to cancel service request. Please try again.')
    } finally {
      setIsCancelling(false)
    }
  }

  if (!canCancel && !canEdit) {
    return null
  }

  return (
    <>
      <div className="flex gap-2">
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
          >
            Edit Request
          </Button>
        )}

        {canCancel && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCancelDialog(true)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancel Service Request
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel "{task.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleCancel}
              disabled={isCancelling}
              variant="destructive"
              className="flex-1"
            >
              {isCancelling ? 'Cancelling...' : 'Yes, Cancel Request'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={isCancelling}
              className="flex-1"
            >
              Keep Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
