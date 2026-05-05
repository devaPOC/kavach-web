import { BaseService, ServiceResult, serviceSuccess, serviceError } from '../base.service';
import { quizAttemptRepository } from '@/lib/database/repositories/quiz-attempt-repository';
import { quizRepository } from '@/lib/database/repositories/quiz-repository';
import { AwarenessLabErrorCode } from '@/lib/errors/awareness-lab-errors';

export interface AttemptLimitCheck {
  canAttempt: boolean;
  remainingAttempts: number;
  totalAttempts: number;
  maxAttempts: number;
  lastAttemptDate?: Date;
  nextAttemptAllowed?: Date;
  reason?: string;
}

export interface SecurityValidation {
  isValid: boolean;
  threats: SecurityThreat[];
  riskScore: number; // 0-100, higher is more risky
  recommendations: string[];
}

export interface SecurityThreat {
  type: 'timing_anomaly' | 'answer_manipulation' | 'session_hijacking' | 'multiple_sessions' | 'suspicious_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: any;
  timestamp: Date;
}

export interface AttemptHistory {
  attemptId: string;
  startedAt: Date;
  completedAt?: Date;
  score: number;
  timeTakenSeconds: number;
  isCompleted: boolean;
  securityFlags: string[];
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  interactionData?: AttemptInteractionData;
}

export interface AttemptInteractionData {
  questionTimings: Record<string, number>; // questionId -> seconds spent
  answerChanges: Record<string, number>; // questionId -> number of changes
  pauseDurations: number[]; // Array of pause durations in seconds
  tabSwitches: number;
  windowBlurs: number;
  copyPasteEvents: number;
  rightClickEvents: number;
  keyboardShortcuts: string[];
  mouseMovements: number;
  scrollEvents: number;
}

export interface AttemptAnalytics {
  userId: string;
  quizId: string;
  totalAttempts: number;
  completedAttempts: number;
  averageScore: number;
  bestScore: number;
  averageTime: number;
  fastestTime: number;
  slowestTime: number;
  improvementTrend: 'improving' | 'declining' | 'stable';
  suspiciousPatterns: string[];
  riskAssessment: 'low' | 'medium' | 'high';
}

/**
 * Enhanced Attempt Management Service with security checks and detailed tracking
 * Implements requirements 2.4, 2.6, and 6.5 for attempt limits, security, and tracking
 */
export class AttemptManagementService extends BaseService {
  
