'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Alert, AlertDescription, Button } from '@/components/ui';
import { Clock, AlertTriangle } from 'lucide-react';
import {
  RateLimitInfo,
  createRateLimitCountdown,
  formatRetryTime,
  getRateLimitMessage
} from '@/lib/utils/rate-limit-utils';

interface RateLimitTimerProps {
  rateLimitInfo: RateLimitInfo;
  onComplete?: () => void;
  showIcon?: boolean;
  variant?: 'default' | 'destructive';
  context?: string;
  className?: string;
}

export const RateLimitTimer: React.FC<RateLimitTimerProps> = ({
  rateLimitInfo,
  onComplete,
  showIcon = true,
  variant = 'destructive',
  context,
  className
}) => {
  const [remainingTime, setRemainingTime] = useState(rateLimitInfo.retryAfter || 0);

  const handleComplete = useCallback(() => {
    if (onComplete) {
      onComplete();
    }
  }, [onComplete]);

  // Set up countdown timer
  useEffect(() => {
    if (!rateLimitInfo.isRateLimited || (rateLimitInfo.retryAfter || 0) <= 0) {
      return;
    }

    const cleanup = createRateLimitCountdown(
      rateLimitInfo.retryAfter || 0,
      setRemainingTime,
      handleComplete
    );

    return cleanup;
  }, [rateLimitInfo.isRateLimited, rateLimitInfo.retryAfter, handleComplete]);

  // Don't render if not rate limited or time has expired
  if (!rateLimitInfo.isRateLimited || remainingTime <= 0) {
    return null;
  }

  const formattedTime = formatRetryTime(remainingTime);

  const message = context
    ? `Too many attempts. Please ${context} in ${formattedTime}.`
    : getRateLimitMessage(rateLimitInfo, context);

  const icon = showIcon ? (
    variant === 'destructive' ? (
      <AlertTriangle className="h-4 w-4" />
    ) : (
      <Clock className="h-4 w-4" />
    )
  ) : null;

  return (
    <Alert variant={variant} className={className}>
      {icon}
      <AlertDescription className="flex items-center gap-2">
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span>{message}</span>
      </AlertDescription>
    </Alert>
  );
};

interface RateLimitButtonTimerProps {
  rateLimitInfo: RateLimitInfo;
  onComplete?: () => void;
  children: React.ReactElement<{ disabled?: boolean; className?: string; children?: React.ReactNode }>;
  defaultText?: string;
  waitingText?: string;
  showCountdown?: boolean;
  className?: string;
}

export const RateLimitButtonTimer: React.FC<RateLimitButtonTimerProps> = ({
  rateLimitInfo,
  onComplete,
  children,
  defaultText = 'Try again',
  waitingText = 'Wait',
  showCountdown = true,
  className
}) => {
  const [remainingTime, setRemainingTime] = useState(rateLimitInfo.retryAfter || 0);

  const handleComplete = useCallback(() => {
    if (onComplete) {
      onComplete();
    }
  }, [onComplete]);

  // Set up countdown timer
  useEffect(() => {
    if (!rateLimitInfo.isRateLimited || (rateLimitInfo.retryAfter || 0) <= 0) {
      return;
    }

    const cleanup = createRateLimitCountdown(
      rateLimitInfo.retryAfter || 0,
      setRemainingTime,
      handleComplete
    );

    return cleanup;
  }, [rateLimitInfo.isRateLimited, rateLimitInfo.retryAfter, handleComplete]);

  // If not rate limited, return the original children
  if (!rateLimitInfo.isRateLimited || remainingTime <= 0) {
    return children;
  }

  // Clone the button and modify its text and disabled state
  const buttonText = showCountdown
    ? `${waitingText} ${formatRetryTime(remainingTime)}`
    : waitingText;

  // Type-safe cloneElement for Button components
  return React.cloneElement(children, {
    disabled: true,
    children: buttonText,
    className: `${children.props.className || ''} ${className || ''}`.trim()
  });
};

interface RateLimitCountdownProps {
  rateLimitInfo: RateLimitInfo;
  onComplete?: () => void;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const RateLimitCountdown: React.FC<RateLimitCountdownProps> = ({
  rateLimitInfo,
  onComplete,
  prefix = '',
  suffix = '',
  className = ''
}) => {
  const [remainingTime, setRemainingTime] = useState(rateLimitInfo.retryAfter || 0);

  const handleComplete = useCallback(() => {
    if (onComplete) {
      onComplete();
    }
  }, [onComplete]);

  // Set up countdown timer
  useEffect(() => {
    if (!rateLimitInfo.isRateLimited || (rateLimitInfo.retryAfter || 0) <= 0) {
      return;
    }

    const cleanup = createRateLimitCountdown(
      rateLimitInfo.retryAfter || 0,
      setRemainingTime,
      handleComplete
    );

    return cleanup;
  }, [rateLimitInfo.isRateLimited, rateLimitInfo.retryAfter, handleComplete]);

  // Don't render if not rate limited or time has expired
  if (!rateLimitInfo.isRateLimited || remainingTime <= 0) {
    return null;
  }

  const formattedTime = formatRetryTime(remainingTime);

  return (
    <span className={className}>
      {prefix}{formattedTime}{suffix}
    </span>
  );
};
