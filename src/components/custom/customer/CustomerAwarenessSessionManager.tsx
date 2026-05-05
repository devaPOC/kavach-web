'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw } from 'lucide-react';

import { CustomerAwarenessSessionDashboard } from './CustomerAwarenessSessionDashboard';
import { AwarenessSessionRequestDetails } from './AwarenessSessionRequestDetails';
import { AwarenessSessionRequestEdit } from './AwarenessSessionRequestEdit';
import { AwarenessSessionRequest } from './AwarenessSessionRequest';
import { type AwarenessSessionRequestResponse } from '@/types/awareness-session';

type ViewMode = 'dashboard' | 'details' | 'edit' | 'create';

interface CustomerAwarenessSessionManagerProps {
  className?: string;
}

export function CustomerAwarenessSessionManager({
  className = ''
}: CustomerAwarenessSessionManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedRequestId, setSelectedRequestId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input for better UX
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Handle navigation
  const handleCreateNew = () => {
    setViewMode('create');
  };

  const handleViewDetails = (requestId: string) => {
    setSelectedRequestId(requestId);
    setViewMode('details');
  };

  const handleEditRequest = (requestId: string) => {
    setSelectedRequestId(requestId);
    setViewMode('edit');
  };

  const handleBackToDashboard = () => {
    setViewMode('dashboard');
    setSelectedRequestId('');
  };

  const handleRequestSaved = (updatedRequest: AwarenessSessionRequestResponse) => {
    // Handle successful save - could refresh data or show success message
    console.log('Request saved:', updatedRequest);
    handleBackToDashboard();
  };

  const handleRequestCreated = () => {
    // Handle successful creation - go back to dashboard
    handleBackToDashboard();
  };

  // Render content based on view mode
  const renderContent = () => {
    // Pass filter/search props only for dashboard mode
    switch (viewMode) {
      case 'create':
        return (
          <div>
            <AwarenessSessionRequest />
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleBackToDashboard}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        );

      case 'details':
        return (
          <AwarenessSessionRequestDetails
            requestId={selectedRequestId}
            onBack={handleBackToDashboard}
            onEdit={() => handleEditRequest(selectedRequestId)}
          />
        );

      case 'edit':
        return (
          <AwarenessSessionRequestEdit
            requestId={selectedRequestId}
            onBack={handleBackToDashboard}
            onSave={handleRequestSaved}
          />
        );

      case 'dashboard':
      default:
        return (
          <CustomerAwarenessSessionDashboard
            onCreateNew={handleCreateNew}
            onViewDetails={handleViewDetails}
            onEditRequest={handleEditRequest}
            statusTab={statusFilter as any}
            search={debouncedSearch}
          />
        );
    }
  };

  return (
    <div className={className}>
      {/* Minimal controls */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
        {/* Minimal controls - Removed as they are handled by CustomerAwarenessSessionDashboard's FilterToolbar */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
          {/* Controls delegated to Dashboard component */}
        </div>
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
}
