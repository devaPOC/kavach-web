import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateVerificationEmailHTML,
  generateVerificationEmailText
} from '../templates/verification';
import {
  generateWelcomeEmailHTML,
  generateWelcomeEmailText
} from '../templates/welcome';

describe('Email Templates', () => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://kavach.com';
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalEnv;
  });

  describe('Verification Email Templates', () => {
    describe('generateVerificationEmailHTML', () => {
      it('should generate HTML email for magic link verification', () => {
        const data = {
          firstName: 'Jane',
          magicLink: 'https://kavach.com/verify-email?token=abc123&type=magic_link',
          expirationMinutes: 1440 // 24 hours
        };

        const html = generateVerificationEmailHTML(data);

        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('Hi Jane');
        expect(html).toContain('https://kavach.com/verify-email?token=abc123&type=magic_link');
        expect(html).toContain('1440 minutes');
        expect(html).toContain('verification link');
        expect(html).toContain('Click the button');
        expect(html).toContain('Verify Email Address');
      });

      it('should handle special characters in names', () => {
        const data = {
          firstName: 'José María',
          magicLink: 'https://kavach.com/verify-email?token=abc123&type=magic_link',
          expirationMinutes: 1440
        };

        const html = generateVerificationEmailHTML(data);

        expect(html).toContain('Hi José María');
      });

      it('should include security warnings', () => {
        const data = {
          firstName: 'John',
          magicLink: 'https://kavach.com/verify-email?token=abc123&type=magic_link',
          expirationMinutes: 1440
        };

        const html = generateVerificationEmailHTML(data);

        expect(html).toContain('Security Note');
        expect(html).toContain('If you didn\'t create an account');
        expect(html).toContain('ignore this email');
      });

      it('should include proper styling and structure', () => {
        const data = {
          firstName: 'John',
          magicLink: 'https://kavach.com/verify-email?token=abc123&type=magic_link',
          expirationMinutes: 1440
        };

        const html = generateVerificationEmailHTML(data);

        expect(html).toContain('<style>');
        expect(html).toContain('font-family:');
        expect(html).toContain('class="magic-link-button"');
        expect(html).toContain('class="container"');
        expect(html).toContain('class="footer"');
      });
    });

    describe('generateVerificationEmailText', () => {
      it('should generate text email for magic link verification', () => {
        const data = {
          firstName: 'Jane',
          magicLink: 'https://kavach.com/verify-email?token=abc123&type=magic_link',
          expirationMinutes: 1440
        };

        const text = generateVerificationEmailText(data);

        expect(text).toContain('Hi Jane');
        expect(text).toContain('https://kavach.com/verify-email?token=abc123&type=magic_link');
        expect(text).toContain('1440 minutes');
        expect(text).toContain('verification link');
        expect(text).toContain('Copy and paste this link');
      });

      it('should include security warnings in text format', () => {
        const data = {
          firstName: 'John',
          magicLink: 'https://kavach.com/verify-email?token=abc123&type=magic_link',
          expirationMinutes: 1440
        };

        const text = generateVerificationEmailText(data);

        expect(text).toContain('SECURITY NOTE');
        expect(text).toContain('If you didn\'t create an account');
        expect(text).toContain('ignore this email');
      });

      it('should be properly formatted for plain text', () => {
        const data = {
          firstName: 'John',
          magicLink: 'https://kavach.com/verify-email?token=abc123&type=magic_link',
          expirationMinutes: 1440
        };

        const text = generateVerificationEmailText(data);

        expect(text).not.toContain('<');
        expect(text).not.toContain('>');
        expect(text).toContain('\n');
        expect(text).toContain('---');
        expect(text).toContain('© 2025 Kavach');
      });
    });
  });

  describe('Welcome Email Templates', () => {
    describe('generateWelcomeEmailHTML', () => {
      it('should generate HTML welcome email for customer', () => {
        const data = {
          firstName: 'John',
          lastName: 'Doe',
          role: 'customer' as const
        };

        const html = generateWelcomeEmailHTML(data);

        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('Welcome to Kavach!');
        expect(html).toContain('Hi John Doe');
        expect(html).toContain('as a customer');
      });

      it('should generate HTML welcome email for expert', () => {
        const data = {
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'expert' as const
        };

        const html = generateWelcomeEmailHTML(data);

        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('Welcome to Kavach Expert Network!');
        expect(html).toContain('Hi Jane Smith');
        expect(html).toContain('as an expert');
      });

      it('should handle special characters in names', () => {
        const data = {
          firstName: 'José',
          lastName: 'García-López',
          role: 'expert' as const
        };

        const html = generateWelcomeEmailHTML(data);

        expect(html).toContain('Hi José García-López');
      });
    });

    describe('generateWelcomeEmailText', () => {
      it('should generate text welcome email for customer', () => {
        const data = {
          firstName: 'John',
          lastName: 'Doe',
          role: 'customer' as const
        };

        const text = generateWelcomeEmailText(data);

        expect(text).toContain('Welcome to Kavach!');
        expect(text).toContain('Hi John Doe');
        expect(text).toContain('as a customer');
      });

      it('should generate text welcome email for expert', () => {
        const data = {
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'expert' as const
        };

        const text = generateWelcomeEmailText(data);

        expect(text).toContain('Welcome to Kavach Expert Network!');
        expect(text).toContain('Hi Jane Smith');
        expect(text).toContain('as an expert');
      });

      it('should be properly formatted for plain text', () => {
        const data = {
          firstName: 'John',
          lastName: 'Doe',
          role: 'customer' as const
        };

        const text = generateWelcomeEmailText(data);

        expect(text).not.toContain('<');
        expect(text).not.toContain('>');
        expect(text).toContain('\n');
        expect(text).toContain('---');
        expect(text).toContain('© 2025 Kavach');
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty names gracefully', () => {
      const verificationData = {
        firstName: '',
        magicLink: 'https://kavach.com/verify-email?token=abc123&type=magic_link',
        expirationMinutes: 1440
      };

      const html = generateVerificationEmailHTML(verificationData);
      const text = generateVerificationEmailText(verificationData);

      expect(html).toContain('Hi ');
      expect(text).toContain('Hi ');
    });

    it('should handle zero expiration minutes', () => {
      const data = {
        firstName: 'John',
        magicLink: 'https://kavach.com/verify-email?token=abc123&type=magic_link',
        expirationMinutes: 0
      };

      const html = generateVerificationEmailHTML(data);
      const text = generateVerificationEmailText(data);

      expect(html).toContain('0 minutes');
      expect(text).toContain('0 minutes');
    });

    it('should handle very long URLs in magic links', () => {
      const longToken = 'a'.repeat(1000);
      const data = {
        firstName: 'John',
        magicLink: `https://example.com/verify?token=${longToken}`,
        expirationMinutes: 1440
      };

      const html = generateVerificationEmailHTML(data);
      const text = generateVerificationEmailText(data);

      expect(html).toContain(longToken);
      expect(text).toContain(longToken);
    });
  });
});