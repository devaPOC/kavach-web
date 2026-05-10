'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, AlertCircle, CheckCircle2, FileText, MessageSquare, ChevronLeft, ChevronRight, RefreshCw, Download, Paperclip, Eye } from 'lucide-react';
import { notify } from '@/lib/utils/notify';
import { format } from 'date-fns';
import { getServiceTypeDisplayName } from '@/lib/utils/fieldNameFormatter';
import EmptyState from '@/app/components/EmptyState';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface ServiceRequest {
  id: string;
  serviceType: string;
  status: 'pending' | 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'pending_closure' | 'closed' | 'rejected' | 'cancelled';
  priority: 'emergency' | 'urgent' | 'high' | 'normal' | 'low';
  title: string;
  description?: string;
  assignedExpertId?: string;
  expertName?: string;
  createdAt: string;
  assignedAt?: string;
  completedAt?: string;
  data: any;
  completionReport?: {
    id: string;
    report: string;
    files: Array<{
      id: string;
      filename: string;
      originalName: string;
      mimeType: string;
      size: number;
      uploadedAt: string;
    }>;
    submittedAt: string;
  };
}

interface ServiceQuote {
  id: string;
  serviceRequestId: string;
  quoteNumber: string;
  quotedPrice: string;
  currency: string;
  status: 'draft' | 'sent' | 'pending' | 'accepted' | 'rejected' | 'expired' | 'superseded';
  description?: string;
  validUntil?: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
  customerName: string;
  customerEmail: string;
  adminName: string;
  serviceTitle: string;
  serviceType: string;
}

interface QuoteNegotiation {
  id: string;
  quoteId: string;
  message: string;
  isFromCustomer: boolean;
  createdAt: Date;
}

