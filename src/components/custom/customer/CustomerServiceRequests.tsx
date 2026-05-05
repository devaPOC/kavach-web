'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, AlertCircle, CheckCircle2, FileText, MessageSquare, ChevronLeft, ChevronRight, RefreshCw, Download, Paperclip } from 'lucide-react';
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
      pending: { color: 'bg-amber-50 text-amber-700 border-amber-200', text: 'Pending Assignment' },
      assigned: { color: 'bg-blue-50 text-blue-700 border-blue-200', text: 'Assigned' },
      accepted: { color: 'bg-cyan-50 text-cyan-700 border-cyan-200', text: 'Expert Accepted' },
      in_progress: { color: 'bg-indigo-50 text-indigo-700 border-indigo-200', text: 'In Progress' },
      completed: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'Completed' },
      pending_closure: { color: 'bg-purple-50 text-purple-700 border-purple-200', text: 'Review Needed' },
      closed: { color: 'bg-slate-100 text-slate-600 border-slate-200', text: 'Closed' },
      rejected: { color: 'bg-red-50 text-red-700 border-red-200', text: 'Rejected' },
      cancelled: { color: 'bg-red-50 text-red-700 border-red-200', text: 'Cancelled' },
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
      emergency: { color: 'text-red-600 bg-red-50 border-red-100', text: 'Emergency' },
      urgent: { color: 'text-orange-600 bg-orange-50 border-orange-100', text: 'Urgent' },
      high: { color: 'text-amber-600 bg-amber-50 border-amber-100', text: 'High' },
      normal: { color: 'text-emerald-600 bg-emerald-50 border-emerald-100', text: 'Normal' },
      low: { color: 'text-slate-600 bg-slate-50 border-slate-100', text: 'Low' },
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
      draft: { color: 'bg-slate-100 text-slate-600 border-slate-200', text: 'Draft' },
      sent: { color: 'bg-blue-50 text-blue-700 border-blue-200', text: 'Received' },
      pending: { color: 'bg-amber-50 text-amber-700 border-amber-200', text: 'Pending Review' },
      accepted: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'Accepted' },
      rejected: { color: 'bg-red-50 text-red-700 border-red-200', text: 'Rejected' },
      expired: { color: 'bg-slate-100 text-slate-500 border-slate-200', text: 'Expired' },
      superseded: { color: 'bg-purple-50 text-purple-700 border-purple-200', text: 'Superseded' },
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
        <div className="h-20 bg-slate-100 rounded-xl w-full"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64 bg-slate-100 rounded-xl"></div>
          <div className="h-64 bg-slate-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="bg-red-50 p-3 rounded-full inline-block">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <div>
            <p className="text-slate-900 font-medium text-lg">Unable to load requests</p>
            <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">{error}</p>
          </div>
          <Button
            onClick={() => {
              fetchServiceRequests(currentPage);
              fetchCustomerQuotes(quotesCurrentPage);
            }}
            className="bg-slate-900 hover:bg-slate-800 text-white"
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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Your Activities</h1>
          <p className="text-slate-500 mt-2 text-lg">Track your service requests, quotes, and project progress.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setActiveTab('requests')}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                activeTab === 'requests' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Requests
            </button>
            <button
              onClick={() => setActiveTab('quotes')}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                activeTab === 'quotes' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
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
            className="border-slate-200 text-slate-600 hover:bg-slate-50"
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
                  <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-500" />
                    Service Requests
                    <span className="text-sm font-normal text-slate-500 ml-2 bg-slate-100 px-2 py-0.5 rounded-full">
                      {totalRequests}
                    </span>
                  </h2>
                </div>

                {requests.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <p className="text-slate-500">No active service requests found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                    {requests.map((request) => (
                      <div
                        key={request.id}
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowDetailsModal(true);
                        }}
                        className="group relative bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-lg hover:border-indigo-200 hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer overflow-hidden hover:bg-indigo-50/30 flex flex-col h-full"
                      >
                        {/* Status Tags */}
                        <div className="flex items-center justify-between mb-4">
                          {getStatusBadge(request.status)}
                          {getPriorityBadge(request.priority)}
                        </div>

                        {/* Title */}
                        <h3 className="font-semibold text-slate-900 text-lg mb-2 line-clamp-2 group-hover:text-indigo-700 transition-colors">
                          {request.title}
                        </h3>

                        {/* Service Type */}
                        <div className="text-xs font-medium text-indigo-600 bg-indigo-50 inline-block px-2.5 py-1 rounded-full mb-4 w-fit group-hover:bg-indigo-100 transition-colors">
                          {getServiceTypeName(request.serviceType)}
                        </div>

                        {/* Details Grid */}
                        <div className="grid gap-2 text-sm text-slate-600 mb-4 flex-1">
                          {request.expertName && (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                              <span>{request.expertName}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                            <span>{format(new Date(request.createdAt), 'MMM dd, yyyy')}</span>
                          </div>
                          {request.description && (
                            <p className="text-slate-500 text-xs mt-2 line-clamp-2 italic">
                              "{request.description}"
                            </p>
                          )}
                        </div>

                        {/* Actions Footer */}
                        <div className="pt-4 mt-auto border-t border-slate-100 flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-indigo-600 group-hover:underline flex items-center gap-1">
                            View Details <ChevronRight className="w-3 h-3" />
                          </span>

                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            {request.data?.completionReport && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedRequestForReport(request);
                                  setShowReportModal(true);
                                }}
                                className="h-8 px-2 border-indigo-100 text-indigo-700 hover:bg-indigo-50"
                              >
                                <FileText className="w-3 h-3 mr-1" /> Report
                              </Button>
                            )}

                            {request.status === 'pending_closure' && request.data?.completionReport && (
                              <Button
                                size="sm"
                                onClick={() => handleCloseTask(request.id)}
                                className="h-8 px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center pt-8">
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="h-8 px-2"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs font-medium text-slate-600 px-2">
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
                  <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-indigo-500" />
                    Service Quotes
                    <span className="text-sm font-normal text-slate-500 ml-2 bg-slate-100 px-2 py-0.5 rounded-full">
                      {totalQuotes}
                    </span>
                  </h2>
                </div>

                {!quotesLoading && quotes.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <p className="text-slate-500">No quotes received yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                    {quotes.map((quote) => (
                      <div
                        key={quote.id}
                        className="group relative bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-lg hover:border-indigo-200 hover:-translate-y-1 transition-all duration-300 ease-out flex flex-col h-full overflow-hidden hover:bg-slate-50/50"
                      >
                        <div className="flex items-center justify-between mb-4">
                          {getQuoteStatusBadge(quote.status)}
                          {isQuoteExpired(quote.validUntil) && quote.status === 'pending' && (
                            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">Expired</span>
                          )}
                        </div>

                        <h3 className="font-semibold text-slate-900 text-lg mb-1 group-hover:text-indigo-700 transition-colors">
                          {quote.serviceTitle}
                        </h3>

                        <div className="text-2xl font-bold text-slate-800 mb-4 tracking-tight">
                          {formatPrice(quote.quotedPrice, quote.currency)}
                        </div>

                        <div className="grid gap-2 text-sm text-slate-600 mb-6 flex-1">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <span>From: {quote.adminName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span>{format(new Date(quote.createdAt), 'MMM dd, yyyy')}</span>
                          </div>
                          {quote.validUntil && (
                            <div className="flex items-center gap-2 text-amber-600">
                              <Clock className="w-4 h-4" />
                              <span>Valid until: {format(new Date(quote.validUntil), 'MMM dd')}</span>
                            </div>
                          )}
                        </div>

                        <div className="pt-4 mt-auto border-t border-slate-100 flex flex-col gap-2">
                          <Button
                            variant="outline"
                            className="w-full border-slate-200 text-slate-700 hover:bg-white hover:border-indigo-300 hover:text-indigo-600"
                            onClick={() => {
                              setSelectedQuote(quote);
                              setShowQuoteModal(true);
                            }}
                          >
                            View Details
                          </Button>

                          {quote.status === 'pending' || quote.status === 'sent' ? (
                            !isQuoteExpired(quote.validUntil) && (
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  onClick={() => acceptQuote(quote.id)}
                                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  Accept
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedQuote(quote);
                                    setShowNegotiationModal(true);
                                  }}
                                  className="w-full border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                                >
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
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setQuotesCurrentPage(Math.max(1, quotesCurrentPage - 1))}
                        disabled={quotesCurrentPage === 1}
                        className="h-8 px-2"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs font-medium text-slate-600 px-2">
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
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 line-clamp-1 mr-2">{selectedRequest.title}</h3>
                  <p className="text-xs text-slate-500">ID: {selectedRequest.id}</p>
                </div>
                {getStatusBadge(selectedRequest.status)}
              </div>

              <div className="space-y-6">
                {/* Key Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-500 block mb-1">Service Type</span>
                    <span className="text-sm font-medium text-slate-900 block">{getServiceTypeName(selectedRequest.serviceType)}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-500 block mb-1">Priority</span>
                    <div>{getPriorityBadge(selectedRequest.priority)}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-500 block mb-1">Created Date</span>
                    <span className="text-sm font-medium text-slate-900 block">{format(new Date(selectedRequest.createdAt), 'PPP')}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-500 block mb-1">Assigned Expert</span>
                    <span className="text-sm font-medium text-slate-900 block flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {selectedRequest.expertName || 'Not Agent Yet'}
                    </span>
                  </div>
                </div>

                {/* Description
                {selectedRequest.description && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-900 mb-2">Description</h4>
                    <p className="text-sm text-slate-600 bg-white border border-slate-200 p-3 rounded-lg">
                      {selectedRequest.description}
                    </p>
                  </div>
                )} */}

                {/* Form Data */}
                {selectedRequest.data && Object.keys(selectedRequest.data).filter(k => k !== 'completionReport').length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-900 mb-2">Request Details</h4>
                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                      {Object.entries(selectedRequest.data)
                        .filter(([key]) => key !== 'completionReport' && key !== 'userId' && key !== 'serviceType')
                        .map(([key, value], index) => (
                          <div key={key} className={cn(
                            "flex flex-col sm:flex-row sm:justify-between p-3 text-sm",
                            index !== 0 && "border-t border-slate-100"
                          )}>
                            <span className="text-slate-500 sm:w-1/3 mb-1 sm:mb-0 font-medium">{formatKeyName(key)}</span>
                            <span className="text-slate-800 sm:w-2/3 sm:text-right break-words">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-6 border-t border-slate-100 mt-2">
                {selectedRequest.data?.completionReport && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDetailsModal(false);
                      setSelectedRequestForReport(selectedRequest);
                      setShowReportModal(true);
                    }}
                    className="border-indigo-100 text-indigo-600 hover:bg-indigo-50"
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
              <div className="flex items-center justify-between mb-4 border-b border-emerald-100 pb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Completion Report
                </h3>
                {selectedRequestForReport.status === 'completed' && (
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Completed</Badge>
                )}
              </div>

              <div className="space-y-6">
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50">
                  <h4 className="text-sm font-semibold text-emerald-900 mb-2">Expert Report</h4>
                  <div className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
                    {selectedRequestForReport.data.completionReport.report}
                  </div>
                </div>

                {/* Files */}
                {selectedRequestForReport.data.completionReport.files && selectedRequestForReport.data.completionReport.files.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2">
                      <Paperclip className="w-4 h-4" /> Attached Files
                    </h4>
                    <div className="grid gap-2">
                      {selectedRequestForReport.data.completionReport.files.map((file: any) => (
                        <div key={file.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-200 hover:shadow-sm transition-all">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="bg-slate-100 p-2 rounded">
                              <FileText className="w-4 h-4 text-slate-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">{file.originalName}</p>
                              <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => downloadFile(selectedRequestForReport.id, file.id, file.originalName)}
                            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-slate-400 text-center italic">
                  Report submitted on {format(new Date(selectedRequestForReport.data.completionReport.submittedAt), 'PPP p')}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-6 border-t border-slate-100 mt-2">
                {selectedRequestForReport.status === 'pending_closure' && (
                  <Button
                    onClick={() => {
                      handleCloseTask(selectedRequestForReport.id);
                      setShowReportModal(false);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
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
                <h3 className="text-xl font-bold text-slate-900">Quote Details</h3>
                {getQuoteStatusBadge(selectedQuote.status)}
              </div>

              <div className="grid gap-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-sm text-slate-500 mb-1">Service</div>
                  <div className="font-medium text-slate-900 text-lg">{selectedQuote.serviceTitle}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="text-sm text-slate-500 mb-1">Total Amount</div>
                    <div className="font-bold text-slate-900 text-2xl text-emerald-600">
                      {formatPrice(selectedQuote.quotedPrice, selectedQuote.currency)}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="text-sm text-slate-500 mb-1">Valid Until</div>
                    <div className="font-medium text-slate-900">
                      {selectedQuote.validUntil ? format(new Date(selectedQuote.validUntil), 'MMM dd, yyyy') : 'N/A'}
                    </div>
                  </div>
                </div>

                {selectedQuote.description && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-slate-900">Description & Scope</h4>
                    <p className="text-slate-600 text-sm leading-relaxed p-4 border border-slate-100 rounded-xl bg-white">
                      {selectedQuote.description}
                    </p>
                  </div>
                )}

                {negotiations[selectedQuote.id] && negotiations[selectedQuote.id].length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <h4 className="font-medium text-slate-900">Discussion History</h4>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                      {negotiations[selectedQuote.id].map((negotiation) => (
                        <div
                          key={negotiation.id}
                          className={`p-3 rounded-xl text-sm ${negotiation.isFromCustomer
                            ? 'bg-indigo-50 text-indigo-900 ml-8 rounded-tr-none'
                            : 'bg-slate-100 text-slate-800 mr-8 rounded-tl-none'
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
                  <div className="flex gap-3 pt-4 border-t border-slate-100 mt-2">
                    <Button
                      onClick={() => {
                        acceptQuote(selectedQuote.id);
                        setShowQuoteModal(false);
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Accept Quote
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowQuoteModal(false);
                        setShowNegotiationModal(true);
                      }}
                      className="flex-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                      Negotiate
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowQuoteModal(false);
                        setShowRejectionModal(true);
                      }}
                      className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
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
              <DialogTitle className="text-lg font-semibold text-slate-900">Reject Quote</DialogTitle>
              <DialogDescription className="text-sm text-slate-500">
                Please provide a reason for rejecting this quote to help us improve.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection (e.g., price too high, changed requirements)..."
                className="w-full min-h-[100px] p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
              <DialogTitle className="text-lg font-semibold text-slate-900">Negotiate Quote</DialogTitle>
              <DialogDescription className="text-sm text-slate-500">
                Send a message to the admin regarding this quote.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <textarea
                value={negotiationMessage}
                onChange={(e) => setNegotiationMessage(e.target.value)}
                placeholder="Type your message here..."
                className="w-full min-h-[100px] p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setShowNegotiationModal(false)}>Cancel</Button>
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
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
