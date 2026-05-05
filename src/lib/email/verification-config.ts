/**
 * Email verification configuration utilities
 */

export type VerificationType = 'magic_link';
export type VerificationMode = 'magic_link';

export interface VerificationConfig {
  mode: VerificationMode;
  magicLinkExpirationHours: number;
}

/**
 * Get verification configuration from environment variables
 */
export function getVerificationConfig(): VerificationConfig {
  return {
    mode: 'magic_link',
    magicLinkExpirationHours: parseInt(process.env.EMAIL_VERIFICATION_MAGIC_LINK_EXPIRATION_HOURS || '1'),
  };
}

/**
 * Determine which verification type to use based on configuration and user preference
 */
export function getVerificationTypeForUser(
  userPreference?: VerificationType,
  config?: VerificationConfig
): VerificationType {
  return 'magic_link';
}

/**
 * Get expiration time for verification type
 */
export function getExpirationTime(type: VerificationType, config?: VerificationConfig): Date {
  const verificationConfig = config || getVerificationConfig();
  return new Date(Date.now() + verificationConfig.magicLinkExpirationHours * 60 * 60 * 1000);
}

/**
 * Get display expiration minutes for email template
 */
export function getDisplayExpirationMinutes(type: VerificationType, config?: VerificationConfig): number {
  const verificationConfig = config || getVerificationConfig();
  return verificationConfig.magicLinkExpirationHours * 60;
}