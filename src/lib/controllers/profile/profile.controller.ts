import { NextRequest, NextResponse } from 'next/server';
import { profileService } from '../../services/profile/profile.service';
import { ProfileError } from '../../services/profile/profile-errors';
import { ValidationService } from '../../validation/service';
import { ErrorHandler, withErrorHandler } from '../../errors/error-handler';
import { 
  createSuccessNextResponse, 
  createErrorNextResponse,
  serviceResultToNextResponse,
  type ServiceResult 
} from '../../errors/response-utils';
import { 
  AuthenticationError, 
  ValidationError, 
  UnknownError 
} from '../../errors/custom-errors';
import { ErrorCode } from '../../errors/error-types';
import { createRequestContext, runWithCorrelation } from '../../errors/correlation';
import { cookieManager, sessionManager } from '../../auth/unified-session-manager';
import { logger } from '../../utils/logger';
import { 
  mapExpertProfileToDb,
  mapCustomerProfileToDb,
  mapPartialExpertProfileToDb,
  mapPartialCustomerProfileToDb
} from './profile-data-mapper';
import type { 
  ExpertProfileData, 
  CustomerProfileData,
  ExpertProfileUpdateData,
  CustomerProfileUpdateData 
} from '../../validation/schemas';

const errorHandler = new ErrorHandler();

export class ProfileController {
  // Get current user profile
  static async getProfile(request: NextRequest): Promise<NextResponse> {
    return withErrorHandler(async () => {
      const context = createRequestContext(request);
      
      return runWithCorrelation(context, async () => {
        // Get session from cookies
        const session = await cookieManager.getSessionFromCookies(request);
        if (!session) {
          throw new AuthenticationError(ErrorCode.TOKEN_INVALID, 'Authentication required', undefined, context.correlationId);
        }

        // Update context with user ID
        context.userId = session.userId;

        // Get user profile
        const profile = await profileService.getUserProfile(session.userId, context);

        return createSuccessNextResponse(profile, 'Profile retrieved successfully', context.correlationId);
      });
    })();
  }

  // Create expert profile
  static async createExpertProfile(request: NextRequest): Promise<NextResponse> {
    return withErrorHandler(async () => {
      const context = createRequestContext(request);
      
      return runWithCorrelation(context, async () => {
        // Get session from cookies
        const session = await cookieManager.getSessionFromCookies(request);
        if (!session) {
          throw new AuthenticationError(ErrorCode.TOKEN_INVALID, 'Authentication required', undefined, context.correlationId);
        }

        if (session.role !== 'expert') {
          throw new AuthenticationError(ErrorCode.ACCESS_DENIED, 'Only experts can create expert profiles', undefined, context.correlationId);
        }

        // Update context with user ID
        context.userId = session.userId;

        // Parse and validate request body
        const body = await request.json();
        const validation = ValidationService.validateExpertProfile(body, context);
        
        if (!validation.success) {
          const validationErrors = Object.entries(validation.errors).map(([field, message]) => ({
            field,
            message
          }));
          throw new ValidationError(ErrorCode.INVALID_INPUT, 'Profile validation failed', undefined, { validationErrors }, context.correlationId);
        }

        const validatedData = validation.data as ExpertProfileData;

        // Map validation data to database format
        const dbData = mapExpertProfileToDb(validatedData);

        // Create expert profile using service
        const result = await profileService.createExpertProfile(session.userId, dbData, context);

        if (!result.success) {
          throw new ProfileError(result.error || 'Failed to create expert profile', 'PROFILE_CREATION_FAILED');
        }

        // Create new session with updated profile status
        const updatedSessionData = {
          userId: result.data!.user.id,
          email: result.data!.user.email,
          role: result.data!.user.role as 'expert',
          isEmailVerified: result.data!.user.isEmailVerified,
          isProfileCompleted: result.data!.user.isProfileCompleted,
          isApproved: result.data!.user.isApproved
        };

        const newSession = await sessionManager.createSession(updatedSessionData);
        
        // Create response with updated tokens
        const response = createSuccessNextResponse({
          profile: result.data!.profile,
          user: result.data!.user,
          accessToken: newSession.accessToken,
          refreshToken: newSession.refreshToken
        }, 'Expert profile created successfully', context.correlationId, 201);

        // Set updated cookies
        cookieManager.setAuthCookies(response, newSession);

        return response;
      });
    })();
  }