  /**
   * Check if user can attempt the quiz with detailed validation
   */
  async checkAttemptEligibility(
    userId: string,
    quizId: string,
    options: {
      checkCooldown?: boolean;
      cooldownMinutes?: number;
      enableSecurityCheck?: boolean;
    } = {}
  ): Promise<ServiceResult<AttemptLimitCheck>> {
    try {
      const {
        checkCooldown = false,
        cooldownMinutes = 30,
        enableSecurityCheck = true
      } = options;

      // Get quiz details
      const quiz = await quizRepository.findById(quizId);
      if (!quiz) {
        return serviceError('Quiz not found', AwarenessLabErrorCode.QUIZ_NOT_FOUND);
      }

      // Check if quiz is published and not expired
      if (!quiz.isPublished) {
        return serviceError('Quiz is not published', AwarenessLabErrorCode.QUIZ_NOT_PUBLISHED);
      }

      if (quiz.endDate && new Date() > quiz.endDate) {
        return serviceError('Quiz has expired', AwarenessLabErrorCode.QUIZ_NOT_PUBLISHED);
      }

      // Get user's attempt history
      const userProgress = await quizAttemptRepository.getUserQuizProgress(
        userId,
        quizId,
        quiz.maxAttempts
      );

      // Basic attempt limit check
      if (userProgress.attemptCount >= quiz.maxAttempts) {
        return serviceSuccess({
          canAttempt: false,
          remainingAttempts: 0,
          totalAttempts: userProgress.attemptCount,
          maxAttempts: quiz.maxAttempts,
          lastAttemptDate: userProgress.lastAttemptDate,
          reason: `Maximum attempts (${quiz.maxAttempts}) exceeded`
        });
      }

      // Cooldown check
      let nextAttemptAllowed: Date | undefined;
      if (checkCooldown && userProgress.lastAttemptDate) {
        const cooldownEnd = new Date(userProgress.lastAttemptDate.getTime() + (cooldownMinutes * 60 * 1000));
        if (new Date() < cooldownEnd) {
          return serviceSuccess({
            canAttempt: false,
            remainingAttempts: quiz.maxAttempts - userProgress.attemptCount,
            totalAttempts: userProgress.attemptCount,
            maxAttempts: quiz.maxAttempts,
            lastAttemptDate: userProgress.lastAttemptDate,
            nextAttemptAllowed: cooldownEnd,
            reason: `Cooldown period active. Next attempt allowed at ${cooldownEnd.toISOString()}`
          });
        }
      }

      // Security check
      if (enableSecurityCheck) {
        const securityCheck = await this.performSecurityValidation(userId, quizId);
        if (!securityCheck.success) {
          return serviceError(securityCheck.error!, AwarenessLabErrorCode.INVALID_QUIZ_ANSWERS);
        }

        const security = securityCheck.data!;
        if (!security.isValid) {
          const criticalThreats = security.threats.filter(t => t.severity === 'critical');
          if (criticalThreats.length > 0) {
            return serviceSuccess({
              canAttempt: false,
              remainingAttempts: quiz.maxAttempts - userProgress.attemptCount,
              totalAttempts: userProgress.attemptCount,
              maxAttempts: quiz.maxAttempts,
              lastAttemptDate: userProgress.lastAttemptDate,
              reason: `Security validation failed: ${criticalThreats[0].description}`
            });
          }
        }
      }

      // User can attempt
      return serviceSuccess({
        canAttempt: true,
        remainingAttempts: quiz.maxAttempts - userProgress.attemptCount,
        totalAttempts: userProgress.attemptCount,
        maxAttempts: quiz.maxAttempts,
        lastAttemptDate: userProgress.lastAttemptDate,
        nextAttemptAllowed
      });

    } catch (error) {
      this.handleError(error, 'AttemptManagementService.checkAttemptEligibility');
    }
  }

  /**
   * Perform comprehensive security validation
   */
  async performSecurityValidation(
    userId: string,
    quizId: string,
    attemptData?: {
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      interactionData?: AttemptInteractionData;
    }
  ): Promise<ServiceResult<SecurityValidation>> {
    try {
      const threats: SecurityThreat[] = [];
      let riskScore = 0;
      const recommendations: string[] = [];

      // Get user's attempt history for analysis
      const attempts = await quizAttemptRepository.findUserAttempts(userId, quizId);
      
      // Check for timing anomalies
      if (attempts.length > 0) {
        const timingThreats = this.detectTimingAnomalies(attempts);
        threats.push(...timingThreats);
        riskScore += timingThreats.length * 10;
      }

      // Check for suspicious patterns in previous attempts
      if (attempts.length > 1) {
        const patternThreats = this.detectSuspiciousPatterns(attempts);
        threats.push(...patternThreats);
        riskScore += patternThreats.length * 15;
      }

      // Check current attempt data if provided
      if (attemptData) {
        // Session validation
        if (attemptData.sessionId) {
          const sessionThreats = await this.validateSession(userId, attemptData.sessionId);
          threats.push(...sessionThreats);
          riskScore += sessionThreats.length * 20;
        }

        // Interaction data analysis
        if (attemptData.interactionData) {
          const interactionThreats = this.analyzeInteractionData(attemptData.interactionData);
          threats.push(...interactionThreats);
          riskScore += interactionThreats.length * 5;
        }

        // IP and User Agent validation
        if (attemptData.ipAddress && attemptData.userAgent) {
          const deviceThreats = this.validateDeviceConsistency(
            userId,
            quizId,
            attemptData.ipAddress,
            attemptData.userAgent,
            attempts
          );
          threats.push(...deviceThreats);
          riskScore += deviceThreats.length * 8;
        }
      }

      // Generate recommendations based on threats
      if (threats.some(t => t.type === 'timing_anomaly')) {
        recommendations.push('Monitor completion times for unusual patterns');
      }
      if (threats.some(t => t.type === 'answer_manipulation')) {
        recommendations.push('Review answer submission patterns');
      }
      if (threats.some(t => t.type === 'multiple_sessions')) {
        recommendations.push('Implement stricter session management');
      }
      if (threats.some(t => t.type === 'suspicious_pattern')) {
        recommendations.push('Consider manual review of attempt');
      }

      // Cap risk score at 100
      riskScore = Math.min(riskScore, 100);

      const isValid = riskScore < 70; // Threshold for blocking attempts

      const result: SecurityValidation = {
        isValid,
        threats,
        riskScore,
        recommendations
      };

      // Audit security check
      this.audit({
        event: 'awareness.quiz.validation.suspicious',
        userId,
        resource: quizId,
        metadata: {
          riskScore,
          threatCount: threats.length,
          isValid,
          criticalThreats: threats.filter(t => t.severity === 'critical').length,
          highThreats: threats.filter(t => t.severity === 'high').length
        }
      });

      return serviceSuccess(result);
    } catch (error) {
      this.handleError(error, 'AttemptManagementService.performSecurityValidation');
    }
  }

