'use client'
import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { authApi } from '@/lib/api'
import { CustomerSidebar, defaultCustomerSidebarItems } from '@/components/custom/customer'
import { Navbar } from '@/components/custom/navigation'
import Forbidden from '@/app/forbidden'

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<any>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string>('')
	const [sidebarOpen, setSidebarOpen] = useState(false)
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
	const [isLoggingOut, setIsLoggingOut] = useState(false)
	const router = useRouter()
	const searchParams = useSearchParams()
	const pathname = usePathname()

	// Determine page title from pathname
	const getCurrentPageTitle = () => {
		// Simple mapping based on known routes
		if (pathname === '/dashboard') return 'Request Service'
		if (pathname.includes('/dashboard/requests')) return 'Service Management'
		if (pathname.includes('/dashboard/awareness-sessions')) return 'Awareness Sessions'
		if (pathname.includes('/dashboard/awareness-lab')) return 'Awareness Lab'

		const currentItem = defaultCustomerSidebarItems.find(item => pathname.startsWith(item.href) && item.href !== '/dashboard')
		return currentItem?.label || 'Dashboard'
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
				router.push('/login')
			}
		} catch (e) {
			router.push('/login')
		} finally {
			setIsLoggingOut(false)
		}
	}

	useEffect(() => {
		let cancelled = false
		const fetchUser = async () => {
			try {
				const result = await authApi.me()
				if (!cancelled) {
					if (result.success && result.data) {
						const u = result.data
						// Redirect expert users out of customer dashboard
						if (u.role === 'expert') {
							if (!u.isApproved) {
								router.push('/pending-approval')
								return
							}
							router.push('/expert/dashboard')
							return
						}
						setUser(u)
					} else {
						setError('Failed to fetch user data')
					}
				}
			} catch (e: any) {
				if (!cancelled) setError(e.message || 'Failed to load user data')
			} finally {
				if (!cancelled) setLoading(false)
			}
		}
		fetchUser()
		return () => { cancelled = true }
	}, [router])

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-muted/50">
				<div className="animate-spin rounded-full h-8 w-8 border-2 border-secondary/50 border-t-emerald-600"></div>
			</div>
		)
	}


	if (error || !user || user.role !== 'customer') {
		return <Forbidden />
	}

	return (
		<div className="min-h-screen bg-muted/50">
			{/* Reuse top navbar for branding + quick profile */}
			<Navbar user={user} showProfileMenu={true} showLogo={false} />
			{/* Sidebar */}
			<CustomerSidebar
				user={user}
				sidebarOpen={sidebarOpen}
				sidebarCollapsed={sidebarCollapsed}
				isLoggingOut={isLoggingOut}
				sidebarItems={defaultCustomerSidebarItems}
				onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
				onSidebarCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
				onLogout={handleLogout}
			/>

			{/* Main content area offset by sidebar similar to admin */}
			<div className={`transition-all duration-300 ease-out ${sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'} min-h-screen`}>
				{/* Mobile header when sidebar hidden */}
				<div className="lg:hidden flex items-center justify-between h-14 px-4 bg-card/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-40">
					<button
						onClick={() => setSidebarOpen(true)}
						className="p-2 rounded-lg text-muted-foreground/80 hover:text-muted-foreground hover:bg-muted/50 transition-all duration-200"
					>
						{/* Hamburger icon reused from sidebar collapse logic */}
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
							<path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
						</svg>
					</button>
					<h1 className="text-base font-semibold text-foreground">{getCurrentPageTitle()}</h1>
					<div className="w-10" />
				</div>
				<div className="p-4 md:p-6 lg:p-8">
					{children}
				</div>
			</div>
		</div>
	)
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<Suspense fallback={
			<div className="flex items-center justify-center min-h-screen bg-muted/50">
				<div className="animate-spin rounded-full h-8 w-8 border-2 border-secondary/50 border-t-emerald-600"></div>
			</div>
		}>
			<DashboardLayoutContent>{children}</DashboardLayoutContent>
		</Suspense>
	)
}
