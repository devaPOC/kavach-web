'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RotateCcw,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

interface AttemptLimitDisplayProps {
  quizId: string;
  userId: string;
  maxAttempts: number;
  onAttemptStart?: () => void;
  className?: string;
}

interface AttemptStatus {
  canAttempt: boolean;
  remainingAttempts: number;
  totalAttempts: number;
  maxAttempts: number;
  lastAttemptDate?: Date;
  nextAttemptAllowed?: Date;
  reason?: string;
  bestScore?: number;
  averageScore?: number;
  improvementTrend?: 'improving' | 'declining' | 'stable';
  riskAssessment?: 'low' | 'medium' | 'high';
}

/**
 * Component to display quiz attempt limits and user progress
 * Implements requirements 2.4 and 2.6 for attempt limit validation and clear messaging
 */
export function AttemptLimitDisplay({ 
  quizId, 
  userId, 
  maxAttempts, 
  onAttemptStart,
  className = '' 
}: AttemptLimitDisplayProps) {
  const [attemptStatus, setAttemptStatus] = useState<AttemptStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  /**
   * Fetch attempt status from the API
   */
  const fetchAttemptStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check attempt eligibility
      const eligibilityResponse = await fetch(`/api/v1/quizzes/${quizId}/attempt-eligibility`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!eligibilityResponse.ok) {
        throw new Error('Failed to check attempt eligibility');
      }

      const eligibilityResult = await eligibilityResponse.json();
      if (!eligibilityResult.success) {
        throw new Error(eligibilityResult.error || 'Failed to check attempt eligibility');
      }

      // Get attempt analytics
      const analyticsResponse = await fetch(`/api/v1/quizzes/${quizId}/attempt-analytics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      let analytics = null;
      if (analyticsResponse.ok) {
        const analyticsResult = await analyticsResponse.json();
        if (analyticsResult.success) {
          analytics = analyticsResult.data;
        }
      }

      const eligibility = eligibilityResult.data;
      
      setAttemptStatus({
        canAttempt: eligibility.canAttempt,
        remainingAttempts: eligibility.remainingAttempts,
        totalAttempts: eligibility.totalAttempts,
        maxAttempts: eligibility.maxAttempts,
        lastAttemptDate: eligibility.lastAttemptDate ? new Date(eligibility.lastAttemptDate) : undefined,
        nextAttemptAllowed: eligibility.nextAttemptAllowed ? new Date(eligibility.nextAttemptAllowed) : undefined,
        reason: eligibility.reason,
        bestScore: analytics?.bestScore,
        averageScore: analytics?.averageScore,
        improvementTrend: analytics?.improvementTrend,
        riskAssessment: analytics?.riskAssessment
      });

      // Set up cooldown timer if needed
      if (eligibility.nextAttemptAllowed) {
        const cooldownEnd = new Date(eligibility.nextAttemptAllowed);
        const now = new Date();
        const remaining = Math.max(0, Math.floor((cooldownEnd.getTime() - now.getTime()) / 1000));
        setCooldownRemaining(remaining);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attempt status');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle cooldown timer
   */
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setInterval(() => {
        setCooldownRemaining(prev => {
          if (prev <= 1) {
            // Cooldown ended, refresh status
            fetchAttemptStatus();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [cooldownRemaining]);

  /**
   * Load attempt status on mount
   */
  useEffect(() => {
    fetchAttemptStatus();
  }, [quizId, userId]);

  /**
   * Format time remaining
   */
  const formatTimeRemaining = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  /**
   * Get progress percentage
   */
  const getProgressPercentage = (): number => {
    if (!attemptStatus) return 0;
    return (attemptStatus.totalAttempts / attemptStatus.maxAttempts) * 100;
  };

  /**
   * Get trend icon
   */
  const getTrendIcon = () => {
    if (!attemptStatus?.improvementTrend) return null;
    
    switch (attemptStatus.improvementTrend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-secondary" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  /**
   * Get risk badge color
   */
  const getRiskBadgeColor = (risk?: string) => {
    switch (risk) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary/50"></div>
            <span className="ml-2">Loading attempt status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert className="border-destructive bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              {error}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={fetchAttemptStatus} 
            variant="outline" 
            size="sm" 
            className="mt-3"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!attemptStatus) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Quiz Attempts</span>
          <div className="flex items-center space-x-2">
            {attemptStatus.riskAssessment && (
              <Badge variant={getRiskBadgeColor(attemptStatus.riskAssessment)}>
                <Shield className="h-3 w-3 mr-1" />
                {attemptStatus.riskAssessment.toUpperCase()} RISK
              </Badge>
            )}
            {getTrendIcon()}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Attempt Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Attempts Used</span>
            <span>{attemptStatus.totalAttempts} / {attemptStatus.maxAttempts}</span>
          </div>
          <Progress value={getProgressPercentage()} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{attemptStatus.remainingAttempts} remaining</span>
            <span>{Math.round(getProgressPercentage())}% used</span>
          </div>
        </div>

        {/* Performance Summary */}
        {(attemptStatus.bestScore !== undefined || attemptStatus.averageScore !== undefined) && (
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
            {attemptStatus.bestScore !== undefined && (
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary">{attemptStatus.bestScore}%</div>
                <div className="text-xs text-muted-foreground">Best Score</div>
              </div>
            )}
            {attemptStatus.averageScore !== undefined && (
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{Math.round(attemptStatus.averageScore)}%</div>
                <div className="text-xs text-muted-foreground">Average Score</div>
              </div>
            )}
          </div>
        )}

        {/* Last Attempt Info */}
        {attemptStatus.lastAttemptDate && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="h-4 w-4 mr-2" />
            Last attempt: {attemptStatus.lastAttemptDate.toLocaleDateString()} at {attemptStatus.lastAttemptDate.toLocaleTimeString()}
          </div>
        )}

        {/* Status Messages */}
        {attemptStatus.canAttempt ? (
          <Alert className="border-secondary/50 bg-secondary/10">
            <CheckCircle className="h-4 w-4 text-secondary" />
            <AlertDescription className="text-secondary">
              You can start a new quiz attempt. You have {attemptStatus.remainingAttempts} attempt{attemptStatus.remainingAttempts !== 1 ? 's' : ''} remaining.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-destructive bg-destructive/10">
            <XCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              {attemptStatus.reason || 'You cannot attempt this quiz at this time.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Cooldown Timer */}
        {cooldownRemaining > 0 && (
          <Alert className="border-accent/50 bg-accent/10">
            <Clock className="h-4 w-4 text-accent" />
            <AlertDescription className="text-accent">
              Next attempt available in: {formatTimeRemaining(cooldownRemaining)}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <Button
            onClick={onAttemptStart}
            disabled={!attemptStatus.canAttempt || cooldownRemaining > 0}
            className="w-full"
            size="lg"
          >
            {attemptStatus.canAttempt ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Start Quiz Attempt
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Cannot Start Attempt
              </>
            )}
          </Button>
        </div>

        {/* Additional Info */}
        {attemptStatus.totalAttempts > 0 && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            {attemptStatus.improvementTrend === 'improving' && 'Your scores are improving! Keep it up!'}
            {attemptStatus.improvementTrend === 'declining' && 'Consider reviewing the material before your next attempt.'}
            {attemptStatus.improvementTrend === 'stable' && 'Your performance has been consistent.'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}