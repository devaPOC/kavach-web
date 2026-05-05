/**
 * Password reset email templates
 */

export interface PasswordResetEmailData {
  firstName: string;
  resetLink: string;
  expirationMinutes: number;
}

export function generatePasswordResetEmailHTML(data: PasswordResetEmailData): string {
  const { firstName, resetLink, expirationMinutes } = data;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - Kavach</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
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
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        .title {
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 20px;
        }
        .content {
            margin-bottom: 30px;
        }
        .button {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #1d4ed8;
        }
        .warning {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
        }
        .link {
            color: #2563eb;
            word-break: break-all;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Kavach</div>
            <h1 class="title">Reset Your Password</h1>
        </div>
        
        <div class="content">
            <p>Hi ${firstName},</p>
            
            <p>We received a request to reset your password for your Kavach account. If you made this request, click the button below to reset your password:</p>
            
            <div style="text-align: center;">
                <a href="${resetLink}" class="button">Reset My Password</a>
            </div>
            
            <div class="warning">
                <strong>⚠️ Important:</strong> This link will expire in ${expirationMinutes} minutes for security reasons.
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p><a href="${resetLink}" class="link">${resetLink}</a></p>
            
            <p><strong>If you didn't request this password reset:</strong></p>
            <ul>
                <li>You can safely ignore this email</li>
                <li>Your password will remain unchanged</li>
                <li>Consider changing your password if you're concerned about account security</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>This email was sent to you because a password reset was requested for your Kavach account.</p>
            <p>If you have any questions, please contact our support team.</p>
            <p>© ${new Date().getFullYear()} Kavach. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
}

export function generatePasswordResetEmailText(data: PasswordResetEmailData): string {
  const { firstName, resetLink, expirationMinutes } = data;
  
  return `
Reset Your Password - Kavach

Hi ${firstName},

We received a request to reset your password for your Kavach account. If you made this request, use the link below to reset your password:

${resetLink}

⚠️ IMPORTANT: This link will expire in ${expirationMinutes} minutes for security reasons.

If you didn't request this password reset:
- You can safely ignore this email
- Your password will remain unchanged
- Consider changing your password if you're concerned about account security

If you have any questions, please contact our support team.

© ${new Date().getFullYear()} Kavach. All rights reserved.
`;
}