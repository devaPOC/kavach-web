'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
	Package,
	Plus,
	Search,
	Edit,
	Trash2,
	Eye,
	ArrowLeft,
	Loader2,
	MoreHorizontal
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';

interface Product {
	id: string;
	name: string;
	slug: string;
	price: string;
	compareAtPrice: string | null;
	status: string;
	stockQuantity: number;
	isFeatured: boolean;
	createdAt: string;
}

export default function ProductsListPage() {
	const [products, setProducts] = useState<Product[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

	useEffect(() => {
		fetchProducts();
	}, [statusFilter]);

	const fetchProducts = async (searchTerm = search) => {
		setLoading(true);
		try {
			const params = new URLSearchParams({
				page: pagination.page.toString(),
				limit: pagination.limit.toString(),
			});
			if (searchTerm) params.set('search', searchTerm);
			if (statusFilter !== 'all') params.set('status', statusFilter);

			const res = await fetch(`/api/v1/admin/marketplace/products?${params}`);
			const data = await res.json();

			if (data.success !== false) {
				setProducts(data.products || []);
				setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
			}
		} catch (error) {
			console.error('Failed to fetch products:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		fetchProducts(search);
	};

	const handleDelete = async () => {
		if (!deleteProduct) return;
		setDeleting(true);

		try {
			const res = await fetch(`/api/v1/admin/marketplace/products/${deleteProduct.id}`, {
				method: 'DELETE',
			});

			if (res.ok) {
				fetchProducts();
				setDeleteProduct(null);
			}
		} catch (error) {
			console.error('Failed to delete product:', error);
		} finally {
			setDeleting(false);
		}
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'active':
				return <Badge className="bg-green-100 text-green-800">Active</Badge>;
			case 'draft':
				return <Badge className="bg-yellow-100 text-yellow-800">Draft</Badge>;
			case 'archived':
				return <Badge className="bg-gray-100 text-gray-800">Archived</Badge>;
			default:
				return <Badge>{status}</Badge>;
		}
	};

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link href="/admin/marketplace">
						<Button variant="ghost" size="icon">
							<ArrowLeft className="h-5 w-5" />
						</Button>
					</Link>
					<div>
						<h1 className="text-2xl font-bold text-gray-900">Products</h1>
						<p className="text-gray-500">Manage your product catalog</p>
					</div>
				</div>
				<Link href="/admin/marketplace/products/new">
					<Button className="flex items-center gap-2">
						<Plus className="h-4 w-4" />
						Add Product
					</Button>
				</Link>
			</div>

			{/* Filters */}
			<Card>
				<CardContent className="p-4">
					<div className="flex flex-col sm:flex-row gap-4">
						<form onSubmit={handleSearch} className="flex-1">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
								<Input
									placeholder="Search products..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="pl-10"
								/>
							</div>
						</form>
						<Select value={statusFilter} onValueChange={setStatusFilter}>
							<SelectTrigger className="w-[150px]">
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Status</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="draft">Draft</SelectItem>
								<SelectItem value="archived">Archived</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			{/* Products Table */}
			<Card>
				<CardContent className="p-0">
					{loading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="h-8 w-8 animate-spin text-gray-400" />
						</div>
					) : products.length === 0 ? (
						<div className="text-center py-12">
							<Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
							<p className="text-gray-500">No products found</p>
							<Link href="/admin/marketplace/products/new" className="mt-4 inline-block">
								<Button>Add your first product</Button>
							</Link>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="bg-gray-50 border-b">
									<tr>
										<th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
										<th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
										<th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Price</th>
										<th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Stock</th>
										<th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-200">
									{products.map((product) => (
										<tr key={product.id} className="hover:bg-gray-50">
											<td className="px-6 py-4">
												<div className="flex items-center gap-3">
													<div className="p-2 bg-gray-100 rounded-lg">
														<Package className="h-5 w-5 text-gray-400" />
													</div>
													<div>
														<p className="font-medium text-gray-900">{product.name}</p>
														<p className="text-sm text-gray-500">{product.slug}</p>
													</div>
													{product.isFeatured && (
														<Badge className="bg-purple-100 text-purple-800 text-xs">Featured</Badge>
													)}
												</div>
											</td>
											<td className="px-6 py-4">{getStatusBadge(product.status)}</td>
											<td className="px-6 py-4">
												<div>
													<span className="font-medium">${parseFloat(product.price).toFixed(2)}</span>
													{product.compareAtPrice && (
														<span className="ml-2 text-sm text-gray-400 line-through">
															${parseFloat(product.compareAtPrice).toFixed(2)}
														</span>
													)}
												</div>
											</td>
											<td className="px-6 py-4">
												<span className={product.stockQuantity <= 5 ? 'text-red-600 font-medium' : ''}>
													{product.stockQuantity}
												</span>
											</td>
											<td className="px-6 py-4 text-right">
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button variant="ghost" size="icon">
															<MoreHorizontal className="h-4 w-4" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuItem asChild>
															<Link href={`/admin/marketplace/products/${product.id}`} className="flex items-center gap-2">
																<Eye className="h-4 w-4" />
																View
															</Link>
														</DropdownMenuItem>
														<DropdownMenuItem asChild>
															<Link href={`/admin/marketplace/products/${product.id}/edit`} className="flex items-center gap-2">
																<Edit className="h-4 w-4" />
																Edit
															</Link>
														</DropdownMenuItem>
														<DropdownMenuItem
															onClick={() => setDeleteProduct(product)}
															className="text-red-600 flex items-center gap-2"
														>
															<Trash2 className="h-4 w-4" />
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

			{/* Delete Dialog */}
			<Dialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Product</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete &quot;{deleteProduct?.name}&quot;? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteProduct(null)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleDelete} disabled={deleting}>
							{deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
