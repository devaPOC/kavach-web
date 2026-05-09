'use client'
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Calendar,
  TrendingUp,
  Award,
  FileText,
  Users,
  ArrowRight,
  Briefcase,
  Brain
} from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { useWebsocket } from '@/hooks/useWebsocket'

interface DashboardStats {
  totalAssigned: number
  pendingAcceptance: number
  inProgress: number
  completed: number
  rejected: number
}

interface EarningsStats {
  totalEarnings: number
  monthlyEarnings: number
  completedTasks: number
  averageTaskValue: number
}

interface RecentActivity {
  id: string
  type: 'assignment' | 'acceptance' | 'completion' | 'rejection'
  taskTitle: string
  timestamp: string
}

interface ExpertDashboardOverviewProps {
  expertId?: string
  userRole?: string // Add userRole for RBAC
}

export default function ExpertDashboardOverview({ expertId, userRole }: ExpertDashboardOverviewProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalAssigned: 0,
    pendingAcceptance: 0,
    inProgress: 0,
    completed: 0,
    rejected: 0
  })
  const [earningsStats, setEarningsStats] = useState<EarningsStats>({
    totalEarnings: 0,
    monthlyEarnings: 0,
    completedTasks: 0,
    averageTaskValue: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  // RBAC: Check if user is a trainer (trainers can access awareness sessions)
  const isTrainer = userRole === 'trainer'

  useWebsocket((payload) => {
    if (payload.event.startsWith('awareness_session_') || payload.event === 'poll_update') {
      fetchDashboardData();
    }
  });

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch expert dashboard statistics, activity, and earnings in parallel
      const [statsResponse, activityResponse, earningsResponse] = await Promise.all([
        fetch('/api/v1/expert/dashboard/stats', { credentials: 'include' }),
        fetch('/api/v1/expert/dashboard/activity', { credentials: 'include' }),
        fetch('/api/v1/expert/dashboard/earnings', { credentials: 'include' })
      ])

      if (statsResponse.ok) {
        const result = await statsResponse.json()
        const data = result.data || {}
        setStats({
          totalAssigned: data.totalAssigned || 0,
          pendingAcceptance: data.pendingAcceptance || 0,
          inProgress: data.inProgress || 0,
          completed: data.completed || 0,
          rejected: data.rejected || 0
        })
      }

      if (activityResponse.ok) {
        const result = await activityResponse.json()
        setRecentActivity(result.data || [])
      }

      if (earningsResponse.ok) {
        const result = await earningsResponse.json()
        const data = result.data || {}
        setEarningsStats({
          totalEarnings: data.totalEarnings || 0,
          monthlyEarnings: data.monthlyEarnings || 0,
          completedTasks: data.completedTasks || 0,
          averageTaskValue: data.averageTaskValue || 0
        })
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'assignment':
        return <User className="h-4 w-4 text-primary" />
      case 'acceptance':
        return <CheckCircle className="h-4 w-4 text-secondary" />
      case 'completion':
        return <Award className="h-4 w-4 text-primary" />
      case 'rejection':
        return <AlertCircle className="h-4 w-4 text-destructive" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground/80" />
    }
  }

  const getActivityText = (activity: RecentActivity) => {
    switch (activity.type) {
      case 'assignment':
        return `New task assigned: ${activity.taskTitle}`
      case 'acceptance':
        return `Task accepted: ${activity.taskTitle}`
      case 'completion':
        return `Task completed: ${activity.taskTitle}`
      case 'rejection':
        return `Task rejected: ${activity.taskTitle}`
      default:
        return `Activity on: ${activity.taskTitle}`
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-border/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="animate-pulse bg-muted h-4 w-20 rounded"></div>
                <div className="animate-pulse bg-muted h-4 w-4 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="animate-pulse bg-muted h-8 w-12 rounded mb-2"></div>
                <div className="animate-pulse bg-muted h-3 w-24 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60 hover:shadow-md hover:border-accent/50 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Acceptance</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.pendingAcceptance}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Require your response
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 hover:shadow-md hover:border-primary/50 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active tasks
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 hover:shadow-md hover:border-secondary/50 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-secondary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.completed}</div>
            <p className="text-xs text-muted-foreground mt-1">
              This month
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 hover:shadow-md hover:border-secondary/50 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Earnings</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
              <span className="text-[10px] font-bold text-secondary">₹</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">₹ {(earningsStats.monthlyEarnings || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {earningsStats.completedTasks || 0} tasks completed
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Actions */}
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-foreground">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="block">Quick Actions</span>
                <span className="text-sm font-normal text-muted-foreground">Common tasks and shortcuts</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {/* RBAC: Only show Awareness Sessions to trainers */}
            {isTrainer && (
              <Link href="/expert/awareness-sessions" className="group">
                <div className="flex items-center gap-4 p-4 rounded-xl border border-border/80 bg-gradient-to-r from-violet-50/50 to-transparent hover:from-violet-100/80 hover:border-primary/50 hover:shadow-sm transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary flex items-center justify-center transition-colors duration-300 flex-shrink-0">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">Awareness Sessions</h4>
                    <p className="text-sm text-muted-foreground">Manage training sessions</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
                </div>
              </Link>
            )}

            <Link href="/expert/tasks" className="group">
              <div className="flex items-center gap-4 p-4 rounded-xl border border-border/80 bg-gradient-to-r from-indigo-50/50 to-transparent hover:from-indigo-100/80 hover:border-primary/50 hover:shadow-sm transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary flex items-center justify-center transition-colors duration-300 flex-shrink-0">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">My Tasks</h4>
                  <p className="text-sm text-muted-foreground">View assigned projects</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
              </div>
            </Link>

            <Link href="/expert/awareness-lab" className="group">
              <div className="flex items-center gap-4 p-4 rounded-xl border border-border/80 bg-gradient-to-r from-emerald-50/50 to-transparent hover:from-emerald-100/80 hover:border-secondary/50 hover:shadow-sm transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 group-hover:bg-secondary flex items-center justify-center transition-colors duration-300 flex-shrink-0">
                  <Brain className="h-5 w-5 text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground group-hover:text-secondary transition-colors">Awareness Lab</h4>
                  <p className="text-sm text-muted-foreground">Access learning materials</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground/60 group-hover:text-secondary group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              Recent Activity
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Your latest task interactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <Clock className="h-5 w-5 text-muted-foreground/80" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No recent activity
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50/50 hover:bg-muted/50 transition-colors duration-200">
                    <div className="w-8 h-8 rounded-lg bg-card flex items-center justify-center shadow-sm">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground line-clamp-1">
                        {getActivityText(activity)}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(activity.timestamp), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
