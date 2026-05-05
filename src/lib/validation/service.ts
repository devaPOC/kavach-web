import { z } from 'zod';
import {
  ValidationResult,
  ValidationContext,
  AsyncValidationError
} from './types';
import {
  authSchemas,
  profileSchemas,
  serviceRequestSchemas,
  fieldSchemas,
  type SignupData,
  type LoginData,
  type LoginFormData,
  type AdminLoginData,
  type EmailVerificationData,
  type ChangePasswordData,
  type ExpertProfileData,
  type CustomerProfileData,
  type ExpertProfileUpdateData,
  type CustomerProfileUpdateData,
  type EmailCheckData,
  type ResendVerificationData,
  type EmergencyCybersecurityData,
  type DeviceRepairData,
  type SocialMediaPrivacyData,
  type RemoveInformationData,
  type PasswordResetData,
  type HomeSecurityData,
  type PhishingLinkData,
  type MalwareRemovalData,
  type DataRecoveryData,
  type ParentalControlsData,
  type CybersecurityAwarenessTrainingData
} from './schemas';
import { validateForm, safeValidate } from './utils';

/**
 * Unified Validation Service
 * Provides consistent validation methods across the application
 */
export class ValidationService {
  /**
   * Validate signup data
   */
  static validateSignup(data: unknown, context?: ValidationContext): ValidationResult<SignupData> {
    return validateForm(authSchemas.signup, data);
  }

  /**
   * Validate signup form data (frontend - includes confirmPassword)
   */
  static validateSignupForm(data: unknown, context?: ValidationContext): ValidationResult<import('./schemas').SignupFormData> {
    return validateForm(authSchemas.signupForm, data);
  }

  /**
   * Validate login data (backend - role optional)
   */
  static validateLogin(data: unknown, context?: ValidationContext): ValidationResult<LoginData> {
    return validateForm(authSchemas.login, data);
  }

  /**
   * Validate login form data (frontend - role required)
   */
  static validateLoginForm(data: unknown, context?: ValidationContext): ValidationResult<LoginFormData> {
    return validateForm(authSchemas.loginForm, data);
  }

  /**
   * Validate admin login data
   */
  static validateAdminLogin(data: unknown, context?: ValidationContext): ValidationResult<AdminLoginData> {
    return validateForm(authSchemas.adminLogin, data);
  }

  /**
   * Validate email verification data
   */
  static validateEmailVerification(data: unknown, context?: ValidationContext): ValidationResult<EmailVerificationData> {
    return validateForm(authSchemas.emailVerification, data);
  }

  /**
   * Validate change password data
   */
  static validateChangePassword(data: unknown, context?: ValidationContext): ValidationResult<ChangePasswordData> {
    return validateForm(authSchemas.changePassword, data);
  }

  /**
   * Validate expert profile data
   */
  static validateExpertProfile(data: unknown, context?: ValidationContext): ValidationResult<ExpertProfileData> {
    return validateForm(profileSchemas.expert, data);
  }

  /**
   * Validate customer profile data
   */
  static validateCustomerProfile(data: unknown, context?: ValidationContext): ValidationResult<CustomerProfileData> {
    return validateForm(profileSchemas.customer, data);
  }

  /**
   * Validate expert profile update data (partial)
   */
  static validateExpertProfileUpdate(data: unknown, context?: ValidationContext): ValidationResult<ExpertProfileUpdateData> {
    return validateForm(profileSchemas.expertUpdate, data);
  }

  /**
   * Validate customer profile update data (partial)
   */
  static validateCustomerProfileUpdate(data: unknown, context?: ValidationContext): ValidationResult<CustomerProfileUpdateData> {
    return validateForm(profileSchemas.customerUpdate, data);
  }

  /**
   * Validate email check data
   */
  static validateEmailCheck(data: unknown, context?: ValidationContext): ValidationResult<EmailCheckData> {
    return validateForm(authSchemas.emailCheck, data);
  }

  /**
   * Validate resend verification data
   */
  static validateResendVerification(data: unknown, context?: ValidationContext): ValidationResult<ResendVerificationData> {
    return validateForm(authSchemas.resendVerification, data);
  }

  // Service Request Validation Methods

  /**
   * Validate emergency cybersecurity incident form data
   */
  static validateEmergencyCybersecurity(data: unknown, context?: ValidationContext): ValidationResult<EmergencyCybersecurityData> {
    return validateForm(serviceRequestSchemas.emergencyCybersecurity, data);
  }

  /**
   * Validate device repair form data
   */
  static validateDeviceRepair(data: unknown, context?: ValidationContext): ValidationResult<DeviceRepairData> {
    return validateForm(serviceRequestSchemas.deviceRepair, data);
  }

  /**
   * Validate social media privacy scan form data
   */
  static validateSocialMediaPrivacy(data: unknown, context?: ValidationContext): ValidationResult<SocialMediaPrivacyData> {
    return validateForm(serviceRequestSchemas.socialMediaPrivacy, data);
  }

  /**
   * Validate remove information from internet form data
   */
  static validateRemoveInformation(data: unknown, context?: ValidationContext): ValidationResult<RemoveInformationData> {
    return validateForm(serviceRequestSchemas.removeInformation, data);
  }

  /**
   * Validate password reset form data
   */
  static validatePasswordReset(data: unknown, context?: ValidationContext): ValidationResult<PasswordResetData> {
    return validateForm(serviceRequestSchemas.passwordReset, data);
  }

