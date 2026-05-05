// Legacy profile validation file - now uses unified validation system
// This file is kept for backward compatibility but delegates to the unified system

import { 
  profileSchemas,
  fieldSchemas,
  ValidationService,
  type ExpertProfileData,
  type CustomerProfileData
} from '../../validation';
import { calculateAge } from '../../validation/utils';

// Re-export schemas from unified system
export const dateOfBirthSchema = fieldSchemas.dateOfBirth;
export const phoneNumberSchema = fieldSchemas.phoneNumber;
export const expertProfileSchema = profileSchemas.expert;
export const customerProfileSchema = profileSchemas.customer;

// Re-export utility function
export { calculateAge };

// Legacy validation helper functions that delegate to unified system
export const validateExpertProfile = (data: unknown) => {
  return ValidationService.safeValidateExpertProfile(data);
};

export const validateCustomerProfile = (data: unknown) => {
  return ValidationService.safeValidateCustomerProfile(data);
};

// Re-export types with legacy names for backward compatibility
export type ExpertProfileValidation = ExpertProfileData;
export type CustomerProfileValidation = CustomerProfileData;
