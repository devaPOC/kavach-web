// Legacy validation file - now uses unified validation system
// This file is kept for backward compatibility but delegates to the unified system

import {
  authSchemas,
  fieldSchemas,
  type SignupData,
  type LoginData as ValidationLoginData,
  type LoginFormData,
  type AdminLoginData,
  type EmailVerificationData
} from '../validation';
import { validateField as unifiedValidateField, validateForm as unifiedValidateForm } from '../validation/utils';

// Re-export schemas from unified system
export const emailSchema = fieldSchemas.email;
export const passwordSchema = fieldSchemas.password;
export const nameSchema = fieldSchemas.name;
export const roleSchema = fieldSchemas.userRole;
export const loginFormSchema = authSchemas.loginForm;
export const loginSchema = authSchemas.login;
export const signupSchema = authSchemas.signup;
export const adminLoginSchema = authSchemas.adminLogin;
export const emailVerificationSchema = authSchemas.emailVerification;

// Re-export types with legacy names for backward compatibility
export type { LoginFormData };
export type { ValidationLoginData as LoginData };
export type { SignupData as SignupFormData };
export type { AdminLoginData as AdminLoginFormData };
export type { EmailVerificationData as EmailVerificationFormData };

// Legacy validation helper functions that delegate to unified system
export const validateField = unifiedValidateField;

export const validateForm = <T>(schema: any, data: unknown): {
  isValid: boolean;
  errors: Record<string, string>;
  data?: T | any;
} => {
  const result = unifiedValidateForm(schema, data);
  return {
    isValid: result.success,
    errors: result.errors,
    data: result.data
  };
};
