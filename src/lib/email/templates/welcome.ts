/**
 * Welcome email template for new users
 */

interface WelcomeEmailData {
  firstName: string;
  lastName: string;
  role: "customer" | "expert";
}

export const generateWelcomeEmailHTML = (data: WelcomeEmailData): string => {
  const { firstName, lastName, role } = data;

  const roleSpecificContent =
    role === "customer"
      ? {
          title: "Welcome to Kavach!",
          description:
            "You're now part of our community of customers looking for expert services.",
          nextSteps: [
            "Browse available experts in your area",
            "Post your service requests",
            "Connect with qualified professionals",
            "Leave reviews and build your reputation",
          ],
        }
      : {
          title: "Welcome to Kavach Expert Network!",
          description:
            "You're now part of our community of professional service providers.",
          nextSteps: [
            "Complete your expert profile",
            "Set your service areas and expertise",
            "Start receiving customer requests",
            "Build your professional reputation",
          ],
        };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${roleSpecificContent.title} - Kavach</title>
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
        .welcome-message {
            background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
            color: white;
            padding: 30px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
        }
        .welcome-message h2 {
            margin: 0 0 10px 0;
            font-size: 20px;
        }
        .next-steps {
            margin: 30px 0;
        }
        .next-steps h3 {
            color: #1f2937;
            margin-bottom: 15px;
        }
        .steps-list {
            list-style: none;
            padding: 0;
        }
        .steps-list li {
            background-color: #f8fafc;
            margin: 8px 0;
            padding: 12px 16px;
            border-left: 4px solid #2563eb;
            border-radius: 4px;
        }
        .steps-list li:before {
            content: "✓";
            color: #2563eb;
            font-weight: bold;
            margin-right: 10px;
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
        .support-section {
            background-color: #f0f9ff;
            border: 1px solid #bae6fd;
            padding: 20px;
            border-radius: 8px;
            margin: 30px 0;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
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
            <h1 class="title">${roleSpecificContent.title}</h1>
            <p class="subtitle">${roleSpecificContent.description}</p>
        </div>

        <div class="welcome-message">
            <h2>🎉 Welcome, ${firstName}!</h2>
            <p>Your email has been verified and your account is now active.</p>
        </div>

        <p>Hi ${firstName} ${lastName},</p>

        <p>Congratulations! You've successfully joined Kavach as ${
          role === "customer" ? "a customer" : "an expert"
        }. We're excited to have you as part of our growing community.</p>

        <div class="next-steps">
            <h3>🚀 Here's what you can do next:</h3>
            <ul class="steps-list">
                ${roleSpecificContent.nextSteps
                  .map((step) => `<li>${step}</li>`)
                  .join("")}
            </ul>
        </div>

        <div style="text-align: center;">
            <a href="${
              process.env.NEXT_PUBLIC_APP_URL || "https://kavach.com"
            }/dashboard" class="cta-button">
                Get Started Now
            </a>
        </div>

        <div class="support-section">
            <h3>💬 Need Help?</h3>
            <p>Our support team is here to help you get the most out of Kavach. If you have any questions or need assistance, don't hesitate to reach out:</p>
            <ul>
                <li>📧 Email: support@kavach.com</li>
                <li>📚 Help Center: kavach.com/help</li>
                <li>💬 Live Chat: Available in your dashboard</li>
            </ul>
        </div>

        <p>Thank you for choosing Kavach. We look forward to helping you ${
          role === "customer"
            ? "find the perfect experts for your needs"
            : "grow your business and connect with customers"
        }!</p>

        <p>Best regards,<br>The Kavach Team</p>

        <div class="footer">
            <p>This email was sent to you because you created an account with Kavach.</p>
            <p>&copy; 2025 Kavach. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
};

export const generateWelcomeEmailText = (data: WelcomeEmailData): string => {
  const { firstName, lastName, role } = data;

  const roleSpecificContent =
    role === "customer"
      ? {
          title: "Welcome to Kavach!",
          description:
            "You're now part of our community of customers looking for expert services.",
          nextSteps: [
            "Browse available experts in your area",
            "Post your service requests",
            "Connect with qualified professionals",
            "Leave reviews and build your reputation",
          ],
        }
      : {
          title: "Welcome to Kavach Expert Network!",
          description:
            "You're now part of our community of professional service providers.",
          nextSteps: [
            "Complete your expert profile",
            "Set your service areas and expertise",
            "Start receiving customer requests",
            "Build your professional reputation",
          ],
        };

  return `
${roleSpecificContent.title}

Hi ${firstName} ${lastName},

Congratulations! You've successfully joined Kavach as ${
    role === "customer" ? "a customer" : "an expert"
  }. We're excited to have you as part of our growing community.

${roleSpecificContent.description}

Your email has been verified and your account is now active.

Here's what you can do next:
${roleSpecificContent.nextSteps
  .map((step, index) => `${index + 1}. ${step}`)
  .join("\n")}

Get started now: ${
    process.env.NEXT_PUBLIC_APP_URL || "https://kavach.com"
  }/dashboard

NEED HELP?
Our support team is here to help you get the most out of Kavach:
- Email: support@kavach.com
- Help Center: kavach.com/help
- Live Chat: Available in your dashboard

Thank you for choosing Kavach. We look forward to helping you ${
    role === "customer"
      ? "find the perfect experts for your needs"
      : "grow your business and connect with customers"
  }!

Best regards,
The Kavach Team

---
This email was sent to you because you created an account with Kavach.
© 2025 Kavach. All rights reserved.
`;
};
