/**
 * Frontend API Client for V1 Endpoints
 *
 * This client provides a centralized way to interact with the new V1 API endpoints.
 * It handles authentication, error handling, and provides type-safe methods.
 */

import { User, UserResponse } from '@/types/user';

export interface LoginData {
  email: string;
  password: string;
  role?: 'customer' | 'expert';
}

export interface SignupData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role?: 'customer' | 'expert';
  agreedToTerms: boolean;
  legalAgreements?: Record<string, boolean>;
}

export interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: 'customer' | 'expert' | 'trainer';
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  role?: 'customer' | 'expert' | 'admin';
  isEmailVerified?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  users: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Base API client class with common functionality
 */
class BaseApiClient {
  private baseUrl: string;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseUrl: string = '/api/v1') {
    this.baseUrl = baseUrl;
  }

  /**
   * Attempt to refresh the authentication token
   */
  private async refreshToken(): Promise<boolean> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh with enhanced error handling
   */
  private async performTokenRefresh(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        try {
          const data = await response.json();
          // Check if the response indicates success
          if (data.success !== false) {
            return true;
          }
        } catch (parseError) {
          // If we can't parse the response but status is ok, assume success
          return true;
        }
      }

      // If refresh fails, handle gracefully
      console.warn('Token refresh failed with status:', response.status);

      // Only redirect to login if we're in the browser and it's a client-side failure
      // Don't redirect if we're already on the login page
      if (typeof window !== 'undefined' && response.status === 401 &&
        !window.location.pathname.includes('/login')) {
        // Give a small delay to prevent immediate redirect during page load
        setTimeout(() => {
          window.location.href = '/login';
        }, 100);
      }

      return false;
    } catch (error) {
      console.error('Token refresh network error:', error);

      // Only redirect on network errors if we're in the browser
      // Don't redirect if we're already on the login page
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        // Check if we're online before redirecting
        if (navigator.onLine) {
          setTimeout(() => {
            window.location.href = '/login';
          }, 100);
        }
      }

      return false;
    }
  }

  /**
   * Generic request method with automatic token refresh and enhanced error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<ApiResponse<T>> {
    try {
      // Ensure we have a proper URL construction
      const url = `${this.baseUrl}${endpoint}`;

      // Validate URL construction
      if (!url.startsWith('/') && !url.startsWith('http')) {
        throw new Error(`Invalid URL construction: ${url}`);
      }

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'same-origin', // Include cookies
        ...options,
      });

      // Handle 401 Unauthorized - attempt token refresh
      if (response.status === 401 && retryCount === 0) {
        const refreshSuccess = await this.refreshToken();
        if (refreshSuccess) {
          // Retry the original request
          return this.request<T>(endpoint, options, retryCount + 1);
        }
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        // Handle non-JSON responses
        return {
          success: false,
          error: `Invalid response format (HTTP ${response.status})`,
          errorCode: 'INVALID_RESPONSE_FORMAT'
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || `HTTP ${response.status}`,
          errorCode: data.errorCode || data.code || `HTTP_${response.status}`,
          message: data.message,
          ...data // Include any additional error details
        };
      }

      // Handle unified API response format
      if (data.success === false) {
        return {
          success: false,
          error: data.error || data.message || 'Request failed',
          errorCode: data.code || data.errorCode || 'UNKNOWN_ERROR',
          message: data.message,
          ...data
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message
      };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        errorCode: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * GET request
   */
  protected get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  protected post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  protected put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  protected delete<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  protected patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

/**
 * Authentication API client
 */
class AuthApiClient extends BaseApiClient {
  /**
   * User login
   */
  async login(credentials: LoginData): Promise<ApiResponse<{
    message: string;
    user: UserResponse;
  }>> {
    // Use role-specific endpoint for better security if role is provided
    if (credentials.role) {
      const endpoint = credentials.role === 'customer'
        ? '/auth/login/customer'
        : '/auth/login/expert';

      return this.post(endpoint, {
        email: credentials.email,
        password: credentials.password
      });
    }

    // Fallback to general login endpoint (for admin)
    return this.post('/auth/login', credentials);
  }

  /**
   * User signup
   */
  async signup(userData: SignupData): Promise<ApiResponse<{
    user: UserResponse;
    requiresVerification: boolean;
  }>> {
    return this.post('/auth/signup', userData);
  }

  /**
   * User logout
   */
  async logout(): Promise<ApiResponse<{ message: string }>> {
    return this.post('/auth/logout');
  }

  /**
   * Get current user profile
   */
  async me(): Promise<ApiResponse<UserResponse>> {
    return this.get('/auth/me');
  }

