/**
 * Session Recovery Utilities
 * Provides functionality to restore user state after errors or interruptions
 */

import { AwarenessLabError, AwarenessLabErrorCode } from '@/lib/errors/awareness-lab-errors';

// Session data types
export interface SessionData {
  sessionId: string;
  userId: string;
  timestamp: number;
  data: Record<string, any>;
  version: string;
}

export interface QuizSessionData extends SessionData {
  data: {
    quizId: string;
    attemptId: string;
    currentQuestionIndex: number;
    answers: Record<string, string[]>;
    startTime: number;
    timeRemaining: number;
    isCompleted: boolean;
    lastActivity: number;
  };
}

export interface LearningSessionData extends SessionData {
  data: {
    moduleId: string;
    currentMaterialIndex: number;
    completedMaterials: string[];
    progress: number;
    timeSpent: number;
    lastActivity: number;
  };
}

// Recovery result
export interface RecoveryResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  recoveryType: 'full' | 'partial' | 'failed';
  recoveredFields: string[];
  lostFields: string[];
}

/**
 * Session Storage Manager
 * Handles saving and retrieving session data with versioning and validation
 */
export class SessionStorageManager {
  private static readonly STORAGE_PREFIX = 'awareness_lab_session_';
  private static readonly VERSION = '1.0.0';
  private static readonly MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit
  private static readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Save session data to storage
   */
  static saveSession<T extends SessionData>(
    sessionType: string,
    sessionData: T
  ): boolean {
    try {
      const key = this.getStorageKey(sessionType, sessionData.sessionId);
      const dataToStore = {
        ...sessionData,
        version: this.VERSION,
        timestamp: Date.now()
      };

      const serializedData = JSON.stringify(dataToStore);
      
      // Check storage size limit
      if (serializedData.length > this.MAX_STORAGE_SIZE) {
        console.warn('Session data exceeds storage size limit');
        return false;
      }

      // Use localStorage for persistence across browser sessions
      localStorage.setItem(key, serializedData);
      
      // Also save to sessionStorage for current session
      sessionStorage.setItem(key, serializedData);
      
      return true;
    } catch (error) {
      console.error('Failed to save session data:', error);
      return false;
    }
  }

  /**
   * Load session data from storage
   */
  static loadSession<T extends SessionData>(
    sessionType: string,
    sessionId: string
  ): T | null {
    try {
      const key = this.getStorageKey(sessionType, sessionId);
      
      // Try sessionStorage first (current session)
      let serializedData = sessionStorage.getItem(key);
      
      // Fallback to localStorage (persistent)
      if (!serializedData) {
        serializedData = localStorage.getItem(key);
      }

      if (!serializedData) {
        return null;
      }

      const sessionData = JSON.parse(serializedData) as T;
      
      // Validate session data
      if (!this.validateSessionData(sessionData)) {
        console.warn('Invalid session data found, removing...');
        this.removeSession(sessionType, sessionId);
        return null;
      }

      // Check if session is expired (older than 24 hours)
      const age = Date.now() - sessionData.timestamp;
      if (age > this.CLEANUP_INTERVAL) {
        console.warn('Session data expired, removing...');
        this.removeSession(sessionType, sessionId);
        return null;
      }

      return sessionData;
    } catch (error) {
      console.error('Failed to load session data:', error);
      return null;
    }
  }

  /**
   * Remove session data from storage
   */
  static removeSession(sessionType: string, sessionId: string): void {
    try {
      const key = this.getStorageKey(sessionType, sessionId);
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove session data:', error);
    }
  }

  /**
   * List all sessions of a specific type
   */
  static listSessions(sessionType: string): string[] {
    try {
      const prefix = this.getStorageKey(sessionType, '');
      const sessions: string[] = [];

      // Check localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const sessionId = key.replace(prefix, '');
          sessions.push(sessionId);
        }
      }

      return sessions;
    } catch (error) {
      console.error('Failed to list sessions:', error);
      return [];
    }
  }

  /**
   * Clean up expired sessions
   */
  static cleanupExpiredSessions(): number {
    let cleanedCount = 0;
    
    try {
      const keysToRemove: string[] = [];
      
      // Check localStorage for expired sessions
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_PREFIX)) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            const age = Date.now() - (data.timestamp || 0);
            
            if (age > this.CLEANUP_INTERVAL) {
              keysToRemove.push(key);
            }
          } catch {
            // Invalid data, mark for removal
            keysToRemove.push(key);
          }
        }
      }

      // Remove expired sessions
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
        cleanedCount++;
      });

    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error);
    }

    return cleanedCount;
  }

  /**
   * Get storage key for session
   */
  private static getStorageKey(sessionType: string, sessionId: string): string {
    return `${this.STORAGE_PREFIX}${sessionType}_${sessionId}`;
  }

  /**
   * Validate session data structure
   */
  private static validateSessionData(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.sessionId === 'string' &&
      typeof data.userId === 'string' &&
      typeof data.timestamp === 'number' &&
      typeof data.data === 'object' &&
      typeof data.version === 'string'
    );
  }
}

