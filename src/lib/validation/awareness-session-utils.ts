import {
  AwarenessSessionStatus,
  AwarenessSessionRequest,
  VALID_STATUS_TRANSITIONS,
  SessionDuration,
  SessionMode,
  AudienceType,
  DURATION_LABELS,
  SESSION_MODE_LABELS,
  AUDIENCE_TYPE_LABELS,
  STATUS_LABELS
} from '../../types/awareness-session';
import { ValidationResult } from './types';

/**
 * Validates if a status transition is allowed
 */
export function isValidStatusTransition(
  currentStatus: AwarenessSessionStatus,
  newStatus: AwarenessSessionStatus
): boolean {
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
}

/**
 * Gets all valid next statuses for a given current status
 */
export function getValidNextStatuses(
  currentStatus: AwarenessSessionStatus
): AwarenessSessionStatus[] {
  return VALID_STATUS_TRANSITIONS[currentStatus] || [];
}

/**
 * Validates a status transition and returns detailed result
 */
export function validateStatusTransition(
  currentStatus: AwarenessSessionStatus,
  newStatus: AwarenessSessionStatus,
  context?: {
    expertId?: string;
    notes?: string;
    isAdminAction?: boolean;
    isExpertAction?: boolean;
  }
): ValidationResult<{ isValid: boolean; reason?: string }> {
  const errors: Record<string, string> = {};

  // Check if transition is valid
  if (!isValidStatusTransition(currentStatus, newStatus)) {
    errors.status = `Cannot transition from ${STATUS_LABELS[currentStatus]} to ${STATUS_LABELS[newStatus]}`;
    return {
      success: false,
      errors,
      data: { isValid: false, reason: errors.status }
    };
  }

  // Additional business rule validations
  if (newStatus === 'forwarded_to_expert') {
    if (!context?.expertId) {
      errors.expertId = 'Expert assignment is required when forwarding to expert';
    }
    if (!context?.isAdminAction) {
      errors.permission = 'Only admins can forward requests to experts';
    }
  }

  if (newStatus === 'rejected') {
    if (!context?.notes) {
      errors.notes = 'Rejection reason is required when rejecting a request';
    }
    if (!context?.isAdminAction) {
      errors.permission = 'Only admins can reject requests';
    }
  }

  if (newStatus === 'confirmed') {
    if (!context?.isExpertAction) {
      errors.permission = 'Only assigned experts can confirm requests';
    }
  }

  if (newStatus === 'expert_declined') {
    if (!context?.isExpertAction) {
      errors.permission = 'Only assigned experts can decline requests';
    }
  }

  const hasErrors = Object.keys(errors).length > 0;
  return {
    success: !hasErrors,
    errors,
    data: { isValid: !hasErrors, reason: hasErrors ? Object.values(errors)[0] : undefined }
  };
}

/**
 * Checks if a request can be modified by the requester
 */
export function canModifyRequest(status: AwarenessSessionStatus): boolean {
  // Only allow modifications when pending admin review
  return status === 'pending_admin_review';
}

/**
 * Checks if a request can be cancelled by the requester
 */
export function canCancelRequest(status: AwarenessSessionStatus): boolean {
  // Allow cancellation before confirmation
  return status !== 'confirmed' && status !== 'rejected';
}

/**
 * Checks if an admin can review a request
 */
export function canAdminReview(status: AwarenessSessionStatus): boolean {
  return status === 'pending_admin_review' || status === 'expert_declined';
}

/**
 * Checks if an expert can respond to a request
 */
export function canExpertRespond(status: AwarenessSessionStatus): boolean {
  return status === 'forwarded_to_expert';
}

/**
 * Validates session date is not in the past
 */
export function isValidSessionDate(sessionDate: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  return sessionDate >= today;
}

/**
 * Validates session date is within reasonable future range (e.g., 1 year)
 */
export function isSessionDateWithinRange(sessionDate: Date, maxMonthsAhead: number = 12): boolean {
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + maxMonthsAhead);
  return sessionDate <= maxDate;
}

/**
 * Validates audience size is reasonable for session mode
 */
export function isValidAudienceSizeForMode(
  audienceSize: number,
  sessionMode: SessionMode
): ValidationResult<{ isValid: boolean; suggestion?: string }> {
  const errors: Record<string, string> = {};

  if (sessionMode === 'online') {
    if (audienceSize > 500) {
      errors.audienceSize = 'Online sessions are recommended for audiences up to 500 participants';
      return {
        success: false,
        errors,
        data: { 
          isValid: false, 
          suggestion: 'Consider splitting into multiple sessions or using on-site format for larger audiences'
        }
      };
    }
  }

  if (sessionMode === 'on_site') {
    if (audienceSize > 1000) {
      errors.audienceSize = 'On-site sessions may require special arrangements for audiences over 1000';
      return {
        success: false,
        errors,
        data: { 
          isValid: false, 
          suggestion: 'Large on-site sessions may require additional logistics and equipment'
        }
      };
    }
  }

  return {
    success: true,
    errors: {},
    data: { isValid: true }
  };
}

/**
 * Validates duration is appropriate for audience type
 */
