import { z } from 'zod';
import {
  AwarenessSessionStatus,
  SessionDuration,
  SessionMode,
  AudienceType,
  VALID_STATUS_TRANSITIONS
} from '../../types/awareness-session';
import { emailSchema, requiredPhoneNumberSchema, noHtmlTagsRegex, noHtmlTagsErrorMessage } from './schemas';

// Base field schemas for awareness sessions
export const sessionDateSchema = z
  .string()
  .min(1, 'Session date is required')
  .refine((dateString) => {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }, 'Please enter a valid date')
  .refine((dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
    return date >= today;
  }, 'Session date must be today or in the future');

export const locationSchema = z
  .string()
  .min(1, 'Location is required')
  .max(500, 'Location must be less than 500 characters')
  .regex(noHtmlTagsRegex, noHtmlTagsErrorMessage);

export const durationSchema = z.enum(['1_hour', '2_hours', 'half_day', 'full_day'], {
  message: 'Please select a valid duration'
});

export const subjectSchema = z
  .string()
  .min(1, 'Subject/topic is required')
  .max(500, 'Subject must be less than 500 characters')
  .regex(noHtmlTagsRegex, noHtmlTagsErrorMessage);

export const audienceSizeSchema = z
  .number()
  .min(1, 'Audience size must be at least 1')
  .max(10000, 'Audience size cannot exceed 10,000')
  .int('Audience size must be a whole number');

export const audienceTypesSchema = z
  .array(z.enum(['women', 'kids', 'adults', 'mixed', 'corporate_staff', 'students']))
  .min(1, 'At least one audience type must be selected')
  .max(6, 'Cannot select more than 6 audience types');

export const sessionModeSchema = z.enum(['on_site', 'online'], {
  message: 'Please select a valid session mode'
});

export const specialRequirementsSchema = z
  .string()
  .max(2000, 'Special requirements must be less than 2000 characters')
  .regex(noHtmlTagsRegex, noHtmlTagsErrorMessage)
  .optional();

export const organizationNameSchema = z
  .string()
  .min(1, 'Organization name is required')
  .max(200, 'Organization name must be less than 200 characters')
  .regex(noHtmlTagsRegex, noHtmlTagsErrorMessage);

export const contactEmailSchema = emailSchema;

export const contactPhoneSchema = requiredPhoneNumberSchema;

export const adminNotesSchema = z
  .string()
  .max(1000, 'Admin notes must be less than 1000 characters')
  .regex(noHtmlTagsRegex, noHtmlTagsErrorMessage)
  .optional();

export const expertNotesSchema = z
  .string()
  .max(1000, 'Expert notes must be less than 1000 characters')
  .regex(noHtmlTagsRegex, noHtmlTagsErrorMessage)
  .optional();

export const rejectionReasonSchema = z
  .string()
  .min(1, 'Rejection reason is required when rejecting a request')
  .max(1000, 'Rejection reason must be less than 1000 characters')
  .regex(noHtmlTagsRegex, noHtmlTagsErrorMessage);

// Main awareness session request schema
export const createAwarenessSessionSchema = z.object({
  sessionDate: sessionDateSchema,
  location: locationSchema,
  duration: durationSchema,
  subject: subjectSchema,
  audienceSize: audienceSizeSchema,
  audienceTypes: audienceTypesSchema,
  sessionMode: sessionModeSchema,
  specialRequirements: specialRequirementsSchema,
  organizationName: organizationNameSchema,
  contactEmail: contactEmailSchema,
  contactPhone: contactPhoneSchema,
});

// Admin review action schema
export const reviewAwarenessSessionSchema = z.object({
  action: z.enum(['approve', 'reject'], {
    message: 'Action must be either approve or reject'
  }),
  notes: adminNotesSchema,
  expertId: z.string().uuid('Expert ID must be a valid UUID').optional(),
}).refine((data) => {
  // If approving, expertId is required
  if (data.action === 'approve') {
    return data.expertId && data.expertId.trim() !== '';
  }
  return true;
}, {
  message: 'Expert must be assigned when approving a request',
  path: ['expertId']
}).refine((data) => {
  // If rejecting, notes are required
  if (data.action === 'reject') {
    return data.notes && data.notes.trim() !== '';
  }
  return true;
}, {
  message: 'Notes are required when rejecting a request',
  path: ['notes']
});