/**
 * Quiz Session Recovery
 * Handles recovery of quiz attempts and progress
 */
export class QuizSessionRecovery {
  /**
   * Save quiz session state
   */
  static saveQuizSession(
    sessionId: string,
    userId: string,
    quizData: QuizSessionData['data']
  ): boolean {
    const sessionData: QuizSessionData = {
      sessionId,
      userId,
      timestamp: Date.now(),
      version: '1.0.0',
      data: {
        ...quizData,
        lastActivity: Date.now()
      }
    };

    return SessionStorageManager.saveSession('quiz', sessionData);
  }

  /**
   * Recover quiz session
   */
  static recoverQuizSession(
    sessionId: string
  ): RecoveryResult<QuizSessionData['data']> {
    try {
      const sessionData = SessionStorageManager.loadSession<QuizSessionData>('quiz', sessionId);
      
      if (!sessionData) {
        return {
          success: false,
          error: 'No quiz session found',
          recoveryType: 'failed',
          recoveredFields: [],
          lostFields: []
        };
      }

      // Validate quiz session data
      const validationResult = this.validateQuizSessionData(sessionData.data);
      
      if (!validationResult.isValid) {
        return {
          success: false,
          error: 'Quiz session data is corrupted',
          recoveryType: 'failed',
          recoveredFields: [],
          lostFields: validationResult.invalidFields
        };
      }

      // Check if quiz session is still active (not expired)
      const timeSinceLastActivity = Date.now() - sessionData.data.lastActivity;
      const maxInactiveTime = 2 * 60 * 60 * 1000; // 2 hours

      if (timeSinceLastActivity > maxInactiveTime) {
        return {
          success: false,
          error: 'Quiz session has expired due to inactivity',
          recoveryType: 'failed',
          recoveredFields: [],
          lostFields: ['session']
        };
      }

      // Check if quiz time limit has been exceeded
      if (sessionData.data.timeRemaining <= 0) {
        return {
          success: true,
          data: sessionData.data,
          recoveryType: 'partial',
          recoveredFields: ['answers', 'progress'],
          lostFields: ['timeRemaining']
        };
      }

      return {
        success: true,
        data: sessionData.data,
        recoveryType: 'full',
        recoveredFields: ['quizId', 'attemptId', 'answers', 'progress', 'timeRemaining'],
        lostFields: []
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during recovery',
        recoveryType: 'failed',
        recoveredFields: [],
        lostFields: []
      };
    }
  }

  /**
   * Clear quiz session after completion
   */
  static clearQuizSession(sessionId: string): void {
    SessionStorageManager.removeSession('quiz', sessionId);
  }

  /**
   * Validate quiz session data
   */
  private static validateQuizSessionData(data: QuizSessionData['data']): {
    isValid: boolean;
    invalidFields: string[];
  } {
    const invalidFields: string[] = [];

    if (!data.quizId || typeof data.quizId !== 'string') {
      invalidFields.push('quizId');
    }

    if (!data.attemptId || typeof data.attemptId !== 'string') {
      invalidFields.push('attemptId');
    }

    if (typeof data.currentQuestionIndex !== 'number' || data.currentQuestionIndex < 0) {
      invalidFields.push('currentQuestionIndex');
    }

    if (!data.answers || typeof data.answers !== 'object') {
      invalidFields.push('answers');
    }

    if (typeof data.startTime !== 'number' || data.startTime <= 0) {
      invalidFields.push('startTime');
    }

    if (typeof data.timeRemaining !== 'number') {
      invalidFields.push('timeRemaining');
    }

    return {
      isValid: invalidFields.length === 0,
      invalidFields
    };
  }
}

/**
 * Learning Session Recovery
 * Handles recovery of learning progress and material access
 */
export class LearningSessionRecovery {
  /**
   * Save learning session state
   */
  static saveLearningSession(
    sessionId: string,
    userId: string,
    learningData: LearningSessionData['data']
  ): boolean {
    const sessionData: LearningSessionData = {
      sessionId,
      userId,
      timestamp: Date.now(),
      version: '1.0.0',
      data: {
        ...learningData,
        lastActivity: Date.now()
      }
    };

    return SessionStorageManager.saveSession('learning', sessionData);
  }

