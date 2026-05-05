'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

export default function PendingApprovalPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    checkApprovalStatus();
  }, []);

  const checkApprovalStatus = async () => {
    try {
      const response = await apiClient.auth.me();
      if (response.success && response.data) {
        const user = response.data;

        if (user.role !== 'expert') {
          // Non-experts shouldn't be here
          router.push('/dashboard');
          return;
        }

        if (!user.isProfileCompleted) {
          // Profile not completed, redirect to completion
          router.push('/complete-profile');
          return;
        }

        if (user.isApproved) {
          setApprovalStatus('approved');
          console.log('Expert is approved, redirecting to expert dashboard immediately...');
          // Redirect immediately to expert dashboard
          router.push('/expert/dashboard');
          return;
        } else {
          setApprovalStatus('pending');
          console.log('Expert is still pending approval');
        }
      } else {
        router.push('/login');
      }
    } catch (error) {
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    checkApprovalStatus().finally(() => setIsRefreshing(false));
  };

  const handleLogout = async () => {
    setIsNavigating(true);
    try {
      await apiClient.auth.logout();
      router.push('/login');
    } catch (error) {
      // Even if logout fails, redirect to login
      router.push('/login');
    }
  };

  const handleDashboardNavigation = async () => {
    setIsNavigating(true);
    try {
      await apiClient.auth.logout();
      router.push('/login');
    } catch (error) {
      // Even if logout fails, redirect to login
      router.push('/login');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Checking approval status...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {approvalStatus === 'approved' ? (
              <CheckCircle className="h-12 w-12 text-green-500" />
            ) : approvalStatus === 'rejected' ? (
              <XCircle className="h-12 w-12 text-red-500" />
            ) : (
              <Clock className="h-12 w-12 text-yellow-500" />
            )}
          </div>
          <CardTitle>
            {approvalStatus === 'approved' ? 'Profile Approved!' :
              approvalStatus === 'rejected' ? 'Profile Rejected' :
                'Pending Approval'}
          </CardTitle>
          <CardDescription>
            {approvalStatus === 'approved' ?
              'Your expert profile has been approved. Redirecting to dashboard...' :
              approvalStatus === 'rejected' ?
                'Your expert profile was not approved. Please contact support for more information.' :
                'Your expert profile is under review by our admin team.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {approvalStatus === 'pending' && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                We're reviewing your qualifications and experience. This process typically takes 1-2 business days.
                You'll receive an email notification once your profile is approved.
              </AlertDescription>
            </Alert>
          )}

          {approvalStatus === 'rejected' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                Your profile did not meet our current requirements. Please contact our support team at support@kavach.com for more details.
              </AlertDescription>
            </Alert>
          )}

          {approvalStatus === 'approved' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Congratulations! You can now start offering your services to customers on our platform.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex space-x-2">
            {approvalStatus === 'pending' && (
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="flex-1"
                disabled={isRefreshing || isNavigating}
              >
                {isRefreshing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Status
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={approvalStatus === 'approved' ? handleDashboardNavigation : handleLogout}
              className="flex-1"
              disabled={isRefreshing || isNavigating}
            >
              {isNavigating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Logging out...
                </>
              ) : (
                'Logout'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
