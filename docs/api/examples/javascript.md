# JavaScript/TypeScript API Examples

This document provides comprehensive JavaScript and TypeScript examples for using the Kavach API, including authentication, user management, profile operations, and error handling.

## Setup and Configuration

### Basic API Client Setup

```typescript
// api-client.ts
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    field?: string;
    details?: any;
  };
  timestamp: string;
  correlationId: string;
}

class KavachApiClient {
  private baseUrl: string;
  
  constructor(baseUrl: string = 'http://localhost:3000/api/v1') {
    this.baseUrl = baseUrl;
  }
  
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for authentication
      ...options,
    };
    
    try {
      const response = await fetch(url, defaultOptions);
      const data = await response.json();
      
      // Log rate limit information
      this.logRateLimit(response);
      
      if (!response.ok) {
        throw new ApiError(data.error, response.status);
      }
      
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError({
        code: 'NETWORK_ERROR',
        message: 'Network request failed'
      }, 0);
    }
  }
  
  private logRateLimit(response: Response) {
    const limit = response.headers.get('X-RateLimit-Limit');
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');
    
    if (limit && remaining && reset) {
      console.log('Rate Limit:', {
        limit: parseInt(limit),
        remaining: parseInt(remaining),
        resetTime: new Date(parseInt(reset) * 1000)
      });
    }
  }
  
  // Authentication methods
  async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
    return this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }
  
  async signup(userData: SignupData): Promise<ApiResponse<SignupResponse>> {
    return this.makeRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }
  
  async logout(): Promise<ApiResponse<LogoutResponse>> {
    return this.makeRequest('/auth/logout', {
      method: 'POST'
    });
  }
  
  async refreshToken(): Promise<ApiResponse<RefreshResponse>> {
    return this.makeRequest('/auth/refresh', {
      method: 'POST'
    });
  }
  
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.makeRequest('/auth/me');
  }
  
  // Profile methods
  async getProfile(): Promise<ApiResponse<ProfileResponse>> {
    return this.makeRequest('/profile');
  }
  
  async createCustomerProfile(profileData: CustomerProfileData): Promise<ApiResponse<ProfileCreationResponse>> {
    return this.makeRequest('/profile/customer', {
      method: 'POST',
      body: JSON.stringify(profileData)
    });
  }
  
  async createExpertProfile(profileData: ExpertProfileData): Promise<ApiResponse<ProfileCreationResponse>> {
    return this.makeRequest('/profile/expert', {
      method: 'POST',
      body: JSON.stringify(profileData)
    });
  }
  
  // User management methods
  async changePassword(passwordData: ChangePasswordData): Promise<ApiResponse<ChangePasswordResponse>> {
    return this.makeRequest('/users/change-password', {
      method: 'POST',
      body: JSON.stringify(passwordData)
    });
  }
}

// Custom error class
class ApiError extends Error {
  public code: string;
  public statusCode: number;
  public field?: string;
  public details?: any;
  
  constructor(error: any, statusCode: number) {
    super(error.message);
    this.name = 'ApiError';
    this.code = error.code;
    this.statusCode = statusCode;
    this.field = error.field;
    this.details = error.details;
  }
}

// Type definitions
interface LoginCredentials {
  email: string;
  password: string;
  role?: 'customer' | 'expert';
}

interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: 'customer' | 'expert';
  agreedToTerms: boolean;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'expert' | 'admin';
  isEmailVerified: boolean;
  isProfileCompleted: boolean;
  isApproved: boolean;
}

interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface SignupResponse {
  user: User;
  message: string;
}

interface LogoutResponse {
  message: string;
}

interface RefreshResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Initialize client
const api = new KavachApiClient();
```

## Authentication Examples

### User Registration

