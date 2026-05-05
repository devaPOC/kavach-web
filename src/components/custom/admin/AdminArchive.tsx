'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, User, AlertCircle, Eye, Trash2, Archive, RefreshCw, Filter, Download, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';

interface ArchivedServiceRequest {
  id: string;
  originalId: string;
  userId: string;
  assignedExpertId?: string;
  serviceType: string;
  status: string;
  priority: string;
  title: string;
  description?: string;
  data: any;
  assignedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string;
  archiveReason: 'user_deleted' | 'auto_completed';
  customerName?: string;
  customerEmail?: string;
  expertName?: string;
  expertEmail?: string;
}

interface ArchiveStats {
  total: number;
  userDeleted: number;
  autoCompleted: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
}

export default function AdminArchive() {
  const [requests, setRequests] = useState<ArchivedServiceRequest[]>([]);
  const [stats, setStats] = useState<ArchiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [archiveReasonFilter, setArchiveReasonFilter] = useState<string>('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRequests, setTotalRequests] = useState(0);

  // Modals
  const [selectedRequest, setSelectedRequest] = useState<ArchivedServiceRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingRequest, setDeletingRequest] = useState(false);
  const [archivingCompleted, setArchivingCompleted] = useState(false);

  // Fetch archived requests
  const fetchArchivedRequests = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });

      if (statusFilter && statusFilter !== 'all') {
        queryParams.append('status', statusFilter);
      }
      if (priorityFilter && priorityFilter !== 'all') {
        queryParams.append('priority', priorityFilter);
      }
      if (archiveReasonFilter && archiveReasonFilter !== 'all') {
        queryParams.append('archiveReason', archiveReasonFilter);
      }
      if (serviceTypeFilter && serviceTypeFilter !== 'all') {
        queryParams.append('serviceType', serviceTypeFilter);
      }
      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }
      if (dateFromFilter) {
        queryParams.append('dateFrom', dateFromFilter);
      }
      if (dateToFilter) {
        queryParams.append('dateTo', dateToFilter);
      }

      const response = await fetch(`/api/v1/admin/archive/service-requests?${queryParams}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch archived requests');
      }

      const result = await response.json();
      if (result.success) {
        setRequests(result.data.requests);
        setTotalPages(result.data.pagination.totalPages);
        setTotalRequests(result.data.pagination.total);
      } else {
        setError(result.error || 'Failed to load archived requests');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load archived requests');
    } finally {
      setLoading(false);
    }
  };

  // Fetch archive stats
  const fetchArchiveStats = async () => {
    try {
      const response = await fetch('/api/v1/admin/archive/stats', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch stats:', err);
    }
  };

  // Archive completed requests
  const archiveCompletedRequests = async () => {
    try {
      setArchivingCompleted(true);
      const response = await fetch('/api/v1/admin/archive/service-requests', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to archive completed requests');
      }

      const result = await response.json();
      if (result.success) {
        alert(`Successfully archived ${result.data.archivedCount} completed requests`);
        fetchArchivedRequests();
        fetchArchiveStats();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to archive completed requests');
    } finally {
      setArchivingCompleted(false);
    }
  };

  // Delete archived request
  const deleteArchivedRequest = async () => {
    if (!selectedRequest) return;

    try {
      setDeletingRequest(true);
      const response = await fetch(`/api/v1/admin/archive/service-requests/${selectedRequest.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete archived request');
      }

      const result = await response.json();
      if (result.success) {
        setShowDeleteModal(false);
        setSelectedRequest(null);
        fetchArchivedRequests();
        fetchArchiveStats();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete archived request');
    } finally {
      setDeletingRequest(false);
    }
  };

  useEffect(() => {
    fetchArchivedRequests();
  }, [currentPage, statusFilter, priorityFilter, archiveReasonFilter, serviceTypeFilter, searchTerm, dateFromFilter, dateToFilter]);

  useEffect(() => {
    fetchArchiveStats();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-accent/10 text-accent', text: 'Pending' },
      assigned: { color: 'bg-primary/10 text-primary', text: 'Assigned' },
      accepted: { color: 'bg-secondary/10 text-secondary', text: 'Accepted' },
      in_progress: { color: 'bg-secondary/10 text-secondary', text: 'In Progress' },
      completed: { color: 'bg-secondary/10 text-secondary', text: 'Completed' },
      rejected: { color: 'bg-destructive/10 text-destructive', text: 'Rejected' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      emergency: { color: 'bg-destructive/10 text-destructive border-destructive', text: 'Emergency' },
      urgent: { color: 'bg-accent/10 text-accent border-accent/50', text: 'Urgent' },
      high: { color: 'bg-accent/10 text-accent border-accent/50', text: 'High' },
      normal: { color: 'bg-secondary/10 text-secondary border-secondary/50', text: 'Normal' },
      low: { color: 'bg-muted text-foreground border-border', text: 'Low' },
    };

    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.normal;
    return <Badge variant="outline" className={config.color}>{config.text}</Badge>;
  };

  const getArchiveReasonBadge = (reason: string) => {
    const reasonConfig = {
      user_deleted: { color: 'bg-destructive/10 text-destructive', text: 'User Deleted' },
      auto_completed: { color: 'bg-primary/10 text-primary', text: 'Auto Archived' },
    };

    const config = reasonConfig[reason as keyof typeof reasonConfig] || reasonConfig.auto_completed;
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  if (loading && requests.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading archived requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive font-medium">Error loading archived requests</p>
              <p className="text-muted-foreground text-sm mt-2">{error}</p>
              <Button
                onClick={fetchArchivedRequests}
                className="mt-4"
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Archive Management</h2>
          <p className="text-muted-foreground">Manage archived service requests and cleanup completed tasks</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={archiveCompletedRequests}
            disabled={archivingCompleted}
            variant="outline"
          >
            <Archive className="h-4 w-4 mr-2" />
            {archivingCompleted ? 'Archiving...' : 'Archive Completed (1d+)'}
          </Button>
          <Button onClick={fetchArchivedRequests} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Archive Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Archived</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                </div>
                <Archive className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">User Deleted</p>
                  <p className="text-2xl font-bold text-destructive">{stats.userDeleted}</p>
                </div>
                <User className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Auto Completed</p>
                  <p className="text-2xl font-bold text-primary">{stats.autoCompleted}</p>
                </div>
                <Clock className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current Page</p>
                  <p className="text-2xl font-bold text-secondary">{requests.length}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-secondary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Pages</p>
                  <p className="text-2xl font-bold text-accent">{totalPages}</p>
                </div>
                <Calendar className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Priority</label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Archive Reason</label>
              <Select value={archiveReasonFilter} onValueChange={setArchiveReasonFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Reasons" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reasons</SelectItem>
                  <SelectItem value="user_deleted">User Deleted</SelectItem>
                  <SelectItem value="auto_completed">Auto Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Search</label>
              <Input
                placeholder="Search by title, customer, expert..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Date From</label>
              <Input
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Date To</label>
              <Input
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Archived Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Archived Service Requests</CardTitle>
          <CardDescription>
            {totalRequests} total archived requests
            {statusFilter !== 'all' && ` • Status: ${statusFilter}`}
            {priorityFilter !== 'all' && ` • Priority: ${priorityFilter}`}
            {archiveReasonFilter !== 'all' && ` • Reason: ${archiveReasonFilter}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requests.length === 0 ? (
              <div className="text-center py-8">
                <Archive className="h-12 w-12 text-muted-foreground/80 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">No archived requests found</p>
                <p className="text-muted-foreground/80 text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              requests.map((request) => (
                <div key={request.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{request.title}</h3>
                        {getStatusBadge(request.status)}
                        {getPriorityBadge(request.priority)}
                        {getArchiveReasonBadge(request.archiveReason)}
                      </div>

                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center gap-2">
                          <User size={14} />
                          <span>Customer: {request.customerName || 'Unknown'} ({request.customerEmail || 'N/A'})</span>
                        </div>

                        {request.expertName && (
                          <div className="flex items-center gap-2">
                            <User size={14} />
                            <span>Expert: {request.expertName} ({request.expertEmail})</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Calendar size={14} />
                          <span>Created: {format(new Date(request.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Archive size={14} />
                          <span>Archived: {format(new Date(request.archivedAt), 'MMM dd, yyyy HH:mm')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowDetailsModal(true);
                        }}
                      >
                        <Eye size={16} className="mr-1" />
                        Details
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowDeleteModal(true);
                        }}
                      >
                        <Trash2 size={16} className="mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              >
                Previous
              </Button>

              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Archived Request Details</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Original ID</label>
                  <p className="text-sm font-mono">{selectedRequest.originalId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Archive Reason</label>
                  <div className="mt-1">{getArchiveReasonBadge(selectedRequest.archiveReason)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Customer</label>
                  <p className="text-sm">{selectedRequest.customerName || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.customerEmail || 'N/A'}</p>
                </div>
                {selectedRequest.expertName && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Expert</label>
                    <p className="text-sm">{selectedRequest.expertName}</p>
                    <p className="text-sm text-muted-foreground">{selectedRequest.expertEmail}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Title</label>
                <p className="text-sm font-medium">{selectedRequest.title}</p>
              </div>

              {selectedRequest.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">
                    {selectedRequest.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground pt-4 border-t">
                <div>
                  <label className="font-medium">Created</label>
                  <p>{format(new Date(selectedRequest.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                </div>
                <div>
                  <label className="font-medium">Archived</label>
                  <p>{format(new Date(selectedRequest.archivedAt), 'MMM dd, yyyy HH:mm')}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowDetailsModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Archived Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this archived service request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <h4 className="font-medium">{selectedRequest.title}</h4>
              <p className="text-sm text-muted-foreground">Customer: {selectedRequest.customerName}</p>
              <p className="text-sm text-muted-foreground">Archived: {format(new Date(selectedRequest.archivedAt), 'MMM dd, yyyy HH:mm')}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={deletingRequest}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteArchivedRequest}
              disabled={deletingRequest}
            >
              {deletingRequest ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
