'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { Calendar, Clock, User, UserCheck, AlertCircle, Eye, UserPlus, CheckCircle2, X, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import QuoteCreationModal from './QuoteCreationModal';
import ServiceRequestManageModal from './ServiceRequestManageModal';


interface ServiceRequest {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  assignedExpertId?: string;
  expertName?: string;
  expertEmail?: string;
  serviceType?: string;
  status: string;
  priority?: string;
  title?: string;
  description?: string;
  assignedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Quote information
  quotes?: QuoteInfo[];
  hasActiveQuote?: boolean;
  latestQuoteStatus?: string;
}

interface QuoteInfo {
  id: string;
  quoteNumber: string;
  quotedPrice: string;
  currency: string;
  status: string;
  createdAt: Date;
  validUntil?: Date;
}

interface Expert {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isApproved: boolean;
}

export default function ServiceManagement() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [quotes, setQuotes] = useState<Record<string, QuoteInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRequests, setTotalRequests] = useState(0);

  // Modal states
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [selectedExpertId, setSelectedExpertId] = useState<string>('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [assigningExpert, setAssigningExpert] = useState(false);
  const [deletingRequest, setDeletingRequest] = useState(false);

  // Collapsible states for grouped customers
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  // Fetch quotes for service requests
  const fetchQuotesForRequests = async (requestIds: string[]) => {
    try {
      const quotesData: Record<string, QuoteInfo[]> = {};

      // Fetch quotes for each service request
      for (const requestId of requestIds) {
        try {
          const response = await fetch(`/api/v1/admin/quotes?serviceRequestId=${requestId}`, {
            method: 'GET',
            credentials: 'include',
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data.quotes) {
              quotesData[requestId] = result.data.quotes.map((quote: any) => ({
                id: quote.id,
                quoteNumber: quote.quoteNumber,
                quotedPrice: quote.quotedPrice,
                currency: quote.currency,
                status: quote.status,
                createdAt: new Date(quote.createdAt),
                validUntil: quote.validUntil ? new Date(quote.validUntil) : undefined,
              }));
            }
          }
        } catch (err) {
          console.warn(`Failed to fetch quotes for request ${requestId}:`, err);
        }
      }

      setQuotes(quotesData);
    } catch (err) {
      console.error('Failed to fetch quotes:', err);
    }
  };

  // Fetch service requests
  const fetchServiceRequests = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });

      if (statusFilter && statusFilter !== 'all') {
        queryParams.append('status', statusFilter);
      }
      if (priorityFilter && priorityFilter !== 'all') {
        queryParams.append('priority', priorityFilter);
      }

      const response = await fetch(`/api/v1/admin/service-requests?${queryParams}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch service requests');
      }

      const result = await response.json();
      if (result.success) {
        const requestsData = result.data.requests;
        setRequests(requestsData);
        setTotalPages(result.data.pagination.totalPages);
        setTotalRequests(result.data.pagination.total);

        // Fetch quotes for these requests
        const requestIds = requestsData.map((req: ServiceRequest) => req.id);
        await fetchQuotesForRequests(requestIds);
      } else {
        setError(result.error || 'Failed to load service requests');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load service requests');
    } finally {
      setLoading(false);
    }
  };

  // Fetch experts for assignment
  const fetchExperts = async () => {
    try {
      const response = await fetch('/api/v1/admin/users?role=expert&approved=true', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch experts');
      }

      const result = await response.json();
      if (result.success) {
        setExperts(result.data.users || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch experts:', err);
    }
  };

  // Assign expert to service request
  const assignExpert = async () => {
    if (!selectedRequest || !selectedExpertId) return;

    try {
      setAssigningExpert(true);
      const response = await fetch(`/api/v1/admin/service-requests/${selectedRequest.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ expertId: selectedExpertId }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign expert');
      }

      const result = await response.json();
      if (result.success) {
        // Refresh the requests list
        fetchServiceRequests();
        setShowAssignModal(false);
        setSelectedRequest(null);
        setSelectedExpertId('');
      } else {
        setError(result.error || 'Failed to assign expert');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to assign expert');
    } finally {
      setAssigningExpert(false);
    }
  };

  // Delete service request
  const deleteServiceRequest = async () => {
    if (!selectedRequest) return;

    try {
      setDeletingRequest(true);
      const response = await fetch(`/api/v1/admin/service-requests/${selectedRequest.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete service request');
      }

      const result = await response.json();
      if (result.success) {
        // Refresh the requests list
        fetchServiceRequests();
        setShowDeleteModal(false);
        setSelectedRequest(null);
      } else {
        setError(result.error || 'Failed to delete service request');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete service request');
    } finally {
      setDeletingRequest(false);
    }
  };

  // Group unassigned requests by customer
  const groupRequestsByCustomer = () => {
    const unassignedRequests = requests.filter(r => r.status === 'pending');
    const assignedAndOtherRequests = requests.filter(r => r.status !== 'pending');

    // Group unassigned requests by customer
    const groupedUnassigned = unassignedRequests.reduce((groups, request) => {
      const customerKey = `${request.customerEmail}`;
      if (!groups[customerKey]) {
        groups[customerKey] = {
          customer: {
            name: request.customerName,
            email: request.customerEmail
          },
          requests: []
        };
      }
      groups[customerKey].requests.push(request);
      return groups;
    }, {} as Record<string, { customer: { name: string; email: string }; requests: ServiceRequest[] }>);

    return {
      groupedUnassigned,
      assignedAndOtherRequests
    };
  };

  // Determine button visibility based on complex business logic
  const getButtonVisibility = (request: ServiceRequest) => {
    const requestQuotes = quotes[request.id] || [];
    const hasQuotes = requestQuotes.length > 0;
    const activeQuotes = requestQuotes.filter(q => ['sent', 'pending'].includes(q.status));
    const acceptedQuotes = requestQuotes.filter(q => q.status === 'accepted');
    const hasActiveQuote = activeQuotes.length > 0;
    const hasAcceptedQuote = acceptedQuotes.length > 0;
    const isAssigned = !!request.assignedExpertId;

    return {
      canCreateQuote:
        request.status === 'pending' &&
        !hasActiveQuote &&
        !hasAcceptedQuote &&
        !isAssigned, // Cannot create quote if already assigned to expert

      canAssignExpert:
        request.status === 'pending' &&
        !isAssigned &&
        !hasAcceptedQuote, // Can assign if no accepted quote (quotes need expert assignment)

      canDelete:
        request.status === 'pending' &&
        !isAssigned &&
        !hasAcceptedQuote,

      canManage:
        isAssigned ||
        hasAcceptedQuote ||
        ['assigned', 'accepted', 'in_progress'].includes(request.status),

      showQuoteStatus: hasQuotes,
      quoteStatusInfo: {
        hasActiveQuote,
        hasAcceptedQuote,
        activeQuoteCount: activeQuotes.length,
        totalQuoteCount: requestQuotes.length,
        latestQuote: requestQuotes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
      }
    };
  };

  // Auto-collapse groups that no longer have unassigned tasks
  useEffect(() => {
    const { groupedUnassigned } = groupRequestsByCustomer();
    const currentGroupKeys = Object.keys(groupedUnassigned);

    // Remove groups from openGroups if they no longer exist (all tasks assigned/closed)
    setOpenGroups(prev => {
      const newOpenGroups = new Set(prev);
      const keysToRemove = [...prev].filter(key => !currentGroupKeys.includes(key));
      keysToRemove.forEach(key => newOpenGroups.delete(key));
      return newOpenGroups;
    });
  }, [requests]); const toggleGroup = (customerEmail: string) => {
    const newOpenGroups = new Set(openGroups);
    if (newOpenGroups.has(customerEmail)) {
      newOpenGroups.delete(customerEmail);
    } else {
      newOpenGroups.add(customerEmail);
    }
    setOpenGroups(newOpenGroups);
  };

  const renderSingleRequest = (request: ServiceRequest) => {
    const buttonVisibility = getButtonVisibility(request);
    const requestQuotes = quotes[request.id] || [];

    return (
      <div key={request.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground">{request.title || 'Service Request'}</h3>
              {getStatusBadge(request.status)}
              {getPriorityBadge(request.priority)}

              {/* Quote status indicators */}
              {buttonVisibility.showQuoteStatus && (
                <>
                  {buttonVisibility.quoteStatusInfo.hasAcceptedQuote && (
                    <Badge className="bg-secondary/10 text-secondary">
                      <CheckCircle2 size={12} className="mr-1" />
                      Quote Accepted
                    </Badge>
                  )}
                  {buttonVisibility.quoteStatusInfo.hasActiveQuote && !buttonVisibility.quoteStatusInfo.hasAcceptedQuote && (
                    <Badge className="bg-accent/10 text-accent">
                      <Clock size={12} className="mr-1" />
                      Quote Pending
                    </Badge>
                  )}
                  {requestQuotes.length > 0 && !buttonVisibility.quoteStatusInfo.hasActiveQuote && !buttonVisibility.quoteStatusInfo.hasAcceptedQuote && (
                    <Badge className="bg-muted text-foreground">
                      <X size={12} className="mr-1" />
                      Quote Rejected
                    </Badge>
                  )}
                </>
              )}
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <User size={14} />
                <span>{request.customerName} ({request.customerEmail})</span>
              </div>
              {request.expertName && (
                <div className="flex items-center gap-2">
                  <UserCheck size={14} />
                  <span>Assigned to: {request.expertName}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar size={14} />
                <span>Created: {format(new Date(request.createdAt), 'MMM dd, yyyy HH:mm')}</span>
              </div>

              {/* Quote information */}
              {buttonVisibility.showQuoteStatus && buttonVisibility.quoteStatusInfo.latestQuote && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-secondary">₹</span>
                  <span>
                    Latest Quote: {buttonVisibility.quoteStatusInfo.latestQuote.quotedPrice} {buttonVisibility.quoteStatusInfo.latestQuote.currency}
                    {requestQuotes.length > 1 && ` (${requestQuotes.length} total)`}
                  </span>
                </div>
              )}
            </div>

            {request.description && (
              <p className="text-sm text-foreground/80 line-clamp-2">
                {request.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
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

            {/* Conditional action buttons based on complex business logic */}
            {buttonVisibility.canCreateQuote && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedRequest(request);
                  setShowQuoteModal(true);
                }}
                className="border-secondary/50 text-secondary hover:bg-secondary/10"
                title="Create a new quote for this service request"
              >
                <span className="text-[10px] font-semibold mr-1">₹</span>
                Create Quote
              </Button>
            )}

            {buttonVisibility.canAssignExpert && (
              <Button
                size="sm"
                onClick={() => {
                  setSelectedRequest(request);
                  setShowAssignModal(true);
                }}
                title={buttonVisibility.quoteStatusInfo.hasActiveQuote ?
                  "Assign expert to handle the quoted service" :
                  "Assign expert to this service request"
                }
              >
                <UserPlus size={16} className="mr-1" />
                Assign Expert
              </Button>
            )}

            {buttonVisibility.canDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedRequest(request);
                  setShowDeleteModal(true);
                }}
                className="border-destructive text-destructive hover:bg-destructive/10"
                title="Delete this service request"
              >
                <Trash2 size={16} className="mr-1" />
                Delete
              </Button>
            )}

            {buttonVisibility.canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedRequest(request);
                  setShowManageModal(true);
                }}
                className="border-primary/50 text-primary hover:bg-primary/10"
                title="Manage this assigned service request"
              >
                <UserCheck size={16} className="mr-1" />
                Manage
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderGroupedUnassignedRequests = (groupedUnassigned: Record<string, { customer: { name: string; email: string }; requests: ServiceRequest[] }>) => {
    return Object.entries(groupedUnassigned).map(([customerEmail, group]) => {
      const isOpen = openGroups.has(customerEmail);
      const requestCount = group.requests.length;

      // If only one request, render it normally
      if (requestCount === 1) {
        return renderSingleRequest(group.requests[0]);
      }

      // Multiple requests - create collapsible group
      return (
        <Collapsible key={customerEmail} open={isOpen} onOpenChange={() => toggleGroup(customerEmail)}>
          <div className="border border-border rounded-lg overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50">
            <CollapsibleTrigger asChild>
              <div className="w-full p-4 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 transition-transform duration-200">
                      {isOpen ? <ChevronDown size={16} className="text-primary" /> : <ChevronRight size={16} className="text-primary" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <User size={16} className="text-primary" />
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">{group.customer.name}</span>
                        <div className="text-sm text-muted-foreground">{group.customer.email}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-accent/10 text-accent border border-accent/50 shadow-sm">
                      <Clock size={12} className="mr-1" />
                      {requestCount} Unassigned Task{requestCount > 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="border-t border-border">
                <div className="p-4 space-y-3 bg-muted/50">
                  {group.requests.map((request, index) => (
                    <div key={request.id} className="bg-card rounded-lg p-3 border border-border shadow-sm hover:shadow-md transition-shadow duration-200">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-medium text-foreground">{request.title || 'Service Request'}</h4>
                            {getPriorityBadge(request.priority)}
                          </div>

                          <div className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar size={12} />
                              <span>Created: {format(new Date(request.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                            </div>
                            {request.serviceType && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="font-medium">Service:</span>
                                <span>{request.serviceType}</span>
                              </div>
                            )}
                          </div>

                          {request.description && (
                            <p className="text-sm text-foreground/80 line-clamp-2 bg-muted/50 p-2 rounded">
                              {request.description}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowDetailsModal(true);
                            }}
                          >
                            <Eye size={14} className="mr-1" />
                            Details
                          </Button>

                          {(() => {
                            const buttonVisibility = getButtonVisibility(request);
                            return (
                              <>
                                {buttonVisibility.canCreateQuote && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setShowQuoteModal(true);
                                    }}
                                    className="border-secondary/50 text-secondary hover:bg-secondary/10"
                                    title="Create a new quote for this service request"
                                  >
                                    <span className="text-[10px] font-semibold mr-1">₹</span>
                                    Quote
                                  </Button>
                                )}

                                {buttonVisibility.canAssignExpert && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setShowAssignModal(true);
                                    }}
                                    className="bg-primary hover:bg-primary"
                                    title={buttonVisibility.quoteStatusInfo.hasActiveQuote ?
                                      "Assign expert to handle the quoted service" :
                                      "Assign expert to this service request"
                                    }
                                  >
                                    <UserPlus size={14} className="mr-1" />
                                    Assign Expert
                                  </Button>
                                )}

                                {buttonVisibility.canDelete && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setShowDeleteModal(true);
                                    }}
                                    className="border-destructive text-destructive hover:bg-destructive/10"
                                    title="Delete this service request"
                                  >
                                    <Trash2 size={14} className="mr-1" />
                                    Delete
                                  </Button>
                                )}

                                {buttonVisibility.canManage && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setShowManageModal(true);
                                    }}
                                    className="border-primary/50 text-primary hover:bg-primary/10"
                                    title="Manage this assigned service request"
                                  >
                                    <UserCheck size={14} className="mr-1" />
                                    Manage
                                  </Button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Smart bulk assign button */}
                  {(() => {
                    const assignableRequests = group.requests.filter(req => getButtonVisibility(req).canAssignExpert);
                    const hasQuotedRequests = group.requests.some(req => {
                      const requestQuotes = quotes[req.id] || [];
                      return requestQuotes.some(q => ['sent', 'pending', 'accepted'].includes(q.status));
                    });

                    if (assignableRequests.length > 1) {
                      return (
                        <div className="mt-4 pt-3 border-t border-border">
                          <div className="flex justify-between items-center">
                            <div className="text-sm text-muted-foreground">
                              <span>Assign {assignableRequests.length} tasks to the same expert?</span>
                              {hasQuotedRequests && (
                                <div className="text-xs text-primary mt-1">
                                  Some requests have active quotes
                                </div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRequest(assignableRequests[0]);
                                setShowAssignModal(true);
                              }}
                              className="border-primary/50 text-primary hover:bg-primary/10"
                            >
                              <UserPlus size={14} className="mr-1" />
                              Bulk Assign
                            </Button>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      );
    });
  };

  useEffect(() => {
    fetchServiceRequests();
    fetchExperts();
  }, [currentPage, statusFilter, priorityFilter]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-accent/10 text-accent', icon: Clock, label: 'Pending' },
      assigned: { color: 'bg-primary/10 text-primary', icon: UserCheck, label: 'Assigned' },
      accepted: { color: 'bg-accent/10 text-accent', icon: UserCheck, label: 'Accepted' },
      in_progress: { color: 'bg-accent/10 text-accent', icon: AlertCircle, label: 'In Progress' },
      completed: { color: 'bg-secondary/10 text-secondary', icon: CheckCircle2, label: 'Completed' },
      pending_closure: { color: 'bg-primary/10 text-primary', icon: Clock, label: 'Pending Closure' },
      closed: { color: 'bg-muted text-foreground', icon: CheckCircle2, label: 'Closed' },
      cancelled: { color: 'bg-destructive/10 text-destructive', icon: X, label: 'Cancelled' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon size={12} />
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null;

    const priorityConfig = {
      emergency: 'bg-destructive text-white',
      urgent: 'bg-destructive/10 text-destructive',
      high: 'bg-accent/10 text-accent',
      normal: 'bg-primary/10 text-primary',
      low: 'bg-muted text-foreground',
    };

    return (
      <Badge className={priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.normal}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary/50"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-semibold text-foreground">Service Requests</h3>
          <p className="text-muted-foreground">Manage and assign service requests to experts</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          {/* Expand/Collapse All Groups */}
          {(() => {
            const { groupedUnassigned } = groupRequestsByCustomer();
            const groupCount = Object.keys(groupedUnassigned).filter(key => groupedUnassigned[key].requests.length > 1).length;

            if (groupCount > 0) {
              const allExpanded = Object.keys(groupedUnassigned).every(key => openGroups.has(key));
              return (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (allExpanded) {
                      setOpenGroups(new Set());
                    } else {
                      setOpenGroups(new Set(Object.keys(groupedUnassigned)));
                    }
                  }}
                  className="border-primary/50 text-primary hover:bg-primary/10"
                >
                  {allExpanded ? 'Collapse All Groups' : 'Expand All Groups'}
                </Button>
              );
            }
            return null;
          })()}

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending_closure">Pending Closure</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Filter by priority" />
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
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold text-foreground">{totalRequests}</p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-accent">
                  {requests.filter(r => r.status === 'pending').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Work</p>
                <p className="text-2xl font-bold text-accent">
                  {requests.filter(r => ['assigned', 'accepted', 'in_progress'].includes(r.status)).length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Closure</p>
                <p className="text-2xl font-bold text-accent">
                  {requests.filter(r => r.status === 'pending_closure').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Closed</p>
                <p className="text-2xl font-bold text-muted-foreground">
                  {requests.filter(r => r.status === 'closed').length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-secondary">
                  {requests.filter(r => r.status === 'completed').length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Service Requests</CardTitle>
          <CardDescription>
            {statusFilter !== 'all' && `Filtered by: ${statusFilter}`}
            {priorityFilter !== 'all' && ` • Priority: ${priorityFilter}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No service requests found</p>
            ) : (
              (() => {
                const { groupedUnassigned, assignedAndOtherRequests } = groupRequestsByCustomer();

                return (
                  <>
                    {/* Render grouped unassigned requests */}
                    {renderGroupedUnassignedRequests(groupedUnassigned)}

                    {/* Render assigned and other status requests normally */}
                    {assignedAndOtherRequests.map((request) => renderSingleRequest(request))}
                  </>
                );
              })()
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Expert Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Expert</DialogTitle>
            <DialogDescription>
              Select an expert to assign to this service request
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <h4 className="font-medium">{selectedRequest.title}</h4>
                <p className="text-sm text-muted-foreground">{selectedRequest.customerName}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Select Expert</label>
                <Select value={selectedExpertId} onValueChange={setSelectedExpertId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an expert..." />
                  </SelectTrigger>
                  <SelectContent>
                    {experts.map((expert) => (
                      <SelectItem key={expert.id} value={expert.id}>
                        {expert.firstName} {expert.lastName} ({expert.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAssignModal(false);
                setSelectedExpertId('');
              }}
              disabled={assigningExpert}
            >
              Cancel
            </Button>
            <Button
              onClick={assignExpert}
              disabled={assigningExpert || !selectedExpertId}
            >
              {assigningExpert ? 'Assigning...' : 'Assign Expert'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Service Request Details</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Customer</label>
                  <p className="text-sm">{selectedRequest.customerName}</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.customerEmail}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                </div>
              </div>

              {selectedRequest.expertName && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Assigned Expert</label>
                  <p className="text-sm">{selectedRequest.expertName}</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.expertEmail}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground">Service Type</label>
                <p className="text-sm">{selectedRequest.serviceType || 'General Consultation'}</p>
              </div>

              {selectedRequest.priority && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Priority</label>
                  <div className="mt-1">
                    {getPriorityBadge(selectedRequest.priority)}
                  </div>
                </div>
              )}

              {selectedRequest.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">
                    {selectedRequest.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <label className="font-medium">Created At</label>
                  <p>{format(new Date(selectedRequest.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                </div>
                {selectedRequest.assignedAt && (
                  <div>
                    <label className="font-medium">Assigned At</label>
                    <p>{format(new Date(selectedRequest.assignedAt), 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowDetailsModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Service Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this service request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-destructive/10 border border-destructive p-3 rounded-lg">
                <h4 className="font-medium text-destructive">{selectedRequest.title}</h4>
                <p className="text-sm text-destructive">Customer: {selectedRequest.customerName}</p>
                <p className="text-sm text-destructive">Email: {selectedRequest.customerEmail}</p>
              </div>

              <div className="bg-accent/10 border border-accent/50 p-3 rounded-lg">
                <p className="text-sm text-accent">
                  <strong>Note:</strong> Only pending service requests can be deleted.
                  Requests that have been assigned to experts cannot be deleted.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedRequest(null);
              }}
              disabled={deletingRequest}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteServiceRequest}
              disabled={deletingRequest}
            >
              {deletingRequest ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} className="mr-2" />
                  Delete Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* Quote Creation Modal */}
      <QuoteCreationModal
        isOpen={showQuoteModal}
        onClose={() => {
          setShowQuoteModal(false);
          setSelectedRequest(null);
        }}
        serviceRequest={selectedRequest}
        onQuoteCreated={() => {
          fetchServiceRequests();
        }}
      />

      {/* Service Request Management Modal */}
      <ServiceRequestManageModal
        isOpen={showManageModal}
        onClose={() => {
          setShowManageModal(false);
          setSelectedRequest(null);
        }}
        request={selectedRequest}
        onRequestUpdated={() => {
          fetchServiceRequests();
        }}
      />

    </div>
  );
}
