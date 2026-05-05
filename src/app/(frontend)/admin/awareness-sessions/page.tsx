'use client'
import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Users, Calendar, Clock, CheckCircle } from 'lucide-react'
import AdminAwarenessSessionDashboard from '@/components/custom/admin/AdminAwarenessSessionDashboard'

export default function AdminAwarenessSessionsPage() {
  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Awareness Session Management</h1>
        <p className="text-muted-foreground">
          Review, approve, and manage cybersecurity awareness session requests
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-accent" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
                  <p className="text-2xl font-bold text-foreground">-</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-primary" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Assigned to Experts</p>
                  <p className="text-2xl font-bold text-foreground">-</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-secondary" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Confirmed</p>
                  <p className="text-2xl font-bold text-foreground">-</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-accent" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold text-foreground">-</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      {/* Main Dashboard */}
      <AdminAwarenessSessionDashboard />
    </div>
  )
}