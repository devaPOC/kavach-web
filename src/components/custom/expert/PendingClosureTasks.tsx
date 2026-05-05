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
  Clock,
  Eye,
  FileText,
  CheckCircle,
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

export default function PendingClosureTasks() {
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
    fetchPendingClosureTasks(currentPage)
  }, [currentPage])

  const fetchPendingClosureTasks = async (page: number = 1) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status: 'pending_closure'
      })

      const response = await fetch(`/api/v1/expert/assigned-tasks?${params}`, {
        credentials: 'include'
      })
      if (response.ok) {
        const result = await response.json()
        // Filter to show only tasks pending closure
        const pendingClosureTasks = (result.data?.requests || result.data || []).filter((task: ServiceRequest) =>
          task.status === 'pending_closure'
        )
        setTasks(pendingClosureTasks)
        setTotalTasks(result.data?.pagination?.total || pendingClosureTasks.length)
        setTotalPages(result.data?.pagination?.totalPages || 1)
        setCurrentPage(result.data?.pagination?.page || 1)
      }
    } catch (error) {
      console.error('Failed to fetch pending closure tasks:', error)
    } finally {
      setLoading(false)
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
        <Card>
          <CardContent className="py-8 text-center">
            <Clock className="h-12 w-12 text-muted-foreground/80 mx-auto mb-4" />
            <p className="text-muted-foreground">No tasks pending closure</p>
            <p className="text-sm text-muted-foreground/80 mt-2">
              Tasks that you've requested closure for will appear here while waiting for customer approval.
            </p>
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
                    <Badge variant="outline" className="flex items-center gap-1 text-accent border-accent/50">
                      <Clock className="h-4 w-4" />
                      AWAITING CUSTOMER APPROVAL
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTask(task)
                      setShowDetailsDialog(true)
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
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
                      className="bg-primary/10 hover:bg-primary/10"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      View Report
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <p className="text-muted-foreground line-clamp-2">{task.description}</p>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {task.customer.firstName} {task.customer.lastName}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Assigned: {format(new Date(task.assignedAt), 'MMM dd, yyyy')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-accent font-medium">Pending Customer Approval</div>
                    <div className="text-xs">Customer will review and close</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Pagination */}
      {totalPages > 1 && (
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
      )}

      {/* Task Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-accent" />
                  Task Pending Closure - {selectedTask.title}
                </DialogTitle>
                <DialogDescription>
                  This task is awaiting customer review and approval for closure.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Task Status Summary */}
                <div className="bg-accent/10 border border-accent/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-accent" />
                    <h3 className="font-semibold text-accent">Pending Customer Approval</h3>
                  </div>
                  <p className="text-accent text-sm">
                    You have successfully completed this task and submitted your completion report.
                    The customer is now reviewing your work and will close the task once they approve it.
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
                      <Badge variant="outline" className="ml-2 text-accent border-accent/50">
                        PENDING CLOSURE
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
    </div>
  )
}