  // Create customer profile
  static async createCustomerProfile(request: NextRequest): Promise<NextResponse> {
    return withErrorHandler(async () => {
      const context = createRequestContext(request);
      
      return runWithCorrelation(context, async () => {
        // Get session from cookies
        const session = await cookieManager.getSessionFromCookies(request);
        if (!session) {
          throw new AuthenticationError(ErrorCode.TOKEN_INVALID, 'Authentication required', undefined, context.correlationId);
        }

        if (session.role !== 'customer') {
          throw new AuthenticationError(ErrorCode.ACCESS_DENIED, 'Only customers can create customer profiles', undefined, context.correlationId);
        }

        // Update context with user ID
        context.userId = session.userId;

        // Parse and validate request body
        const body = await request.json();
        const validation = ValidationService.validateCustomerProfile(body, context);
        
        if (!validation.success) {
          const validationErrors = Object.entries(validation.errors).map(([field, message]) => ({
            field,
            message
          }));
          throw new ValidationError(ErrorCode.INVALID_INPUT, 'Profile validation failed', undefined, { validationErrors }, context.correlationId);
        }

        const validatedData = validation.data as CustomerProfileData;

        // Map validation data to database format
        const dbData = mapCustomerProfileToDb(validatedData);

        // Create customer profile using service
        const result = await profileService.createCustomerProfile(session.userId, dbData, context);

        if (!result.success) {
          throw new ProfileError(result.error || 'Failed to create customer profile', 'PROFILE_CREATION_FAILED');
        }

        // Create new session with updated profile status
        const updatedSessionData = {
          userId: result.data!.user.id,
          email: result.data!.user.email,
          role: result.data!.user.role as 'customer',
          isEmailVerified: result.data!.user.isEmailVerified,
          isProfileCompleted: result.data!.user.isProfileCompleted,
          isApproved: result.data!.user.isApproved
        };

        const newSession = await sessionManager.createSession(updatedSessionData);
        
        // Create response with updated tokens
        const response = createSuccessNextResponse({
          profile: result.data!.profile,
          user: result.data!.user,
          accessToken: newSession.accessToken,
          refreshToken: newSession.refreshToken
        }, 'Customer profile created successfully', context.correlationId, 201);

        // Set updated cookies
        cookieManager.setAuthCookies(response, newSession);

        return response;
      });
    })();
  }

  // Update expert profile
  static async updateExpertProfile(request: NextRequest): Promise<NextResponse> {
    return withErrorHandler(async () => {
      const context = createRequestContext(request);
      
      return runWithCorrelation(context, async () => {
        // Get session from cookies
        const session = await cookieManager.getSessionFromCookies(request);
        if (!session) {
          throw new AuthenticationError(ErrorCode.TOKEN_INVALID, 'Authentication required', undefined, context.correlationId);
        }

        if (session.role !== 'expert') {
          throw new AuthenticationError(ErrorCode.ACCESS_DENIED, 'Only experts can update expert profiles', undefined, context.correlationId);
        }

        // Update context with user ID
        context.userId = session.userId;

        // Parse and validate request body
        const body = await request.json();
        const validation = ValidationService.validateExpertProfileUpdate(body, context);
        
        if (!validation.success) {
          const validationErrors = Object.entries(validation.errors).map(([field, message]) => ({
            field,
            message
          }));
          throw new ValidationError(ErrorCode.INVALID_INPUT, 'Profile validation failed', undefined, { validationErrors }, context.correlationId);
        }

        const validatedData = validation.data as ExpertProfileUpdateData;

        // Map validation data to database format
        const dbData = mapPartialExpertProfileToDb(validatedData);

        // Update expert profile using service
        const result = await profileService.updateExpertProfile(session.userId, dbData, context);

        if (!result.success) {
          throw new ProfileError(result.error || 'Failed to update expert profile', 'PROFILE_UPDATE_FAILED');
        }

        return createSuccessNextResponse(result.data, 'Expert profile updated successfully', context.correlationId);
      });
    })();
  }

  // Update customer profile
  static async updateCustomerProfile(request: NextRequest): Promise<NextResponse> {
    return withErrorHandler(async () => {
      const context = createRequestContext(request);
      
      return runWithCorrelation(context, async () => {
        // Get session from cookies
        const session = await cookieManager.getSessionFromCookies(request);
        if (!session) {
          throw new AuthenticationError(ErrorCode.TOKEN_INVALID, 'Authentication required', undefined, context.correlationId);
        }

        if (session.role !== 'customer') {
          throw new AuthenticationError(ErrorCode.ACCESS_DENIED, 'Only customers can update customer profiles', undefined, context.correlationId);
        }

        // Update context with user ID
        context.userId = session.userId;

        // Parse and validate request body
        const body = await request.json();
        const validation = ValidationService.validateCustomerProfileUpdate(body, context);
        
        if (!validation.success) {
          const validationErrors = Object.entries(validation.errors).map(([field, message]) => ({
            field,
            message
          }));
          throw new ValidationError(ErrorCode.INVALID_INPUT, 'Profile validation failed', undefined, { validationErrors }, context.correlationId);
        }

        const validatedData = validation.data as CustomerProfileUpdateData;

        // Map validation data to database format
        const dbData = mapPartialCustomerProfileToDb(validatedData);

        // Update customer profile using service
        const result = await profileService.updateCustomerProfile(session.userId, dbData, context);

        if (!result.success) {
          throw new ProfileError(result.error || 'Failed to update customer profile', 'PROFILE_UPDATE_FAILED');
        }

        return createSuccessNextResponse(result.data, 'Customer profile updated successfully', context.correlationId);
      });
    })();
  }
}