'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Building,
  Mail,
  Phone,
  FileText,
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  MessageSquare,
  History
} from 'lucide-react';

import {
  type AwarenessSessionRequestResponse,
  type AwarenessSessionStatusHistoryResponse,
  type AwarenessSessionStatus,
  STATUS_LABELS,
  DURATION_LABELS,
  SESSION_MODE_LABELS,
  AUDIENCE_TYPE_LABELS
} from '@/types/awareness-session';

interface AwarenessSessionRequestDetailsProps {
  requestId: string;
  onBack?: () => void;
  onEdit?: () => void;
}

export function AwarenessSessionRequestDetails({
  requestId,
  onBack,
  onEdit
}: AwarenessSessionRequestDetailsProps) {
  const [request, setRequest] = useState<AwarenessSessionRequestResponse | null>(null);
  const [statusHistory, setStatusHistory] = useState<AwarenessSessionStatusHistoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Fetch request details and status history
  useEffect(() => {
    if (requestId) {
      fetchRequestDetails();
    }
  }, [requestId]);

  const fetchRequestDetails = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch request details
      const [requestResponse, historyResponse] = await Promise.all([
        fetch(`/api/v1/awareness-sessions/${requestId}`),
        fetch(`/api/v1/awareness-sessions/${requestId}/status-history`)
      ]);

      if (!requestResponse.ok) {
        throw new Error('Failed to fetch request details');
      }

      const requestResult = await requestResponse.json();

      if (requestResult.success) {
        setRequest(requestResult.data);

        // Try to fetch status history, but fall back to mock if it fails
        if (historyResponse.ok) {
          const historyResult = await historyResponse.json();
          if (historyResult.success) {
            setStatusHistory(historyResult.data);
          } else {
            // Fall back to mock history
            createMockStatusHistory(requestResult.data);
          }
        } else {
          // Fall back to mock history
          createMockStatusHistory(requestResult.data);
        }
      } else {
        throw new Error(requestResult.message || 'Failed to fetch request details');
      }
    } catch (err) {
      console.error('Error fetching request details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load request details');
    } finally {
      setLoading(false);
    }
  };

  // Create mock status history based on request data
  // TODO: Replace with actual API call when status history endpoint is implemented
  const createMockStatusHistory = (requestData: AwarenessSessionRequestResponse) => {
    const history: AwarenessSessionStatusHistoryResponse[] = [];

    // Initial creation
    history.push({
      id: '1',
      sessionRequestId: requestData.id,
      previousStatus: undefined,
      newStatus: 'pending_admin_review',
      changedBy: requestData.requesterId,
      notes: 'Request submitted for review',
      createdAt: requestData.createdAt
    });

    // Add subsequent status changes based on current status
    if (['forwarded_to_expert', 'confirmed', 'expert_declined'].includes(requestData.status)) {
      history.push({
        id: '2',
        sessionRequestId: requestData.id,
        previousStatus: 'pending_admin_review',
        newStatus: 'forwarded_to_expert',
        changedBy: 'admin-id',
        notes: requestData.adminNotes || 'Request approved and forwarded to expert',
        createdAt: requestData.reviewedAt || requestData.updatedAt
      });
    }

    if (requestData.status === 'confirmed') {
      history.push({
        id: '3',
        sessionRequestId: requestData.id,
        previousStatus: 'forwarded_to_expert',
        newStatus: 'confirmed',
        changedBy: requestData.assignedExpertId || 'expert-id',
        notes: requestData.expertNotes || 'Expert confirmed availability for the session',
        createdAt: requestData.confirmedAt || requestData.updatedAt
      });
    }

    if (requestData.status === 'expert_declined') {
      history.push({
        id: '3',
        sessionRequestId: requestData.id,
        previousStatus: 'forwarded_to_expert',
        newStatus: 'expert_declined',
        changedBy: requestData.assignedExpertId || 'expert-id',
        notes: requestData.expertNotes || 'Expert declined the session request',
        createdAt: requestData.updatedAt
      });
    }

    if (requestData.status === 'rejected') {
      history.push({
        id: '2',
        sessionRequestId: requestData.id,
        previousStatus: 'pending_admin_review',
        newStatus: 'rejected',
        changedBy: 'admin-id',
        notes: requestData.rejectionReason || 'Request was rejected',
        createdAt: requestData.reviewedAt || requestData.updatedAt
      });
    }

    setStatusHistory(history.reverse()); // Show most recent first
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: AwarenessSessionStatus) => {
    switch (status) {
      case 'confirmed':
        return 'default';
      case 'pending_admin_review':
        return 'secondary';
      case 'forwarded_to_expert':
        return 'outline';
      case 'rejected':
      case 'expert_declined':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  // Get status icon
  const getStatusIcon = (status: AwarenessSessionStatus) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
      case 'expert_declined':
        return <XCircle className="w-4 h-4" />;
      case 'pending_admin_review':
      case 'forwarded_to_expert':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check if request can be edited
  const canEditRequest = (status: AwarenessSessionStatus) => {
    return status === 'pending_admin_review';
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
            <h2 className="text-2xl font-bold">{request.subject}</h2>
            <p className="text-muted-foreground">{request.organizationName === 'Unknown Organization' ? 'Personal Request' : request.organizationName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={getStatusBadgeVariant(request.status)}
            className="flex items-center gap-1"
          >
            {getStatusIcon(request.status)}
            {STATUS_LABELS[request.status]}
          </Badge>
          {canEditRequest(request.status) && onEdit && (
            <Button onClick={onEdit} variant="outline" size="sm">
              Edit Request
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Session Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Session Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date & Time</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{formatDate(request.sessionDate)}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Duration</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{DURATION_LABELS[request.duration]}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Location</label>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{request.location}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Session Mode</label>
                  <div className="mt-1">
                    <span>{SESSION_MODE_LABELS[request.sessionMode]}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Audience Size</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>{request.audienceSize} participants</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Audience Types</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {request.audienceTypes.map((type) => (
                    <Badge key={type} variant="outline">
                      {AUDIENCE_TYPE_LABELS[type]}
                    </Badge>
                  ))}
                </div>
              </div>

              {request.specialRequirements && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Special Requirements</label>
                  <div className="mt-1 p-3 bg-muted rounded-lg">
                    <p className="text-sm">{request.specialRequirements}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Organization & Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Organization</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    <span>{request.organizationName === 'Unknown Organization' ? 'Personal Request' : request.organizationName}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Contact Email</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{request.contactEmail}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Contact Phone</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{request.contactPhone}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Information */}
          {(request.adminNotes || request.expertNotes || request.rejectionReason) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Notes & Comments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {request.adminNotes && (
                  <div className="bg-primary/10 border border-primary/50 rounded-lg p-4">
                    <div className="text-primary font-medium mb-2">Admin Notes</div>
                    <p className="text-sm text-primary">{request.adminNotes}</p>
                  </div>
                )}

                {request.expertNotes && (
                  <div className="bg-secondary/10 border border-secondary/50 rounded-lg p-4">
                    <div className="text-secondary font-medium mb-2">Expert Notes</div>
                    <p className="text-sm text-secondary">{request.expertNotes}</p>
                  </div>
                )}

                {request.rejectionReason && (
                  <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
                    <div className="text-destructive font-medium mb-2">
                      {request.status === 'rejected' ? 'Rejection Reason' : 'Expert Declined'}
                    </div>
                    <p className="text-sm text-destructive">{request.rejectionReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Status Timeline
              </CardTitle>
              <CardDescription>
                Track the progress of your request
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statusHistory.map((entry, index) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${entry.newStatus === 'confirmed' ? 'bg-secondary/10 text-secondary' :
                          entry.newStatus === 'rejected' || entry.newStatus === 'expert_declined' ? 'bg-destructive/10 text-destructive' :
                            'bg-primary/10 text-primary'
                        }`}>
                        {getStatusIcon(entry.newStatus)}
                      </div>
                      {index < statusHistory.length - 1 && (
                        <div className="w-0.5 h-8 bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="font-medium text-sm">
                        {STATUS_LABELS[entry.newStatus]}
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">
                        {formatDate(entry.createdAt)}
                      </div>
                      {entry.notes && (
                        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                          {entry.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Expert Information (if confirmed) */}
          {request.status === 'confirmed' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Expert Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="bg-secondary/10 border border-secondary/50 rounded-lg p-4">
                    <div className="text-secondary font-medium mb-2">Session Confirmed</div>
                    <p className="text-sm text-secondary">
                      Your awareness session has been confirmed. Expert contact details
                      and session materials will be shared via email closer to the session date.
                    </p>
                  </div>

                  <Alert>
                    <CheckCircle className="w-4 h-4" />
                    <AlertDescription>
                      Please check your email for confirmation details and any pre-session materials.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Request Information */}
          <Card>
            <CardHeader>
              <CardTitle>Request Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Request ID</label>
                <div className="text-sm font-mono">{request.id}</div>
              </div>
              <Separator />
              <div>
                <label className="text-xs font-medium text-muted-foreground">Created</label>
                <div className="text-sm">{formatDate(request.createdAt)}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Last Updated</label>
                <div className="text-sm">{formatDate(request.updatedAt)}</div>
              </div>
              {request.reviewedAt && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Reviewed</label>
                  <div className="text-sm">{formatDate(request.reviewedAt)}</div>
                </div>
              )}
              {request.confirmedAt && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Confirmed</label>
                  <div className="text-sm">{formatDate(request.confirmedAt)}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