  /**
   * Refresh authentication token
   */
  async refreshAuthToken(): Promise<ApiResponse<{
    accessToken: string;
    refreshToken: string;
    user: any;
  }>> {
    return this.post('/auth/refresh');
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<ApiResponse<{ message: string }>> {
    return this.post('/auth/verify-email', { token });
  }

  /**
   * Resend email verification
   */
  async resendVerification(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.post('/auth/resend-verification', { email });
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.post('/auth/forgot-password', { email });
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, password: string): Promise<ApiResponse<{ message: string }>> {
    return this.post('/auth/reset-password', { token, password });
  }
}

/**
 * User management API client
 */
class UserApiClient extends BaseApiClient {
  /**
   * Get user profile
   */
  async getProfile(): Promise<ApiResponse<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isEmailVerified: boolean;
    createdAt: string;
    updatedAt: string;
  }>> {
    return this.get('/users/profile');
  }

  /**
   * Update user profile
   */
  async updateProfile(data: ProfileUpdateData): Promise<ApiResponse<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isEmailVerified: boolean;
    updatedAt: string;
  }>> {
    return this.put('/users/profile', data);
  }

  /**
   * Change password
   */
  async changePassword(data: ChangePasswordData): Promise<ApiResponse<{ message: string }>> {
    return this.post('/users/change-password', data);
  }
}

/**
 * Admin API client
 */
class AdminApiClient extends BaseApiClient {
  /**
   * Admin login
   */
  async login(credentials: LoginData): Promise<ApiResponse<{
    message: string;
    user: UserResponse;
  }>> {
    return this.post('/admin/login', credentials);
  }

  /**
   * Get global user counts for dashboard tiles
   */
  async getUserCounts(): Promise<ApiResponse<{
    totalUsers: number;
    locked: number;
    banned: number;
    paused: number;
    pendingApprovalExperts: number;
    verified: number;
  }>> {
    return this.get('/admin/users/counts');
  }

