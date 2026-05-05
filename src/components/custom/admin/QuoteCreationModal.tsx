'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ServiceRequest {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  title?: string;
  description?: string;
  serviceType?: string;
}

interface QuoteCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceRequest: ServiceRequest | null;
  onQuoteCreated: () => void;
}

export default function QuoteCreationModal({
  isOpen,
  onClose,
  serviceRequest,
  onQuoteCreated,
}: QuoteCreationModalProps) {
  const [formData, setFormData] = useState({
    quotedPrice: '',
    currency: 'OMR',
    description: '',
    validUntil: undefined as Date | undefined,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceRequest) return;

    if (!formData.quotedPrice || parseFloat(formData.quotedPrice) <= 0) {
      setError('Please enter a valid quoted price');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const response = await fetch('/api/v1/admin/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          serviceRequestId: serviceRequest.id,
          quotedPrice: parseFloat(formData.quotedPrice),
          description: formData.description,
          validUntil: formData.validUntil?.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create quote');
      }

      const result = await response.json();
      if (result.success) {
        // Reset form
        setFormData({
          quotedPrice: '',
          currency: 'OMR',
          description: '',
          validUntil: undefined,
        });
        onQuoteCreated();
        onClose();
      } else {
        setError(result.error || 'Failed to create quote');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create quote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        quotedPrice: '',
        currency: 'OMR',
        description: '',
        validUntil: undefined,
      });
      setError('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-green-700 text-sm font-semibold tracking-wide">OMR</span>
            Create Quote
          </DialogTitle>
          <DialogDescription>
            Create a quote for the service request from {serviceRequest?.customerName}
          </DialogDescription>
        </DialogHeader>

        {serviceRequest && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Service Request Details</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Customer:</span> {serviceRequest.customerName} ({serviceRequest.customerEmail})</p>
              {serviceRequest.title && (
                <p><span className="font-medium">Title:</span> {serviceRequest.title}</p>
              )}
              {serviceRequest.serviceType && (
                <p><span className="font-medium">Service Type:</span> {serviceRequest.serviceType}</p>
              )}
              {serviceRequest.description && (
                <p><span className="font-medium">Description:</span> {serviceRequest.description}</p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quotedPrice">Quoted Price *</Label>
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
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add any additional details about the quote..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={isSubmitting}
              rows={4}
            />
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
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? 'Creating Quote...' : 'Create Quote'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