```typescript
// signup.ts
async function registerUser() {
  try {
    const signupData: SignupData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'SecurePassword123!',
      role: 'customer',
      agreedToTerms: true
    };
    
    const response = await api.signup(signupData);
    
    if (response.success) {
      console.log('Registration successful:', response.data);
      
      // Show success message to user
      showSuccessMessage('Account created successfully! Please check your email for verification.');
      
      // Redirect to email verification page
      window.location.href = '/verify-email';
    }
  } catch (error) {
    if (error instanceof ApiError) {
      handleSignupError(error);
    } else {
      console.error('Unexpected error:', error);
      showErrorMessage('An unexpected error occurred. Please try again.');
    }
  }
}

function handleSignupError(error: ApiError) {
  switch (error.code) {
    case 'DUPLICATE_ENTRY':
      if (error.field === 'email') {
        showErrorMessage('This email is already registered. Try logging in instead.');
        // Optionally redirect to login page
      }
      break;
      
    case 'INVALID_INPUT':
      if (error.details?.validationErrors) {
        displayValidationErrors(error.details.validationErrors);
      } else {
        showErrorMessage(error.message);
      }
      break;
      
    case 'RATE_LIMIT_EXCEEDED':
      const retryAfter = error.details?.retryAfter || 60;
      showRateLimitMessage(retryAfter);
      break;
      
    default:
      showErrorMessage(error.message || 'Registration failed. Please try again.');
  }
}

function displayValidationErrors(validationErrors: Array<{field: string, message: string}>) {
  validationErrors.forEach(error => {
    const fieldElement = document.querySelector(`[name="${error.field}"]`);
    if (fieldElement) {
      // Add error styling
      fieldElement.classList.add('error');
      
      // Show error message
      const errorElement = document.createElement('div');
      errorElement.className = 'error-message';
      errorElement.textContent = error.message;
      fieldElement.parentNode?.appendChild(errorElement);
    }
  });
}
```

### User Login

```typescript
// login.ts
async function loginUser() {
  try {
    const credentials: LoginCredentials = {
      email: 'john.doe@example.com',
      password: 'SecurePassword123!',
      role: 'customer'
    };
    
    const response = await api.login(credentials);
    
    if (response.success) {
      console.log('Login successful:', response.data);
      
      // Store user data in application state
      setCurrentUser(response.data.user);
      
      // Redirect based on user role and profile status
      redirectAfterLogin(response.data.user);
    }
  } catch (error) {
    if (error instanceof ApiError) {
      handleLoginError(error);
    } else {
      console.error('Unexpected error:', error);
      showErrorMessage('Login failed. Please try again.');
    }
  }
}

function handleLoginError(error: ApiError) {
  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      showErrorMessage('Invalid email or password. Please try again.');
      break;
      
    case 'EMAIL_NOT_VERIFIED':
      showErrorMessage('Please verify your email address before logging in.');
      // Show resend verification option
      showResendVerificationOption();
      break;
      
    case 'ACCOUNT_LOCKED':
      if (error.details?.reason === 'banned') {
        showErrorMessage('Your account has been banned. Please contact support.');
      } else if (error.details?.reason === 'paused') {
        showErrorMessage('Your account has been paused. Please contact support.');
      } else {
        showErrorMessage('Your account is temporarily locked. Please contact support.');
      }
      break;
      
    case 'RATE_LIMIT_EXCEEDED':
      const retryAfter = error.details?.retryAfter || 60;
      showRateLimitMessage(retryAfter);
      disableLoginForm(retryAfter);
      break;
      
    default:
      showErrorMessage(error.message || 'Login failed. Please try again.');
  }
}

function redirectAfterLogin(user: User) {
  if (!user.isEmailVerified) {
    window.location.href = '/verify-email';
  } else if (!user.isProfileCompleted) {
    window.location.href = '/complete-profile';
  } else if (user.role === 'expert' && !user.isApproved) {
    window.location.href = '/pending-approval';
  } else {
    window.location.href = '/dashboard';
  }
}
```

### Token Refresh with Automatic Retry

```typescript
// auth-manager.ts
class AuthManager {
  private refreshPromise: Promise<any> | null = null;
  
  async makeAuthenticatedRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      return await api.makeRequest(endpoint, options);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'TOKEN_EXPIRED') {
        // Try to refresh token
        await this.refreshToken();
        
        // Retry the original request
        return await api.makeRequest(endpoint, options);
      }
      throw error;
    }
  }
  
  private async refreshToken(): Promise<void> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    
    this.refreshPromise = this.performTokenRefresh();
    
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }
  
  private async performTokenRefresh(): Promise<void> {
    try {
      const response = await api.refreshToken();
      
      if (response.success) {
        console.log('Token refreshed successfully');
        // Update user data if needed
        setCurrentUser(response.data.user);
      }
    } catch (error) {
      if (error instanceof ApiError && error.code === 'TOKEN_INVALID') {
        // Refresh token is invalid, redirect to login
        console.log('Refresh token invalid, redirecting to login');
        clearCurrentUser();
        window.location.href = '/login';
      } else {
        throw error;
      }
    }
  }
}

const authManager = new AuthManager();
```

