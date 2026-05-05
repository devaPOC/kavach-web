'use client'

import { useState, useEffect } from 'react'
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
import { Search, RotateCcw, Trash2 } from 'lucide-react'

interface DeletedItem {
	id: string
	type: 'user'
	name: string
	email: string
	role: string
	deletedAt: string
}

export default function RecycleBinPage() {
	const [items, setItems] = useState<DeletedItem[]>([])
	const [loading, setLoading] = useState(true)
	const [search, setSearch] = useState('')
	const [page, setPage] = useState(1)
	const [totalPages, setTotalPages] = useState(1)

	useEffect(() => {
		fetchItems()
	}, [page, search])

	const fetchItems = async () => {
		try {
			setLoading(true)
			const params = new URLSearchParams({
				page: page.toString(),
				limit: '10',
				...(search && { search }),
			})

			const response = await fetch(`/api/v1/admin/recycle-bin?${params}`)
			const data = await response.json()

			if (data.success) {
				setItems(data.items || [])
				setTotalPages(data.pages || 1)
			} else {
				setItems([])
			}
		} catch (error) {
			console.error('Error fetching deleted items:', error)
		} finally {
			setLoading(false)
		}
	}

	const handleRestore = async (id: string) => {
		if (!confirm('Are you sure you want to restore this user?')) return

		try {
			const response = await fetch('/api/v1/admin/recycle-bin/restore', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id, type: 'user' }),
			})

			const data = await response.json()

			if (data.success) {
				alert('User restored successfully')
				fetchItems()
			} else {
				alert(data.message || 'Failed to restore user')
			}
		} catch (error) {
			alert('An error occurred')
		}
	}

	return (
		<div className="p-4 lg:p-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900 mb-2">Recycle Bin</h1>
				<p className="text-gray-600">
					Restore accidentally deleted users
				</p>
			</div>

			<Card>
				<CardHeader>
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div>
							<CardTitle className="flex items-center gap-2">
								<Trash2 className="h-5 w-5" />
								Deleted Users
							</CardTitle>
							<CardDescription>
								Restore deleted user accounts
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{/* Search */}
					<div className="mb-4">
						<div className="relative max-w-sm">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
							<Input
								placeholder="Search..."
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
					) : items.length === 0 ? (
						<div className="text-center py-12 text-gray-500">
							No deleted users found
						</div>
					) : (
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Name</TableHead>
										<TableHead>Email</TableHead>
										<TableHead>Role</TableHead>
										<TableHead>Deleted At</TableHead>
										<TableHead className="w-[80px]">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{items.map((item) => (
										<TableRow key={item.id}>
											<TableCell className="font-medium">
												{item.name}
											</TableCell>
											<TableCell className="text-gray-500">{item.email}</TableCell>
											<TableCell>
												<Badge variant="outline">
													{item.role}
												</Badge>
											</TableCell>
											<TableCell className="text-gray-500">
												{new Date(item.deletedAt).toLocaleDateString()} {new Date(item.deletedAt).toLocaleTimeString()}
											</TableCell>
											<TableCell>
												<Button variant="ghost" size="sm" onClick={() => handleRestore(item.id)}>
													<RotateCcw className="h-4 w-4 mr-2" />
													Restore
												</Button>
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