  /**
   * Get all users (with pagination and optional filters)
   */
  async getUsers(
    page: number = 1,
    limit: number = 20,
    filters?: {
      search?: string;
      role?: 'customer' | 'expert' | 'trainer' | 'admin';
      approved?: boolean;
      verified?: boolean;
      locked?: boolean;
      banned?: boolean;
      paused?: boolean;
      startDate?: string; // ISO
      endDate?: string;   // ISO
    }
  ): Promise<ApiResponse<PaginatedResponse<UserResponse>>> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit)
    });

    if (filters?.search?.trim()) params.append('search', filters.search.trim());
    if (filters?.role) params.append('role', filters.role);
    if (typeof filters?.approved === 'boolean') params.append('approved', String(filters.approved));
    if (typeof filters?.verified === 'boolean') params.append('verified', String(filters.verified));
    if (typeof filters?.locked === 'boolean') params.append('locked', String(filters.locked));
    if (typeof filters?.banned === 'boolean') params.append('banned', String(filters.banned));
    if (typeof filters?.paused === 'boolean') params.append('paused', String(filters.paused));
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    return this.get(`/admin/users?${params.toString()}`);
  }

  /**
   * Create new user (admin only)
   */
  async createUser(userData: CreateUserData): Promise<ApiResponse<UserResponse>> {
    return this.post('/admin/users', userData);
  }

  /**
   * Get user by ID (admin only)
   */
  async getUserById(userId: string): Promise<ApiResponse<UserResponse>> {
    return this.get(`/admin/users/${userId}`);
  }

  /**
   * Update user (admin only)
   */
  async updateUser(userId: string, userData: UpdateUserData): Promise<ApiResponse<UserResponse>> {
    return this.put(`/admin/users/${userId}`, userData);
  }

  /**
   * Delete user (admin only)
   */
  async deleteUser(userId: string, reason?: string): Promise<ApiResponse<{ message: string }>> {
    return this.delete(`/admin/users/${userId}`, reason ? { reason } : undefined);
  }

  /**
   * Ban expert (admin only)
   */
  async banExpert(userId: string): Promise<ApiResponse<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isEmailVerified: boolean;
    isBanned: boolean;
    isPaused: boolean;
    bannedAt?: string;
    pausedAt?: string;
    updatedAt: string;
  }>> {
    return this.post(`/admin/users/${userId}/ban`);
  }

  /**
   * Unban expert (admin only)
   */
  async unbanExpert(userId: string): Promise<ApiResponse<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isEmailVerified: boolean;
    isBanned: boolean;
    isPaused: boolean;
    bannedAt?: string;
    pausedAt?: string;
    updatedAt: string;
  }>> {
    return this.delete(`/admin/users/${userId}/ban`);
  }

  /**
   * Pause customer (admin only)
   */
  async pauseCustomer(userId: string): Promise<ApiResponse<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isEmailVerified: boolean;
    isBanned: boolean;
    isPaused: boolean;
    bannedAt?: string;
    pausedAt?: string;
    updatedAt: string;
  }>> {
    return this.post(`/admin/users/${userId}/pause`);
  }

  /**
   * Unpause customer (admin only)
   */
  async unpauseCustomer(userId: string): Promise<ApiResponse<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isEmailVerified: boolean;
    isBanned: boolean;
    isPaused: boolean;
    bannedAt?: string;
    pausedAt?: string;
    updatedAt: string;
  }>> {
    return this.delete(`/admin/users/${userId}/pause`);
  }

  /**
   * Get user profile (admin only)
   */
  async getUserProfile(userId: string): Promise<ApiResponse<{
    user: UserResponse;
    profile: any; // Will be ExpertProfileData or CustomerProfileData
  }>> {
    return this.get(`/admin/users/${userId}/profile`);
  }

  /**
   * Approve expert profile (admin only)
   */
  async approveExpert(userId: string): Promise<ApiResponse<{
    message: string;
    user: UserResponse;
  }>> {
    return this.post(`/admin/users/${userId}/approve`);
  }

  /**
   * Reject expert profile (admin only)
   */
  async rejectExpert(userId: string, reason?: string): Promise<ApiResponse<{
    message: string;
    user: UserResponse;
  }>> {
    return this.delete(`/admin/users/${userId}/approve`, reason ? { reason } : undefined);
  }

  /**
   * Unlock user account (admin only)
   */
  async unlockUserAccount(userId: string): Promise<ApiResponse<{
    message: string;
    user: UserResponse;
  }>> {
    return this.post(`/admin/users/${userId}/unlock`);
  }

  /**
   * Promote expert to trainer (admin only)
   */
  async promoteToTrainer(userId: string): Promise<ApiResponse<{
    message: string;
    user: UserResponse;
  }>> {
    return this.post(`/admin/promote-trainer`, { expertId: userId });
  }

  /**
   * Demote trainer back to expert (admin only)
   */
  async demoteFromTrainer(userId: string): Promise<ApiResponse<{
    message: string;
    user: UserResponse;
  }>> {
    return this.post(`/admin/demote-trainer`, { trainerId: userId });
  }

  /**
   * Get list of experts (admin only)
   */
  async getExpertList(): Promise<ApiResponse<any[]>> {
    return this.get('/admin/experts');
  }

  /**
   * Get awareness session requests for admin dashboard
   */
  async getAwarenessSessionRequests(
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: 'pending_admin_review' | 'forwarded_to_expert' | 'confirmed' | 'rejected' | 'expert_declined';
      search?: string;
      startDate?: string;
      endDate?: string;
      sessionMode?: 'on_site' | 'online';
    }
  ): Promise<ApiResponse<{
    requests: any[];
    total: number;
    totalPages: number;
    page: number;
    countsByStatus?: Record<string, number>;
  }>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    if (filters?.status) params.append('status', filters.status);
    if (filters?.search?.trim()) params.append('search', filters.search.trim());
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.sessionMode) params.append('sessionMode', filters.sessionMode);

    return this.get(`/admin/awareness-sessions?${params}`);
  }

  /**
   * Review awareness session request (approve/reject)
   */
  async reviewAwarenessSessionRequest(requestId: string, data: {
    action: 'approve' | 'reject';
    notes?: string;
    expertId?: string;
  }): Promise<ApiResponse<any>> {
    return this.put(`/admin/awareness-sessions/${requestId}/review`, data);
  }

  /**
   * Assign expert to awareness session request
   */
  async assignExpertToAwarenessSession(requestId: string, data: {
    expertId: string;
    notes?: string;
  }): Promise<ApiResponse<any>> {
    return this.put(`/admin/awareness-sessions/${requestId}/assign`, data);
  }

  /**
   * Get all trainer resources (admin only)
   */
  async getTrainerResources(): Promise<ApiResponse<any[]>> {
    return this.get('/admin/resources');
  }

  /**
   * Create a new trainer resource (admin only)
   */
  async createTrainerResource(data: {
    title: string;
    description?: string;
    contentUrl?: string;
    isPublished?: boolean;
    resourceType?: string;
    // File upload fields
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    r2Key?: string;
  }): Promise<ApiResponse<any>> {
    return this.post('/admin/resources', data);
  }

  /**
   * Update a trainer resource (admin only)
   */
  async updateTrainerResource(resourceId: string, data: {
    title?: string;
    description?: string;
    contentUrl?: string;
    isPublished?: boolean;
    resourceType?: string;
    // File upload fields
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    r2Key?: string;
  }): Promise<ApiResponse<any>> {
    return this.patch(`/admin/resources/${resourceId}`, data);
  }

  /**
   * Delete a trainer resource (admin only)
   */
  async deleteTrainerResource(resourceId: string): Promise<ApiResponse<{ message: string }>> {
    return this.delete(`/admin/resources/${resourceId}`);
  }
}

