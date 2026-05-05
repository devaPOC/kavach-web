/**
 * Email service exports
 */

// Main email service
export { emailService } from './email-service';

// Types
export type {
  EmailOptions,
  EmailResult,
  VerificationEmailOptions,
  VerificationEmailResult,
  WelcomeEmailOptions,
  UserDeletionEmailOptions,
  VerificationData,
} from './email-service';

// Utilities
export {
  generateMagicLinkToken,
  createMagicLinkURL,
  generateVerificationData,
  calculateExpirationDate,
  isExpired,
} from './magic-link-utils';

// SMTP configuration
export { createSMTPTransporter, verifySMTPConnection } from './smtp-config';

// Templates (if needed for customization)
export {
  generateVerificationEmailHTML,
  generateVerificationEmailText,
} from './templates/verification';

export {
  generateWelcomeEmailHTML,
  generateWelcomeEmailText,
} from './templates/welcome';

export {
  generateUserDeletionEmailHTML,
  generateUserDeletionEmailText,
} from './templates/user-deletion';