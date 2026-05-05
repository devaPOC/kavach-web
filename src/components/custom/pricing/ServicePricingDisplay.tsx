'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertCircle } from 'lucide-react';


interface PricingInfo {
  pricingType: string;
  fixedPrice?: number;
  currency: string;
  requiresQuote: boolean;
  message?: string;
}

interface ServicePricingDisplayProps {
  serviceType: string;
  className?: string;
}

export default function ServicePricingDisplay({ serviceType, className = '' }: ServicePricingDisplayProps) {
  const [pricing, setPricing] = useState<PricingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);

  const loadPricing = async () => {
    if (!serviceType) return;
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/v1/pricing/check/${encodeURIComponent(serviceType)}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch pricing');
      const result = await response.json();
      if (result.success) {
        setPricing(result.data);
      } else {
        setError(result.error || 'Failed to load pricing');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load pricing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceType, retryCount]);

  if (loading) {
    return (
      <Card className={`border-primary/50 bg-primary/10 ${className}`}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary animate-spin" />
            <span className="text-sm text-primary">Loading pricing information...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`border-destructive bg-destructive/10 ${className}`}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 justify-between">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">Unable to load pricing information</span>
            <button
              onClick={() => setRetryCount(c => c + 1)}
              className="text-sm text-destructive underline hover:opacity-80"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pricing) {
    return null;
  }

  const getPricingDisplay = () => {
    if (pricing.pricingType === 'fixed' && pricing.fixedPrice) {
      return {
        title: 'Fixed Price',
        price: `₹${Number(pricing.fixedPrice).toFixed(2)}`,
        description: 'This service has a fixed price',
        color: 'green',
      };
    }

    return {
      title: 'Custom Quotation',
      price: 'Quote Required',
      description: pricing.message || 'A custom quote will be provided based on your requirements',
      color: 'yellow',
    };
  };

  const display = getPricingDisplay();
  const colorClasses = {
    green: {
      card: 'border-secondary/50 bg-secondary/10',
      icon: 'text-secondary',
      title: 'text-secondary',
      price: 'text-secondary',
      description: 'text-secondary',
      badge: 'bg-secondary/10 text-secondary',
    },
    blue: {
      card: 'border-primary/50 bg-primary/10',
      icon: 'text-primary',
      title: 'text-primary',
      price: 'text-primary',
      description: 'text-primary',
      badge: 'bg-primary/10 text-primary',
    },
    yellow: {
      card: 'border-accent/50 bg-accent/10',
      icon: 'text-accent',
      title: 'text-accent',
      price: 'text-accent',
      description: 'text-accent',
      badge: 'bg-accent/10 text-accent',
    },
  };

  const colors = colorClasses[display.color as keyof typeof colorClasses];

  return (
    <Card className={`${colors.card} ${className}`}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${colors.card.replace('bg-', 'bg-').replace('-50', '-100')}`}>
              <span className={`text-sm font-semibold ${colors.icon}`}>₹</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className={`font-medium ${colors.title}`}>{display.title}</h4>
                <Badge className={colors.badge}>{pricing.currency}</Badge>
              </div>
              <p className={`text-lg font-semibold ${colors.price}`}>{display.price}</p>
              <p className={`text-sm ${colors.description} mt-1`}>{display.description}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
