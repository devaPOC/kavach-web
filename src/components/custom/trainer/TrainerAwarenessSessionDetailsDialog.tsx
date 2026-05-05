'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Building,
  Phone,
  Mail,
  FileText,
  User,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import {
  AwarenessSessionRequestResponse,
  AwarenessSessionStatus,
  STATUS_LABELS,
  DURATION_LABELS,
  SESSION_MODE_LABELS,
  AUDIENCE_TYPE_LABELS
} from '@/types/awareness-session'

interface ExpertAwarenessSessionDetailsDialogProps {
  request: AwarenessSessionRequestResponse
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function TrainerAwarenessSessionDetailsDialog({
  request,
  open,
  onOpenChange
}: ExpertAwarenessSessionDetailsDialogProps) {
  const getStatusBadgeVariant = (status: AwarenessSessionStatus) => {
    switch (status) {
      case 'forwarded_to_expert':
        return 'default'
      case 'confirmed':
        return 'default'
      case 'expert_declined':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const getStatusIcon = (status: AwarenessSessionStatus) => {
    switch (status) {
      case 'forwarded_to_expert':
        return <AlertCircle className="h-4 w-4" />
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />
      case 'expert_declined':
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatAudienceTypes = (types: string[]) => {
    return types.map(type => AUDIENCE_TYPE_LABELS[type as keyof typeof AUDIENCE_TYPE_LABELS]).join(', ')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl">{request.subject}</DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                {request.organizationName}
              </DialogDescription>
            </div>
            <Badge variant={getStatusBadgeVariant(request.status)} className="flex items-center gap-1">
              {getStatusIcon(request.status)}
              {STATUS_LABELS[request.status]}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Session Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Session Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">Session Date</p>
                    <p className="text-sm text-gray-600">{formatDate(request.sessionDate)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">Duration</p>
                    <p className="text-sm text-gray-600">{DURATION_LABELS[request.duration]}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">Location & Mode</p>
                    <p className="text-sm text-gray-600">
                      {SESSION_MODE_LABELS[request.sessionMode]} - {request.location}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">Audience Size</p>
                    <p className="text-sm text-gray-600">{request.audienceSize} participants</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Audience Types</p>
                    <p className="text-sm text-gray-600">{formatAudienceTypes(request.audienceTypes)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-gray-600">{request.contactEmail}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium">Phone</p>
                  <p className="text-sm text-gray-600">{request.contactPhone}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Special Requirements */}
          {request.specialRequirements && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Special Requirements</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-gray-500 mt-0.5" />
                    <p className="text-sm text-gray-700">{request.specialRequirements}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Admin Notes */}
          {request.adminNotes && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Admin Notes</h3>
                <div className="bg-blue-50 p-4 rounded-md">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-blue-500 mt-0.5" />
                    <p className="text-sm text-blue-700">{request.adminNotes}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {request.expertNotes && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Trainer Notes</h3>
                <div className="bg-green-50 p-4 rounded-md">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-green-500 mt-0.5" />
                    <p className="text-sm text-green-700">{request.expertNotes}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Rejection Reason */}
          {request.rejectionReason && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Rejection Reason</h3>
                <div className="bg-red-50 p-4 rounded-md">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    <p className="text-sm text-red-700">{request.rejectionReason}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Timestamps */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Timeline</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Request Created:</span>
                <span className="text-gray-600">{formatDate(request.createdAt)}</span>
              </div>

              {request.reviewedAt && (
                <div className="flex justify-between">
                  <span className="font-medium">Admin Reviewed:</span>
                  <span className="text-gray-600">{formatDate(request.reviewedAt)}</span>
                </div>
              )}

              {request.confirmedAt && (
                <div className="flex justify-between">
                  <span className="font-medium">Trainer Confirmed:</span>
                  <span className="text-gray-600">{formatDate(request.confirmedAt)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="font-medium">Last Updated:</span>
                <span className="text-gray-600">{formatDate(request.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
