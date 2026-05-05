'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
	ArrowLeft,
	Loader2,
	Package,
	Truck,
	CheckCircle,
	Clock,
	User,
	MapPin,
	Save
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useFormValidation } from '@/hooks/useFormValidation';

interface OrderItem {
	id: string;
	productName: string;
	productSlug: string;
	unitPrice: string;
	quantity: number;
	subtotal: string;
}

interface Customer {
	id: string;
	email: string;
	isActive: boolean;
	createdAt: string;
}

interface Order {
	id: string;
	orderNumber: string;
	status: string;
	subtotal: string;
	shippingCost: string;
	tax: string;
	discount: string;
	total: string;
	currency: string;
	shippingName: string | null;
	shippingAddress1: string | null;
	shippingAddress2: string | null;
	shippingCity: string | null;
	shippingState: string | null;
	shippingPostalCode: string | null;
	shippingCountry: string | null;
	shippingPhone: string | null;
	trackingNumber: string | null;
	trackingUrl: string | null;
	customerNotes: string | null;
	adminNotes: string | null;
	itemCount: number;
	createdAt: string;
	shippedAt: string | null;
	deliveredAt: string | null;
	items: OrderItem[];
	customer: Customer | null;
}

const STATUS_OPTIONS = [
	{ value: 'pending', label: 'Pending', color: 'bg-accent/10 text-accent' },
	{ value: 'confirmed', label: 'Confirmed', color: 'bg-primary/10 text-primary' },
	{ value: 'processing', label: 'Processing', color: 'bg-primary/10 text-primary' },
	{ value: 'shipped', label: 'Shipped', color: 'bg-primary/10 text-primary' },
	{ value: 'delivered', label: 'Delivered', color: 'bg-secondary/10 text-secondary' },
	{ value: 'cancelled', label: 'Cancelled', color: 'bg-destructive/10 text-destructive' },
	{ value: 'refunded', label: 'Refunded', color: 'bg-muted text-foreground' },
];

