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
  Building,
  Users,
  Mail,
  Phone,
  FileText,
  User,
  Globe
} from 'lucide-react'
import type { AwarenessSessionRequestResponse } from '@/types/awareness-session'
import { 
  STATUS_LABELS, 
  DURATION_LABELS, 
  SESSION_MODE_LABELS, 
  AUDIENCE_TYPE_LABELS 
} from '@/types/awareness-session'

interface ExpertOption {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface AwarenessSessionDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: AwarenessSessionRequestResponse | null
  expert?: ExpertOption
}

export default function AwarenessSessionDetailsDialog({
  open,
  onOpenChange,
  request,
  expert
}: AwarenessSessionDetailsDialogProps) {
  if (!request) return null

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending_admin_review': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'forwarded_to_expert': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      case 'expert_declined': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Awareness Session Request Details
          </DialogTitle>
          <DialogDescription>
            Complete information for request from {request.organizationName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Basic Info */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{request.organizationName}</h3>
              <p className="text-sm text-gray-500">Request ID: {request.id}</p>
            </div>
            <Badge className={getStatusBadgeColor(request.status)}>
              {STATUS_LABELS[request.status]}
            </Badge>
          </div>

          <Separator />

          {/* Session Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Session Information
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Subject/Topic</p>
                    <p className="text-sm text-gray-900">{request.subject}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Session Date</p>
                    <p className="text-sm text-gray-900">
                      {new Date(request.sessionDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Duration</p>
                    <p className="text-sm text-gray-900">{DURATION_LABELS[request.duration]}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Location</p>
                    <p className="text-sm text-gray-900">{request.location}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Globe className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Session Mode</p>
                    <p className="text-sm text-gray-900">{SESSION_MODE_LABELS[request.sessionMode]}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Audience Size</p>
                    <p className="text-sm text-gray-900">{request.audienceSize} people</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Audience Types</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {request.audienceTypes.map((type) => (
                        <Badge key={type} variant="outline" className="text-xs">
                          {AUDIENCE_TYPE_LABELS[type]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Special Requirements */}
            {request.specialRequirements && (
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Special Requirements</p>
                  <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{request.specialRequirements}</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Building className="h-4 w-4" />
              Contact Information
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Email</p>
                  <p className="text-sm text-gray-900">{request.contactEmail}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Phone</p>
                  <p className="text-sm text-gray-900">{request.contactPhone}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Expert */}
          {expert && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Assigned Expert
                </h4>
                
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {expert.firstName} {expert.lastName}
                      </p>
                      <p className="text-sm text-gray-600">{expert.email}</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Notes and History */}
          {(request.adminNotes || request.expertNotes || request.rejectionReason) && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes & Comments
                </h4>
                
                <div className="space-y-3">
                  {request.adminNotes && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm font-medium text-blue-800 mb-1">Admin Notes</p>
                      <p className="text-sm text-blue-700 whitespace-pre-wrap">{request.adminNotes}</p>
                    </div>
                  )}

                  {request.expertNotes && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm font-medium text-green-800 mb-1">Expert Notes</p>
                      <p className="text-sm text-green-700 whitespace-pre-wrap">{request.expertNotes}</p>
                    </div>
                  )}

                  {request.rejectionReason && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm font-medium text-red-800 mb-1">Rejection Reason</p>
                      <p className="text-sm text-red-700 whitespace-pre-wrap">{request.rejectionReason}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Timestamps */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Timeline
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-700">Created</p>
                <p className="text-gray-600">
                  {new Date(request.createdAt).toLocaleDateString()} at{' '}
                  {new Date(request.createdAt).toLocaleTimeString()}
                </p>
              </div>

              {request.reviewedAt && (
                <div>
                  <p className="font-medium text-gray-700">Reviewed</p>
                  <p className="text-gray-600">
                    {new Date(request.reviewedAt).toLocaleDateString()} at{' '}
                    {new Date(request.reviewedAt).toLocaleTimeString()}
                  </p>
                </div>
              )}

              {request.confirmedAt && (
                <div>
                  <p className="font-medium text-gray-700">Confirmed</p>
                  <p className="text-gray-600">
                    {new Date(request.confirmedAt).toLocaleDateString()} at{' '}
                    {new Date(request.confirmedAt).toLocaleTimeString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}