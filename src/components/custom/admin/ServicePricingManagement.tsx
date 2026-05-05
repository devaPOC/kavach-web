'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Save, X, Trash, CheckSquare, Square } from 'lucide-react';
// Removed frontend data import to eliminate circular dependency.
// Service types now fetched from backend API.
import { notify } from '@/lib/utils/notify';


interface ServicePricing {
  id: string;
  serviceType: string;
  pricingType: 'fixed' | 'variable';
  fixedPrice?: number;
  currency: string;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface PricingFormData {
  serviceType: string;
  pricingType: 'fixed' | 'variable';
  fixedPrice: string;
  currency: string;
  description: string;
}

// Service types loaded dynamically from API
let INITIAL_SERVICE_TYPES: string[] = [];

export default function ServicePricingManagement() {
  const [pricingList, setPricingList] = useState<ServicePricing[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingPricing, setEditingPricing] = useState<ServicePricing | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [serviceTypes, setServiceTypes] = useState<string[]>(INITIAL_SERVICE_TYPES);
  const [serviceTypesLoading, setServiceTypesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingServiceType, setDeletingServiceType] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [formData, setFormData] = useState<PricingFormData>({
    serviceType: '',
    pricingType: 'fixed',
    fixedPrice: '',
    currency: 'OMR',
    description: '',
  });

  useEffect(() => {
    fetchPricingList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  useEffect(() => {
    fetchServiceTypes();
  }, []);

  const fetchServiceTypes = async () => {
    try {
      setServiceTypesLoading(true);
      const res = await fetch('/api/v1/admin/service-types', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load service types');
      const json = await res.json();
      if (json.success) {
        setServiceTypes(json.data || []);
      }
    } catch (err: any) {
      console.error('Service types error:', err);
    } finally {
      setServiceTypesLoading(false);
    }
  };

  const fetchPricingList = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/admin/pricing?page=${page}&limit=${limit}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pricing list');
      }

      const result = await response.json();
      if (result.success) {
        const payload = Array.isArray(result.data) ? { items: result.data, page: 1, limit: result.data.length, total: result.data.length, totalPages: 1 } : result.data;
        setPricingList(payload.items || []);
        setPage(payload.page || 1);
        setLimit(payload.limit || 20);
        setTotal(payload.total || (payload.items?.length ?? 0));
        setTotalPages(payload.totalPages || 1);
      } else {
        setError(result.error || 'Failed to load pricing list');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load pricing list');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (!formData.serviceType) {
      notify.error('Please select a service type');
      return;
    }

    if (formData.pricingType === 'fixed' && (!formData.fixedPrice || parseFloat(formData.fixedPrice) <= 0)) {
      notify.error('Please enter a valid fixed price greater than 0');
      return;
    }

    try {
      const payload = {
        serviceType: formData.serviceType,
        pricingType: formData.pricingType,
        fixedPrice: formData.pricingType === 'fixed' && formData.fixedPrice ? parseFloat(formData.fixedPrice) : null,
        currency: formData.currency,
        description: formData.description || null,
      };

      const url = editingPricing
        ? `/api/v1/admin/pricing/${editingPricing.serviceType}`
        : '/api/v1/admin/pricing';

      const method = editingPricing ? 'PUT' : 'POST';

      setSaving(true);
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        await fetchPricingList();
        resetForm();
        notify.success(editingPricing ? 'Pricing updated successfully!' : 'Pricing created successfully!');
      } else {
        // Handle specific error cases
        if (response.status === 409) {
          notify.error(`Pricing already exists for "${formData.serviceType}".`);
        } else if (response.status === 400) {
          notify.error(`Validation error: ${result.error || 'Invalid data provided'}`);
        } else {
          throw new Error(result.error || 'Failed to save pricing');
        }
      }
    } catch (err: any) {
      notify.error(err.message || 'Failed to save pricing');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (pricing: ServicePricing) => {
    setEditingPricing(pricing);
    setFormData({
      serviceType: pricing.serviceType,
      pricingType: pricing.pricingType,
      fixedPrice: pricing.fixedPrice?.toString() || '',
      currency: pricing.currency,
      description: pricing.description || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (serviceType: string) => {
    if (!window.confirm('Delete this pricing configuration? This action cannot be undone.')) return;

    try {
      setDeletingServiceType(serviceType);
      const response = await fetch(`/api/v1/admin/pricing/${serviceType}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete pricing');
      }

      const result = await response.json();
      if (result.success) {
        await fetchPricingList();
        notify.success('Pricing deleted');
      } else {
        throw new Error(result.error || 'Failed to delete pricing');
      }
    } catch (err: any) {
      notify.error(err.message || 'Failed to delete pricing');
    } finally {
      setDeletingServiceType(null);
    }
  };

  // Bulk selection functions
  const handleSelectItem = (serviceType: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(serviceType)) {
      newSelected.delete(serviceType);
    } else {
      newSelected.add(serviceType);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === pricingList.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(pricingList.map(p => p.serviceType)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) {
      notify.error('Select items to delete first');
      return;
    }

    const confirmMessage = `Delete ${selectedItems.size} pricing configuration${selectedItems.size > 1 ? 's' : ''}? This cannot be undone.`;
    if (!window.confirm(confirmMessage)) return;

    setBulkDeleting(true);

    try {
      const response = await fetch('/api/v1/admin/pricing/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          serviceTypes: Array.from(selectedItems),
        }),
      });

      if (!response.ok) throw new Error('Failed to delete pricing configurations');

      const result = await response.json();
      if (result.success) {
        // Clear selection and refresh list
        setSelectedItems(new Set());
        await fetchPricingList();

        // Show result message
        const { success: successCount, failed: errorCount, errors } = result.data;
        if (errorCount === 0) {
          notify.success(`Deleted ${successCount} configuration${successCount > 1 ? 's' : ''}`);
        } else {
          notify.error(`Partial delete: ${successCount} succeeded, ${errorCount} failed.`);
        }
      } else {
        throw new Error(result.error || 'Failed to delete pricing configurations');
      }
    } catch (error: any) {
      console.error('Bulk delete error:', error);
      notify.error(error.message || 'Bulk delete failed');
    } finally {
      setBulkDeleting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      serviceType: '',
      pricingType: 'fixed',
      fixedPrice: '',
      currency: 'OMR',
      description: '',
    });
    setEditingPricing(null);
    setShowForm(false);
  };

  const getPricingTypeBadge = (type: string) => {
    const config = {
      fixed: { color: 'bg-green-100 text-green-800', text: 'Fixed Price' },
      variable: { color: 'bg-yellow-100 text-yellow-800', text: 'Custom Quotation' },
    };
    const { color, text } = config[type as keyof typeof config] || config.fixed;
    return <Badge className={color}>{text}</Badge>;
  };

  const formatPriceDisplay = (pricing: ServicePricing) => {
    if (pricing.pricingType === 'fixed' && pricing.fixedPrice) {
      return `OMR ${Number(pricing.fixedPrice).toFixed(2)}`;
    }
    if (pricing.pricingType === 'variable') {
      return 'Custom Quotation';
    }
    return 'Not Set';
  };

  const getAvailableServiceTypes = () => {
    const usedTypes = pricingList.map(p => p.serviceType);
    return serviceTypes.filter(type =>
      !usedTypes.includes(type) || (editingPricing && editingPricing.serviceType === type)
    );
  };

  const getServiceTypeDisplayName = (serviceType: string) => {
    const usedTypes = pricingList.map(p => p.serviceType);
    const isConfigured = usedTypes.includes(serviceType);
    const isCurrentlyEditing = editingPricing && editingPricing.serviceType === serviceType;

    if (isConfigured && !isCurrentlyEditing) {
      return `${serviceType} (Already Configured)`;
    }
    return serviceType;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-gray-500">Loading pricing configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {selectedItems.size > 0 && (
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleteLoading}
            >
              <Trash size={16} className="mr-2" />
              {bulkDeleteLoading ? 'Deleting...' : `Delete ${selectedItems.size} Selected`}
            </Button>
          )}
          <Button
            onClick={() => setShowForm(true)}
            disabled={showForm || serviceTypesLoading || (getAvailableServiceTypes().length === 0 && !editingPricing)}
            title={getAvailableServiceTypes().length === 0 ? 'All services already have pricing configured' : 'Add new pricing configuration'}
          >
            <Plus size={16} className="mr-2" />
            Add Pricing
            {getAvailableServiceTypes().length === 0 && (
              <span className="ml-1 text-xs">({getAvailableServiceTypes().length} available)</span>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Pricing Form */}
      {showForm && getAvailableServiceTypes().length === 0 && !editingPricing && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-yellow-800 font-medium">All services have pricing configured</p>
              <p className="text-yellow-700 text-sm mt-1">
                All available services already have pricing configurations. You can edit existing pricing or delete some to add new ones.
              </p>
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                className="mt-3"
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && (getAvailableServiceTypes().length > 0 || editingPricing) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingPricing ? 'Edit' : 'Add'} Service Pricing</CardTitle>
            <CardDescription>
              {editingPricing
                ? 'Update the pricing configuration for this service'
                : `Configure pricing for a service type. ${getAvailableServiceTypes().length} services available for pricing.`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="serviceType">Service Type</Label>
                  <Select
                    value={formData.serviceType}
                    onValueChange={(value) => setFormData({ ...formData, serviceType: value })}
                    disabled={!!editingPricing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableServiceTypes().map((type) => (
                        <SelectItem key={type} value={type}>
                          {getServiceTypeDisplayName(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="pricingType">Pricing Type</Label>
                  <Select
                    value={formData.pricingType}
                    onValueChange={(value: 'fixed' | 'variable') =>
                      setFormData({ ...formData, pricingType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Price</SelectItem>
                      <SelectItem value="variable">Custom Quotation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.pricingType === 'fixed' && (
                <div>
                  <Label htmlFor="fixedPrice">Fixed Price ({formData.currency})</Label>
                  <Input
                    id="fixedPrice"
                    type="number"
                    step="0.01"
                    value={formData.fixedPrice}
                    onChange={(e) => setFormData({ ...formData, fixedPrice: e.target.value })}
                    placeholder="Enter fixed price"
                  />
                </div>
              )}

              {formData.pricingType === 'variable' && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Custom Quotation:</strong> This service will require individual quotes based on customer requirements. No fixed price will be displayed to customers.
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional pricing details or notes"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  <Save size={16} className="mr-2" />
                  {saving ? (editingPricing ? 'Updating...' : 'Creating...') : (editingPricing ? 'Update' : 'Create')} Pricing
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  <X size={16} className="mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Pricing List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Current Pricing Configurations</CardTitle>
              <CardDescription>Manage existing service pricing</CardDescription>
            </div>
            {pricingList.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="flex items-center gap-2"
                >
                  {selectedItems.size === pricingList.length ? (
                    <CheckSquare size={16} />
                  ) : (
                    <Square size={16} />
                  )}
                  {selectedItems.size === pricingList.length ? 'Deselect All' : 'Select All'}
                </Button>
                {selectedItems.size > 0 && (
                  <span className="text-sm text-gray-600">
                    {selectedItems.size} of {pricingList.length} selected
                  </span>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pricingList.length === 0 ? (
              <div className="text-center py-8">
                <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-gray-400 font-semibold">OMR</span>
                </div>
                <p className="text-gray-500 font-medium">No pricing configurations found</p>
                <p className="text-gray-400 text-sm">Add your first service pricing to get started</p>
              </div>
            ) : (
              pricingList.map((pricing) => (
                <div key={pricing.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <button
                        onClick={() => handleSelectItem(pricing.serviceType)}
                        className="mt-1 p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        {selectedItems.has(pricing.serviceType) ? (
                          <CheckSquare size={18} className="text-blue-600" />
                        ) : (
                          <Square size={18} className="text-gray-400" />
                        )}
                      </button>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{pricing.serviceType}</h3>
                          {getPricingTypeBadge(pricing.pricingType)}
                        </div>

                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-600">Price:</span>
                            <span className="font-medium">{formatPriceDisplay(pricing)}</span>
                          </div>
                          {pricing.description && (
                            <p className="text-gray-700 line-clamp-2">{pricing.description}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(pricing)}
                      >
                        <Edit size={16} className="mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(pricing.serviceType)}
                        disabled={deletingServiceType === pricing.serviceType}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={16} className="mr-1" />
                        {deletingServiceType === pricing.serviceType ? 'Disabling...' : 'Disable'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Pagination controls */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Page {page} of {totalPages} • Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
