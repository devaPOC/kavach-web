import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProfileService } from '../profile.service';
import type { CreateExpertProfileData, CreateCustomerProfileData } from '../profile-types';
import type { RequestContext } from '../../../errors/correlation';

// Mock all dependencies
vi.mock('../../database/connection', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis()
  }
}));

vi.mock('../../validation/service', () => ({
  ValidationService: {
    validateExpertProfile: vi.fn(),
    validateCustomerProfile: vi.fn(),
    validateExpertProfileUpdate: vi.fn(),
    validateCustomerProfileUpdate: vi.fn()
  }
}));

vi.mock('../../database/transaction-service', () => ({
  transactionService: {
    executeInTransaction: vi.fn()
  }
}));

vi.mock('../../database/profile-transaction', () => ({
  ProfileTransaction: {
    createExpertProfile: vi.fn(),
    createCustomerProfile: vi.fn(),
    updateExpertProfile: vi.fn(),
    updateCustomerProfile: vi.fn(),
    updateUserStatus: vi.fn(),
    deleteProfile: vi.fn(),
    createAuditLog: vi.fn()
  }
}));

vi.mock('../../auth/unified-session-manager', () => ({
  sessionManager: {
    createSession: vi.fn()
  }
}));

vi.mock('../../utils/audit-logger', () => ({
  auditLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

describe('ProfileService', () => {
  let profileService: ProfileService;
  let mockContext: RequestContext;

  beforeEach(() => {
    profileService = new ProfileService();
    mockContext = {
      correlationId: 'test-correlation-id',
      clientIP: '127.0.0.1',
      userAgent: 'test-agent',
      timestamp: new Date()
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getUserProfile', () => {
    it('should return expert profile data', async () => {
      const { db } = await import('../../database/connection');
      
      const mockUser = {
        id: 'user-123',
        email: 'expert@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'expert',
        isEmailVerified: true,
        isProfileCompleted: true,
        isApproved: true
      };

      const mockExpertProfile = {
        id: 'profile-123',
        userId: 'user-123',
        phoneNumber: '+1234567890',
        areasOfSpecialization: 'Software Development',
        professionalExperience: '5 years',
        createdAt: new Date()
      };

      // Mock the database queries
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([mockUser]).mockResolvedValueOnce([mockExpertProfile])
          })
        })
      });

      const result = await profileService.getUserProfile('user-123', mockContext);

      expect(result).toEqual({
        user: mockUser,
        profile: mockExpertProfile,
        type: 'expert'
      });
    });

    it('should return customer profile data', async () => {
      const { db } = await import('../../database/connection');
      
      const mockUser = {
        id: 'user-123',
        email: 'customer@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'customer',
        isEmailVerified: true,
        isProfileCompleted: true,
        isApproved: true
      };

      const mockCustomerProfile = {
        id: 'profile-123',
        userId: 'user-123',
        phoneNumber: '+1234567890',
        dateOfBirth: '1990-01-01',
        createdAt: new Date()
      };

      // Mock the database queries
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([mockUser]).mockResolvedValueOnce([mockCustomerProfile])
          })
        })
      });

      const result = await profileService.getUserProfile('user-123', mockContext);

      expect(result).toEqual({
        user: mockUser,
        profile: mockCustomerProfile,
        type: 'customer'
      });
    });

    it('should return null profile when profile does not exist', async () => {
      const { db } = await import('../../database/connection');
      
      const mockUser = {
        id: 'user-123',
        email: 'expert@example.com',
        role: 'expert'
      };

      // Mock the database queries - user exists but no profile
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([mockUser]).mockResolvedValueOnce([])
          })
        })
      });

      const result = await profileService.getUserProfile('user-123', mockContext);

      expect(result).toEqual({
        user: mockUser,
        profile: null,
        type: 'expert'
      });
    });

    it('should throw error when user not found', async () => {
      const { db } = await import('../../database/connection');
      
      // Mock the database query - no user found
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      });

      await expect(profileService.getUserProfile('nonexistent-user', mockContext))
        .rejects.toThrow('User not found');
    });
  });

  describe('createExpertProfile', () => {
    const mockExpertProfileData: CreateExpertProfileData = {
      phoneNumber: '+1234567890',
      dateOfBirth: '1990-01-01',
      gender: 'male',
      nationality: 'American',
      countryOfResidence: 'United States',
      governorate: 'California',
      wilayat: 'Los Angeles',
      areasOfSpecialization: 'Software Development',
      professionalExperience: '5 years of experience',
      relevantCertifications: 'AWS Certified',
      currentEmploymentStatus: 'employed',
      currentEmployer: 'Tech Corp',
      availability: 'full_time',
      preferredWorkArrangement: 'remote',
      preferredPaymentMethods: 'Bank transfer'
    };

    it('should successfully create expert profile', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { transactionService } = await import('../../database/transaction-service');
      const { ProfileTransaction } = await import('../../database/profile-transaction');
      const { sessionManager } = await import('../../auth/unified-session-manager');

      const mockUser = {
        id: 'user-123',
        email: 'expert@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'expert',
        isEmailVerified: true,
        isProfileCompleted: true,
        isApproved: false
      };

      const mockProfile = {
        id: 'profile-123',
        userId: 'user-123',
        phoneNumber: mockExpertProfileData.phoneNumber,
        areasOfSpecialization: mockExpertProfileData.areasOfSpecialization,
        createdAt: new Date()
      };

      const mockProfileResult = {
        user: mockUser,
        profile: mockProfile,
        profileType: 'expert' as const
      };

      const mockTransactionResult = {
        success: true,
        data: mockProfileResult
      };

      (ValidationService.validateExpertProfile as any).mockReturnValue({
        success: true,
        data: mockExpertProfileData
      });

      (transactionService.executeInTransaction as any).mockImplementation(async (callback) => {
        await callback({});
        return mockTransactionResult;
      });

      (ProfileTransaction.createExpertProfile as any).mockResolvedValue(mockProfileResult);
      (ProfileTransaction.createAuditLog as any).mockResolvedValue(undefined);
      (sessionManager.createSession as any).mockResolvedValue({
        accessToken: 'new-token',
        refreshToken: 'new-refresh-token'
      });

      const result = await profileService.createExpertProfile('user-123', mockExpertProfileData, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProfileResult);
      expect(ValidationService.validateExpertProfile).toHaveBeenCalledWith(mockExpertProfileData, mockContext);
      expect(ProfileTransaction.createExpertProfile).toHaveBeenCalledWith({}, 'user-123', mockExpertProfileData);
      expect(sessionManager.createSession).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        isEmailVerified: mockUser.isEmailVerified,
        isProfileCompleted: mockUser.isProfileCompleted,
        isApproved: mockUser.isApproved
      });
    });

    it('should fail validation with invalid data', async () => {
      const { ValidationService } = await import('../../validation/service');

      (ValidationService.validateExpertProfile as any).mockReturnValue({
        success: false,
        errors: { phoneNumber: 'Invalid phone number format' }
      });

      await expect(profileService.createExpertProfile('user-123', mockExpertProfileData, mockContext))
        .rejects.toThrow('Invalid phone number format');
    });

    it('should handle transaction failure', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { transactionService } = await import('../../database/transaction-service');

      const mockTransactionResult = {
        success: false,
        error: 'Database transaction failed'
      };

      (ValidationService.validateExpertProfile as any).mockReturnValue({
        success: true,
        data: mockExpertProfileData
      });

      (transactionService.executeInTransaction as any).mockResolvedValue(mockTransactionResult);

      await expect(profileService.createExpertProfile('user-123', mockExpertProfileData, mockContext))
        .rejects.toThrow('Database transaction failed');
    });

    it('should handle session refresh failure gracefully', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { transactionService } = await import('../../database/transaction-service');
      const { ProfileTransaction } = await import('../../database/profile-transaction');
      const { sessionManager } = await import('../../auth/unified-session-manager');
      const { logger } = await import('../../utils/logger');

      const mockUser = {
        id: 'user-123',
        email: 'expert@example.com',
        role: 'expert',
        isEmailVerified: true,
        isProfileCompleted: true,
        isApproved: false
      };

      const mockProfile = {
        id: 'profile-123',
        userId: 'user-123'
      };

      const mockProfileResult = {
        user: mockUser,
        profile: mockProfile,
        profileType: 'expert' as const
      };

      const mockTransactionResult = {
        success: true,
        data: mockProfileResult
      };

      (ValidationService.validateExpertProfile as any).mockReturnValue({
        success: true,
        data: mockExpertProfileData
      });

      (transactionService.executeInTransaction as any).mockImplementation(async (callback) => {
        await callback({});
        return mockTransactionResult;
      });

      (ProfileTransaction.createExpertProfile as any).mockResolvedValue(mockProfileResult);
      (ProfileTransaction.createAuditLog as any).mockResolvedValue(undefined);
      (sessionManager.createSession as any).mockRejectedValue(new Error('Session refresh failed'));

      const result = await profileService.createExpertProfile('user-123', mockExpertProfileData, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProfileResult);
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to refresh session after profile creation',
        expect.objectContaining({
          userId: 'user-123',
          error: 'Session refresh failed'
        })
      );
    });
  });

  describe('createCustomerProfile', () => {
    const mockCustomerProfileData: CreateCustomerProfileData = {
      phoneNumber: '+1234567890',
      dateOfBirth: '1990-01-01',
      gender: 'female',
      nationality: 'American',
      countryOfResidence: 'United States',
      governorate: 'California',
      wilayat: 'Los Angeles'
    };

    it('should successfully create customer profile', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { transactionService } = await import('../../database/transaction-service');
      const { ProfileTransaction } = await import('../../database/profile-transaction');
      const { sessionManager } = await import('../../auth/unified-session-manager');

      const mockUser = {
        id: 'user-123',
        email: 'customer@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'customer',
        isEmailVerified: true,
        isProfileCompleted: true,
        isApproved: true
      };

      const mockProfile = {
        id: 'profile-123',
        userId: 'user-123',
        phoneNumber: mockCustomerProfileData.phoneNumber,
        dateOfBirth: mockCustomerProfileData.dateOfBirth,
        createdAt: new Date()
      };

      const mockProfileResult = {
        user: mockUser,
        profile: mockProfile,
        profileType: 'customer' as const
      };

      const mockTransactionResult = {
        success: true,
        data: mockProfileResult
      };

      (ValidationService.validateCustomerProfile as any).mockReturnValue({
        success: true,
        data: mockCustomerProfileData
      });

      (transactionService.executeInTransaction as any).mockImplementation(async (callback) => {
        await callback({});
        return mockTransactionResult;
      });

      (ProfileTransaction.createCustomerProfile as any).mockResolvedValue(mockProfileResult);
      (ProfileTransaction.createAuditLog as any).mockResolvedValue(undefined);
      (sessionManager.createSession as any).mockResolvedValue({
        accessToken: 'new-token',
        refreshToken: 'new-refresh-token'
      });

      const result = await profileService.createCustomerProfile('user-123', mockCustomerProfileData, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProfileResult);
      expect(ValidationService.validateCustomerProfile).toHaveBeenCalledWith(mockCustomerProfileData, mockContext);
      expect(ProfileTransaction.createCustomerProfile).toHaveBeenCalledWith({}, 'user-123', mockCustomerProfileData);
    });

    it('should fail validation with invalid data', async () => {
      const { ValidationService } = await import('../../validation/service');

      (ValidationService.validateCustomerProfile as any).mockReturnValue({
        success: false,
        errors: { dateOfBirth: 'Invalid date format' }
      });

      await expect(profileService.createCustomerProfile('user-123', mockCustomerProfileData, mockContext))
        .rejects.toThrow('Invalid date format');
    });
  });

  describe('updateExpertProfile', () => {
    const mockUpdateData: Partial<CreateExpertProfileData> = {
      phoneNumber: '+9876543210',
      areasOfSpecialization: 'Updated specialization'
    };

    it('should successfully update expert profile', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { transactionService } = await import('../../database/transaction-service');
      const { ProfileTransaction } = await import('../../database/profile-transaction');

      const mockUpdatedProfile = {
        id: 'profile-123',
        userId: 'user-123',
        phoneNumber: mockUpdateData.phoneNumber,
        areasOfSpecialization: mockUpdateData.areasOfSpecialization,
        updatedAt: new Date()
      };

      const mockTransactionResult = {
        success: true,
        data: mockUpdatedProfile
      };

      (ValidationService.validateExpertProfileUpdate as any).mockReturnValue({
        success: true,
        data: mockUpdateData
      });

      (transactionService.executeInTransaction as any).mockImplementation(async (callback) => {
        await callback({});
        return mockTransactionResult;
      });

      (ProfileTransaction.updateExpertProfile as any).mockResolvedValue(mockUpdatedProfile);
      (ProfileTransaction.createAuditLog as any).mockResolvedValue(undefined);

      const result = await profileService.updateExpertProfile('user-123', mockUpdateData, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedProfile);
      expect(ProfileTransaction.updateExpertProfile).toHaveBeenCalledWith({}, 'user-123', mockUpdateData);
    });

    it('should skip validation when no data provided', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { transactionService } = await import('../../database/transaction-service');

      const mockTransactionResult = {
        success: true,
        data: { id: 'profile-123' }
      };

      (transactionService.executeInTransaction as any).mockImplementation(async (callback) => {
        await callback({});
        return mockTransactionResult;
      });

      const result = await profileService.updateExpertProfile('user-123', {}, mockContext);

      expect(result.success).toBe(true);
      expect(ValidationService.validateExpertProfileUpdate).not.toHaveBeenCalled();
    });
  });

  describe('updateCustomerProfile', () => {
    const mockUpdateData: Partial<CreateCustomerProfileData> = {
      phoneNumber: '+9876543210',
      nationality: 'Canadian'
    };

    it('should successfully update customer profile', async () => {
      const { ValidationService } = await import('../../validation/service');
      const { transactionService } = await import('../../database/transaction-service');
      const { ProfileTransaction } = await import('../../database/profile-transaction');

      const mockUpdatedProfile = {
        id: 'profile-123',
        userId: 'user-123',
        phoneNumber: mockUpdateData.phoneNumber,
        nationality: mockUpdateData.nationality,
        updatedAt: new Date()
      };

      const mockTransactionResult = {
        success: true,
        data: mockUpdatedProfile
      };

      (ValidationService.validateCustomerProfileUpdate as any).mockReturnValue({
        success: true,
        data: mockUpdateData
      });

      (transactionService.executeInTransaction as any).mockImplementation(async (callback) => {
        await callback({});
        return mockTransactionResult;
      });

      (ProfileTransaction.updateCustomerProfile as any).mockResolvedValue(mockUpdatedProfile);
      (ProfileTransaction.createAuditLog as any).mockResolvedValue(undefined);

      const result = await profileService.updateCustomerProfile('user-123', mockUpdateData, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedProfile);
      expect(ProfileTransaction.updateCustomerProfile).toHaveBeenCalledWith({}, 'user-123', mockUpdateData);
    });
  });

  describe('approveExpertProfile', () => {
    it('should successfully approve expert profile', async () => {
      const { transactionService } = await import('../../database/transaction-service');
      const { ProfileTransaction } = await import('../../database/profile-transaction');
      const { sessionManager } = await import('../../auth/unified-session-manager');

      const mockUpdatedUser = {
        id: 'user-123',
        email: 'expert@example.com',
        role: 'expert',
        isEmailVerified: true,
        isProfileCompleted: true,
        isApproved: true,
        updatedAt: new Date()
      };

      const mockTransactionResult = {
        success: true,
        data: mockUpdatedUser
      };

      (transactionService.executeInTransaction as any).mockImplementation(async (callback) => {
        await callback({});
        return mockTransactionResult;
      });

      (ProfileTransaction.updateUserStatus as any).mockResolvedValue(mockUpdatedUser);
      (ProfileTransaction.createAuditLog as any).mockResolvedValue(undefined);
      (sessionManager.createSession as any).mockResolvedValue({
        accessToken: 'new-token',
        refreshToken: 'new-refresh-token'
      });

      const result = await profileService.approveExpertProfile('user-123', 'admin-123', mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedUser);
      expect(ProfileTransaction.updateUserStatus).toHaveBeenCalledWith({}, 'user-123', {
        isApproved: true,
        updatedAt: expect.any(Date)
      });
      expect(ProfileTransaction.createAuditLog).toHaveBeenCalledWith({}, {
        userId: 'user-123',
        action: 'profile.expert.approved',
        details: {
          adminUserId: 'admin-123',
          approvedAt: mockUpdatedUser.updatedAt
        },
        timestamp: expect.any(Date),
        requestId: mockContext.correlationId
      });
    });

    it('should handle transaction failure', async () => {
      const { transactionService } = await import('../../database/transaction-service');

      const mockTransactionResult = {
        success: false,
        error: 'Failed to approve profile'
      };

      (transactionService.executeInTransaction as any).mockResolvedValue(mockTransactionResult);

      await expect(profileService.approveExpertProfile('user-123', 'admin-123', mockContext))
        .rejects.toThrow('Failed to approve profile');
    });
  });

  describe('rejectExpertProfile', () => {
    it('should successfully reject expert profile', async () => {
      const { transactionService } = await import('../../database/transaction-service');
      const { ProfileTransaction } = await import('../../database/profile-transaction');

      const mockUpdatedUser = {
        id: 'user-123',
        email: 'expert@example.com',
        role: 'expert',
        isEmailVerified: true,
        isProfileCompleted: true,
        isApproved: false,
        updatedAt: new Date()
      };

      const mockTransactionResult = {
        success: true,
        data: mockUpdatedUser
      };

      (transactionService.executeInTransaction as any).mockImplementation(async (callback) => {
        await callback({});
        return mockTransactionResult;
      });

      (ProfileTransaction.updateUserStatus as any).mockResolvedValue(mockUpdatedUser);
      (ProfileTransaction.createAuditLog as any).mockResolvedValue(undefined);

      const result = await profileService.rejectExpertProfile('user-123', 'admin-123', mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedUser);
      expect(ProfileTransaction.updateUserStatus).toHaveBeenCalledWith({}, 'user-123', {
        isApproved: false,
        updatedAt: expect.any(Date)
      });
      expect(ProfileTransaction.createAuditLog).toHaveBeenCalledWith({}, {
        userId: 'user-123',
        action: 'profile.expert.rejected',
        details: {
          adminUserId: 'admin-123',
          rejectedAt: mockUpdatedUser.updatedAt
        },
        timestamp: expect.any(Date),
        requestId: mockContext.correlationId
      });
    });
  });

  describe('deleteProfile', () => {
    it('should successfully delete expert profile', async () => {
      const { transactionService } = await import('../../database/transaction-service');
      const { ProfileTransaction } = await import('../../database/profile-transaction');
      const { sessionManager } = await import('../../auth/unified-session-manager');

      const mockUpdatedUser = {
        id: 'user-123',
        email: 'expert@example.com',
        role: 'expert',
        isEmailVerified: true,
        isProfileCompleted: false,
        isApproved: false,
        updatedAt: new Date()
      };

      const mockTransactionResult = {
        success: true,
        data: mockUpdatedUser
      };

      (transactionService.executeInTransaction as any).mockImplementation(async (callback) => {
        await callback({});
        return mockTransactionResult;
      });

      (ProfileTransaction.deleteProfile as any).mockResolvedValue(mockUpdatedUser);
      (ProfileTransaction.createAuditLog as any).mockResolvedValue(undefined);
      (sessionManager.createSession as any).mockResolvedValue({
        accessToken: 'new-token',
        refreshToken: 'new-refresh-token'
      });

      const result = await profileService.deleteProfile('user-123', 'expert', mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedUser);
      expect(ProfileTransaction.deleteProfile).toHaveBeenCalledWith({}, 'user-123', 'expert');
      expect(ProfileTransaction.createAuditLog).toHaveBeenCalledWith({}, {
        userId: 'user-123',
        action: 'profile.expert.deleted',
        details: { profileType: 'expert' },
        timestamp: expect.any(Date),
        requestId: mockContext.correlationId
      });
    });

    it('should successfully delete customer profile', async () => {
      const { transactionService } = await import('../../database/transaction-service');
      const { ProfileTransaction } = await import('../../database/profile-transaction');

      const mockUpdatedUser = {
        id: 'user-123',
        email: 'customer@example.com',
        role: 'customer',
        isEmailVerified: true,
        isProfileCompleted: false,
        isApproved: false,
        updatedAt: new Date()
      };

      const mockTransactionResult = {
        success: true,
        data: mockUpdatedUser
      };

      (transactionService.executeInTransaction as any).mockImplementation(async (callback) => {
        await callback({});
        return mockTransactionResult;
      });

      (ProfileTransaction.deleteProfile as any).mockResolvedValue(mockUpdatedUser);
      (ProfileTransaction.createAuditLog as any).mockResolvedValue(undefined);

      const result = await profileService.deleteProfile('user-123', 'customer', mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedUser);
      expect(ProfileTransaction.createAuditLog).toHaveBeenCalledWith({}, {
        userId: 'user-123',
        action: 'profile.customer.deleted',
        details: { profileType: 'customer' },
        timestamp: expect.any(Date),
        requestId: mockContext.correlationId
      });
    });

    it('should handle transaction failure', async () => {
      const { transactionService } = await import('../../database/transaction-service');

      const mockTransactionResult = {
        success: false,
        error: 'Failed to delete profile'
      };

      (transactionService.executeInTransaction as any).mockResolvedValue(mockTransactionResult);

      await expect(profileService.deleteProfile('user-123', 'expert', mockContext))
        .rejects.toThrow('Failed to delete expert profile');
    });
  });
});