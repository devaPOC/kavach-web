'use client';

import React, { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthScreen from '@/components/custom/auth/AuthScreen';
import { SignupWizard } from '@/components/custom/auth';
import { type SignupData } from '@/lib/validation/schemas';
import { authApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui';
import { ClientOnly } from '@/components/ClientOnly';
import { type ApiErrorResponse } from '@/lib/errors/response-utils';

function SignupPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize with customer as default to prevent hydration mismatch
  const [role, setRole] = useState<'customer' | 'expert'>('customer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | ApiErrorResponse>('');
  const [isClient, setIsClient] = useState(false);

  // Update role from URL params after hydration
  useEffect(() => {
    setIsClient(true);
    const roleParam = searchParams.get('role');
    if (roleParam === 'expert') {
      setRole('expert');
    }
  }, [searchParams]);

  const handleTabChange = (tabId: string) => {
    const newRole = tabId as 'customer' | 'expert';
    setRole(newRole);
    setError('');

    // Keep URL in sync without causing hydration issues
    if (isClient && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('role', newRole);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleSignup = async (formData: SignupData, legalAgreements?: Record<string, boolean>) => {
    setLoading(true);
    setError('');


    try {
      // Use the new V1 API client with enhanced error handling
      const result = await authApi.signup({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        password: formData.password,
        role: formData.role as 'customer' | 'expert',
        agreedToTerms: true, // Set to true since legal agreements handle this
        // Include legal agreements for both experts and customers
        ...(legalAgreements && { legalAgreements })
      });

      if (!result.success) {
        // Enhanced error handling with proper API response format
        const apiError: ApiErrorResponse = {
          success: false,
          error: result.error || 'Signup failed',
          code: result.errorCode || 'UNKNOWN_ERROR',
          timestamp: new Date().toISOString(),
          requestId: 'unknown',
          details: {
            ...result,
            // Preserve validation errors for field-specific error display
            validationErrors: (result as any).details?.validationErrors || []
          }
        };

        setError(apiError);
        return;
      }

      // Redirect to verify-email page instead of showing completion screen
      router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`);

    } catch (err) {
      console.error('Signup error:', err);

      // Handle network errors and unexpected errors
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError({
        success: false,
        error: errorMessage,
        code: 'NETWORK_ERROR',
        timestamp: new Date().toISOString(),
        requestId: 'unknown'
      } as ApiErrorResponse);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.push(`/login?role=${role}`);
  };



  const getRoleDisplayName = (role: string) => {
    return role === 'customer' ? 'Customer' : 'Expert';
  };

  return (
    <AuthScreen
      role={role}
      title="Join Kavach"
      subtitle="Create your account to access tailored experiences across customer and expert journeys."
      pill={`Join as ${getRoleDisplayName(role)}`}
      footer={
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="text-slate-200">Already have an account?</span>
          <button
            type="button"
            className="font-semibold text-white hover:text-indigo-200 underline-offset-4"
            onClick={handleBackToLogin}
          >
            Login
          </button>
        </div>
      }
    >
      <Card className="border border-white/40 bg-white/95 shadow-2xl backdrop-blur-lg">
        <CardContent className="space-y-6 p-6 md:p-8">
          <div className="space-y-1 text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-600">Choose your path</p>
            <h2 className="text-2xl font-semibold text-slate-900">I want to join as a {getRoleDisplayName(role)}</h2>
          </div>

          <ClientOnly fallback={
            <div className="w-full">
              <div className="grid w-full grid-cols-2 rounded-xl bg-slate-100 p-1">
                <div className="rounded-lg bg-white py-2 text-center text-sm font-semibold text-slate-700 shadow">Customer</div>
                <div className="py-2 text-center text-sm font-semibold text-slate-500">Expert</div>
              </div>
            </div>
          }>
            <Tabs value={role} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-xl bg-slate-100 p-1">
                <TabsTrigger
                  value="customer"
                  className="rounded-lg data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  Customer
                </TabsTrigger>
                <TabsTrigger
                  value="expert"
                  className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  Expert
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </ClientOnly>

          <SignupWizard
            role={role}
            onSubmit={handleSignup}
            loading={loading}
            error={error}
          />
        </CardContent>
      </Card>
    </AuthScreen>
  );
}

export default function SignupPage() {
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
      <SignupPageInner />
    </Suspense>
  );
}
