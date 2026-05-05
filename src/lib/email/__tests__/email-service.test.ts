import { describe, it, expect, vi, beforeEach } from 'vitest';
import { emailService } from '../email-service';
import { generateMagicLinkToken, createMagicLinkURL } from '../magic-link-utils';

// Mock nodemailer
const mockTransporter = {
  sendMail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  verify: vi.fn().mockResolvedValue(true),
};

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => mockTransporter),
  },
}));

// Mock environment variables
Object.defineProperty(process, 'env', {
  value: {
    ...process.env,
    EMAIL_USER: 'test@gmail.com',
    EMAIL_PASSWORD: 'test-password',
    SMTP_HOST: 'smtp.gmail.com',
    SMTP_PORT: '587',
    SMTP_SECURE: 'false',
    SMTP_FROM: 'Test App <test@gmail.com>',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  },
});

describe('Email Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });
    mockTransporter.verify.mockResolvedValue(true);
  });

  describe('Magic Link Utils', () => {
    it('should generate magic link token', () => {
      const token = generateMagicLinkToken();
      expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });

    it('should create magic link URL', () => {
      const token = 'test-token';
      const url = createMagicLinkURL(token);
      expect(url).toBe('http://localhost:3000/verify-email?token=test-token&type=magic_link');
    });
  });

  describe('Email Service Methods', () => {
    it('should test connection successfully', async () => {
      const result = await emailService.testConnection();
      expect(result).toBe(true);
    });

    it('should send verification email with magic link', async () => {
      const result = await emailService.sendVerificationEmail({
        to: 'test@example.com',
        firstName: 'John',
        type: 'magic_link',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(result.verificationData).toBeDefined();
      expect(result.verificationData?.type).toBe('magic_link');
      expect(result.verificationData?.token).toHaveLength(64);
    });

    it('should send welcome email for customer', async () => {
      const result = await emailService.sendWelcomeEmail({
        to: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
    });

    it('should send welcome email for expert', async () => {
      const result = await emailService.sendWelcomeEmail({
        to: 'test@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'expert',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
    });

    it('should send custom email', async () => {
      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test Text',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
    });
  });
});