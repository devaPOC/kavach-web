'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input, Button } from '@/components/ui';
import { Card, CardContent } from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui';

import { authApi } from '@/lib/api/client';
import AuthScreen from '@/components/custom/auth/AuthScreen';

function VerifyEmailPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if this is a magic link verification
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');
  const isMagicLink = !!token;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [email, setEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);

  // Auto-verify magic link on component mount
  useEffect(() => {
    if (isMagicLink && token) {
      verifyToken(token);
    }
  }, [isMagicLink, token]);

  // Set email from URL parameter if provided
  useEffect(() => {
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
      setShowEmailInput(true); // Show email input when email is provided from signup
    }
  }, [emailParam]);

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const verifyToken = async (verificationToken: string) => {
    setLoading(true);
    setError('');

    try {
      // Use the new V1 API client
      const result = await authApi.verifyEmail(verificationToken);

      if (!result.success) {
        throw new Error(result.error || 'Verification failed');
      }

      setSuccess(true);

      // Redirect to dashboard after a brief delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };



  const handleResendVerification = async () => {
    if (!email.trim()) {
      setShowEmailInput(true);
      setError('Please enter your email address to resend verification');
      return;
    }

    setResendLoading(true);
    setError('');

    try {
      // Use the new V1 API client
      const result = await authApi.resendVerification(email);

      if (!result.success) {
        throw new Error(result.error || 'Failed to resend verification');
      }

      setResendCooldown(60); // 60 second cooldown
      setError('');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend verification');
    } finally {
      setResendLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <AuthScreen
        title="Email verified"
        subtitle="Your account is ready. We’re redirecting you to your dashboard."
      >
        <Card className="mx-auto w-full max-w-xl border border-white/40 bg-card/95 shadow-2xl backdrop-blur-lg">
          <CardContent className="space-y-6 p-6 md:p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary/10">
              <svg className="h-7 w-7 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-muted-foreground">If you are not redirected automatically, continue to your dashboard.</p>
            <Button
              onClick={() => router.push('/')}
              className="w-full"
            >
              Go to dashboard
            </Button>
          </CardContent>
        </Card>
      </AuthScreen>
    );
  }

  // Magic link verification in progress
  if (isMagicLink && loading) {
    return (
      <AuthScreen title="Verifying your email" subtitle="Please wait while we confirm your account.">
        <Card className="mx-auto w-full max-w-xl border border-white/40 bg-card/95 shadow-2xl backdrop-blur-lg">
          <CardContent className="flex flex-col items-center justify-center gap-4 p-6 text-foreground/80">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary/50" />
            <p className="text-center text-muted-foreground">Verifying your email address...</p>
          </CardContent>
        </Card>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Verify your email"
      subtitle={isMagicLink
        ? "We're verifying your email address..."
        : emailParam
          ? "We've sent a verification email to your inbox."
          : 'Please check your email for a verification link'}
      footer={
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="text-muted-foreground/80">Need to log in?</span>
          <button
            type="button"
            className="font-semibold text-white hover:text-primary underline-offset-4"
            onClick={() => router.push('/')}
          >
            Back to login
          </button>
        </div>
      }
    >
      <Card className="mx-auto w-full max-w-xl border border-white/40 bg-card/95 shadow-2xl backdrop-blur-lg">
        <CardContent className="space-y-6 p-6 md:p-8">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!isMagicLink && (
            <Alert>
              <AlertDescription>
                {emailParam
                  ? `A verification email has been sent to ${decodeURIComponent(emailParam)}. Please check your inbox and click the verification link.`
                  : 'Please check your email and click the verification link to activate your account.'}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {showEmailInput && (
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                  Email address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
            )}

            <Button
              variant="outline"
              onClick={handleResendVerification}
              disabled={resendLoading || resendCooldown > 0}
              className="w-full"
            >
              {resendLoading
                ? 'Sending...'
                : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : 'Resend verification link'}
            </Button>

            <Button
              variant="ghost"
              onClick={() => router.push('/')}
              className="w-full"
            >
              Back to login
            </Button>
          </div>
        </CardContent>
      </Card>
    </AuthScreen>
  );
}

export default function VerifyEmailPage() {
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
      <VerifyEmailPageInner />
    </Suspense>
  );
}
