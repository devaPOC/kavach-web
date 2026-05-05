import type { users, expertProfiles, customerProfiles } from '../../database/schema';

// Infer types from the schema
export type User = typeof users.$inferSelect;
export type ExpertProfile = typeof expertProfiles.$inferSelect;
export type CustomerProfile = typeof customerProfiles.$inferSelect;

// Input types for creating profiles
export type CreateExpertProfileData = Omit<
  typeof expertProfiles.$inferInsert,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
>;

export type CreateCustomerProfileData = Omit<
  typeof customerProfiles.$inferInsert,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
>;

// Combined profile data type
export type ProfileData = {
  user: User;
  profile: ExpertProfile | CustomerProfile | null;
  type: 'expert' | 'customer';
};

// Form data types for the wizard
export type ExpertProfileFormData = {
  // Personal Information
  phoneNumber?: string;
  dateOfBirth?: string; // Will be converted to Date
  gender?: 'male' | 'female' | 'prefer-not-to-say';
  nationality?: string;
  countryOfResidence?: string;
  governorate?: string;
  wilayat?: string;

  // Professional Information
  areasOfSpecialization?: string;
  professionalExperience?: string;
  relevantCertifications?: string;
  currentEmploymentStatus?: 'employed' | 'self-employed' | 'unemployed' | 'student';
  currentEmployer?: string;

  // Preferences
  availability?: 'full-time' | 'part-time' | 'flexible';
  preferredWorkArrangement?: 'remote' | 'on-site' | 'hybrid';
  preferredPaymentMethods?: string;
};

export type CustomerProfileFormData = {
  // Personal Information
  phoneNumber?: string;
  dateOfBirth?: string; // Will be converted to Date
  gender?: 'male' | 'female' | 'prefer-not-to-say';
  nationality?: string;
  countryOfResidence?: string;
  governorate?: string;
  wilayat?: string;
};
