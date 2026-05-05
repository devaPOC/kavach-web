/**
 * Transaction Management System Usage Examples
 * 
 * This file demonstrates how to use the transaction management system
 * for atomic database operations, particularly for profile creation.
 */

import { transactionService, ProfileTransaction } from '../transaction';
import type { ExpertProfileData, CustomerProfileData } from '../transaction';
import { logger } from '@/lib/utils/logger';

/**
 * Example 1: Simple Expert Profile Creation
 * 
 * This example shows how to create an expert profile with automatic
 * user status updates in a single atomic transaction.
 */
export async function createExpertProfileExample(userId: string, profileData: ExpertProfileData) {
  const result = await transactionService.executeInTransaction(
    async (tx) => {
      // All operations within this function are part of the same transaction
      return await ProfileTransaction.createExpertProfile(tx, userId, profileData);
    },
    'create-expert-profile'
  );

  if (result.success) {
    logger.info('Expert profile created successfully', {
      userId,
      profileId: result.data?.profile.id,
      userStatus: {
        isProfileCompleted: result.data?.user.isProfileCompleted,
        isApproved: result.data?.user.isApproved
      }
    });
    return result.data;
  } else {
    logger.error('Failed to create expert profile', {
      userId,
      error: result.error,
      rollbackReason: result.rollbackReason
    });
    throw new Error(result.error || 'Profile creation failed');
  }
}

/**
 * Example 2: Customer Profile Creation with Auto-Approval
 * 
 * Customer profiles are automatically approved upon creation.
 */
export async function createCustomerProfileExample(userId: string, profileData: CustomerProfileData) {
  const result = await transactionService.executeInTransaction(
    async (tx) => {
      return await ProfileTransaction.createCustomerProfile(tx, userId, profileData);
    },
    'create-customer-profile'
  );

  if (result.success) {
    logger.info('Customer profile created and auto-approved', {
      userId,
      profileId: result.data?.profile.id,
      userStatus: {
        isProfileCompleted: result.data?.user.isProfileCompleted,
        isApproved: result.data?.user.isApproved // Should be true for customers
      }
    });
    return result.data;
  } else {
    logger.error('Failed to create customer profile', {
      userId,
      error: result.error
    });
    throw new Error(result.error || 'Profile creation failed');
  }
}

/**
 * Example 3: Complex Multi-Step Profile Operation
 * 
 * This example shows how to perform multiple related operations
 * in a single transaction with proper error handling.
 */
export async function complexProfileOperationExample(
  userId: string, 
  profileData: ExpertProfileData,
  additionalUserUpdates: { isApproved?: boolean }
) {
  const operations = {
    // Step 1: Create the profile
    createProfile: async (tx: any) => {
      return await ProfileTransaction.createExpertProfile(tx, userId, profileData);
    },
    
    // Step 2: Apply additional user updates if needed
    updateUserStatus: async (tx: any) => {
      if (Object.keys(additionalUserUpdates).length > 0) {
        return await ProfileTransaction.updateUserStatus(tx, userId, {
          ...additionalUserUpdates,
          updatedAt: new Date()
        });
      }
      return null;
    },
    
    // Step 3: Create audit log
    createAuditLog: async (tx: any) => {
      return await ProfileTransaction.createAuditLog(tx, {
        userId,
        action: 'profile_created',
        details: {
          profileType: 'expert',
          profileData: profileData,
          additionalUpdates: additionalUserUpdates
        },
        timestamp: new Date(),
        requestId: `profile-creation-${userId}-${Date.now()}`
      });
    }
  };

  const result = await transactionService.executeMultipleInTransaction(
    operations,
    'complex-profile-operation'
  );

  if (result.success) {
    logger.info('Complex profile operation completed successfully', {
      userId,
      profileCreated: !!result.data?.createProfile,
      userUpdated: !!result.data?.updateUserStatus,
      auditLogged: true
    });
    return result.data;
  } else {
    logger.error('Complex profile operation failed', {
      userId,
      error: result.error
    });
    throw new Error(result.error || 'Complex operation failed');
  }
}

/**
 * Example 4: Profile Update with Retry Logic
 * 
 * This example shows how to use retry logic for operations
 * that might fail due to temporary issues.
 */
