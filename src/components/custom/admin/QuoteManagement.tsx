'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Calendar,
  Clock,
  User,
  Eye,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronRight,
  FileText,
  AlertCircle,
  Edit
} from 'lucide-react';
import QuoteDetailsModal from './QuoteDetailsModal';
import QuoteRevisionModal from './QuoteRevisionModal';
import { format } from 'date-fns';

interface Quote {
  id: string;
  serviceRequestId: string;
  customerId: string;
  adminId: string;
  quoteNumber: string;
  quotedPrice: string;
  currency: string;
  status: string;
  description?: string;
  validUntil?: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
  customerName: string;
  customerLastName: string;
  customerEmail: string;
  serviceTitle?: string;
  serviceType?: string;
}

interface GroupedQuotes {
  [customerEmail: string]: {
    customer: {
      name: string;
      email: string;
    };
    services: {
      [serviceType: string]: Quote[];
    };
  };
}

export default function QuoteManagement() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalQuotes, setTotalQuotes] = useState(0);

  // Collapsible states
  const [openCustomers, setOpenCustomers] = useState<Set<string>>(new Set());
  const [openServices, setOpenServices] = useState<Set<string>>(new Set());

  // Modal states
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);

  // Fetch quotes
  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50', // Higher limit for better grouping
      });

      if (statusFilter && statusFilter !== 'all') {
        queryParams.append('status', statusFilter);
      }
      if (customerFilter && customerFilter !== 'all') {
        queryParams.append('customerId', customerFilter);
      }

      const response = await fetch(`/api/v1/admin/quotes?${queryParams}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch quotes');
      }

      const result = await response.json();
      if (result.success) {
        setQuotes(result.data.quotes);
        setTotalPages(result.data.pagination.totalPages);
        setTotalQuotes(result.data.pagination.total);
      } else {
        setError(result.error || 'Failed to load quotes');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load quotes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, [currentPage, statusFilter, customerFilter]);

  // Group quotes by customer and service
  const groupQuotesByCustomerAndService = (): GroupedQuotes => {
    return quotes.reduce((groups, quote) => {
      const customerKey = quote.customerEmail;
      const serviceType = quote.serviceType || 'Other Services';

      if (!groups[customerKey]) {
        groups[customerKey] = {
          customer: {
            name: `${quote.customerName} ${quote.customerLastName}`,
            email: quote.customerEmail,
          },
          services: {},
        };
      }

      if (!groups[customerKey].services[serviceType]) {
        groups[customerKey].services[serviceType] = [];
      }

      groups[customerKey].services[serviceType].push(quote);
      return groups;
    }, {} as GroupedQuotes);
  };

  const toggleCustomer = (customerEmail: string) => {
    const newOpenCustomers = new Set(openCustomers);
    if (newOpenCustomers.has(customerEmail)) {
      newOpenCustomers.delete(customerEmail);
    } else {
      newOpenCustomers.add(customerEmail);
    }
    setOpenCustomers(newOpenCustomers);
  };

  const toggleService = (serviceKey: string) => {
    const newOpenServices = new Set(openServices);
    if (newOpenServices.has(serviceKey)) {
      newOpenServices.delete(serviceKey);
    } else {
      newOpenServices.add(serviceKey);
    }
    setOpenServices(newOpenServices);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: FileText, label: 'Draft' },
      sent: { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'Sent' },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
      accepted: { color: 'bg-green-100 text-green-800', icon: CheckCircle2, label: 'Accepted' },
      rejected: { color: 'bg-red-100 text-red-800', icon: X, label: 'Rejected' },
      expired: { color: 'bg-orange-100 text-orange-800', icon: AlertCircle, label: 'Expired' },
      superseded: { color: 'bg-purple-100 text-purple-800', icon: FileText, label: 'Superseded' },
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

  const renderQuoteCard = (quote: Quote) => (
    <div key={quote.id} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-gray-900">{quote.quoteNumber}</h4>
            {getStatusBadge(quote.status)}
            <Badge className="bg-green-100 text-green-800">
              {quote.quotedPrice} {quote.currency}
            </Badge>
          </div>

          <div className="text-sm text-gray-600 space-y-1">
            {quote.serviceTitle && (
              <div className="flex items-center gap-2">
                <FileText size={12} />
                <span>{quote.serviceTitle}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar size={12} />
              <span>Created: {format(new Date(quote.createdAt), 'MMM dd, yyyy HH:mm')}</span>
            </div>
            {quote.validUntil && (
              <div className="flex items-center gap-2">
                <Clock size={12} />
                <span>Valid until: {format(new Date(quote.validUntil), 'MMM dd, yyyy')}</span>
              </div>
            )}
          </div>

          {quote.description && (
            <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded line-clamp-2">
              {quote.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedQuote(quote);
              setShowDetailsModal(true);
            }}
          >
            <Eye size={14} className="mr-1" />
            View Details
          </Button>
          {['draft', 'sent', 'pending'].includes(quote.status) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedQuote(quote);
                setShowRevisionModal(true);
              }}
              className="border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              <Edit size={14} className="mr-1" />
              Revise Quote
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const renderGroupedQuotes = (groupedQuotes: GroupedQuotes) => {
    return Object.entries(groupedQuotes).map(([customerEmail, customerData]) => {
      const isCustomerOpen = openCustomers.has(customerEmail);
      const serviceCount = Object.keys(customerData.services).length;
      const totalQuotesForCustomer = Object.values(customerData.services).flat().length;

      return (
        <Collapsible key={customerEmail} open={isCustomerOpen} onOpenChange={() => toggleCustomer(customerEmail)}>
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50">
            <CollapsibleTrigger asChild>
              <div className="w-full p-4 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 transition-transform duration-200">
                      {isCustomerOpen ? (
                        <ChevronDown size={16} className="text-blue-600" />
                      ) : (
                        <ChevronRight size={16} className="text-blue-600" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User size={16} className="text-blue-600" />
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900">{customerData.customer.name}</span>
                        <div className="text-sm text-gray-600">{customerData.customer.email}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-800 border border-blue-200 shadow-sm">
                      {serviceCount} Service{serviceCount > 1 ? 's' : ''}
                    </Badge>
                    <Badge className="bg-green-100 text-green-800 border border-green-200 shadow-sm">
                      {totalQuotesForCustomer} Quote{totalQuotesForCustomer > 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="border-t border-gray-200">
                <div className="p-4 space-y-4 bg-gray-50">
                  {Object.entries(customerData.services).map(([serviceType, serviceQuotes]) => {
                    const serviceKey = `${customerEmail}-${serviceType}`;
                    const isServiceOpen = openServices.has(serviceKey);

                    if (serviceQuotes.length === 1) {
                      // Single quote - render directly
                      return (
                        <div key={serviceType} className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <FileText size={14} />
                            <span>{serviceType}</span>
                          </div>
                          {renderQuoteCard(serviceQuotes[0])}
                        </div>
                      );
                    }

                    // Multiple quotes - create collapsible service group
                    return (
                      <Collapsible key={serviceType} open={isServiceOpen} onOpenChange={() => toggleService(serviceKey)}>
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                          <CollapsibleTrigger asChild>
                            <div className="w-full p-3 hover:bg-gray-50 transition-colors duration-200 cursor-pointer">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    {isServiceOpen ? (
                                      <ChevronDown size={14} className="text-gray-600" />
                                    ) : (
                                      <ChevronRight size={14} className="text-gray-600" />
                                    )}
                                  </div>
                                  <FileText size={14} className="text-gray-600" />
                                  <span className="font-medium text-gray-900">{serviceType}</span>
                                </div>
                                <Badge className="bg-gray-100 text-gray-800">
                                  {serviceQuotes.length} Quote{serviceQuotes.length > 1 ? 's' : ''}
                                </Badge>
                              </div>
                            </div>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <div className="border-t border-gray-200 p-3 space-y-3 bg-gray-50">
                              {serviceQuotes.map((quote) => renderQuoteCard(quote))}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      );
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const groupedQuotes = groupQuotesByCustomerAndService();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Quote Management</h3>
          <p className="text-gray-600">Manage quotes grouped by customers and services</p>
        </div>
      </div>

      <Tabs defaultValue="grouped" className="space-y-6">
        <TabsList>
          <TabsTrigger value="grouped">Grouped View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        <TabsContent value="grouped" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Quotes by Customer & Service</h3>
              <p className="text-gray-600">Organized view of all quotes grouped by customer and service type</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allCustomers = Object.keys(groupedQuotes);
                  const allExpanded = allCustomers.every(key => openCustomers.has(key));
                  if (allExpanded) {
                    setOpenCustomers(new Set());
                    setOpenServices(new Set());
                  } else {
                    setOpenCustomers(new Set(allCustomers));
                  }
                }}
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                {Object.keys(groupedQuotes).every(key => openCustomers.has(key)) ? 'Collapse All' : 'Expand All'}
              </Button>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Quotes</p>
                    <p className="text-2xl font-bold text-gray-900">{totalQuotes}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {quotes.filter(q => ['sent', 'pending'].includes(q.status)).length}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Accepted</p>
                    <p className="text-2xl font-bold text-green-600">
                      {quotes.filter(q => q.status === 'accepted').length}
                    </p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Customers</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {Object.keys(groupedQuotes).length}
                    </p>
                  </div>
                  <User className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Grouped Quotes */}
          <Card>
            <CardHeader>
              <CardTitle>Quotes by Customer</CardTitle>
              <CardDescription>
                Quotes organized by customer and service type for better management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.keys(groupedQuotes).length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No quotes found</p>
                ) : (
                  renderGroupedQuotes(groupedQuotes)
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">All Quotes</h3>
              <p className="text-gray-600">Complete list of all quotes</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Quotes</CardTitle>
              <CardDescription>
                {statusFilter !== 'all' && `Filtered by: ${statusFilter}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {quotes.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No quotes found</p>
                ) : (
                  quotes.map((quote) => (
                    <div key={quote.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900">{quote.quoteNumber}</h3>
                            {getStatusBadge(quote.status)}
                            <Badge className="bg-green-100 text-green-800">
                              {quote.quotedPrice} {quote.currency}
                            </Badge>
                          </div>

                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex items-center gap-2">
                              <User size={14} />
                              <span>{quote.customerName} {quote.customerLastName} ({quote.customerEmail})</span>
                            </div>
                            {quote.serviceTitle && (
                              <div className="flex items-center gap-2">
                                <FileText size={14} />
                                <span>{quote.serviceTitle}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Calendar size={14} />
                              <span>Created: {format(new Date(quote.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                            </div>
                          </div>

                          {quote.description && (
                            <p className="text-sm text-gray-700 line-clamp-2">
                              {quote.description}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedQuote(quote);
                              setShowDetailsModal(true);
                            }}
                          >
                            <Eye size={16} className="mr-1" />
                            View Details
                          </Button>
                          {['draft', 'sent', 'pending'].includes(quote.status) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedQuote(quote);
                                setShowRevisionModal(true);
                              }}
                              className="border-blue-200 text-blue-600 hover:bg-blue-50"
                            >
                              <Edit size={16} className="mr-1" />
                              Revise Quote
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quote Details Modal */}
      <QuoteDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedQuote(null);
        }}
        quote={selectedQuote}
        onReviseQuote={(quote) => {
          setSelectedQuote(quote);
          setShowRevisionModal(true);
        }}
      />

      {/* Quote Revision Modal */}
      <QuoteRevisionModal
        isOpen={showRevisionModal}
        onClose={() => {
          setShowRevisionModal(false);
          setSelectedQuote(null);
        }}
        quote={selectedQuote}
        onQuoteRevised={() => {
          fetchQuotes();
        }}
      />
    </div>
  );
}