export default function OrderDetailPage() {
	const params = useParams();
	const router = useRouter();
	const [order, setOrder] = useState<Order | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const { fieldErrors, validateField, validateAllFields, getInputClassName } = useFormValidation();

	const [formData, setFormData] = useState({
		status: '',
		trackingNumber: '',
		trackingUrl: '',
		adminNotes: '',
	});

	useEffect(() => {
		if (params.id) {
			fetchOrder(params.id as string);
		}
	}, [params.id]);

	const fetchOrder = async (id: string) => {
		try {
			const res = await fetch(`/api/v1/admin/marketplace/orders/${id}`);
			const data = await res.json();

			if (data.success !== false && data.order) {
				setOrder(data.order);
				setFormData({
					status: data.order.status,
					trackingNumber: data.order.trackingNumber || '',
					trackingUrl: data.order.trackingUrl || '',
					adminNotes: data.order.adminNotes || '',
				});
			} else {
				setError('Order not found');
			}
		} catch (err) {
			setError('Failed to load order');
		} finally {
			setLoading(false);
		}
	};

	const handleTextChange = (field: string, value: string) => {
		setFormData({ ...formData, [field]: value });
		validateField(field, value);
	};

	const handleSave = async () => {
		if (!order) return;
		setError('');
		setSuccess('');

		// Validate adminNotes for XSS
		const isValid = validateAllFields({
			adminNotes: formData.adminNotes,
		});

		if (!isValid) {
			setError('Please fix the validation errors before submitting.');
			return;
		}

		setSaving(true);

		try {
			const res = await fetch(`/api/v1/admin/marketplace/orders/${order.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Failed to update order');
			}

			setSuccess('Order updated successfully');
			fetchOrder(order.id);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Something went wrong');
		} finally {
			setSaving(false);
		}
	};

	const formatDate = (dateString: string | null) => {
		if (!dateString) return 'N/A';
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
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground/80" />
			</div>
		);
	}

	if (error && !order) {
		return (
			<div className="p-6">
				<Card className="p-8 text-center">
					<Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/80" />
					<h1 className="text-xl font-semibold mb-2">Order Not Found</h1>
					<p className="text-muted-foreground mb-6">{error}</p>
					<Link href="/admin/marketplace/orders">
						<Button variant="outline">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Orders
						</Button>
					</Link>
				</Card>
			</div>
		);
	}

	if (!order) return null;

	const currentStatus = STATUS_OPTIONS.find(s => s.value === order.status);

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link href="/admin/marketplace/orders">
						<Button variant="ghost" size="icon">
							<ArrowLeft className="h-5 w-5" />
						</Button>
					</Link>
					<div>
						<div className="flex items-center gap-3">
							<h1 className="text-2xl font-bold text-foreground">{order.orderNumber}</h1>
							<Badge className={currentStatus?.color}>{order.status}</Badge>
						</div>
						<p className="text-muted-foreground">Placed on {formatDate(order.createdAt)}</p>
					</div>
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				{/* Main Content */}
				<div className="lg:col-span-2 space-y-6">
					{/* Order Items */}
					<Card>
						<CardHeader>
							<CardTitle>Order Items</CardTitle>
							<CardDescription>{order.itemCount} items</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{order.items.map((item) => (
									<div key={item.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
										<div className="flex items-center gap-4">
											<div className="p-2 bg-card rounded-lg">
												<Package className="h-5 w-5 text-muted-foreground/80" />
											</div>
											<div>
												<p className="font-medium">{item.productName}</p>
												<p className="text-sm text-muted-foreground">
													${parseFloat(item.unitPrice).toFixed(2)} × {item.quantity}
												</p>
											</div>
										</div>
										<span className="font-semibold">${parseFloat(item.subtotal).toFixed(2)}</span>
									</div>
								))}
							</div>

							{/* Order Summary */}
							<div className="mt-6 pt-6 border-t space-y-2">
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Subtotal</span>
									<span>${parseFloat(order.subtotal).toFixed(2)}</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Shipping</span>
									<span>${parseFloat(order.shippingCost).toFixed(2)}</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Tax</span>
									<span>${parseFloat(order.tax).toFixed(2)}</span>
								</div>
								{parseFloat(order.discount) > 0 && (
									<div className="flex justify-between text-sm text-secondary">
										<span>Discount</span>
										<span>-${parseFloat(order.discount).toFixed(2)}</span>
									</div>
								)}
								<div className="flex justify-between font-bold text-lg pt-2 border-t">
									<span>Total</span>
									<span>${parseFloat(order.total).toFixed(2)}</span>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Customer Notes */}
					{order.customerNotes && (
						<Card>
							<CardHeader>
								<CardTitle>Customer Notes</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-muted-foreground">{order.customerNotes}</p>
							</CardContent>
						</Card>
					)}
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					{/* Customer Info */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<User className="h-4 w-4" />
								Customer
							</CardTitle>
						</CardHeader>
						<CardContent>
							{order.customer ? (
								<div>
									<p className="font-medium">{order.customer.email}</p>
									<p className="text-sm text-muted-foreground">
										Member since {new Date(order.customer.createdAt).toLocaleDateString()}
									</p>
								</div>
							) : (
								<p className="text-muted-foreground">Customer info not available</p>
							)}
						</CardContent>
					</Card>

					{/* Shipping Address */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<MapPin className="h-4 w-4" />
								Shipping Address
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-sm space-y-1">
								<p className="font-medium">{order.shippingName || 'N/A'}</p>
								{order.shippingAddress1 && <p>{order.shippingAddress1}</p>}
								{order.shippingAddress2 && <p>{order.shippingAddress2}</p>}
								<p>
									{order.shippingCity && `${order.shippingCity}, `}
									{order.shippingState && `${order.shippingState} `}
									{order.shippingPostalCode}
								</p>
								{order.shippingCountry && <p>{order.shippingCountry}</p>}
								{order.shippingPhone && <p className="pt-2">{order.shippingPhone}</p>}
							</div>
						</CardContent>
					</Card>

					{/* Update Status */}
					<Card>
						<CardHeader>
							<CardTitle>Update Order</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label>Status</Label>
								<Select
									value={formData.status}
									onValueChange={(value) => setFormData({ ...formData, status: value })}
								>
									<SelectTrigger>
										<SelectValue />
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

							<div className="space-y-2">
								<Label>Tracking Number</Label>
								<Input
									value={formData.trackingNumber}
									onChange={(e) => setFormData({ ...formData, trackingNumber: e.target.value })}
									placeholder="Enter tracking number"
								/>
							</div>

							<div className="space-y-2">
								<Label>Tracking URL</Label>
								<Input
									value={formData.trackingUrl}
									onChange={(e) => setFormData({ ...formData, trackingUrl: e.target.value })}
									placeholder="https://..."
								/>
							</div>

							<div className="space-y-2">
								<Label>Admin Notes</Label>
								<Textarea
									value={formData.adminNotes}
									onChange={(e) => handleTextChange('adminNotes', e.target.value)}
									placeholder="Internal notes..."
									className={getInputClassName('adminNotes')}
									rows={3}
								/>
								{fieldErrors.adminNotes && (
									<p className="text-sm text-destructive">{fieldErrors.adminNotes}</p>
								)}
							</div>

							{error && (
								<div className="p-3 bg-destructive/10 border border-destructive rounded-lg text-destructive text-sm">
									{error}
								</div>
							)}

							{success && (
								<div className="p-3 bg-secondary/10 border border-secondary/50 rounded-lg text-secondary text-sm">
									{success}
								</div>
							)}

							<Button onClick={handleSave} className="w-full" disabled={saving}>
								{saving ? (
									<>
										<Loader2 className="h-4 w-4 animate-spin mr-2" />
										Saving...
									</>
								) : (
									<>
										<Save className="h-4 w-4 mr-2" />
										Save Changes
									</>
								)}
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
