// Legacy client validation file - now uses unified validation system
// This file is kept for backward compatibility but delegates to the unified system

import { calculateAge as unifiedCalculateAge, validateDateOfBirth as unifiedValidateDateOfBirth } from '../validation/utils';

/**
 * Calculate age from date of birth
 * @deprecated Use calculateAge from @/lib/validation/utils instead
 */
export const calculateAge = unifiedCalculateAge;

/**
 * Validate date of birth for minimum age requirement
 * @deprecated Use validateDateOfBirth from @/lib/validation/utils instead
 */
export const validateDateOfBirth = unifiedValidateDateOfBirth;