  /**
   * Get detailed attempt history with analytics
   */
  async getAttemptHistory(
    userId: string,
    quizId: string,
    options: {
      includeInteractionData?: boolean;
      includeSecurityFlags?: boolean;
    } = {}
  ): Promise<ServiceResult<AttemptHistory[]>> {
    try {
      const {
        includeInteractionData = false,
        includeSecurityFlags = false
      } = options;

      const attempts = await quizAttemptRepository.findUserAttempts(userId, quizId);
      
      const history: AttemptHistory[] = attempts.map(attempt => {
        const historyItem: AttemptHistory = {
          attemptId: attempt.id,
          startedAt: attempt.startedAt,
          completedAt: attempt.completedAt || undefined,
          score: attempt.score,
          timeTakenSeconds: attempt.timeTakenSeconds,
          isCompleted: attempt.isCompleted,
          securityFlags: []
        };

        // Add interaction data if requested and available
        if (includeInteractionData && attempt.interactionData) {
          historyItem.interactionData = attempt.interactionData;
        }

        // Add security flags if requested
        if (includeSecurityFlags) {
          historyItem.securityFlags = this.generateSecurityFlags(attempt);
        }

        return historyItem;
      });

      return serviceSuccess(history);
    } catch (error) {
      this.handleError(error, 'AttemptManagementService.getAttemptHistory');
    }
  }

  /**
   * Generate analytics for user's quiz attempts
   */
  async generateAttemptAnalytics(
    userId: string,
    quizId: string
  ): Promise<ServiceResult<AttemptAnalytics>> {
    try {
      const attempts = await quizAttemptRepository.findUserAttempts(userId, quizId);
      const completedAttempts = attempts.filter(a => a.isCompleted);

      if (attempts.length === 0) {
        return serviceError('No attempts found for analysis', AwarenessLabErrorCode.QUIZ_NOT_STARTED);
      }

      // Calculate basic statistics
      const totalAttempts = attempts.length;
      const completedCount = completedAttempts.length;
      const scores = completedAttempts.map(a => a.score);
      const times = completedAttempts.map(a => a.timeTakenSeconds);

      const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
      const averageTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
      const fastestTime = times.length > 0 ? Math.min(...times) : 0;
      const slowestTime = times.length > 0 ? Math.max(...times) : 0;

      // Determine improvement trend
      let improvementTrend: 'improving' | 'declining' | 'stable' = 'stable';
      if (completedAttempts.length >= 2) {
        const recentScores = completedAttempts.slice(-3).map(a => a.score);
        const earlierScores = completedAttempts.slice(0, -3).map(a => a.score);
        
        if (recentScores.length > 0 && earlierScores.length > 0) {
          const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
          const earlierAvg = earlierScores.reduce((a, b) => a + b, 0) / earlierScores.length;
          
          if (recentAvg > earlierAvg + 5) {
            improvementTrend = 'improving';
          } else if (recentAvg < earlierAvg - 5) {
            improvementTrend = 'declining';
          }
        }
      }

      // Detect suspicious patterns
      const suspiciousPatterns = this.detectAnalyticsPatterns(attempts);

      // Calculate risk assessment
      let riskAssessment: 'low' | 'medium' | 'high' = 'low';
      if (suspiciousPatterns.length > 2) {
        riskAssessment = 'high';
      } else if (suspiciousPatterns.length > 0) {
        riskAssessment = 'medium';
      }

      const analytics: AttemptAnalytics = {
        userId,
        quizId,
        totalAttempts,
        completedAttempts: completedCount,
        averageScore: Math.round(averageScore * 100) / 100,
        bestScore,
        averageTime: Math.round(averageTime),
        fastestTime,
        slowestTime,
        improvementTrend,
        suspiciousPatterns,
        riskAssessment
      };

      return serviceSuccess(analytics);
    } catch (error) {
      this.handleError(error, 'AttemptManagementService.generateAttemptAnalytics');
    }
  }

