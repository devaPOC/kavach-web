'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
	Users,
	Search,
	ArrowLeft,
	Loader2,
	Mail,
	CheckCircle,
	XCircle,
	MoreHorizontal,
	Trash2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MarketUser {
	id: string;
	email: string;
	isActive: boolean;
	lastLoginAt: string | null;
	createdAt: string;
}

export default function UsersListPage() {
	const [users, setUsers] = useState<MarketUser[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState('');
	const [updating, setUpdating] = useState<string | null>(null);
	const [deleting, setDeleting] = useState<string | null>(null);
	const [deleteError, setDeleteError] = useState('');
	const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

	useEffect(() => {
		fetchUsers();
	}, []);

	const fetchUsers = async (searchTerm = search) => {
		setLoading(true);
		try {
			const params = new URLSearchParams({
				page: pagination.page.toString(),
				limit: pagination.limit.toString(),
			});
			if (searchTerm) params.set('search', searchTerm);

			const res = await fetch(`/api/v1/admin/marketplace/users?${params}`);
			const data = await res.json();

			if (data.success !== false) {
				setUsers(data.users || []);
				setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
			}
		} catch (error) {
			console.error('Failed to fetch users:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		fetchUsers(search);
	};

	const toggleUserStatus = async (userId: string, isActive: boolean) => {
		setUpdating(userId);
		try {
			const res = await fetch(`/api/v1/admin/marketplace/users/${userId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isActive }),
			});

			if (res.ok) {
				fetchUsers();
			}
		} catch (error) {
			console.error('Failed to update user:', error);
		} finally {
			setUpdating(null);
		}
	};

	const handleDelete = async (userId: string, email: string) => {
		if (!confirm(`Are you sure you want to delete ${email}? This action cannot be undone.`)) {
			return;
		}

		setDeleting(userId);
		setDeleteError('');

		try {
			const res = await fetch(`/api/v1/admin/marketplace/users/${userId}`, {
				method: 'DELETE',
			});
			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Failed to delete user');
			}

			setUsers(users.filter(u => u.id !== userId));
		} catch (error) {
			setDeleteError(error instanceof Error ? error.message : 'Failed to delete user');
			alert(error instanceof Error ? error.message : 'Failed to delete user');
		} finally {
			setDeleting(null);
		}
	};

	const formatDate = (dateString: string | null) => {
		if (!dateString) return 'Never';
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	};

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Link href="/admin/marketplace">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-5 w-5" />
					</Button>
				</Link>
				<div>
					<h1 className="text-2xl font-bold text-foreground">Customers</h1>
					<p className="text-muted-foreground">Manage marketplace users</p>
				</div>
			</div>

			{/* Search */}
			<Card>
				<CardContent className="p-4">
					<form onSubmit={handleSearch}>
						<div className="relative max-w-md">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80" />
							<Input
								placeholder="Search by email..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="pl-10"
							/>
						</div>
					</form>
				</CardContent>
			</Card>

			{/* Users Table */}
			<Card>
				<CardContent className="p-0">
					{loading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="h-8 w-8 animate-spin text-muted-foreground/80" />
						</div>
					) : users.length === 0 ? (
						<div className="text-center py-12">
							<Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/80" />
							<p className="text-muted-foreground">No users found</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="bg-muted/50 border-b">
									<tr>
										<th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">User</th>
										<th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
										<th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Last Login</th>
										<th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Joined</th>
										<th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-200">
									{users.map((user) => (
										<tr key={user.id} className="hover:bg-muted/50">
											<td className="px-6 py-4">
												<div className="flex items-center gap-3">
													<div className="p-2 bg-muted rounded-full">
														<Mail className="h-4 w-4 text-muted-foreground/80" />
													</div>
													<span className="font-medium text-foreground">{user.email}</span>
												</div>
											</td>
											<td className="px-6 py-4">
												<Badge className={user.isActive ? 'bg-secondary/10 text-secondary' : 'bg-destructive/10 text-destructive'}>
													{user.isActive ? (
														<><CheckCircle className="h-3 w-3 mr-1" /> Active</>
													) : (
														<><XCircle className="h-3 w-3 mr-1" /> Inactive</>
													)}
												</Badge>
											</td>
											<td className="px-6 py-4 text-sm text-muted-foreground">
												{formatDate(user.lastLoginAt)}
											</td>
											<td className="px-6 py-4 text-sm text-muted-foreground">
												{formatDate(user.createdAt)}
											</td>
											<td className="px-6 py-4 text-right">
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button variant="ghost" size="icon" disabled={updating === user.id}>
															{updating === user.id ? (
																<Loader2 className="h-4 w-4 animate-spin" />
															) : (
																<MoreHorizontal className="h-4 w-4" />
															)}
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														{user.isActive ? (
															<DropdownMenuItem
																onClick={() => toggleUserStatus(user.id, false)}
																className="text-accent"
															>
																<XCircle className="h-4 w-4 mr-2" />
																Deactivate
															</DropdownMenuItem>
														) : (
															<DropdownMenuItem
																onClick={() => toggleUserStatus(user.id, true)}
																className="text-secondary"
															>
																<CheckCircle className="h-4 w-4 mr-2" />
																Activate
															</DropdownMenuItem>
														)}
														<DropdownMenuItem
															onClick={() => handleDelete(user.id, user.email)}
															className="text-destructive"
															disabled={deleting === user.id}
														>
															{deleting === user.id ? (
																<Loader2 className="h-4 w-4 mr-2 animate-spin" />
															) : (
																<Trash2 className="h-4 w-4 mr-2" />
															)}
															Delete
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Pagination Info */}
			{pagination.total > 0 && (
				<div className="text-center text-sm text-muted-foreground">
					Showing {users.length} of {pagination.total} customers
				</div>
			)}
		</div>
	);
}
