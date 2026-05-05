'use client';

import { useState } from 'react';
import { notify } from '@/lib/utils/notify';
import { requestServicesForm } from '../../app/(frontend)/dashboard/action';

interface UseServiceSubmissionProps {
  serviceType?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface PricingInfo {
  pricingType: string;
  fixedPrice?: number;
  currency: string;
  requiresQuote: boolean;
  message?: string;
}

export function useServiceSubmission({
  serviceType,
  onSuccess,
  onError
}: UseServiceSubmissionProps = {}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingInfo, setPricingInfo] = useState<PricingInfo | null>(null);

  // Service names are now used directly for pricing lookup
  const mapServiceType = (serviceType: string): string => {
    // Return the service type as-is since admin now creates pricing using actual service names
    return serviceType;
  };

  // Fetch pricing information for a service
  const fetchPricingInfo = async (serviceType: string, { silent }: { silent?: boolean } = {}): Promise<PricingInfo | null> => {
    try {
      setPricingLoading(true);
      const response = await fetch(`/api/v1/pricing/check/${encodeURIComponent(serviceType)}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch pricing information');
      const result = await response.json();
      if (result.success) {
        const pricing = result.data;
        setPricingInfo(pricing);
        return pricing;
      }
      if (!silent) notify.error(result.error || 'Failed to load pricing');
      return null;
    } catch (error: any) {
      console.error('Pricing fetch error:', error);
      if (!silent) notify.error(error.message || 'Pricing lookup failed');
      return null;
    } finally {
      setPricingLoading(false);
    }
  };

  // Handle form submission with pricing integration
  const handleSubmitWithPricing = async (formData: FormData) => {
    // Get service type from form data
    const formServiceType = formData.get('serviceType') as string || serviceType;

    if (formServiceType) {
      const pricing = await fetchPricingInfo(formServiceType, { silent: true });
      if (pricing) formData.append('pricingInfo', JSON.stringify(pricing));
    }

    return await submitForm(formData);
  };

  // Submit the form
  const submitForm = async (formData: FormData) => {
    try {
      setIsSubmitting(true);
      const result = await requestServicesForm(formData);

      if (result.success) {
        notify.success('Service request submitted');
        onSuccess?.();
        return result;
      } else {
        const errorMessage = result.message || 'Failed to submit service request';
        onError?.(errorMessage);
        notify.error(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to submit service request';
      onError?.(errorMessage);
      notify.error(errorMessage);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };



  return {
    isSubmitting,
    pricingLoading,
    pricingInfo,
    handleSubmitWithPricing,
    fetchPricingInfo,
  };
}