  /**
   * Detect timing anomalies in attempts
   */
  private detectTimingAnomalies(attempts: any[]): SecurityThreat[] {
    const threats: SecurityThreat[] = [];
    const completedAttempts = attempts.filter(a => a.isCompleted);

    if (completedAttempts.length < 2) return threats;

    const times = completedAttempts.map(a => a.timeTakenSeconds);
    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    // Check for unusually fast completion
    if (minTime < 30) { // Less than 30 seconds
      threats.push({
        type: 'timing_anomaly',
        severity: 'high',
        description: `Unusually fast completion time: ${minTime} seconds`,
        evidence: { minTime, averageTime },
        timestamp: new Date()
      });
    }

    // Check for extreme time variations
    if (maxTime > averageTime * 3 && minTime < averageTime / 3) {
      threats.push({
        type: 'timing_anomaly',
        severity: 'medium',
        description: 'Extreme variation in completion times',
        evidence: { minTime, maxTime, averageTime },
        timestamp: new Date()
      });
    }

    return threats;
  }

  /**
   * Detect suspicious patterns in attempts
   */
  private detectSuspiciousPatterns(attempts: any[]): SecurityThreat[] {
    const threats: SecurityThreat[] = [];
    const completedAttempts = attempts.filter(a => a.isCompleted);

    if (completedAttempts.length < 2) return threats;

    // Check for identical scores
    const scores = completedAttempts.map(a => a.score);
    const uniqueScores = new Set(scores);
    if (uniqueScores.size === 1 && scores.length > 2) {
      threats.push({
        type: 'suspicious_pattern',
        severity: 'medium',
        description: 'All attempts have identical scores',
        evidence: { scores },
        timestamp: new Date()
      });
    }

    // Check for perfect progression
    const sortedScores = [...scores].sort((a, b) => a - b);
    const isProgression = scores.every((score, index) => 
      index === 0 || score >= scores[index - 1]
    );
    if (isProgression && scores.length > 2 && scores[scores.length - 1] === 100) {
      threats.push({
        type: 'suspicious_pattern',
        severity: 'medium',
        description: 'Perfect score progression pattern',
        evidence: { scores },
        timestamp: new Date()
      });
    }

    return threats;
  }

  /**
   * Validate session consistency
   */
  private async validateSession(userId: string, sessionId: string): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = [];

    // This would integrate with your session management system
    // For now, we'll implement basic checks

    try {
      // Check if session exists and belongs to user
      // This is a placeholder - implement based on your session system
      const sessionValid = true; // Replace with actual session validation

      if (!sessionValid) {
        threats.push({
          type: 'session_hijacking',
          severity: 'critical',
          description: 'Invalid or hijacked session detected',
          evidence: { sessionId, userId },
          timestamp: new Date()
        });
      }
    } catch (error) {
      threats.push({
        type: 'session_hijacking',
        severity: 'high',
        description: 'Session validation failed',
        evidence: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date()
      });
    }

