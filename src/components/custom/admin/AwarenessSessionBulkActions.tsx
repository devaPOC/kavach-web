'use client'
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  CheckCircle,
  XCircle,
  UserCheck,
  AlertTriangle,
  Users
} from 'lucide-react'
import type { AwarenessSessionRequestResponse } from '@/types/awareness-session'

interface ExpertOption {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface AwarenessSessionBulkActionsProps {
  selectedRequests: Set<string>
  requests: AwarenessSessionRequestResponse[]
  experts: ExpertOption[]
  onRequestsUpdated: () => void
  onClearSelection: () => void
}

type BulkAction = 'approve' | 'reject' | 'assign' | ''

export default function AwarenessSessionBulkActions({
  selectedRequests,
  requests,
  experts,
  onRequestsUpdated,
  onClearSelection
}: AwarenessSessionBulkActionsProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [action, setAction] = useState<BulkAction>('')
  const [selectedExpertId, setSelectedExpertId] = useState('')
  const [notes, setNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')

  const selectedRequestsArray = requests.filter(r => selectedRequests.has(r.id))
  
  // Filter requests that can be processed for each action
  const canApprove = selectedRequestsArray.filter(r => 
    r.status === 'pending_admin_review' || r.status === 'expert_declined'
  )
  const canReject = selectedRequestsArray.filter(r => 
    r.status === 'pending_admin_review' || r.status === 'expert_declined'
  )
  const canAssign = selectedRequestsArray.filter(r => 
    r.status === 'pending_admin_review' || r.status === 'expert_declined'
  )

  const handleBulkAction = (actionType: BulkAction) => {
    setAction(actionType)
    setShowDialog(true)
    setError('')
  }

  const handleSubmit = async () => {
    if (!action) return

    // Validation
    if (action === 'approve' && !selectedExpertId) {
      setError('Please select an expert to assign')
      return
    }

    if (action === 'reject' && !notes.trim()) {
      setError('Please provide a reason for rejection')
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      const requestsToProcess = action === 'approve' ? canApprove :
                              action === 'reject' ? canReject :
                              action === 'assign' ? canAssign : []

      const promises = requestsToProcess.map(async (request) => {
        const endpoint = action === 'assign' 
          ? `/api/v1/admin/awareness-sessions/${request.id}/assign`
          : `/api/v1/admin/awareness-sessions/${request.id}/review`

        const body = action === 'assign' 
          ? { expertId: selectedExpertId, notes: notes.trim() || undefined }
          : { 
              action, 
              notes: notes.trim() || undefined,
              expertId: action === 'approve' ? selectedExpertId : undefined
            }

        const response = await fetch(endpoint, {
          method: 'PUT',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          throw new Error(`Failed to process request ${request.id}: HTTP ${response.status}`)
        }

        const result = await response.json()
        if (!result.success) {
          throw new Error(`Failed to process request ${request.id}: ${result.error}`)
        }

        return result
      })

      await Promise.all(promises)

      onRequestsUpdated()
      onClearSelection()
      handleClose()
    } catch (err: any) {
      setError(err.message || 'Failed to process bulk action')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    setShowDialog(false)
    setAction('')
    setSelectedExpertId('')
    setNotes('')
    setError('')
  }

  if (selectedRequests.size === 0) {
    return null
  }

  return (
    <>
      <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/50 rounded-md">
        <Users className="h-4 w-4 text-primary" />
        <span className="text-sm text-primary">
          {selectedRequests.size} request{selectedRequests.size !== 1 ? 's' : ''} selected
        </span>
        
        <div className="flex items-center gap-2 ml-auto">
          {canApprove.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('approve')}
              className="text-secondary border-secondary/50 hover:bg-secondary/10"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Approve ({canApprove.length})
            </Button>
          )}
          
          {canReject.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('reject')}
              className="text-destructive border-destructive hover:bg-destructive/10"
            >
              <XCircle className="h-3 w-3 mr-1" />
              Reject ({canReject.length})
            </Button>
          )}
          
          {canAssign.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('assign')}
              className="text-primary border-primary/50 hover:bg-primary/10"
            >
              <UserCheck className="h-3 w-3 mr-1" />
              Assign ({canAssign.length})
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={onClearSelection}
          >
            Clear Selection
          </Button>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {action === 'approve' ? (
                <CheckCircle className="h-5 w-5 text-secondary" />
              ) : action === 'reject' ? (
                <XCircle className="h-5 w-5 text-destructive" />
              ) : action === 'assign' ? (
                <UserCheck className="h-5 w-5 text-primary" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-accent" />
              )}
              Bulk {action === 'approve' ? 'Approve' : action === 'reject' ? 'Reject' : 'Assign'} Requests
            </DialogTitle>
            <DialogDescription>
              {action === 'approve' && `Approve ${canApprove.length} request${canApprove.length !== 1 ? 's' : ''} and assign to expert`}
              {action === 'reject' && `Reject ${canReject.length} request${canReject.length !== 1 ? 's' : ''}`}
              {action === 'assign' && `Assign ${canAssign.length} request${canAssign.length !== 1 ? 's' : ''} to expert`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Requests Summary */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-foreground mb-2">
                Requests to {action}:
              </h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {(action === 'approve' ? canApprove :
                  action === 'reject' ? canReject :
                  action === 'assign' ? canAssign : []
                ).map((request) => (
                  <div key={request.id} className="text-sm text-foreground/80">
                    • {request.organizationName} - {request.subject}
                  </div>
                ))}
              </div>
            </div>

            {/* Expert Selection for Approve/Assign */}
            {(action === 'approve' || action === 'assign') && (
              <div className="space-y-2">
                <Label htmlFor="expert-select">Select Expert *</Label>
                <Select value={selectedExpertId} onValueChange={setSelectedExpertId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an expert to assign" />
                  </SelectTrigger>
                  <SelectContent>
                    {experts.map((expert) => (
                      <SelectItem key={expert.id} value={expert.id}>
                        {expert.firstName} {expert.lastName} ({expert.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="bulk-notes">
                {action === 'reject' ? 'Reason for Rejection *' : 'Notes (Optional)'}
              </Label>
              <Textarea
                id="bulk-notes"
                placeholder={
                  action === 'reject' 
                    ? 'Please provide a clear reason for rejecting these requests...'
                    : 'Add any notes or instructions...'
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                required={action === 'reject'}
              />
              {action === 'reject' && (
                <p className="text-xs text-muted-foreground">
                  This reason will be included in the notification emails to the requesters
                </p>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isProcessing}
              className={
                action === 'approve' ? 'bg-secondary hover:bg-secondary' :
                action === 'reject' ? 'bg-destructive hover:bg-destructive' :
                'bg-primary hover:bg-primary'
              }
            >
              {isProcessing ? 'Processing...' : 
               action === 'approve' ? `Approve ${canApprove.length} Request${canApprove.length !== 1 ? 's' : ''}` :
               action === 'reject' ? `Reject ${canReject.length} Request${canReject.length !== 1 ? 's' : ''}` :
               `Assign ${canAssign.length} Request${canAssign.length !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}