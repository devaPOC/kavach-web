'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Calendar,
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    Users,
    Clock,
    MapPin,
    Building,
    Phone,
    Mail,
    Eye,
    CheckCircle,
    XCircle,
    UserCheck,
    AlertCircle,
    FileText,
    MoreHorizontal,
    BarChart3
} from 'lucide-react'
import type {
    AwarenessSessionRequestResponse,
    AwarenessSessionStatus,
    SessionDuration,
    SessionMode,
    AudienceType
} from '@/types/awareness-session'
import {
    STATUS_LABELS,
    DURATION_LABELS,
    SESSION_MODE_LABELS,
    AUDIENCE_TYPE_LABELS
} from '@/types/awareness-session'
import AwarenessSessionReviewDialog from './AwarenessSessionReviewDialog'
import AwarenessSessionDetailsDialog from './AwarenessSessionDetailsDialog'
import AwarenessSessionExpertAssignDialog from './AwarenessSessionExpertAssignDialog'
import AwarenessSessionBulkActions from './AwarenessSessionBulkActions'
import { FilterToolbar } from '@/app/components/filters/FilterToolbar'
import { PaginationControls } from '@/app/components/pagination/PaginationControls'
import { useServerPagination } from '@/hooks/useServerPagination'
import { AdminDashboardLayout } from '@/app/components/admin/AdminDashboardLayout'
import AdminLoadingSkeleton, { AdminTilesSkeleton, AdminTableSkeleton } from '@/app/components/admin/AdminLoadingSkeleton'
import { AdminEmptyState } from '@/app/components/admin/AdminEmptyState'

interface AdminAwarenessSessionDashboardProps {
    onRefresh?: () => void
}

interface ExpertOption {
    id: string
    firstName: string
    lastName: string
    email: string
}

