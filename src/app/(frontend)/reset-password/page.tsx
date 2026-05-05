'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input, Button } from '@/components/ui';
import { Card, CardContent } from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui';
import { authApi } from '@/lib/api/client';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import AuthScreen from '@/components/custom/auth/AuthScreen';

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number');

const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

function ResetPasswordPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) {
      router.push('/forgot-password');
    }
  }, [token, router]);

  const validateForm = () => {
    try {
      resetPasswordSchema.parse({ password, confirmPassword });
      setValidationErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        err.issues.forEach((error) => {
          if (error.path[0]) {
            errors[error.path[0] as string] = error.message;
          }
        });
        setValidationErrors(errors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !token) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await authApi.resetPassword(token, password);

      if (!result.success) {
        throw new Error(result.error || 'Failed to reset password');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthScreen title="Resetting password" subtitle="Please wait while we prepare your secure reset link.">
        <Card className="mx-auto w-full max-w-xl border border-white/40 bg-white/95 shadow-2xl backdrop-blur-lg">
          <CardContent className="flex items-center justify-center p-6 text-slate-700">
            Loading...
          </CardContent>
        </Card>
      </AuthScreen>
    );
  }

  if (success) {
    return (
      <AuthScreen
        title="Password reset successful"
        subtitle="Your password has been updated. You can now log in with your new credentials."
      >
        <Card className="mx-auto w-full max-w-xl border border-white/40 bg-white/95 shadow-2xl backdrop-blur-lg">
          <CardContent className="space-y-6 p-6 md:p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-7 w-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-slate-600">You can close this page or proceed to sign in.</p>
            <Button
              onClick={() => router.push('/login')}
              className="w-full"
            >
              Go to login
            </Button>
          </CardContent>
        </Card>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Reset your password"
      subtitle="Create a secure password to keep your account safe."
      footer={
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="text-slate-200">Remembered it?</span>
          <button
            type="button"
            className="font-semibold text-white hover:text-indigo-200 underline-offset-4"
            onClick={() => router.push('/login')}
          >
            Back to login
          </button>
        </div>
      }
    >
      <Card className="mx-auto w-full max-w-xl border border-white/40 bg-white/95 shadow-2xl backdrop-blur-lg">
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-slate-800">
                New password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your new password"
                  required
                  disabled={loading}
                  className={validationErrors.password ? 'border-red-500' : ''}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {validationErrors.password && (
                <p className="text-sm text-red-600">{validationErrors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-800">
                Confirm new password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                  disabled={loading}
                  className={validationErrors.confirmPassword ? 'border-red-500' : ''}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {validationErrors.confirmPassword && (
                <p className="text-sm text-red-600">{validationErrors.confirmPassword}</p>
              )}
            </div>

            <div className="text-sm text-slate-600">
              <p className="mb-2 font-medium">Password requirements:</p>
              <ul className="space-y-1 text-xs">
                <li>• At least 8 characters long</li>
                <li>• Contains at least one lowercase letter</li>
                <li>• Contains at least one uppercase letter</li>
                <li>• Contains at least one number</li>
              </ul>
            </div>

            <Button
              type="submit"
              disabled={loading || !password.trim() || !confirmPassword.trim()}
              className="w-full"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div>
                  Resetting password...
                </div>
              ) : (
                'Reset password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthScreen>
  );
}

export default function ResetPasswordPage() {
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
      <ResetPasswordPageInner />
    </Suspense>
  );
}
