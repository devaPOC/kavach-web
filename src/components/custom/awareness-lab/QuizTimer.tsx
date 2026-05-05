'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useAwarenessLabStore } from '@/lib/stores/awareness-lab-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, Pause, Play } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface QuizTimerProps {
  quizId: string;
  timeLimitMinutes: number;
  onTimeExpired?: () => void;
  onWarning?: (minutesRemaining: number) => void;
  className?: string;
}

interface TimerState {
  timeRemaining: number;
  isActive: boolean;
  isPaused: boolean;
  startTime: Date | null;
  lastUpdateTime: Date | null;
  warningShown: boolean;
  criticalWarningShown: boolean;
}

/**
 * Robust Quiz Timer Component with proper initialization, cleanup, and synchronization
 * Implements requirements 2.1 and 2.2 for timer management and auto-submission
 */
export function QuizTimer({ 
  quizId, 
  timeLimitMinutes, 
  onTimeExpired, 
  onWarning,
  className = '' 
}: QuizTimerProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<Date>(new Date());
  
  const [timerState, setTimerState] = useState<TimerState>({
    timeRemaining: timeLimitMinutes * 60,
    isActive: false,
    isPaused: false,
    startTime: null,
    lastUpdateTime: null,
    warningShown: false,
    criticalWarningShown: false
  });

  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [tabSyncEnabled, setTabSyncEnabled] = useState(true);

  const { currentAttempt, actions } = useAwarenessLabStore();

  // Storage keys for cross-tab synchronization
  const TIMER_STORAGE_KEY = `quiz_timer_${quizId}`;
  const SYNC_STORAGE_KEY = `quiz_timer_sync_${quizId}`;

  /**
   * Format time in MM:SS format
   */
  const formatTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  /**
   * Save timer state to localStorage for cross-tab sync
   */
  const saveTimerState = useCallback((state: TimerState) => {
    if (!tabSyncEnabled) return;
    
    try {
      const syncData = {
        ...state,
        quizId,
        lastSync: new Date().toISOString(),
        tabId: window.sessionStorage.getItem('tabId') || Math.random().toString(36)
      };
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(syncData));
      localStorage.setItem(SYNC_STORAGE_KEY, Date.now().toString());
    } catch (error) {
      console.warn('Failed to save timer state to localStorage:', error);
      setTabSyncEnabled(false);
    }
  }, [quizId, tabSyncEnabled]);

  /**
   * Load timer state from localStorage for cross-tab sync
   */
  const loadTimerState = useCallback((): TimerState | null => {
    if (!tabSyncEnabled) return null;
    
    try {
      const stored = localStorage.getItem(TIMER_STORAGE_KEY);
      if (!stored) return null;
      
      const syncData = JSON.parse(stored);
      if (syncData.quizId !== quizId) return null;
      
      // Check if data is recent (within 5 seconds)
      const lastSync = new Date(syncData.lastSync);
      const now = new Date();
      if (now.getTime() - lastSync.getTime() > 5000) return null;
      
      return {
        timeRemaining: syncData.timeRemaining,
        isActive: syncData.isActive,
        isPaused: syncData.isPaused,
        startTime: syncData.startTime ? new Date(syncData.startTime) : null,
        lastUpdateTime: syncData.lastUpdateTime ? new Date(syncData.lastUpdateTime) : null,
        warningShown: syncData.warningShown || false,
        criticalWarningShown: syncData.criticalWarningShown || false
      };
    } catch (error) {
      console.warn('Failed to load timer state from localStorage:', error);
      setTabSyncEnabled(false);
      return null;
    }
  }, [quizId, tabSyncEnabled]);

  /**
   * Clear timer state from localStorage
   */
  const clearTimerState = useCallback(() => {
    try {
      localStorage.removeItem(TIMER_STORAGE_KEY);
      localStorage.removeItem(SYNC_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear timer state from localStorage:', error);
    }
  }, [TIMER_STORAGE_KEY, SYNC_STORAGE_KEY]);

  /**
   * Handle time expiration with auto-submission
   */
  const handleTimeExpired = useCallback(async () => {
    console.log('Quiz timer expired, auto-submitting...');
    
    // Stop the timer immediately
    setTimerState(prev => ({
      ...prev,
      isActive: false,
      timeRemaining: 0
    }));

    // Clear all intervals and timeouts
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }

    // Clear storage
    clearTimerState();

    // Call external handler first
    if (onTimeExpired) {
      onTimeExpired();
    }

    // Auto-submit the quiz
    try {
      await actions.submitQuiz();
    } catch (error) {
      console.error('Failed to auto-submit quiz on timer expiration:', error);
    }
  }, [onTimeExpired, actions, clearTimerState]);

  /**
   * Show warning notifications
   */
  const showWarning = useCallback((minutesRemaining: number) => {
    if (onWarning) {
      onWarning(minutesRemaining);
    }
  }, [onWarning]);

  /**
   * Update timer state and handle warnings
   */
  const updateTimer = useCallback((newState: Partial<TimerState>) => {
    setTimerState(prev => {
      const updated = { ...prev, ...newState, lastUpdateTime: new Date() };
      
      // Check for warnings
      const minutesRemaining = Math.floor(updated.timeRemaining / 60);
      
      // 5-minute warning
      if (!updated.warningShown && minutesRemaining <= 5 && minutesRemaining > 1) {
        updated.warningShown = true;
        showWarning(minutesRemaining);
      }
      
      // 1-minute critical warning
      if (!updated.criticalWarningShown && minutesRemaining <= 1) {
        updated.criticalWarningShown = true;
        showWarning(minutesRemaining);
      }
      
      // Save to localStorage for cross-tab sync
      saveTimerState(updated);
      
      return updated;
    });
  }, [showWarning, saveTimerState]);

  /**
   * Start the timer
   */
  const startTimer = useCallback(() => {
    if (timerState.isActive) return;
    
    const startTime = new Date();
    const timeRemaining = timeLimitMinutes * 60;
    
    updateTimer({
      isActive: true,
      isPaused: false,
      startTime,
      timeRemaining
    });

    // Start the main timer interval
    intervalRef.current = setInterval(() => {
      setTimerState(prev => {
        if (!prev.isActive || prev.isPaused) return prev;
        
        const newTimeRemaining = prev.timeRemaining - 1;
        
        if (newTimeRemaining <= 0) {
          handleTimeExpired();
          return prev;
        }
        
        const updated = {
          ...prev,
          timeRemaining: newTimeRemaining,
          lastUpdateTime: new Date()
        };
        
        // Check for warnings
        const minutesRemaining = Math.floor(newTimeRemaining / 60);
        
        if (!updated.warningShown && minutesRemaining <= 5 && minutesRemaining > 1) {
          updated.warningShown = true;
          showWarning(minutesRemaining);
        }
        
        if (!updated.criticalWarningShown && minutesRemaining <= 1) {
          updated.criticalWarningShown = true;
          showWarning(minutesRemaining);
        }
        
        // Save to localStorage
        saveTimerState(updated);
        
        return updated;
      });
    }, 1000);

    // Start sync interval for cross-tab synchronization
    syncIntervalRef.current = setInterval(() => {
      const now = new Date();
      if (now.getTime() - lastSyncRef.current.getTime() > 2000) {
        const storedState = loadTimerState();
        if (storedState && storedState.lastUpdateTime) {
          const timeDiff = now.getTime() - storedState.lastUpdateTime.getTime();
          if (timeDiff < 3000) { // Only sync if data is recent
            setTimerState(storedState);
            setSyncStatus('synced');
          }
        }
        lastSyncRef.current = now;
      }
    }, 1000);
    
  }, [timeLimitMinutes, timerState.isActive, updateTimer, handleTimeExpired, showWarning, saveTimerState, loadTimerState]);

  /**
   * Pause the timer
   */
  const pauseTimer = useCallback(() => {
    if (!timerState.isActive || timerState.isPaused) return;
    
    updateTimer({ isPaused: true });
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [timerState.isActive, timerState.isPaused, updateTimer]);

  /**
   * Resume the timer
   */
  const resumeTimer = useCallback(() => {
    if (!timerState.isActive || !timerState.isPaused || timerState.timeRemaining <= 0) return;
    
    updateTimer({ isPaused: false });
    
    // Restart the interval
    intervalRef.current = setInterval(() => {
      setTimerState(prev => {
        if (!prev.isActive || prev.isPaused) return prev;
        
        const newTimeRemaining = prev.timeRemaining - 1;
        
        if (newTimeRemaining <= 0) {
          handleTimeExpired();
          return prev;
        }
        
        const updated = {
          ...prev,
          timeRemaining: newTimeRemaining,
          lastUpdateTime: new Date()
        };
        
        saveTimerState(updated);
        return updated;
      });
    }, 1000);
  }, [timerState.isActive, timerState.isPaused, timerState.timeRemaining, updateTimer, handleTimeExpired, saveTimerState]);

  /**
   * Stop the timer completely
   */
  const stopTimer = useCallback(() => {
    setTimerState({
      timeRemaining: 0,
      isActive: false,
      isPaused: false,
      startTime: null,
      lastUpdateTime: null,
      warningShown: false,
      criticalWarningShown: false
    });
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    
    clearTimerState();
  }, [clearTimerState]);

  /**
   * Initialize timer on component mount or when quiz attempt starts
   */
  useEffect(() => {
    if (currentAttempt && currentAttempt.quizId === quizId && !currentAttempt.isCompleted) {
      // Try to restore from localStorage first
      const storedState = loadTimerState();
      if (storedState && storedState.isActive) {
        setTimerState(storedState);
        
        // Resume the timer if it was active
        if (!storedState.isPaused) {
          resumeTimer();
        }
      } else {
        // Start new timer
        startTimer();
      }
    }
    
    return () => {
      // Cleanup on unmount
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [currentAttempt, quizId, loadTimerState, startTimer, resumeTimer]);

  /**
   * Handle storage events for cross-tab synchronization
   */
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SYNC_STORAGE_KEY && tabSyncEnabled) {
        setSyncStatus('syncing');
        const storedState = loadTimerState();
        if (storedState) {
          setTimerState(storedState);
          setSyncStatus('synced');
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [SYNC_STORAGE_KEY, tabSyncEnabled, loadTimerState]);

  /**
   * Handle page visibility changes
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, save current state
        saveTimerState(timerState);
      } else {
        // Page is visible, sync with other tabs
        const storedState = loadTimerState();
        if (storedState && storedState.lastUpdateTime) {
          const timeDiff = new Date().getTime() - storedState.lastUpdateTime.getTime();
          if (timeDiff < 5000) { // Only sync if data is recent
            setTimerState(storedState);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [timerState, saveTimerState, loadTimerState]);

  // Don't render if no active attempt
  if (!currentAttempt || currentAttempt.quizId !== quizId || currentAttempt.isCompleted) {
    return null;
  }

  const minutesRemaining = Math.floor(timerState.timeRemaining / 60);
  const isWarning = minutesRemaining <= 5;
  const isCritical = minutesRemaining <= 1;

  return (
    <Card className={`${className} ${isCritical ? 'border-red-500' : isWarning ? 'border-yellow-500' : 'border-blue-500'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className={`h-5 w-5 ${isCritical ? 'text-red-500' : isWarning ? 'text-yellow-500' : 'text-blue-500'}`} />
            <span className="text-sm font-medium">Time Remaining:</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className={`text-2xl font-bold ${isCritical ? 'text-red-500' : isWarning ? 'text-yellow-500' : 'text-blue-500'}`}>
              {formatTime(timerState.timeRemaining)}
            </div>
            
            {timerState.isActive && (
              <div className="flex space-x-1">
                {timerState.isPaused ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={resumeTimer}
                    className="h-8 w-8 p-0"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={pauseTimer}
                    className="h-8 w-8 p-0"
                  >
                    <Pause className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Warning messages */}
        {isCritical && (
          <Alert className="mt-3 border-red-500 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-700">
              Less than 1 minute remaining! Your quiz will be auto-submitted when time expires.
            </AlertDescription>
          </Alert>
        )}
        
        {isWarning && !isCritical && (
          <Alert className="mt-3 border-yellow-500 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-700">
              {minutesRemaining} minute{minutesRemaining !== 1 ? 's' : ''} remaining. Please review your answers.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Sync status indicator */}
        {tabSyncEnabled && syncStatus !== 'synced' && (
          <div className="mt-2 text-xs text-gray-500">
            {syncStatus === 'syncing' ? 'Syncing across tabs...' : 'Sync error'}
          </div>
        )}
        
        {/* Timer state indicators */}
        {timerState.isPaused && (
          <div className="mt-2 text-sm text-yellow-600 font-medium">
            Timer Paused
          </div>
        )}
      </CardContent>
    </Card>
  );
}