export async function updateProfileWithRetryExample(
  userId: string,
  profileType: 'expert' | 'customer',
  profileData: Partial<ExpertProfileData | CustomerProfileData>
) {
  const result = await transactionService.executeWithRetry(
    async (tx) => {
      if (profileType === 'expert') {
        return await ProfileTransaction.updateExpertProfile(tx, userId, profileData as Partial<ExpertProfileData>);
      } else {
        return await ProfileTransaction.updateCustomerProfile(tx, userId, profileData as Partial<CustomerProfileData>);
      }
    },
    3, // Max 3 retry attempts
    `update-${profileType}-profile`
  );

  if (result.success) {
    logger.info(`${profileType} profile updated successfully`, {
      userId,
      updatedFields: Object.keys(profileData)
    });
    return result.data;
  } else {
    logger.error(`Failed to update ${profileType} profile after retries`, {
      userId,
      error: result.error
    });
    throw new Error(result.error || 'Profile update failed');
  }
}

/**
 * Example 5: Profile Deletion with Cleanup
 * 
 * This example shows how to delete a profile and clean up
 * related user status in a single transaction.
 */
export async function deleteProfileExample(userId: string, profileType: 'expert' | 'customer') {
  const result = await transactionService.executeInTransaction(
    async (tx) => {
      // Delete profile and update user status atomically
      const updatedUser = await ProfileTransaction.deleteProfile(tx, userId, profileType);
      
      // Create audit log for the deletion
      await ProfileTransaction.createAuditLog(tx, {
        userId,
        action: 'profile_deleted',
        details: {
          profileType,
          deletedAt: new Date()
        },
        timestamp: new Date(),
        requestId: `profile-deletion-${userId}-${Date.now()}`
      });
      
      return updatedUser;
    },
    'delete-profile'
  );

  if (result.success) {
    logger.info(`${profileType} profile deleted successfully`, {
      userId,
      userStatus: {
        isProfileCompleted: result.data?.isProfileCompleted,
        isApproved: result.data?.isApproved
      }
    });
    return result.data;
  } else {
    logger.error(`Failed to delete ${profileType} profile`, {
      userId,
      error: result.error
    });
    throw new Error(result.error || 'Profile deletion failed');
  }
}

/**
 * Example 6: Batch Profile Operations
 * 
 * This example shows how to perform operations on multiple profiles
 * with proper error handling and rollback.
 */
export async function batchProfileOperationsExample(
  operations: Array<{
    userId: string;
    operation: 'create' | 'update' | 'delete';
    profileType: 'expert' | 'customer';
    data?: any;
  }>
) {
  const results = [];
  
  for (const op of operations) {
    try {
      const result = await transactionService.executeInTransaction(
        async (tx) => {
          switch (op.operation) {
            case 'create':
              if (op.profileType === 'expert') {
                return await ProfileTransaction.createExpertProfile(tx, op.userId, op.data);
              } else {
                return await ProfileTransaction.createCustomerProfile(tx, op.userId, op.data);
              }
            
            case 'update':
              if (op.profileType === 'expert') {
                return await ProfileTransaction.updateExpertProfile(tx, op.userId, op.data);
              } else {
                return await ProfileTransaction.updateCustomerProfile(tx, op.userId, op.data);
              }
            
            case 'delete':
              return await ProfileTransaction.deleteProfile(tx, op.userId, op.profileType);
            
            default:
              throw new Error(`Unknown operation: ${op.operation}`);
          }
        },
        `batch-${op.operation}-${op.profileType}-profile`
      );
      
      if (result.success) {
        results.push({ userId: op.userId, success: true, data: result.data });
      } else {
        results.push({ userId: op.userId, success: false, error: result.error });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({ userId: op.userId, success: false, error: errorMessage });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  
  logger.info('Batch profile operations completed', {
    total: operations.length,
    successful: successCount,
    failed: failureCount,
    results
  });
  
  return results;
}

/**
 * Example 7: Error Handling and Recovery
 * 
 * This example demonstrates proper error handling patterns
 * when working with transactions.
 */
export async function profileOperationWithErrorHandling(
  userId: string,
  profileData: ExpertProfileData
) {
  try {
    const result = await transactionService.executeInTransaction(
      async (tx) => {
        // Attempt to create the profile
        const profileResult = await ProfileTransaction.createExpertProfile(tx, userId, profileData);
        
        // Simulate a potential error condition
        if (profileData.areasOfSpecialization?.includes('restricted')) {
          throw new Error('Restricted specialization area detected');
        }
        
        return profileResult;
      },
      'profile-with-error-handling'
    );

    if (result.success) {
      return {
        success: true,
        message: 'Profile created successfully',
        data: result.data
      };
    } else {
      // Transaction was rolled back automatically
      return {
        success: false,
        message: 'Profile creation failed',
        error: result.error,
        rollbackReason: result.rollbackReason
      };
    }
  } catch (error) {
    // Handle any unexpected errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Unexpected error in profile operation', {
      userId,
      error: errorMessage
    });
    
    return {
      success: false,
      message: 'Unexpected error occurred',
      error: errorMessage
    };
  }
}