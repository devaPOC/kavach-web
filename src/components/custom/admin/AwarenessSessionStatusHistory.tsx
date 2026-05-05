'use client'
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Clock,
  User,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserCheck,
  ArrowRight
} from 'lucide-react'
import type { AwarenessSessionStatusHistoryResponse } from '@/types/awareness-session'
import { STATUS_LABELS } from '@/types/awareness-session'

interface AwarenessSessionStatusHistoryProps {
  requestId: string
  className?: string
}

export default function AwarenessSessionStatusHistory({ 
  requestId, 
  className 
}: AwarenessSessionStatusHistoryProps) {
  const [history, setHistory] = useState<AwarenessSessionStatusHistoryResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    fetchStatusHistory()
  }, [requestId])

  const fetchStatusHistory = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(`/api/v1/admin/awareness-sessions/${requestId}/history`, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.data) {
        setHistory(result.data)
      } else {
        setError(result.error || 'Failed to fetch status history')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch status history')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_admin_review': return AlertCircle
      case 'forwarded_to_expert': return UserCheck
      case 'confirmed': return CheckCircle
      case 'rejected': return XCircle
      case 'expert_declined': return XCircle
      default: return AlertCircle
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_admin_review': return 'text-accent'
      case 'forwarded_to_expert': return 'text-primary'
      case 'confirmed': return 'text-secondary'
      case 'rejected': return 'text-destructive'
      case 'expert_declined': return 'text-accent'
      default: return 'text-muted-foreground'
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary/50"></div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="text-center text-destructive text-sm">{error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Status History
        </CardTitle>
        <CardDescription>
          Timeline of status changes for this request
        </CardDescription>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-4">
            No status history available
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry, index) => {
              const StatusIcon = getStatusIcon(entry.newStatus)
              const statusColor = getStatusColor(entry.newStatus)
              const isLast = index === history.length - 1

              return (
                <div key={entry.id} className="relative">
                  {/* Timeline line */}
                  {!isLast && (
                    <div className="absolute left-4 top-8 w-0.5 h-8 bg-muted/80"></div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    {/* Status icon */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-card border-2 border-border flex items-center justify-center ${statusColor}`}>
                      <StatusIcon className="h-4 w-4" />
                    </div>

                    {/* Status change details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {entry.previousStatus && (
                          <>
                            <Badge variant="outline" className="text-xs">
                              {STATUS_LABELS[entry.previousStatus as keyof typeof STATUS_LABELS]}
                            </Badge>
                            <ArrowRight className="h-3 w-3 text-muted-foreground/80" />
                          </>
                        )}
                        <Badge className={`text-xs ${statusColor.replace('text-', 'bg-').replace('-600', '-100')} ${statusColor.replace('-600', '-800')} border-${statusColor.replace('text-', '').replace('-600', '-200')}`}>
                          {STATUS_LABELS[entry.newStatus as keyof typeof STATUS_LABELS]}
                        </Badge>
                      </div>

                      <div className="text-sm text-muted-foreground mb-1">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>Changed by system user</span>
                        </div>
                      </div>

                      {entry.notes && (
                        <div className="text-sm text-foreground/80 bg-muted/50 p-2 rounded border-l-2 border-border">
                          <div className="flex items-start gap-1">
                            <FileText className="h-3 w-3 mt-0.5 text-muted-foreground/80" />
                            <span className="whitespace-pre-wrap">{entry.notes}</span>
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(entry.createdAt).toLocaleDateString()} at{' '}
                        {new Date(entry.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}