## Profile Management Examples

### Create Customer Profile

```typescript
// customer-profile.ts
async function createCustomerProfile() {
  try {
    const profileData: CustomerProfileData = {
      phoneNumber: '+968-9123-4567',
      dateOfBirth: '1990-05-15',
      gender: 'male',
      nationality: 'Omani',
      countryOfResidence: 'Oman',
      governorate: 'Muscat',
      wilayat: 'Muscat'
    };
    
    const response = await api.createCustomerProfile(profileData);
    
    if (response.success) {
      console.log('Profile created successfully:', response.data);
      
      // Update user data with new tokens
      if (response.data.accessToken) {
        setCurrentUser(response.data.user);
      }
      
      // Show success message
      showSuccessMessage('Profile created successfully!');
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    }
  } catch (error) {
    if (error instanceof ApiError) {
      handleProfileError(error);
    } else {
      console.error('Unexpected error:', error);
      showErrorMessage('Failed to create profile. Please try again.');
    }
  }
}

interface CustomerProfileData {
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  nationality?: string;
  countryOfResidence?: string;
  governorate?: string;
  wilayat?: string;
}
```

### Create Expert Profile

```typescript
// expert-profile.ts
async function createExpertProfile() {
  try {
    const profileData: ExpertProfileData = {
      // Basic information
      phoneNumber: '+968-9876-5432',
      dateOfBirth: '1985-08-22',
      gender: 'female',
      nationality: 'Omani',
      countryOfResidence: 'Oman',
      governorate: 'Dhofar',
      wilayat: 'Salalah',
      
      // Professional information
      areasOfSpecialization: 'Software Development, Cloud Architecture, DevOps',
      professionalExperience: `
        10+ years of experience in software development with expertise in:
        - Full-stack web development using React, Node.js, and TypeScript
        - Cloud architecture and deployment on AWS and Azure
        - DevOps practices including CI/CD, containerization, and monitoring
        - Team leadership and project management
      `,
      relevantCertifications: `
        - AWS Solutions Architect Professional
        - Kubernetes Certified Administrator
        - Scrum Master Certification
        - Microsoft Azure Developer Associate
      `,
      currentEmploymentStatus: 'employed',
      currentEmployer: 'Tech Solutions LLC',
      availability: 'part_time',
      preferredWorkArrangement: 'remote',
      preferredPaymentMethods: 'Bank transfer, Digital wallets'
    };
    
    const response = await api.createExpertProfile(profileData);
    
    if (response.success) {
      console.log('Expert profile created successfully:', response.data);
      
      // Update user data
      if (response.data.accessToken) {
        setCurrentUser(response.data.user);
      }
      
      // Show success message with approval info
      showSuccessMessage(
        'Profile created successfully! Your profile is now under review. ' +
        'You will be notified once it has been approved.'
      );
      
      // Redirect to pending approval page
      window.location.href = '/pending-approval';
    }
  } catch (error) {
    if (error instanceof ApiError) {
      handleProfileError(error);
    } else {
      console.error('Unexpected error:', error);
      showErrorMessage('Failed to create profile. Please try again.');
    }
  }
}

interface ExpertProfileData extends CustomerProfileData {
  areasOfSpecialization?: string;
  professionalExperience?: string;
  relevantCertifications?: string;
  currentEmploymentStatus?: 'employed' | 'unemployed' | 'self_employed' | 'student';
  currentEmployer?: string;
  availability?: 'full_time' | 'part_time' | 'weekends' | 'flexible';
  preferredWorkArrangement?: 'remote' | 'on_site' | 'hybrid';
  preferredPaymentMethods?: string;
}
```

### Get User Profile