  /**
   * Validate home security assessment form data
   */
  static validateHomeSecurity(data: unknown, context?: ValidationContext): ValidationResult<HomeSecurityData> {
    return validateForm(serviceRequestSchemas.homeSecurity, data);
  }

  /**
   * Validate phishing link response form data
   */
  static validatePhishingLink(data: unknown, context?: ValidationContext): ValidationResult<PhishingLinkData> {
    return validateForm(serviceRequestSchemas.phishingLink, data);
  }

  /**
   * Validate malware removal form data
   */
  static validateMalwareRemoval(data: unknown, context?: ValidationContext): ValidationResult<MalwareRemovalData> {
    return validateForm(serviceRequestSchemas.malwareRemoval, data);
  }

  /**
   * Validate data recovery form data
   */
  static validateDataRecovery(data: unknown, context?: ValidationContext): ValidationResult<DataRecoveryData> {
    return validateForm(serviceRequestSchemas.dataRecovery, data);
  }

  /**
   * Validate parental controls form data
   */
  static validateParentalControls(data: unknown, context?: ValidationContext): ValidationResult<ParentalControlsData> {
    return validateForm(serviceRequestSchemas.parentalControls, data);
  }

  /**
   * Validate cybersecurity awareness training form data
   */
  static validateCybersecurityAwarenessTraining(data: unknown, context?: ValidationContext): ValidationResult<CybersecurityAwarenessTrainingData> {
    return validateForm(serviceRequestSchemas.cybersecurityAwarenessTraining, data);
  }

  /**
   * Validate a single field using field schemas
   */
  static validateField<K extends keyof typeof fieldSchemas>(
    fieldName: K,
    value: unknown,
    context?: ValidationContext
  ): ValidationResult {
    const schema = fieldSchemas[fieldName];
    const result = validateForm(schema, value);

    // If validation failed, ensure the error is keyed by the field name
    if (!result.success && Object.keys(result.errors).length === 0) {
      // Use a generic error message if no specific error was provided
      result.errors[fieldName] = `Invalid ${fieldName}`;
    }

    return result;
  }

  /**
   * Safe validation that returns Zod's SafeParseResult
   */
  static safeValidateSignup(data: unknown) {
    return safeValidate(authSchemas.signup, data);
  }

  static safeValidateLogin(data: unknown) {
    return safeValidate(authSchemas.login, data);
  }

  static safeValidateExpertProfile(data: unknown) {
    return safeValidate(profileSchemas.expert, data);
  }

  static safeValidateCustomerProfile(data: unknown) {
    return safeValidate(profileSchemas.customer, data);
  }

  /**
   * Batch validation for multiple fields
   */
  static validateFields(
    fields: Record<string, { schema: keyof typeof fieldSchemas; value: unknown }>,
    context?: ValidationContext
  ): Record<string, ValidationResult> {
    const results: Record<string, ValidationResult> = {};

    Object.entries(fields).forEach(([fieldName, { schema, value }]) => {
      results[fieldName] = this.validateField(schema, value, context);
    });

    return results;
  }

  /**
   * Validate with custom schema
   */
  static validateWithSchema<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    context?: ValidationContext
  ): ValidationResult<T> {
    return validateForm(schema, data);
  }

  /**
   * Get validation schema by name
   */
  static getAuthSchema(schemaName: keyof typeof authSchemas) {
    return authSchemas[schemaName];
  }

  static getProfileSchema(schemaName: keyof typeof profileSchemas) {
    return profileSchemas[schemaName];
  }

  static getFieldSchema(schemaName: keyof typeof fieldSchemas) {
    return fieldSchemas[schemaName];
  }

  /**
   * Async validation wrapper (for future use with database checks)
   */
  static async validateAsync<T>(
    validationFn: () => ValidationResult<T>,
    asyncChecks?: Array<() => Promise<void>>,
    context?: ValidationContext
  ): Promise<ValidationResult<T>> {
    // First run synchronous validation
    const syncResult = validationFn();

    if (!syncResult.success) {
      return syncResult;
    }

    // Skip async validation if requested
    if (context?.skipAsyncValidation || !asyncChecks?.length) {
      return syncResult;
    }

    // Run async checks
    try {
      await Promise.all(asyncChecks.map(check => check()));
      return syncResult;
    } catch (error) {
      if (error instanceof AsyncValidationError) {
        return {
          success: false,
          errors: { [error.field || 'general']: error.message }
        };
      }

      return {
        success: false,
        errors: { general: 'Async validation failed' }
      };
    }
  }
}

// Export convenience functions for common validations
export const validateSignup = ValidationService.validateSignup;
export const validateLogin = ValidationService.validateLogin;
export const validateLoginForm = ValidationService.validateLoginForm;
export const validateAdminLogin = ValidationService.validateAdminLogin;
export const validateEmailVerification = ValidationService.validateEmailVerification;
export const validateChangePassword = ValidationService.validateChangePassword;
export const validateExpertProfile = ValidationService.validateExpertProfile;
export const validateCustomerProfile = ValidationService.validateCustomerProfile;
export const validateExpertProfileUpdate = ValidationService.validateExpertProfileUpdate;
export const validateCustomerProfileUpdate = ValidationService.validateCustomerProfileUpdate;
export const validateEmailCheck = ValidationService.validateEmailCheck;
export const validateResendVerification = ValidationService.validateResendVerification;
