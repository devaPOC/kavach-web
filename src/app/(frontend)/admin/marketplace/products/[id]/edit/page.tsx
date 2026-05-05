'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Package, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProductFormWizard } from '@/components/custom/marketplace/ProductFormWizard';

interface ProductImage {
	id: string;
	url: string;
	altText: string | null;
	isPrimary: boolean;
	sortOrder: number;
}

interface FormData {
	name: string;
	slug: string;
	description: string;
	shortDescription: string;
	price: string;
	compareAtPrice: string;
	status: 'draft' | 'active' | 'archived';
	stockQuantity: number;
	lowStockThreshold: number;
	trackInventory: boolean;
	isFeatured: boolean;
}

export default function EditProductPage() {
	const params = useParams();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [formData, setFormData] = useState<FormData | null>(null);
	const [images, setImages] = useState<ProductImage[]>([]);

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
				const p = data.product;
				setFormData({
					name: p.name || '',
					slug: p.slug || '',
					description: p.description || '',
					shortDescription: p.shortDescription || '',
					price: p.price || '',
					compareAtPrice: p.compareAtPrice || '',
					status: (p.status as 'draft' | 'active' | 'archived') || 'draft',
					stockQuantity: p.stockQuantity || 0,
					lowStockThreshold: p.lowStockThreshold || 5,
					trackInventory: p.trackInventory ?? true,
					isFeatured: p.isFeatured ?? false,
				});
				setImages(p.images || []);
			} else {
				setError('Product not found');
			}
		} catch (err) {
			setError('Failed to load product');
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<Loader2 className="h-8 w-8 animate-spin text-gray-400" />
			</div>
		);
	}

	if (error || !formData) {
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

	return (
		<ProductFormWizard
			mode="edit"
			productId={params.id as string}
			initialData={formData}
			initialImages={images}
		/>
	);
}
