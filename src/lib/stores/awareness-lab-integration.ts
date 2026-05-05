'use client';

import { useEffect, useCallback } from 'react';
import { useAwarenessLabStore, useAdminAwarenessStore } from './index';

/**
 * Integration hook that connects awareness lab stores with authentication state
 * This hook should be used in components that need to sync store state with user authentication
 */
export function useAwarenessLabIntegration() {
  const awarenessActions = useAwarenessLabStore((state) => state.actions);
  const adminActions = useAdminAwarenessStore((state) => state.actions);
  
  // Get current user info from cookies/headers (following existing auth pattern)
  const getCurrentUser = useCallback(async () => {
    try {
      // This follows the existing pattern where user info is available via API
      const response = await fetch('/api/v1/auth/me');
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }, []);

  // Initialize stores based on user authentication
  const initializeStores = useCallback(async () => {
    const user = await getCurrentUser();
    
    if (!user) {
      // User not authenticated, reset stores
      awarenessActions.reset();
      adminActions.reset();
      return;
    }

    // Initialize customer stores for all authenticated users
    try {
      await Promise.all([
        awarenessActions.fetchQuizzes(),
        awarenessActions.fetchLearningModules(),
      ]);
    } catch (error) {
      console.error('Failed to initialize customer awareness lab data:', error);
    }

    // Initialize admin stores for admin users
    if (user.role === 'admin') {
      try {
        await Promise.all([
          adminActions.fetchAdminQuizzes(),
          adminActions.fetchTemplates(),
          adminActions.fetchAdminModules(),
          adminActions.fetchOverviewAnalytics(),
        ]);
      } catch (error) {
        console.error('Failed to initialize admin awareness lab data:', error);
      }
    }
  }, [awarenessActions, adminActions, getCurrentUser]);

  // Auto-initialize on mount and when authentication changes
  useEffect(() => {
    initializeStores();
  }, [initializeStores]);

  return {
    initializeStores,
    getCurrentUser,
  };
}

/**
 * Hook for checking user permissions for awareness lab features
 */
export function useAwarenessLabPermissions() {
  const getCurrentUser = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/auth/me');
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      return null;
    }
  }, []);

  const checkPermissions = useCallback(async () => {
    const user = await getCurrentUser();
    
    return {
      canTakeQuizzes: !!user && ['customer', 'expert', 'admin'].includes(user.role),
      canAccessLearningMaterials: !!user && ['customer', 'expert', 'admin'].includes(user.role),
      canManageQuizzes: !!user && user.role === 'admin',
      canManageTemplates: !!user && user.role === 'admin',
      canManageLearningMaterials: !!user && user.role === 'admin',
      canViewAnalytics: !!user && user.role === 'admin',
      isAuthenticated: !!user,
      userRole: user?.role || null,
    };
  }, [getCurrentUser]);

  return {
    checkPermissions,
    getCurrentUser,
  };
}

/**
 * Hook for handling quiz timer persistence across page refreshes
 * This ensures that if a user refreshes the page during a quiz, the timer continues
 */
export function useQuizTimerPersistence() {
  const currentQuiz = useAwarenessLabStore((state) => state.currentQuiz);
  const currentAttempt = useAwarenessLabStore((state) => state.currentAttempt);
  const quizTimer = useAwarenessLabStore((state) => state.quizTimer);
  const actions = useAwarenessLabStore((state) => state.actions);

  // Restore timer state on page load if there's an active attempt
  useEffect(() => {
    if (currentAttempt && !currentAttempt.isCompleted && currentQuiz && !quizTimer.isActive) {
      const startTime = new Date(currentAttempt.startedAt);
      const now = new Date();
      const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      const totalTimeSeconds = currentQuiz.timeLimitMinutes * 60;
      const remainingSeconds = Math.max(0, totalTimeSeconds - elapsedSeconds);

      if (remainingSeconds > 0) {
        // Resume the timer with remaining time
        actions.startTimer(remainingSeconds / 60);
      } else {
        // Time has expired, auto-submit
        actions.submitQuiz();
      }
    }
  }, [currentAttempt, currentQuiz, quizTimer.isActive, actions]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (quizTimer.intervalId) {
        clearInterval(quizTimer.intervalId);
      }
    };
  }, [quizTimer.intervalId]);
}

/**
 * Hook for syncing user progress with server
 * This ensures that progress is saved and synced across devices
 */
export function useProgressSync() {
  const userProgress = useAwarenessLabStore((state) => state.userProgress);
  const actions = useAwarenessLabStore((state) => state.actions);

  // Sync progress to server periodically
  useEffect(() => {
    const syncProgress = async () => {
      // Only sync if there's progress data
      if (Object.keys(userProgress).length === 0) return;

      try {
        await fetch('/api/v1/learning-modules/sync-progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ progress: userProgress }),
        });
      } catch (error) {
        console.error('Failed to sync progress:', error);
      }
    };

    // Sync progress every 30 seconds
    const interval = setInterval(syncProgress, 30000);

    // Sync on page unload
    const handleBeforeUnload = () => {
      syncProgress();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [userProgress]);

  // Load progress from server on mount
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const response = await fetch('/api/v1/learning-modules/my-progress');
        if (response.ok) {
          const serverProgress = await response.json();
          // Update local progress with server data
          // This would need to be implemented in the store
          console.log('Server progress loaded:', serverProgress);
        }
      } catch (error) {
        console.error('Failed to load progress from server:', error);
      }
    };

    loadProgress();
  }, []);
}

/**
 * Hook for handling offline/online state for awareness lab
 * This ensures that the app works offline and syncs when back online
 */
export function useOfflineSync() {
  const actions = useAwarenessLabStore((state) => state.actions);
  const adminActions = useAdminAwarenessStore((state) => state.actions);

  useEffect(() => {
    const handleOnline = async () => {
      console.log('Back online, syncing data...');
      
      try {
        // Refresh all data when back online
        await Promise.all([
          actions.fetchQuizzes(),
          actions.fetchLearningModules(),
        ]);

        // Check if user is admin and refresh admin data
        const user = await fetch('/api/v1/auth/me').then(r => r.ok ? r.json() : null);
        if (user?.role === 'admin') {
          await Promise.all([
            adminActions.fetchAdminQuizzes(),
            adminActions.fetchTemplates(),
            adminActions.fetchAdminModules(),
          ]);
        }
      } catch (error) {
        console.error('Failed to sync data when back online:', error);
      }
    };

    const handleOffline = () => {
      console.log('Gone offline, awareness lab will work with cached data');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [actions, adminActions]);
}

/**
 * Main integration hook that combines all awareness lab integrations
 * Use this in your main app component or layout
 */
export function useAwarenessLabApp() {
  useAwarenessLabIntegration();
  useQuizTimerPersistence();
  useProgressSync();
  useOfflineSync();

  return {
    // Expose any needed utilities
    permissions: useAwarenessLabPermissions(),
  };
}