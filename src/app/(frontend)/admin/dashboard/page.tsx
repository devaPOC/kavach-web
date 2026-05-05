'use client'
import React from 'react'
import DashboardStats from '@/components/custom/admin/DashboardStats'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Activity, Clock } from 'lucide-react'
import Link from 'next/link'

export default function AdminDashboard() {
  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
      </div>

      <div className="space-y-6">
        <DashboardStats />

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Navigate to different admin sections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/admin/awareness-sessions">
                <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <Clock className="h-8 w-8 text-accent" />
                    <div>
                      <h3 className="font-medium">Awareness Sessions</h3>
                      <p className="text-sm text-muted-foreground">Manage session requests</p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/admin/users">
                <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-medium">User Management</h3>
                      <p className="text-sm text-muted-foreground">Manage system users</p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/admin/services">
                <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <Activity className="h-8 w-8 text-secondary" />
                    <div>
                      <h3 className="font-medium">Services</h3>
                      <p className="text-sm text-muted-foreground">Manage service requests</p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest system activities</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No recent activities</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
              <CardDescription>Current system status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-secondary"></div>
                <span className="text-sm font-medium">All systems operational</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}