'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
	ShoppingCart,
	Search,
	Eye,
	ArrowLeft,
	Loader2,
	Package,
	Truck,
	CheckCircle,
	Clock,
	XCircle,
	Trash2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

interface Order {
	id: string;
	orderNumber: string;
	status: string;
	subtotal: string;
	shippingCost: string;
	tax: string;
	total: string;
	currency: string;
	shippingName: string | null;
	shippingCity: string | null;
	itemCount: number;
	createdAt: string;
}

const STATUS_OPTIONS = [
	{ value: 'all', label: 'All Orders' },
	{ value: 'pending', label: 'Pending' },
	{ value: 'confirmed', label: 'Confirmed' },
	{ value: 'processing', label: 'Processing' },
	{ value: 'shipped', label: 'Shipped' },
	{ value: 'delivered', label: 'Delivered' },
	{ value: 'cancelled', label: 'Cancelled' },
];

export default function OrdersListPage() {
	const [orders, setOrders] = useState<Order[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [deleteError, setDeleteError] = useState('');

	useEffect(() => {
		fetchOrders();
	}, [statusFilter]);

	const fetchOrders = async (searchTerm = search) => {
		setLoading(true);
		try {
			const params = new URLSearchParams({
				page: pagination.page.toString(),
				limit: pagination.limit.toString(),
			});
			if (searchTerm) params.set('search', searchTerm);
			if (statusFilter !== 'all') params.set('status', statusFilter);

			const res = await fetch(`/api/v1/admin/marketplace/orders?${params}`);
			const data = await res.json();

			if (data.success !== false) {
				setOrders(data.orders || []);
				setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
			}
		} catch (error) {
			console.error('Failed to fetch orders:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		fetchOrders(search);
	};

	const handleDelete = async (orderId: string, orderNumber: string) => {
		if (!confirm(`Are you sure you want to delete order ${orderNumber}? This action cannot be undone.`)) {
			return;
		}

		setDeletingId(orderId);
		setDeleteError('');

		try {
			const res = await fetch(`/api/v1/admin/marketplace/orders/${orderId}`, {
				method: 'DELETE',
			});
			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Failed to delete order');
			}

			setOrders(orders.filter(o => o.id !== orderId));
		} catch (error) {
			setDeleteError(error instanceof Error ? error.message : 'Failed to delete order');
		} finally {
			setDeletingId(null);
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case 'pending': return <Clock className="h-4 w-4" />;
			case 'confirmed': return <CheckCircle className="h-4 w-4" />;
			case 'processing': return <Package className="h-4 w-4" />;
			case 'shipped': return <Truck className="h-4 w-4" />;
			case 'delivered': return <CheckCircle className="h-4 w-4" />;
			case 'cancelled': return <XCircle className="h-4 w-4" />;
			default: return <Clock className="h-4 w-4" />;
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'pending': return 'bg-accent/10 text-accent';
			case 'confirmed': return 'bg-primary/10 text-primary';
			case 'processing': return 'bg-primary/10 text-primary';
			case 'shipped': return 'bg-primary/10 text-primary';
			case 'delivered': return 'bg-secondary/10 text-secondary';
			case 'cancelled': return 'bg-destructive/10 text-destructive';
			case 'refunded': return 'bg-muted text-foreground';
			default: return 'bg-muted text-foreground';
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
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
					<h1 className="text-2xl font-bold text-foreground">Orders</h1>
					<p className="text-muted-foreground">Manage marketplace orders</p>
				</div>
			</div>

			{/* Filters */}
			<Card>
				<CardContent className="p-4">
					<div className="flex flex-col sm:flex-row gap-4">
						<form onSubmit={handleSearch} className="flex-1">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80" />
								<Input
									placeholder="Search by order number or customer..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="pl-10"
								/>
							</div>
						</form>
						<Select value={statusFilter} onValueChange={setStatusFilter}>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder="Filter by status" />
							</SelectTrigger>
							<SelectContent>
								{STATUS_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			{/* Orders Table */}
			<Card>
				<CardContent className="p-0">
					{loading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="h-8 w-8 animate-spin text-muted-foreground/80" />
						</div>
					) : orders.length === 0 ? (
						<div className="text-center py-12">
							<ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground/80" />
							<p className="text-muted-foreground">No orders found</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="bg-muted/50 border-b">
									<tr>
										<th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Order</th>
										<th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Customer</th>
										<th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
										<th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Items</th>
										<th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Total</th>
										<th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Date</th>
										<th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-200">
									{orders.map((order) => (
										<tr key={order.id} className="hover:bg-muted/50">
											<td className="px-6 py-4">
												<span className="font-mono font-medium text-primary">
													{order.orderNumber}
												</span>
											</td>
											<td className="px-6 py-4">
												<div>
													<p className="font-medium text-foreground">{order.shippingName || 'N/A'}</p>
													<p className="text-sm text-muted-foreground">{order.shippingCity || ''}</p>
												</div>
											</td>
											<td className="px-6 py-4">
												<Badge className={`${getStatusColor(order.status)} flex items-center gap-1 w-fit`}>
													{getStatusIcon(order.status)}
													{order.status}
												</Badge>
											</td>
											<td className="px-6 py-4">
												<span className="text-muted-foreground">{order.itemCount} items</span>
											</td>
											<td className="px-6 py-4">
												<span className="font-semibold">${parseFloat(order.total).toFixed(2)}</span>
											</td>
											<td className="px-6 py-4 text-sm text-muted-foreground">
												{formatDate(order.createdAt)}
											</td>
											<td className="px-6 py-4 text-right">
												<div className="flex items-center justify-end gap-2">
													<Link href={`/admin/marketplace/orders/${order.id}`}>
														<Button variant="ghost" size="sm">
															<Eye className="h-4 w-4 mr-1" />
															View
														</Button>
													</Link>
													<Button
														variant="ghost"
														size="sm"
														className="text-destructive hover:text-destructive hover:bg-destructive/10"
														onClick={() => handleDelete(order.id, order.orderNumber)}
														disabled={deletingId === order.id}
													>
														{deletingId === order.id ? (
															<Loader2 className="h-4 w-4 animate-spin" />
														) : (
															<Trash2 className="h-4 w-4" />
														)}
													</Button>
												</div>
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
					Showing {orders.length} of {pagination.total} orders
				</div>
			)}
		</div>
	);
}
