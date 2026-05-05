'use client';

import React, { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthScreen from '@/components/custom/auth/AuthScreen';
import { LoginForm } from '@/components/custom/auth';
import { type LoginFormData } from '@/lib/validation';
import { authApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui';
import { ClientOnly } from '@/components/ClientOnly';
import { type ApiErrorResponse } from '@/lib/errors/response-utils';

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize with customer as default to prevent hydration mismatch
  const [activeTab, setActiveTab] = useState<'customer' | 'expert'>('customer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | ApiErrorResponse>('');
  const [isClient, setIsClient] = useState(false);

  // Set client-side flag and update tab from URL params after hydration
  useEffect(() => {
    setIsClient(true);
    const roleParam = searchParams.get('role');
    if (roleParam === 'expert') {
      setActiveTab('expert');
    }
  }, [searchParams]);

  // Cleanup loading state on component unmount
  useEffect(() => {
    return () => {
      setLoading(false);
    };
  }, []);

  const handleTabChange = (tabId: string) => {
    const newTab = tabId as 'customer' | 'expert';
    setActiveTab(newTab);
    setError(''); // Clear any existing errors when switching tabs

    // Only update URL on client side to prevent hydration issues
    if (isClient && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('role', newTab);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleLogin = async (formData: LoginFormData) => {
    console.log('handleLogin started', { formData: { email: formData.email, role: formData.role } });
    setLoading(true);
    setError('');

    try {
      // Use the new V1 API client
      console.log('Calling authApi.login...');
      const result = await authApi.login({
        email: formData.email,
        password: formData.password,
        role: formData.role as 'customer' | 'expert'
      });

      console.log('authApi.login result:', { success: result.success, errorCode: result.errorCode, error: result.error });

      if (!result.success) {
        // Check for specific error codes that require special handling
        if (result.errorCode === 'ACCOUNT_BANNED') {
          // Redirect to account restricted page for banned experts
          try {
            router.push('/account-restricted?type=banned&role=expert');
          } catch (navError) {
            console.error('Navigation error:', navError);
          }
          setLoading(false);
          return;
        }

        if (result.errorCode === 'ACCOUNT_PAUSED') {
          // Redirect to account restricted page for paused customers
          try {
            router.push('/account-restricted?type=paused&role=customer');
          } catch (navError) {
            console.error('Navigation error:', navError);
          }
          setLoading(false);
          return;
        }

        if (result.errorCode === 'ACCOUNT_LOCKED') {
          // Handle account locked error with specific messaging
          setError({
            success: false,
            error: result.error || 'Your account has been locked for security reasons. Please contact an administrator to unlock your account.',
            code: result.errorCode,
            timestamp: new Date().toISOString(),
            requestId: 'unknown',
            details: { ...result, isAccountLocked: true }
          } as ApiErrorResponse);
          setLoading(false);
          return;
        }

        // Convert API response to error format for better error handling
        setError({
          success: false,
          error: result.error || 'Login failed',
          code: result.errorCode || 'UNKNOWN_ERROR',
          timestamp: new Date().toISOString(),
          requestId: 'unknown',
          details: result
        } as ApiErrorResponse);
        setLoading(false); // Reset loading state for errors that don't redirect
        return;
      }

      // Check email verification status and redirect accordingly
      if (!result.data?.user?.isEmailVerified) {
        // Redirect to email verification page with user's email
        try {
          router.push(`/verify-email?email=${encodeURIComponent(result.data?.user?.email || formData.email)}`);
          // Don't set loading to false here as we're redirecting
        } catch (navError) {
          console.error('Navigation error to verify-email:', navError);
          setLoading(false);
        }
        return;
      }

      // Successful login with verified email - redirect based on user role
      try {
        // Trainers and experts go to expert dashboard
        if (result.data?.user?.role === 'expert' || result.data?.user?.role === 'trainer') {
          router.push('/expert/dashboard');
        } else if (result.data?.user?.role === 'admin') {
          router.push('/admin/dashboard');
        } else {
          router.push('/dashboard');
        }
        // Don't set loading to false here as we're redirecting
      } catch (navError) {
        console.error('Navigation error on successful login:', navError);
        setLoading(false);
      }

    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLoading(false); // Reset loading state for caught errors
    }
  };

  const handleSignupNavigation = () => {
    // Preserve role context when navigating to signup
    router.push(`/signup?role=${activeTab}`);
  };

  return (
    <AuthScreen
      role={activeTab}
      title="Sign in"
      subtitle="Access your Kavach account and continue your journey."
      footer={
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="text-muted-foreground/80">Don&apos;t have an account?</span>
          <button
            type="button"
            className="font-semibold text-white hover:text-primary underline-offset-4"
            onClick={handleSignupNavigation}
          >
            Create one
          </button>
        </div>
      }
    >
      <Card className="border border-white/40 bg-card/95 shadow-2xl backdrop-blur-lg">
        <CardContent className="space-y-6 p-6 md:p-8">
          <div className="space-y-1 text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">Welcome back</p>
            <h2 className="text-2xl font-semibold text-foreground">Choose your experience</h2>
            <p className="text-sm text-muted-foreground hidden">Switch between customer and expert before signing in.</p>
          </div>

          <ClientOnly fallback={
            <div className="w-full">
              <div className="grid w-full grid-cols-2 rounded-xl bg-muted p-1">
                <div className="rounded-lg bg-card py-2 text-center text-sm font-semibold text-foreground/80 shadow">Customer</div>
                <div className="py-2 text-center text-sm font-semibold text-muted-foreground">Expert</div>
              </div>
            </div>
          }>
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted p-1">
                <TabsTrigger
                  value="customer"
                  className="rounded-lg data-[state=active]:bg-secondary data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  Customer
                </TabsTrigger>
                <TabsTrigger
                  value="expert"
                  className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  Expert
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </ClientOnly>

          <LoginForm
            role={activeTab}
            onSubmit={handleLogin}
            loading={loading}
            error={error}
          />
        </CardContent>
      </Card>
    </AuthScreen>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-6">
            Loading...
          </CardContent>
        </Card>
      </div>
    }>
      <LoginPageInner />
    </Suspense>
  );
}