export default function CustomerServiceRequests() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [quotes, setQuotes] = useState<ServiceQuote[]>([]);
  const [negotiations, setNegotiations] = useState<Record<string, QuoteNegotiation[]>>({});
  const [loading, setLoading] = useState(true);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<ServiceQuote | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedRequestForReport, setSelectedRequestForReport] = useState<ServiceRequest | null>(null);
  const [negotiationMessage, setNegotiationMessage] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRequests, setTotalRequests] = useState(0);
  const [quotesCurrentPage, setQuotesCurrentPage] = useState(1);
  const [quotesTotalPages, setQuotesTotalPages] = useState(1);
  const [totalQuotes, setTotalQuotes] = useState(0);
  const limit = 10;

  // View toggles
  const [activeTab, setActiveTab] = useState<'requests' | 'quotes'>('requests');

  // Fetch customer's service requests
  const fetchServiceRequests = async (page: number = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await fetch(`/api/v1/customer/service-requests?${params}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch service requests');
      }

      const result = await response.json();
      if (result.success) {
        console.log(result);

        setRequests(result.data.requests || []);
        setTotalRequests(result.data.pagination?.total || 0);
        setTotalPages(result.data.pagination?.totalPages || 1);
        setCurrentPage(result.data.pagination?.page || 1);
      } else {
        setError(result.error || 'Failed to load service requests');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load service requests');
    } finally {
      setLoading(false);
    }
  };

  // Fetch customer's quotes
  const fetchCustomerQuotes = async (page: number = 1) => {
    try {
      setQuotesLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await fetch(`/api/v1/customer/quotes?${params}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch quotes');
      }

      const result = await response.json();
      if (result.success) {
        setQuotes(result.data.quotes || result.data || []);
        setTotalQuotes(result.data.pagination?.total || result.data?.length || 0);
        setQuotesTotalPages(result.data.pagination?.totalPages || 1);
        setQuotesCurrentPage(result.data.pagination?.page || 1);

        // Fetch negotiations for each quote
        const quotesData = result.data.quotes || result.data || [];
        for (const quote of quotesData) {
          fetchQuoteNegotiations(quote.id);
        }
      }
    } catch (err: any) {
      console.error('Error fetching quotes:', err);
    } finally {
      setQuotesLoading(false);
    }
  };

  const fetchQuoteNegotiations = async (quoteId: string) => {
    try {
      const response = await fetch(`/api/v1/customer/quotes/${quoteId}/negotiations`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setNegotiations(prev => ({
            ...prev,
            [quoteId]: result.data
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching negotiations:', error);
    }
  };

  useEffect(() => {
    fetchServiceRequests(currentPage);
  }, [currentPage]);

  useEffect(() => {
    fetchCustomerQuotes(quotesCurrentPage);
  }, [quotesCurrentPage]);

  // Quote actions
  const acceptQuote = async (quoteId: string) => {
    try {
      const response = await fetch(`/api/v1/customer/quotes/${quoteId}/accept`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          fetchCustomerQuotes(quotesCurrentPage); // Refresh quotes
          notify.success('Quote accepted successfully');
        }
      }
    } catch (error) {
      console.error('Error accepting quote:', error);
      notify.error('Failed to accept quote');
    }
  };

  const rejectQuote = async (quoteId: string, reason: string) => {
    try {
      const response = await fetch(`/api/v1/customer/quotes/${quoteId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          fetchCustomerQuotes(quotesCurrentPage); // Refresh quotes
          setShowRejectionModal(false);
          setRejectionReason('');
          notify.success('Quote rejected successfully');
        }
      }
    } catch (error) {
      console.error('Error rejecting quote:', error);
      notify.error('Failed to reject quote');
    }
  };

  const sendNegotiation = async (quoteId: string, message: string) => {
    try {
      const response = await fetch(`/api/v1/customer/quotes/${quoteId}/negotiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ message }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          fetchQuoteNegotiations(quoteId); // Refresh negotiations
          setNegotiationMessage('');
          notify.success('Negotiation message sent');
        }
      }
    } catch (error) {
      console.error('Error sending negotiation:', error);
      notify.error('Failed to send message');
    }
  };

  // Close task function
  const handleCloseTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/v1/customer/tasks/${taskId}/close`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        await fetchServiceRequests(currentPage); // Refresh the list
        setShowDetailsModal(false);
        notify.success('Task closed successfully');
      } else {
        notify.error('Failed to close task. Please try again');
      }
    } catch (error) {
      console.error('Failed to close task:', error);
      notify.error('Failed to close task. Please try again');
    }
  };

  // Download file function
  const downloadFile = async (taskId: string, fileId: string, filename: string) => {
    try {
      const response = await fetch(`/api/v1/customer/tasks/${taskId}/files/${fileId}/download`, {
        credentials: 'include'
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        notify.error('Failed to download file');
      }
    } catch (error) {
      console.error('Failed to download file:', error);
      notify.error('Failed to download file');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-accent/10 text-accent border-accent/50', text: 'Pending Assignment' },
      assigned: { color: 'bg-primary/10 text-primary border-primary/50', text: 'Assigned' },
      accepted: { color: 'bg-accent/10 text-accent border-accent/50', text: 'Expert Accepted' },
      in_progress: { color: 'bg-primary/10 text-primary border-primary/50', text: 'In Progress' },
      completed: { color: 'bg-secondary/10 text-secondary border-secondary/50', text: 'Completed' },
      pending_closure: { color: 'bg-accent/10 text-primary border-primary/50', text: 'Review Needed' },
      closed: { color: 'bg-muted text-muted-foreground border-border', text: 'Closed' },
      rejected: { color: 'bg-destructive/10 text-destructive border-destructive', text: 'Rejected' },
      cancelled: { color: 'bg-destructive/10 text-destructive border-destructive', text: 'Cancelled' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", config.color)}>
        {config.text}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      emergency: { color: 'text-destructive bg-destructive/10 border-destructive', text: 'Emergency' },
      urgent: { color: 'text-accent bg-accent/10 border-accent/50', text: 'Urgent' },
      high: { color: 'text-accent bg-accent/10 border-accent/50', text: 'High' },
      normal: { color: 'text-secondary bg-secondary/10 border-secondary/50', text: 'Normal' },
      low: { color: 'text-muted-foreground bg-muted/50 border-border/50', text: 'Low' },
    };

    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.normal;
    return (
      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", config.color)}>
        {config.text}
      </span>
    );
  };

  const getQuoteStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-muted text-muted-foreground border-border', text: 'Draft' },
      sent: { color: 'bg-primary/10 text-primary border-primary/50', text: 'Received' },
      pending: { color: 'bg-accent/10 text-accent border-accent/50', text: 'Pending Review' },
      accepted: { color: 'bg-secondary/10 text-secondary border-secondary/50', text: 'Accepted' },
      rejected: { color: 'bg-destructive/10 text-destructive border-destructive', text: 'Rejected' },
      expired: { color: 'bg-muted text-muted-foreground border-border', text: 'Expired' },
      superseded: { color: 'bg-accent/10 text-primary border-primary/50', text: 'Superseded' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", config.color)}>
        {config.text}
      </span>
    );
  };

  const formatPrice = (amount: string, currency: string = 'INR') => {
    return `₹${parseFloat(amount).toFixed(2)}`;
  };

  const isQuoteExpired = (validUntil?: Date) => {
    if (!validUntil) return false;
    return new Date() > new Date(validUntil);
  };

  const getServiceTypeName = (serviceType: string): string => {
    return getServiceTypeDisplayName(serviceType);
  };

  // Helper to format key names from data object (camelCase to Title Case)
  const formatKeyName = (key: string) => {
    return key
      // Insert space before capital letters
      .replace(/([A-Z])/g, ' $1')
      // Capitalize first letter
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  // Show combined loading state only when both sections are initially loading
  if (loading && quotesLoading) {
    return (
      <div className="flex flex-col gap-6 w-full animate-pulse">
        <div className="h-20 bg-muted rounded-xl w-full"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64 bg-muted rounded-xl"></div>
          <div className="h-64 bg-muted rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="bg-destructive/10 p-3 rounded-full inline-block">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <p className="text-foreground font-medium text-lg">Unable to load requests</p>
            <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">{error}</p>
          </div>
          <Button
            onClick={() => {
              fetchServiceRequests(currentPage);
              fetchCustomerQuotes(quotesCurrentPage);
            }}
            className="bg-primary hover:bg-secondary text-white"
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 w-full max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Your Activities</h1>
          <p className="text-muted-foreground mt-2 text-lg">Track your service requests, quotes, and project progress.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex p-1 bg-muted rounded-lg">
            <button
              onClick={() => setActiveTab('requests')}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                activeTab === 'requests' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground/80"
              )}
            >
              Requests
            </button>
            <button
              onClick={() => setActiveTab('quotes')}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                activeTab === 'quotes' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground/80"
              )}
            >
              Quotes
            </button>
          </div>
          <Button
            onClick={() => {
              fetchServiceRequests(currentPage);
              fetchCustomerQuotes(quotesCurrentPage);
            }}
            variant="outline"
            className="border-border text-muted-foreground hover:bg-muted/50"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div>
        {/* Empty State */}
        {totalRequests === 0 && totalQuotes === 0 && !loading && !quotesLoading ? (
          <div className="py-12">
            <EmptyState
              title="No activities yet"
              message="Start by requesting a service from the dashboard. Your requests and quotes will appear here."
              onRefresh={() => {
                fetchServiceRequests(currentPage);
                fetchCustomerQuotes(quotesCurrentPage);
              }}
            />
          </div>
        ) : (
          <div className="space-y-6">

            {/* SERVICE REQUESTS TAB */}
            {activeTab === 'requests' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Service Requests
                    <span className="text-sm font-normal text-muted-foreground ml-2 bg-muted px-2 py-0.5 rounded-full">
                      {totalRequests}
                    </span>
                  </h2>
                </div>

                {requests.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-muted/50/50">
                    <p className="text-muted-foreground">No active service requests found.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requests.map((request) => (
                      <div
                        key={request.id}
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowDetailsModal(true);
                        }}
                        className="group relative flex flex-col md:flex-row md:items-start lg:items-center justify-between p-5 border rounded-xl bg-card hover:border-primary/20 transition-all duration-300 ease-out cursor-pointer hover:bg-primary/5 shadow-sm gap-4"
                      >
                        <div className="space-y-3 flex-1">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">{request.title}</h3>
                              <div className="flex items-center gap-2 flex-wrap">
                                {getServiceTypeName(request.serviceType) && (
                                  <div className="text-xs font-medium text-primary bg-primary/10 inline-block px-2.5 py-1 rounded-full group-hover:bg-primary/20 transition-colors">
                                    {getServiceTypeName(request.serviceType)}
                                  </div>
                                )}
                                {getPriorityBadge(request.priority)}
                                {getStatusBadge(request.status)}
                              </div>
                            </div>
                          </div>

                          {request.description && (
                            <p className="text-muted-foreground line-clamp-2 text-sm italic">
                              "{request.description}"
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {request.expertName && (
                              <div className="flex items-center gap-1">
                                <User className="w-4 h-4 text-muted-foreground/80 group-hover:text-primary transition-colors" />
                                <span>{request.expertName}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4 text-muted-foreground/80 group-hover:text-primary transition-colors" />
                              <span>{format(new Date(request.createdAt), 'MMM dd, yyyy')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
                          <span className="text-xs font-medium text-primary group-hover:underline flex items-center md:justify-end gap-1 mb-2">
                            View Details <ChevronRight className="w-3 h-3" />
                          </span>

                          {request.data?.completionReport && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRequestForReport(request);
                                setShowReportModal(true);
                              }}
                              className="w-full justify-start border-primary/50 text-primary hover:bg-primary/10"
                            >
                              <FileText className="w-4 h-4 mr-2" /> View Report
                            </Button>
                          )}

                          {request.status === 'pending_closure' && request.data?.completionReport && (
                            <Button
                              size="sm"
                              onClick={() => handleCloseTask(request.id)}
                              className="w-full justify-start bg-secondary hover:bg-secondary text-white"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center pt-8">
                    <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-1 shadow-sm">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="h-8 px-2"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs font-medium text-muted-foreground px-2">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="h-8 px-2"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* QUOTES TAB */}
            {activeTab === 'quotes' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    Service Quotes
                    <span className="text-sm font-normal text-muted-foreground ml-2 bg-muted px-2 py-0.5 rounded-full">
                      {totalQuotes}
                    </span>
                  </h2>
                </div>

                {!quotesLoading && quotes.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-muted/50/50">
                    <p className="text-muted-foreground">No quotes received yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {quotes.map((quote) => (
                      <div
                        key={quote.id}
                        className="group relative flex flex-col md:flex-row md:items-start lg:items-center justify-between p-5 border rounded-xl bg-card hover:border-primary/20 transition-all duration-300 ease-out shadow-sm gap-4 hover:bg-primary/5"
                      >
                        <div className="space-y-3 flex-1">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">{quote.serviceTitle}</h3>
                              <div className="flex items-center gap-2 flex-wrap">
                                {getQuoteStatusBadge(quote.status)}
                                {isQuoteExpired(quote.validUntil) && quote.status === 'pending' && (
                                  <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full border border-destructive">Expired</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-2xl font-bold text-foreground tracking-tight">
                            {formatPrice(quote.quotedPrice, quote.currency)}
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4 text-muted-foreground/80 group-hover:text-primary transition-colors" />
                              <span>From: {quote.adminName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4 text-muted-foreground/80 group-hover:text-primary transition-colors" />
                              <span>{format(new Date(quote.createdAt), 'MMM dd, yyyy')}</span>
                            </div>
                            {quote.validUntil && (
                              <div className="flex items-center gap-2 text-accent">
                                <Clock className="w-4 h-4" />
                                <span>Valid until: {format(new Date(quote.validUntil), 'MMM dd')}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 min-w-[140px]">
                          <Button
                            variant="outline"
                            className="w-full justify-start border-border text-foreground/80 hover:bg-card hover:border-primary/50 hover:text-primary"
                            size="sm"
                            onClick={() => {
                              setSelectedQuote(quote);
                              setShowQuoteModal(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>

                          {quote.status === 'pending' || quote.status === 'sent' ? (
                            !isQuoteExpired(quote.validUntil) && (
                              <div className="flex flex-col gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => acceptQuote(quote.id)}
                                  className="w-full justify-start bg-secondary hover:bg-secondary text-white"
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Accept
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedQuote(quote);
                                    setShowNegotiationModal(true);
                                  }}
                                  className="w-full justify-start border-primary/50 text-primary hover:bg-primary/10"
                                >
                                  <MessageSquare className="w-4 h-4 mr-2" />
                                  Negotiate
                                </Button>
                              </div>
                            )
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {quotesTotalPages > 1 && (
                  <div className="flex items-center justify-center pt-8">
                    <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-1 shadow-sm">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setQuotesCurrentPage(Math.max(1, quotesCurrentPage - 1))}
                        disabled={quotesCurrentPage === 1}
                        className="h-8 px-2"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs font-medium text-muted-foreground px-2">
                        Page {quotesCurrentPage} of {quotesTotalPages}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setQuotesCurrentPage(Math.min(quotesTotalPages, quotesCurrentPage + 1))}
                        disabled={quotesCurrentPage === quotesTotalPages}
                        className="h-8 px-2"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODALS SECTION */}

      {/* Service Request Details Modal */}
      {showDetailsModal && selectedRequest && (
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="hidden">
              <DialogTitle>Request Details</DialogTitle>
              <DialogDescription>Details of the selected service request</DialogDescription>
            </DialogHeader>
            <div className="p-1">
              <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground line-clamp-1 mr-2">{selectedRequest.title}</h3>
                  <p className="text-xs text-muted-foreground">ID: {selectedRequest.id}</p>
                </div>
                {getStatusBadge(selectedRequest.status)}
              </div>

              <div className="space-y-6">
                {/* Key Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
                    <span className="text-xs text-muted-foreground block mb-1">Service Type</span>
                    <span className="text-sm font-medium text-foreground block">{getServiceTypeName(selectedRequest.serviceType)}</span>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
                    <span className="text-xs text-muted-foreground block mb-1">Priority</span>
                    <div>{getPriorityBadge(selectedRequest.priority)}</div>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
                    <span className="text-xs text-muted-foreground block mb-1">Created Date</span>
                    <span className="text-sm font-medium text-foreground block">{format(new Date(selectedRequest.createdAt), 'PPP')}</span>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
                    <span className="text-xs text-muted-foreground block mb-1">Assigned Expert</span>
                    <span className="text-sm font-medium text-foreground block flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {selectedRequest.expertName || 'Not Agent Yet'}
                    </span>
                  </div>
                </div>

                {/* Description
                {selectedRequest.description && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground bg-card border border-border p-3 rounded-lg">
                      {selectedRequest.description}
                    </p>
                  </div>
                )} */}

                {/* Form Data */}
                {selectedRequest.data && Object.keys(selectedRequest.data).filter(k => k !== 'completionReport').length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Request Details</h4>
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                      {Object.entries(selectedRequest.data)
                        .filter(([key]) => key !== 'completionReport' && key !== 'userId' && key !== 'serviceType')
                        .map(([key, value], index) => (
                          <div key={key} className={cn(
                            "flex flex-col sm:flex-row sm:justify-between p-3 text-sm",
                            index !== 0 && "border-t border-border/50"
                          )}>
                            <span className="text-muted-foreground sm:w-1/3 mb-1 sm:mb-0 font-medium">{formatKeyName(key)}</span>
                            <span className="text-foreground sm:w-2/3 sm:text-right break-words">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-6 border-t border-border/50 mt-2">
                {selectedRequest.data?.completionReport && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDetailsModal(false);
                      setSelectedRequestForReport(selectedRequest);
                      setShowReportModal(true);
                    }}
                    className="border-primary/50 text-primary hover:bg-primary/10"
                  >
                    <FileText className="w-4 h-4 mr-2" /> View Report
                  </Button>
                )}
                <Button onClick={() => setShowDetailsModal(false)}>Close</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Completion Report Modal */}
      {showReportModal && selectedRequestForReport && selectedRequestForReport.data?.completionReport && (
        <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="hidden">
              <DialogTitle>Completion Report</DialogTitle>
            </DialogHeader>
            <div className="p-1">
              <div className="flex items-center justify-between mb-4 border-b border-secondary/50 pb-4">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-secondary" />
                  Completion Report
                </h3>
                {selectedRequestForReport.status === 'completed' && (
                  <Badge className="bg-secondary/10 text-secondary hover:bg-secondary/10">Completed</Badge>
                )}
              </div>

              <div className="space-y-6">
                <div className="bg-secondary/10/50 p-4 rounded-xl border border-secondary/50/50">
                  <h4 className="text-sm font-semibold text-secondary mb-2">Expert Report</h4>
                  <div className="text-foreground/80 text-sm whitespace-pre-wrap leading-relaxed">
                    {selectedRequestForReport.data.completionReport.report}
                  </div>
                </div>

                {/* Files */}
                {selectedRequestForReport.data.completionReport.files && selectedRequestForReport.data.completionReport.files.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <Paperclip className="w-4 h-4" /> Attached Files
                    </h4>
                    <div className="grid gap-2">
                      {selectedRequestForReport.data.completionReport.files.map((file: any) => (
                        <div key={file.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg hover:border-primary/50 hover:shadow-sm transition-all">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="bg-muted p-2 rounded">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{file.originalName}</p>
                              <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => downloadFile(selectedRequestForReport.id, file.id, file.originalName)}
                            className="text-primary hover:text-primary hover:bg-primary/10"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground/80 text-center italic">
                  Report submitted on {format(new Date(selectedRequestForReport.data.completionReport.submittedAt), 'PPP p')}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-6 border-t border-border/50 mt-2">
                {selectedRequestForReport.status === 'pending_closure' && (
                  <Button
                    onClick={() => {
                      handleCloseTask(selectedRequestForReport.id);
                      setShowReportModal(false);
                    }}
                    className="bg-secondary hover:bg-secondary text-white"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Approve & Close Task
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowReportModal(false)}>Close</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Quote Details Modal (Existing but restyled) */}
      {showQuoteModal && selectedQuote && (
        <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader className="hidden">
              <DialogTitle>Quote Details</DialogTitle>
            </DialogHeader>
            <div className="p-1">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-foreground">Quote Details</h3>
                {getQuoteStatusBadge(selectedQuote.status)}
              </div>

              <div className="grid gap-6">
                <div className="bg-muted/50 p-4 rounded-xl border border-border/50">
                  <div className="text-sm text-muted-foreground mb-1">Service</div>
                  <div className="font-medium text-foreground text-lg">{selectedQuote.serviceTitle}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-4 rounded-xl border border-border/50">
                    <div className="text-sm text-muted-foreground mb-1">Total Amount</div>
                    <div className="font-bold text-foreground text-2xl text-secondary">
                      {formatPrice(selectedQuote.quotedPrice, selectedQuote.currency)}
                    </div>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-xl border border-border/50">
                    <div className="text-sm text-muted-foreground mb-1">Valid Until</div>
                    <div className="font-medium text-foreground">
                      {selectedQuote.validUntil ? format(new Date(selectedQuote.validUntil), 'MMM dd, yyyy') : 'N/A'}
                    </div>
                  </div>
                </div>

                {selectedQuote.description && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground">Description & Scope</h4>
                    <p className="text-muted-foreground text-sm leading-relaxed p-4 border border-border/50 rounded-xl bg-card">
                      {selectedQuote.description}
                    </p>
                  </div>
                )}

                {negotiations[selectedQuote.id] && negotiations[selectedQuote.id].length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-border/50">
                    <h4 className="font-medium text-foreground">Discussion History</h4>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                      {negotiations[selectedQuote.id].map((negotiation) => (
                        <div
                          key={negotiation.id}
                          className={`p-3 rounded-xl text-sm ${negotiation.isFromCustomer
                            ? 'bg-primary/10 text-primary ml-8 rounded-tr-none'
                            : 'bg-muted text-foreground mr-8 rounded-tl-none'
                            }`}
                        >
                          <div className="flex items-center justify-between mb-1 opacity-70 text-xs">
                            <span className="font-semibold">
                              {negotiation.isFromCustomer ? 'You' : 'Admin'}
                            </span>
                            <span>
                              {format(new Date(negotiation.createdAt), 'MMM dd, HH:mm')}
                            </span>
                          </div>
                          <p>{negotiation.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons in Modal */}
                {(selectedQuote.status === 'pending' || selectedQuote.status === 'sent') && !isQuoteExpired(selectedQuote.validUntil) && (
                  <div className="flex gap-3 pt-4 border-t border-border/50 mt-2">
                    <Button
                      onClick={() => {
                        acceptQuote(selectedQuote.id);
                        setShowQuoteModal(false);
                      }}
                      className="flex-1 bg-secondary hover:bg-secondary text-white"
                    >
                      Accept Quote
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowQuoteModal(false);
                        setShowNegotiationModal(true);
                      }}
                      className="flex-1 border-primary/50 text-primary hover:bg-primary/10"
                    >
                      Negotiate
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowQuoteModal(false);
                        setShowRejectionModal(true);
                      }}
                      className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && selectedQuote && (
        <Dialog open={showRejectionModal} onOpenChange={setShowRejectionModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-foreground">Reject Quote</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Please provide a reason for rejecting this quote to help us improve.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection (e.g., price too high, changed requirements)..."
                className="w-full min-h-[100px] p-3 border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setShowRejectionModal(false)}>Cancel</Button>
                <Button
                  variant="destructive"
                  disabled={!rejectionReason.trim()}
                  onClick={() => rejectQuote(selectedQuote.id, rejectionReason)}
                >
                  Confirm Rejection
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Negotiate Modal */}
      {showNegotiationModal && selectedQuote && (
        <Dialog open={showNegotiationModal} onOpenChange={setShowNegotiationModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-foreground">Negotiate Quote</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Send a message to the admin regarding this quote.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <textarea
                value={negotiationMessage}
                onChange={(e) => setNegotiationMessage(e.target.value)}
                placeholder="Type your message here..."
                className="w-full min-h-[100px] p-3 border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setShowNegotiationModal(false)}>Cancel</Button>
                <Button
                  className="bg-primary hover:bg-primary text-white"
                  disabled={!negotiationMessage.trim()}
                  onClick={() => {
                    sendNegotiation(selectedQuote.id, negotiationMessage);
                    setShowNegotiationModal(false);
                  }}
                >
                  Send Message
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
