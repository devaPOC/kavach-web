import { describe, it, expect } from 'vitest';
import { generateAccountLockEmailHTML, generateAccountLockEmailText } from '../lib/email/templates/account-lock';

describe('Account Lock Email Templates', () => {
  describe('Email Template Content', () => {
    it('should generate correct HTML email content', () => {
      const testData = {
        firstName: 'John',
        lastName: 'Doe',
        reason: 'Multiple failed login attempts detected',
        lockedAt: new Date('2024-01-15T10:30:00Z'),
        supportEmail: 'support@kavach.com'
      };

      const htmlContent = generateAccountLockEmailHTML(testData);

      // Check essential HTML content
      expect(htmlContent).toContain('Account Security Alert');
      expect(htmlContent).toContain('John Doe');
      expect(htmlContent).toContain('Multiple failed login attempts detected');
      expect(htmlContent).toContain('support@kavach.com');
      expect(htmlContent).toContain('Your account has been temporarily locked');
      expect(htmlContent).toContain('January 15, 2024');
      expect(htmlContent).toContain('🔒'); // Lock icon
      expect(htmlContent).toContain('contact our support team');
    });

    it('should generate correct text email content', () => {
      const testData = {
        firstName: 'Jane',
        lastName: 'Smith',
        reason: 'Security policy violation detected',
        lockedAt: new Date('2024-02-20T14:45:00Z'),
        supportEmail: 'help@kavach.com'
      };

      const textContent = generateAccountLockEmailText(testData);

      // Check essential text content
      expect(textContent).toContain('ACCOUNT SECURITY ALERT');
      expect(textContent).toContain('Jane Smith');
      expect(textContent).toContain('Security policy violation detected');
      expect(textContent).toContain('help@kavach.com');
      expect(textContent).toContain('temporarily locked');
      expect(textContent).toContain('February 20, 2024');
      expect(textContent).toContain('WHAT THIS MEANS:');
      expect(textContent).toContain('NEXT STEPS:');
    });

    it('should handle default values correctly', () => {
      const testData = {
        firstName: 'Test',
        lastName: 'User',
        reason: 'Account suspended',
        lockedAt: new Date('2024-03-10T09:15:00Z')
        // No supportEmail provided - should use default
      };

      const htmlContent = generateAccountLockEmailHTML(testData);
      const textContent = generateAccountLockEmailText(testData);

      // Should use default support email
      expect(htmlContent).toContain('support@kavach.com');
      expect(textContent).toContain('support@kavach.com');
    });

    it('should format dates correctly', () => {
      const testData = {
        firstName: 'Date',
        lastName: 'Test',
        reason: 'Date formatting test',
        lockedAt: new Date('2024-12-25T23:59:59Z'),
        supportEmail: 'test@kavach.com'
      };

      const htmlContent = generateAccountLockEmailHTML(testData);
      const textContent = generateAccountLockEmailText(testData);

      // Check that dates are formatted properly
      expect(htmlContent).toContain('December 25, 2024');
      expect(textContent).toContain('December 25, 2024');
    });

    it('should include security information and guidance', () => {
      const testData = {
        firstName: 'Security',
        lastName: 'Test',
        reason: 'Automated security check',
        lockedAt: new Date(),
        supportEmail: 'security@kavach.com'
      };

      const htmlContent = generateAccountLockEmailHTML(testData);
      const textContent = generateAccountLockEmailText(testData);

      // Security information should be present
      expect(htmlContent).toContain('All active sessions have been terminated');
      expect(htmlContent).toContain('unauthorized access attempts');
      expect(htmlContent).toContain('Do not attempt to create a new account');

      expect(textContent).toContain('All active sessions have been terminated');
      expect(textContent).toContain('unauthorized access attempts');
      expect(textContent).toContain('Do not attempt to create a new account');
    });
  });
});
