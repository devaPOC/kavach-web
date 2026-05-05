'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { adminApi } from '@/lib/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { UserResponse } from '@/types/user'
import { Plus, Search, Shield, ShieldCheck, ChevronLeft, ChevronRight, Ban, Pause, Play, Trash2, Eye, CheckCircle, XCircle, Lock, LockOpen, Users } from 'lucide-react'
import UserCreateDialog from './UserCreateDialog'
import UserDeleteDialog from './UserDeleteDialog'
import UserProfileDialog from './UserProfileDialog'
import UserActionsDropdown from './UserActionsDropdown'
import { FilterToolbar } from '@/app/components/filters/FilterToolbar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PaginationControls } from '@/app/components/pagination/PaginationControls'
import { useServerPagination } from '@/hooks/useServerPagination'
import { AdminDashboardLayout } from '@/app/components/admin/AdminDashboardLayout'
import AdminLoadingSkeleton, { AdminTilesSkeleton, AdminTableSkeleton } from '@/app/components/admin/AdminLoadingSkeleton'
import { AdminEmptyState } from '@/app/components/admin/AdminEmptyState'

export default function UserManagement() {
  const [users, setUsers] = useState<UserResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [lockedOnly, setLockedOnly] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [role, setRole] = useState<'all' | 'customer' | 'expert' | 'trainer'>('all')
  const [approved, setApproved] = useState<boolean | undefined>(undefined)
  const [verified, setVerified] = useState<boolean | undefined>(undefined)
  const [banned, setBanned] = useState<boolean | undefined>(undefined)
  const [paused, setPaused] = useState<boolean | undefined>(undefined)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [counts, setCounts] = useState<{ totalUsers: number; locked: number; banned: number; paused: number; pendingApprovalExperts: number; verified: number } | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserResponse | null>(null)
  const [userToView, setUserToView] = useState<UserResponse | null>(null)
  const [processingUserId, setProcessingUserId] = useState<string | null>(null)

  const limit = 10

  const fetchUsers = useCallback(async (page: number = 1) => {
    try {
      setLoading(true)
      const result = await adminApi.getUsers(page, limit, {
        search: searchTerm || undefined,
        locked: lockedOnly ? true : undefined,
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: endDate ? endDate.toISOString() : undefined,
        role: role !== 'all' ? role : undefined,
        approved,
        verified,
        banned,
        paused,
      })

      if (result.success && result.data) {
        setUsers(result.data.users as UserResponse[])
        setTotalUsers(result.data.total)
        setTotalPages(Math.ceil(result.data.total / limit))
        setCurrentPage(result.data.page)
      } else {
        setError(result.error || 'Failed to fetch users')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, lockedOnly, startDate, endDate, role, approved, verified, banned, paused])

  const fetchCounts = useCallback(async () => {
    const res = await adminApi.getUserCounts()
    if (res.success && res.data) setCounts(res.data)
  }, [])

  // Unified server pagination: fetch on page change, debounce on filter changes
  const totalPagesGuard = Math.max(1, totalPages)
  const { page, setPage, next, prev } = useServerPagination({
    initialPage: 1,
    debounceMs: 300,
    totalPages: totalPagesGuard,
    deps: [searchTerm, lockedOnly, startDate, endDate, role, approved, verified, banned, paused],
    onFetch: (p) => fetchUsers(p),
  })
  useEffect(() => { setCurrentPage(page) }, [page])
  useEffect(() => { fetchCounts() }, [fetchCounts])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  const handleUserCreated = () => {
    fetchUsers(currentPage)
    setShowCreateDialog(false)
  }

  const handleDeleteUser = (user: UserResponse) => {
    setUserToDelete(user)
    setShowDeleteDialog(true)
  }

  const handleUserDeleted = () => {
    fetchUsers(currentPage)
    setShowDeleteDialog(false)
    setUserToDelete(null)
  }

  const handleViewProfile = (user: UserResponse) => {
    setUserToView(user)
    setShowProfileDialog(true)
  }

  const handleBanExpert = async (user: UserResponse) => {
    if (processingUserId) return

    setProcessingUserId(user.id)
    try {
      const result = await adminApi.banExpert(user.id)
      if (result.success) {
        fetchUsers(currentPage)
      } else {
        setError(result.error || 'Failed to ban expert')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to ban expert')
    } finally {
      setProcessingUserId(null)
    }
  }

  const handleUnbanExpert = async (user: UserResponse) => {
    if (processingUserId) return

    setProcessingUserId(user.id)
    try {
      const result = await adminApi.unbanExpert(user.id)
      if (result.success) {
        fetchUsers(currentPage)
      } else {
        setError(result.error || 'Failed to unban expert')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to unban expert')
    } finally {
      setProcessingUserId(null)
    }
  }

  const handlePauseCustomer = async (user: UserResponse) => {
    if (processingUserId) return

    setProcessingUserId(user.id)
    try {
      const result = await adminApi.pauseCustomer(user.id)
      if (result.success) {
        fetchUsers(currentPage)
      } else {
        setError(result.error || 'Failed to pause customer')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to pause customer')
    } finally {
      setProcessingUserId(null)
    }
  }

  const handleUnpauseCustomer = async (user: UserResponse) => {
    if (processingUserId) return

    setProcessingUserId(user.id)
    try {
      const result = await adminApi.unpauseCustomer(user.id)
      if (result.success) {
        fetchUsers(currentPage)
      } else {
        setError(result.error || 'Failed to unpause customer')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to unpause customer')
    } finally {
      setProcessingUserId(null)
    }
  }

  const handleApproveExpert = async (user: UserResponse) => {
    if (processingUserId) return

    setProcessingUserId(user.id)
    try {
      const result = await adminApi.approveExpert(user.id)
      if (result.success) {
        fetchUsers(currentPage)
      } else {
        setError(result.error || 'Failed to approve expert')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to approve expert')
    } finally {
      setProcessingUserId(null)
    }
  }

  const handleRejectExpert = async (user: UserResponse) => {
    if (processingUserId) return

    setProcessingUserId(user.id)
    try {
      const result = await adminApi.rejectExpert(user.id)
      if (result.success) {
        fetchUsers(currentPage)
      } else {
        setError(result.error || 'Failed to reject expert')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reject expert')
    } finally {
      setProcessingUserId(null)
    }
  }

  const handleUnlockAccount = async (user: UserResponse) => {
    if (processingUserId) return

    setProcessingUserId(user.id)
    try {
      const result = await adminApi.unlockUserAccount(user.id)
      if (result.success) {
        fetchUsers(currentPage)
      } else {
        setError(result.error || 'Failed to unlock account')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to unlock account')
    } finally {
      setProcessingUserId(null)
    }
  }

  const handlePromoteToTrainer = async (user: UserResponse) => {
    if (processingUserId) return

    setProcessingUserId(user.id)
    try {
      const result = await adminApi.promoteToTrainer(user.id)
      if (result.success) {
        fetchUsers(currentPage)
      } else {
        setError(result.error || 'Failed to promote to trainer')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to promote to trainer')
    } finally {
      setProcessingUserId(null)
    }
  }

  const handleDemoteFromTrainer = async (user: UserResponse) => {
    if (processingUserId) return

    setProcessingUserId(user.id)
    try {
      const result = await adminApi.demoteFromTrainer(user.id)
      if (result.success) {
        fetchUsers(currentPage)
      } else {
        setError(result.error || 'Failed to demote from trainer')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to demote from trainer')
    } finally {
      setProcessingUserId(null)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'trainer': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'expert': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'customer': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getUserStatus = (user: UserResponse) => {
    // Check for locked account first (highest priority)
    if (user.isLocked) {
      return { icon: Lock, text: 'Locked', color: 'text-red-700' }
    }
    if (user.role === 'expert' && user.isBanned) {
      return { icon: Ban, text: 'Banned', color: 'text-red-600' }
    }
    if (user.role === 'customer' && user.isPaused) {
      return { icon: Pause, text: 'Paused', color: 'text-orange-600' }
    }
    if (user.role === 'expert' && !user.isApproved) {
      return { icon: Shield, text: 'Pending Approval', color: 'text-yellow-600' }
    }
    if (user.isEmailVerified) {
      return { icon: ShieldCheck, text: 'Verified', color: 'text-green-600' }
    }
    return { icon: Shield, text: 'Pending', color: 'text-yellow-600' }
  }

  const renderUserActions = (user: UserResponse) => {
    const isProcessing = processingUserId === user.id

    return (
      <UserActionsDropdown
        user={user}
        isProcessing={isProcessing}
        onViewProfile={handleViewProfile}
        onApproveExpert={handleApproveExpert}
        onRejectExpert={handleRejectExpert}
        onBanExpert={handleBanExpert}
        onUnbanExpert={handleUnbanExpert}
        onPauseCustomer={handlePauseCustomer}
        onUnpauseCustomer={handleUnpauseCustomer}
        onDeleteUser={handleDeleteUser}
        onUnlockAccount={handleUnlockAccount}
        onPromoteToTrainer={handlePromoteToTrainer}
        onDemoteFromTrainer={handleDemoteFromTrainer}
      />
    )
  }

  // Server-side filtering is applied; keep users as-is
  const filteredUsers = users

  const clearAllFilters = useCallback(() => {
    setSearchTerm('')
    setLockedOnly(false)
    setStartDate(undefined)
    setEndDate(undefined)
    setRole('all')
    setApproved(undefined)
    setVerified(undefined)
    setBanned(undefined)
    setPaused(undefined)
  }, [])

  const filtersNode = (
    <FilterToolbar
      searchValue={searchTerm}
      onSearchChange={setSearchTerm}
      placeholder="Search users..."
      showDateRange
      startDate={startDate}
      endDate={endDate}
      onStartDateChange={setStartDate}
      onEndDateChange={setEndDate}
      onClear={clearAllFilters}
      rightArea={
        <div className="flex items-center gap-2">
          <Select value={role} onValueChange={(v: any) => setRole(v)}>
            <SelectTrigger className="w-[140px]" aria-label="Filter by role"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="trainer">Trainer</SelectItem>
              <SelectItem value="expert">Expert</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={lockedOnly ? 'default' : 'outline'}
            size="sm"
            aria-pressed={lockedOnly}
            onClick={() => setLockedOnly(v => !v)}
            className="flex items-center gap-2"
          >
            <Lock className="h-4 w-4" />
            Locked
          </Button>
          <Button
            variant={approved === true ? 'default' : 'outline'}
            size="sm"
            aria-pressed={approved === true}
            onClick={() => setApproved(prev => prev === true ? undefined : true)}
          >Approved</Button>
          <Button
            variant={verified === true ? 'default' : 'outline'}
            size="sm"
            aria-pressed={verified === true}
            onClick={() => setVerified(prev => prev === true ? undefined : true)}
          >Verified</Button>
          <Button
            variant={banned === true ? 'default' : 'outline'}
            size="sm"
            aria-pressed={banned === true}
            onClick={() => setBanned(prev => prev === true ? undefined : true)}
          >Banned</Button>
          <Button
            variant={paused === true ? 'default' : 'outline'}
            size="sm"
            aria-pressed={paused === true}
            onClick={() => setPaused(prev => prev === true ? undefined : true)}
          >Paused</Button>
        </div>
      }
    />
  )

  const actionsNode = (
    <Button size="sm" onClick={() => setShowCreateDialog(true)}>
      <Plus className="h-4 w-4 mr-2" />
      Create User
    </Button>
  )

  const summaryTiles = (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-700">Total Users</span>
        </div>
        <p className="text-2xl font-bold text-blue-800 mt-1">{counts?.totalUsers ?? totalUsers}</p>
      </div>
      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-red-600" />
          <span className="text-sm font-medium text-red-700">Locked Accounts</span>
        </div>
        <p className="text-2xl font-bold text-red-800 mt-1">{counts?.locked ?? users.filter(u => u.isLocked).length}</p>
      </div>
      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
        <div className="flex items-center gap-2">
          <Ban className="h-4 w-4 text-orange-600" />
          <span className="text-sm font-medium text-orange-700">Banned/Paused</span>
        </div>
        <p className="text-2xl font-bold text-orange-800 mt-1">{counts ? counts.banned + counts.paused : users.filter(u => u.isBanned || u.isPaused).length}</p>
      </div>
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-yellow-600" />
          <span className="text-sm font-medium text-yellow-700">Pending Approval</span>
        </div>
        <p className="text-2xl font-bold text-yellow-800 mt-1">{counts?.pendingApprovalExperts ?? users.filter(u => u.role === 'expert' && !u.isApproved).length}</p>
      </div>
    </div>
  )

  return (
    <AdminDashboardLayout
      title="User Management"
      description="Search, filter, and manage users across roles."
      actions={actionsNode}
      filters={filtersNode}
    >
      {/* Loading state */}
      {loading && users.length === 0 ? (
        <AdminLoadingSkeleton />
      ) : (
        <>
          {/* Summary tiles */}
          {summaryTiles}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && filteredUsers.length === 0 ? (
            <AdminEmptyState
              title="No users match your filters"
              description="Try adjusting your search or clearing some filters to see more results."
              action={<Button variant="outline" onClick={clearAllFilters}>Clear filters</Button>}
            />
          ) : (
            <>
              {/* Users Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.firstName} {user.lastName}
                                </div>
                                {user.isLocked && (
                                  <Lock className="h-3 w-3 text-red-600" />
                                )}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <Badge className={getRoleBadgeColor(user.role)}>
                              {user.role}
                            </Badge>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              {(() => {
                                const status = getUserStatus(user)
                                const StatusIcon = status.icon
                                return (
                                  <>
                                    <StatusIcon className={`h-4 w-4 ${status.color}`} />
                                    <span className={`text-sm ${status.color}`}>{status.text}</span>
                                  </>
                                )
                              })()}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-4 text-right">
                            {renderUserActions(user)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <PaginationControls
                page={currentPage}
                totalPages={totalPages}
                startLabel={`Showing ${((currentPage - 1) * limit) + 1} to ${Math.min(currentPage * limit, totalUsers)} of ${totalUsers} users`}
                onPrev={() => handlePageChange(currentPage - 1)}
                onNext={() => handlePageChange(currentPage + 1)}
              />
            </>
          )}
        </>
      )}

      {/* Dialogs */}
      <UserCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onUserCreated={handleUserCreated}
      />

      <UserDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        user={userToDelete}
        onUserDeleted={handleUserDeleted}
      />

      <UserProfileDialog
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
        user={userToView}
      />
    </AdminDashboardLayout>
  )
}
