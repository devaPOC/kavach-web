'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAwarenessLabStore } from '@/lib/stores/awareness-lab-store';

export interface TimerState {
  timeRemaining: number;
  isActive: boolean;
  isPaused: boolean;
  startTime: Date | null;
  endTime: Date | null;
  lastSync: Date | null;
  sessionId: string;
}

export interface TimerConfig {
  quizId: string;
  timeLimitMinutes: number;
  onTimeExpired?: () => void;
  onWarning?: (minutesRemaining: number) => void;
  enableCrossTabSync?: boolean;
  warningThresholds?: number[]; // Minutes for warnings
}

export interface TimerControls {
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  sync: () => void;
  getTimeElapsed: () => number;
  getRemainingTime: () => number;
  isExpired: () => boolean;
}

/**
 * Enhanced Quiz Timer Hook with cross-tab synchronization and robust state management
 * Implements requirements 2.1 and 2.2 for timer management and auto-submission
 */
export function useQuizTimer(config: TimerConfig): [TimerState, TimerControls] {
  const {
    quizId,
    timeLimitMinutes,
    onTimeExpired,
    onWarning,
    enableCrossTabSync = true,
    warningThresholds = [5, 2, 1] // Default warnings at 5, 2, and 1 minutes
  } = config;

  const { currentAttempt, actions } = useAwarenessLabStore();
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionId = useRef<string>(Math.random().toString(36).substr(2, 9));
  const warningsShown = useRef<Set<number>>(new Set());
  
  const [timerState, setTimerState] = useState<TimerState>({
    timeRemaining: timeLimitMinutes * 60,
    isActive: false,
    isPaused: false,
    startTime: null,
    endTime: null,
    lastSync: null,
    sessionId: sessionId.current
  });

  // Storage keys for cross-tab synchronization
  const STORAGE_KEY = `quiz_timer_${quizId}`;
  const SYNC_EVENT_KEY = `quiz_timer_sync_${quizId}`;

  /**
   * Save timer state to localStorage for cross-tab sync
   */
  const saveToStorage = useCallback((state: TimerState) => {
    if (!enableCrossTabSync) return;
    
    try {
      const storageData = {
        ...state,
        quizId,
        timestamp: Date.now(),
        sessionId: sessionId.current
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
      
      // Trigger storage event for other tabs
      localStorage.setItem(SYNC_EVENT_KEY, Date.now().toString());
    } catch (error) {
      console.warn('Failed to save timer state to localStorage:', error);
    }
  }, [STORAGE_KEY, SYNC_EVENT_KEY, enableCrossTabSync, quizId]);

  /**
   * Load timer state from localStorage
   */
  const loadFromStorage = useCallback((): TimerState | null => {
    if (!enableCrossTabSync) return null;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      
      const data = JSON.parse(stored);
      if (data.quizId !== quizId) return null;
      
      // Check if data is recent (within 10 seconds)
      const age = Date.now() - data.timestamp;
      if (age > 10000) return null;
      
      return {
        timeRemaining: data.timeRemaining,
        isActive: data.isActive,
        isPaused: data.isPaused,
        startTime: data.startTime ? new Date(data.startTime) : null,
        endTime: data.endTime ? new Date(data.endTime) : null,
        lastSync: new Date(data.timestamp),
        sessionId: data.sessionId
      };
    } catch (error) {
      console.warn('Failed to load timer state from localStorage:', error);
      return null;
    }
  }, [STORAGE_KEY, enableCrossTabSync, quizId]);

  /**
   * Clear timer state from localStorage
   */
  const clearStorage = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SYNC_EVENT_KEY);
    } catch (error) {
      console.warn('Failed to clear timer storage:', error);
    }
  }, [STORAGE_KEY, SYNC_EVENT_KEY]);

  /**
   * Handle time expiration with auto-submission
   */
  const handleTimeExpired = useCallback(async () => {
    console.log('Quiz timer expired, initiating auto-submission...');
    
    // Stop all timers immediately
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    // Update state to expired
    const expiredState: TimerState = {
      ...timerState,
      timeRemaining: 0,
      isActive: false,
      isPaused: false,
      endTime: new Date(),
      lastSync: new Date()
    };
    
    setTimerState(expiredState);
    saveToStorage(expiredState);

    // Call external handler
    if (onTimeExpired) {
      try {
        onTimeExpired();
      } catch (error) {
        console.error('Error in onTimeExpired callback:', error);
      }
    }

    // Auto-submit the quiz
    try {
      await actions.submitQuiz();
    } catch (error) {
      console.error('Failed to auto-submit quiz on timer expiration:', error);
      // Could implement retry logic here
    }

    // Clear storage after submission
    clearStorage();
  }, [timerState, saveToStorage, onTimeExpired, actions, clearStorage]);

  /**
   * Check for warnings and trigger them
   */
  const checkWarnings = useCallback((timeRemaining: number) => {
    const minutesRemaining = Math.floor(timeRemaining / 60);
    
    for (const threshold of warningThresholds) {
      if (minutesRemaining <= threshold && !warningsShown.current.has(threshold)) {
        warningsShown.current.add(threshold);
        if (onWarning) {
          try {
            onWarning(minutesRemaining);
          } catch (error) {
            console.error('Error in onWarning callback:', error);
          }
        }
      }
    }
  }, [warningThresholds, onWarning]);

  /**
   * Update timer state with validation
   */
  const updateTimerState = useCallback((updates: Partial<TimerState>) => {
    setTimerState(prev => {
      const newState = {
        ...prev,
        ...updates,
        lastSync: new Date()
      };
      
      // Validate state consistency
      if (newState.timeRemaining < 0) {
        newState.timeRemaining = 0;
      }
      
      if (newState.timeRemaining === 0 && newState.isActive) {
        newState.isActive = false;
        newState.isPaused = false;
      }
      
      // Check for warnings
      if (newState.isActive && !newState.isPaused) {
        checkWarnings(newState.timeRemaining);
      }
      
      // Save to storage
      saveToStorage(newState);
      
      return newState;
    });
  }, [checkWarnings, saveToStorage]);

  /**
   * Start the timer
   */
  const start = useCallback(() => {
    if (timerState.isActive) return;
    
    const now = new Date();
    const endTime = new Date(now.getTime() + (timeLimitMinutes * 60 * 1000));
    
    updateTimerState({
      isActive: true,
      isPaused: false,
      startTime: now,
      endTime,
      timeRemaining: timeLimitMinutes * 60
    });

    // Clear any existing warnings
    warningsShown.current.clear();

    // Start the main timer interval
    intervalRef.current = setInterval(() => {
      setTimerState(prev => {
        if (!prev.isActive || prev.isPaused) return prev;
        
        const newTimeRemaining = Math.max(0, prev.timeRemaining - 1);
        
        if (newTimeRemaining === 0) {
          handleTimeExpired();
          return prev;
        }
        
        const newState = {
          ...prev,
          timeRemaining: newTimeRemaining,
          lastSync: new Date()
        };
        
        // Check warnings
        checkWarnings(newTimeRemaining);
        
        // Save to storage
        saveToStorage(newState);
        
        return newState;
      });
    }, 1000);

    // Start cross-tab sync interval
    if (enableCrossTabSync) {
      syncIntervalRef.current = setInterval(() => {
        const stored = loadFromStorage();
        if (stored && stored.sessionId !== sessionId.current) {
          // Another tab is controlling the timer
          if (stored.lastSync && (!timerState.lastSync || stored.lastSync.getTime() > timerState.lastSync.getTime())) {
            setTimerState(stored);
          }
        }
      }, 2000);
    }
  }, [timerState.isActive, timeLimitMinutes, updateTimerState, handleTimeExpired, checkWarnings, saveToStorage, enableCrossTabSync, loadFromStorage]);

  /**
   * Pause the timer
   */
  const pause = useCallback(() => {
    if (!timerState.isActive || timerState.isPaused) return;
    
    updateTimerState({ isPaused: true });
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [timerState.isActive, timerState.isPaused, updateTimerState]);

  /**
   * Resume the timer
   */
  const resume = useCallback(() => {
    if (!timerState.isActive || !timerState.isPaused || timerState.timeRemaining <= 0) return;
    
    updateTimerState({ isPaused: false });
    
    // Restart the interval
    intervalRef.current = setInterval(() => {
      setTimerState(prev => {
        if (!prev.isActive || prev.isPaused) return prev;
        
        const newTimeRemaining = Math.max(0, prev.timeRemaining - 1);
        
        if (newTimeRemaining === 0) {
          handleTimeExpired();
          return prev;
        }
        
        const newState = {
          ...prev,
          timeRemaining: newTimeRemaining,
          lastSync: new Date()
        };
        
        checkWarnings(newTimeRemaining);
        saveToStorage(newState);
        
        return newState;
      });
    }, 1000);
  }, [timerState.isActive, timerState.isPaused, timerState.timeRemaining, updateTimerState, handleTimeExpired, checkWarnings, saveToStorage]);

  /**
   * Stop the timer completely
   */
  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
    
    const stoppedState: TimerState = {
      timeRemaining: 0,
      isActive: false,
      isPaused: false,
      startTime: null,
      endTime: null,
      lastSync: new Date(),
      sessionId: sessionId.current
    };
    
    setTimerState(stoppedState);
    warningsShown.current.clear();
    clearStorage();
  }, [clearStorage]);

  /**
   * Sync with other tabs
   */
  const sync = useCallback(() => {
    if (!enableCrossTabSync) return;
    
    const stored = loadFromStorage();
    if (stored && stored.sessionId !== sessionId.current) {
      setTimerState(stored);
    }
  }, [enableCrossTabSync, loadFromStorage]);

  /**
   * Get elapsed time in seconds
   */
  const getTimeElapsed = useCallback((): number => {
    if (!timerState.startTime) return 0;
    return Math.floor((Date.now() - timerState.startTime.getTime()) / 1000);
  }, [timerState.startTime]);

  /**
   * Get remaining time in seconds
   */
  const getRemainingTime = useCallback((): number => {
    return Math.max(0, timerState.timeRemaining);
  }, [timerState.timeRemaining]);

  /**
   * Check if timer has expired
   */
  const isExpired = useCallback((): boolean => {
    return timerState.timeRemaining <= 0;
  }, [timerState.timeRemaining]);

  /**
   * Initialize timer when quiz attempt starts
   */
  useEffect(() => {
    if (currentAttempt && currentAttempt.quizId === quizId && !currentAttempt.isCompleted) {
      // Try to restore from storage first
      const stored = loadFromStorage();
      if (stored && stored.isActive) {
        setTimerState(stored);
        
        // Resume timer if it was active and not paused
        if (!stored.isPaused && stored.timeRemaining > 0) {
          resume();
        }
      } else {
        // Calculate remaining time based on attempt start time
        const attemptStartTime = new Date(currentAttempt.startedAt);
        const elapsed = Math.floor((Date.now() - attemptStartTime.getTime()) / 1000);
        const remaining = Math.max(0, (timeLimitMinutes * 60) - elapsed);
        
        if (remaining > 0) {
          updateTimerState({
            timeRemaining: remaining,
            startTime: attemptStartTime,
            endTime: new Date(attemptStartTime.getTime() + (timeLimitMinutes * 60 * 1000))
          });
          start();
        } else {
          // Time already expired
          handleTimeExpired();
        }
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [currentAttempt, quizId, timeLimitMinutes, loadFromStorage, resume, updateTimerState, start, handleTimeExpired]);

  /**
   * Handle storage events for cross-tab sync
   */
  useEffect(() => {
    if (!enableCrossTabSync) return;
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SYNC_EVENT_KEY) {
        sync();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [enableCrossTabSync, SYNC_EVENT_KEY, sync]);

  /**
   * Handle page visibility changes
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, save current state
        saveToStorage(timerState);
      } else {
        // Page is visible, sync with other tabs
        sync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [timerState, saveToStorage, sync]);

  const controls: TimerControls = {
    start,
    pause,
    resume,
    stop,
    sync,
    getTimeElapsed,
    getRemainingTime,
    isExpired
  };

  return [timerState, controls];
}