// Legacy password schemas file - now uses unified validation system
// This file is kept for backward compatibility but delegates to the unified system

import { fieldSchemas } from '../validation';
import { PasswordStrength, assessPasswordStrength as unifiedAssessPasswordStrength } from '../validation/utils';

// Re-export password schema from unified system
export const passwordSchema = fieldSchemas.password;

// Re-export password strength enum and function
export { PasswordStrength };
export const assessPasswordStrength = unifiedAssessPasswordStrength;
