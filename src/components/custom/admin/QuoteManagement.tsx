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
      draft: { color: 'bg-muted text-foreground', icon: FileText, label: 'Draft' },
      sent: { color: 'bg-primary/10 text-primary', icon: Clock, label: 'Sent' },
      pending: { color: 'bg-accent/10 text-accent', icon: Clock, label: 'Pending' },
      accepted: { color: 'bg-secondary/10 text-secondary', icon: CheckCircle2, label: 'Accepted' },
      rejected: { color: 'bg-destructive/10 text-destructive', icon: X, label: 'Rejected' },
      expired: { color: 'bg-accent/10 text-accent', icon: AlertCircle, label: 'Expired' },
      superseded: { color: 'bg-primary/10 text-primary', icon: FileText, label: 'Superseded' },
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
    <div key={quote.id} className="bg-card rounded-lg p-4 border border-border shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-foreground">{quote.quoteNumber}</h4>
            {getStatusBadge(quote.status)}
            <Badge className="bg-secondary/10 text-secondary">
              {quote.quotedPrice} {quote.currency}
            </Badge>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
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
            <p className="text-sm text-foreground/80 bg-muted/50 p-2 rounded line-clamp-2">
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
              className="border-primary/50 text-primary hover:bg-primary/10"
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
          <div className="border border-border rounded-lg overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50">
            <CollapsibleTrigger asChild>
              <div className="w-full p-4 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 transition-transform duration-200">
                      {isCustomerOpen ? (
                        <ChevronDown size={16} className="text-primary" />
                      ) : (
                        <ChevronRight size={16} className="text-primary" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <User size={16} className="text-primary" />
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">{customerData.customer.name}</span>
                        <div className="text-sm text-muted-foreground">{customerData.customer.email}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary/10 text-primary border border-primary/50 shadow-sm">
                      {serviceCount} Service{serviceCount > 1 ? 's' : ''}
                    </Badge>
                    <Badge className="bg-secondary/10 text-secondary border border-secondary/50 shadow-sm">
                      {totalQuotesForCustomer} Quote{totalQuotesForCustomer > 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="border-t border-border">
                <div className="p-4 space-y-4 bg-muted/50">
                  {Object.entries(customerData.services).map(([serviceType, serviceQuotes]) => {
                    const serviceKey = `${customerEmail}-${serviceType}`;
                    const isServiceOpen = openServices.has(serviceKey);

                    if (serviceQuotes.length === 1) {
                      // Single quote - render directly
                      return (
                        <div key={serviceType} className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
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
                        <div className="bg-card rounded-lg border border-border overflow-hidden">
                          <CollapsibleTrigger asChild>
                            <div className="w-full p-3 hover:bg-muted/50 transition-colors duration-200 cursor-pointer">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    {isServiceOpen ? (
                                      <ChevronDown size={14} className="text-muted-foreground" />
                                    ) : (
                                      <ChevronRight size={14} className="text-muted-foreground" />
                                    )}
                                  </div>
                                  <FileText size={14} className="text-muted-foreground" />
                                  <span className="font-medium text-foreground">{serviceType}</span>
                                </div>
                                <Badge className="bg-muted text-foreground">
                                  {serviceQuotes.length} Quote{serviceQuotes.length > 1 ? 's' : ''}
                                </Badge>
                              </div>
                            </div>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <div className="border-t border-border p-3 space-y-3 bg-muted/50">
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

  const groupedQuotes = groupQuotesByCustomerAndService();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-semibold text-foreground">Quote Management</h3>
          <p className="text-muted-foreground">Manage quotes grouped by customers and services</p>
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
              <h3 className="text-xl font-semibold text-foreground">Quotes by Customer & Service</h3>
              <p className="text-muted-foreground">Organized view of all quotes grouped by customer and service type</p>
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
                className="border-primary/50 text-primary hover:bg-primary/10"
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
                    <p className="text-sm font-medium text-muted-foreground">Total Quotes</p>
                    <p className="text-2xl font-bold text-foreground">{totalQuotes}</p>
                  </div>
                  <FileText className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold text-accent">
                      {quotes.filter(q => ['sent', 'pending'].includes(q.status)).length}
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
                    <p className="text-sm font-medium text-muted-foreground">Accepted</p>
                    <p className="text-2xl font-bold text-secondary">
                      {quotes.filter(q => q.status === 'accepted').length}
                    </p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-secondary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Customers</p>
                    <p className="text-2xl font-bold text-primary">
                      {Object.keys(groupedQuotes).length}
                    </p>
                  </div>
                  <User className="h-8 w-8 text-primary" />
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
                  <p className="text-center text-muted-foreground py-8">No quotes found</p>
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
              <h3 className="text-xl font-semibold text-foreground">All Quotes</h3>
              <p className="text-muted-foreground">Complete list of all quotes</p>
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
                  <p className="text-center text-muted-foreground py-8">No quotes found</p>
                ) : (
                  quotes.map((quote) => (
                    <div key={quote.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground">{quote.quoteNumber}</h3>
                            {getStatusBadge(quote.status)}
                            <Badge className="bg-secondary/10 text-secondary">
                              {quote.quotedPrice} {quote.currency}
                            </Badge>
                          </div>

                          <div className="text-sm text-muted-foreground space-y-1">
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
                            <p className="text-sm text-foreground/80 line-clamp-2">
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
                              className="border-primary/50 text-primary hover:bg-primary/10"
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
