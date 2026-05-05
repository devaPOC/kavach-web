'use client'
import React, { useState } from 'react'
import { adminApi } from '@/lib/api/client'
import { UserResponse } from '@/types/user'
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
import { AlertTriangle, Trash2 } from 'lucide-react'

interface UserDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserResponse | null
  onUserDeleted: () => void
}

export default function UserDeleteDialog({
  open,
  onOpenChange,
  user,
  onUserDeleted
}: UserDeleteDialogProps) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const handleDelete = async () => {
    if (!user) return

    setLoading(true)
    setError('')

    try {
      const result = await adminApi.deleteUser(user.id, reason.trim() || undefined)

      if (result.success) {
        onUserDeleted()
        setReason('')
      } else {
        setError(result.error || 'Failed to delete user')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete user')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setReason('')
      setError('')
      onOpenChange(false)
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete User Account
          </DialogTitle>
          <DialogDescription>
            This action will move the user to the Recycle Bin.
            You can restore the user later if needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-sm text-gray-500">{user.email}</p>
                <p className="text-xs text-gray-400 capitalize">Role: {user.role}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">
                  Created: {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for Deletion <span className="text-red-600">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Provide a reason for deleting this user account. This will be included in the notification email sent to the user."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              disabled={loading}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              If no reason is provided, a default message will be sent to the user.
            </p>
          </div>

          {/* Warning */}
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-700">
                <p className="font-medium">Effect of this action:</p>
                <ul className="mt-1 list-disc list-inside space-y-1 text-xs">
                  <li>All user data will be permanently deleted</li>
                  <li>The user will be logged out of all sessions</li>
                  <li>An email notification will be sent to the user</li>
                  <li>The user can be restored from the Recycle Bin</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
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
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete User
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
