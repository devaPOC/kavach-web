'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Building,
  FileText,
  Eye,
  Edit,
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
} from 'lucide-react';

import {
  type AwarenessSessionRequestResponse,
  type AwarenessSessionStatus,
  STATUS_LABELS,
  DURATION_LABELS,
  SESSION_MODE_LABELS,
  AUDIENCE_TYPE_LABELS
} from '@/types/awareness-session';
import FilterToolbar from '@/app/components/filters/FilterToolbar';
import EmptyState from '@/app/components/EmptyState';
import PaginationControls from '@/app/components/pagination/PaginationControls';
import { useWebsocket } from '@/hooks/useWebsocket';

interface CustomerAwarenessSessionDashboardProps {
  onCreateNew?: () => void;
  onViewDetails?: (requestId: string) => void;
  onEditRequest?: (requestId: string) => void;
  statusTab?: 'all' | 'active' | 'completed' | 'rejected';
  search?: string;
}

export function CustomerAwarenessSessionDashboard({
  onCreateNew,
  onViewDetails,
  onEditRequest,
  statusTab,
  search
}: CustomerAwarenessSessionDashboardProps) {
  const [requests, setRequests] = useState<AwarenessSessionRequestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed' | 'rejected'>('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRequests, setTotalRequests] = useState(0);
  const limit = 10;

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sessionMode, setSessionMode] = useState<'all' | 'on_site' | 'online'>('all');
  const [dateRange, setDateRange] = useState<{ startDate?: Date; endDate?: Date }>({});

  // Sync incoming props to local state
  useEffect(() => {
    if (typeof statusTab !== 'undefined') setActiveTab(statusTab);
  }, [statusTab]);

  useEffect(() => {
    if (typeof search === 'string') setSearchTerm(search);
  }, [search]);

  useWebsocket((payload) => {
    if (payload.event.startsWith('awareness_session_')) {
      fetchRequests(currentPage);
    }
  });

  // Fetch user's awareness session requests
  useEffect(() => {
    fetchRequests(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, activeTab, debouncedSearch, sessionMode, dateRange.startDate, dateRange.endDate]);

  // Debounce search for better UX
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchRequests = async (page: number = 1) => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      // Map active tab to server status if specific
      if (activeTab === 'completed') params.append('status', 'confirmed');
      if (activeTab === 'rejected') params.append('status', 'rejected');
      // Note: 'active' is a composite (pending_admin_review + forwarded_to_expert); keep server without status and filter client-side

      if (debouncedSearch) params.append('search', debouncedSearch);
      if (dateRange.startDate) params.append('startDate', dateRange.startDate.toISOString());
      if (dateRange.endDate) params.append('endDate', dateRange.endDate.toISOString());
      if (sessionMode !== 'all') params.append('sessionMode', sessionMode);

      const response = await fetch(`/api/v1/awareness-sessions?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch awareness session requests');
      }

      const result = await response.json();

      if (result.success) {
        setRequests(result.data.requests || []);
        setTotalRequests(result.data.total || 0);
        setTotalPages(result.data.totalPages || 1);
        setCurrentPage(result.data.page || 1);
      } else {
        throw new Error(result.message || 'Failed to fetch requests');
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: AwarenessSessionStatus) => {
    switch (status) {
      case 'confirmed':
        return 'default'; // Uses default variant (usually primary/dark in code, but we will custom style)
      case 'pending_admin_review':
        return 'secondary';
      case 'forwarded_to_expert':
        return 'outline';
      case 'rejected':
      case 'expert_declined':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  // Custom class for badges to match new design system
  const getStatusBadgeClass = (status: AwarenessSessionStatus) => {
    switch (status) {
      case 'confirmed':
        return 'bg-secondary/10 text-secondary hover:bg-secondary/10 border-secondary/50';
      case 'pending_admin_review':
        return 'bg-accent/10 text-accent hover:bg-accent/10 border-accent/50';
      case 'forwarded_to_expert':
        return 'bg-primary/10 text-primary hover:bg-primary/10 border-primary/50';
      case 'rejected':
      case 'expert_declined':
        return 'bg-destructive/10 text-destructive hover:bg-destructive/10 border-destructive';
      default:
        return 'bg-muted text-foreground/80 hover:bg-muted/80 border-border';
    }
  };

  // Get status icon
  const getStatusIcon = (status: AwarenessSessionStatus) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
      case 'expert_declined':
        return <XCircle className="w-4 h-4" />;
      case 'pending_admin_review':
      case 'forwarded_to_expert':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Filter requests by status (client-side refinement for composite tabs)
  const filterRequests = (status: 'all' | 'active' | 'completed' | 'rejected') => {
    if (status === 'all') return requests;
    if (status === 'active') {
      return requests.filter(req =>
        ['pending_admin_review', 'forwarded_to_expert'].includes(req.status)
      );
    }
    if (status === 'completed') {
      return requests.filter(req => req.status === 'confirmed');
    }
    if (status === 'rejected') {
      return requests.filter(req =>
        ['rejected', 'expert_declined'].includes(req.status)
      );
    }
    return requests;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check if request can be edited
  const canEditRequest = (status: AwarenessSessionStatus) => {
    return status === 'pending_admin_review';
  };

  const filteredRequests = filterRequests(activeTab);

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading your awareness session requests...</span>
            </div>
          </CardContent>
        </Card>
        {/* Skeleton list to reduce layout shift */}
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/3 mb-3" />
                <div className="h-3 bg-muted rounded w-1/4 mb-5" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="h-3 bg-muted rounded w-3/4" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button
            onClick={() => fetchRequests(currentPage)}
            className="mt-4"
            variant="outline"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // If there is absolutely no data (totalRequests === 0), show an empty page with only Refresh button
  if (totalRequests === 0) {
    return (
      <EmptyState
        title="No awareness session requests"
        message="When you submit a request, it will appear here."
        onRefresh={() => fetchRequests(1)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Awareness Session Requests</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage and track your awareness sessions.</p>
        </div>
        {onCreateNew && (
          <Button onClick={onCreateNew} className="flex items-center gap-2 bg-primary hover:bg-primary text-white shadow-sm transition-all hover:shadow-md">
            <Plus className="w-4 h-4" />
            New Request
          </Button>
        )}
      </div>

      {/* Filters (hidden when no data) */}
      <FilterToolbar
        className="mb-2"
        searchValue={searchTerm}
        onSearchChange={(v) => { setSearchTerm(v); setCurrentPage(1); }}
        placeholder="Search by subject, organization, or location"
        showSessionMode
        sessionMode={sessionMode}
        onSessionModeChange={(v) => { setSessionMode(v); setCurrentPage(1); }}
        showDateRange
        startDate={dateRange.startDate}
        endDate={dateRange.endDate}
        onStartDateChange={(d) => { setDateRange(prev => ({ ...prev, startDate: d })); setCurrentPage(1); }}
        onEndDateChange={(d) => { setDateRange(prev => ({ ...prev, endDate: d })); setCurrentPage(1); }}
        onClear={() => { setSearchTerm(''); setSessionMode('all'); setDateRange({}); setCurrentPage(1); fetchRequests(1); }}
      />

      {/* Minimal list (no tabs) */}
      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {activeTab === 'all'
                ? 'No awareness session requests yet'
                : `No ${activeTab} requests`
              }
            </h3>
            <p className="text-muted-foreground mb-4">
              {activeTab === 'all'
                ? 'Get started by creating your first awareness session request'
                : `You don't have any ${activeTab} requests at the moment`
              }
            </p>
            {activeTab === 'all' && onCreateNew && (
              <Button onClick={onCreateNew} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create First Request
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredRequests.map((request) => (
            <Card key={request.id} className="border-border rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 ease-out group bg-card">
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{request.subject}</CardTitle>
                    <CardDescription className="flex items-center gap-2 text-muted-foreground">
                      <Building className="w-4 h-4 text-muted-foreground/80" />
                      {request.organizationName === 'Unknown Organization' ? 'Personal Request' : request.organizationName}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border shadow-sm ${getStatusBadgeClass(request.status)}`}
                    >
                      {getStatusIcon(request.status)}
                      {STATUS_LABELS[request.status]}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-4">
                {/* Session Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4 text-muted-foreground/80" />
                    <span className="font-medium">{formatDate(request.sessionDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 text-muted-foreground/80" />
                    <span className="truncate">{request.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4 text-muted-foreground/80" />
                    <span>{DURATION_LABELS[request.duration]}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4 text-muted-foreground/80" />
                    <span>{request.audienceSize} participants</span>
                  </div>
                </div>

                {/* Audience Types */}
                <div className="flex flex-wrap gap-2">
                  {request.audienceTypes.map((type) => (
                    <Badge key={type} variant="secondary" className="text-xs bg-muted text-muted-foreground hover:bg-muted/80 border-transparent font-normal">
                      {AUDIENCE_TYPE_LABELS[type]}
                    </Badge>
                  ))}
                </div>

                {/* Session Mode */}
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md">
                  <span className="font-medium text-foreground/80">Mode:</span> {SESSION_MODE_LABELS[request.sessionMode]}
                </div>

                {/* Expert Information (if assigned and confirmed) */}
                {request.status === 'confirmed' && request.assignedExpertId && (
                  <div className="bg-secondary/10/50 border border-secondary/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-secondary font-medium mb-1">
                      <User className="w-4 h-4" />
                      Expert Assigned
                    </div>
                    <div className="text-sm text-secondary">
                      Your session has been confirmed. Expert contact details will be shared via email.
                    </div>
                  </div>
                )}

                {/* Rejection Reason */}
                {(request.status === 'rejected' || request.status === 'expert_declined') && request.rejectionReason && (
                  <div className="bg-destructive/10/50 border border-destructive rounded-lg p-3">
                    <div className="text-destructive font-medium mb-1 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {request.status === 'rejected' ? 'Rejection Reason' : 'Expert Declined'}
                    </div>
                    <div className="text-sm text-destructive">
                      {request.rejectionReason}
                    </div>
                  </div>
                )}

                {/* Admin Notes */}
                {request.adminNotes && (
                  <div className="bg-primary/10/50 border border-primary/50 rounded-lg p-3">
                    <div className="text-primary font-medium mb-1">Admin Notes</div>
                    <div className="text-sm text-primary">{request.adminNotes}</div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-border/50 mt-2">
                  {onViewDetails && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(request.id)}
                      className="flex items-center gap-2 text-primary border-primary/50 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </Button>
                  )}

                  {canEditRequest(request.status) && onEditRequest && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditRequest(request.id)}
                      className="flex items-center gap-2 text-foreground/80 border-border hover:bg-muted/50 hover:text-foreground"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Request
                    </Button>
                  )}

                  <div className="ml-auto text-xs text-muted-foreground/80 font-medium">
                    Created {formatDate(request.createdAt)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PaginationControls
        page={currentPage}
        totalPages={totalPages}
        startLabel={`Showing ${((currentPage - 1) * limit) + 1} to ${Math.min(currentPage * limit, totalRequests)} of ${totalRequests} requests`}
        onPrev={() => setCurrentPage(Math.max(1, currentPage - 1))}
        onNext={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
      />
    </div>
  );
}
