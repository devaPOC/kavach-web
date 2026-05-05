/**
 * User deletion notification email template
 */

interface UserDeletionEmailData {
  firstName: string;
  lastName: string;
  reason: string;
  deletedAt: Date;
  supportEmail?: string;
}

export const generateUserDeletionEmailHTML = (
  data: UserDeletionEmailData
): string => {
  const {
    firstName,
    lastName,
    reason,
    deletedAt,
    supportEmail = "support@kavach.com",
  } = data;

  const formattedDate = deletedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Deletion Notification - Kavach</title>
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
        .notification-box {
            background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
            color: white;
            padding: 30px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
        }
        .notification-box h2 {
            margin: 0 0 10px 0;
            font-size: 20px;
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
        .reason-text {
            color: #9a3412;
            font-style: italic;
            background-color: white;
            padding: 15px;
            border-radius: 4px;
            border-left: 4px solid #fb923c;
        }
        .support-section {
            background-color: #f0f9ff;
            border: 1px solid #bae6fd;
            padding: 20px;
            border-radius: 8px;
            margin: 30px 0;
        }
        .support-section h3 {
            color: #1e40af;
            margin-bottom: 15px;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
        }
        .warning-text {
            color: #dc2626;
            font-weight: 600;
            background-color: #fef2f2;
            padding: 15px;
            border-radius: 6px;
            border: 1px solid #fecaca;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <img src="${
                  process.env.NEXT_PUBLIC_APP_URL || "https://kavach.com"
                }/logo.png" alt="Kavach" />
            </div>
            <h1 class="title">Account Deletion Notification</h1>
            <p class="subtitle">Your account has been removed from our platform</p>
        </div>

        <div class="notification-box">
            <h2>⚠️ Account Deleted</h2>
            <p>Your Kavach account has been permanently deleted by our administration team.</p>
        </div>

        <p>Dear ${firstName} ${lastName},</p>

        <p>We are writing to inform you that your Kavach account has been permanently deleted from our platform. This action was taken by our administration team and cannot be undone.</p>

        <div class="details-section">
            <h3>📋 Deletion Details</h3>
            <div class="detail-item">
                <span class="detail-label">Account:</span>
                <span class="detail-value">${firstName} ${lastName}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Deleted On:</span>
                <span class="detail-value">${formattedDate}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Status:</span>
                <span class="detail-value">Permanently Deleted</span>
            </div>
        </div>

        <div class="reason-box">
            <h4>📝 Reason for Deletion</h4>
            <div class="reason-text">
                ${reason}
            </div>
        </div>

        <div class="warning-text">
            <strong>Important:</strong> All your account data, including profile information, messages, and transaction history, has been permanently removed and cannot be recovered.
        </div>

        <p>If you believe this action was taken in error or if you have any questions about this decision, please contact our support team immediately.</p>

        <div class="support-section">
            <h3>💬 Need to Appeal or Have Questions?</h3>
            <p>If you believe this deletion was made in error or if you need clarification about this decision, please contact our support team:</p>
            <ul>
                <li>📧 Email: ${supportEmail}</li>
                <li>📚 Help Center: kavach.com/help</li>
                <li>⏰ Response Time: Within 24-48 hours</li>
            </ul>
            <p><strong>Please include your full name and the date of deletion when contacting support.</strong></p>
        </div>

        <p>We appreciate the time you spent with Kavach and wish you well in your future endeavors.</p>

        <p>Regards,<br>The Kavach Administration Team</p>

        <div class="footer">
            <p>This is an automated notification regarding your Kavach account deletion.</p>
            <p>&copy; 2025 Kavach. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
};

export const generateUserDeletionEmailText = (
  data: UserDeletionEmailData
): string => {
  const {
    firstName,
    lastName,
    reason,
    deletedAt,
    supportEmail = "support@kavach.com",
  } = data;

  const formattedDate = deletedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
ACCOUNT DELETION NOTIFICATION - KAVACH

Dear ${firstName} ${lastName},

We are writing to inform you that your Kavach account has been permanently deleted from our platform. This action was taken by our administration team and cannot be undone.

DELETION DETAILS:
- Account: ${firstName} ${lastName}
- Deleted On: ${formattedDate}
- Status: Permanently Deleted

REASON FOR DELETION:
${reason}

IMPORTANT: All your account data, including profile information, messages, and transaction history, has been permanently removed and cannot be recovered.

If you believe this action was taken in error or if you have any questions about this decision, please contact our support team immediately.

NEED TO APPEAL OR HAVE QUESTIONS?
If you believe this deletion was made in error or if you need clarification about this decision, please contact our support team:

- Email: ${supportEmail}
- Help Center: kavach.com/help
- Response Time: Within 24-48 hours

Please include your full name and the date of deletion when contacting support.

We appreciate the time you spent with Kavach and wish you well in your future endeavors.

Regards,
The Kavach Administration Team

---
This is an automated notification regarding your Kavach account deletion.
© 2025 Kavach. All rights reserved.
`;
};
