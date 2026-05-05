'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authApi, profileApi, usersApi } from '@/lib/api'
import { assessPasswordStrength, PasswordStrength, validateField } from '@/lib/validation/utils'
import { passwordSchema } from '@/lib/validation/schemas'
import { Navbar } from '@/components/custom/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { Alert, AlertDescription } from '@/components/ui'
import { User, Mail, Calendar, Shield, ArrowRight, Clock, CheckCircle, Briefcase, Phone, MapPin, Globe, Loader2, Key, Eye, EyeOff } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profileData, setProfileData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: ''
  })
  const [isDashboardLoading, setIsDashboardLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Password change states
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordChangeData, setPasswordChangeData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [passwordChangeError, setPasswordChangeError] = useState('')
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState('')

  useEffect(() => {
    let cancelled = false
    const fetchUserAndProfile = async () => {
      try {
        // Fetch basic user data
        const userResult = await authApi.me()
        if (!cancelled) {
          if (userResult.success && userResult.data) {
            setUser(userResult.data)
            setFormData({
              firstName: userResult.data.firstName,
              lastName: userResult.data.lastName,
              email: userResult.data.email
            })

            // Fetch detailed profile data
            try {
              const profileResult = await profileApi.getProfile()
              if (profileResult.success && profileResult.data) {
                setProfileData(profileResult.data)
              }
            } catch (profileError) {
              console.warn('Profile data not available:', profileError)
              // This is okay - user might not have completed their profile yet
            }
          } else {
            setError('Failed to fetch user data')
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          console.error('Error fetching user:', e)
          setError(e.message || 'Failed to load user data')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchUserAndProfile()
    return () => { cancelled = true }
  }, [])

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-destructive/10 text-destructive'
      case 'expert': return 'bg-primary/10 text-primary'
      case 'customer': return 'bg-secondary/10 text-secondary'
      default: return 'bg-muted text-foreground'
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordChangeError('')
    setPasswordChangeSuccess('')

    // Validate form
    if (!passwordChangeData.currentPassword || !passwordChangeData.newPassword || !passwordChangeData.confirmPassword) {
      setPasswordChangeError('All fields are required')
      return
    }

    if (passwordChangeData.newPassword !== passwordChangeData.confirmPassword) {
      setPasswordChangeError('New passwords do not match')
      return
    }

    // Use the password schema for validation
    const passwordValidationError = validateField(passwordSchema, passwordChangeData.newPassword)
    if (passwordValidationError) {
      setPasswordChangeError(passwordValidationError)
      return
    }

    if (passwordChangeData.currentPassword === passwordChangeData.newPassword) {
      setPasswordChangeError('New password must be different from current password')
      return
    }

    setIsChangingPassword(true)

    try {
      const result = await usersApi.changePassword({
        currentPassword: passwordChangeData.currentPassword,
        newPassword: passwordChangeData.newPassword
      })

      if (result.success) {
        setPasswordChangeSuccess('Password changed successfully')
        setPasswordChangeData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      } else {
        setPasswordChangeError(result.error || 'Failed to change password')
      }
    } catch (error) {
      console.error('Password change error:', error)
      setPasswordChangeError('An error occurred while changing password')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/50">
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="flex items-center justify-center p-6">
              <p>Loading profile...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-muted/50">
        <div className="container mx-auto p-6">
          <Alert variant="destructive">
            <AlertDescription>{error || 'Failed to load user data'}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/50">
      <Navbar
        user={user}
        showProfileMenu={false}
      />

      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Profile Settings</h1>
          <p className="text-muted-foreground">
            Manage your account information and preferences
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </div>
                <div className="flex gap-2">
                  {!isEditing ? (
                    <Button
                      onClick={() => setIsEditing(true)}
                      size="sm"
                      disabled={isSaving}
                    >
                      Edit Profile
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={async () => {
                          setIsSaving(true)
                          setError('')
                          try {
                            // Update user profile
                            const updateResult = await usersApi.updateProfile({
                              firstName: formData.firstName,
                              lastName: formData.lastName
                            })

                            if (updateResult.success) {
                              // Update local user state
                              setUser((prev: any) => prev ? {
                                ...prev,
                                firstName: formData.firstName,
                                lastName: formData.lastName
                              } : null)
                              setIsEditing(false)
                            } else {
                              setError(updateResult.error || 'Failed to update profile')
                            }
                          } catch (err: any) {
                            setError(err.message || 'Failed to update profile')
                          } finally {
                            setIsSaving(false)
                          }
                        }}
                        size="sm"
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditing(false)
                          setError('')
                          setFormData({
                            firstName: user.firstName,
                            lastName: user.lastName,
                            email: user.email
                          })
                        }}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {user.firstName} {user.lastName}
                  </h3>
                  <p className="text-muted-foreground">{user.email}</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getRoleColor(user.role)}`}>
                    {user.role}
                  </span>
                </div>
              </div>

              <div className="grid gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    disabled={!isEditing || isSaving}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    disabled={!isEditing || isSaving}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={formData.email}
                    disabled={true}
                    className="bg-muted/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Email cannot be changed
                  </p>
                </div>
              </div>


            </CardContent>
          </Card>

          {/* Account Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Account Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email Verification</p>
                    <p className="text-sm text-muted-foreground">
                      {user.isEmailVerified ? (
                        <span className="text-secondary">✓ Verified</span>
                      ) : (
                        <span className="text-accent">⚠ Pending verification</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Member Since</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Account Status</p>
                    <p className="text-sm text-muted-foreground">
                      {user.role === 'expert' && user.isBanned ? (
                        <span className="text-destructive">Banned</span>
                      ) : user.role === 'customer' && user.isPaused ? (
                        <span className="text-accent">Paused</span>
                      ) : (
                        <span className="text-secondary">Active</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Role-specific Profile Information */}
        {profileData && (
          <div className="mt-8">
            {user.role === 'expert' && profileData.profile && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Expert Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h4 className="font-medium text-foreground mb-3">Personal Information</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      {profileData.profile.phoneNumber && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Phone</p>
                            <p className="text-sm text-muted-foreground">{profileData.profile.phoneNumber}</p>
                          </div>
                        </div>
                      )}

                      {profileData.profile.dateOfBirth && (
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Date of Birth</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(profileData.profile.dateOfBirth).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      )}

                      {profileData.profile.nationality && (
                        <div className="flex items-center gap-3">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Nationality</p>
                            <p className="text-sm text-muted-foreground">{profileData.profile.nationality}</p>
                          </div>
                        </div>
                      )}

                      {(profileData.profile.governorate || profileData.profile.wilayat) && (
                        <div className="flex items-center gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Location</p>
                            <p className="text-sm text-muted-foreground">
                              {[profileData.profile.wilayat, profileData.profile.governorate].filter(Boolean).join(', ')}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Professional Information */}
                  <div>
                    <h4 className="font-medium text-foreground mb-3">Professional Information</h4>
                    <div className="space-y-4">
                      {profileData.profile.areasOfSpecialization && (
                        <div>
                          <p className="text-sm font-medium text-foreground/80">Areas of Specialization</p>
                          <p className="text-sm text-muted-foreground mt-1">{profileData.profile.areasOfSpecialization}</p>
                        </div>
                      )}

                      {profileData.profile.professionalExperience && (
                        <div>
                          <p className="text-sm font-medium text-foreground/80">Professional Experience</p>
                          <p className="text-sm text-muted-foreground mt-1">{profileData.profile.professionalExperience}</p>
                        </div>
                      )}

                      {profileData.profile.currentEmploymentStatus && (
                        <div>
                          <p className="text-sm font-medium text-foreground/80">Employment Status</p>
                          <p className="text-sm text-muted-foreground mt-1 capitalize">
                            {profileData.profile.currentEmploymentStatus?.replace('-', ' ') || ''}
                          </p>
                        </div>
                      )}

                      {profileData.profile.currentEmployer && (
                        <div>
                          <p className="text-sm font-medium text-foreground/80">Current Employer</p>
                          <p className="text-sm text-muted-foreground mt-1">{profileData.profile.currentEmployer}</p>
                        </div>
                      )}

                      {profileData.profile.availability && (
                        <div>
                          <p className="text-sm font-medium text-foreground/80">Availability</p>
                          <p className="text-sm text-muted-foreground mt-1 capitalize">
                            {profileData.profile.availability?.replace('-', ' ') || ''}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {user.role === 'customer' && profileData.profile && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Customer Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {profileData.profile.phoneNumber && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Phone</p>
                          <p className="text-sm text-muted-foreground">{profileData.profile.phoneNumber}</p>
                        </div>
                      </div>
                    )}

                    {profileData.profile.dateOfBirth && (
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Date of Birth</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(profileData.profile.dateOfBirth).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {profileData.profile.nationality && (
                      <div className="flex items-center gap-3">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Nationality</p>
                          <p className="text-sm text-muted-foreground">{profileData.profile.nationality}</p>
                        </div>
                      </div>
                    )}

                    {(profileData.profile.governorate || profileData.profile.wilayat) && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Location</p>
                          <p className="text-sm text-muted-foreground">
                            {[profileData.profile.wilayat, profileData.profile.governorate].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {!profileData.profile && (
              <Card>
                <CardContent className="flex items-center justify-center p-6">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">
                      {user.role === 'expert' ? 'Expert profile not completed' : 'Customer profile not completed'}
                    </p>
                    <Button
                      onClick={() => router.push('/complete-profile')}
                      className="flex items-center gap-2"
                    >
                      <ArrowRight className="h-4 w-4" />
                      Complete Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Security Section */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-foreground mb-4">Change Password</h4>

                  {passwordChangeError && (
                    <Alert className="mb-4 border-destructive bg-destructive/10">
                      <AlertDescription className="text-destructive">
                        {passwordChangeError}
                      </AlertDescription>
                    </Alert>
                  )}

                  {passwordChangeSuccess && (
                    <Alert className="mb-4 border-secondary/50 bg-secondary/10">
                      <AlertDescription className="text-secondary">
                        {passwordChangeSuccess}
                      </AlertDescription>
                    </Alert>
                  )}

                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showPasswords.current ? 'text' : 'password'}
                          value={passwordChangeData.currentPassword}
                          onChange={(e) => setPasswordChangeData(prev => ({
                            ...prev,
                            currentPassword: e.target.value
                          }))}
                          className="pr-10"
                          disabled={isChangingPassword}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('current')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/80"
                          disabled={isChangingPassword}
                        >
                          {showPasswords.current ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showPasswords.new ? 'text' : 'password'}
                          value={passwordChangeData.newPassword}
                          onChange={(e) => setPasswordChangeData(prev => ({
                            ...prev,
                            newPassword: e.target.value
                          }))}
                          className="pr-10"
                          disabled={isChangingPassword}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('new')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/80"
                          disabled={isChangingPassword}
                        >
                          {showPasswords.new ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Must be at least 8 characters with uppercase, lowercase, number, and special character
                      </p>
                      {passwordChangeData.newPassword && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Password strength:</span>
                            <span className={`text-sm font-medium ${assessPasswordStrength(passwordChangeData.newPassword) === PasswordStrength.WEAK ? 'text-destructive' :
                              assessPasswordStrength(passwordChangeData.newPassword) === PasswordStrength.FAIR ? 'text-accent' :
                                assessPasswordStrength(passwordChangeData.newPassword) === PasswordStrength.GOOD ? 'text-primary' :
                                  'text-secondary'
                              }`}>
                              {assessPasswordStrength(passwordChangeData.newPassword).charAt(0).toUpperCase() +
                                assessPasswordStrength(passwordChangeData.newPassword).slice(1)}
                            </span>
                          </div>
                          <div className="w-full bg-muted/80 rounded-full h-2 mt-1">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${assessPasswordStrength(passwordChangeData.newPassword) === PasswordStrength.WEAK ? 'bg-destructive w-1/4' :
                                assessPasswordStrength(passwordChangeData.newPassword) === PasswordStrength.FAIR ? 'bg-accent w-2/4' :
                                  assessPasswordStrength(passwordChangeData.newPassword) === PasswordStrength.GOOD ? 'bg-primary w-3/4' :
                                    'bg-secondary w-full'
                                }`}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={passwordChangeData.confirmPassword}
                          onChange={(e) => setPasswordChangeData(prev => ({
                            ...prev,
                            confirmPassword: e.target.value
                          }))}
                          className="pr-10"
                          disabled={isChangingPassword}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('confirm')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/80"
                          disabled={isChangingPassword}
                        >
                          {showPasswords.confirm ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isChangingPassword}
                      className="flex items-center gap-2"
                    >
                      {isChangingPassword ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Key className="h-4 w-4" />
                      )}
                      {isChangingPassword ? 'Changing Password...' : 'Change Password'}
                    </Button>
                  </form>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Options */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4">
                {user.role === 'customer' && (
                  <Button
                    onClick={() => {
                      setIsDashboardLoading(true)
                      router.push('/dashboard')
                    }}
                    disabled={isDashboardLoading}
                    className="flex items-center gap-2"
                  >
                    {isDashboardLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    {isDashboardLoading ? 'Loading...' : 'Go to Dashboard'}
                  </Button>
                )}

                {user.role === 'expert' && (
                  <>
                    {user.isApproved ? (
                      <Button
                        onClick={() => {
                          setIsDashboardLoading(true)
                          router.push('/dashboard')
                        }}
                        disabled={isDashboardLoading}
                        className="flex items-center gap-2"
                      >
                        {isDashboardLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        {isDashboardLoading ? 'Loading...' : 'Go to Dashboard'}
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => router.push('/pending-approval')}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <Clock className="h-4 w-4" />
                          Check Approval Status
                        </Button>
                        <Alert className="sm:max-w-md">
                          <Clock className="h-4 w-4" />
                          <AlertDescription>
                            Your expert profile is pending admin approval. You'll be able to access the dashboard once approved.
                          </AlertDescription>
                        </Alert>
                      </>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
