import nodemailer from 'nodemailer';

/**
 * Gmail SMTP configuration with secure authentication
 */
export const createSMTPTransporter = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpSecure = process.env.SMTP_SECURE === 'true';

  if (!emailUser || !emailPassword) {
    throw new Error('SMTP credentials are not configured. Please set EMAIL_USER and EMAIL_PASSWORD environment variables.');
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure, // true for 465, false for other ports
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
    tls: {
      rejectUnauthorized: true,
    },
  });
};

/**
 * Verify SMTP connection
 */
export const verifySMTPConnection = async () => {
  try {
    const transporter = createSMTPTransporter();
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('SMTP connection verification failed:', error);
    return false;
  }
};