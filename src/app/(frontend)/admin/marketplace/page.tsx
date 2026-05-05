'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
	Package,
	ShoppingCart,
	Users,
	DollarSign,
	TrendingUp,
	ArrowRight,
	Plus,
	Eye,
	Clock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Stats {
	totalProducts: number;
	activeProducts: number;
	totalOrders: number;
	pendingOrders: number;
	totalUsers: number;
	totalRevenue: string;
}

interface Order {
	id: string;
	orderNumber: string;
	status: string;
	total: string;
	shippingName: string;
	createdAt: string;
}

export default function MarketplaceAdminPage() {
	const [stats, setStats] = useState<Stats | null>(null);
	const [recentOrders, setRecentOrders] = useState<Order[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchData();
	}, []);

	const fetchData = async () => {
		try {
			const [statsRes, ordersRes] = await Promise.all([
				fetch('/api/v1/admin/marketplace/stats'),
				fetch('/api/v1/admin/marketplace/orders?limit=5'),
			]);

			if (statsRes.ok) {
				const statsData = await statsRes.json();
				setStats(statsData.stats);
			}

			if (ordersRes.ok) {
				const ordersData = await ordersRes.json();
				setRecentOrders(ordersData.orders || []);
			}
		} catch (error) {
			console.error('Failed to fetch marketplace data:', error);
		} finally {
			setLoading(false);
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
			default: return 'bg-muted text-foreground';
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary/50" />
			</div>
		);
	}

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-foreground">Marketplace</h1>
					<p className="text-muted-foreground">Manage security products, orders, and customers</p>
				</div>
				<Link href="/admin/marketplace/products/new">
					<Button className="flex items-center gap-2">
						<Plus className="h-4 w-4" />
						Add Product
					</Button>
				</Link>
			</div>

			{/* Stats Grid */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
						<Package className="h-4 w-4 text-muted-foreground/80" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
						<p className="text-xs text-muted-foreground">{stats?.activeProducts || 0} active</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
						<ShoppingCart className="h-4 w-4 text-muted-foreground/80" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
						<p className="text-xs text-accent">{stats?.pendingOrders || 0} pending</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground/80" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
						<p className="text-xs text-muted-foreground">marketplace users</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
						<DollarSign className="h-4 w-4 text-muted-foreground/80" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">${parseFloat(stats?.totalRevenue || '0').toFixed(2)}</div>
						<p className="text-xs text-muted-foreground">from delivered orders</p>
					</CardContent>
				</Card>
			</div>

			{/* Quick Actions */}
			<div className="grid gap-4 md:grid-cols-3">
				<Link href="/admin/marketplace/products">
					<Card className="hover:shadow-md transition-shadow cursor-pointer group">
						<CardHeader className="flex flex-row items-center gap-4">
							<div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
								<Package className="h-6 w-6" />
							</div>
							<div className="flex-1">
								<CardTitle className="text-lg">Products</CardTitle>
								<CardDescription>Manage product catalog</CardDescription>
							</div>
							<ArrowRight className="h-5 w-5 text-muted-foreground/80 group-hover:text-muted-foreground" />
						</CardHeader>
					</Card>
				</Link>

				<Link href="/admin/marketplace/orders">
					<Card className="hover:shadow-md transition-shadow cursor-pointer group">
						<CardHeader className="flex flex-row items-center gap-4">
							<div className="p-3 rounded-lg bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-white transition-colors">
								<ShoppingCart className="h-6 w-6" />
							</div>
							<div className="flex-1">
								<CardTitle className="text-lg">Orders</CardTitle>
								<CardDescription>View and manage orders</CardDescription>
							</div>
							<ArrowRight className="h-5 w-5 text-muted-foreground/80 group-hover:text-muted-foreground" />
						</CardHeader>
					</Card>
				</Link>

				<Link href="/admin/marketplace/users">
					<Card className="hover:shadow-md transition-shadow cursor-pointer group">
						<CardHeader className="flex flex-row items-center gap-4">
							<div className="p-3 rounded-lg bg-primary/10 text-accent group-hover:bg-primary group-hover:text-white transition-colors">
								<Users className="h-6 w-6" />
							</div>
							<div className="flex-1">
								<CardTitle className="text-lg">Customers</CardTitle>
								<CardDescription>Manage marketplace users</CardDescription>
							</div>
							<ArrowRight className="h-5 w-5 text-muted-foreground/80 group-hover:text-muted-foreground" />
						</CardHeader>
					</Card>
				</Link>
			</div>

			{/* Recent Orders */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle>Recent Orders</CardTitle>
						<CardDescription>Latest orders from the marketplace</CardDescription>
					</div>
					<Link href="/admin/marketplace/orders">
						<Button variant="outline" size="sm">View All</Button>
					</Link>
				</CardHeader>
				<CardContent>
					{recentOrders.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">
							<ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground/80" />
							<p>No orders yet</p>
						</div>
					) : (
						<div className="space-y-4">
							{recentOrders.map((order) => (
								<div key={order.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
									<div className="flex items-center gap-4">
										<div className="p-2 rounded-lg bg-card">
											<ShoppingCart className="h-5 w-5 text-muted-foreground/80" />
										</div>
										<div>
											<p className="font-medium">{order.orderNumber}</p>
											<p className="text-sm text-muted-foreground">{order.shippingName || 'N/A'}</p>
										</div>
									</div>
									<div className="flex items-center gap-4">
										<Badge className={getStatusColor(order.status)}>
											{order.status}
										</Badge>
										<span className="font-semibold">${parseFloat(order.total).toFixed(2)}</span>
										<Link href={`/admin/marketplace/orders/${order.id}`}>
											<Button variant="ghost" size="sm">
												<Eye className="h-4 w-4" />
											</Button>
										</Link>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