  /**
   * Recover learning session
   */
  static recoverLearningSession(
    sessionId: string
  ): RecoveryResult<LearningSessionData['data']> {
    try {
      const sessionData = SessionStorageManager.loadSession<LearningSessionData>('learning', sessionId);
      
      if (!sessionData) {
        return {
          success: false,
          error: 'No learning session found',
          recoveryType: 'failed',
          recoveredFields: [],
          lostFields: []
        };
      }

      // Validate learning session data
      const validationResult = this.validateLearningSessionData(sessionData.data);
      
      if (!validationResult.isValid) {
        return {
          success: false,
          error: 'Learning session data is corrupted',
          recoveryType: 'failed',
          recoveredFields: [],
          lostFields: validationResult.invalidFields
        };
      }

      return {
        success: true,
        data: sessionData.data,
        recoveryType: 'full',
        recoveredFields: ['moduleId', 'progress', 'completedMaterials', 'timeSpent'],
        lostFields: []
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during recovery',
        recoveryType: 'failed',
        recoveredFields: [],
        lostFields: []
      };
    }
  }

  /**
   * Clear learning session
   */
  static clearLearningSession(sessionId: string): void {
    SessionStorageManager.removeSession('learning', sessionId);
  }

  /**
   * Validate learning session data
   */
  private static validateLearningSessionData(data: LearningSessionData['data']): {
    isValid: boolean;
    invalidFields: string[];
  } {
    const invalidFields: string[] = [];

    if (!data.moduleId || typeof data.moduleId !== 'string') {
      invalidFields.push('moduleId');
    }

    if (typeof data.currentMaterialIndex !== 'number' || data.currentMaterialIndex < 0) {
      invalidFields.push('currentMaterialIndex');
    }

    if (!Array.isArray(data.completedMaterials)) {
      invalidFields.push('completedMaterials');
    }

    if (typeof data.progress !== 'number' || data.progress < 0 || data.progress > 100) {
      invalidFields.push('progress');
    }

    if (typeof data.timeSpent !== 'number' || data.timeSpent < 0) {
      invalidFields.push('timeSpent');
    }

    return {
      isValid: invalidFields.length === 0,
      invalidFields
    };
  }
}

/**
 * Auto-save functionality for session data
 */
export class AutoSaveManager {
  private saveInterval: NodeJS.Timeout | null = null;
  private pendingData: Map<string, any> = new Map();
  private readonly saveIntervalMs: number;

  constructor(saveIntervalMs: number = 30000) { // Default: 30 seconds
    this.saveIntervalMs = saveIntervalMs;
  }

  /**
   * Start auto-save for a session
   */
  startAutoSave<T>(
    sessionType: 'quiz' | 'learning',
    sessionId: string,
    userId: string,
    getDataCallback: () => T
  ): void {
    if (this.saveInterval) {
      this.stopAutoSave();
    }

    this.saveInterval = setInterval(() => {
      try {
        const data = getDataCallback();
        
        // Check if data has changed
        const key = `${sessionType}_${sessionId}`;
        const previousData = this.pendingData.get(key);
        const currentDataStr = JSON.stringify(data);
        
        if (previousData !== currentDataStr) {
          this.pendingData.set(key, currentDataStr);
          
          // Save based on session type
          if (sessionType === 'quiz') {
            QuizSessionRecovery.saveQuizSession(sessionId, userId, data as any);
          } else if (sessionType === 'learning') {
            LearningSessionRecovery.saveLearningSession(sessionId, userId, data as any);
          }
          
          console.debug(`Auto-saved ${sessionType} session: ${sessionId}`);
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, this.saveIntervalMs);
  }

  /**
   * Stop auto-save
   */
  stopAutoSave(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
    this.pendingData.clear();
  }

  /**
   * Force save immediately
   */
  forceSave<T>(
    sessionType: 'quiz' | 'learning',
    sessionId: string,
    userId: string,
    data: T
  ): boolean {
    try {
      if (sessionType === 'quiz') {
        return QuizSessionRecovery.saveQuizSession(sessionId, userId, data as any);
      } else if (sessionType === 'learning') {
        return LearningSessionRecovery.saveLearningSession(sessionId, userId, data as any);
      }
      return false;
    } catch (error) {
      console.error('Force save failed:', error);
      return false;
    }
  }
}

// Utility functions

/**
 * Generate unique session ID
 */
export function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${timestamp}_${randomPart}`;
}

/**
 * Initialize session recovery system
 */
export function initializeSessionRecovery(): void {
  // Clean up expired sessions on initialization
  const cleanedCount = SessionStorageManager.cleanupExpiredSessions();
  if (cleanedCount > 0) {
    console.log(`Cleaned up ${cleanedCount} expired sessions`);
  }

  // Set up periodic cleanup
  setInterval(() => {
    SessionStorageManager.cleanupExpiredSessions();
  }, 60 * 60 * 1000); // Every hour
}

/**
 * Check if session recovery is available
 */
export function isSessionRecoveryAvailable(): boolean {
  try {
    // Test localStorage availability
    const testKey = 'test_session_recovery';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}