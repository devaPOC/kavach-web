'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { Navbar } from '@/components/custom/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AdminArchive from '@/components/custom/admin/AdminArchive';

export default function AdminArchivePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    const fetchUser = async () => {
      try {
        const result = await authApi.me();
        if (!cancelled) {
          if (result.success && result.data) {
            const userData = result.data;

            // Check if user is admin
            if (userData.role !== 'admin') {
              // Redirect non-admin users
              router.push('/dashboard');
              return;
            }

            setUser(userData);
          } else {
            setError('Failed to fetch user data');
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          console.error('Error fetching user:', e);
          setError(e.message || 'Failed to load user data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchUser();
    return () => { cancelled = true };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/50">
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="flex items-center justify-center p-6">
              <p>Loading archive management...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
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
    );
  }

  return (
    <div className="min-h-screen bg-muted/50">
      <Navbar
        user={user}
        showProfileMenu={true}
      />

      <div className="container mx-auto p-6">
        <AdminArchive />
      </div>
    </div>
  );
}
