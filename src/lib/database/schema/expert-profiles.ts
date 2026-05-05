import { pgTable, uuid, varchar, text, date, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const expertProfiles = pgTable('expert_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Personal Information
  phoneNumber: varchar('phone_number', { length: 20 }),
  dateOfBirth: date('date_of_birth'),
  gender: varchar('gender', { length: 20 }).$type<'male' | 'female' | 'prefer-not-to-say'>(),
  nationality: varchar('nationality', { length: 100 }),
  countryOfResidence: varchar('country_of_residence', { length: 100 }),
  governorate: varchar('governorate', { length: 100 }), // For Oman
  wilayat: varchar('wilayat', { length: 100 }), // For Oman

  // Professional Information
  areasOfSpecialization: text('areas_of_specialization'),
  professionalExperience: text('professional_experience'),
  relevantCertifications: text('relevant_certifications'),
  currentEmploymentStatus: varchar('current_employment_status', { length: 50 }).$type<'employed' | 'self-employed' | 'unemployed' | 'student' | 'retired'>(),
  currentEmployer: varchar('current_employer', { length: 200 }),

  // Preferences
  availability: varchar('availability', { length: 50 }).$type<'full-time' | 'part-time' | 'contract-based' | 'weekends-only' | 'flexible-hours' | 'flexible'>(),
  preferredWorkArrangement: varchar('preferred_work_arrangement', { length: 50 }).$type<'remote' | 'on-site' | 'hybrid'>(),
  preferredPaymentMethods: text('preferred_payment_methods'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by'),
}, (table) => ({
  userIdIdx: index('expert_profiles_user_id_idx').on(table.userId),
  createdAtIdx: index('expert_profiles_created_at_idx').on(table.createdAt),
  deletedAtIdx: index('expert_profiles_deleted_at_idx').on(table.deletedAt),
}));