// Expert response action schema
export const respondToAwarenessSessionSchema = z.object({
  action: z.enum(['accept', 'decline'], {
    message: 'Action must be either accept or decline'
  }),
  notes: expertNotesSchema,
}).refine((data) => {
  // If declining, notes are recommended but not required
  // This allows flexibility for experts
  return true;
}, {
  message: 'Notes are recommended when declining a request',
  path: ['notes']
});

// Update awareness session schema (for partial updates)
export const updateAwarenessSessionSchema = z.object({
  sessionDate: sessionDateSchema.optional(),
  location: locationSchema.optional(),
  duration: durationSchema.optional(),
  subject: subjectSchema.optional(),
  audienceSize: audienceSizeSchema.optional(),
  audienceTypes: audienceTypesSchema.optional(),
  sessionMode: sessionModeSchema.optional(),
  specialRequirements: specialRequirementsSchema,
  organizationName: organizationNameSchema.optional(),
  contactEmail: contactEmailSchema.optional(),
  contactPhone: contactPhoneSchema.optional(),
  adminNotes: adminNotesSchema,
  expertNotes: expertNotesSchema,
  rejectionReason: rejectionReasonSchema.optional(),
});

// Status update schema
export const updateStatusSchema = z.object({
  status: z.enum(['pending_admin_review', 'forwarded_to_expert', 'confirmed', 'rejected', 'expert_declined'], {
    message: 'Invalid status value'
  }),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
});

// Expert assignment schema
export const assignExpertSchema = z.object({
  expertId: z.string().uuid('Expert ID must be a valid UUID'),
  notes: adminNotesSchema,
});

// Query parameters schema for filtering requests
export const awarenessSessionQuerySchema = z.object({
  status: z.enum(['pending_admin_review', 'forwarded_to_expert', 'confirmed', 'rejected', 'expert_declined']).optional(),
  expertId: z.string().uuid().optional(),
  requesterId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

// Type exports
export type CreateAwarenessSessionData = z.infer<typeof createAwarenessSessionSchema>;
export type ReviewAwarenessSessionData = z.infer<typeof reviewAwarenessSessionSchema>;
export type RespondToAwarenessSessionData = z.infer<typeof respondToAwarenessSessionSchema>;
export type UpdateAwarenessSessionData = z.infer<typeof updateAwarenessSessionSchema>;
export type UpdateStatusData = z.infer<typeof updateStatusSchema>;
export type AssignExpertData = z.infer<typeof assignExpertSchema>;
export type AwarenessSessionQueryData = z.infer<typeof awarenessSessionQuerySchema>;

// Schema collections for easy access
export const awarenessSessionSchemas = {
  create: createAwarenessSessionSchema,
  review: reviewAwarenessSessionSchema,
  respond: respondToAwarenessSessionSchema,
  update: updateAwarenessSessionSchema,
  updateStatus: updateStatusSchema,
  assignExpert: assignExpertSchema,
  query: awarenessSessionQuerySchema,
} as const;

// Field schemas for individual validation
export const awarenessSessionFieldSchemas = {
  sessionDate: sessionDateSchema,
  location: locationSchema,
  duration: durationSchema,
  subject: subjectSchema,
  audienceSize: audienceSizeSchema,
  audienceTypes: audienceTypesSchema,
  sessionMode: sessionModeSchema,
  specialRequirements: specialRequirementsSchema,
  organizationName: organizationNameSchema,
  contactEmail: contactEmailSchema,
  contactPhone: contactPhoneSchema,
  adminNotes: adminNotesSchema,
  expertNotes: expertNotesSchema,
  rejectionReason: rejectionReasonSchema,
} as const;
