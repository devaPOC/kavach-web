/**
 * Data mapping utilities for profile controllers
 * Maps between validation schema types and database schema types
 */

import type { ExpertProfileData, CustomerProfileData } from '../../validation/schemas';
import type {
  ExpertProfileData as DbExpertProfileData,
  CustomerProfileData as DbCustomerProfileData
} from '../../database/profile-transaction';

/**
 * Map validation schema availability to database availability
 */
function mapAvailabilityToDb(availability?: string): DbExpertProfileData['availability'] {
  switch (availability) {
    case 'full-time':
      return 'full-time';
    case 'part-time':
      return 'part-time';
    case 'flexible':
      // Map flexible to flexible-hours for backward compatibility,
      // but also support direct 'flexible' value
      return 'flexible';
    default:
      return undefined;
  }
}

/**
 * Map validation schema work arrangement to database work arrangement
 */
function mapWorkArrangementToDb(workArrangement?: string): DbExpertProfileData['preferredWorkArrangement'] {
  switch (workArrangement) {
    case 'remote':
      return 'remote';
    case 'on-site':
      return 'on-site';
    case 'hybrid':
      return 'hybrid';
    default:
      return undefined;
  }
}

/**
 * Map validation schema employment status to database employment status
 */
function mapEmploymentStatusToDb(status?: string): DbExpertProfileData['currentEmploymentStatus'] {
  switch (status) {
    case 'employed':
      return 'employed';
    case 'self-employed':
      return 'self-employed';
    case 'unemployed':
      return 'unemployed';
    case 'student':
      return 'student';
    default:
      return undefined;
  }
}

/**
 * Map expert profile data from validation schema to database schema
 */
export function mapExpertProfileToDb(data: ExpertProfileData): DbExpertProfileData {
  return {
    phoneNumber: data.phoneNumber,
    dateOfBirth: data.dateOfBirth,
    gender: data.gender,
    nationality: data.nationality,
    countryOfResidence: data.countryOfResidence,
    governorate: data.governorate,
    wilayat: data.wilayat,
    areasOfSpecialization: data.areasOfSpecialization,
    professionalExperience: data.professionalExperience,
    relevantCertifications: data.relevantCertifications,
    currentEmploymentStatus: mapEmploymentStatusToDb(data.currentEmploymentStatus),
    currentEmployer: data.currentEmployer,
    availability: mapAvailabilityToDb(data.availability),
    preferredWorkArrangement: mapWorkArrangementToDb(data.preferredWorkArrangement),
    preferredPaymentMethods: data.preferredPaymentMethods
  };
}

/**
 * Map customer profile data from validation schema to database schema
 */
export function mapCustomerProfileToDb(data: CustomerProfileData): DbCustomerProfileData {
  return {
    phoneNumber: data.phoneNumber,
    dateOfBirth: data.dateOfBirth,
    gender: data.gender,
    nationality: data.nationality,
    countryOfResidence: data.countryOfResidence,
    governorate: data.governorate,
    wilayat: data.wilayat
  };
}

/**
 * Map partial expert profile data for updates
 */
export function mapPartialExpertProfileToDb(data: Partial<ExpertProfileData>): Partial<DbExpertProfileData> {
  const mapped: Partial<DbExpertProfileData> = {};

  if (data.phoneNumber !== undefined) mapped.phoneNumber = data.phoneNumber;
  if (data.dateOfBirth !== undefined) mapped.dateOfBirth = data.dateOfBirth;
  if (data.gender !== undefined) mapped.gender = data.gender;
  if (data.nationality !== undefined) mapped.nationality = data.nationality;
  if (data.countryOfResidence !== undefined) mapped.countryOfResidence = data.countryOfResidence;
  if (data.governorate !== undefined) mapped.governorate = data.governorate;
  if (data.wilayat !== undefined) mapped.wilayat = data.wilayat;
  if (data.areasOfSpecialization !== undefined) mapped.areasOfSpecialization = data.areasOfSpecialization;
  if (data.professionalExperience !== undefined) mapped.professionalExperience = data.professionalExperience;
  if (data.relevantCertifications !== undefined) mapped.relevantCertifications = data.relevantCertifications;
  if (data.currentEmploymentStatus !== undefined) mapped.currentEmploymentStatus = mapEmploymentStatusToDb(data.currentEmploymentStatus);
  if (data.currentEmployer !== undefined) mapped.currentEmployer = data.currentEmployer;
  if (data.availability !== undefined) mapped.availability = mapAvailabilityToDb(data.availability);
  if (data.preferredWorkArrangement !== undefined) mapped.preferredWorkArrangement = mapWorkArrangementToDb(data.preferredWorkArrangement);
  if (data.preferredPaymentMethods !== undefined) mapped.preferredPaymentMethods = data.preferredPaymentMethods;

  return mapped;
}

/**
 * Map partial customer profile data for updates
 */
export function mapPartialCustomerProfileToDb(data: Partial<CustomerProfileData>): Partial<DbCustomerProfileData> {
  const mapped: Partial<DbCustomerProfileData> = {};

  if (data.phoneNumber !== undefined) mapped.phoneNumber = data.phoneNumber;
  if (data.dateOfBirth !== undefined) mapped.dateOfBirth = data.dateOfBirth;
  if (data.gender !== undefined) mapped.gender = data.gender;
  if (data.nationality !== undefined) mapped.nationality = data.nationality;
  if (data.countryOfResidence !== undefined) mapped.countryOfResidence = data.countryOfResidence;
  if (data.governorate !== undefined) mapped.governorate = data.governorate;
  if (data.wilayat !== undefined) mapped.wilayat = data.wilayat;

  return mapped;
}