    return threats;
  }

  /**
   * Analyze interaction data for suspicious behavior
   */
  private analyzeInteractionData(data: AttemptInteractionData): SecurityThreat[] {
    const threats: SecurityThreat[] = [];

    // Check for excessive tab switches
    if (data.tabSwitches > 10) {
      threats.push({
        type: 'suspicious_pattern',
        severity: 'medium',
        description: `Excessive tab switching: ${data.tabSwitches} times`,
        evidence: { tabSwitches: data.tabSwitches },
        timestamp: new Date()
      });
    }

    // Check for copy-paste events
    if (data.copyPasteEvents > 5) {
      threats.push({
        type: 'answer_manipulation',
        severity: 'high',
        description: `Multiple copy-paste events detected: ${data.copyPasteEvents}`,
        evidence: { copyPasteEvents: data.copyPasteEvents },
        timestamp: new Date()
      });
    }

    // Check for suspicious keyboard shortcuts
    const suspiciousShortcuts = data.keyboardShortcuts.filter(shortcut => 
      ['Ctrl+C', 'Ctrl+V', 'Ctrl+A', 'F12', 'Ctrl+Shift+I'].includes(shortcut)
    );
    if (suspiciousShortcuts.length > 3) {
      threats.push({
        type: 'answer_manipulation',
        severity: 'medium',
        description: 'Suspicious keyboard shortcuts detected',
        evidence: { shortcuts: suspiciousShortcuts },
        timestamp: new Date()
      });
    }

    return threats;
  }

  /**
   * Validate device consistency
   */
  private validateDeviceConsistency(
    userId: string,
    quizId: string,
    ipAddress: string,
    userAgent: string,
    previousAttempts: any[]
  ): SecurityThreat[] {
    const threats: SecurityThreat[] = [];

    // Check for IP address changes
    const previousIPs = previousAttempts
      .map(a => a.ipAddress)
      .filter(ip => ip && ip !== ipAddress);

    if (previousIPs.length > 0) {
      threats.push({
        type: 'multiple_sessions',
        severity: 'low',
        description: 'IP address changed between attempts',
        evidence: { currentIP: ipAddress, previousIPs },
        timestamp: new Date()
      });
    }

    // Check for user agent changes
    const previousUserAgents = previousAttempts
      .map(a => a.userAgent)
      .filter(ua => ua && ua !== userAgent);

    if (previousUserAgents.length > 0) {
      threats.push({
        type: 'multiple_sessions',
        severity: 'low',
        description: 'Device/browser changed between attempts',
        evidence: { currentUserAgent: userAgent, previousUserAgents },
        timestamp: new Date()
      });
    }

    return threats;
  }

  /**
   * Generate security flags for an attempt
   */
  private generateSecurityFlags(attempt: any): string[] {
    const flags: string[] = [];

    // Fast completion flag
    if (attempt.timeTakenSeconds < 60) {
      flags.push('FAST_COMPLETION');
    }

    // Perfect score flag
    if (attempt.score === 100) {
      flags.push('PERFECT_SCORE');
    }

    // Incomplete flag
    if (!attempt.isCompleted) {
      flags.push('INCOMPLETE');
    }

    return flags;
  }

  /**
   * Detect patterns in analytics data
   */
  private detectAnalyticsPatterns(attempts: any[]): string[] {
    const patterns: string[] = [];
    const completedAttempts = attempts.filter(a => a.isCompleted);

    if (completedAttempts.length === 0) return patterns;

    // Check for consistent improvement
    const scores = completedAttempts.map(a => a.score);
    const isConsistentImprovement = scores.every((score, index) => 
      index === 0 || score >= scores[index - 1]
    );
    if (isConsistentImprovement && scores.length > 2) {
      patterns.push('consistent_improvement');
    }

    // Check for time consistency
    const times = completedAttempts.map(a => a.timeTakenSeconds);
    const timeVariation = Math.max(...times) - Math.min(...times);
    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    if (timeVariation < averageTime * 0.1 && times.length > 2) {
      patterns.push('consistent_timing');
    }

    // Check for rapid attempts
    const attemptDates = attempts.map(a => new Date(a.startedAt));
    for (let i = 1; i < attemptDates.length; i++) {
      const timeDiff = attemptDates[i].getTime() - attemptDates[i - 1].getTime();
      if (timeDiff < 5 * 60 * 1000) { // Less than 5 minutes between attempts
        patterns.push('rapid_attempts');
        break;
      }
    }

    return patterns;
  }
}

// Export singleton instance
export const attemptManagementService = new AttemptManagementService();