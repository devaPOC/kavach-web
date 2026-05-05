import { NextRequest, NextResponse } from 'next/server'
import { RouteChecker } from './route-config'

export interface RouteProtectionResult {
  allowed: boolean
  redirectUrl?: string
  reason?: string
}

export interface UserSession {
  userId: string
  role: 'customer' | 'expert' | 'trainer' | 'admin'
  isEmailVerified: boolean
  isProfileCompleted: boolean
  isApproved: boolean
}

/**
 * Check if a user can access a specific route based on their session and role
 */
export function checkRouteAccess(
  pathname: string,
  session: UserSession | null
): RouteProtectionResult {
  // Public routes are always accessible
  if (RouteChecker.isPublic(pathname)) {
    return { allowed: true }
  }

  // If no session and route is protected, redirect to login
  if (!session) {
    return {
      allowed: false,
      redirectUrl: '/login',
      reason: 'Authentication required'
    }
  }

  // Check email verification requirement
  if (RouteChecker.requiresEmailVerification(pathname) && !session.isEmailVerified) {
    return {
      allowed: false,
      redirectUrl: '/verify-email',
      reason: 'Email verification required'
    }
  }

  // Check profile completion for non-admin users
  if (session.role !== 'admin' && !session.isProfileCompleted) {
    // Allow access to profile completion page
    if (pathname === '/complete-profile') {
      return { allowed: true }
    }

    return {
      allowed: false,
      redirectUrl: '/complete-profile',
      reason: 'Profile completion required'
    }
  }

  // Check expert approval status
  if (session.role === 'expert' && !session.isApproved) {
    // Allow access to pending approval page
    if (pathname === '/pending-approval') {
      return { allowed: true }
    }

    return {
      allowed: false,
      redirectUrl: '/pending-approval',
      reason: 'Expert approval pending'
    }
  }

  // Check admin routes
  if (RouteChecker.isAdmin(pathname) && session.role !== 'admin') {
    return {
      allowed: false,
      redirectUrl: session.role === 'expert' ? '/expert/dashboard' : '/dashboard',
      reason: 'Admin privileges required'
    }
  }

  // Check role-specific routes (admins can access all role-specific routes)
  const requiredRole = RouteChecker.getRequiredRole(pathname)
  if (requiredRole && session.role !== requiredRole && session.role !== 'admin') {
    // Determine appropriate redirect based on user role
    let redirectUrl = '/dashboard'
    if (session.role === 'expert') {
      redirectUrl = '/expert/dashboard'
    }

    return {
      allowed: false,
      redirectUrl,
      reason: `${requiredRole} role required`
    }
  }

  // Check awareness session specific routes
  if (pathname.includes('/awareness-sessions') || pathname.includes('/awareness-session-request')) {
    // Customers can only access their own awareness session routes
    if (session.role === 'customer' && pathname.startsWith('/admin/')) {
      return {
        allowed: false,
        redirectUrl: '/dashboard',
        reason: 'Access denied'
      }
    }

    // Experts can only access expert awareness session routes
    if (session.role === 'expert' && pathname.startsWith('/admin/')) {
      return {
        allowed: false,
        redirectUrl: '/expert/dashboard',
        reason: 'Access denied'
      }
    }

    // Non-admins cannot access admin awareness session routes
    if (pathname.startsWith('/admin/awareness-sessions') && session.role !== 'admin') {
      return {
        allowed: false,
        redirectUrl: session.role === 'expert' ? '/expert/dashboard' : '/dashboard',
        reason: 'Admin privileges required'
      }
    }
  }

  // If all checks pass, allow access
  return { allowed: true }
}

/**
 * Awareness session specific route validation
 */
export function validateAwarenessSessionAccess(
  pathname: string,
  userRole: 'customer' | 'expert' | 'admin'
): boolean {
  // Admin can access all awareness session routes
  if (userRole === 'admin') {
    return true
  }

  // Expert can access expert-specific routes
  if (userRole === 'expert') {
    return pathname.startsWith('/expert/awareness-sessions') ||
      pathname.startsWith('/api/v1/expert/awareness-sessions')
  }

  // Customer can access customer-specific routes
  if (userRole === 'customer') {
    return pathname.startsWith('/dashboard/awareness-session-request') ||
      pathname.startsWith('/api/v1/awareness-sessions') ||
      pathname === '/dashboard' // For the awareness sessions tab
  }

  return false
}

/**
 * Get appropriate dashboard URL based on user role
 */
export function getDashboardUrl(userRole: 'customer' | 'expert' | 'admin'): string {
  switch (userRole) {
    case 'admin':
      return '/admin/dashboard'
    case 'expert':
      return '/expert/dashboard'
    case 'customer':
    default:
      return '/dashboard'
  }
}

/**
 * Get appropriate awareness session URL based on user role
 */
export function getAwarenessSessionUrl(userRole: 'customer' | 'expert' | 'admin'): string {
  switch (userRole) {
    case 'admin':
      return '/admin/awareness-sessions'
    case 'expert':
      return '/expert/awareness-sessions'
    case 'customer':
    default:
      return '/dashboard' // Customer accesses via dashboard tab
  }
}
