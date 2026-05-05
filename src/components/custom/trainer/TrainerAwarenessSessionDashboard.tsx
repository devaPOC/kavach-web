'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { trainerApi } from '@/lib/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as DatePicker } from '@/components/ui/calendar'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Building,
  Phone,
  Mail,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Calendar as CalendarIcon
} from 'lucide-react'
import {
  AwarenessSessionRequestResponse,
  AwarenessSessionStatus,
  STATUS_LABELS,
  DURATION_LABELS,
  SESSION_MODE_LABELS,
  AUDIENCE_TYPE_LABELS
} from '@/types/awareness-session'
import TrainerAwarenessSessionDetailsDialog from './TrainerAwarenessSessionDetailsDialog'
import TrainerAwarenessSessionResponseDialog from './TrainerAwarenessSessionResponseDialog'

interface TrainerAwarenessSessionDashboardProps {
  className?: string
}

export default function TrainerAwarenessSessionDashboard({ className }: TrainerAwarenessSessionDashboardProps) {
  const [requests, setRequests] = useState<AwarenessSessionRequestResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [selectedRequest, setSelectedRequest] = useState<AwarenessSessionRequestResponse | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showResponseDialog, setShowResponseDialog] = useState(false)
  const [responseAction, setResponseAction] = useState<'accept' | 'decline'>('accept')

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRequests, setTotalRequests] = useState(0)
  const limit = 10
  const [countsByStatus, setCountsByStatus] = useState<Record<AwarenessSessionStatus, number>>({
    pending_admin_review: 0,
    forwarded_to_expert: 0,
    confirmed: 0,
    rejected: 0,
    expert_declined: 0,
  })

  // Filters state
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'declined'>('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sessionMode, setSessionMode] = useState<'all' | 'on_site' | 'online'>('all')
  const [showStartCalendar, setShowStartCalendar] = useState(false)
  const [showEndCalendar, setShowEndCalendar] = useState(false)
  const [dateRange, setDateRange] = useState<{ startDate?: Date; endDate?: Date }>({})

  useEffect(() => {
    fetchRequests(currentPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, activeTab])

  // Debounce search for better UX
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  const fetchRequests = async (page: number = 1) => {
    try {
      setLoading(true)
      setError('')
      // Map active tab to status filter for server (if supported)
      const statusFilter = activeTab === 'pending'
        ? 'forwarded_to_expert'
        : activeTab === 'confirmed'
          ? 'confirmed'
          : 'expert_declined'

      const result = await trainerApi.getAwarenessSessionRequests(page, limit, {
        status: statusFilter as any,
        search: debouncedSearch || undefined,
        startDate: dateRange.startDate ? dateRange.startDate.toISOString() : undefined,
        endDate: dateRange.endDate ? dateRange.endDate.toISOString() : undefined,
        sessionMode: sessionMode !== 'all' ? sessionMode : undefined,
      })

      if (result.success && result.data) {
        // The API returns { requests: [], total: number, totalPages: number }
        setRequests(result.data.requests || [])
        setTotalRequests(result.data.total || 0)
        setTotalPages(result.data.totalPages || 1)
        setCurrentPage(result.data.page || page)
        if ((result.data as any).countsByStatus) {
          setCountsByStatus((result.data as any).countsByStatus)
        }
      } else {
        setError(result.error || 'Failed to fetch awareness session requests')
      }
    } catch (err: any) {
      console.error('Error fetching awareness session requests:', err)
      setError(err.message || 'Failed to fetch awareness session requests')
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = (request: AwarenessSessionRequestResponse) => {
    setSelectedRequest(request)
    setShowDetailsDialog(true)
  }

  const handleRespond = (request: AwarenessSessionRequestResponse, action: 'accept' | 'decline') => {
    setSelectedRequest(request)
    setResponseAction(action)
    setShowResponseDialog(true)
  }

  const handleResponseSubmit = async (notes?: string) => {
    if (!selectedRequest) return

    try {
      const result = await trainerApi.respondToAwarenessSessionRequest(selectedRequest.id, {
        action: responseAction,
        notes
      })

      if (result.success) {
        // Refresh the requests list
        await fetchRequests(currentPage)
        setShowResponseDialog(false)
        setSelectedRequest(null)
      } else {
        throw new Error(result.error || 'Failed to submit response')
      }
    } catch (err: any) {
      console.error('Error submitting response:', err)
      // Error handling is done in the dialog component
      throw err
    }
  }

  const getStatusBadgeVariant = (status: AwarenessSessionStatus) => {
    switch (status) {
      case 'forwarded_to_expert':
        return 'default'
      case 'confirmed':
        return 'default'
      case 'expert_declined':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const getStatusIcon = (status: AwarenessSessionStatus) => {
    switch (status) {
      case 'forwarded_to_expert':
        return <AlertCircle className="h-4 w-4" />
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />
      case 'expert_declined':
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatAudienceTypes = (types: string[]) => {
    return types.map(type => AUDIENCE_TYPE_LABELS[type as keyof typeof AUDIENCE_TYPE_LABELS]).join(', ')
  }

  // Derived filtered lists for current page (client-side refinement)
  const applyLocalFilters = useMemo(() => {
    return (list: AwarenessSessionRequestResponse[]) => {
      let filtered = list
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase()
        filtered = filtered.filter(r =>
          r.subject.toLowerCase().includes(q) ||
          r.organizationName.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q)
        )
      }
      if (sessionMode !== 'all') {
        filtered = filtered.filter(r => r.sessionMode === sessionMode)
      }
      if (dateRange.startDate) {
        filtered = filtered.filter(r => new Date(r.sessionDate) >= dateRange.startDate!)
      }
      if (dateRange.endDate) {
        filtered = filtered.filter(r => new Date(r.sessionDate) <= dateRange.endDate!)
      }
      return filtered
    }
  }, [debouncedSearch, sessionMode, dateRange])

  // Filter by status first (server asked) then refine locally
  const pendingRequests = applyLocalFilters(requests.filter(req => req.status === 'forwarded_to_expert'))
  const confirmedRequests = applyLocalFilters(requests.filter(req => req.status === 'confirmed'))
  const declinedRequests = applyLocalFilters(requests.filter(req => req.status === 'expert_declined'))

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary/50"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => fetchRequests(currentPage)} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">Awareness Session Requests</h2>
        <p className="text-muted-foreground">
          Manage your assigned awareness session requests and respond to new assignments.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative w-full md:max-w-sm">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/80" />
                  <Input
                    placeholder="Search by subject, organization, or location"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                    className="pl-9"
                    aria-label="Search requests"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setSearchTerm(''); setSessionMode('all'); setDateRange({}); setCurrentPage(1); fetchRequests(1) }}
                >
                  Clear
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Select value={sessionMode} onValueChange={(v: 'all' | 'on_site' | 'online') => { setSessionMode(v); setCurrentPage(1) }}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Session Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modes</SelectItem>
                    <SelectItem value="on_site">On-site</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>

                {/* Date Range */}
                <Popover open={showStartCalendar} onOpenChange={setShowStartCalendar}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {dateRange.startDate ? new Date(dateRange.startDate).toLocaleDateString() : 'Start date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-2 w-auto">
                    <DatePicker
                      mode="single"
                      selected={dateRange.startDate}
                      onSelect={(date) => { setDateRange(prev => ({ ...prev, startDate: date || undefined })); setShowStartCalendar(false); setCurrentPage(1) }}
                    />
                  </PopoverContent>
                </Popover>
                <Popover open={showEndCalendar} onOpenChange={setShowEndCalendar}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {dateRange.endDate ? new Date(dateRange.endDate).toLocaleDateString() : 'End date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-2 w-auto">
                    <DatePicker
                      mode="single"
                      selected={dateRange.endDate}
                      onSelect={(date) => { setDateRange(prev => ({ ...prev, endDate: date || undefined })); setShowEndCalendar(false); setCurrentPage(1) }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setCurrentPage(1) }} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Pending Response ({countsByStatus.forwarded_to_expert})
          </TabsTrigger>
          <TabsTrigger value="confirmed" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Confirmed ({countsByStatus.confirmed})
          </TabsTrigger>
          <TabsTrigger value="declined" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Declined ({countsByStatus.expert_declined})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground/80 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Pending Requests</h3>
                <p className="text-muted-foreground">
                  You don't have any awareness session requests waiting for your response.
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onViewDetails={handleViewDetails}
                onRespond={handleRespond}
                showActions={true}
              />
            ))
          )}

          {/* Pagination for Pending */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * limit) + 1} to {Math.min((currentPage - 1) * limit + pendingRequests.length, currentPage * limit)} on this page
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
        </TabsContent>

        <TabsContent value="confirmed" className="space-y-4">
          {confirmedRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-muted-foreground/80 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Confirmed Sessions</h3>
                <p className="text-muted-foreground">
                  You don't have any confirmed awareness sessions yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            confirmedRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onViewDetails={handleViewDetails}
                onRespond={handleRespond}
                showActions={false}
              />
            ))
          )}

          {/* Pagination for Confirmed */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * limit) + 1} to {Math.min((currentPage - 1) * limit + confirmedRequests.length, currentPage * limit)} on this page
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
        </TabsContent>

        <TabsContent value="declined" className="space-y-4">
          {declinedRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <XCircle className="h-12 w-12 text-muted-foreground/80 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Declined Requests</h3>
                <p className="text-muted-foreground">
                  You haven't declined any awareness session requests.
                </p>
              </CardContent>
            </Card>
          ) : (
            declinedRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onViewDetails={handleViewDetails}
                onRespond={handleRespond}
                showActions={false}
              />
            ))
          )}

          {/* Pagination for Declined */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * limit) + 1} to {Math.min((currentPage - 1) * limit + declinedRequests.length, currentPage * limit)} on this page
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
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      {selectedRequest && (
        <TrainerAwarenessSessionDetailsDialog
          request={selectedRequest}
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
        />
      )}

      {/* Response Dialog */}
      {selectedRequest && (
        <TrainerAwarenessSessionResponseDialog
          request={selectedRequest}
          action={responseAction}
          open={showResponseDialog}
          onOpenChange={setShowResponseDialog}
          onSubmit={handleResponseSubmit}
        />
      )}
    </div>
  )
}