```typescript
// profile-viewer.ts
async function loadUserProfile() {
  try {
    const response = await authManager.makeAuthenticatedRequest('/profile');
    
    if (response.success) {
      const { user, profile } = response.data;
      
      // Display user information
      displayUserInfo(user);
      
      // Display profile based on role
      if (user.role === 'customer') {
        displayCustomerProfile(profile);
      } else if (user.role === 'expert') {
        displayExpertProfile(profile);
      }
    }
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.code === 'RESOURCE_NOT_FOUND') {
        // Profile doesn't exist, redirect to profile creation
        window.location.href = '/complete-profile';
      } else {
        handleProfileError(error);
      }
    } else {
      console.error('Unexpected error:', error);
      showErrorMessage('Failed to load profile. Please try again.');
    }
  }
}

function displayUserInfo(user: User) {
  const userInfoElement = document.getElementById('user-info');
  if (userInfoElement) {
    userInfoElement.innerHTML = `
      <h2>${user.firstName} ${user.lastName}</h2>
      <p>Email: ${user.email}</p>
      <p>Role: ${user.role}</p>
      <p>Status: ${getUserStatus(user)}</p>
    `;
  }
}

function getUserStatus(user: User): string {
  if (!user.isEmailVerified) {
    return 'Email not verified';
  } else if (!user.isProfileCompleted) {
    return 'Profile incomplete';
  } else if (user.role === 'expert' && !user.isApproved) {
    return 'Pending approval';
  } else {
    return 'Active';
  }
}

function displayCustomerProfile(profile: any) {
  const profileElement = document.getElementById('profile-info');
  if (profileElement) {
    profileElement.innerHTML = `
      <h3>Profile Information</h3>
      <p>Phone: ${profile.phoneNumber || 'Not provided'}</p>
      <p>Date of Birth: ${profile.dateOfBirth || 'Not provided'}</p>
      <p>Gender: ${profile.gender || 'Not provided'}</p>
      <p>Nationality: ${profile.nationality || 'Not provided'}</p>
      <p>Location: ${formatLocation(profile)}</p>
    `;
  }
}

function displayExpertProfile(profile: any) {
  const profileElement = document.getElementById('profile-info');
  if (profileElement) {
    profileElement.innerHTML = `
      <h3>Profile Information</h3>
      <div class="basic-info">
        <h4>Basic Information</h4>
        <p>Phone: ${profile.phoneNumber || 'Not provided'}</p>
        <p>Date of Birth: ${profile.dateOfBirth || 'Not provided'}</p>
        <p>Gender: ${profile.gender || 'Not provided'}</p>
        <p>Nationality: ${profile.nationality || 'Not provided'}</p>
        <p>Location: ${formatLocation(profile)}</p>
      </div>
      
      <div class="professional-info">
        <h4>Professional Information</h4>
        <p><strong>Areas of Specialization:</strong></p>
        <p>${profile.areasOfSpecialization || 'Not provided'}</p>
        
        <p><strong>Professional Experience:</strong></p>
        <p>${profile.professionalExperience || 'Not provided'}</p>
        
        <p><strong>Certifications:</strong></p>
        <p>${profile.relevantCertifications || 'Not provided'}</p>
        
        <p>Employment Status: ${profile.currentEmploymentStatus || 'Not provided'}</p>
        <p>Current Employer: ${profile.currentEmployer || 'Not provided'}</p>
        <p>Availability: ${profile.availability || 'Not provided'}</p>
        <p>Work Arrangement: ${profile.preferredWorkArrangement || 'Not provided'}</p>
        <p>Payment Methods: ${profile.preferredPaymentMethods || 'Not provided'}</p>
      </div>
    `;
  }
}

function formatLocation(profile: any): string {
  const parts = [profile.wilayat, profile.governorate, profile.countryOfResidence]
    .filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Not provided';
}
```

## Error Handling and Rate Limiting

### Comprehensive Error Handler

