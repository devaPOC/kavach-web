import { createSMTPTransporter } from './smtp-config';
import { generateVerificationEmailHTML, generateVerificationEmailText } from './templates/verification';
import { generateWelcomeEmailHTML, generateWelcomeEmailText } from './templates/welcome';
import { generateUserDeletionEmailHTML, generateUserDeletionEmailText } from './templates/user-deletion';
import { generateAccountLockEmailHTML, generateAccountLockEmailText } from './templates/account-lock';
import {
  generateNewRequestNotificationHTML,
  generateNewRequestNotificationText,
  generateExpertAssignmentNotificationHTML,
  generateExpertAssignmentNotificationText,
  generateStatusChangeNotificationHTML,
  generateStatusChangeNotificationText
} from './templates/awareness-session';
import { generateVerificationData, createMagicLinkURL, generateMagicLinkToken } from './magic-link-utils';
import type { VerificationData } from './magic-link-utils';
import type { AwarenessSessionRequest } from '@/types/awareness-session';

/**
 * Email service with retry logic and error handling
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface VerificationEmailOptions {
  to: string;
  firstName: string;
  type: 'magic_link';
  token?: string; // Optional token to use instead of generating one
  expirationMinutes?: number;
}

export interface WelcomeEmailOptions {
  to: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'expert';
}

export interface UserDeletionEmailOptions {
  to: string;
  firstName: string;
  lastName: string;
  reason: string;
  deletedAt?: Date;
  supportEmail?: string;
}

export interface AccountLockEmailOptions {
  to: string;
  firstName: string;
  lastName: string;
  reason: string;
  lockedAt?: Date;
  supportEmail?: string;
}

export interface TaskAssignmentEmailOptions {
  expertEmail: string;
  expertName: string;
  taskTitle: string;
  priority: string;
  assignedAt?: Date;
}

export interface TaskAcceptanceEmailOptions {
  customerEmail: string;
  customerName: string;
  expertName: string;
  taskTitle: string;
  initialNote?: string;
}

export interface TaskClosureRequestEmailOptions {
  customerEmail: string;
  customerName: string;
  taskTitle: string;
  taskId: string;
}

export interface AwarenessSessionNewRequestEmailOptions {
  adminEmail: string;
  request: AwarenessSessionRequest;
  requesterName: string;
}

export interface AwarenessSessionExpertAssignmentEmailOptions {
  expertEmail: string;
  expertName: string;
  request: AwarenessSessionRequest;
  requesterName: string;
}

export interface AwarenessSessionStatusChangeEmailOptions {
  requesterEmail: string;
  requesterName: string;
  request: AwarenessSessionRequest;
  expertName?: string;
  previousStatus?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface VerificationEmailResult extends EmailResult {
  verificationData?: VerificationData;
}

class EmailService {
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second base delay

  /**
   * Send email with retry logic
   */
  private async sendEmailWithRetry(options: EmailOptions, attempt = 1): Promise<EmailResult> {
    try {
      const transporter = createSMTPTransporter();

      const mailOptions = {
        from: process.env.SMTP_FROM || `Kavach <${process.env.EMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const info = await transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error(`Email send attempt ${attempt} failed:`, error);

      if (attempt < this.maxRetries) {
        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));

        return this.sendEmailWithRetry(options, attempt + 1);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown email error',
      };
    }
  }

  /**
   * Send verification email (magic link only)
   */
  async sendVerificationEmail(options: VerificationEmailOptions): Promise<VerificationEmailResult> {
    try {
      const { to, firstName, token, expirationMinutes = 1440 } = options; // Default 24 hours in minutes

      // Use provided token or generate a new one
      const linkToken = token || generateMagicLinkToken();
      const verificationData: VerificationData = {
        token: linkToken,
        type: 'magic_link',
        expiresAt: new Date(Date.now() + expirationMinutes * 60 * 1000)
      };

      const magicLink = createMagicLinkURL(linkToken);
      const emailData = {
        firstName,
        magicLink,
        expirationMinutes,
      };

      const emailOptions: EmailOptions = {
        to,
        subject: 'Verify Your Email Address - Kavach',
        html: generateVerificationEmailHTML(emailData),
        text: generateVerificationEmailText(emailData),
      };

      const result = await this.sendEmailWithRetry(emailOptions);

      return {
        ...result,
        verificationData: result.success ? verificationData : undefined,
      };
    } catch (error) {
      console.error('Error preparing verification email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to prepare verification email',
      };
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(options: WelcomeEmailOptions): Promise<EmailResult> {
    try {
      const { to, firstName, lastName, role } = options;

      const emailData = { firstName, lastName, role };

      const emailOptions: EmailOptions = {
        to,
        subject: `Welcome to Kavach${role === 'expert' ? ' Expert Network' : ''}!`,
        html: generateWelcomeEmailHTML(emailData),
        text: generateWelcomeEmailText(emailData),
      };

      return await this.sendEmailWithRetry(emailOptions);
    } catch (error) {
      console.error('Error preparing welcome email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to prepare welcome email',
      };
    }
  }

  /**
   * Send user deletion notification email
   */
  async sendUserDeletionEmail(options: UserDeletionEmailOptions): Promise<EmailResult> {
    try {
      const { to, firstName, lastName, reason, deletedAt = new Date(), supportEmail } = options;

      const emailData = {
        firstName,
        lastName,
        reason,
        deletedAt,
        supportEmail
      };

      const emailOptions: EmailOptions = {
        to,
        subject: 'Account Deletion Notification - Kavach',
        html: generateUserDeletionEmailHTML(emailData),
        text: generateUserDeletionEmailText(emailData),
      };

      return await this.sendEmailWithRetry(emailOptions);
    } catch (error) {
      console.error('Error preparing user deletion email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to prepare user deletion email',
      };
    }
  }

  /**
   * Send account lock notification email
   */
  async sendAccountLockEmail(options: AccountLockEmailOptions): Promise<EmailResult> {
    try {
      const { to, firstName, lastName, reason, lockedAt = new Date(), supportEmail } = options;

      const emailData = {
        firstName,
        lastName,
        reason,
        lockedAt,
        supportEmail
      };

      const emailOptions: EmailOptions = {
        to,
        subject: 'Account Security Alert - Account Locked - Kavach',
        html: generateAccountLockEmailHTML(emailData),
        text: generateAccountLockEmailText(emailData),
      };

      return await this.sendEmailWithRetry(emailOptions);
    } catch (error) {
      console.error('Error preparing account lock email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to prepare account lock email',
      };
    }
  }

  /**
   * Send custom email
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    return await this.sendEmailWithRetry(options);
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      const transporter = createSMTPTransporter();
      await transporter.verify();
      return true;
    } catch (error) {
      console.error('Email service connection test failed:', error);
      return false;
    }
  }

  /**
   * Send task assignment notification to expert
   */
  async sendTaskAssignmentNotification(options: TaskAssignmentEmailOptions): Promise<EmailResult> {
    const { expertEmail, expertName, taskTitle, priority } = options;

    const subject = `New Task Assignment - ${priority.toUpperCase()} Priority`;

    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h2 style="color: #1f2937;">New Task Assignment</h2>
        <p>Hello ${expertName},</p>
        <p>You have been assigned a new task by the admin team.</p>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #374151;">Task Details:</h3>
          <p style="margin: 5px 0;"><strong>Title:</strong> ${taskTitle}</p>
          <p style="margin: 5px 0;"><strong>Priority:</strong> <span style="color: ${priority === 'emergency' ? '#dc2626' : priority === 'urgent' ? '#ea580c' : priority === 'high' ? '#ca8a04' : '#059669'}; font-weight: bold;">${priority.toUpperCase()}</span></p>
        </div>

        <p>Please log in to your expert dashboard to view the full details and accept the task:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/expert/dashboard"
             style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Task Details
          </a>
        </p>

        <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
          This is an automated notification. Please do not reply to this email.
        </p>
      </div>
    `;

    const text = `
New Task Assignment

Hello ${expertName},

You have been assigned a new task by the admin team.

Task Details:
- Title: ${taskTitle}
- Priority: ${priority.toUpperCase()}

Please log in to your expert dashboard to view the full details and accept the task:
${process.env.NEXT_PUBLIC_APP_URL}/expert/dashboard

This is an automated notification. Please do not reply to this email.
    `;

    return await this.sendEmailWithRetry({
      to: expertEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Send task acceptance notification to customer
   */
  async sendTaskAcceptanceNotification(options: TaskAcceptanceEmailOptions): Promise<EmailResult> {
    const { customerEmail, customerName, expertName, taskTitle, initialNote } = options;

    const subject = `Expert Assigned to Your Request: ${taskTitle}`;

    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h2 style="color: #1f2937;">Expert Assigned to Your Request</h2>
        <p>Dear ${customerName},</p>
        <p>Good news! An expert has been assigned to your service request and has accepted the task.</p>

        <div style="background-color: #f0fdf4; border-left: 4px solid #059669; padding: 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #059669;">Request Details:</h3>
          <p style="margin: 5px 0;"><strong>Service:</strong> ${taskTitle}</p>
          <p style="margin: 5px 0;"><strong>Assigned Expert:</strong> ${expertName}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> Accepted & In Progress</p>
        </div>

        ${initialNote ? `
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h4 style="margin: 0 0 10px 0; color: #92400e;">Initial Response from Expert:</h4>
          <p style="margin: 0; color: #92400e;">${initialNote}</p>
        </div>
        ` : ''}

        <p>Your expert will be in touch with you shortly to begin working on your request. You can expect to receive updates on the progress of your service request.</p>

        <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
          If you have any questions or concerns, please don't hesitate to contact our support team.
        </p>

        <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
          Thank you for choosing our cybersecurity services.
        </p>
      </div>
    `;

    const text = `
Expert Assigned to Your Request

Dear ${customerName},

Good news! An expert has been assigned to your service request and has accepted the task.

Request Details:
- Service: ${taskTitle}
- Assigned Expert: ${expertName}
- Status: Accepted & In Progress

${initialNote ? `
Initial Response from Expert:
${initialNote}
` : ''}

Your expert will be in touch with you shortly to begin working on your request. You can expect to receive updates on the progress of your service request.

If you have any questions or concerns, please don't hesitate to contact our support team.

Thank you for choosing our cybersecurity services.
    `;

    return await this.sendEmailWithRetry({
      to: customerEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Send task closure request notification to customer
   */
  async sendTaskClosureRequestNotification(options: TaskClosureRequestEmailOptions): Promise<EmailResult> {
    const { customerEmail, customerName, taskTitle, taskId } = options;

    const subject = `Task Completed - Review Required: ${taskTitle}`;

    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h2 style="color: #1f2937;">Task Completed - Review Required</h2>
        <p>Dear ${customerName},</p>
        <p>Great news! Your expert has completed the work on your service request and submitted a completion report.</p>

        <div style="background-color: #f0fdf4; border-left: 4px solid #059669; padding: 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #059669;">Request Details:</h3>
          <p style="margin: 5px 0;"><strong>Service:</strong> ${taskTitle}</p>
          <p style="margin: 5px 0;"><strong>Task ID:</strong> ${taskId}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> Completed & Awaiting Your Review</p>
        </div>

        <p>Please log in to your customer dashboard to review the completion report and close the task if you're satisfied with the work:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/customer/dashboard"
             style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Review & Close Task
          </a>
        </p>

        <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
          If you have any questions or concerns about the completed work, please don't hesitate to contact our support team.
        </p>

        <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
          Thank you for choosing our cybersecurity services.
        </p>
      </div>
    `;

    const text = `
Task Completed - Review Required

Dear ${customerName},

Great news! Your expert has completed the work on your service request and submitted a completion report.

Request Details:
- Service: ${taskTitle}
- Task ID: ${taskId}
- Status: Completed & Awaiting Your Review

Please log in to your customer dashboard to review the completion report and close the task if you're satisfied with the work:
${process.env.NEXT_PUBLIC_APP_URL}/customer/dashboard

If you have any questions or concerns about the completed work, please don't hesitate to contact our support team.

Thank you for choosing our cybersecurity services.
    `;

    return await this.sendEmailWithRetry({
      to: customerEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Send new awareness session request notification to admin
   */
  async sendAwarenessSessionNewRequestNotification(options: AwarenessSessionNewRequestEmailOptions): Promise<EmailResult> {
    try {
      const { adminEmail, request, requesterName } = options;

      const emailOptions: EmailOptions = {
        to: adminEmail,
        subject: `New Awareness Session Request - ${request.organizationName}`,
        html: generateNewRequestNotificationHTML({ request, requesterName }),
        text: generateNewRequestNotificationText({ request, requesterName }),
      };

      return await this.sendEmailWithRetry(emailOptions);
    } catch (error) {
      console.error('Error preparing awareness session new request notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to prepare new request notification',
      };
    }
  }

  /**
   * Send expert assignment notification
   */
  async sendAwarenessSessionExpertAssignmentNotification(options: AwarenessSessionExpertAssignmentEmailOptions): Promise<EmailResult> {
    try {
      const { expertEmail, expertName, request, requesterName } = options;

      const emailOptions: EmailOptions = {
        to: expertEmail,
        subject: `New Awareness Session Assignment - ${request.organizationName}`,
        html: generateExpertAssignmentNotificationHTML({ request, expertName, requesterName }),
        text: generateExpertAssignmentNotificationText({ request, expertName, requesterName }),
      };

      return await this.sendEmailWithRetry(emailOptions);
    } catch (error) {
      console.error('Error preparing awareness session expert assignment notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to prepare expert assignment notification',
      };
    }
  }

  /**
   * Send status change notification to requester
   */
  async sendAwarenessSessionStatusChangeNotification(options: AwarenessSessionStatusChangeEmailOptions): Promise<EmailResult> {
    try {
      const { requesterEmail, requesterName, request, expertName, previousStatus } = options;

      const getSubjectByStatus = () => {
        switch (request.status) {
          case 'forwarded_to_expert':
            return `Request Approved - ${request.organizationName} Awareness Session`;
          case 'confirmed':
            return `Session Confirmed - ${request.organizationName} Awareness Session`;
          case 'rejected':
            return `Request Update - ${request.organizationName} Awareness Session`;
          case 'expert_declined':
            return `Expert Reassignment - ${request.organizationName} Awareness Session`;
          default:
            return `Status Update - ${request.organizationName} Awareness Session`;
        }
      };

      const emailOptions: EmailOptions = {
        to: requesterEmail,
        subject: getSubjectByStatus(),
        html: generateStatusChangeNotificationHTML({ request, requesterName, expertName, previousStatus }),
        text: generateStatusChangeNotificationText({ request, requesterName, expertName, previousStatus }),
      };

      return await this.sendEmailWithRetry(emailOptions);
    } catch (error) {
      console.error('Error preparing awareness session status change notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to prepare status change notification',
      };
    }
  }

  /**
   * Send OTP email to super admin for authentication
   */
  async sendSuperAdminOtp(options: {
    email: string;
    name: string;
    otpCode: string;
    expiryMinutes: number;
  }): Promise<EmailResult> {
    const { email, name, otpCode, expiryMinutes } = options;

    const subject = 'Your Super Admin Login Code - Kavach';

    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Super Admin Login</h1>
        </div>

        <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #374151; font-size: 16px;">Hello ${name},</p>
          <p style="color: #374151; font-size: 16px;">Your one-time verification code is:</p>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1e40af;">${otpCode}</span>
          </div>

          <p style="color: #6b7280; font-size: 14px;">This code will expire in ${expiryMinutes} minutes.</p>

          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <p style="color: #dc2626; margin: 0; font-size: 14px;">
              <strong>Security Notice:</strong> Never share this code with anyone. Kavach staff will never ask for your OTP.
            </p>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            If you didn't request this code, please ignore this email or contact security immediately.
          </p>
        </div>
      </div>
    `;

    const text = `
Super Admin Login - Kavach

Hello ${name},

Your one-time verification code is: ${otpCode}

This code will expire in ${expiryMinutes} minutes.

SECURITY NOTICE: Never share this code with anyone. Kavach staff will never ask for your OTP.

If you didn't request this code, please ignore this email or contact security immediately.
    `;

    return await this.sendEmailWithRetry({
      to: email,
      subject,
      html,
      text,
    });
  }

  /**
   * Send admin welcome email with credentials
   */
  async sendAdminWelcomeEmail(options: {
    email: string;
    firstName: string;
    password: string;
    loginUrl: string;
  }): Promise<EmailResult> {
    const { email, firstName, password, loginUrl } = options;

    const subject = 'Welcome to Kavach Admin Dashboard';

    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h2 style="color: #1f2937;">Welcome to Kavach Admin Dashboard</h2>
        <p>Hello ${firstName},</p>
        <p>An administrator account has been created for you.</p>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #374151;">Your Credentials:</h3>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 2px 4px; border-radius: 4px;">${password}</code></p>
        </div>

        <p>Please log in and change your password immediately:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Login to Admin Dashboard
          </a>
        </p>

        <p style="color: #6b7280; font-size: 14px;">
          For security reasons, you will be required to set a new password upon your first login.
        </p>
      </div>
    `;

    const text = `
Welcome to Kavach Admin Dashboard

Hello ${firstName},

An administrator account has been created for you.

Your Credentials:
Email: ${email}
Temporary Password: ${password}

Please log in and change your password immediately:
${loginUrl}

For security reasons, you will be required to set a new password upon your first login.
    `;

    return await this.sendEmailWithRetry({
      to: email,
      subject,
      html,
      text,
    });
  }

  /**
   * Send admin password reset email
   */
  async sendAdminPasswordResetEmail(options: {
    email: string;
    firstName: string;
    password: string;
    loginUrl: string;
  }): Promise<EmailResult> {
    const { email, firstName, password, loginUrl } = options;

    const subject = 'Admin Password Reset - Kavach';

    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h2 style="color: #1f2937;">Password Reset Notification</h2>
        <p>Hello ${firstName},</p>
        <p>Your admin account password has been reset by a super administrator.</p>

        <div style="background-color: #fff7ed; border-left: 4px solid #ea580c; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #9a3412;">New Credentials:</h3>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background: #ffedd5; padding: 2px 4px; border-radius: 4px;">${password}</code></p>
        </div>

        <p>Please log in with this temporary password. You will be asked to create a new password immediately.</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}"
             style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Login to Admin Dashboard
          </a>
        </p>
      </div>
    `;

    const text = `
Password Reset Notification

Hello ${firstName},

Your admin account password has been reset by a super administrator.

New Credentials:
Email: ${email}
Temporary Password: ${password}

Please log in with this temporary password. You will be asked to create a new password immediately.
${loginUrl}
    `;

    return await this.sendEmailWithRetry({
      to: email,
      subject,
      html,
      text,
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Export types and utilities
export type { VerificationData } from './magic-link-utils';
export { generateMagicLinkToken, createMagicLinkURL } from './magic-link-utils';
