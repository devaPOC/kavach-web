import { pgTable, uuid, varchar, date, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const customerProfiles = pgTable('customer_profiles', {
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

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by'),
}, (table) => ({
  userIdIdx: index('customer_profiles_user_id_idx').on(table.userId),
  createdAtIdx: index('customer_profiles_created_at_idx').on(table.createdAt),
  deletedAtIdx: index('customer_profiles_deleted_at_idx').on(table.deletedAt),
}));
