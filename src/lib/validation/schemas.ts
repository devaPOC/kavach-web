import { z } from 'zod';
import {
  Gender,
  UserRole,
  EmploymentStatus,
  Availability,
  WorkArrangement,
  VerificationType
} from './types';
import {
  calculateAge,
  validatePhoneNumber,
  isValidNameFormat,
  normalizeEmail,
  noHtmlTagsRegex,
  noHtmlTagsErrorMessage
} from './utils';

// Base field schemas
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .transform(normalizeEmail);

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

export const nameSchema = z
  .string()
  .min(1, 'This field is required')
  .min(2, 'Must be at least 2 characters long')
  .max(50, 'Must be less than 50 characters long')
  .refine(isValidNameFormat, 'Only letters, spaces, hyphens, and apostrophes are allowed');

export const phoneNumberSchema = z
  .string()
  .optional()
  .refine((phone) => {
    if (!phone) return true; // Optional field
    return validatePhoneNumber(phone) === null;
  }, 'Please enter a valid phone number');

export const requiredPhoneNumberSchema = z
  .string()
  .min(1, 'Phone number is required')
  .refine((phone) => {
    return validatePhoneNumber(phone) === null;
  }, 'Please enter a valid phone number');

export const dateOfBirthSchema = z
  .string()
  .optional()
  .refine((dateString) => {
    if (!dateString) return true; // Optional field
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }, 'Please enter a valid date')
  .refine((dateString) => {
    if (!dateString) return true;
    const date = new Date(dateString);
    const today = new Date();
    return date <= today;
  }, 'Date of birth cannot be in the future')
  .refine((dateString) => {
    if (!dateString) return true;
    const age = calculateAge(dateString);
    return age >= 15;
  }, 'You must be at least 15 years old to register');

export const requiredDateOfBirthSchema = z
  .string()
  .min(1, 'Date of birth is required')
  .refine((dateString) => {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }, 'Please enter a valid date')
  .refine((dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    return date <= today;
  }, 'Date of birth cannot be in the future')
  .refine((dateString) => {
    const age = calculateAge(dateString);
    return age >= 15;
  }, 'You must be at least 15 years old to register');

// Enum schemas
export const genderSchema = z.nativeEnum(Gender).optional();
export const userRoleSchema = z.nativeEnum(UserRole);
export const employmentStatusSchema = z.nativeEnum(EmploymentStatus).optional();
export const availabilitySchema = z.nativeEnum(Availability).optional();
export const workArrangementSchema = z.nativeEnum(WorkArrangement).optional();
export const verificationTypeSchema = z.nativeEnum(VerificationType).optional();

// Location schemas
export const countrySchema = z.string().optional();
export const nationalitySchema = z.string().optional();
export const governorateSchema = z.string().optional();
export const wilayatSchema = z.string().optional();

// Text field schemas - with XSS protection
export const longTextSchema = z.string().regex(noHtmlTagsRegex, noHtmlTagsErrorMessage).optional();
export const shortTextSchema = z.string().max(255, 'Must be less than 255 characters').regex(noHtmlTagsRegex, noHtmlTagsErrorMessage).optional();

// Service request specific schemas - with XSS protection
export const serviceRequestTitleSchema = z
  .string()
  .min(1, 'Title is required')
  .max(200, 'Title must be less than 200 characters')
  .regex(noHtmlTagsRegex, noHtmlTagsErrorMessage);

export const serviceRequestDescriptionSchema = z
  .string()
  .min(1, 'Description is required')
  .max(5000, 'Description must be less than 5000 characters')
  .regex(noHtmlTagsRegex, noHtmlTagsErrorMessage);

export const serviceRequestContextSchema = z
  .string()
  .max(2000, 'Additional context must be less than 2000 characters')
  .regex(noHtmlTagsRegex, noHtmlTagsErrorMessage)
  .optional();

export const serviceRequestUrlSchema = z
  .string()
  .min(1, 'URL is required')
  .max(2048, 'URL must be less than 2048 characters')
  .url('Please enter a valid URL');

export const serviceRequestEmailContentSchema = z
  .string()
  .min(1, 'Email content is required')
  .max(10000, 'Email content must be less than 10000 characters')
  .regex(noHtmlTagsRegex, noHtmlTagsErrorMessage);