export default function AdminAwarenessSessionDashboard({ onRefresh }: AdminAwarenessSessionDashboardProps) {
    const [requests, setRequests] = useState<AwarenessSessionRequestResponse[]>([])
    const [experts, setExperts] = useState<ExpertOption[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string>('')
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<AwarenessSessionStatus | 'all'>('all')
    const [startDate, setStartDate] = useState<Date | undefined>(undefined)
    const [endDate, setEndDate] = useState<Date | undefined>(undefined)
    const [countsByStatus, setCountsByStatus] = useState<Record<string, number> | undefined>(undefined)
    // Additional state required for original logic
    const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set())
    const [totalRequests, setTotalRequests] = useState(0)
    const [pageSize] = useState(20)
    const [sessionMode, setSessionMode] = useState<'all' | 'on_site' | 'online'>('all')
    // Dialog states
    const [showReviewDialog, setShowReviewDialog] = useState(false)
    const [showDetailsDialog, setShowDetailsDialog] = useState(false)
    const [showAssignDialog, setShowAssignDialog] = useState(false)
    const [selectedRequest, setSelectedRequest] = useState<AwarenessSessionRequestResponse | null>(null)
    const [processingRequestId, setProcessingRequestId] = useState<string | null>(null)

    const fetchRequests = useCallback(async (page: number = 1, status?: AwarenessSessionStatus | 'all') => {
        try {
            setLoading(true)
            setError('')
            const params = new URLSearchParams({ page: page.toString(), limit: pageSize.toString() })
            if (status && status !== 'all') params.append('status', status)
            if (searchTerm.trim()) params.append('search', searchTerm.trim())
            if (startDate) params.append('startDate', startDate.toISOString())
            if (endDate) params.append('endDate', endDate.toISOString())
            if (sessionMode && sessionMode !== 'all') params.append('sessionMode', sessionMode)
            const response = await fetch(`/api/v1/admin/awareness-sessions?${params}`)
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const result = await response.json()
            if (result.success && result.data) {
                setRequests(result.data.requests || [])
                const total = result.data.total || 0
                setTotalRequests(total)
                setCountsByStatus(result.data.countsByStatus)
            } else {
                setError(result.error || 'Failed to fetch awareness session requests')
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch awareness session requests')
        } finally {
            setLoading(false)
        }
    }, [pageSize, searchTerm, startDate, endDate, sessionMode])

    const fetchExperts = async () => {
        try {
            const response = await fetch('/api/admin/experts')
            if (response.ok) {
                const result = await response.json()
                if (result.success && result.data) setExperts(result.data.experts || [])
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Failed to fetch experts:', err)
        }
    }

    const totalPages = Math.max(1, Math.ceil(totalRequests / pageSize))
    const { page: currentPage, setPage: setCurrentPage, next, prev } = useServerPagination({
        initialPage: 1,
        debounceMs: 300,
        totalPages,
        deps: [searchTerm, startDate, endDate, statusFilter, sessionMode],
        onFetch: (p) => fetchRequests(p, statusFilter === 'all' ? undefined : statusFilter),
    })

    useEffect(() => { fetchExperts() }, [])

    const handleStatusFilterChange = (status: string) => {
        const newStatus = (status === 'all' ? 'all' : status) as AwarenessSessionStatus | 'all'
        setStatusFilter(newStatus)
        setCurrentPage(1)
    }

    const handleRequestUpdated = () => {
        setShowReviewDialog(false)
        setShowAssignDialog(false)
        setShowDetailsDialog(false)
        setSelectedRequest(null)
        fetchRequests(currentPage, statusFilter === 'all' ? undefined : statusFilter)
        onRefresh?.()
    }

    const handleRequestSelect = (requestId: string, checked: boolean) => {
        const newSelected = new Set(selectedRequests)
        checked ? newSelected.add(requestId) : newSelected.delete(requestId)
        setSelectedRequests(newSelected)
    }

    const handleSelectAll = (checked: boolean) => {
        if (checked) setSelectedRequests(new Set(requests.map(r => r.id)))
        else setSelectedRequests(new Set())
    }

    const handleViewDetails = (request: AwarenessSessionRequestResponse) => { setSelectedRequest(request); setShowDetailsDialog(true) }
    const handleReviewRequest = (request: AwarenessSessionRequestResponse) => { setSelectedRequest(request); setShowReviewDialog(true) }
    const handleAssignExpert = (request: AwarenessSessionRequestResponse) => { setSelectedRequest(request); setShowAssignDialog(true) }

    const getStatusBadgeColor = (status: AwarenessSessionStatus) => {
        switch (status) {
            case 'pending_admin_review': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
            case 'forwarded_to_expert': return 'bg-blue-100 text-blue-800 border-blue-200'
            case 'confirmed': return 'bg-green-100 text-green-800 border-green-200'
            case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
            case 'expert_declined': return 'bg-orange-100 text-orange-800 border-orange-200'
            default: return 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }
    const getStatusIcon = (status: AwarenessSessionStatus) => {
        switch (status) {
            case 'pending_admin_review': return AlertCircle
            case 'forwarded_to_expert': return UserCheck
            case 'confirmed': return CheckCircle
            case 'rejected': return XCircle
            case 'expert_declined': return XCircle
            default: return AlertCircle
        }
    }
    const canReview = (status: AwarenessSessionStatus) => status === 'pending_admin_review' || status === 'expert_declined'
    const canReassignExpert = (status: AwarenessSessionStatus) => status === 'forwarded_to_expert' || status === 'expert_declined'
    const filteredRequests = requests

    const clearFilters = () => { setSearchTerm(''); setStartDate(undefined); setEndDate(undefined); setSessionMode('all') }

    // UI fragments (filters, tabs, summary tiles) rebuilt with correct variable availability
    const filtersNode = (
        <FilterToolbar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            placeholder="Search by organization, subject, email, or location..."
            showDateRange
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onClear={clearFilters}
            rightArea={
                <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                    <SelectTrigger className="w-48" aria-label="Filter by status">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending_admin_review">Pending Review</SelectItem>
                        <SelectItem value="forwarded_to_expert">With Expert</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="expert_declined">Expert Declined</SelectItem>
                    </SelectContent>
                </Select>
            }
            showSessionMode
            sessionMode={sessionMode}
            onSessionModeChange={setSessionMode}
        />
    )

    const statusTabs = (
        <div role="tablist" aria-label="Awareness session status filters" className="flex flex-wrap gap-2 mb-2">
            {([
                { key: 'all', label: 'All', count: totalRequests },
                { key: 'pending_admin_review', label: 'Pending', count: countsByStatus?.['pending_admin_review'] ?? 0 },
                { key: 'forwarded_to_expert', label: 'With Expert', count: countsByStatus?.['forwarded_to_expert'] ?? 0 },
                { key: 'confirmed', label: 'Confirmed', count: countsByStatus?.['confirmed'] ?? 0 },
                { key: 'rejected', label: 'Rejected', count: countsByStatus?.['rejected'] ?? 0 },
                { key: 'expert_declined', label: 'Expert Declined', count: countsByStatus?.['expert_declined'] ?? 0 },
            ] as Array<{ key: AwarenessSessionStatus | 'all'; label: string; count: number }>).map(tab => (
                <Button
                    key={tab.key}
                    variant={statusFilter === tab.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleStatusFilterChange(tab.key)}
                    className="rounded-full"
                    role="tab"
                    aria-selected={statusFilter === tab.key}
                >
                    <span className="mr-2">{tab.label}</span>
                    <Badge variant={statusFilter === tab.key ? 'secondary' : 'outline'}>{tab.count}</Badge>
                </Button>
            ))}
        </div>
    )

    const summaryTiles = (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-blue-600" /><span className="text-sm font-medium text-blue-700">Total Requests</span></div>
                <p className="text-2xl font-bold text-blue-800 mt-1">{totalRequests}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-yellow-600" /><span className="text-sm font-medium text-yellow-700">Pending Review</span></div>
                <p className="text-2xl font-bold text-yellow-800 mt-1">{countsByStatus?.['pending_admin_review'] ?? requests.filter(r => r.status === 'pending_admin_review').length}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-blue-600" /><span className="text-sm font-medium text-blue-700">With Expert</span></div>
                <p className="text-2xl font-bold text-blue-800 mt-1">{countsByStatus?.['forwarded_to_expert'] ?? requests.filter(r => r.status === 'forwarded_to_expert').length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /><span className="text-sm font-medium text-green-700">Confirmed</span></div>
                <p className="text-2xl font-bold text-green-800 mt-1">{countsByStatus?.['confirmed'] ?? requests.filter(r => r.status === 'confirmed').length}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="flex items-center gap-2"><XCircle className="h-4 w-4 text-red-600" /><span className="text-sm font-medium text-red-700">Rejected/Declined</span></div>
                <p className="text-2xl font-bold text-red-800 mt-1">{(countsByStatus?.['rejected'] ?? 0) + (countsByStatus?.['expert_declined'] ?? 0) || requests.filter(r => r.status === 'rejected' || r.status === 'expert_declined').length}</p>
            </div>
        </div>
    )

    return (
        <AdminDashboardLayout
            title="Awareness Session Requests"
            description="Manage and review cybersecurity awareness session requests."
            actions={<Button variant="outline" size="sm" onClick={() => window.open('/admin/awareness-sessions/analytics', '_blank')} className="flex items-center gap-1"><BarChart3 className="h-4 w-4" />Analytics</Button>}
            filters={filtersNode}
        >
            {loading && requests.length === 0 ? (
                <AdminLoadingSkeleton />
            ) : (
                <>
                    {statusTabs}
                    {summaryTiles}
                    <AwarenessSessionBulkActions selectedRequests={selectedRequests} requests={requests} experts={experts} onRequestsUpdated={handleRequestUpdated} onClearSelection={() => setSelectedRequests(new Set())} />
                    {error && <div className="p-3 bg-red-50 border border-red-200 rounded-md"><p className="text-sm text-red-600">{error}</p></div>}
                    {!loading && filteredRequests.length === 0 ? (
                        <AdminEmptyState title="No session requests match your filters" description="Try adjusting your search, date range, or status filters to see more requests." action={<Button variant="outline" onClick={clearFilters}>Clear filters</Button>} />
                    ) : (
                        <div className="border rounded-lg overflow-hidden">
                            <div className="overflow-x-auto relative">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left"><Checkbox checked={selectedRequests.size === filteredRequests.length && filteredRequests.length > 0} onCheckedChange={handleSelectAll} aria-label="Select all session requests" /></th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization & Session</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expert</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredRequests.map(request => {
                                            const StatusIcon = getStatusIcon(request.status)
                                            const assignedExpert = experts.find(e => e.id === request.assignedExpertId)
                                            return (
                                                <tr key={request.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-4"><Checkbox checked={selectedRequests.has(request.id)} onCheckedChange={(checked) => handleRequestSelect(request.id, checked as boolean)} aria-label={`Select request ${request.id}`} /></td>
                                                    <td className="px-4 py-4">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2"><Building className="h-4 w-4 text-gray-400" /><span className="font-medium text-gray-900">{request.organizationName}</span></div>
                                                            <div className="text-sm text-gray-600">{request.subject}</div>
                                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                                <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(request.sessionDate).toLocaleDateString()}</div>
                                                                <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{request.location}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="space-y-1 text-sm">
                                                            <div className="flex items-center gap-2"><Clock className="h-3 w-3 text-gray-400" /><span>{DURATION_LABELS[request.duration]}</span></div>
                                                            <div className="flex items-center gap-2"><Users className="h-3 w-3 text-gray-400" /><span>{request.audienceSize} people</span></div>
                                                            <div className="text-xs text-gray-500">{SESSION_MODE_LABELS[request.sessionMode]}</div>
                                                            <div className="text-xs text-gray-500">{request.audienceTypes.map(type => AUDIENCE_TYPE_LABELS[type]).join(', ')}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4"><div className="flex items-center gap-2"><StatusIcon className="h-4 w-4" /><Badge className={getStatusBadgeColor(request.status)}>{STATUS_LABELS[request.status]}</Badge></div></td>
                                                    <td className="px-4 py-4">{assignedExpert ? (<div className="text-sm"><div className="font-medium text-gray-900">{assignedExpert.firstName} {assignedExpert.lastName}</div><div className="text-gray-500">{assignedExpert.email}</div></div>) : (<span className="text-sm text-gray-400">Not assigned</span>)}</td>
                                                    <td className="px-4 py-4 text-sm text-gray-500">{new Date(request.createdAt).toLocaleDateString()}</td>
                                                    <td className="px-4 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button variant="ghost" size="sm" onClick={() => handleViewDetails(request)} className="h-8 w-8 p-0" aria-label="View details"><Eye className="h-4 w-4" /></Button>
                                                            {canReview(request.status) && (
                                                                <Button variant="ghost" size="sm" onClick={() => handleReviewRequest(request)} className="h-8 w-8 p-0" disabled={processingRequestId === request.id} title={request.status === 'pending_admin_review' ? 'Review Request' : 'Re-review Request'} aria-label={request.status === 'pending_admin_review' ? 'Review request' : 'Re-review request'}>
                                                                    {request.status === 'pending_admin_review' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                                                                </Button>
                                                            )}
                                                            {canReassignExpert(request.status) && (
                                                                <Button variant="ghost" size="sm" onClick={() => handleAssignExpert(request)} className="h-8 w-8 p-0" disabled={processingRequestId === request.id} title="Reassign Expert" aria-label="Reassign expert"><UserCheck className="h-4 w-4" /></Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <PaginationControls page={currentPage} totalPages={totalPages} startLabel={`Showing ${((currentPage - 1) * pageSize) + 1} to ${Math.min(currentPage * pageSize, totalRequests)} of ${totalRequests} requests`} onPrev={prev} onNext={next} />
                        </div>
                    )}
                </>
            )}
            <AwarenessSessionDetailsDialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog} request={selectedRequest} expert={selectedRequest?.assignedExpertId ? experts.find(e => e.id === selectedRequest.assignedExpertId) : undefined} />
            <AwarenessSessionReviewDialog open={showReviewDialog} onOpenChange={setShowReviewDialog} request={selectedRequest} experts={experts} onRequestUpdated={handleRequestUpdated} />
            <AwarenessSessionExpertAssignDialog open={showAssignDialog} onOpenChange={setShowAssignDialog} request={selectedRequest} experts={experts} onRequestUpdated={handleRequestUpdated} />
        </AdminDashboardLayout>
    )
}
