'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Loader2, AlertCircle, Save } from 'lucide-react';

import { AwarenessSessionRequestForm } from '@/components/custom/awareness-lab';
import { 
  type AwarenessSessionRequestResponse,
  type CreateAwarenessSessionData
} from '@/types/awareness-session';
import { type CreateAwarenessSessionData as CreateAwarenessSessionFormData } from '@/lib/validation/awareness-session-schemas';

interface AwarenessSessionRequestEditProps {
  requestId: string;
  onBack?: () => void;
  onSave?: (updatedRequest: AwarenessSessionRequestResponse) => void;
}

export function AwarenessSessionRequestEdit({
  requestId,
  onBack,
  onSave
}: AwarenessSessionRequestEditProps) {
  const [request, setRequest] = useState<AwarenessSessionRequestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [saveError, setSaveError] = useState<string>('');

  // Fetch request details
  useEffect(() => {
    if (requestId) {
      fetchRequestDetails();
    }
  }, [requestId]);

  const fetchRequestDetails = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/v1/awareness-sessions/${requestId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch request details');
      }

      const result = await response.json();
      
      if (result.success) {
        setRequest(result.data);
        
        // Check if request can be edited
        if (result.data.status !== 'pending_admin_review') {
          setError('This request cannot be edited as it has already been reviewed.');
        }
      } else {
        throw new Error(result.message || 'Failed to fetch request details');
      }
    } catch (err) {
      console.error('Error fetching request details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load request details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: CreateAwarenessSessionFormData) => {
    if (!request) return;

    try {
      setSaving(true);
      setSaveError('');

      // For now, we'll simulate the update since there's no PUT endpoint yet
      // In a real implementation, you would call PUT /api/v1/awareness-sessions/{id}
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Convert form data (sessionDate as string) to API data (sessionDate as Date)
      const sessionDate = new Date(data.sessionDate);
      
      // Create updated request object
      const updatedRequest: AwarenessSessionRequestResponse = {
        ...request,
        ...data,
        sessionDate: sessionDate.toISOString(),
        updatedAt: new Date().toISOString()
      };

      // For demo purposes, just call the onSave callback
      if (onSave) {
        onSave(updatedRequest);
      }

      // In a real implementation, you would:
      // const response = await fetch(`/api/v1/awareness-sessions/${requestId}`, {
      //   method: 'PUT',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(data),
      // });
      // 
      // if (!response.ok) {
      //   throw new Error('Failed to update request');
      // }
      // 
      // const result = await response.json();
      // 
      // if (result.success) {
      //   if (onSave) {
      //     onSave(result.data);
      //   }
      // } else {
      //   throw new Error(result.message || 'Failed to update request');
      // }

    } catch (err) {
      console.error('Error updating request:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to update request');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading request details...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !request) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error || 'Request not found'}</AlertDescription>
          </Alert>
          {onBack && (
            <Button onClick={onBack} variant="outline" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Requests
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Convert request data to form data format
  const initialFormData: CreateAwarenessSessionFormData = {
    sessionDate: request.sessionDate, // Keep as string for form
    location: request.location,
    duration: request.duration,
    subject: request.subject,
    audienceSize: request.audienceSize,
    audienceTypes: request.audienceTypes,
    sessionMode: request.sessionMode,
    specialRequirements: request.specialRequirements || '',
    organizationName: request.organizationName,
    contactEmail: request.contactEmail,
    contactPhone: request.contactPhone,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-bold">Edit Awareness Session Request</h2>
            <p className="text-muted-foreground">{request.organizationName}</p>
          </div>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>
          You can only edit requests that are still pending admin review. 
          Once reviewed, requests cannot be modified.
        </AlertDescription>
      </Alert>

      {/* Error Display */}
      {saveError && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            Update Request Details
          </CardTitle>
          <CardDescription>
            Make changes to your awareness session request. All fields are required unless marked optional.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AwarenessSessionRequestForm
            onSubmit={handleSave}
            isLoading={saving}
            error={saveError}
            initialData={initialFormData}
          />
        </CardContent>
      </Card>
    </div>
  );
}