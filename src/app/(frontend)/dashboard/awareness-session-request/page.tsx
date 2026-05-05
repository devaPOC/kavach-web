'use client';

import { AwarenessSessionRequest } from '@/components/custom/customer';
import { Navbar, Breadcrumb } from '@/components/custom/navigation';
import { useState, useEffect } from 'react';
import { authApi } from '@/lib/api/client';

export default function AwarenessSessionRequestPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const result = await authApi.me();
        if (result.success && result.data) {
          setUser(result.data);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary/50"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/50">
      {user && (
        <Navbar
          user={user}
          showProfileMenu={true}
        />
      )}
      
      <div className="container mx-auto py-8 px-4">
        {/* Breadcrumb Navigation */}
        <Breadcrumb 
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Request Awareness Session', current: true }
          ]}
          className="mb-6"
        />
        
        <AwarenessSessionRequest />
      </div>
    </div>
  );
}