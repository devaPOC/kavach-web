'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExpertProfileWizard, CustomerProfileWizard } from '@/components/custom/profile';
import { Navbar } from '@/components/custom/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import { Loader2 } from 'lucide-react';

export default function CompleteProfilePage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<'customer' | 'expert' | null>(null);
  const [userData, setUserData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    role: 'customer' | 'expert' | 'trainer' | 'admin';
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get current user info to determine which wizard to show
    const getCurrentUser = async () => {
      try {
        console.log('Attempting to fetch user data...');
        const response = await apiClient.auth.me();
        console.log('API Response:', response);

        if (response.success && response.data) {
          const userInfo = response.data;
          console.log('User data:', userInfo);
          const role = userInfo.role as 'customer' | 'expert';

          // Check if profile is already completed
          if (userInfo.isProfileCompleted) {
            // Redirect to appropriate dashboard based on role and approval status
            if (userInfo.role === 'expert' && userInfo.isApproved) {
              router.push('/expert/dashboard');
            } else if (userInfo.role === 'expert' && !userInfo.isApproved) {
              router.push('/pending-approval');
            } else if (userInfo.role === 'admin') {
              router.push('/admin/dashboard');
            } else {
              router.push('/dashboard');
            }
            return;
          }

          setUserRole(role);
          setUserData({
            firstName: userInfo.firstName,
            lastName: userInfo.lastName,
            email: userInfo.email,
            role: userInfo.role
          });
        } else {
          console.error('Failed to get user data:', response);
          // If we can't get user info, redirect to login
          router.push('/login');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    getCurrentUser();
  }, [router]);

  const handleComplete = () => {
    // For experts, redirect to pending approval page
    // For customers, redirect to dashboard
    if (userRole === 'expert') {
      router.push('/pending-approval');
    } else {
      router.push('/dashboard');
    }
  };



  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userRole || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>
              Unable to determine user role. Please try logging in again.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/50">
      <Navbar
        user={userData}
        showProfileMenu={false}
      />
      <div className="py-8">
        {userRole === 'expert' ? (
          <ExpertProfileWizard
            onComplete={handleComplete}
          />
        ) : (
          <CustomerProfileWizard
            onComplete={handleComplete}
          />
        )}
      </div>
    </div>
  );
}