export function isValidDurationForAudience(
  duration: SessionDuration,
  audienceTypes: AudienceType[]
): ValidationResult<{ isValid: boolean; suggestion?: string }> {
  const errors: Record<string, string> = {};

  // Kids sessions should be shorter
  if (audienceTypes.includes('kids')) {
    if (duration === 'full_day') {
      errors.duration = 'Full day sessions are not recommended for kids';
      return {
        success: false,
        errors,
        data: { 
          isValid: false, 
          suggestion: 'Consider shorter sessions (1-2 hours) for children audiences'
        }
      };
    }
  }

  return {
    success: true,
    errors: {},
    data: { isValid: true }
  };
}

/**
 * Normalizes contact email
 */
export function normalizeContactEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Formats phone number for storage
 */
export function formatContactPhone(phone: string): string {
  // Remove all non-digit characters except +
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Validates organization name format
 */
export function isValidOrganizationName(name: string): boolean {
  // Allow letters, numbers, spaces, and common punctuation
  const validPattern = /^[a-zA-Z0-9\s\-_.,&()]+$/;
  return validPattern.test(name.trim());
}

/**
 * Sanitizes text input for special requirements and notes
 */
export function sanitizeTextInput(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[\r\n]+/g, '\n'); // Normalize line breaks
}

/**
 * Gets human-readable status description
 */
export function getStatusDescription(status: AwarenessSessionStatus): string {
  const descriptions: Record<AwarenessSessionStatus, string> = {
    'pending_admin_review': 'Your request is being reviewed by our admin team',
    'forwarded_to_expert': 'Your request has been forwarded to an expert for confirmation',
    'confirmed': 'Your session has been confirmed by the expert',
    'rejected': 'Your request has been rejected',
    'expert_declined': 'The assigned expert has declined your request, we are finding another expert'
  };
  
  return descriptions[status] || 'Unknown status';
}

/**
 * Gets next action description for status
 */
export function getNextActionDescription(status: AwarenessSessionStatus): string {
  const actions: Record<AwarenessSessionStatus, string> = {
    'pending_admin_review': 'Waiting for admin review',
    'forwarded_to_expert': 'Waiting for expert response',
    'confirmed': 'Session confirmed - check your email for details',
    'rejected': 'Request closed - you may submit a new request',
    'expert_declined': 'Finding alternative expert'
  };
  
  return actions[status] || 'No action required';
}

/**
 * Calculates estimated session duration in minutes
 */
export function getSessionDurationMinutes(duration: SessionDuration): number {
  const durations: Record<SessionDuration, number> = {
    '1_hour': 60,
    '2_hours': 120,
    'half_day': 240, // 4 hours
    'full_day': 480, // 8 hours
  };
  
  return durations[duration];
}

/**
 * Validates if expert is available for the session date
 * This is a placeholder for future integration with expert calendar
 */
export function isExpertAvailable(
  expertId: string,
  sessionDate: Date,
  duration: SessionDuration
): Promise<boolean> {
  // TODO: Implement actual expert availability check
  // This would integrate with expert calendar/schedule system
  return Promise.resolve(true);
}

/**
 * Gets business rules summary for a request
 */
export function getBusinessRulesSummary(request: Partial<AwarenessSessionRequest>): {
  warnings: string[];
  suggestions: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const errors: string[] = [];

  if (request.sessionDate) {
    if (!isValidSessionDate(request.sessionDate)) {
      errors.push('Session date cannot be in the past');
    }
    
    if (!isSessionDateWithinRange(request.sessionDate)) {
      warnings.push('Session date is more than 12 months in the future');
    }
  }

  if (request.audienceSize && request.sessionMode) {
    const audienceValidation = isValidAudienceSizeForMode(request.audienceSize, request.sessionMode);
    if (!audienceValidation.success) {
      warnings.push(Object.values(audienceValidation.errors)[0]);
      if (audienceValidation.data?.suggestion) {
        suggestions.push(audienceValidation.data.suggestion);
      }
    }
  }

  if (request.duration && request.audienceTypes) {
    const durationValidation = isValidDurationForAudience(request.duration, request.audienceTypes);
    if (!durationValidation.success) {
      warnings.push(Object.values(durationValidation.errors)[0]);
      if (durationValidation.data?.suggestion) {
        suggestions.push(durationValidation.data.suggestion);
      }
    }
  }

  if (request.organizationName && !isValidOrganizationName(request.organizationName)) {
    errors.push('Organization name contains invalid characters');
  }

  return { warnings, suggestions, errors };
}

/**
 * Utility function to format display values
 */
export const formatDisplayValue = {
  duration: (duration: SessionDuration) => DURATION_LABELS[duration],
  sessionMode: (mode: SessionMode) => SESSION_MODE_LABELS[mode],
  audienceTypes: (types: AudienceType[]) => types.map(type => AUDIENCE_TYPE_LABELS[type]).join(', '),
  status: (status: AwarenessSessionStatus) => STATUS_LABELS[status],
  audienceSize: (size: number) => size.toLocaleString(),
  sessionDate: (date: Date) => date.toLocaleDateString(),
};