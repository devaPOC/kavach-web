'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  User,
  FileText,
  CheckCircle2,
  X,
  AlertCircle
} from 'lucide-react';
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

interface QuoteDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote | null;
  onReviseQuote?: (quote: Quote) => void;
}

export default function QuoteDetailsModal({
  isOpen,
  onClose,
  quote,
  onReviseQuote,
}: QuoteDetailsModalProps) {
  if (!quote) return null;

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

  const canReviseQuote = ['draft', 'sent', 'pending'].includes(quote.status);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText size={20} className="text-blue-600" />
            Quote Details - {quote.quoteNumber}
          </DialogTitle>
          <DialogDescription>
            Complete details for quote {quote.quoteNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quote Status and Price */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">{quote.quoteNumber}</h3>
                {getStatusBadge(quote.status)}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  {quote.quotedPrice} {quote.currency}
                </div>
                <div className="text-sm text-gray-600">Quoted Price</div>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <User size={16} />
              Customer Information
            </h4>
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-600">Name:</span>
                  <p className="text-gray-900">{quote.customerName} {quote.customerLastName}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Email:</span>
                  <p className="text-gray-900">{quote.customerEmail}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Service Information */}
          {(quote.serviceTitle || quote.serviceType) && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <FileText size={16} />
                Service Information
              </h4>
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
                {quote.serviceTitle && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Service Title:</span>
                    <p className="text-gray-900">{quote.serviceTitle}</p>
                  </div>
                )}
                {quote.serviceType && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Service Type:</span>
                    <p className="text-gray-900">{quote.serviceType}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quote Description */}
          {quote.description && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Quote Description</h4>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-wrap">{quote.description}</p>
              </div>
            </div>
          )}

          {/* Timeline Information */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Calendar size={16} />
              Timeline
            </h4>
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-600">Created:</span>
                  <p className="text-gray-900">{format(new Date(quote.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Last Updated:</span>
                  <p className="text-gray-900">{format(new Date(quote.updatedAt), 'MMM dd, yyyy HH:mm')}</p>
                </div>
              </div>

              {quote.validUntil && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Valid Until:</span>
                  <p className="text-gray-900">{format(new Date(quote.validUntil), 'MMM dd, yyyy')}</p>
                </div>
              )}

              {quote.acceptedAt && (
                <div>
                  <span className="text-sm font-medium text-green-600">Accepted At:</span>
                  <p className="text-green-700">{format(new Date(quote.acceptedAt), 'MMM dd, yyyy HH:mm')}</p>
                </div>
              )}

              {quote.rejectedAt && (
                <div>
                  <span className="text-sm font-medium text-red-600">Rejected At:</span>
                  <p className="text-red-700">{format(new Date(quote.rejectedAt), 'MMM dd, yyyy HH:mm')}</p>
                  {quote.rejectionReason && (
                    <div className="mt-2">
                      <span className="text-sm font-medium text-red-600">Rejection Reason:</span>
                      <p className="text-red-700 bg-red-50 p-2 rounded mt-1">{quote.rejectionReason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
          {canReviseQuote && onReviseQuote && (
            <Button
              onClick={() => {
                onReviseQuote(quote);
                onClose();
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <span className="text-[10px] font-semibold mr-1">OMR</span>
              Revise Quote
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
