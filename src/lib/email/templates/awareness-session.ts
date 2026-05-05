/**
 * Awareness session email templates
 */

import type {
  AwarenessSessionRequest,
  AudienceType,
  SessionDuration,
  SessionMode,
} from "@/types/awareness-session";
import {
  DURATION_LABELS,
  SESSION_MODE_LABELS,
  AUDIENCE_TYPE_LABELS,
} from "@/types/awareness-session";

interface AwarenessSessionEmailData {
  request: AwarenessSessionRequest;
  requesterName: string;
  expertName?: string;
  adminName?: string;
}

interface NewRequestNotificationData {
  request: AwarenessSessionRequest;
  requesterName: string;
}

interface StatusChangeNotificationData {
  request: AwarenessSessionRequest;
  requesterName: string;
  expertName?: string;
  previousStatus?: string;
}

interface ExpertAssignmentNotificationData {
  request: AwarenessSessionRequest;
  expertName: string;
  requesterName: string;
}

/**
 * Format audience types for display
 */
const formatAudienceTypes = (audienceTypes: AudienceType[]): string => {
  return audienceTypes.map((type) => AUDIENCE_TYPE_LABELS[type]).join(", ");
};

/**
 * Format session date for display
 */
const formatSessionDate = (date: Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

/**
 * Generate HTML email for new awareness session request notification (Admin)
 */
export const generateNewRequestNotificationHTML = (
  data: NewRequestNotificationData
): string => {
  const { request, requesterName } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Awareness Session Request - Kavach Admin</title>
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
            color: #1f2937;
        }
        .subtitle {
            font-size: 16px;
            color: #6b7280;
            margin-bottom: 30px;
        }
        .alert-box {
            background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
        }
        .alert-box h2 {
            margin: 0 0 10px 0;
            font-size: 18px;
        }
        .request-details {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .request-details h3 {
            color: #1f2937;
            margin: 0 0 15px 0;
            font-size: 18px;
        }
        .detail-row {
            display: flex;
            margin: 8px 0;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .detail-row:last-child {
            border-bottom: none;
        }
        .detail-label {
            font-weight: 600;
            color: #374151;
            min-width: 140px;
        }
        .detail-value {
            color: #6b7280;
            flex: 1;
        }
        .cta-button {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }
        .cta-button:hover {
            background-color: #1d4ed8;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
        }
        .urgent {
            background-color: #fef2f2;
            border-left: 4px solid #ef4444;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .urgent h4 {
            color: #dc2626;
            margin: 0 0 5px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Kavach</div>
            <h1 class="title">New Awareness Session Request</h1>
            <p class="subtitle">Admin Review Required</p>
        </div>

        <div class="alert-box">
            <h2>🔔 Action Required</h2>
            <p>A new cybersecurity awareness session request has been submitted and requires your review.</p>
        </div>

        <p>Hello Admin,</p>

        <p>A new awareness session request has been submitted by <strong>${requesterName}</strong> from <strong>${
    request.organizationName
  }</strong>. Please review the details below and take appropriate action.</p>

        <div class="request-details">
            <h3>📋 Session Details</h3>
            <div class="detail-row">
                <div class="detail-label">Request ID:</div>
                <div class="detail-value">${request.id}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Organization:</div>
                <div class="detail-value">${request.organizationName}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Session Date:</div>
                <div class="detail-value">${formatSessionDate(
                  request.sessionDate
                )}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Duration:</div>
                <div class="detail-value">${
                  DURATION_LABELS[request.duration]
                }</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Mode:</div>
                <div class="detail-value">${
                  SESSION_MODE_LABELS[request.sessionMode]
                }</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Location:</div>
                <div class="detail-value">${request.location}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Subject/Topic:</div>
                <div class="detail-value">${request.subject}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Audience Size:</div>
                <div class="detail-value">${
                  request.audienceSize
                } participants</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Audience Types:</div>
                <div class="detail-value">${formatAudienceTypes(
                  request.audienceTypes
                )}</div>
            </div>
            ${
              request.specialRequirements
                ? `
            <div class="detail-row">
                <div class="detail-label">Special Requirements:</div>
                <div class="detail-value">${request.specialRequirements}</div>
            </div>
            `
                : ""
            }
        </div>

        <div class="request-details">
            <h3>👤 Contact Information</h3>
            <div class="detail-row">
                <div class="detail-label">Contact Person:</div>
                <div class="detail-value">${requesterName}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Email:</div>
                <div class="detail-value">${request.contactEmail}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Phone:</div>
                <div class="detail-value">${request.contactPhone}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Submitted:</div>
                <div class="detail-value">${formatSessionDate(
                  request.createdAt
                )}</div>
            </div>
        </div>

        <div style="text-align: center;">
            <a href="${
              process.env.NEXT_PUBLIC_APP_URL || "https://kavach.com"
            }/admin/dashboard?tab=awareness-sessions" class="cta-button">
                Review Request
            </a>
        </div>

        <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
            Please review this request promptly and either approve it for expert assignment or reject it with appropriate feedback.
        </p>

        <div class="footer">
            <p>This is an automated notification from the Kavach Admin System.</p>
            <p>&copy; 2025 Kavach. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
};

/**
 * Generate text email for new awareness session request notification (Admin)
 */
export const generateNewRequestNotificationText = (
  data: NewRequestNotificationData
): string => {
  const { request, requesterName } = data;

  return `
New Awareness Session Request - Admin Review Required

Hello Admin,

A new awareness session request has been submitted by ${requesterName} from ${
    request.organizationName
  }. Please review the details below and take appropriate action.

SESSION DETAILS:
- Request ID: ${request.id}
- Organization: ${request.organizationName}
- Session Date: ${formatSessionDate(request.sessionDate)}
- Duration: ${DURATION_LABELS[request.duration]}
- Mode: ${SESSION_MODE_LABELS[request.sessionMode]}
- Location: ${request.location}
- Subject/Topic: ${request.subject}
- Audience Size: ${request.audienceSize} participants
- Audience Types: ${formatAudienceTypes(request.audienceTypes)}
${
  request.specialRequirements
    ? `- Special Requirements: ${request.specialRequirements}`
    : ""
}

CONTACT INFORMATION:
- Contact Person: ${requesterName}
- Email: ${request.contactEmail}
- Phone: ${request.contactPhone}
- Submitted: ${formatSessionDate(request.createdAt)}

Review this request: ${
    process.env.NEXT_PUBLIC_APP_URL || "https://kavach.com"
  }/admin/dashboard?tab=awareness-sessions

Please review this request promptly and either approve it for expert assignment or reject it with appropriate feedback.

---
This is an automated notification from the Kavach Admin System.
© 2025 Kavach. All rights reserved.
`;
};

/**
 * Generate HTML email for expert assignment notification
 */
export const generateExpertAssignmentNotificationHTML = (
  data: ExpertAssignmentNotificationData
): string => {
  const { request, expertName, requesterName } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Awareness Session Assignment - Kavach Expert</title>
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
            color: #1f2937;
        }
        .subtitle {
            font-size: 16px;
            color: #6b7280;
            margin-bottom: 30px;
        }
        .assignment-box {
            background: linear-gradient(135deg, #059669 0%, #10b981 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
        }
        .assignment-box h2 {
            margin: 0 0 10px 0;
            font-size: 18px;
        }
        .request-details {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .request-details h3 {
            color: #1f2937;
            margin: 0 0 15px 0;
            font-size: 18px;
        }
        .detail-row {
            display: flex;
            margin: 8px 0;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .detail-row:last-child {
            border-bottom: none;
        }
        .detail-label {
            font-weight: 600;
            color: #374151;
            min-width: 140px;
        }
        .detail-value {
            color: #6b7280;
            flex: 1;
        }
        .cta-buttons {
            text-align: center;
            margin: 30px 0;
        }
        .cta-button {
            display: inline-block;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 0 10px;
        }
        .cta-button.accept {
            background-color: #059669;
            color: white;
        }
        .cta-button.accept:hover {
            background-color: #047857;
        }
        .cta-button.view {
            background-color: #2563eb;
            color: white;
        }
        .cta-button.view:hover {
            background-color: #1d4ed8;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
        }
        .important-note {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .important-note h4 {
            color: #92400e;
            margin: 0 0 5px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Kavach</div>
            <h1 class="title">New Awareness Session Assignment</h1>
            <p class="subtitle">Expert Response Required</p>
        </div>

        <div class="assignment-box">
            <h2>🎯 You've Been Assigned!</h2>
            <p>A cybersecurity awareness session has been assigned to you by our admin team.</p>
        </div>

        <p>Hello ${expertName},</p>

        <p>You have been assigned to conduct a cybersecurity awareness session for <strong>${
          request.organizationName
        }</strong>. Please review the session details below and respond with your availability.</p>

        <div class="request-details">
            <h3>📋 Session Details</h3>
            <div class="detail-row">
                <div class="detail-label">Request ID:</div>
                <div class="detail-value">${request.id}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Organization:</div>
                <div class="detail-value">${request.organizationName}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Session Date:</div>
                <div class="detail-value">${formatSessionDate(
                  request.sessionDate
                )}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Duration:</div>
                <div class="detail-value">${
                  DURATION_LABELS[request.duration]
                }</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Mode:</div>
                <div class="detail-value">${
                  SESSION_MODE_LABELS[request.sessionMode]
                }</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Location:</div>
                <div class="detail-value">${request.location}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Subject/Topic:</div>
                <div class="detail-value">${request.subject}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Audience Size:</div>
                <div class="detail-value">${
                  request.audienceSize
                } participants</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Audience Types:</div>
                <div class="detail-value">${formatAudienceTypes(
                  request.audienceTypes
                )}</div>
            </div>
            ${
              request.specialRequirements
                ? `
            <div class="detail-row">
                <div class="detail-label">Special Requirements:</div>
                <div class="detail-value">${request.specialRequirements}</div>
            </div>
            `
                : ""
            }
        </div>

        <div class="request-details">
            <h3>👤 Contact Information</h3>
            <div class="detail-row">
                <div class="detail-label">Contact Person:</div>
                <div class="detail-value">${requesterName}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Email:</div>
                <div class="detail-value">${request.contactEmail}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Phone:</div>
                <div class="detail-value">${request.contactPhone}</div>
            </div>
        </div>

        <div class="important-note">
            <h4>⏰ Response Required</h4>
            <p>Please respond within 24 hours to confirm your availability for this session. If you cannot conduct this session, please decline so we can assign another expert.</p>
        </div>

        <div class="cta-buttons">
            <a href="${
              process.env.NEXT_PUBLIC_APP_URL || "https://kavach.com"
            }/dashboard?tab=awareness-sessions&request=${
    request.id
  }" class="cta-button view">
                View Full Details
            </a>
        </div>

        <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
            You can accept or decline this assignment from your expert dashboard. If you have any questions about the session requirements, please contact our admin team.
        </p>

        <div class="footer">
            <p>This is an automated notification from the Kavach Expert System.</p>
            <p>&copy; 2025 Kavach. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
};

/**
 * Generate text email for expert assignment notification
 */
export const generateExpertAssignmentNotificationText = (
  data: ExpertAssignmentNotificationData
): string => {
  const { request, expertName, requesterName } = data;

  return `
New Awareness Session Assignment - Expert Response Required

Hello ${expertName},

You have been assigned to conduct a cybersecurity awareness session for ${
    request.organizationName
  }. Please review the session details below and respond with your availability.

SESSION DETAILS:
- Request ID: ${request.id}
- Organization: ${request.organizationName}
- Session Date: ${formatSessionDate(request.sessionDate)}
- Duration: ${DURATION_LABELS[request.duration]}
- Mode: ${SESSION_MODE_LABELS[request.sessionMode]}
- Location: ${request.location}
- Subject/Topic: ${request.subject}
- Audience Size: ${request.audienceSize} participants
- Audience Types: ${formatAudienceTypes(request.audienceTypes)}
${
  request.specialRequirements
    ? `- Special Requirements: ${request.specialRequirements}`
    : ""
}

CONTACT INFORMATION:
- Contact Person: ${requesterName}
- Email: ${request.contactEmail}
- Phone: ${request.contactPhone}

RESPONSE REQUIRED:
Please respond within 24 hours to confirm your availability for this session. If you cannot conduct this session, please decline so we can assign another expert.

View full details and respond: ${
    process.env.NEXT_PUBLIC_APP_URL || "https://kavach.com"
  }/dashboard?tab=awareness-sessions&request=${request.id}

You can accept or decline this assignment from your expert dashboard. If you have any questions about the session requirements, please contact our admin team.

---
This is an automated notification from the Kavach Expert System.
© 2025 Kavach. All rights reserved.
`;
};

/**
 * Generate HTML email for status change notification (Requester)
 */
export const generateStatusChangeNotificationHTML = (
  data: StatusChangeNotificationData
): string => {
  const { request, requesterName, expertName, previousStatus } = data;

  const getStatusMessage = () => {
    switch (request.status) {
      case "forwarded_to_expert":
        return {
          title: "Request Approved & Forwarded to Expert",
          message:
            "Great news! Your awareness session request has been approved by our admin team and forwarded to an expert for confirmation.",
          color: "#059669",
          icon: "✅",
        };
      case "confirmed":
        return {
          title: "Session Confirmed!",
          message: `Excellent! Your awareness session has been confirmed by ${
            expertName || "our expert"
          }. You can expect to be contacted shortly to finalize the details.`,
          color: "#059669",
          icon: "🎉",
        };
      case "rejected":
        return {
          title: "Request Update",
          message:
            "We regret to inform you that your awareness session request could not be approved at this time.",
          color: "#dc2626",
          icon: "❌",
        };
      case "expert_declined":
        return {
          title: "Expert Reassignment in Progress",
          message:
            "The initially assigned expert was unable to conduct your session. Our admin team is working to assign another qualified expert.",
          color: "#f59e0b",
          icon: "🔄",
        };
      default:
        return {
          title: "Request Status Update",
          message: "Your awareness session request status has been updated.",
          color: "#2563eb",
          icon: "📋",
        };
    }
  };

  const statusInfo = getStatusMessage();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${statusInfo.title} - Kavach</title>
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
            color: #1f2937;
        }
        .subtitle {
            font-size: 16px;
            color: #6b7280;
            margin-bottom: 30px;
        }
        .status-box {
            background: linear-gradient(135deg, ${statusInfo.color} 0%, ${
    statusInfo.color
  }dd 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
        }
        .status-box h2 {
            margin: 0 0 10px 0;
            font-size: 18px;
        }
        .request-summary {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .request-summary h3 {
            color: #1f2937;
            margin: 0 0 15px 0;
            font-size: 18px;
        }
        .detail-row {
            display: flex;
            margin: 8px 0;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .detail-row:last-child {
            border-bottom: none;
        }
        .detail-label {
            font-weight: 600;
            color: #374151;
            min-width: 140px;
        }
        .detail-value {
            color: #6b7280;
            flex: 1;
        }
        .cta-button {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }
        .cta-button:hover {
            background-color: #1d4ed8;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
        }
        .rejection-note {
            background-color: #fef2f2;
            border-left: 4px solid #ef4444;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .rejection-note h4 {
            color: #dc2626;
            margin: 0 0 5px 0;
        }
        .expert-info {
            background-color: #f0fdf4;
            border-left: 4px solid #059669;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .expert-info h4 {
            color: #059669;
            margin: 0 0 5px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Kavach</div>
            <h1 class="title">${statusInfo.title}</h1>
            <p class="subtitle">Request Status Update</p>
        </div>

        <div class="status-box">
            <h2>${statusInfo.icon} ${statusInfo.title}</h2>
            <p>${statusInfo.message}</p>
        </div>

        <p>Dear ${requesterName},</p>

        <p>We wanted to update you on the status of your cybersecurity awareness session request for <strong>${
          request.organizationName
        }</strong>.</p>

        ${
          request.status === "confirmed" && expertName
            ? `
        <div class="expert-info">
            <h4>👨‍💼 Your Assigned Expert</h4>
            <p><strong>${expertName}</strong> will be conducting your awareness session. They will contact you directly to coordinate the final details and answer any questions you may have.</p>
        </div>
        `
            : ""
        }

        ${
          request.status === "rejected" && request.rejectionReason
            ? `
        <div class="rejection-note">
            <h4>📝 Reason for Decision</h4>
            <p>${request.rejectionReason}</p>
        </div>
        `
            : ""
        }

        <div class="request-summary">
            <h3>📋 Your Request Summary</h3>
            <div class="detail-row">
                <div class="detail-label">Request ID:</div>
                <div class="detail-value">${request.id}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Organization:</div>
                <div class="detail-value">${request.organizationName}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Session Date:</div>
                <div class="detail-value">${formatSessionDate(
                  request.sessionDate
                )}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Duration:</div>
                <div class="detail-value">${
                  DURATION_LABELS[request.duration]
                }</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Current Status:</div>
                <div class="detail-value" style="color: ${
                  statusInfo.color
                }; font-weight: 600;">${statusInfo.title}</div>
            </div>
        </div>

        <div style="text-align: center;">
            <a href="${
              process.env.NEXT_PUBLIC_APP_URL || "https://kavach.com"
            }/dashboard?tab=awareness-sessions" class="cta-button">
                View Request Details
            </a>
        </div>

        ${
          request.status === "rejected"
            ? `
        <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
            If you would like to submit a new request with modifications, you can do so from your dashboard. If you have questions about this decision, please contact our support team.
        </p>
        `
            : request.status === "confirmed"
            ? `
        <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
            We're excited to help enhance cybersecurity awareness for your organization. If you have any questions or need to make changes to your session, please contact us as soon as possible.
        </p>
        `
            : `
        <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
            We'll continue to keep you updated on the progress of your request. Thank you for your patience.
        </p>
        `
        }

        <div class="footer">
            <p>This is an automated notification from the Kavach Awareness Session System.</p>
            <p>&copy; 2025 Kavach. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
};

/**
 * Generate text email for status change notification (Requester)
 */
export const generateStatusChangeNotificationText = (
  data: StatusChangeNotificationData
): string => {
  const { request, requesterName, expertName, previousStatus } = data;

  const getStatusMessage = () => {
    switch (request.status) {
      case "forwarded_to_expert":
        return "Great news! Your awareness session request has been approved by our admin team and forwarded to an expert for confirmation.";
      case "confirmed":
        return `Excellent! Your awareness session has been confirmed by ${
          expertName || "our expert"
        }. You can expect to be contacted shortly to finalize the details.`;
      case "rejected":
        return "We regret to inform you that your awareness session request could not be approved at this time.";
      case "expert_declined":
        return "The initially assigned expert was unable to conduct your session. Our admin team is working to assign another qualified expert.";
      default:
        return "Your awareness session request status has been updated.";
    }
  };

  const statusMessage = getStatusMessage();

  return `
Awareness Session Request Status Update

Dear ${requesterName},

We wanted to update you on the status of your cybersecurity awareness session request for ${
    request.organizationName
  }.

${statusMessage}

${
  request.status === "confirmed" && expertName
    ? `
YOUR ASSIGNED EXPERT:
${expertName} will be conducting your awareness session. They will contact you directly to coordinate the final details and answer any questions you may have.
`
    : ""
}

${
  request.status === "rejected" && request.rejectionReason
    ? `
REASON FOR DECISION:
${request.rejectionReason}
`
    : ""
}

YOUR REQUEST SUMMARY:
- Request ID: ${request.id}
- Organization: ${request.organizationName}
- Session Date: ${formatSessionDate(request.sessionDate)}
- Duration: ${DURATION_LABELS[request.duration]}
- Current Status: ${request.status.replace(/_/g, " ").toUpperCase()}

View request details: ${
    process.env.NEXT_PUBLIC_APP_URL || "https://kavach.com"
  }/dashboard?tab=awareness-sessions

${
  request.status === "rejected"
    ? `
If you would like to submit a new request with modifications, you can do so from your dashboard. If you have questions about this decision, please contact our support team.
`
    : request.status === "confirmed"
    ? `
We're excited to help enhance cybersecurity awareness for your organization. If you have any questions or need to make changes to your session, please contact us as soon as possible.
`
    : `
We'll continue to keep you updated on the progress of your request. Thank you for your patience.
`
}

---
This is an automated notification from the Kavach Awareness Session System.
© 2025 Kavach. All rights reserved.
`;
};
