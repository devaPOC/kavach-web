/**
 * Email verification template for magic link
 */

interface VerificationEmailData {
  firstName: string;
  magicLink: string;
  expirationMinutes: number;
}

export const generateVerificationEmailHTML = (
  data: VerificationEmailData
): string => {
  const { firstName, magicLink, expirationMinutes } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - Kavach</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .container {
            background-color: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            margin-bottom: 10px;
        }
        .logo img {
            height: 32px;
            width: auto;
        }
        .title {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 20px;
            color: #1f2937;
        }

        .magic-link-button {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }
        .magic-link-button:hover {
            background-color: #1d4ed8;
        }
        .expiration {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 12px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
        }
        .security-note {
            background-color: #fef2f2;
            border-left: 4px solid #ef4444;
            padding: 12px;
            margin: 20px 0;
            border-radius: 4px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Kavach</div>
            <h1 class="title">Verify Your Email Address</h1>
        </div>

        <p>Hi ${firstName},</p>

        <p>Thank you for signing up with Kavach! To complete your account setup, please verify your email address.</p>

        <p><strong>Click Verification Link</strong></p>
        <p>Click the button below to verify your email address:</p>
        <div style="text-align: center;">
            <a href="${magicLink}" class="magic-link-button">Verify Email Address</a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #2563eb;">${magicLink}</p>

        <div class="expiration">
            <strong>⏰ Important:</strong> This verification link will expire in ${expirationMinutes} minutes.
        </div>

        <div class="security-note">
            <strong>🔒 Security Note:</strong> If you didn't create an account with Kavach, please ignore this email. Your email address will not be added to our system.
        </div>

        <p>If you're having trouble clicking the button, you can request a new verification email from the app.</p>

        <p>Best regards,<br>The Kavach Team</p>

        <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; 2025 Kavach. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
};

export const generateVerificationEmailText = (
  data: VerificationEmailData
): string => {
  const { firstName, magicLink, expirationMinutes } = data;

  return `
Hi ${firstName},

Thank you for signing up with Kavach! To complete your account setup, please verify your email address.

Click Verification Link
Copy and paste this link into your browser to verify your email address:
${magicLink}

IMPORTANT: This verification link will expire in ${expirationMinutes} minutes.

SECURITY NOTE: If you didn't create an account with Kavach, please ignore this email. Your email address will not be added to our system.

If you're having trouble with the verification, you can request a new verification email from the app.

Best regards,
The Kavach Team

---
This is an automated message. Please do not reply to this email.
© 2025 Kavach. All rights reserved.
`;
};
