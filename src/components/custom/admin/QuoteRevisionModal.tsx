'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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

interface QuoteRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote | null;
  onQuoteRevised: () => void;
}

export default function QuoteRevisionModal({
  isOpen,
  onClose,
  quote,
  onQuoteRevised,
}: QuoteRevisionModalProps) {
  const [formData, setFormData] = useState({
    quotedPrice: '',
    currency: 'OMR',
    description: '',
    validUntil: undefined as Date | undefined,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  // Initialize form data when quote changes
  useEffect(() => {
    if (quote) {
      setFormData({
        quotedPrice: quote.quotedPrice,
        currency: quote.currency,
        description: quote.description || '',
        validUntil: quote.validUntil ? new Date(quote.validUntil) : undefined,
      });
    }
  }, [quote]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote) return;

    if (!formData.quotedPrice || parseFloat(formData.quotedPrice) <= 0) {
      setError('Please enter a valid quoted price');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const response = await fetch(`/api/v1/admin/quotes/${quote.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          quotedPrice: parseFloat(formData.quotedPrice),
          description: formData.description,
          validUntil: formData.validUntil?.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to revise quote');
      }

      const result = await response.json();
      if (result.success) {
        onQuoteRevised();
        onClose();
      } else {
        setError(result.error || 'Failed to revise quote');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to revise quote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError('');
      onClose();
    }
  };

  if (!quote) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-blue-700 text-sm font-semibold tracking-wide">OMR</span>
            Revise Quote - {quote.quoteNumber}
          </DialogTitle>
          <DialogDescription>
            Update the quote details for {quote.customerName} {quote.customerLastName}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Current Quote Details</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <p><span className="font-medium">Quote Number:</span> {quote.quoteNumber}</p>
            <p><span className="font-medium">Current Price:</span> {quote.quotedPrice} {quote.currency}</p>
            <p><span className="font-medium">Status:</span> {quote.status}</p>
            {quote.serviceTitle && (
              <p><span className="font-medium">Service:</span> {quote.serviceTitle}</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quotedPrice">New Quoted Price *</Label>
              <Input
                id="quotedPrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.quotedPrice}
                onChange={(e) => setFormData({ ...formData, quotedPrice: e.target.value })}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OMR">OMR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="validUntil">Valid Until (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.validUntil && "text-muted-foreground"
                  )}
                  disabled={isSubmitting}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.validUntil ? format(formData.validUntil, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.validUntil}
                  onSelect={(date) => setFormData({ ...formData, validUntil: date })}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Updated Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add any changes or notes about the revised quote..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={isSubmitting}
              rows={4}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <FileText size={16} className="text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Revision Notes:</p>
                <p>Revising this quote will create a new version and mark the current one as superseded. The customer will be notified of the updated quote.</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Revising Quote...' : 'Revise Quote'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
