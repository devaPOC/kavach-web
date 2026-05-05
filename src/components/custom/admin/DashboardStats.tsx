'use client'
import React, { useState, useEffect } from 'react'
import { adminApi, authApi } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCheck, UserX, Shield, Activity, Database } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  description: string
  icon: React.ReactNode
  trend?: {
    value: number
    label: string
    isPositive: boolean
  }
}

function StatsCard({ title, value, description, icon, trend }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend && (
          <div className="flex items-center pt-1">
            <span
              className={`text-xs font-medium ${trend.isPositive ? 'text-secondary' : 'text-destructive'
                }`}
            >
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
            <span className="text-xs text-muted-foreground ml-1">
              {trend.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function DashboardStats() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    verifiedUsers: 0,
    unverifiedUsers: 0,
    totalExperts: 0,
    totalCustomers: 0,
    activeSessions: 0,
  })
  const [salesStats, setSalesStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalQuotes: 0,
    acceptedQuotes: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sessionReady, setSessionReady] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const fetchStats = async () => {
    try {
      setLoading(true)

      // Fetch users and sales stats in parallel
      const [usersResult, salesResult] = await Promise.all([
        adminApi.getUsers(1, 1000),
        fetch('/api/v1/admin/dashboard/sales-stats', { credentials: 'same-origin' }).then(res => res.json())
      ])

      if (usersResult.success && usersResult.data) {
        const users = usersResult.data.users

        const totalUsers = users.length
        const verifiedUsers = users.filter(u => u.isEmailVerified).length
        const unverifiedUsers = totalUsers - verifiedUsers
        const totalExperts = users.filter(u => u.role === 'expert').length
        const totalCustomers = users.filter(u => u.role === 'customer').length

        setStats({
          totalUsers,
          verifiedUsers,
          unverifiedUsers,
          totalExperts,
          totalCustomers,
          activeSessions: 0, // This would need a separate endpoint
        })
      } else {
        // Suppress raw auth errors; trigger a silent retry if session not ready yet
        const msg = usersResult.error || 'Failed to fetch statistics'
        if (/access denied|authentication required|authentication failed/i.test(msg)) {
          // Attempt a one-time silent re-validation if under retry cap
          if (retryCount < 3) {
            setRetryCount(c => c + 1)
            setTimeout(fetchStats, 200) // short delay retry
            return
          }
          setError('Session initializing...')
        } else {
          setError(msg)
        }
      }

      // Set sales stats if available
      if (salesResult.success && salesResult.data) {
        setSalesStats(salesResult.data)
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to fetch statistics'
      if (/access denied|authentication required|authentication failed/i.test(msg)) {
        if (retryCount < 3) {
          setRetryCount(c => c + 1)
          setTimeout(fetchStats, 250)
          return
        }
        setError('Session initializing...')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  // Gate stats fetch behind confirmed session to avoid early 401 flash
  useEffect(() => {
    let cancelled = false
    const confirmSession = async () => {
      const start = Date.now()
      const timeoutMs = 1500
      const intervalMs = 150
      while (!cancelled && Date.now() - start < timeoutMs) {
        try {
          const me = await authApi.me()
          if (me.success) {
            setSessionReady(true)
            return
          }
        } catch { /* ignore */ }
        await new Promise(r => setTimeout(r, intervalMs))
      }
      // proceed anyway
      setSessionReady(true)
    }
    confirmSession()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (sessionReady) {
      fetchStats()
    }
  }, [sessionReady])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-center h-24">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary/50"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error && !loading && sessionReady) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-24">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  const verificationRate = stats.totalUsers > 0
    ? ((stats.verifiedUsers / stats.totalUsers) * 100).toFixed(1)
    : '0'

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total Users"
        value={stats.totalUsers}
        description="All registered users"
        icon={<Users className="h-4 w-4" />}
        trend={{
          value: 12,
          label: 'from last month',
          isPositive: true,
        }}
      />

      <StatsCard
        title="Verified Users"
        value={stats.verifiedUsers}
        description={`${verificationRate}% verification rate`}
        icon={<UserCheck className="h-4 w-4" />}
        trend={{
          value: 8,
          label: 'from last week',
          isPositive: true,
        }}
      />

      <StatsCard
        title="Pending Verification"
        value={stats.unverifiedUsers}
        description="Users awaiting verification"
        icon={<UserX className="h-4 w-4" />}
      />

      <StatsCard
        title="Monthly Revenue"
        value={`₹${salesStats.monthlyRevenue.toFixed(2)}`}
        description={`${salesStats.acceptedQuotes} quotes accepted`}
        icon={<span className="text-[10px] font-semibold">₹</span>}
        trend={{
          value: 15,
          label: 'from last month',
          isPositive: true,
        }}
      />



      <StatsCard
        title="Experts"
        value={stats.totalExperts}
        description="Expert users"
        icon={<Database className="h-4 w-4" />}
      />

      <StatsCard
        title="Customers"
        value={stats.totalCustomers}
        description="Customer users"
        icon={<Users className="h-4 w-4" />}
      />

      <StatsCard
        title="System Health"
        value="98.5%"
        description="Uptime this month"
        icon={<Activity className="h-4 w-4" />}
        trend={{
          value: 0.5,
          label: 'from last month',
          isPositive: true,
        }}
      />
    </div>
  )
}
