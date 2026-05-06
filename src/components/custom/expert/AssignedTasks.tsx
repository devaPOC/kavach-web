'use client'
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { getFormFieldDisplayName, getServiceTypeDisplayName, getStatusDisplayName } from '@/lib/utils/fieldNameFormatter'
import { formatCurrency } from '@/lib/utils/currency'
import {
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  MessageSquare,
  FileText, Download,
  X,

  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { format } from 'date-fns'

interface ServiceRequest {
  id: string
  title: string
  serviceType: string
  priority: 'emergency' | 'urgent' | 'high' | 'normal' | 'low'
  status: 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'pending_closure' | 'closed' | 'rejected'
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
  pricing?: {
    type: 'fixed' | 'variable'
    fixedPrice: number | null
    currency: string
    quote?: {
      id: string
      quotedPrice: string
      status: string
      validUntil?: string
      description?: string
    } | null
  } | null
}

export default function AssignedTasks() {
  const [tasks, setTasks] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<ServiceRequest | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showCompletionDialog, setShowCompletionDialog] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalTasks, setTotalTasks] = useState(0)
  const limit = 10

  // Completion form state
  const [completionReport, setCompletionReport] = useState('')
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false)

  // Legacy states (keeping for compatibility)
  const [acceptanceNote, setAcceptanceNote] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [isAccepting, setIsAccepting] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  useEffect(() => {
    fetchAssignedTasks(currentPage)
  }, [currentPage])

  const fetchAssignedTasks = async (page: number = 1) => {
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
        // Filter to show only truly "active" tasks - exclude pending_closure and closed
        const activeTasks = (result.data?.requests || result.data || []).filter((task: ServiceRequest) =>
          !['pending_closure', 'closed'].includes(task.status)
        )
        setTasks(activeTasks)
        setTotalTasks(result.data?.pagination?.total || activeTasks.length)
        setTotalPages(result.data?.pagination?.totalPages || 1)
        setCurrentPage(result.data?.pagination?.page || 1)
      }
    } catch (error) {
      console.error('Failed to fetch assigned tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptTask = async (taskId: string) => {
    setIsAccepting(true)
    try {
      const response = await fetch(`/api/v1/expert/tasks/${taskId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ note: acceptanceNote })
      })

      if (response.ok) {
        await fetchAssignedTasks(currentPage)
        setShowDetailsDialog(false)
        setAcceptanceNote('')
        // Show success message
      }
    } catch (error) {
      console.error('Failed to accept task:', error)
    } finally {
      setIsAccepting(false)
    }
  }

  const handleRejectTask = async (taskId: string) => {
    setIsRejecting(true)
    try {
      const response = await fetch(`/api/v1/expert/tasks/${taskId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ reason: rejectionReason })
      })

      if (response.ok) {
        await fetchAssignedTasks(currentPage)
        setShowDetailsDialog(false)
        setRejectionReason('')
        // Show success message
      }
    } catch (error) {
      console.error('Failed to reject task:', error)
    } finally {
      setIsRejecting(false)
    }
  }

  const handleSubmitCompletion = async (taskId: string) => {
    if (!completionReport.trim()) {
      alert('Please provide a detailed completion report')
      return
    }

    setIsSubmittingCompletion(true)
    try {
      const response = await fetch(`/api/v1/expert/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ report: completionReport })
      })

      if (response.ok) {
        await fetchAssignedTasks(currentPage)
        setShowCompletionDialog(false)
        setCompletionReport('')
        alert('Task completion report submitted successfully!')
      } else {
        const errorData = await response.json()
        const errorMessage = errorData?.message || errorData?.error || 'Unknown error'
        alert(`Failed to submit completion report: ${errorMessage}`)
      }
    } catch (error: any) {
      console.error('Failed to submit completion report:', error)
      alert('Failed to submit completion report. Please try again.')
    } finally {
      setIsSubmittingCompletion(false)
    }
  }

  const handleRequestClosure = async (taskId: string) => {
    setIsSubmittingCompletion(true)
    try {
      const response = await fetch(`/api/v1/expert/tasks/${taskId}/request-closure`, {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        await fetchAssignedTasks(currentPage)
        setShowCompletionDialog(false)
        alert('Task closure request submitted successfully! The customer will review your work and close the task.')
      } else {
        const errorData = await response.json()
        const errorMessage = errorData?.message || errorData?.error || 'Unknown error'
        alert(`Failed to request task closure: ${errorMessage}`)
      }
    } catch (error: any) {
      console.error('Failed to request task closure:', error)
      alert('Failed to request task closure. Please try again.')
    } finally {
      setIsSubmittingCompletion(false)
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assigned':
        return <AlertCircle className="h-4 w-4 text-accent" />
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-primary" />
      case 'in_progress':
        return <Clock className="h-4 w-4 text-primary" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-secondary" />
      case 'pending_closure':
        return <Clock className="h-4 w-4 text-accent" />
      case 'pending_closure':
        return <Clock className="h-4 w-4 text-accent" />
      case 'closed':
        return <CheckCircle className="h-4 w-4 text-secondary" />
      case 'rejected':
        return <X className="h-4 w-4 text-destructive" />
      default:
        return <Clock className="h-4 w-4" />
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
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No assigned tasks at the moment</p>
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
                    <Badge variant="outline" className="flex items-center gap-1">
                      {getStatusIcon(task.status)}
                      {getStatusDisplayName(task.status).toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <p className="text-muted-foreground line-clamp-2">{task.description}</p>

                {/* Pricing Information */}
                {task.pricing && (
                  <div className="flex items-center gap-2 p-2 bg-secondary/10 rounded-md border border-secondary/50">
                    <span className="h-4 inline-flex items-center justify-center text-[10px] font-semibold text-secondary">₹</span>
                    <div className="text-sm">
                      {task.pricing.type === 'fixed' ? (
                        <span className="font-medium text-secondary">
                          Fixed Price: {formatCurrency(task.pricing.fixedPrice || '0')}
                        </span>
                      ) : task.pricing.quote ? (
                        <span className="font-medium text-secondary">
                          Quote: {formatCurrency(task.pricing.quote.quotedPrice || '0')}
                          <span className="text-secondary ml-2 capitalize">({task.pricing.quote.status})</span>
                        </span>
                      ) : (
                        <span className="font-medium text-accent">Variable Pricing - Quote Pending</span>
                      )}
                    </div>
                  </div>
                )}

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
                  <div className="flex gap-2">
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
                    {task.status === 'accepted' && (
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/v1/expert/tasks/${task.id}/start`, {
                              method: 'POST',
                              credentials: 'include',
                            })
                            if (response.ok) {
                              await fetchAssignedTasks(currentPage)
                            } else {
                              alert('Failed to start task. Please try again.')
                            }
                          } catch (error) {
                            console.error('Failed to start task:', error)
                            alert('Failed to start task. Please try again.')
                          }
                        }}
                        className="bg-primary hover:bg-primary"
                      >
                        <Clock className="h-4 w-4 mr-1" />
                        Start Working
                      </Button>
                    )}
                    {task.status === 'in_progress' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedTask(task)
                          setShowCompletionDialog(true)
                        }}
                        className="bg-secondary hover:bg-secondary"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Mark Complete
                      </Button>
                    )}
                    {(task.status === 'completed' && task.completionReport) && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedTask(task)
                          setShowCompletionDialog(true)
                        }}
                        className="bg-accent hover:bg-accent"
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Request Closure
                      </Button>
                    )}
                    {task.status === 'pending_closure' && (
                      <Badge variant="outline" className="text-accent border-accent/50">
                        Pending Closure
                      </Badge>
                    )}
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedTask.title}
                  <Badge className={getPriorityColor(selectedTask.priority)}>
                    {selectedTask.priority.toUpperCase()}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Service Request Details
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Customer Info */}
                <div>
                  <h4 className="font-semibold mb-2">Customer Information</h4>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p><span className="font-medium">Name:</span> {selectedTask.customer.firstName} {selectedTask.customer.lastName}</p>
                    <p className="text-sm text-muted-foreground mt-1">Contact details are private for security reasons.</p>
                  </div>
                </div>

                {/* Pricing Information */}
                {selectedTask.pricing && (
                  <div>
                    <h4 className="font-semibold mb-2">Pricing Information</h4>
                    <div className="bg-secondary/10 p-3 rounded-lg border border-secondary/50">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="h-5 inline-flex items-center justify-center text-xs font-semibold text-secondary">₹</span>
                        <span className="font-medium text-secondary">
                          {selectedTask.pricing.type === 'fixed' ? 'Fixed Pricing' : 'Variable Pricing'}
                        </span>
                      </div>

                      {selectedTask.pricing.type === 'fixed' ? (
                        <p className="text-secondary">
                          <span className="font-medium">Price:</span> {formatCurrency(selectedTask.pricing.fixedPrice || '0')}
                        </p>
                      ) : selectedTask.pricing.quote ? (
                        <div className="space-y-1 text-secondary">
                          <p><span className="font-medium">Quoted Amount:</span> {formatCurrency(selectedTask.pricing.quote.quotedPrice || '0')}</p>
                          <p><span className="font-medium">Quote Status:</span> <span className="capitalize">{selectedTask.pricing.quote.status}</span></p>
                          {selectedTask.pricing.quote.validUntil && (
                            <p><span className="font-medium">Valid Until:</span> {format(new Date(selectedTask.pricing.quote.validUntil), 'MMM dd, yyyy')}</p>
                          )}
                          {selectedTask.pricing.quote.description && (
                            <p className="text-sm mt-2 p-2 bg-card rounded border">
                              <span className="font-medium">Quote Notes:</span><br />
                              {selectedTask.pricing.quote.description}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-accent font-medium">
                          Quote pending - pricing will be determined by admin
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Request Details */}
                <div>
                  <h4 className="font-semibold mb-2">Request Description</h4>
                  <p className="text-foreground/80 bg-muted/50 p-3 rounded-lg">
                    {selectedTask.description}
                  </p>
                </div>

                {/* Service Type Specific Details */}
                {selectedTask.data && Object.keys(selectedTask.data).length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Additional Details</h4>
                    <div className="bg-muted/50 p-3 rounded-lg space-y-2 text-sm">
                      {Object.entries(selectedTask.data)
                        .filter(([key, value]) => key !== 'specificQuestions' && key !== 'completionReport' && value)
                        .map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">
                              {getFormFieldDisplayName(key)}:
                            </span>{' '}
                            {typeof value === 'object' && value !== null
                              ? JSON.stringify(value, null, 2)
                              : String(value || 'N/A')}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div>
                  <h4 className="font-semibold mb-2">Timeline</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Request Created:</span>
                      <span>{format(new Date(selectedTask.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Assigned to You:</span>
                      <span>{format(new Date(selectedTask.assignedAt), 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                  </div>
                </div>

                {/* Completion Report Section */}
                {selectedTask.completionReport && (
                  <div>
                    <h4 className="font-semibold mb-2">Completion Report</h4>
                    <div className="bg-primary/10 p-4 rounded-lg space-y-3">
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
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(`/api/v1/expert/tasks/${selectedTask.id}/files/${file.id}/download`, '_blank')}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Accept/Reject Task Section */}
                {selectedTask.status === 'assigned' && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-4">Task Response</h4>
                    <div className="space-y-4">
                      {/* Accept Section */}
                      <div className="border rounded-lg p-4 bg-secondary/10">
                        <h5 className="font-medium text-secondary mb-2">Accept This Task</h5>
                        <div>
                          <Label htmlFor="acceptanceNote">
                            Initial Response (Optional)
                          </Label>
                          <Textarea
                            id="acceptanceNote"
                            value={acceptanceNote}
                            onChange={(e) => setAcceptanceNote(e.target.value)}
                            placeholder="Add an initial response or timeline for the customer..."
                            className="mt-1"
                            rows={2}
                          />
                        </div>
                        <Button
                          onClick={() => handleAcceptTask(selectedTask.id)}
                          disabled={isAccepting || isRejecting}
                          className="bg-secondary hover:bg-secondary mt-3 w-full"
                        >
                          {isAccepting ? 'Accepting...' : 'Accept Task'}
                        </Button>
                      </div>

                      {/* Reject Section */}
                      <div className="border rounded-lg p-4 bg-destructive/10">
                        <h5 className="font-medium text-destructive mb-2">Reject This Task</h5>
                        <div>
                          <Label htmlFor="rejectionReason">
                            Reason for Rejection (Optional)
                          </Label>
                          <Textarea
                            id="rejectionReason"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Explain why you cannot take this task (will be sent to admin for reassignment)..."
                            className="mt-1"
                            rows={2}
                          />
                        </div>
                        <Button
                          variant="destructive"
                          onClick={() => handleRejectTask(selectedTask.id)}
                          disabled={isAccepting || isRejecting}
                          className="mt-3 w-full"
                        >
                          {isRejecting ? 'Rejecting...' : 'Reject Task'}
                        </Button>
                      </div>

                      {/* Cancel Button */}
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowDetailsDialog(false)
                          setAcceptanceNote('')
                          setRejectionReason('')
                        }}
                        className="w-full"
                        disabled={isAccepting || isRejecting}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                )}

                {/* Current Status Display and Actions */}
                {selectedTask.status !== 'assigned' && (
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(selectedTask.status)}
                        <span className="font-medium">
                          Status: {getStatusDisplayName(selectedTask.status).toUpperCase()}
                        </span>
                      </div>

                      {/* Action buttons based on status */}
                      <div className="flex gap-2">
                        {selectedTask.status === 'accepted' && (
                          <Button
                            size="sm"
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/v1/expert/tasks/${selectedTask.id}/start`, {
                                  method: 'POST',
                                  credentials: 'include',
                                })
                                if (response.ok) {
                                  await fetchAssignedTasks()
                                  setShowDetailsDialog(false)
                                } else {
                                  alert('Failed to start task. Please try again.')
                                }
                              } catch (error) {
                                console.error('Failed to start task:', error)
                                alert('Failed to start task. Please try again.')
                              }
                            }}
                            className="bg-primary hover:bg-primary"
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            Start Working
                          </Button>
                        )}

                        {selectedTask.status === 'in_progress' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setShowDetailsDialog(false)
                              setShowCompletionDialog(true)
                            }}
                            className="bg-secondary hover:bg-secondary"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Complete
                          </Button>
                        )}

                        {selectedTask.status === 'completed' && !selectedTask.completionReport && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setShowDetailsDialog(false)
                              setShowCompletionDialog(true)
                            }}
                            className="bg-primary hover:bg-primary"
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Submit Report
                          </Button>
                        )}

                        {selectedTask.status === 'completed' && selectedTask.completionReport && (
                          <Button
                            size="sm"
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/v1/expert/tasks/${selectedTask.id}/request-closure`, {
                                  method: 'POST',
                                  credentials: 'include',
                                })
                                if (response.ok) {
                                  await fetchAssignedTasks()
                                  setShowDetailsDialog(false)
                                  alert('Closure request submitted successfully!')
                                } else {
                                  alert('Failed to request closure. Please try again.')
                                }
                              } catch (error) {
                                console.error('Failed to request closure:', error)
                                alert('Failed to request closure. Please try again.')
                              }
                            }}
                            className="bg-accent hover:bg-accent"
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Request Closure
                          </Button>
                        )}

                        {selectedTask.status === 'pending_closure' && (
                          <Badge variant="outline" className="text-accent border-accent/50">
                            Awaiting Customer Approval
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Task Completion Dialog */}
      <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {selectedTask.status === 'in_progress' ? 'Mark Task as Complete' : selectedTask.completionReport ? 'Request Task Closure' : 'Submit Completion Report'}
                </DialogTitle>
                <DialogDescription>
                  Task: {selectedTask.title}
                  {selectedTask.status === 'in_progress' && <br />}
                  {selectedTask.status === 'in_progress' && <span className="text-primary">Submit your completion report to mark this task as complete.</span>}
                  {selectedTask.status === 'completed' && !selectedTask.completionReport && <br />}
                  {selectedTask.status === 'completed' && !selectedTask.completionReport && <span className="text-accent">This task was marked complete but needs a detailed report.</span>}
                  {selectedTask.completionReport && <br />}
                  {selectedTask.completionReport && <span className="text-secondary">Request closure to finalize this task.</span>}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {!selectedTask.completionReport && (
                  <div>
                    <Label htmlFor="completionReport" className="text-base font-medium">
                      Completion Report *
                    </Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Provide a detailed report describing what was accomplished, findings, recommendations, and any other relevant details.
                    </p>
                    <Textarea
                      id="completionReport"
                      value={completionReport}
                      onChange={(e) => setCompletionReport(e.target.value)}
                      placeholder="Please provide a comprehensive report of the completed work, including:
- Summary of tasks completed
- Key findings or discoveries
- Recommendations for the customer
- Any follow-up actions needed
- Additional observations or notes"
                      rows={8}
                      className="w-full"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      A detailed report is required to complete the task.
                    </p>
                  </div>
                )}

                {selectedTask.completionReport && (
                  <div>
                    <h4 className="font-semibold mb-2">Current Completion Report</h4>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{selectedTask.completionReport.report}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Submitted: {format(new Date(selectedTask.completionReport.submittedAt), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <div className="mt-4 p-4 bg-primary/10 rounded-lg">
                      <h5 className="font-medium text-primary mb-2">Request Task Closure</h5>
                      <p className="text-sm text-primary">
                        Your completion report has been submitted. Click "Request Task Closure" to notify the customer
                        that this task is ready to be finalized. The customer will review your work and
                        close the task once they approve it.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => {
                      if (selectedTask.completionReport) {
                        // Request closure
                        handleRequestClosure(selectedTask.id)
                      } else {
                        // Submit completion report
                        handleSubmitCompletion(selectedTask.id)
                      }
                    }}
                    disabled={isSubmittingCompletion || (!selectedTask.completionReport && !completionReport.trim())}
                    className="bg-primary hover:bg-primary flex-1"
                  >
                    {isSubmittingCompletion ? 'Processing...' :
                      selectedTask.completionReport ? 'Request Task Closure' :
                        selectedTask.status === 'in_progress' ? 'Mark Complete & Submit Report' :
                          'Submit Completion Report'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCompletionDialog(false)
                      setCompletionReport('')
                    }}
                    disabled={isSubmittingCompletion}
                  >
                    Cancel
                  </Button>
                </div>
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
                      <Badge variant="outline" className="ml-2">
                        {getStatusDisplayName(selectedTask.status).toUpperCase()}
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/api/v1/expert/tasks/${selectedTask.id}/files/${file.id}/download`, '_blank')}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowReportModal(false)}
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
