'use client'

import React from 'react'
import { MoreHorizontal, Eye, CheckCircle, XCircle, Ban, Play, Pause, Trash2, LockOpen, GraduationCap, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserResponse } from '@/types/user'

interface UserActionsDropdownProps {
  user: UserResponse
  isProcessing: boolean
  onViewProfile: (user: UserResponse) => void
  onApproveExpert: (user: UserResponse) => void
  onRejectExpert: (user: UserResponse) => void
  onBanExpert: (user: UserResponse) => void
  onUnbanExpert: (user: UserResponse) => void
  onPauseCustomer: (user: UserResponse) => void
  onUnpauseCustomer: (user: UserResponse) => void
  onDeleteUser: (user: UserResponse) => void
  onUnlockAccount: (user: UserResponse) => void
  onPromoteToTrainer: (user: UserResponse) => void
  onDemoteFromTrainer: (user: UserResponse) => void
}

export default function UserActionsDropdown({
  user,
  isProcessing,
  onViewProfile,
  onApproveExpert,
  onRejectExpert,
  onBanExpert,
  onUnbanExpert,
  onPauseCustomer,
  onUnpauseCustomer,
  onDeleteUser,
  onUnlockAccount,
  onPromoteToTrainer,
  onDemoteFromTrainer,
}: UserActionsDropdownProps) {
  const handleAction = (action: () => void) => {
    if (!isProcessing) {
      action()
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={isProcessing}
          className="h-8 w-8 p-0 hover:bg-muted"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open actions menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {/* View Profile - Always available */}
        <DropdownMenuItem
          onClick={() => handleAction(() => onViewProfile(user))}
          disabled={isProcessing}
        >
          <Eye className="h-4 w-4" />
          View Profile
        </DropdownMenuItem>

        {/* Account Unlock - Show for all locked accounts */}
        {user.isLocked && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleAction(() => onUnlockAccount(user))}
              disabled={isProcessing}
              className="text-secondary focus:text-secondary"
            >
              <LockOpen className="h-4 w-4" />
              {isProcessing ? 'Processing...' : 'Unlock Account'}
            </DropdownMenuItem>
          </>
        )}

        {/* Expert-specific actions */}
        {user.role === 'expert' && (
          <>
            <DropdownMenuSeparator />

            {/* Approval actions for pending experts */}
            {!user.isApproved && (
              <>
                <DropdownMenuItem
                  onClick={() => handleAction(() => onApproveExpert(user))}
                  disabled={isProcessing}
                  className="text-secondary focus:text-secondary"
                >
                  <CheckCircle className="h-4 w-4" />
                  {isProcessing ? 'Processing...' : 'Approve Expert'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleAction(() => onRejectExpert(user))}
                  disabled={isProcessing}
                  variant="destructive"
                >
                  <XCircle className="h-4 w-4" />
                  {isProcessing ? 'Processing...' : 'Reject Expert'}
                </DropdownMenuItem>
              </>
            )}

            {/* Ban/Unban actions */}
            {user.isBanned ? (
              <DropdownMenuItem
                onClick={() => handleAction(() => onUnbanExpert(user))}
                disabled={isProcessing}
                className="text-secondary focus:text-secondary"
              >
                <Play className="h-4 w-4" />
                {isProcessing ? 'Processing...' : 'Unban Expert'}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => handleAction(() => onBanExpert(user))}
                disabled={isProcessing}
                variant="destructive"
              >
                <Ban className="h-4 w-4" />
                {isProcessing ? 'Processing...' : 'Ban Expert'}
              </DropdownMenuItem>
            )}
          </>
        )}

        {/* Trainer promotion/demotion actions - Show for approved experts */}
        {user.role === 'expert' && user.isApproved && (
          <>
            <DropdownMenuSeparator />
            {user.isTrainer ? (
              <DropdownMenuItem
                onClick={() => handleAction(() => onDemoteFromTrainer(user))}
                disabled={isProcessing}
                className="text-accent focus:text-accent"
              >
                <UserX className="h-4 w-4" />
                {isProcessing ? 'Processing...' : 'Demote from Trainer'}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => handleAction(() => onPromoteToTrainer(user))}
                disabled={isProcessing}
                className="text-accent focus:text-accent"
              >
                <GraduationCap className="h-4 w-4" />
                {isProcessing ? 'Processing...' : 'Promote to Trainer'}
              </DropdownMenuItem>
            )}
          </>
        )}

        {/* Customer-specific actions */}
        {user.role === 'customer' && (
          <>
            <DropdownMenuSeparator />

            {/* Pause/Unpause actions */}
            {user.isPaused ? (
              <DropdownMenuItem
                onClick={() => handleAction(() => onUnpauseCustomer(user))}
                disabled={isProcessing}
                className="text-secondary focus:text-secondary"
              >
                <Play className="h-4 w-4" />
                {isProcessing ? 'Processing...' : 'Unpause Customer'}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => handleAction(() => onPauseCustomer(user))}
                disabled={isProcessing}
                className="text-accent focus:text-accent"
              >
                <Pause className="h-4 w-4" />
                {isProcessing ? 'Processing...' : 'Pause Customer'}
              </DropdownMenuItem>
            )}
          </>
        )}

        {/* Delete action - Show for non-admin users only */}
        {user.role !== 'admin' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleAction(() => onDeleteUser(user))}
              disabled={isProcessing}
              variant="destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete User
            </DropdownMenuItem>
          </>
        )}

        {/* Protection badge for admin users */}
        {user.role === 'admin' && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center gap-2">
              <span className="bg-muted text-muted-foreground px-2 py-1 rounded text-xs">Protected</span>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
