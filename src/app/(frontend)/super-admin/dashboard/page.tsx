'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCog, Activity, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
	totalUsers: number
	totalCustomers: number
	totalExperts: number
	totalTrainers: number
	approvedUsers: number
	totalAdmins: number
}

export default function SuperAdminDashboardPage() {
	const [stats, setStats] = useState<DashboardStats | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const fetchStats = async () => {
			try {
				const response = await fetch('/api/v1/super-admin/stats')
				const data = await response.json()

				if (data.success && data.stats) {
					setStats({
						totalUsers: data.stats.totalUsers || 0,
						totalCustomers: data.stats.totalCustomers || 0,
						totalExperts: data.stats.totalExperts || 0,
						totalTrainers: data.stats.totalTrainers || 0,
						approvedUsers: data.stats.approvedUsers || 0,
						totalAdmins: data.stats.totalAdmins || 0,
					})
				}
			} catch (error) {
				console.error('Error fetching stats:', error)
			} finally {
				setLoading(false)
			}
		}

		fetchStats()
	}, [])

	const statCards = [
		{ title: 'Total Admins', value: stats?.totalAdmins || 0, icon: UserCog, color: 'violet', href: '/super-admin/admins' },
		{ title: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'blue', href: '/super-admin/users' },
		{ title: 'Customers', value: stats?.totalCustomers || 0, icon: Users, color: 'green', href: '/super-admin/users?role=customer' },
		{ title: 'Experts', value: stats?.totalExperts || 0, icon: Activity, color: 'amber', href: '/super-admin/users?role=expert' },
	]

	return (
		<div className="p-4 lg:p-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
				<p className="text-gray-600">
					Monitor and manage your platform
				</p>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
				{statCards.map((stat) => {
					const Icon = stat.icon
					const colorClasses: Record<string, { bg: string; icon: string; text: string }> = {
						violet: { bg: 'bg-violet-50', icon: 'text-violet-600', text: 'text-violet-700' },
						blue: { bg: 'bg-blue-50', icon: 'text-blue-600', text: 'text-blue-700' },
						green: { bg: 'bg-green-50', icon: 'text-green-600', text: 'text-green-700' },
						amber: { bg: 'bg-amber-50', icon: 'text-amber-600', text: 'text-amber-700' },
					}
					const colors = colorClasses[stat.color]

					return (
						<Link key={stat.title} href={stat.href}>
							<Card className="hover:shadow-md transition-shadow cursor-pointer">
								<CardContent className="p-6">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm font-medium text-gray-500">{stat.title}</p>
											<p className={`text-3xl font-bold ${colors.text}`}>
												{loading ? '—' : stat.value}
											</p>
										</div>
										<div className={`p-3 rounded-full ${colors.bg}`}>
											<Icon className={`h-6 w-6 ${colors.icon}`} />
										</div>
									</div>
								</CardContent>
							</Card>
						</Link>
					)
				})}
			</div>

			{/* Quick Actions */}
			<Card>
				<CardHeader>
					<CardTitle>Quick Actions</CardTitle>
					<CardDescription>Common administrative tasks</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap gap-3">
						<Link
							href="/super-admin/admins"
							className="inline-flex items-center px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium text-sm"
						>
							<UserCog className="h-4 w-4 mr-2" />
							Manage Admins
						</Link>
						<Link
							href="/super-admin/users"
							className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
						>
							<Users className="h-4 w-4 mr-2" />
							View All Users
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