```typescript
// error-handler.ts
function handleProfileError(error: ApiError) {
  switch (error.code) {
    case 'TOKEN_INVALID':
      // Redirect to login
      clearCurrentUser();
      window.location.href = '/login';
      break;
      
    case 'ACCESS_DENIED':
      showErrorMessage('You do not have permission to perform this action.');
      break;
      
    case 'INVALID_INPUT':
      if (error.details?.validationErrors) {
        displayValidationErrors(error.details.validationErrors);
      } else {
        showErrorMessage(error.message);
      }
      break;
      
    case 'RATE_LIMIT_EXCEEDED':
      const retryAfter = error.details?.retryAfter || 60;
      showRateLimitMessage(retryAfter);
      break;
      
    default:
      showErrorMessage(error.message || 'An error occurred. Please try again.');
  }
}
```

### Rate Limit Handler with UI Feedback

```typescript
// rate-limit-handler.ts
function showRateLimitMessage(retryAfter: number) {
  const messageElement = document.getElementById('rate-limit-message');
  if (!messageElement) return;
  
  let remainingTime = retryAfter;
  
  const updateMessage = () => {
    messageElement.textContent = 
      `Too many requests. Please wait ${remainingTime} seconds before trying again.`;
    messageElement.style.display = 'block';
    
    if (remainingTime > 0) {
      remainingTime--;
      setTimeout(updateMessage, 1000);
    } else {
      messageElement.style.display = 'none';
    }
  };
  
  updateMessage();
}

function disableLoginForm(retryAfter: number) {
  const form = document.getElementById('login-form') as HTMLFormElement;
  const submitButton = form?.querySelector('button[type="submit"]') as HTMLButtonElement;
  
  if (!form || !submitButton) return;
  
  const originalText = submitButton.textContent;
  let remainingTime = retryAfter;
  
  const updateButton = () => {
    submitButton.disabled = true;
    submitButton.textContent = `Wait ${remainingTime}s`;
    
    if (remainingTime > 0) {
      remainingTime--;
      setTimeout(updateButton, 1000);
    } else {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  };
  
  updateButton();
}
```

### Utility Functions

```typescript
// utils.ts
function showSuccessMessage(message: string) {
  const messageElement = document.getElementById('success-message');
  if (messageElement) {
    messageElement.textContent = message;
    messageElement.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      messageElement.style.display = 'none';
    }, 5000);
  }
}

function showErrorMessage(message: string) {
  const messageElement = document.getElementById('error-message');
  if (messageElement) {
    messageElement.textContent = message;
    messageElement.style.display = 'block';
  }
}

function clearMessages() {
  const successElement = document.getElementById('success-message');
  const errorElement = document.getElementById('error-message');
  
  if (successElement) successElement.style.display = 'none';
  if (errorElement) errorElement.style.display = 'none';
}

// User state management
let currentUser: User | null = null;

function setCurrentUser(user: User) {
  currentUser = user;
  localStorage.setItem('currentUser', JSON.stringify(user));
}

function getCurrentUser(): User | null {
  if (currentUser) return currentUser;
  
  const stored = localStorage.getItem('currentUser');
  if (stored) {
    currentUser = JSON.parse(stored);
    return currentUser;
  }
  
  return null;
}

function clearCurrentUser() {
  currentUser = null;
  localStorage.removeItem('currentUser');
}
```

## Usage Examples

### Complete Login Flow

```typescript
// complete-login-example.ts
async function handleLoginSubmit(event: Event) {
  event.preventDefault();
  
  const form = event.target as HTMLFormElement;
  const formData = new FormData(form);
  
  const credentials: LoginCredentials = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    role: formData.get('role') as 'customer' | 'expert'
  };
  
  // Clear previous messages
  clearMessages();
  
  try {
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Logging in...';
    
    const response = await api.login(credentials);
    
    if (response.success) {
      setCurrentUser(response.data.user);
      showSuccessMessage('Login successful! Redirecting...');
      
      // Redirect after short delay
      setTimeout(() => {
        redirectAfterLogin(response.data.user);
      }, 1000);
    }
  } catch (error) {
    if (error instanceof ApiError) {
      handleLoginError(error);
    } else {
      showErrorMessage('Login failed. Please try again.');
    }
  } finally {
    // Restore button state
    const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    submitButton.disabled = false;
    submitButton.textContent = originalText;
  }
}

// Attach event listener
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLoginSubmit);
  }
});
```

This comprehensive JavaScript/TypeScript guide provides everything needed to integrate with the Kavach API, including proper error handling, rate limiting, and user experience considerations.