export const serviceRequestMessageSchema = z
  .string()
  .min(1, 'Message content is required')
  .max(5000, 'Message content must be less than 5000 characters')
  .regex(noHtmlTagsRegex, noHtmlTagsErrorMessage);

export const serviceRequestShortFieldSchema = z
  .string()
  .max(500, 'Field must be less than 500 characters')
  .regex(noHtmlTagsRegex, noHtmlTagsErrorMessage)
  .optional();

export const serviceRequestMediumFieldSchema = z
  .string()
  .max(1000, 'Field must be less than 1000 characters')
  .regex(noHtmlTagsRegex, noHtmlTagsErrorMessage)
  .optional();

// Authentication schemas
// Backend signup schema (no confirmPassword required server-side)
export const signupSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: userRoleSchema,
  verificationType: verificationTypeSchema,
});

// Frontend-only signup form schema with confirmation
export const signupFormSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  role: userRoleSchema,
  verificationType: verificationTypeSchema,
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  role: userRoleSchema.optional()
});

export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  role: userRoleSchema
});

export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

export const emailVerificationSchema = z.object({
  token: z.string().min(1, 'Verification code is required'),
  email: emailSchema.optional()
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your new password')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// Base profile schema with common fields - ALL MANDATORY
export const baseProfileSchema = z.object({
  phoneNumber: requiredPhoneNumberSchema,
  dateOfBirth: dateOfBirthSchema.refine(val => val !== undefined && val !== null, {
    message: "Date of birth is required"
  }),
  gender: genderSchema.refine(val => val !== undefined && val !== null, {
    message: "Gender is required"
  }),
  nationality: nationalitySchema.refine(val => val !== undefined && val !== null && val.trim() !== '', {
    message: "Nationality is required"
  }),
  countryOfResidence: countrySchema.refine(val => val !== undefined && val !== null && val.trim() !== '', {
    message: "Country of residence is required"
  }),
  governorate: governorateSchema.optional(),
  wilayat: wilayatSchema.optional()
}).refine((data) => {
  // If country is Oman, governorate and wilayat are required
  if (data.countryOfResidence === 'om') {
    return data.governorate && data.governorate.trim() !== '' &&
      data.wilayat && data.wilayat.trim() !== '';
  }
  return true;
}, {
  message: "Governorate and Wilayat are required for Oman residents",
  path: ["governorate"]
});

// Expert profile schema - ALL MANDATORY
export const expertProfileSchema = baseProfileSchema.safeExtend({
  areasOfSpecialization: longTextSchema.refine(val => val !== undefined && val !== null && val.trim() !== '', {
    message: "Areas of specialization is required"
  }),
  professionalExperience: longTextSchema.refine(val => val !== undefined && val !== null && val.trim() !== '', {
    message: "Professional experience is required"
  }),
  relevantCertifications: longTextSchema.refine(val => val !== undefined && val !== null && val.trim() !== '', {
    message: "Relevant certifications is required"
  }),
  currentEmploymentStatus: employmentStatusSchema.refine(val => val !== undefined && val !== null, {
    message: "Current employment status is required"
  }),
  currentEmployer: shortTextSchema.refine(val => val !== undefined && val !== null && val.trim() !== '', {
    message: "Current employer is required"
  }),
  availability: availabilitySchema.refine(val => val !== undefined && val !== null, {
    message: "Availability is required"
  }),
  preferredWorkArrangement: workArrangementSchema.refine(val => val !== undefined && val !== null, {
    message: "Preferred work arrangement is required"
  }),
  preferredPaymentMethods: longTextSchema.refine(val => val !== undefined && val !== null && val.trim() !== '', {
    message: "Preferred payment methods is required"
  })
});

// Customer profile schema
export const customerProfileSchema = baseProfileSchema;

// Profile update schemas (for partial updates)
export const expertProfileUpdateSchema = expertProfileSchema.partial();
export const customerProfileUpdateSchema = customerProfileSchema.partial();

// Email check schema
export const emailCheckSchema = z.object({
  email: emailSchema
});

// Resend verification schema
export const resendVerificationSchema = z.object({
  email: emailSchema
});

// Service request schemas
export const checkUrlEmailMessageSchema = z.object({
  contentType: z.enum(['url', 'email', 'message']),
  userinput: z.union([
    serviceRequestUrlSchema,
    serviceRequestEmailContentSchema,
    serviceRequestMessageSchema
  ]),
  additionalcontext: serviceRequestContextSchema
});

export const emergencyCybersecuritySchema = z.object({
  incidenttype: z.string().min(1, 'Incident type is required').max(200, 'Incident type must be less than 200 characters'),
  incidentdetails: serviceRequestDescriptionSchema
});

export const deviceRepairSchema = z.object({
  devicetype: z.string().min(1, 'Device type is required').max(100, 'Device type must be less than 100 characters'),
  deviceproblem: serviceRequestDescriptionSchema
});

export const socialMediaPrivacySchema = z.object({
  platforms: z.array(z.enum(['Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'TikTok']))
    .min(1, 'Please select at least one platform'),
  profileUrls: z.array(z.string().url('Please enter valid URLs'))
    .min(1, 'Please provide at least one profile URL'),
  securityConcerns: z.array(z.enum([
    'Exposure of Personal Information',
    'Public Visibility of Private Content',
    'Tagged Posts and Location Sharing',
    'Over-Sharing of Daily Activities',
    'Friend List and Network Privacy',
    'Unauthorized App or Third-Party Access',
    'Impersonation or Fake Profiles',
    'Phishing or Suspicious Messages',
    'Facial Recognition and Photo Tagging',
    'Risky Posts from the Past',
    'Data Sharing with Advertisers or Unknown Entities',
    'Lack of 2-Factor Authentication or Weak Password Use',
    'Profile Cloning or Account Hijacking',
    'Search Engine Visibility',
    'Children\'s Photos or Information on Profile'
  ])).optional()
});

export const removeInformationSchema = z.object({
  websitestoremove: serviceRequestMediumFieldSchema,
  personalinfo: serviceRequestDescriptionSchema
});

export const passwordResetSchema = z.object({
  compromisedaccount: z.string().min(1, 'Compromised account is required').max(200, 'Account name must be less than 200 characters'),
  hackedpassword: serviceRequestMediumFieldSchema
});

export const identityLeakSchema = z.object({
  identityinfo: serviceRequestMediumFieldSchema,
  suspiciousactivity: serviceRequestMediumFieldSchema
});

export const homeSecuritySchema = z.object({
  homenetwork: serviceRequestShortFieldSchema,
  securityassessment: serviceRequestMediumFieldSchema
});

export const phishingLinkSchema = z.object({
  phishinglink: serviceRequestUrlSchema.optional(),
  clickedlink: serviceRequestUrlSchema.optional(),
  phishingdetails: serviceRequestMediumFieldSchema
}).refine(data => data.phishinglink || data.clickedlink, {
  message: 'Either phishing link or clicked link is required'
});

export const malwareRemovalSchema = z.object({
  malwaretype: z.string().min(1, 'Malware type is required').max(200, 'Malware type must be less than 200 characters'),
  malwaredetails: serviceRequestDescriptionSchema
});

export const dataRecoverySchema = z.object({
  lostdata: z.string().min(1, 'Lost data description is required').max(500, 'Lost data description must be less than 500 characters'),
  recoverydetails: serviceRequestDescriptionSchema
});

export const parentalControlsSchema = z.object({
  childage: z.string().min(1, 'Child age is required').max(50, 'Child age must be less than 50 characters'),
  parentalcontrols: serviceRequestMediumFieldSchema
});

export const cybersecurityAwarenessTrainingSchema = z.object({
  awarenessSubject: z.string().min(1, 'Awareness subject is required').max(200, 'Awareness subject must be less than 200 characters'),
  awarenessPlace: z.string().min(1, 'Training place is required').max(200, 'Training place must be less than 200 characters'),
  audienceNumber: z.string().min(1, 'Number of audience is required').max(100, 'Number of audience must be less than 100 characters'),
  audienceType: z.string().min(1, 'Audience type is required').max(100, 'Audience type must be less than 100 characters'),
  preferredDate: z.string().min(1, 'Preferred date is required'),
  preferredTime: z.string().min(1, 'Preferred time is required'),
  trainingDuration: z.string().min(1, 'Training duration is required').max(100, 'Training duration must be less than 100 characters'),
  trainingObjectives: z.string().min(10, 'Training objectives must be at least 10 characters').max(1000, 'Training objectives must be less than 1000 characters'),
  additionalRequirements: z.string().max(500, 'Additional requirements must be less than 500 characters').optional()
});

// Export type definitions
export type SignupData = z.infer<typeof signupSchema>;
export type SignupFormData = z.infer<typeof signupFormSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type LoginFormData = z.infer<typeof loginFormSchema>;
export type AdminLoginData = z.infer<typeof adminLoginSchema>;
export type EmailVerificationData = z.infer<typeof emailVerificationSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;
export type BaseProfileData = z.infer<typeof baseProfileSchema>;
export type ExpertProfileData = z.infer<typeof expertProfileSchema>;
export type CustomerProfileData = z.infer<typeof customerProfileSchema>;
export type ExpertProfileUpdateData = z.infer<typeof expertProfileUpdateSchema>;
export type CustomerProfileUpdateData = z.infer<typeof customerProfileUpdateSchema>;
export type EmailCheckData = z.infer<typeof emailCheckSchema>;
export type ResendVerificationData = z.infer<typeof resendVerificationSchema>;

// Service request type definitions
export type CheckUrlEmailMessageData = z.infer<typeof checkUrlEmailMessageSchema>;
export type EmergencyCybersecurityData = z.infer<typeof emergencyCybersecuritySchema>;
export type DeviceRepairData = z.infer<typeof deviceRepairSchema>;
export type SocialMediaPrivacyData = z.infer<typeof socialMediaPrivacySchema>;
export type RemoveInformationData = z.infer<typeof removeInformationSchema>;
export type PasswordResetData = z.infer<typeof passwordResetSchema>;
export type IdentityLeakData = z.infer<typeof identityLeakSchema>;
export type HomeSecurityData = z.infer<typeof homeSecuritySchema>;
export type PhishingLinkData = z.infer<typeof phishingLinkSchema>;
export type MalwareRemovalData = z.infer<typeof malwareRemovalSchema>;
export type DataRecoveryData = z.infer<typeof dataRecoverySchema>;
export type ParentalControlsData = z.infer<typeof parentalControlsSchema>;
export type CybersecurityAwarenessTrainingData = z.infer<typeof cybersecurityAwarenessTrainingSchema>;

// Schema collections for easy access
export const authSchemas = {
  signup: signupSchema,
  signupForm: signupFormSchema,
  login: loginSchema,
  loginForm: loginFormSchema,
  adminLogin: adminLoginSchema,
  emailVerification: emailVerificationSchema,
  changePassword: changePasswordSchema,
  emailCheck: emailCheckSchema,
  resendVerification: resendVerificationSchema
} as const;

export const profileSchemas = {
  base: baseProfileSchema,
  expert: expertProfileSchema,
  customer: customerProfileSchema,
  expertUpdate: expertProfileUpdateSchema,
  customerUpdate: customerProfileUpdateSchema
} as const;

export const serviceRequestSchemas = {
  emergencyCybersecurity: emergencyCybersecuritySchema,
  deviceRepair: deviceRepairSchema,
  socialMediaPrivacy: socialMediaPrivacySchema,
  removeInformation: removeInformationSchema,
  passwordReset: passwordResetSchema,
  homeSecurity: homeSecuritySchema,
  phishingLink: phishingLinkSchema,
  malwareRemoval: malwareRemovalSchema,
  dataRecovery: dataRecoverySchema,
  parentalControls: parentalControlsSchema,
  cybersecurityAwarenessTraining: cybersecurityAwarenessTrainingSchema
} as const;

export const fieldSchemas = {
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  phoneNumber: phoneNumberSchema,
  requiredPhoneNumber: requiredPhoneNumberSchema,
  dateOfBirth: dateOfBirthSchema,
  requiredDateOfBirth: requiredDateOfBirthSchema,
  gender: genderSchema,
  userRole: userRoleSchema,
  employmentStatus: employmentStatusSchema,
  availability: availabilitySchema,
  workArrangement: workArrangementSchema,
  country: countrySchema,
  nationality: nationalitySchema,
  governorate: governorateSchema,
  wilayat: wilayatSchema,
  longText: longTextSchema,
  shortText: shortTextSchema
} as const;

// Re-export awareness lab validation
export * from './awareness-lab-index';

// Re-export XSS prevention utilities for convenience
export { noHtmlTagsRegex, noHtmlTagsErrorMessage } from './utils';
