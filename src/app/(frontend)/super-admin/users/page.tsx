'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Search, Users, Check, X } from 'lucide-react'

interface User {
	id: string
	email: string
	firstName: string
	lastName: string
	role: string
	isApproved: boolean
	isEmailVerified: boolean
	isBanned: boolean
	isPaused: boolean
	createdAt: string
}

export default function UsersListPage() {
	const [users, setUsers] = useState<User[]>([])
	const [loading, setLoading] = useState(true)
	const [search, setSearch] = useState('')
	const [roleFilter, setRoleFilter] = useState('all')
	const [page, setPage] = useState(1)
	const [totalPages, setTotalPages] = useState(1)
	const [total, setTotal] = useState(0)

	useEffect(() => {
		fetchUsers()
	}, [page, search, roleFilter])

	const fetchUsers = async () => {
		try {
			setLoading(true)
			const params = new URLSearchParams({
				page: page.toString(),
				limit: '15',
				...(search && { search }),
				...(roleFilter !== 'all' && { role: roleFilter }),
			})

			const response = await fetch(`/api/v1/super-admin/users?${params}`)
			const data = await response.json()

			setUsers(data.users || [])
			setTotalPages(data.totalPages || 1)
			setTotal(data.total || 0)
		} catch (error) {
			console.error('Error fetching users:', error)
		} finally {
			setLoading(false)
		}
	}

	const getRoleBadgeVariant = (role: string): 'default' | 'secondary' | 'outline' => {
		switch (role) {
			case 'expert': return 'default'
			case 'customer': return 'secondary'
			case 'trainer': return 'outline'
			default: return 'secondary'
		}
	}

	const getStatusBadge = (user: User) => {
		if (user.isBanned) return <Badge variant="destructive">Banned</Badge>
		if (user.isPaused) return <Badge variant="outline" className="text-amber-600 border-amber-600">Paused</Badge>
		return <Badge variant="default" className="bg-green-600">Active</Badge>
	}

	return (
		<div className="p-4 lg:p-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900 mb-2">User Monitoring</h1>
				<p className="text-gray-600">
					Monitor and track all platform users ({total} total)
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Users className="h-5 w-5" />
						All Users
					</CardTitle>
					<CardDescription>View and filter users by role and status</CardDescription>
				</CardHeader>
				<CardContent>
					{/* Filters */}
					<div className="flex flex-col sm:flex-row gap-4 mb-4">
						<div className="relative flex-1 max-w-sm">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
							<Input
								placeholder="Search by name or email..."
								value={search}
								onChange={(e) => { setSearch(e.target.value); setPage(1); }}
								className="pl-10"
							/>
						</div>
						<Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder="Filter by role" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Roles</SelectItem>
								<SelectItem value="customer">Customers</SelectItem>
								<SelectItem value="expert">Experts</SelectItem>
								<SelectItem value="trainer">Trainers</SelectItem>
								<SelectItem value="admin">Admins</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Table */}
					{loading ? (
						<div className="flex items-center justify-center py-12">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
						</div>
					) : users.length === 0 ? (
						<div className="text-center py-12 text-gray-500">
							No users found
						</div>
					) : (
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Name</TableHead>
										<TableHead>Email</TableHead>
										<TableHead>Role</TableHead>
										<TableHead>Email Verified</TableHead>
										<TableHead>Approved</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Created</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{users.map((user) => (
										<TableRow key={user.id}>
											<TableCell className="font-medium">
												{user.firstName} {user.lastName}
											</TableCell>
											<TableCell className="text-gray-500">{user.email}</TableCell>
											<TableCell>
												<Badge variant={getRoleBadgeVariant(user.role)}>
													{user.role}
												</Badge>
											</TableCell>
											<TableCell>
												{user.isEmailVerified ? (
													<Check className="h-4 w-4 text-green-600" />
												) : (
													<X className="h-4 w-4 text-red-600" />
												)}
											</TableCell>
											<TableCell>
												{user.isApproved ? (
													<Check className="h-4 w-4 text-green-600" />
												) : (
													<X className="h-4 w-4 text-red-600" />
												)}
											</TableCell>
											<TableCell>
												{getStatusBadge(user)}
											</TableCell>
											<TableCell className="text-gray-500">
												{new Date(user.createdAt).toLocaleDateString()}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-center gap-2 mt-4">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setPage(p => Math.max(1, p - 1))}
								disabled={page === 1}
							>
								Previous
							</Button>
							<span className="text-sm text-gray-500">
								Page {page} of {totalPages}
							</span>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setPage(p => Math.min(totalPages, p + 1))}
								disabled={page === totalPages}
							>
								Next
							</Button>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