/**
 * Health monitoring API client
 */
class HealthApiClient extends BaseApiClient {
  /**
   * Get overall health status
   */
  async getStatus(): Promise<ApiResponse<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    timestamp: string;
    checks: Array<{
      name: string;
      status: 'healthy' | 'unhealthy' | 'degraded';
      responseTime: number;
      error?: string;
    }>;
  }>> {
    return this.get('/health');
  }

  /**
   * Get specific health check
   */
  async getCheck(checkName: string): Promise<ApiResponse<{
    name: string;
    status: 'healthy' | 'unhealthy' | 'degraded';
    responseTime: number;
    error?: string;
  }>> {
    return this.get(`/health?check=${checkName}`);
  }
}

/**
 * Expert API client for expert-specific operations
 */
class ExpertApiClient extends BaseApiClient {
  /**
   * Get assigned awareness session requests
   */
}

/**
 * Trainer API client for trainer-specific operations
 */
class TrainerApiClient extends BaseApiClient {
  /**
   * Get assigned awareness session requests
   */
  async getAwarenessSessionRequests(
    page: number = 1,
    limit: number = 10,
    filters?: {
      status?: 'forwarded_to_expert' | 'confirmed' | 'expert_declined' | 'pending_admin_review' | 'rejected';
      search?: string; // subject/org/location
      startDate?: string; // ISO string
      endDate?: string;   // ISO string
      sessionMode?: 'on_site' | 'online';
    }
  ): Promise<ApiResponse<{ requests: any[]; total: number; totalPages: number; page: number }>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    if (filters?.status) params.append('status', filters.status);
    if (filters?.search?.trim()) params.append('search', filters.search.trim());
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.sessionMode) params.append('sessionMode', filters.sessionMode);

    return this.get(`/trainer/awareness-sessions?${params}`);
  }

  /**
   * Respond to awareness session request (accept/decline)
   */
  async respondToAwarenessSessionRequest(requestId: string, data: {
    action: 'accept' | 'decline';
    notes?: string;
  }): Promise<ApiResponse<any>> {
    return this.put(`/trainer/awareness-sessions/${requestId}/respond`, data);
  }
}

/**
 * Profile API client for managing user profiles
 */
class ProfileApiClient extends BaseApiClient {
  constructor(baseUrl?: string) {
    super(baseUrl ? `${baseUrl}/profile` : '/api/v1/profile');
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<ApiResponse<any>> {
    return this.get('/');
  }

  /**
   * Create expert profile
   */
  async createExpertProfile(data: any): Promise<ApiResponse<any>> {
    return this.post('/expert', data);
  }

  /**
   * Update expert profile
   */
  async updateExpertProfile(data: any): Promise<ApiResponse<any>> {
    return this.put('/expert', data);
  }

  /**
   * Create customer profile
   */
  async createCustomerProfile(data: any): Promise<ApiResponse<any>> {
    return this.post('/customer', data);
  }

  /**
   * Update customer profile
   */
  async updateCustomerProfile(data: any): Promise<ApiResponse<any>> {
    return this.put('/customer', data);
  }
}

/**
 * Main API client with all endpoints
 */
export class ApiClient {
  public auth: AuthApiClient;
  public users: UserApiClient;
  public admin: AdminApiClient;
  public expert: ExpertApiClient;
  public trainer: TrainerApiClient;
  public health: HealthApiClient;
  public profile: ProfileApiClient;

  constructor(baseUrl?: string) {
    this.auth = new AuthApiClient(baseUrl);
    this.users = new UserApiClient(baseUrl);
    this.admin = new AdminApiClient(baseUrl);
    this.admin = new AdminApiClient(baseUrl);
    this.expert = new ExpertApiClient(baseUrl);
    this.trainer = new TrainerApiClient(baseUrl);
    this.health = new HealthApiClient(baseUrl);
    this.profile = new ProfileApiClient(baseUrl);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export individual clients for convenience
export const authApi = apiClient.auth;
export const usersApi = apiClient.users;
export const adminApi = apiClient.admin;
export const expertApi = apiClient.expert;
export const trainerApi = apiClient.trainer;
export const healthApi = apiClient.health;
export const profileApi = apiClient.profile;
