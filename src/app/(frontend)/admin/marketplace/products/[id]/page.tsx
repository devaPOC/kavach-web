'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
	ArrowLeft,
	Loader2,
	Edit,
	Package,
	DollarSign,
	Eye,
	Star,
	Tag,
	ImageIcon,
	ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ProductImage {
	id: string;
	url: string;
	altText: string | null;
	isPrimary: boolean;
	sortOrder: number;
}

interface Product {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	shortDescription: string | null;
	price: string;
	compareAtPrice: string | null;
	currency: string;
	status: string;
	stockQuantity: number;
	lowStockThreshold: number;
	trackInventory: boolean;
	isFeatured: boolean;
	createdAt: string;
	updatedAt: string;
	images?: ProductImage[];
}

export default function ViewProductPage() {
	const params = useParams();
	const [product, setProduct] = useState<Product | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [selectedImage, setSelectedImage] = useState(0);

	useEffect(() => {
		if (params.id) {
			fetchProduct(params.id as string);
		}
	}, [params.id]);

	const fetchProduct = async (id: string) => {
		try {
			const res = await fetch(`/api/v1/admin/marketplace/products/${id}`);
			const data = await res.json();

			if (data.success !== false && data.product) {
				setProduct(data.product);
			} else {
				setError('Product not found');
			}
		} catch (err) {
			setError('Failed to load product');
		} finally {
			setLoading(false);
		}
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'active':
				return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
			case 'draft':
				return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Draft</Badge>;
			case 'archived':
				return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Archived</Badge>;
			default:
				return <Badge>{status}</Badge>;
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<Loader2 className="h-8 w-8 animate-spin text-gray-400" />
			</div>
		);
	}

	if (error || !product) {
		return (
			<div className="p-6">
				<Card className="p-8 text-center max-w-md mx-auto">
					<Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
					<h1 className="text-xl font-semibold mb-2">Product Not Found</h1>
					<p className="text-gray-500 mb-6">{error}</p>
					<Link href="/admin/marketplace/products">
						<Button variant="outline">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Products
						</Button>
					</Link>
				</Card>
			</div>
		);
	}

	const primaryImage = product.images?.find(img => img.isPrimary) || product.images?.[0];
	const hasDiscount = product.compareAtPrice && parseFloat(product.compareAtPrice) > parseFloat(product.price);
	const discountPercent = hasDiscount
		? Math.round((1 - parseFloat(product.price) / parseFloat(product.compareAtPrice!)) * 100)
		: 0;

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link href="/admin/marketplace/products">
						<Button variant="ghost" size="icon">
							<ArrowLeft className="h-5 w-5" />
						</Button>
					</Link>
					<div>
						<div className="flex items-center gap-3 flex-wrap">
							<h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
							{getStatusBadge(product.status)}
							{product.isFeatured && (
								<Badge className="bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1">
									<Star className="h-3 w-3" />
									Featured
								</Badge>
							)}
							{hasDiscount && (
								<Badge className="bg-red-100 text-red-700 border-red-200">
									{discountPercent}% OFF
								</Badge>
							)}
						</div>
						<p className="text-gray-500 mt-1">/{product.slug}</p>
					</div>
				</div>
				<div className="flex gap-2">
					<a
						href={`http://localhost:3001/en/products/${product.slug}`}
						target="_blank"
						rel="noopener noreferrer"
					>
						<Button variant="outline">
							<ExternalLink className="h-4 w-4 mr-2" />
							View in Store
						</Button>
					</a>
					<Link href={`/admin/marketplace/products/${product.id}/edit`}>
						<Button>
							<Edit className="h-4 w-4 mr-2" />
							Edit Product
						</Button>
					</Link>
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				{/* Main Content */}
				<div className="lg:col-span-2 space-y-6">
					{/* Product Images */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<ImageIcon className="h-4 w-4" />
								Product Images
							</CardTitle>
						</CardHeader>
						<CardContent>
							{product.images && product.images.length > 0 ? (
								<div className="space-y-4">
									{/* Main Image */}
									<div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative">
										<img
											src={product.images[selectedImage]?.url || primaryImage?.url}
											alt={product.images[selectedImage]?.altText || product.name}
											className="w-full h-full object-contain"
											crossOrigin="anonymous"
										/>
										{/* Badges on image */}
										<div className="absolute top-3 left-3 flex flex-col gap-2">
											{product.isFeatured && (
												<span className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-medium">
													Featured
												</span>
											)}
											{hasDiscount && (
												<span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
													-{discountPercent}%
												</span>
											)}
										</div>
									</div>

									{/* Thumbnails */}
									{product.images.length > 1 && (
										<div className="flex gap-2 overflow-x-auto pb-2">
											{product.images.map((image, index) => (
												<button
													key={image.id}
													onClick={() => setSelectedImage(index)}
													className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
														selectedImage === index
															? 'border-primary ring-2 ring-primary/20'
															: 'border-gray-200 hover:border-gray-300'
													}`}
												>
													<img
														src={image.url}
														alt={image.altText || `${product.name} ${index + 1}`}
														className="w-full h-full object-cover"
														crossOrigin="anonymous"
													/>
												</button>
											))}
										</div>
									)}
								</div>
							) : (
								<div className="aspect-video bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200">
									<div className="text-center">
										<ImageIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
										<p className="text-gray-400">No images uploaded</p>
										<Link href={`/admin/marketplace/products/${product.id}/edit`} className="mt-2 inline-block">
											<Button variant="outline" size="sm">
												Add Images
											</Button>
										</Link>
									</div>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Description */}
					<Card>
						<CardHeader>
							<CardTitle>Description</CardTitle>
						</CardHeader>
						<CardContent>
							{product.shortDescription && (
								<div className="mb-4">
									<h4 className="text-sm font-medium text-gray-500 mb-1">Short Description</h4>
									<p className="text-gray-700">{product.shortDescription}</p>
								</div>
							)}
							{product.description ? (
								<div>
									<h4 className="text-sm font-medium text-gray-500 mb-1">Full Description</h4>
									<p className="text-gray-700 whitespace-pre-wrap">{product.description}</p>
								</div>
							) : !product.shortDescription && (
								<p className="text-gray-400 italic">No description provided</p>
							)}
						</CardContent>
					</Card>

					{/* Inventory */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Package className="h-4 w-4" />
								Inventory
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid gap-4 sm:grid-cols-3">
								<div className="p-4 bg-gray-50 rounded-lg">
									<p className="text-sm text-gray-500">Track Inventory</p>
									<p className="text-lg font-semibold">{product.trackInventory ? 'Yes' : 'No'}</p>
								</div>
								<div className="p-4 bg-gray-50 rounded-lg">
									<p className="text-sm text-gray-500">Stock Quantity</p>
									<div className="flex items-center gap-2">
										<span className={`w-2 h-2 rounded-full ${
											product.stockQuantity <= product.lowStockThreshold
												? 'bg-red-500'
												: product.stockQuantity <= product.lowStockThreshold * 2
												? 'bg-yellow-500'
												: 'bg-green-500'
										}`}></span>
										<p className={`text-lg font-semibold ${product.stockQuantity <= product.lowStockThreshold ? 'text-red-600' : ''}`}>
											{product.stockQuantity}
										</p>
									</div>
								</div>
								<div className="p-4 bg-gray-50 rounded-lg">
									<p className="text-sm text-gray-500">Low Stock Alert</p>
									<p className="text-lg font-semibold">{product.lowStockThreshold}</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					{/* Pricing Card */}
					<Card className="overflow-hidden">
						<div className="bg-primary p-4">
							<CardTitle className="text-white flex items-center gap-2">
								<DollarSign className="h-4 w-4" />
								Pricing
							</CardTitle>
						</div>
						<CardContent className="p-6 space-y-4">
							<div className="text-center">
								<p className="text-sm text-gray-500 mb-1">Selling Price</p>
								<p className="text-4xl font-bold text-green-600">
									${parseFloat(product.price).toFixed(2)}
								</p>
							</div>
							{product.compareAtPrice && (
								<>
									<div className="border-t pt-4 text-center">
										<p className="text-sm text-gray-500 mb-1">Compare at Price</p>
										<p className="text-2xl text-gray-400 line-through">
											${parseFloat(product.compareAtPrice).toFixed(2)}
										</p>
									</div>
									{hasDiscount && (
										<div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
											<p className="text-red-700 font-semibold text-lg">
												{discountPercent}% OFF
											</p>
											<p className="text-red-600 text-sm">
												Customers save ${(parseFloat(product.compareAtPrice) - parseFloat(product.price)).toFixed(2)}
											</p>
										</div>
									)}
								</>
							)}
						</CardContent>
					</Card>

					{/* Product Preview Card */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">
								Customer Preview
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="rounded-lg border border-dashed border-gray-200 overflow-hidden">
								{/* Mini preview card */}
								<div className="aspect-square bg-gray-100 relative">
									{primaryImage ? (
										<img
											src={primaryImage.url}
											alt={product.name}
											className="w-full h-full object-cover"
											crossOrigin="anonymous"
										/>
									) : (
										<div className="w-full h-full flex items-center justify-center">
											<Package className="h-8 w-8 text-gray-300" />
										</div>
									)}
									{hasDiscount && (
										<span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
											-{discountPercent}%
										</span>
									)}
								</div>
								<div className="p-3 space-y-2">
									<p className="font-medium text-sm line-clamp-2">{product.name}</p>
									<div className="flex items-baseline gap-2">
										<span className="font-bold text-green-600">
											${parseFloat(product.price).toFixed(2)}
										</span>
										{product.compareAtPrice && (
											<span className="text-xs text-gray-400 line-through">
												${parseFloat(product.compareAtPrice).toFixed(2)}
											</span>
										)}
									</div>
								</div>
							</div>
							<p className="text-xs text-gray-400 text-center mt-2">
								As shown in marketplace
							</p>
						</CardContent>
					</Card>

					{/* Timestamps */}
					<Card>
						<CardHeader>
							<CardTitle>Activity</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3 text-sm">
							<div>
								<p className="text-gray-500">Created</p>
								<p className="font-medium">{formatDate(product.createdAt)}</p>
							</div>
							<div>
								<p className="text-gray-500">Last Updated</p>
								<p className="font-medium">{formatDate(product.updatedAt)}</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
