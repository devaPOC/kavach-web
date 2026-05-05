'use client'
import React, { useState, useEffect } from 'react'
import { authApi } from '@/lib/api/client'
import { AlertCircle } from 'lucide-react'
import ExpertDashboardOverview from '@/components/custom/expert/ExpertDashboardOverview'

export default function ExpertDashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const result = await authApi.me()
        if (result.success && result.data) {
          setUser(result.data)
        }
      } catch (e) {
        console.error('Error fetching user:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-200 border-t-indigo-600"></div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Expert Dashboard</h1>
        <p className="text-slate-500 text-sm">
          Welcome back, {user.firstName} {user.lastName}
        </p>
      </div>

      {/* Pending Approval Warning */}
      {(user.role === 'expert' || user.role === 'trainer') && !user.isApproved && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <h3 className="font-medium text-amber-800">Account Pending Approval</h3>
              <p className="text-sm text-amber-700 mt-1">
                Your expert account is pending admin approval. You have limited access to the awareness lab for testing purposes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Overview - pass userRole for RBAC */}
      <ExpertDashboardOverview userRole={user.role} />
    </div>
  )
}
