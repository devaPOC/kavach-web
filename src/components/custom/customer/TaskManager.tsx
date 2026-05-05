'use client'
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getStatusDisplayName } from '@/lib/utils/fieldNameFormatter'
import {
  Calendar,
  User,
  CheckCircle,
  Clock,
  Eye,
  Download,
  FileText,
  Star,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import ServiceRequestActions from './ServiceRequestActions'

interface CustomerTask {
  id: string
  title: string
  serviceType: string
  priority: 'emergency' | 'urgent' | 'high' | 'normal' | 'low'
  status: 'pending' | 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'pending_closure' | 'closed' | 'rejected' | 'cancelled'
  description: string
  createdAt: string
  assignedAt?: string
  expert?: {
    firstName: string
    lastName: string
  }
  data: any
  completionReport?: {
    id: string
    report: string
    files: Array<{
      id: string
      filename: string
      originalName: string
      mimeType: string
      size: number
      uploadedAt: string
    }>
    submittedAt: string
  }
}

export default function CustomerTaskManager() {
  const [tasks, setTasks] = useState<CustomerTask[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<CustomerTask | null>(null)
  const [showReportDialog, setShowReportDialog] = useState(false)

  useEffect(() => {
    fetchCustomerTasks()
  }, [])

  const fetchCustomerTasks = async () => {
    try {
      const response = await fetch('/api/v1/customer/tasks', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        console.log('Loaded customer tasks:', data) // Debug logging
        setTasks(data)
      } else {
        console.error('Failed to fetch tasks:', response.statusText)
      }
    } catch (error) {
      console.error('Failed to fetch customer tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCloseTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/v1/customer/tasks/${taskId}/close`, {
        method: 'POST',
        credentials: 'include'
      })
      if (response.ok) {
        await fetchCustomerTasks()
        setShowReportDialog(false)
        alert('Task closed successfully!')
      }
    } catch (error) {
      console.error('Failed to close task:', error)
      alert('Failed to close task. Please try again.')
    }
  }

  const downloadFile = async (taskId: string, fileId: string, filename: string) => {
    try {
      const response = await fetch(`/api/v1/customer/tasks/${taskId}/files/${fileId}/download`, {
        credentials: 'include'
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Failed to download file')
      }
    } catch (error) {
      console.error('Failed to download file:', error)
      alert('Failed to download file')
    }
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      emergency: 'bg-destructive/10 text-destructive',
      urgent: 'bg-accent/10 text-accent',
      high: 'bg-accent/10 text-accent',
      normal: 'bg-primary/10 text-primary',
      low: 'bg-secondary/10 text-secondary'
    }
    return colors[priority as keyof typeof colors] || colors.normal
  }

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-muted text-foreground',
      assigned: 'bg-primary/10 text-primary',
      accepted: 'bg-accent/10 text-accent',
      in_progress: 'bg-accent/10 text-accent',
      completed: 'bg-primary/10 text-primary',
      pending_closure: 'bg-accent/10 text-accent',
      closed: 'bg-secondary/10 text-secondary',
      rejected: 'bg-destructive/10 text-destructive',
      cancelled: 'bg-muted text-muted-foreground'
    }
    return colors[status as keyof typeof colors] || colors.pending
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />
      case 'assigned':
        return <User className="h-4 w-4 text-primary" />
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-accent" />
      case 'in_progress':
        return <Clock className="h-4 w-4 text-accent" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-accent" />
      case 'pending_closure':
        return <CheckCircle className="h-4 w-4 text-accent" />
      case 'closed':
        return <CheckCircle className="h-4 w-4 text-secondary" />
      case 'rejected':
        return <AlertCircle className="h-4 w-4 text-destructive" />
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusDescription = (status: string) => {
    const descriptions = {
      pending: 'Waiting for expert assignment',
      assigned: 'Expert has been assigned',
      accepted: 'Expert has accepted the task',
      in_progress: 'Expert is working on your task',
      completed: 'Expert has completed the work',
      pending_closure: 'Awaiting your approval to close',
      closed: 'Task completed and closed',
      rejected: 'Task was rejected',
      cancelled: 'Task was cancelled'
    }
    return descriptions[status as keyof typeof descriptions] || 'Unknown status'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary/50"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Service Requests</h2>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No service requests found</p>
          </CardContent>
        </Card>
      ) : (
        tasks.map((task) => (
          <Card key={task.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <CardTitle className="text-lg">{task.title}</CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority.toUpperCase()}
                    </Badge>
                    <Badge className={getStatusColor(task.status)}>
                      {getStatusIcon(task.status)}
                      {getStatusDisplayName(task.status).toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getStatusDescription(task.status)}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    {/* Show report button only when expert has submitted a report */}
                    {task.data?.completionReport && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTask(task)
                          setShowReportDialog(true)
                        }}
                        className="bg-primary/10 hover:bg-primary/10"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        View Report
                      </Button>
                    )}
                    {/* Show approve & close button only for pending_closure status */}
                    {task.status === 'pending_closure' && (
                      <Button
                        size="sm"
                        onClick={() => handleCloseTask(task.id)}
                        className="bg-secondary hover:bg-secondary"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve & Close
                      </Button>
                    )}
                    {/* Debug: Show task status for troubleshooting */}
                    {process.env.NODE_ENV === 'development' && (
                      <Badge variant="outline" className="text-xs">
                        Status: {task.status}
                      </Badge>
                    )}
                  </div>
                  <ServiceRequestActions
                    task={task}
                    onCancel={() => fetchCustomerTasks()}
                    onEdit={() => {
                      // TODO: Implement edit functionality
                      alert('Edit functionality coming soon')
                    }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <p className="text-muted-foreground line-clamp-2">{task.description}</p>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Created: {format(new Date(task.createdAt), 'MMM dd, yyyy')}
                    </div>
                    {task.expert && (
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        Expert: {task.expert.firstName} {task.expert.lastName}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Completion Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {selectedTask.completionReport ? 'Completion Report' : 'Task Progress'}
                </DialogTitle>
                <DialogDescription>
                  Task: {selectedTask.title}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Task Info */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Service Type:</span>
                      <p>{selectedTask.serviceType}</p>
                    </div>
                    <div>
                      <span className="font-medium">Priority:</span>
                      <Badge className={getPriorityColor(selectedTask.priority)}>
                        {selectedTask.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Current Status:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getStatusColor(selectedTask.status)}>
                          {getStatusIcon(selectedTask.status)}
                          {getStatusDisplayName(selectedTask.status).toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getStatusDescription(selectedTask.status)}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">
                        {selectedTask.completionReport ? 'Report Submitted:' : 'Last Updated:'}
                      </span>
                      <p>
                        {selectedTask.data?.completionReport
                          ? format(new Date(selectedTask.data.completionReport.submittedAt), 'MMM dd, yyyy HH:mm')
                          : format(new Date(selectedTask.createdAt), 'MMM dd, yyyy HH:mm')
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {selectedTask.completionReport ? (
                  <>
                    {/* Report Content */}
                    <div>
                      <h4 className="font-semibold mb-3">Expert's Completion Report</h4>
                      <div className="bg-card border rounded-lg p-4">
                        <p className="whitespace-pre-wrap text-foreground/80">
                          {selectedTask.data?.completionReport?.report || 'No written report provided.'}
                        </p>
                      </div>
                    </div>

                    {/* Files */}
                    {selectedTask.data?.completionReport?.files && selectedTask.data.completionReport.files.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3">Supporting Documents</h4>
                        <div className="space-y-3">
                          {selectedTask.completionReport.files.map((file) => (
                            <div key={file.id} className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                              <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{file.originalName}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB •
                                    Uploaded {format(new Date(file.uploadedAt), 'MMM dd, yyyy HH:mm')}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadFile(selectedTask.id, file.id, file.originalName)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-primary/10 p-6 rounded-lg text-center">
                    <Clock className="h-12 w-12 text-primary mx-auto mb-3" />
                    <h4 className="font-semibold text-primary mb-2">Work in Progress</h4>
                    <p className="text-primary mb-4">
                      {selectedTask.status === 'in_progress'
                        ? 'Your expert is currently working on this task. A completion report will be available once the work is finished.'
                        : selectedTask.status === 'accepted'
                          ? 'Your expert has accepted this task and will begin work soon.'
                          : selectedTask.status === 'assigned'
                            ? 'This task has been assigned to an expert. Waiting for acceptance.'
                            : 'This task is being processed. Updates will appear here as progress is made.'
                      }
                    </p>
                    {selectedTask.expert && (
                      <div className="flex items-center justify-center gap-2 text-sm text-primary">
                        <User className="h-4 w-4" />
                        Expert: {selectedTask.expert.firstName} {selectedTask.expert.lastName}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  {selectedTask.status === 'pending_closure' && selectedTask.data?.completionReport && (
                    <Button
                      onClick={() => handleCloseTask(selectedTask.id)}
                      className="bg-secondary hover:bg-secondary flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve & Close Task
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setShowReportDialog(false)}
                    className={selectedTask.status === 'pending_closure' ? '' : 'flex-1'}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
