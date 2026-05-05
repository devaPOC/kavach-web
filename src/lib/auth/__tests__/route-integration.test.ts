import { describe, it, expect } from 'vitest'
import { RouteChecker } from '../route-config'
import { checkRouteAccess, validateAwarenessSessionAccess, getDashboardUrl, getAwarenessSessionUrl } from '../route-protection'

describe('Awareness Session Route Integration', () => {
  describe('Route Configuration', () => {
    it('should recognize awareness session routes as protected', () => {
      expect(RouteChecker.isProtected('/admin/awareness-sessions')).toBe(true)
      expect(RouteChecker.isProtected('/expert/awareness-sessions')).toBe(true)
      expect(RouteChecker.isProtected('/dashboard/awareness-session-request')).toBe(true)
    })

    it('should recognize admin awareness session routes as admin-only', () => {
      expect(RouteChecker.isAdmin('/admin/awareness-sessions')).toBe(true)
      expect(RouteChecker.isAdmin('/api/v1/admin/awareness-sessions')).toBe(true)
    })

    it('should recognize role-specific awareness session routes', () => {
      expect(RouteChecker.getRequiredRole('/expert/awareness-sessions')).toBe('expert')
      expect(RouteChecker.getRequiredRole('/dashboard/awareness-session-request')).toBe('customer')
    })

    it('should require email verification for awareness session routes', () => {
      expect(RouteChecker.requiresEmailVerification('/admin/awareness-sessions')).toBe(true)
      expect(RouteChecker.requiresEmailVerification('/expert/awareness-sessions')).toBe(true)
      expect(RouteChecker.requiresEmailVerification('/dashboard/awareness-session-request')).toBe(true)
    })
  })

  describe('Route Protection', () => {
    const mockCustomerSession = {
      id: '1',
      role: 'customer' as const,
      isEmailVerified: true,
      isProfileCompleted: true,
      isApproved: true
    }

    const mockExpertSession = {
      id: '2',
      role: 'expert' as const,
      isEmailVerified: true,
      isProfileCompleted: true,
      isApproved: true
    }

    const mockAdminSession = {
      id: '3',
      role: 'admin' as const,
      isEmailVerified: true,
      isProfileCompleted: true,
      isApproved: true
    }

    it('should allow customers to access customer awareness session routes', () => {
      const result = checkRouteAccess('/dashboard/awareness-session-request', mockCustomerSession)
      expect(result.allowed).toBe(true)
    })

    it('should prevent customers from accessing admin awareness session routes', () => {
      const result = checkRouteAccess('/admin/awareness-sessions', mockCustomerSession)
      expect(result.allowed).toBe(false)
      expect(result.redirectUrl).toBe('/dashboard')
    })

    it('should allow experts to access expert awareness session routes', () => {
      const result = checkRouteAccess('/expert/awareness-sessions', mockExpertSession)
      expect(result.allowed).toBe(true)
    })

    it('should prevent experts from accessing admin awareness session routes', () => {
      const result = checkRouteAccess('/admin/awareness-sessions', mockExpertSession)
      expect(result.allowed).toBe(false)
      expect(result.redirectUrl).toBe('/expert/dashboard')
    })

    it('should allow admins to access all awareness session routes', () => {
      expect(checkRouteAccess('/admin/awareness-sessions', mockAdminSession).allowed).toBe(true)
      expect(checkRouteAccess('/expert/awareness-sessions', mockAdminSession).allowed).toBe(true)
      expect(checkRouteAccess('/dashboard/awareness-session-request', mockAdminSession).allowed).toBe(true)
    })
  })

  describe('Awareness Session Access Validation', () => {
    it('should validate customer access correctly', () => {
      expect(validateAwarenessSessionAccess('/dashboard/awareness-session-request', 'customer')).toBe(true)
      expect(validateAwarenessSessionAccess('/api/v1/awareness-sessions', 'customer')).toBe(true)
      expect(validateAwarenessSessionAccess('/admin/awareness-sessions', 'customer')).toBe(false)
    })

    it('should validate expert access correctly', () => {
      expect(validateAwarenessSessionAccess('/expert/awareness-sessions', 'expert')).toBe(true)
      expect(validateAwarenessSessionAccess('/api/v1/expert/awareness-sessions', 'expert')).toBe(true)
      expect(validateAwarenessSessionAccess('/admin/awareness-sessions', 'expert')).toBe(false)
    })

    it('should validate admin access correctly', () => {
      expect(validateAwarenessSessionAccess('/admin/awareness-sessions', 'admin')).toBe(true)
      expect(validateAwarenessSessionAccess('/expert/awareness-sessions', 'admin')).toBe(true)
      expect(validateAwarenessSessionAccess('/dashboard/awareness-session-request', 'admin')).toBe(true)
    })
  })

  describe('URL Helpers', () => {
    it('should return correct dashboard URLs', () => {
      expect(getDashboardUrl('customer')).toBe('/dashboard')
      expect(getDashboardUrl('expert')).toBe('/expert/dashboard')
      expect(getDashboardUrl('admin')).toBe('/admin/dashboard')
    })

    it('should return correct awareness session URLs', () => {
      expect(getAwarenessSessionUrl('customer')).toBe('/dashboard')
      expect(getAwarenessSessionUrl('expert')).toBe('/expert/awareness-sessions')
      expect(getAwarenessSessionUrl('admin')).toBe('/admin/awareness-sessions')
    })
  })
})