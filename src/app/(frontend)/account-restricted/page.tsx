'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Ban, Pause, Mail, Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api';

interface RestrictionInfo {
  type: 'banned' | 'paused';
  role: 'expert' | 'customer';
  message: string;
  icon: React.ReactNode;
  contactMessage: string;
}

function AccountRestrictedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [restriction, setRestriction] = useState<RestrictionInfo | null>(null);

  useEffect(() => {
    const type = searchParams.get('type') as 'banned' | 'paused';
    const role = searchParams.get('role') as 'expert' | 'customer';

    if (type && role) {
      let restrictionInfo: RestrictionInfo;

      if (type === 'banned' && role === 'expert') {
        restrictionInfo = {
          type: 'banned',
          role: 'expert',
          message: 'Your expert account has been banned',
          icon: <Ban className="w-16 h-16 text-red-500" />,
          contactMessage: 'Your expert account has been suspended due to policy violations. Please contact our support team to appeal this decision or get more information about the ban.'
        };
      } else if (type === 'paused' && role === 'customer') {
        restrictionInfo = {
          type: 'paused',
          role: 'customer',
          message: 'Your customer account has been paused',
          icon: <Pause className="w-16 h-16 text-orange-500" />,
          contactMessage: 'Your customer account has been temporarily paused. This may be due to payment issues, account verification requirements, or policy violations. Please contact support for assistance.'
        };
      } else {
        // Fallback for any other combinations
        restrictionInfo = {
          type: type || 'banned',
          role: role || 'customer',
          message: 'Your account has been restricted',
          icon: <AlertTriangle className="w-16 h-16 text-yellow-500" />,
          contactMessage: 'Your account has been restricted. Please contact our support team for assistance.'
        };
      }

      setRestriction(restrictionInfo);
    } else {
      // No restriction info provided, redirect to login
      router.push('/login');
    }
  }, [searchParams, router]);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await authApi.logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails, redirect to login
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleContactSupport = () => {
    // You can replace this with a proper support system
    window.open('mailto:support@kavach.com?subject=Account Restriction Appeal', '_blank');
  };

  if (!restriction) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-900">Kavach</h1>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={loading}
            className="text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Logging out...
              </>
            ) : (
              'Logout'
            )}
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              {restriction.icon}
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Account Restricted
            </CardTitle>
            <CardDescription className="text-lg">
              {restriction.message}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {restriction.contactMessage}
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleContactSupport}
                className="w-full"
                variant="default"
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Support
              </Button>

              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Logging out...
                  </>
                ) : (
                  'Logout'
                )}
              </Button>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                If you believe this is an error, please contact our support team with your account details.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AccountRestrictedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <AccountRestrictedContent />
    </Suspense>
  );
}
