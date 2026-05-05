'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Calendar,
  Clock,
  User,
  UserCheck,
  CheckCircle2,
  X,
  AlertCircle,
  FileText,

  Settings
} from 'lucide-react';
import { format } from 'date-fns';

interface ServiceRequest {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  assignedExpertId?: string;
  expertName?: string;
  expertEmail?: string;
  serviceType?: string;
  status: string;
  priority?: string;
  title?: string;
  description?: string;
  assignedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface ServiceRequestManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: ServiceRequest | null;
  onRequestUpdated: () => void;
}

export default function ServiceRequestManageModal({
  isOpen,
  onClose,
  request,
  onRequestUpdated,
}: ServiceRequestManageModalProps) {
  const [newStatus, setNewStatus] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string>('');

  React.useEffect(() => {
    if (request) {
      setNewStatus(request.status);
      setNotes('');
      setError('');
    }
  }, [request]);

  const handleUpdateStatus = async () => {
    if (!request || !newStatus) return;

    try {
      setIsUpdating(true);
      setError('');

      const response = await fetch(`/api/v1/admin/service-requests/${request.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          status: newStatus,
          notes: notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update service request status');
      }

      const result = await response.json();
      if (result.success) {
        onRequestUpdated();
        onClose();
      } else {
        setError(result.error || 'Failed to update service request status');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update service request status');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-accent/10 text-accent', icon: Clock, label: 'Pending' },
      assigned: { color: 'bg-primary/10 text-primary', icon: UserCheck, label: 'Assigned' },
      accepted: { color: 'bg-accent/10 text-accent', icon: UserCheck, label: 'Accepted' },
      in_progress: { color: 'bg-accent/10 text-accent', icon: AlertCircle, label: 'In Progress' },
      completed: { color: 'bg-secondary/10 text-secondary', icon: CheckCircle2, label: 'Completed' },
      pending_closure: { color: 'bg-primary/10 text-primary', icon: Clock, label: 'Pending Closure' },
      closed: { color: 'bg-muted text-foreground', icon: CheckCircle2, label: 'Closed' },
      cancelled: { color: 'bg-destructive/10 text-destructive', icon: X, label: 'Cancelled' },
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

  const getAvailableStatuses = () => {
    if (!request) return [];

    const currentStatus = request.status;
    const allStatuses = [
      { value: 'pending', label: 'Pending', description: 'Waiting for action' },
      { value: 'assigned', label: 'Assigned', description: 'Assigned to expert' },
      { value: 'accepted', label: 'Accepted', description: 'Expert accepted the task' },
      { value: 'in_progress', label: 'In Progress', description: 'Work is being done' },
      { value: 'completed', label: 'Completed', description: 'Work is finished' },
      { value: 'pending_closure', label: 'Pending Closure', description: 'Awaiting customer confirmation' },
      { value: 'closed', label: 'Closed', description: 'Request is closed' },
      { value: 'cancelled', label: 'Cancelled', description: 'Request was cancelled' },
    ];

    // Define valid transitions based on current status
    const validTransitions: Record<string, string[]> = {
      pending: ['assigned', 'cancelled'],
      assigned: ['accepted', 'cancelled'],
      accepted: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
      completed: ['pending_closure', 'closed'],
      pending_closure: ['closed', 'in_progress'], // Can reopen if customer requests changes
      closed: [], // Final state
      cancelled: ['pending'], // Can reopen cancelled requests
    };

    const allowedStatuses = validTransitions[currentStatus] || [];
    return allStatuses.filter(status =>
      status.value === currentStatus || allowedStatuses.includes(status.value)
    );
  };

  if (!request) return null;

  const availableStatuses = getAvailableStatuses();
  const canUpdateStatus = newStatus !== request.status;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings size={20} className="text-primary" />
            Manage Service Request
          </DialogTitle>
          <DialogDescription>
            Update status and manage the service request workflow
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Request Information */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {request.title || 'Service Request'}
                </h3>
                <p className="text-sm text-muted-foreground">ID: {request.id}</p>
              </div>
              {getStatusBadge(request.status)}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">Customer:</span>
                <p className="text-foreground">{request.customerName}</p>
                <p className="text-muted-foreground">{request.customerEmail}</p>
              </div>

              {request.expertName && (
                <div>
                  <span className="font-medium text-muted-foreground">Assigned Expert:</span>
                  <p className="text-foreground">{request.expertName}</p>
                  <p className="text-muted-foreground">{request.expertEmail}</p>
                </div>
              )}

              <div>
                <span className="font-medium text-muted-foreground">Created:</span>
                <p className="text-foreground">{format(new Date(request.createdAt), 'MMM dd, yyyy HH:mm')}</p>
              </div>

              {request.assignedAt && (
                <div>
                  <span className="font-medium text-muted-foreground">Assigned:</span>
                  <p className="text-foreground">{format(new Date(request.assignedAt), 'MMM dd, yyyy HH:mm')}</p>
                </div>
              )}

              {request.serviceType && (
                <div>
                  <span className="font-medium text-muted-foreground">Service Type:</span>
                  <p className="text-foreground">{request.serviceType}</p>
                </div>
              )}

              {request.priority && (
                <div>
                  <span className="font-medium text-muted-foreground">Priority:</span>
                  <p className="text-foreground capitalize">{request.priority}</p>
                </div>
              )}
            </div>

            {request.description && (
              <div className="mt-4">
                <span className="font-medium text-muted-foreground">Description:</span>
                <p className="text-foreground mt-1 bg-card p-3 rounded border">
                  {request.description}
                </p>
              </div>
            )}
          </div>

          {/* Status Update Section */}
          <div className="space-y-4">
            <h4 className="font-medium text-foreground flex items-center gap-2">
              <AlertCircle size={16} />
              Update Status
            </h4>

            <div className="space-y-3">
              <div>
                <Label htmlFor="status">New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStatuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        <div className="flex flex-col">
                          <span>{status.label}</span>
                          <span className="text-xs text-muted-foreground">{status.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this status change..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {canUpdateStatus && (
              <div className="bg-primary/10 border border-primary/50 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-primary mt-0.5" />
                  <div className="text-sm text-primary">
                    <p className="font-medium">Status Change Impact:</p>
                    <p>
                      Changing from "{request.status}" to "{newStatus}" will update the request workflow.
                      {newStatus === 'completed' && ' The customer will be notified that the work is complete.'}
                      {newStatus === 'cancelled' && ' This will cancel the service request permanently.'}
                      {newStatus === 'in_progress' && ' This indicates active work is being performed.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground flex items-center gap-2">
              <FileText size={16} />
              Quick Actions
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Could implement view quotes functionality
                  console.log('View quotes for request:', request.id);
                }}
                className="justify-start"
              >
                <span className="text-[10px] font-semibold mr-2">₹</span>
                View Quotes
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Could implement communication functionality
                  console.log('Contact customer:', request.customerEmail);
                }}
                className="justify-start"
              >
                <User size={14} className="mr-2" />
                Contact Customer
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isUpdating}
          >
            Cancel
          </Button>

          {canUpdateStatus && (
            <Button
              onClick={handleUpdateStatus}
              disabled={isUpdating}
              className="bg-primary hover:bg-primary"
            >
              {isUpdating ? 'Updating...' : 'Update Status'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
