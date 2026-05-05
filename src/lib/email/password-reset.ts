import { emailService } from './email-service';
import { generatePasswordResetEmailHTML, generatePasswordResetEmailText } from './templates/password-reset';
import { logger } from '@/lib/utils/logger';

export interface PasswordResetEmailOptions {
  to: string;
  firstName: string;
  resetToken: string;
  expirationMinutes?: number;
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  firstName: string,
  expirationMinutes: number = 60
) {
  try {
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    const emailData = {
      firstName,
      resetLink,
      expirationMinutes,
    };

    const emailOptions = {
      to: email,
      subject: 'Reset Your Password - Kavach',
      html: generatePasswordResetEmailHTML(emailData),
      text: generatePasswordResetEmailText(emailData),
    };

    const result = await emailService.sendEmail(emailOptions);
    if (!result.success) {
      logger.error('Failed to send password reset email', {
        email,
        error: result.error
      });
      throw new Error('Failed to send password reset email');
    } else {
      logger.info('Password reset email dispatched', {
        email,
        messageId: result.messageId
      });
    }
    return result;
  } catch (error) {
    logger.error('Error sending password reset email', {
      email,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}
