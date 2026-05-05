'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, Search, MoreHorizontal, UserCog } from 'lucide-react'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Admin {
	id: string
	email: string
	firstName: string
	lastName: string
	role: string
	isActive: boolean
	lastLoginAt: string | null
	createdAt: string
}

export default function AdminsListPage() {
	const [admins, setAdmins] = useState<Admin[]>([])
	const [loading, setLoading] = useState(true)
	const [search, setSearch] = useState('')
	const [page, setPage] = useState(1)
	const [totalPages, setTotalPages] = useState(1)
	const [total, setTotal] = useState(0)
	const [showCreateDialog, setShowCreateDialog] = useState(false)

	useEffect(() => {
		fetchAdmins()
	}, [page, search])

	const fetchAdmins = async () => {
		try {
			setLoading(true)
			const params = new URLSearchParams({
				page: page.toString(),
				limit: '10',
				...(search && { search }),
			})

			const response = await fetch(`/api/v1/super-admin/admins?${params}`)
			const data = await response.json()

			setAdmins(data.admins || [])
			setTotalPages(data.totalPages || 1)
			setTotal(data.total || 0)
		} catch (error) {
			console.error('Error fetching admins:', error)
		} finally {
			setLoading(false)
		}
	}

	const handleDelete = async (adminId: string) => {
		if (!confirm('Are you sure you want to delete this admin?')) return

		const response = await fetch(`/api/v1/super-admin/admins/${adminId}`, {
			method: 'DELETE',
		})
		const data = await response.json()
		if (data.success) fetchAdmins()
	}

	const handleToggleActive = async (adminId: string, currentStatus: boolean) => {
		await fetch(`/api/v1/super-admin/admins/${adminId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ isActive: !currentStatus }),
		})
		fetchAdmins()
	}

	const handleResetPassword = async (adminId: string) => {
		if (!confirm('Are you sure you want to reset the password for this admin? They will receive an email with new credentials.')) return

		const response = await fetch(`/api/v1/super-admin/admins/${adminId}/reset-password`, {
			method: 'POST',
		})
		const data = await response.json()
		if (data.success) {
			alert('Password reset successfully. Credentials sent via email.')
		} else {
			alert(data.message || 'Failed to reset password')
		}
	}

	return (
		<div className="p-4 lg:p-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Management</h1>
				<p className="text-gray-600">
					Manage system administrators ({total} total)
				</p>
			</div>

			<Card>
				<CardHeader>
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div>
							<CardTitle className="flex items-center gap-2">
								<UserCog className="h-5 w-5" />
								Administrators
							</CardTitle>
							<CardDescription>Create and manage admin accounts</CardDescription>
						</div>
						<Button onClick={() => setShowCreateDialog(true)}>
							<Plus className="h-4 w-4 mr-2" />
							Create Admin
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{/* Search */}
					<div className="mb-4">
						<div className="relative max-w-sm">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
							<Input
								placeholder="Search by name or email..."
								value={search}
								onChange={(e) => { setSearch(e.target.value); setPage(1); }}
								className="pl-10"
							/>
						</div>
					</div>

					{/* Table */}
					{loading ? (
						<div className="flex items-center justify-center py-12">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
						</div>
					) : admins.length === 0 ? (
						<div className="text-center py-12 text-gray-500">
							No admins found
						</div>
					) : (
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Name</TableHead>
										<TableHead>Email</TableHead>
										<TableHead>Role</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Created</TableHead>
										<TableHead className="w-[80px]">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{admins.map((admin) => (
										<TableRow key={admin.id}>
											<TableCell className="font-medium">
												{admin.firstName} {admin.lastName}
											</TableCell>
											<TableCell className="text-gray-500">{admin.email}</TableCell>
											<TableCell>
												<Badge variant={admin.role === 'super_admin' ? 'default' : 'secondary'}>
													{admin.role}
												</Badge>
											</TableCell>
											<TableCell>
												<Badge variant={admin.isActive ? 'default' : 'destructive'}>
													{admin.isActive ? 'Active' : 'Inactive'}
												</Badge>
											</TableCell>
											<TableCell className="text-gray-500">
												{new Date(admin.createdAt).toLocaleDateString()}
											</TableCell>
											<TableCell>
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button variant="ghost" size="icon">
															<MoreHorizontal className="h-4 w-4" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuItem
															onClick={() => handleToggleActive(admin.id, admin.isActive)}
														>
															{admin.isActive ? 'Deactivate' : 'Activate'}
														</DropdownMenuItem>
														<DropdownMenuItem
															className="text-red-600"
															onClick={() => handleDelete(admin.id)}
														>
															Delete
														</DropdownMenuItem>
														<DropdownMenuItem
															onClick={() => handleResetPassword(admin.id)}
														>
															Reset Password
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
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

			{/* Create Admin Dialog */}
			<CreateAdminDialog
				open={showCreateDialog}
				onClose={() => setShowCreateDialog(false)}
				onSuccess={() => { setShowCreateDialog(false); fetchAdmins(); }}
			/>
		</div>
	)
}

function CreateAdminDialog({
	open,
	onClose,
	onSuccess
}: {
	open: boolean
	onClose: () => void
	onSuccess: () => void
}) {
	const [formData, setFormData] = useState({
		email: '',
		firstName: '',
		lastName: '',
	})
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')
		setLoading(true)

		try {
			const response = await fetch('/api/v1/super-admin/admins', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData),
			})

			const data = await response.json()

			if (data.success) {
				setFormData({ email: '', firstName: '', lastName: '' })
				onSuccess()
			} else {
				setError(data.message || 'Failed to create admin')
			}
		} catch (err) {
			setError('Network error')
		} finally {
			setLoading(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create New Admin</DialogTitle>
					<DialogDescription>
						Add a new administrator to the system
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="space-y-4 py-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="firstName">First Name</Label>
								<Input
									id="firstName"
									required
									value={formData.firstName}
									onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="lastName">Last Name</Label>
								<Input
									id="lastName"
									required
									value={formData.lastName}
									onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								required
								value={formData.email}
								onChange={(e) => setFormData({ ...formData, email: e.target.value })}
							/>
						</div>
						{error && (
							<div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
								{error}
							</div>
						)}
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={loading}>
							{loading ? 'Creating...' : 'Create Admin'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
