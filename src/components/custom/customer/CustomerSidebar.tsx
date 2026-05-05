"use client"
import React, { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Menu, X, LogOut, FileText, Calendar, Banknote, CheckCircle } from 'lucide-react'
import { authApi } from '@/lib/api'

export interface CustomerSidebarItem {
	id: string
	label: string
	icon: React.ComponentType<{ className?: string }>
	description: string
	href: string // will include query param view=<id>
}

interface CustomerSidebarProps {
	user: {
		firstName: string
		lastName: string
		email: string
		role: string
	}
	sidebarOpen: boolean
	sidebarCollapsed: boolean
	isLoggingOut: boolean
	sidebarItems: CustomerSidebarItem[]
	onSidebarToggle: () => void
	onSidebarCollapse: () => void
	onLogout: () => void
}

// Internal component that uses useSearchParams
function CustomerSidebarInternal({
	user,
	sidebarOpen,
	sidebarCollapsed,
	isLoggingOut,
	sidebarItems,
	onSidebarToggle,
	onSidebarCollapse,
	onLogout
}: CustomerSidebarProps) {
	const searchParams = useSearchParams()
	const currentView = searchParams.get('view') || 'request_service'

	const isActive = (href: string) => {
		const url = new URL(href, 'https://example.com')
		const viewParam = url.searchParams.get('view')
		return viewParam === currentView
	}

	return (
		<>
			{/* Mobile overlay */}
			{sidebarOpen && (
				<div
					className="fixed inset-0 bg-sidebar-foreground/20 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
					onClick={onSidebarToggle}
				/>
			)}

			{/* Sidebar */}
			<div
				className={`
					fixed inset-y-0 left-0 z-50 bg-sidebar text-sidebar-foreground transform transition-all duration-300 ease-out flex flex-col h-screen
					${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
					lg:translate-x-0
					${sidebarCollapsed ? 'w-[72px]' : 'w-64'}
					shadow-lg border-r border-sidebar-border
				`}
			>
				{/* Header */}
				<div className={`flex items-center h-16 px-4 border-b border-sidebar-border flex-shrink-0 ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
					{sidebarCollapsed ? (
						<button
							onClick={onSidebarCollapse}
							className="p-2.5 rounded-xl text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200"
							title="Expand sidebar"
						>
							<Menu className="h-5 w-5" />
						</button>
					) : (
						<>
							<div className="flex items-center gap-3">
								<div className="text-xl font-bold tracking-tight text-sidebar-foreground uppercase">
									Kavach
								</div>
								<span className="text-base font-semibold text-sidebar-foreground/80 tracking-tight">Dashboard</span>
							</div>
							<button
								onClick={onSidebarCollapse}
								className="p-2 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200"
								title="Collapse sidebar"
							>
								<Menu className="h-4 w-4" />
							</button>
						</>
					)}
					<button
						onClick={onSidebarToggle}
						className="lg:hidden absolute top-4 right-4 p-2 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* User Info */}
				<div className={`px-4 py-4 border-b border-sidebar-border flex-shrink-0 ${sidebarCollapsed ? 'px-3' : ''}`}>
					{!sidebarCollapsed ? (
						<div className="space-y-2">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 bg-sidebar-primary rounded-xl flex items-center justify-center shadow-sm">
									<span className="text-sm font-semibold text-sidebar-primary-foreground">
										{user.firstName?.[0]}{user.lastName?.[0]}
									</span>
								</div>
								<div className="flex-1 min-w-0">
									<div className="text-sm font-medium text-sidebar-foreground truncate">
										{user.firstName} {user.lastName}
									</div>
									<div className="text-xs text-sidebar-foreground/70 truncate">{user.email}</div>
								</div>
							</div>
							<span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border">
								{user.role}
							</span>
						</div>
					) : (
						<div className="flex justify-center">
							<div className="w-10 h-10 bg-sidebar-primary rounded-xl flex items-center justify-center shadow-sm" title={`${user.firstName} ${user.lastName}`}>
								<span className="text-sm font-semibold text-sidebar-primary-foreground">
									{user.firstName?.[0]}{user.lastName?.[0]}
								</span>
							</div>
						</div>
					)}
				</div>

				{/* Navigation */}
				<nav className="flex-1 min-h-0 px-3 py-4">
					<div className="h-full overflow-y-auto">
						<div className="space-y-1">
							{sidebarItems.map(item => {
								const Icon = item.icon
								const active = isActive(item.href)
								return (
									<Link
										key={item.id}
										href={item.href}
										onClick={() => sidebarOpen && onSidebarToggle()}
										className={`
											w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group
											${active
												? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm border border-sidebar-border'
												: 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border border-transparent'
											}
											${sidebarCollapsed ? 'justify-center px-2.5' : ''}
										`}
										title={sidebarCollapsed ? item.label : ''}
									>
										<Icon className={`h-5 w-5 flex-shrink-0 transition-colors duration-200 ${sidebarCollapsed ? '' : 'mr-3'} ${active ? 'text-sidebar-accent-foreground' : 'text-muted-foreground/80 group-hover:text-sidebar-accent-foreground'}`} />
										{!sidebarCollapsed && <span className="truncate">{item.label}</span>}
									</Link>
								)
							})}
						</div>
					</div>
				</nav>

				{/* Logout Section */}
				<div className="border-t border-border/50 p-3 flex-shrink-0">
					<button
						onClick={onLogout}
						disabled={isLoggingOut}
						className={`
							w-full flex items-center px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-sidebar-accent-foreground hover:bg-destructive/10 rounded-xl transition-all duration-200 disabled:opacity-50 border border-transparent hover:border-destructive/20
							${sidebarCollapsed ? 'justify-center px-2.5' : ''}
						`}
						title={sidebarCollapsed ? 'Logout' : ''}
					>
						<LogOut className={`h-5 w-5 flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
						{!sidebarCollapsed && <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>}
					</button>
				</div>
			</div>
		</>
	)
}

// Wrapper component with Suspense boundary
export default function CustomerSidebar(props: CustomerSidebarProps) {
	return (
		<Suspense fallback={
			<div className="fixed inset-y-0 left-0 z-50 bg-card shadow-lg w-64 lg:w-[72px] flex items-center justify-center border-r border-border/50">
				<div className="animate-spin rounded-full h-8 w-8 border-2 border-secondary/50 border-t-emerald-600"></div>
			</div>
		}>
			<CustomerSidebarInternal {...props} />
		</Suspense>
	)
}

export const defaultCustomerSidebarItems: CustomerSidebarItem[] = [
	{
		id: 'request_service',
		label: 'Request new service',
		icon: Banknote,
		description: 'Browse and request services',
		href: '/dashboard'
	},
	{
		id: 'service_request',
		label: 'My Requests',
		icon: FileText,
		description: 'Manage your service requests',
		href: '/dashboard/requests'
	},
	{
		id: 'awareness_sessions',
		label: 'Awareness Sessions',
		icon: Calendar,
		description: 'Manage awareness sessions',
		href: '/dashboard/awareness-sessions'
	},
	{
		id: 'awareness_lab',
		label: 'Awareness Lab',
		icon: CheckCircle,
		description: 'Access learning materials & quizzes',
		href: '/dashboard/awareness-lab'
	}
]
