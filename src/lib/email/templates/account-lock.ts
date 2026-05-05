/**
 * Account lock notification email template
 */

interface AccountLockEmailData {
  firstName: string;
  lastName: string;
  reason: string;
  lockedAt: Date;
  supportEmail?: string;
}

export const generateAccountLockEmailHTML = (data: AccountLockEmailData): string => {
  const { firstName, lastName, reason, lockedAt, supportEmail = 'support@kavach.com' } = data;

  const formattedDate = lockedAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Security Alert - Kavach</title>
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
            max-width: 120px;
            height: auto;
            margin: 0 auto 20px;
            display: block;
        }
        .title {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 10px;
            color: #dc2626;
        }
        .subtitle {
            font-size: 16px;
            color: #6b7280;
            margin-bottom: 30px;
        }
        .alert-box {
            background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
            color: white;
            padding: 30px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
        }
        .alert-box h2 {
            margin: 0 0 10px 0;
            font-size: 20px;
        }
        .alert-box .icon {
            font-size: 48px;
            margin-bottom: 15px;
        }
        .details-section {
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            padding: 20px;
            border-radius: 8px;
            margin: 30px 0;
        }
        .details-section h3 {
            color: #dc2626;
            margin-bottom: 15px;
            font-size: 18px;
        }
        .detail-item {
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid #fee2e2;
        }
        .detail-item:last-child {
            border-bottom: none;
        }
        .detail-label {
            font-weight: 600;
            color: #7f1d1d;
            display: inline-block;
            width: 120px;
        }
        .detail-value {
            color: #991b1b;
        }
        .reason-box {
            background-color: #fff7ed;
            border: 1px solid #fed7aa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .reason-box h4 {
            color: #c2410c;
            margin: 0 0 10px 0;
        }
        .reason-box p {
            color: #ea580c;
            margin: 0;
        }
        .info-section {
            background-color: #f0f9ff;
            border: 1px solid #bae6fd;
            padding: 20px;
            border-radius: 8px;
            margin: 30px 0;
        }
        .info-section h3 {
            color: #0369a1;
            margin-bottom: 15px;
            font-size: 18px;
        }
        .info-section ul {
            color: #0c4a6e;
            margin: 0;
            padding-left: 20px;
        }
        .info-section li {
            margin: 8px 0;
        }
        .contact-section {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 20px;
            border-radius: 8px;
            margin: 30px 0;
            text-align: center;
        }
        .contact-section h3 {
            color: #334155;
            margin-bottom: 15px;
        }
        .contact-info {
            color: #475569;
        }
        .contact-email {
            color: #2563eb;
            text-decoration: none;
            font-weight: 600;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
        .warning-text {
            color: #dc2626;
            font-weight: 600;
            margin: 15px 0;
        }
        @media only screen and (max-width: 600px) {
            body {
                padding: 10px;
            }
            .container {
                padding: 20px;
            }
            .title {
                font-size: 20px;
            }
            .detail-label {
                width: 100px;
                font-size: 14px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">Account Security Alert</h1>
            <p class="subtitle">Your Kavach account has been temporarily locked</p>
        </div>

        <div class="alert-box">
            <div class="icon">🔒</div>
            <h2>Account Locked</h2>
            <p>Your account has been temporarily locked for security reasons</p>
        </div>

        <p>Dear ${firstName} ${lastName},</p>

        <p>We're writing to inform you that your Kavach account has been temporarily locked for security reasons. This action has been taken to protect your account and our platform.</p>

        <div class="details-section">
            <h3>Lock Details</h3>
            <div class="detail-item">
                <span class="detail-label">Date & Time:</span>
                <span class="detail-value">${formattedDate}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Account:</span>
                <span class="detail-value">${firstName} ${lastName}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Status:</span>
                <span class="detail-value">Temporarily Locked</span>
            </div>
        </div>

        <div class="reason-box">
            <h4>Reason for Lock:</h4>
            <p>${reason}</p>
        </div>

        <div class="info-section">
            <h3>What This Means</h3>
            <ul>
                <li>You will not be able to log into your account</li>
                <li>All active sessions have been terminated</li>
                <li>Your account data remains secure and intact</li>
                <li>This is a temporary security measure</li>
            </ul>
        </div>

        <div class="info-section">
            <h3>Next Steps</h3>
            <ul>
                <li>If you believe this was done in error, please contact our support team immediately</li>
                <li>Our security team may reach out to you for additional verification</li>
                <li>Once the security review is complete, your account may be unlocked</li>
                <li>Do not attempt to create a new account during this time</li>
            </ul>
        </div>

        <p class="warning-text">Important: If you did not expect this action, please contact support immediately as it may indicate unauthorized access attempts on your account.</p>

        <div class="contact-section">
            <h3>Need Help?</h3>
            <p class="contact-info">
                If you have questions about this account lock or need assistance, please contact our support team:
            </p>
            <p>
                <a href="mailto:${supportEmail}" class="contact-email">${supportEmail}</a>
            </p>
            <p class="contact-info">
                Please include your full name and the reason you're contacting us in your email.
            </p>
        </div>

        <div class="footer">
            <p>This is an automated security notification from Kavach.</p>
            <p>© ${new Date().getFullYear()} Kavach. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
  `;
};

export const generateAccountLockEmailText = (data: AccountLockEmailData): string => {
  const { firstName, lastName, reason, lockedAt, supportEmail = 'support@kavach.com' } = data;

  const formattedDate = lockedAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
ACCOUNT SECURITY ALERT - KAVACH

Your account has been temporarily locked for security reasons.

Dear ${firstName} ${lastName},

We're writing to inform you that your Kavach account has been temporarily locked for security reasons. This action has been taken to protect your account and our platform.

LOCK DETAILS:
- Date & Time: ${formattedDate}
- Account: ${firstName} ${lastName}
- Status: Temporarily Locked

REASON FOR LOCK:
${reason}

WHAT THIS MEANS:
• You will not be able to log into your account
• All active sessions have been terminated
• Your account data remains secure and intact
• This is a temporary security measure

NEXT STEPS:
• If you believe this was done in error, please contact our support team immediately
• Our security team may reach out to you for additional verification
• Once the security review is complete, your account may be unlocked
• Do not attempt to create a new account during this time

IMPORTANT: If you did not expect this action, please contact support immediately as it may indicate unauthorized access attempts on your account.

NEED HELP?
If you have questions about this account lock or need assistance, please contact our support team at: ${supportEmail}

Please include your full name and the reason you're contacting us in your email.

This is an automated security notification from Kavach.
© ${new Date().getFullYear()} Kavach. All rights reserved.
  `.trim();
};
