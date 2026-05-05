'use client'
import React from 'react'
import { Activity, Calendar, FileText, Menu, X, LogOut, Users, BookOpen, BarChart3 } from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

export interface SidebarItem {
	id: string
	label: string
	icon: React.ComponentType<{ className?: string }>
	description: string
	href: string
}

interface TrainerSidebarProps {
	user: {
		firstName: string
		lastName: string
		email: string
		role: string
	}
	sidebarOpen: boolean
	sidebarCollapsed: boolean
	isLoggingOut: boolean
	sidebarItems: SidebarItem[]
	onSidebarToggle: () => void
	onSidebarCollapse: () => void
	onLogout: () => void
}

export default function TrainerSidebar({
	user,
	sidebarOpen,
	sidebarCollapsed,
	isLoggingOut,
	sidebarItems,
	onSidebarToggle,
	onSidebarCollapse,
	onLogout
}: TrainerSidebarProps) {
	const pathname = usePathname()

	const isActive = (href: string) => {
		if (href === '/trainer/dashboard') {
			return pathname === '/trainer/dashboard'
		}
		return pathname.startsWith(href)
	}

	return (
		<>
			{/* Mobile sidebar overlay */}
			{sidebarOpen && (
				<div
					className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
					onClick={onSidebarToggle}
				/>
			)}

			{/* Sidebar */}
			<div className={`
				fixed inset-y-0 left-0 z-50 bg-white transform transition-all duration-300 ease-out flex flex-col h-screen
				${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
				lg:translate-x-0
				${sidebarCollapsed ? 'w-[72px]' : 'w-64'}
				shadow-lg shadow-slate-200/50 border-r border-slate-100
			`}>
				{/* Logo and Hamburger Menu */}
				<div className={`flex items-center h-16 px-4 border-b border-slate-100 flex-shrink-0 ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
					{sidebarCollapsed ? (
						/* Collapsed state - show expand button */
						<button
							onClick={onSidebarCollapse}
							className="p-2.5 rounded-xl text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-all duration-200"
							title="Expand sidebar"
						>
							<Menu className="h-5 w-5" />
						</button>
					) : (
						/* Expanded state - show logo and collapse button */
						<>
							<div className="flex items-center gap-3">
								<div className="text-xl font-bold tracking-tight text-slate-900 uppercase">
									Kavach
								</div>
								<span className="text-base font-semibold text-slate-800 tracking-tight">Trainer</span>
							</div>
							<button
								onClick={onSidebarCollapse}
								className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all duration-200"
								title="Collapse sidebar"
							>
								<Menu className="h-4 w-4" />
							</button>
						</>
					)}
					{/* Mobile close button */}
					<button
						onClick={onSidebarToggle}
						className="lg:hidden absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all duration-200"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* User Info */}
				<div className={`px-4 py-4 border-b border-slate-100 flex-shrink-0 ${sidebarCollapsed ? 'px-3' : ''}`}>
					{!sidebarCollapsed ? (
						<div className="space-y-2">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-violet-600 rounded-xl flex items-center justify-center shadow-sm">
									<span className="text-sm font-semibold text-white">
										{user.firstName?.[0]}{user.lastName?.[0]}
									</span>
								</div>
								<div className="flex-1 min-w-0">
									<div className="text-sm font-medium text-slate-800 truncate">
										{user.firstName} {user.lastName}
									</div>
									<div className="text-xs text-slate-500 truncate">{user.email}</div>
								</div>
							</div>
							<span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-violet-50 text-violet-700 border border-violet-100">
								{user.role}
							</span>
						</div>
					) : (
						<div className="flex justify-center">
							<div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-violet-600 rounded-xl flex items-center justify-center shadow-sm" title={`${user.firstName} ${user.lastName}`}>
								<span className="text-sm font-semibold text-white">
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
							{sidebarItems.map((item) => {
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
												? 'bg-violet-50 text-violet-700 shadow-sm border border-violet-100'
												: 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
											}
											${sidebarCollapsed ? 'justify-center px-2.5' : ''}
										`}
										title={sidebarCollapsed ? item.label : ''}
									>
										<Icon className={`h-5 w-5 flex-shrink-0 transition-colors duration-200 ${sidebarCollapsed ? '' : 'mr-3'} ${active ? 'text-violet-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
										{!sidebarCollapsed && <span className="truncate">{item.label}</span>}
									</Link>
								)
							})}
						</div>
					</div>
				</nav>

				{/* Logout Section */}
				<div className="border-t border-slate-100 p-3 flex-shrink-0">
					{/* Logout Button */}
					<button
						onClick={onLogout}
						disabled={isLoggingOut}
						className={`
							w-full flex items-center px-3 py-2.5 text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 disabled:opacity-50 border border-transparent hover:border-red-100
							${sidebarCollapsed ? 'justify-center px-2.5' : ''}
						`}
						title={sidebarCollapsed ? 'Logout' : ''}
					>
						<LogOut className={`h-5 w-5 flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
						{!sidebarCollapsed && (isLoggingOut ? 'Logging out...' : 'Logout')}
					</button>
				</div>
			</div>
		</>
	)
}

// Default sidebar items for trainer dashboard
export const defaultTrainerSidebarItems: SidebarItem[] = [
	{
		id: 'overview',
		label: 'Overview',
		icon: Activity,
		description: 'Dashboard overview',
		href: '/trainer/dashboard'
	},
	{
		id: 'awareness-sessions',
		label: 'Requests',
		icon: Users,
		description: 'Manage session requests',
		href: '/trainer/awareness-sessions'
	},
	{
		id: 'schedule',
		label: 'Schedule',
		icon: Calendar,
		description: 'View schedule',
		href: '/trainer/schedule'
	},
	{
		id: 'resources',
		label: 'Resources',
		icon: BookOpen,
		description: 'Access trainer resources',
		href: '/trainer/resources'
	},
]
