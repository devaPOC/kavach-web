'use client'
import React, { useState, useEffect } from 'react'
import { adminApi } from '@/lib/api/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { UserResponse } from '@/types/user'
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Briefcase,
  GraduationCap,
  Clock,
  CreditCard,
  Building,
  Users,
  Shield
} from 'lucide-react'

interface UserProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserResponse | null
}

export default function UserProfileDialog({ open, onOpenChange, user }: UserProfileDialogProps) {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (open && user) {
      fetchUserProfile()
    }
  }, [open, user])

  const fetchUserProfile = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError('')
      const result = await adminApi.getUserProfile(user.id)

      if (result.success && result.data) {
        setProfile(result.data.profile)
      } else {
        setError(result.error || 'Failed to fetch user profile')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user profile')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not provided'
    return new Date(dateString).toLocaleDateString()
  }

  const formatGender = (gender: string | null) => {
    if (!gender) return 'Not provided'
    return gender.charAt(0).toUpperCase() + gender.slice(1).replace('-', ' ')
  }

  const formatEmploymentStatus = (status: string | null) => {
    if (!status) return 'Not provided'
    return status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')
  }

  const formatAvailability = (availability: string | null) => {
    if (!availability) return 'Not provided'
    return availability.charAt(0).toUpperCase() + availability.slice(1).replace('-', ' ')
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Profile: {user.firstName} {user.lastName}
          </DialogTitle>
          <DialogDescription>
            View detailed profile information for this user
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-6">
            {/* User Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Role</p>
                      <Badge className={
                        user.role === 'admin' ? 'bg-red-100 text-red-800' :
                        user.role === 'expert' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }>
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Joined</p>
                      <p className="text-sm text-gray-600">{formatDate(user.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <div className="flex gap-2">
                        <Badge variant={user.isEmailVerified ? 'default' : 'secondary'}>
                          {user.isEmailVerified ? 'Verified' : 'Unverified'}
                        </Badge>
                        {user.isBanned && <Badge variant="destructive">Banned</Badge>}
                        {user.isPaused && <Badge variant="outline">Paused</Badge>}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Information */}
            {profile && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h4 className="font-medium mb-3">Personal Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">Phone Number</p>
                          <p className="text-sm text-gray-600">{profile.phoneNumber || 'Not provided'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">Date of Birth</p>
                          <p className="text-sm text-gray-600">{formatDate(profile.dateOfBirth)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">Gender</p>
                          <p className="text-sm text-gray-600">{formatGender(profile.gender)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">Nationality</p>
                          <p className="text-sm text-gray-600">{profile.nationality || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Location Information */}
                  <div>
                    <h4 className="font-medium mb-3">Location Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">Country of Residence</p>
                          <p className="text-sm text-gray-600">{profile.countryOfResidence || 'Not provided'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">Governorate</p>
                          <p className="text-sm text-gray-600">{profile.governorate || 'Not provided'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">Wilayat</p>
                          <p className="text-sm text-gray-600">{profile.wilayat || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expert-specific information */}
                  {user.role === 'expert' && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-3">Professional Information</h4>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium mb-1">Areas of Specialization</p>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">
                              {profile.areasOfSpecialization || 'Not provided'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-1">Professional Experience</p>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">
                              {profile.professionalExperience || 'Not provided'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-1">Relevant Certifications</p>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">
                              {profile.relevantCertifications || 'Not provided'}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="text-sm font-medium">Employment Status</p>
                                <p className="text-sm text-gray-600">{formatEmploymentStatus(profile.currentEmploymentStatus)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="text-sm font-medium">Current Employer</p>
                                <p className="text-sm text-gray-600">{profile.currentEmployer || 'Not provided'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="text-sm font-medium">Availability</p>
                                <p className="text-sm text-gray-600">{formatAvailability(profile.availability)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="text-sm font-medium">Work Arrangement</p>
                                <p className="text-sm text-gray-600">{formatAvailability(profile.preferredWorkArrangement)}</p>
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-1">Preferred Payment Methods</p>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">
                              {profile.preferredPaymentMethods || 'Not provided'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {!profile && !loading && (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">No profile information available for this user.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}