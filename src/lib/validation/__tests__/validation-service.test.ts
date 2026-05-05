import { describe, it, expect } from 'vitest';
import { ValidationService } from '../service';
import { 
  Gender, 
  UserRole, 
  EmploymentStatus, 
  Availability, 
  WorkArrangement 
} from '../types';

describe('ValidationService', () => {
  describe('Authentication Validation', () => {
    it('should validate signup data correctly', () => {
      const validSignupData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'SecurePass123!',
        role: UserRole.CUSTOMER,
        agreedToTerms: true
      };

      const result = ValidationService.validateSignup(validSignupData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        role: UserRole.CUSTOMER
      }));
    });

    it('should reject invalid signup data', () => {
      const invalidSignupData = {
        firstName: '',
        lastName: 'Doe',
        email: 'invalid-email',
        password: 'weak',
        role: UserRole.CUSTOMER,
        agreedToTerms: false
      };

      const result = ValidationService.validateSignup(invalidSignupData);
      expect(result.success).toBe(false);
      expect(result.errors).toHaveProperty('firstName');
      expect(result.errors).toHaveProperty('email');
      expect(result.errors).toHaveProperty('password');
      expect(result.errors).toHaveProperty('agreedToTerms');
    });

    it('should validate login data correctly', () => {
      const validLoginData = {
        email: 'john.doe@example.com',
        password: 'anypassword'
      };

      const result = ValidationService.validateLogin(validLoginData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining({
        email: 'john.doe@example.com',
        password: 'anypassword'
      }));
    });

    it('should validate admin login data correctly', () => {
      const validAdminLoginData = {
        email: 'admin@example.com',
        password: 'adminpassword'
      };

      const result = ValidationService.validateAdminLogin(validAdminLoginData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validAdminLoginData);
    });
  });

  describe('Profile Validation', () => {
    it('should validate expert profile data correctly', () => {
      const validExpertProfile = {
        phoneNumber: '+1234567890',
        dateOfBirth: '1990-01-01',
        gender: Gender.MALE,
        nationality: 'American',
        countryOfResidence: 'United States',
        governorate: 'California',
        wilayat: 'Los Angeles',
        areasOfSpecialization: 'Software Development',
        professionalExperience: '5 years of experience',
        relevantCertifications: 'AWS Certified',
        currentEmploymentStatus: EmploymentStatus.EMPLOYED,
        currentEmployer: 'Tech Corp',
        availability: Availability.FULL_TIME,
        preferredWorkArrangement: WorkArrangement.REMOTE,
        preferredPaymentMethods: 'Bank transfer'
      };

      const result = ValidationService.validateExpertProfile(validExpertProfile);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining({
        phoneNumber: '+1234567890',
        gender: Gender.MALE,
        currentEmploymentStatus: EmploymentStatus.EMPLOYED
      }));
    });

    it('should validate customer profile data correctly', () => {
      const validCustomerProfile = {
        phoneNumber: '+1234567890',
        dateOfBirth: '1990-01-01',
        gender: Gender.FEMALE,
        nationality: 'American',
        countryOfResidence: 'United States',
        governorate: 'California',
        wilayat: 'Los Angeles'
      };

      const result = ValidationService.validateCustomerProfile(validCustomerProfile);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining({
        phoneNumber: '+1234567890',
        gender: Gender.FEMALE
      }));
    });

    it('should reject invalid phone numbers', () => {
      const profileWithInvalidPhone = {
        phoneNumber: 'invalid-phone'
      };

      const result = ValidationService.validateExpertProfile(profileWithInvalidPhone);
      expect(result.success).toBe(false);
      expect(result.errors).toHaveProperty('phoneNumber');
    });

    it('should reject invalid date of birth', () => {
      const profileWithInvalidDOB = {
        phoneNumber: '+1234567890', // Required field
        dateOfBirth: '2020-01-01' // Too young
      };

      const result = ValidationService.validateExpertProfile(profileWithInvalidDOB);
      expect(result.success).toBe(false);
      expect(result.errors).toHaveProperty('dateOfBirth');
    });

    it('should reject profiles without phone number', () => {
      const profileWithoutPhone = {
        dateOfBirth: '1990-01-01',
        gender: Gender.MALE
      };

      const result = ValidationService.validateExpertProfile(profileWithoutPhone);
      expect(result.success).toBe(false);
      expect(result.errors).toHaveProperty('phoneNumber');
      expect(result.errors.phoneNumber).toContain('required');
    });

    it('should reject customer profiles without phone number', () => {
      const customerProfileWithoutPhone = {
        dateOfBirth: '1990-01-01',
        gender: Gender.FEMALE
      };

      const result = ValidationService.validateCustomerProfile(customerProfileWithoutPhone);
      expect(result.success).toBe(false);
      expect(result.errors).toHaveProperty('phoneNumber');
      expect(result.errors.phoneNumber).toContain('required');
    });
  });

  describe('Field Validation', () => {
    it('should validate email field correctly', () => {
      const validResult = ValidationService.validateField('email', 'test@example.com');
      expect(validResult.success).toBe(true);

      const invalidResult = ValidationService.validateField('email', 'invalid-email');
      expect(invalidResult.success).toBe(false);
      expect(Object.keys(invalidResult.errors).length).toBeGreaterThan(0);
    });

    it('should validate name field correctly', () => {
      const validResult = ValidationService.validateField('name', 'John Doe');
      expect(validResult.success).toBe(true);

      const invalidResult = ValidationService.validateField('name', 'J');
      expect(invalidResult.success).toBe(false);
      expect(Object.keys(invalidResult.errors).length).toBeGreaterThan(0);
    });

    it('should validate phone number field correctly', () => {
      const validResult = ValidationService.validateField('phoneNumber', '+1234567890');
      expect(validResult.success).toBe(true);

      const emptyResult = ValidationService.validateField('phoneNumber', '');
      expect(emptyResult.success).toBe(true); // Optional field

      const invalidResult = ValidationService.validateField('phoneNumber', 'invalid');
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('Safe Validation', () => {
    it('should provide safe validation for signup', () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        role: UserRole.CUSTOMER,
        agreedToTerms: true
      };

      const result = ValidationService.safeValidateSignup(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBe('John');
      }
    });

    it('should provide safe validation for login', () => {
      const validData = {
        email: 'john@example.com',
        password: 'password'
      };

      const result = ValidationService.safeValidateLogin(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('john@example.com');
      }
    });
  });

  describe('Schema Access', () => {
    it('should provide access to auth schemas', () => {
      const signupSchema = ValidationService.getAuthSchema('signup');
      expect(signupSchema).toBeDefined();

      const loginSchema = ValidationService.getAuthSchema('login');
      expect(loginSchema).toBeDefined();
    });

    it('should provide access to profile schemas', () => {
      const expertSchema = ValidationService.getProfileSchema('expert');
      expect(expertSchema).toBeDefined();

      const customerSchema = ValidationService.getProfileSchema('customer');
      expect(customerSchema).toBeDefined();
    });

    it('should provide access to field schemas', () => {
      const emailSchema = ValidationService.getFieldSchema('email');
      expect(emailSchema).toBeDefined();

      const nameSchema = ValidationService.getFieldSchema('name');
      expect(nameSchema).toBeDefined();
    });
  });
});