interface RequestCardProps {
  request: AwarenessSessionRequestResponse
  onViewDetails: (request: AwarenessSessionRequestResponse) => void
  onRespond: (request: AwarenessSessionRequestResponse, action: 'accept' | 'decline') => void
  showActions: boolean
}

function RequestCard({ request, onViewDetails, onRespond, showActions }: RequestCardProps) {
  const getStatusBadgeVariant = (status: AwarenessSessionStatus) => {
    switch (status) {
      case 'forwarded_to_expert':
        return 'default'
      case 'confirmed':
        return 'default'
      case 'expert_declined':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const getStatusIcon = (status: AwarenessSessionStatus) => {
    switch (status) {
      case 'forwarded_to_expert':
        return <AlertCircle className="h-4 w-4" />
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />
      case 'expert_declined':
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatAudienceTypes = (types: string[]) => {
    return types.map(type => AUDIENCE_TYPE_LABELS[type as keyof typeof AUDIENCE_TYPE_LABELS]).join(', ')
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{request.subject}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              {request.organizationName}
            </CardDescription>
          </div>
          <Badge variant={getStatusBadgeVariant(request.status)} className="flex items-center gap-1">
            {getStatusIcon(request.status)}
            {STATUS_LABELS[request.status]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatDate(request.sessionDate)}</span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{DURATION_LABELS[request.duration]}</span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{SESSION_MODE_LABELS[request.sessionMode]} - {request.location}</span>
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{request.audienceSize} participants</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm">
            <span className="font-medium">Audience Types:</span> {formatAudienceTypes(request.audienceTypes)}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{request.contactEmail}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{request.contactPhone}</span>
          </div>
        </div>

        {request.specialRequirements && (
          <div className="bg-muted/50 p-3 rounded-md">
            <div className="flex items-start gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <span className="font-medium">Special Requirements:</span>
                <p className="mt-1 text-foreground/80">{request.specialRequirements}</p>
              </div>
            </div>
          </div>
        )}

        {request.adminNotes && (
          <div className="bg-primary/10 p-3 rounded-md">
            <div className="flex items-start gap-2 text-sm">
              <FileText className="h-4 w-4 text-primary mt-0.5" />
              <div>
                <span className="font-medium text-primary">Admin Notes:</span>
                <p className="mt-1 text-primary">{request.adminNotes}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(request)}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            View Details
          </Button>

          {showActions && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRespond(request, 'decline')}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Decline
              </Button>
              <Button
                size="sm"
                onClick={() => onRespond(request, 'accept')}
                className="bg-secondary hover:bg-secondary"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Accept
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
