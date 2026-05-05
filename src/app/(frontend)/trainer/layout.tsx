'use client'
import React, { useState, useEffect } from 'react'
import { authApi } from '@/lib/api/client'
import { Navbar } from '@/components/custom/navigation'
import TrainerSidebar, { defaultTrainerSidebarItems } from '@/components/custom/trainer/TrainerSidebar'
import { Menu } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import Forbidden from '@/app/forbidden'

export default function TrainerLayout({
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
		const currentItem = defaultTrainerSidebarItems.find(item => {
			if (item.href === '/trainer/dashboard') {
				return pathname === '/trainer/dashboard' || pathname === '/trainer'
			}
			return pathname.startsWith(item.href)
		})
		return currentItem?.label || 'Trainer Dashboard'
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
				const result = await authApi.me()
				if (!cancelled) {
					if (result.success && result.data) {
						setUser(result.data)
						if (result.data.role !== 'trainer' && result.data.role !== 'expert') { // Experts can also be trainers sometimes? Original code had check.
							// Only show error if user IS logged in but has wrong role
							setError('Access denied. Trainer privileges required.')
						}
					} else {
						// Authentication failed - redirect to login
						router.push('/login')
					}
				}
			} catch (e: any) {
				if (!cancelled) {
					console.error('Error fetching user:', e)
					// If network error or other, maybe show error, but for auth failure usually login
					router.push('/login')
				}
			} finally {
				if (!cancelled) setLoading(false)
			}
		}
		fetchUser()
		return () => { cancelled = true }
	}, [])

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-muted/50">
				<div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/50 border-t-violet-600"></div>
			</div>
		)
	}

	if (error) {
		// Only render Forbidden if there is an explicit role error
		return <Forbidden />
	}

	// If loading finished and no user (and no error string set yet, likely redirecting), show spinner or nothing.
	// But if we have no user and no error, we redirected.
	if (!user) {
		return null; // Or spinner
	}

	return (
		<div className="min-h-screen bg-muted/50">
			{/* Unified Navbar */}
			<Navbar user={user} showProfileMenu={true} showLogo={false} />

			<TrainerSidebar
				user={user}
				sidebarOpen={sidebarOpen}
				sidebarCollapsed={sidebarCollapsed}
				isLoggingOut={isLoggingOut}
				sidebarItems={defaultTrainerSidebarItems}
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
