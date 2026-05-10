'use client'
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getServiceTypeDisplayName } from '@/lib/utils/fieldNameFormatter'
import {
  Calendar,
  User,
  CheckCircle,
  Eye,
  FileText,
  MessageSquare,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { format } from 'date-fns'

interface ServiceRequest {
  id: string
  title: string
  serviceType: string
  priority: 'emergency' | 'urgent' | 'high' | 'normal' | 'low'
  status: string
  description: string
  createdAt: string
  assignedAt: string
  customer: {
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

export default function CompletedTasks() {
  const [tasks, setTasks] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<ServiceRequest | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalTasks, setTotalTasks] = useState(0)
  const limit = 10

  useEffect(() => {
    fetchCompletedTasks(currentPage)
  }, [currentPage])

  const fetchCompletedTasks = async (page: number = 1) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      })

      const response = await fetch(`/api/v1/expert/assigned-tasks?${params}`, {
        credentials: 'include'
      })
      if (response.ok) {
        const result = await response.json()
        // Filter to show only completed tasks (not yet requested closure) and closed tasks
        const completedTasks = (result.data?.requests || result.data || []).filter((task: ServiceRequest) =>
          task.status === 'completed' || task.status === 'closed'
        )
        setTasks(completedTasks)
        setTotalTasks(result.data?.pagination?.total || completedTasks.length)
        setTotalPages(result.data?.pagination?.totalPages || 1)
        setCurrentPage(result.data?.pagination?.page || 1)
      }
    } catch (error) {
      console.error('Failed to fetch completed tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestClosure = async (taskId: string) => {
    try {
      const response = await fetch(`/api/v1/expert/tasks/${taskId}/request-closure`, {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        await fetchCompletedTasks(currentPage)
        setShowDetailsDialog(false)
        alert('Task closure request submitted successfully! The customer will review your work and close the task.')
      } else {
        const errorData = await response.json()
        const errorMessage = errorData?.message || errorData?.error || 'Unknown error'
        alert(`Failed to request task closure: ${errorMessage}`)
      }
    } catch (error: any) {
      console.error('Failed to request task closure:', error)
      alert('Failed to request task closure. Please try again.')
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
    switch (status) {
      case 'completed':
        return 'bg-secondary/10 text-secondary'
      case 'closed':
        return 'bg-muted text-foreground'
      default:
        return 'bg-primary/10 text-primary'
    }
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
      {tasks.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-muted/50/50">
          <CheckCircle className="h-12 w-12 text-muted-foreground/80 mx-auto mb-4" />
          <p className="text-muted-foreground">No completed tasks</p>
          <p className="text-sm text-muted-foreground/80 mt-2">
            Tasks that you've completed and submitted reports for will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="flex flex-col md:flex-row md:items-start lg:items-center justify-between p-5 border rounded-xl bg-card hover:border-primary/20 transition-colors gap-4 shadow-sm">
                <div className="space-y-3 flex-1">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold">{task.title}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className={`flex items-center gap-1 ${getStatusColor(task.status)}`}>
                          <CheckCircle className="h-4 w-4" />
                          {task.status === 'closed' ? 'CLOSED' : 'COMPLETED'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <p className="text-muted-foreground line-clamp-2 text-sm">{task.description}</p>
                </div>

                <div className="flex flex-col gap-2 min-w-[140px]">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTask(task)
                      setShowDetailsDialog(true)
                    }}
                    className="w-full justify-start"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  {task.completionReport && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTask(task)
                        setShowReportModal(true)
                      }}
                      className="bg-primary/10 hover:bg-primary/10 w-full justify-start"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Report
                    </Button>
                  )}
                  {task.status === 'completed' && task.completionReport && (
                    <Button
                      size="sm"
                      onClick={() => handleRequestClosure(task.id)}
                      className="bg-accent hover:bg-accent w-full justify-start"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Request Closure
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {
        totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalTasks)} of {totalTasks} tasks
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-3 w-3" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1"
              >
                Next
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )
      }

      {/* Task Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-secondary" />
                  {selectedTask.status === 'closed' ? 'Closed Task' : 'Completed Task'} - {selectedTask.title}
                </DialogTitle>
                <DialogDescription>
                  {selectedTask.status === 'closed'
                    ? 'This task has been successfully completed and closed by the customer.'
                    : 'This task has been completed. You can request closure to finalize it.'
                  }
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Task Status Summary */}
                <div className={`${selectedTask.status === 'closed' ? 'bg-secondary/10 border-secondary/50' : 'bg-primary/10 border-primary/50'} border p-4 rounded-lg`}>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className={`h-5 w-5 ${selectedTask.status === 'closed' ? 'text-secondary' : 'text-primary'}`} />
                    <h3 className={`font-semibold ${selectedTask.status === 'closed' ? 'text-secondary' : 'text-primary'}`}>
                      {selectedTask.status === 'closed' ? 'Task Successfully Closed' : 'Task Completed'}
                    </h3>
                  </div>
                  <p className={`${selectedTask.status === 'closed' ? 'text-secondary' : 'text-primary'} text-sm`}>
                    {selectedTask.status === 'closed'
                      ? 'This task has been approved and closed by the customer. Great work!'
                      : 'You have completed this task and submitted your report. You can request closure when ready.'
                    }
                  </p>
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Priority:</span>
                    <Badge className={`ml-2 ${getPriorityColor(selectedTask.priority)}`}>
                      {selectedTask.priority.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Service Type:</span>
                    <span className="ml-2">{getServiceTypeDisplayName(selectedTask.serviceType)}</span>
                  </div>
                  <div>
                    <span className="font-medium">Customer:</span>
                    <span className="ml-2">
                      {selectedTask.customer.firstName} {selectedTask.customer.lastName}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Assigned:</span>
                    <span className="ml-2">{format(new Date(selectedTask.assignedAt), 'MMM dd, yyyy HH:mm')}</span>
                  </div>
                </div>

                {/* Request Details */}
                <div>
                  <h4 className="font-semibold mb-2">Request Description</h4>
                  <p className="text-foreground/80 bg-muted/50 p-3 rounded-lg">
                    {selectedTask.description}
                  </p>
                </div>

                {/* Completion Report Section */}
                {selectedTask.completionReport && (
                  <div>
                    <h4 className="font-semibold mb-2">Your Completion Report</h4>
                    <div className="bg-secondary/10 p-4 rounded-lg space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Submitted: {format(new Date(selectedTask.completionReport.submittedAt), 'MMM dd, yyyy HH:mm')}
                        </p>
                        <div className="bg-card p-3 rounded border">
                          <p className="text-sm whitespace-pre-wrap">{selectedTask.completionReport.report}</p>
                        </div>
                      </div>

                      {selectedTask.completionReport.files && selectedTask.completionReport.files.length > 0 && (
                        <div>
                          <h5 className="font-medium mb-2">Attached Files:</h5>
                          <div className="space-y-2">
                            {selectedTask.completionReport.files.map((file) => (
                              <div key={file.id} className="flex items-center justify-between bg-card p-2 rounded border">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4" />
                                  <span className="text-sm">{file.originalName}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Section */}
                    {selectedTask.status === 'completed' && (
                      <div className="mt-4 p-4 bg-primary/10 rounded-lg">
                        <h5 className="font-medium text-primary mb-2">Request Task Closure</h5>
                        <p className="text-sm text-primary mb-3">
                          Your completion report has been submitted. Click "Request Task Closure" to notify the customer
                          that this task is ready to be finalized. The customer will review your work and
                          close the task once they approve it.
                        </p>
                        <Button
                          onClick={() => handleRequestClosure(selectedTask.id)}
                          className="bg-accent hover:bg-accent"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Request Task Closure
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Completion Report View Modal */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedTask && selectedTask.completionReport && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Completion Report
                </DialogTitle>
                <DialogDescription>
                  Task: {selectedTask.title}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Task Summary */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Status:</span>
                      <Badge variant="outline" className={`ml-2 ${getStatusColor(selectedTask.status)}`}>
                        {selectedTask.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Report Submitted:</span>
                      <p>{format(new Date(selectedTask.completionReport.submittedAt), 'MMM dd, yyyy HH:mm')}</p>
                    </div>
                    <div>
                      <span className="font-medium">Customer:</span>
                      <p>{selectedTask.customer.firstName} {selectedTask.customer.lastName}</p>
                    </div>
                    <div>
                      <span className="font-medium">Service Type:</span>
                      <p>{getServiceTypeDisplayName(selectedTask.serviceType)}</p>
                    </div>
                  </div>
                </div>

                {/* Report Content */}
                <div>
                  <h4 className="font-semibold mb-3">Expert's Completion Report</h4>
                  <div className="bg-card border rounded-lg p-4">
                    <p className="whitespace-pre-wrap text-foreground/80">
                      {selectedTask.completionReport.report || 'No written report provided.'}
                    </p>
                  </div>
                </div>

                {/* Files */}
                {selectedTask.completionReport.files && selectedTask.completionReport.files.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Attached Files</h4>
                    <div className="space-y-3">
                      {selectedTask.completionReport.files.map((file) => (
                        <div key={file.id} className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-foreground">{file.originalName}</p>
                              <p className="text-sm text-muted-foreground">
                                {(file.size / 1024 / 1024).toFixed(2)} MB • {format(new Date(file.uploadedAt), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div >
  )
}
