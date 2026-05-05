'use client';

import { useState, useEffect } from 'react';
import { authApi } from '@/lib/api/client';
import type { UserResponse } from '@/types/user';

interface UseCurrentUserReturn {
  user: UserResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCurrentUser(): UseCurrentUserReturn {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authApi.me();
      
      if (response.success && response.data) {
        setUser(response.data);
      } else {
        setError(response.error || 'Failed to fetch user information');
        setUser(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user information');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return {
    user,
    isLoading,
    error,
    refetch: fetchUser
  };
}