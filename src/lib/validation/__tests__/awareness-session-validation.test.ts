import { describe, it, expect } from 'vitest';
import {
  createAwarenessSessionSchema,
  reviewAwarenessSessionSchema,
  respondToAwarenessSessionSchema,
  awarenessSessionSchemas,
} from '../awareness-session-schemas';
import {
  isValidStatusTransition,
  validateStatusTransition,
  canModifyRequest,
  canAdminReview,
  canExpertRespond,
  isValidSessionDate,
  getBusinessRulesSummary,
} from '../awareness-session-utils';
import { AudienceType } from '../../../types/awareness-session';

describe('Awareness Session Validation Schemas', () => {
  describe('createAwarenessSessionSchema', () => {
    it('should validate a complete valid request', () => {
      const validData = {
        sessionDate: '2025-12-01',
        location: 'Conference Room A',
        duration: '2_hours' as const,
        subject: 'Cybersecurity Awareness Training',
        audienceSize: 50,
        audienceTypes: ['corporate_staff'] as const,
        sessionMode: 'on_site' as const,
        organizationName: 'Tech Corp',
        contactEmail: 'contact@techcorp.com',
        contactPhone: '+96812345678',
        specialRequirements: 'Need projector and microphone',
      };

      const result = createAwarenessSessionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid session date', () => {
      const invalidData = {
        sessionDate: '2020-01-01', // Past date
        location: 'Conference Room A',
        duration: '2_hours' as const,
        subject: 'Cybersecurity Awareness Training',
        audienceSize: 50,
        audienceTypes: ['corporate_staff'] as const,
        sessionMode: 'on_site' as const,
        organizationName: 'Tech Corp',
        contactEmail: 'contact@techcorp.com',
        contactPhone: '+96812345678',
      };

      const result = createAwarenessSessionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('future');
      }
    });

    it('should reject invalid audience size', () => {
      const invalidData = {
        sessionDate: '2025-12-01',
        location: 'Conference Room A',
        duration: '2_hours' as const,
        subject: 'Cybersecurity Awareness Training',
        audienceSize: 0, // Invalid size
        audienceTypes: ['corporate_staff'] as const,
        sessionMode: 'on_site' as const,
        organizationName: 'Tech Corp',
        contactEmail: 'contact@techcorp.com',
        contactPhone: '+96812345678',
      };

      const result = createAwarenessSessionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should require at least one audience type', () => {
      const invalidData = {
        sessionDate: '2025-12-01',
        location: 'Conference Room A',
        duration: '2_hours' as const,
        subject: 'Cybersecurity Awareness Training',
        audienceSize: 50,
        audienceTypes: [], // Empty array
        sessionMode: 'on_site' as const,
        organizationName: 'Tech Corp',
        contactEmail: 'contact@techcorp.com',
        contactPhone: '+96812345678',
      };

      const result = createAwarenessSessionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('reviewAwarenessSessionSchema', () => {
    it('should validate approval with expert assignment', () => {
      const validData = {
        action: 'approve' as const,
        expertId: '123e4567-e89b-12d3-a456-426614174000',
        notes: 'Approved for expert assignment',
      };

      const result = reviewAwarenessSessionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should require expert ID when approving', () => {
      const invalidData = {
        action: 'approve' as const,
        notes: 'Approved but no expert assigned',
      };

      const result = reviewAwarenessSessionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should require notes when rejecting', () => {
      const invalidData = {
        action: 'reject' as const,
      };

      const result = reviewAwarenessSessionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate rejection with notes', () => {
      const validData = {
        action: 'reject' as const,
        notes: 'Request does not meet requirements',
      };

      const result = reviewAwarenessSessionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('respondToAwarenessSessionSchema', () => {
    it('should validate expert acceptance', () => {
      const validData = {
        action: 'accept' as const,
        notes: 'I can handle this session',
      };

      const result = respondToAwarenessSessionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate expert decline', () => {
      const validData = {
        action: 'decline' as const,
        notes: 'Not available on that date',
      };

      const result = respondToAwarenessSessionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});

describe('Awareness Session Utility Functions', () => {
  describe('Status Transitions', () => {
    it('should allow valid status transitions', () => {
      expect(isValidStatusTransition('pending_admin_review', 'forwarded_to_expert')).toBe(true);
      expect(isValidStatusTransition('pending_admin_review', 'rejected')).toBe(true);
      expect(isValidStatusTransition('forwarded_to_expert', 'confirmed')).toBe(true);
      expect(isValidStatusTransition('forwarded_to_expert', 'expert_declined')).toBe(true);
    });

    it('should reject invalid status transitions', () => {
      expect(isValidStatusTransition('confirmed', 'pending_admin_review')).toBe(false);
      expect(isValidStatusTransition('rejected', 'forwarded_to_expert')).toBe(false);
      expect(isValidStatusTransition('pending_admin_review', 'confirmed')).toBe(false);
    });

    it('should validate status transition with context', () => {
      const result = validateStatusTransition(
        'pending_admin_review',
        'forwarded_to_expert',
        {
          expertId: '123e4567-e89b-12d3-a456-426614174000',
          isAdminAction: true,
        }
      );
      expect(result.success).toBe(true);
    });

    it('should reject status transition without required context', () => {
      const result = validateStatusTransition(
        'pending_admin_review',
        'forwarded_to_expert',
        {
          isAdminAction: true,
          // Missing expertId
        }
      );
      expect(result.success).toBe(false);
      expect(result.errors.expertId).toBeDefined();
    });
  });

  describe('Permission Checks', () => {
    it('should correctly identify modifiable requests', () => {
      expect(canModifyRequest('pending_admin_review')).toBe(true);
      expect(canModifyRequest('forwarded_to_expert')).toBe(false);
      expect(canModifyRequest('confirmed')).toBe(false);
    });

    it('should correctly identify admin reviewable requests', () => {
      expect(canAdminReview('pending_admin_review')).toBe(true);
      expect(canAdminReview('expert_declined')).toBe(true);
      expect(canAdminReview('confirmed')).toBe(false);
    });

    it('should correctly identify expert respondable requests', () => {
      expect(canExpertRespond('forwarded_to_expert')).toBe(true);
      expect(canExpertRespond('pending_admin_review')).toBe(false);
      expect(canExpertRespond('confirmed')).toBe(false);
    });
  });

  describe('Date Validation', () => {
    it('should validate future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      expect(isValidSessionDate(futureDate)).toBe(true);
    });

    it('should reject past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      expect(isValidSessionDate(pastDate)).toBe(false);
    });

    it('should accept today\'s date', () => {
      const today = new Date();
      expect(isValidSessionDate(today)).toBe(true);
    });
  });

  describe('Business Rules Summary', () => {
    it('should identify warnings and suggestions', () => {
      const request = {
        sessionDate: new Date('2025-12-01'),
        audienceSize: 600,
        sessionMode: 'online' as const,
        duration: 'full_day' as const,
        audienceTypes: ['kids'] as AudienceType[],
        organizationName: 'Valid Corp',
      };

      const summary = getBusinessRulesSummary(request);
      expect(summary.warnings.length).toBeGreaterThan(0);
      expect(summary.suggestions.length).toBeGreaterThan(0);
    });

    it('should identify errors', () => {
      const request = {
        sessionDate: new Date('2020-01-01'), // Past date
        organizationName: 'Invalid@#$%Corp', // Invalid characters
      };

      const summary = getBusinessRulesSummary(request);
      expect(summary.errors.length).toBeGreaterThan(0);
    });
  });
});