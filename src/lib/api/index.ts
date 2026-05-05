/**
 * API Client Exports
 *
 * This file exports all API client functionality for easy importing
 * throughout the application.
 */

// Main API client and convenience exports
export {
  ApiClient,
  apiClient,
  authApi,
  usersApi,
  adminApi,
  healthApi,
  profileApi
} from './client';

// Route handler utilities for backend API routes
export {
  createRouteHandler,
  createSingleMethodHandler,
  createMethodNotAllowedHandler,
  getRequestBody,
  createRequestWithData,
  type HttpMethod,
  type RouteHandler,
  type RouteHandlerContext,
  type RouteConfig
} from './route-handler';

// Type exports for consumers
export type {
  LoginData,
  SignupData,
  ProfileUpdateData,
  ChangePasswordData,
  CreateUserData,
  UpdateUserData,
  ApiResponse,
  PaginatedResponse
} from './client';
