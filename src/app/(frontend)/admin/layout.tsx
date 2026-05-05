'use client'
import React, { useState, useEffect } from 'react'
import { authApi } from '@/lib/api/client'
import { AdminSidebar, defaultAdminSidebarItems } from '@/components/custom/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Menu } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Get current page title based on pathname
  const getCurrentPageTitle = () => {
    const currentItem = defaultAdminSidebarItems.find(item => {
      if (item.href === '/admin/dashboard') {
        return pathname === '/admin/dashboard' || pathname === '/admin'
      }
      return pathname.startsWith(item.href)
    })
    return currentItem?.label || 'Admin Dashboard'
  }

  const handleLogout = async () => {
    if (isLoggingOut) return

    setIsLoggingOut(true)
    try {
      const result = await authApi.logout()
      if (result.success) {
        localStorage.removeItem('user')
        router.push('/login')
      } else {
        console.error('Logout failed:', result.error)
        router.push('/login')
      }
    } catch (error) {
      console.error('Logout error:', error)
      router.push('/login')
    } finally {
      setIsLoggingOut(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    const fetchUser = async () => {
      try {
        // Use admin-specific endpoint that queries admins table
        const response = await fetch('/api/v1/admin/me')
        const result = await response.json()
        if (!cancelled) {
          if (result.success && result.data?.user) {
            setUser(result.data.user)

            // Check for forced password change
            if (result.data.user.mustChangePassword && !pathname.includes('/admin/change-password')) {
              router.push('/admin/change-password')
              return
            }

            if (result.data.user.role !== 'admin') {
              setError('Access denied. Admin privileges required.')
            }
          } else {
            setError('Authentication failed')
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          console.error('Error fetching user:', e)
          setError(e.message || 'Failed to load user data')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchUser()
    return () => { cancelled = true }
  }, [])

  // Skip layout for login page
  if (pathname.includes('/admin/login') || pathname.includes('/admin/change-password')) {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/30 border-t-rose-600"></div>
      </div>
    )
  }

  if (error || !user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/50">
        <Card className="w-full max-w-md shadow-lg border-border">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription className="text-muted-foreground">
              {error || 'You do not have permission to access the admin dashboard.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }



  return (
    <div className="min-h-screen bg-muted/50">
      <AdminSidebar
        user={user}
        sidebarOpen={sidebarOpen}
        sidebarCollapsed={sidebarCollapsed}
        isLoggingOut={isLoggingOut}
        sidebarItems={defaultAdminSidebarItems}
        onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
        onSidebarCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={handleLogout}
      />

      {/* Main content - offset by sidebar width */}
      <div className={`min-h-screen transition-all duration-300 ease-out ${sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'}`}>
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between h-14 px-4 bg-card/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-40">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-muted-foreground/80 hover:text-muted-foreground hover:bg-muted/50 transition-all duration-200"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground">
            {getCurrentPageTitle()}
          </h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Content area */}
        <div className="min-h-screen p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
