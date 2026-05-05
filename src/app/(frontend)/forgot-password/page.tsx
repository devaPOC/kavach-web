'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input, Button } from '@/components/ui';
import { Card, CardContent } from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui';
import { authApi } from '@/lib/api/client';
import { z } from 'zod';
import AuthScreen from '@/components/custom/auth/AuthScreen';

const emailSchema = z.string().email('Please enter a valid email address');

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate email
      const validatedEmail = emailSchema.parse(email);

      const result = await authApi.forgotPassword(validatedEmail);

      if (!result.success) {
        throw new Error(result.error || 'Failed to send reset email');
      }

      setSuccess(true);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.issues[0].message);
      } else {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthScreen
        title="Check your email"
        subtitle="We've sent password reset instructions to your inbox."
      >
        <Card className="mx-auto w-full max-w-xl border border-white/40 bg-card/95 shadow-2xl backdrop-blur-lg">
          <CardContent className="space-y-6 p-6 md:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary/10">
              <svg className="h-7 w-7 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <Alert>
              <AlertDescription>
                <strong>Next Steps</strong>
                <br />
                1. Check your inbox (and spam folder).
                <br />
                2. Click the reset link in the email.
                <br />
                3. Create a new password within 1 hour.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button
                onClick={() => router.push('/login')}
                className="w-full"
              >
                Back to Login
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setSuccess(false);
                  setEmail('');
                }}
                className="w-full"
              >
                Send another reset email
              </Button>
            </div>
          </CardContent>
        </Card>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Forgot your password?"
      subtitle="Enter your email and we’ll send you a secure link to reset it."
      footer={
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="text-muted-foreground/80">Remembered it?</span>
          <button
            type="button"
            className="font-semibold text-white hover:text-primary underline-offset-4"
            onClick={() => router.push('/login')}
          >
            Back to login
          </button>
        </div>
      }
    >
      <Card className="mx-auto w-full max-w-xl border border-white/40 bg-card/95 shadow-2xl backdrop-blur-lg">
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@email.com"
                required
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div>
                  Sending reset link...
                </div>
              ) : (
                'Send reset link'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthScreen>
  );
}
