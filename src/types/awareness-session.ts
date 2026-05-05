// Awareness Session Types and Enums

export type AwarenessSessionStatus =
  | 'pending_admin_review'
  | 'forwarded_to_expert'
  | 'confirmed'
  | 'rejected'
  | 'expert_declined';

export type SessionDuration = '1_hour' | '2_hours' | 'half_day' | 'full_day';

export type SessionMode = 'on_site' | 'online';

export type AudienceType = 'women' | 'kids' | 'adults' | 'mixed' | 'corporate_staff' | 'students';

// Database entity interface
export interface AwarenessSessionRequest {
  id: string;
  requesterId: string;
  sessionDate: Date;
  location: string;
  duration: SessionDuration;
  subject: string;
  audienceSize: number;
  audienceTypes: AudienceType[];
  sessionMode: SessionMode;
  specialRequirements?: string;
  organizationName: string;
  contactEmail: string;
  contactPhone: string;
  status: AwarenessSessionStatus;
  assignedExpertId?: string;
  adminNotes?: string;
  expertNotes?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt?: Date;
  confirmedAt?: Date;
}

// API response interface with string dates for frontend consumption
export interface AwarenessSessionRequestResponse {
  id: string;
  requesterId: string;
  sessionDate: string;
  location: string;
  duration: SessionDuration;
  subject: string;
  audienceSize: number;
  audienceTypes: AudienceType[];
  sessionMode: SessionMode;
  specialRequirements?: string;
  organizationName: string;
  contactEmail: string;
  contactPhone: string;
  status: AwarenessSessionStatus;
  assignedExpertId?: string;
  adminNotes?: string;
  expertNotes?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  confirmedAt?: string;
}

// Status history interface
export interface AwarenessSessionStatusHistory {
  id: string;
  sessionRequestId: string;
  previousStatus?: AwarenessSessionStatus;
  newStatus: AwarenessSessionStatus;
  changedBy: string;
  notes?: string;
  createdAt: Date;
}

// API response interface for status history
export interface AwarenessSessionStatusHistoryResponse {
  id: string;
  sessionRequestId: string;
  previousStatus?: AwarenessSessionStatus;
  newStatus: AwarenessSessionStatus;
  changedBy: string;
  notes?: string;
  createdAt: string;
}

// Create request data interface
export interface CreateAwarenessSessionData {
  sessionDate: Date;
  location: string;
  duration: SessionDuration;
  subject: string;
  audienceSize: number;
  audienceTypes: AudienceType[];
  sessionMode: SessionMode;
  specialRequirements?: string;
  organizationName: string;
  contactEmail: string;
  contactPhone: string;
}

// Update request data interface
export interface UpdateAwarenessSessionData {
  sessionDate?: Date;
  location?: string;
  duration?: SessionDuration;
  subject?: string;
  audienceSize?: number;
  audienceTypes?: AudienceType[];
  sessionMode?: SessionMode;
  specialRequirements?: string;
  organizationName?: string;
  contactEmail?: string;
  contactPhone?: string;
  adminNotes?: string;
  expertNotes?: string;
  rejectionReason?: string;
}

// Admin review action interface
export interface AdminReviewAction {
  action: 'approve' | 'reject';
  notes?: string;
  expertId?: string; // Required when approving
}

// Expert response action interface
export interface ExpertResponseAction {
  action: 'accept' | 'decline';
  notes?: string;
}

// Status transition validation
export const VALID_STATUS_TRANSITIONS: Record<AwarenessSessionStatus, AwarenessSessionStatus[]> = {
  'pending_admin_review': ['forwarded_to_expert', 'rejected'],
  'forwarded_to_expert': ['confirmed', 'expert_declined'],
  'expert_declined': ['forwarded_to_expert', 'rejected'],
  'confirmed': [], // Terminal state
  'rejected': [], // Terminal state
};

// Duration display labels
export const DURATION_LABELS: Record<SessionDuration, string> = {
  '1_hour': '1 Hour',
  '2_hours': '2 Hours',
  'half_day': 'Half Day (4 hours)',
  'full_day': 'Full Day (8 hours)',
};

// Session mode display labels
export const SESSION_MODE_LABELS: Record<SessionMode, string> = {
  'on_site': 'On-site',
  'online': 'Online',
};

// Audience type display labels
export const AUDIENCE_TYPE_LABELS: Record<AudienceType, string> = {
  'women': 'Women',
  'kids': 'Kids',
  'adults': 'Adults',
  'mixed': 'Mixed Audience',
  'corporate_staff': 'Corporate Staff',
  'students': 'Students',
};

// Status display labels
export const STATUS_LABELS: Record<AwarenessSessionStatus, string> = {
  'pending_admin_review': 'Pending Admin Review',
  'forwarded_to_expert': 'Forwarded to Trainer',
  'confirmed': 'Confirmed',
  'rejected': 'Rejected',
  'expert_declined': 'Trainer Declined',
};
