'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
	ArrowLeft,
	ArrowRight,
	Check,
	Loader2,
	FileText,
	Image as ImageIcon,
	DollarSign,
	Package,
	Send,
} from 'lucide-react';
import { useForm, useFieldArray, SubmitHandler, DefaultValues, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { ProductImageUploader } from './ProductImageUploader';
import {
	productFormSchema,
	defaultValues,
	type ProductFormValues,
} from './ProductFormWizard.schema';

// Step definitions
const STEPS = [
	{ id: 'info', title: 'Basic Info', icon: FileText },
	{ id: 'media', title: 'Media', icon: ImageIcon },
	{ id: 'pricing', title: 'Pricing', icon: DollarSign },
	{ id: 'inventory', title: 'Inventory', icon: Package },
	{ id: 'publish', title: 'Publish', icon: Send },
];

interface ProductImage {
	id: string;
	url: string;
	altText: string | null;
	isPrimary: boolean;
	sortOrder: number;
}

interface ProductFormWizardProps {
	mode: 'create' | 'edit';
	productId?: string;
	initialData?: Partial<ProductFormValues>;
	initialImages?: ProductImage[];
}

export function ProductFormWizard({
	mode,
	productId,
	initialData,
	initialImages = [],
}: ProductFormWizardProps) {
	const router = useRouter();
	const [currentStep, setCurrentStep] = useState(0);
	const [images, setImages] = useState<ProductImage[]>(initialImages);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');

	const form = useForm<ProductFormValues>({
		resolver: zodResolver(productFormSchema) as unknown as Resolver<ProductFormValues>,
		defaultValues: {
			...defaultValues,
			...initialData,
		} as DefaultValues<ProductFormValues>,
		mode: 'onChange',
	});

	const { watch, trigger, setValue } = form;
	const formData = watch();

	const generateSlug = (name: string) => {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	};

	const handleNameChange = (name: string) => {
		setValue('name', name, { shouldValidate: true });
		if (mode === 'create') {
			setValue('slug', generateSlug(name), { shouldValidate: true });
		}
	};

	const validateStep = async (step: number): Promise<boolean> => {
		let fieldsToValidate: (keyof ProductFormValues)[] = [];

		if (step === 0) {
			fieldsToValidate = ['name', 'slug', 'shortDescription', 'description'];
		} else if (step === 2) {
			fieldsToValidate = ['price', 'compareAtPrice'];
		} else if (step === 3) {
			fieldsToValidate = ['stockQuantity', 'lowStockThreshold'];
		}

		if (fieldsToValidate.length > 0) {
			return await trigger(fieldsToValidate);
		}
		return true;
	};

	const goToNext = async () => {
		const isValid = await validateStep(currentStep);
		if (isValid) {
			setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
		}
	};

	const goToPrev = () => {
		setCurrentStep((prev) => Math.max(prev - 1, 0));
	};

	const onSubmit = async (values: ProductFormValues) => {
		setSaving(true);
		setError('');

		try {
			const url = mode === 'create'
				? '/api/v1/admin/marketplace/products'
				: `/api/v1/admin/marketplace/products/${productId}`;

			const res = await fetch(url, {
				method: mode === 'create' ? 'POST' : 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...values,
					compareAtPrice: values.compareAtPrice || null,
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || `Failed to ${mode} product`);
			}

			router.push('/admin/marketplace/products');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Something went wrong');
		} finally {
			setSaving(false);
		}
	};

	// Step Indicator Component
	const StepIndicator = () => (
		<div className="flex items-center justify-center mb-8">
			{STEPS.map((step, index) => {
				const isCompleted = index < currentStep;
				const isCurrent = index === currentStep;
				const Icon = step.icon;

				return (
					<div key={step.id} className="flex items-center">
						<button
							type="button"
							onClick={async () => {
								if (index < currentStep) {
									setCurrentStep(index);
								} else if (index > currentStep) {
									// Verify explicitly if user clicks ahead, though mainly they should use Next
									// Implementing basic check: can only click strict next if current is valid
									// better to just disable forward clicking for strictness, allowed backward
								}
							}}
							disabled={index > currentStep}
							className={`
								flex flex-col items-center transition-all duration-300
								${index <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
							`}
						>
							<div
								className={`
									w-12 h-12 rounded-full flex items-center justify-center
									transition-all duration-300 border-2
									${isCompleted
										? 'bg-primary border-transparent text-primary-foreground'
										: isCurrent
											? 'bg-card border-primary text-primary shadow-lg shadow-primary/20'
											: 'bg-muted border-border text-muted-foreground/80'
									}
								`}
							>
								{isCompleted ? (
									<Check className="w-5 h-5" />
								) : (
									<Icon className="w-5 h-5" />
								)}
							</div>
							<span
								className={`
									mt-2 text-xs font-medium whitespace-nowrap
									${isCurrent ? 'text-primary' : isCompleted ? 'text-muted-foreground' : 'text-muted-foreground/80'}
								`}
							>
								{step.title}
							</span>
						</button>

						{index < STEPS.length - 1 && (
							<div
								className={`
									w-16 h-0.5 mx-2 transition-all duration-500
									${index < currentStep
										? 'bg-primary'
										: 'bg-muted/80'
									}
								`}
							/>
						)}
					</div>
				);
			})}
		</div>
	);

	const renderStep = () => {
		switch (currentStep) {
			case 0:
				return (
					<div className="space-y-6">
						<div className="text-center mb-8">
							<h2 className="text-2xl font-bold text-foreground">Basic Information</h2>
							<p className="text-muted-foreground mt-1">Start with the essential product details</p>
						</div>

						<div className="space-y-4 max-w-xl mx-auto">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Product Name <span className="text-destructive">*</span></FormLabel>
										<FormControl>
											<Input
												{...field}
												onChange={(e) => handleNameChange(e.target.value)}
												placeholder="Enter product name"
												className="h-12 text-base"
												maxLength={100}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="slug"
								render={({ field }) => (
									<FormItem>
										<FormLabel>URL Slug <span className="text-destructive">*</span></FormLabel>
										<FormControl>
											<Input
												{...field}
												placeholder="product-url-slug"
												className="h-12 text-base"
												maxLength={100}
											/>
										</FormControl>
										<FormDescription>
											This will be used in the product URL: /products/{field.value || 'your-slug'}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="shortDescription"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Short Description</FormLabel>
										<FormControl>
											<Input
												{...field}
												placeholder="Brief one-line description"
												className="h-12 text-base"
												maxLength={500}
											/>
										</FormControl>
										<FormDescription className="text-right">
											{field.value?.length || 0}/500
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="description"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Full Description</FormLabel>
										<FormControl>
											<Textarea
												{...field}
												placeholder="Detailed product description..."
												className="min-h-[150px] text-base"
												maxLength={2000}
											/>
										</FormControl>
										<FormDescription className="text-right">
											{field.value?.length || 0}/2000
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>
				);

			case 1:
				return (
					<div className="space-y-6">
						<div className="text-center mb-8">
							<h2 className="text-2xl font-bold text-foreground">Product Media</h2>
							<p className="text-muted-foreground mt-1">Upload images to showcase your product</p>
						</div>

						<div className="max-w-2xl mx-auto">
							{mode === 'edit' && productId ? (
								<ProductImageUploader
									productId={productId}
									images={images}
									onImagesChange={setImages}
								/>
							) : (
								<Card className="p-8 text-center">
									<div className="text-muted-foreground/80 mb-4">
										<ImageIcon className="w-16 h-16 mx-auto opacity-50" />
									</div>
									<p className="text-muted-foreground">
										Images can be uploaded after creating the product
									</p>
									<p className="text-sm text-muted-foreground/80 mt-2">
										Click "Create Product" to save and then add images
									</p>
								</Card>
							)}
						</div>
					</div>
				);

			case 2:
				return (
					<div className="space-y-6">
						<div className="text-center mb-8">
							<h2 className="text-2xl font-bold text-foreground">Pricing</h2>
							<p className="text-muted-foreground mt-1">Set the pricing for your product</p>
						</div>

						<div className="max-w-md mx-auto space-y-6">
							<FormField
								control={form.control}
								name="price"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Price <span className="text-destructive">*</span></FormLabel>
										<div className="relative">
											<span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
											<FormControl>
												<Input
													{...field}
													type="number"
													step="0.01"
													min="0"
													className="h-14 pl-8 text-2xl font-semibold"
													placeholder="0.00"
												/>
											</FormControl>
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="compareAtPrice"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Compare at Price</FormLabel>
										<div className="relative">
											<span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/80 text-lg">$</span>
											<FormControl>
												<Input
													{...field}
													type="number"
													step="0.01"
													min="0"
													className="h-14 pl-8 text-2xl text-muted-foreground/80"
													placeholder="0.00"
												/>
											</FormControl>
										</div>
										<FormDescription>
											Set a higher price to show a discount
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							{formData.price && formData.compareAtPrice && parseFloat(formData.compareAtPrice) > parseFloat(formData.price) && (
								<div className="bg-secondary/10 border border-secondary/50 rounded-lg p-4 text-center">
									<p className="text-secondary font-medium">
										{Math.round((1 - parseFloat(formData.price) / parseFloat(formData.compareAtPrice)) * 100)}% OFF
									</p>
									<p className="text-secondary text-sm">
										Customers save ${(parseFloat(formData.compareAtPrice) - parseFloat(formData.price)).toFixed(2)}
									</p>
								</div>
							)}
						</div>
					</div>
				);

			case 3:
				// Step 4: Inventory
				return (
					<div className="space-y-6">
						<div className="text-center mb-8">
							<h2 className="text-2xl font-bold text-foreground">Inventory</h2>
							<p className="text-muted-foreground mt-1">Manage stock levels for this product</p>
						</div>

						<div className="max-w-md mx-auto space-y-6">
							<Card className="p-6">
								<FormField
									control={form.control}
									name="trackInventory"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between rounded-lg p-3 shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>Track Inventory</FormLabel>
												<FormDescription>
													Monitor stock levels and show out-of-stock status
												</FormDescription>
											</div>
											<FormControl>
												<Switch
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
							</Card>

							{formData.trackInventory && (
								<div className="space-y-4">
									<FormField
										control={form.control}
										name="stockQuantity"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Stock Quantity</FormLabel>
												<FormControl>
													<Input
														{...field}
														type="number"
														min="0"
														className="h-12 text-base"
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="lowStockThreshold"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Low Stock Alert Threshold</FormLabel>
												<FormControl>
													<Input
														{...field}
														type="number"
														min="0"
														className="h-12 text-base"
													/>
												</FormControl>
												<FormDescription>
													You'll be notified when stock falls below this number
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							)}
						</div>
					</div>
				);

			case 4:
				return (
					<div className="space-y-6">
						<div className="text-center mb-8">
							<h2 className="text-2xl font-bold text-foreground">Review & Publish</h2>
							<p className="text-muted-foreground mt-1">Review your product and set visibility</p>
						</div>

						<div className="max-w-2xl mx-auto space-y-6">
							{/* Summary Card */}
							<Card className="overflow-hidden">
								<div className="bg-primary p-4">
									<h3 className="text-white font-semibold">Product Summary</h3>
								</div>
								<CardContent className="p-6 space-y-4">
									<div className="grid gap-4 sm:grid-cols-2">
										<div>
											<p className="text-sm text-muted-foreground">Name</p>
											<p className="font-medium">{formData.name || '-'}</p>
										</div>
										<div>
											<p className="text-sm text-muted-foreground">Slug</p>
											<p className="font-medium">{formData.slug || '-'}</p>
										</div>
										<div>
											<p className="text-sm text-muted-foreground">Price</p>
											<p className="font-medium text-secondary">
												${formData.price || '0.00'}
												{formData.compareAtPrice && (
													<span className="text-muted-foreground/80 line-through ml-2">
														${formData.compareAtPrice}
													</span>
												)}
											</p>
										</div>
										<div>
											<p className="text-sm text-muted-foreground">Stock</p>
											<p className="font-medium">
												{formData.trackInventory ? formData.stockQuantity : 'Not tracked'}
											</p>
										</div>
									</div>
									{formData.shortDescription && (
										<div className="pt-4 border-t">
											<p className="text-sm text-muted-foreground">Description</p>
											<p className="text-foreground/80">{formData.shortDescription}</p>
										</div>
									)}
								</CardContent>
							</Card>

							{/* Status & Featured */}
							<div className="grid gap-4 sm:grid-cols-2">
								<Card className="p-6">
									<FormField
										control={form.control}
										name="status"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Product Status</FormLabel>
												<Select onValueChange={field.onChange} defaultValue={field.value}>
													<FormControl>
														<SelectTrigger className="h-12">
															<SelectValue placeholder="Select status" />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														<SelectItem value="draft">
															<span className="flex items-center gap-2">
																<span className="w-2 h-2 rounded-full bg-accent" />
																Draft
															</span>
														</SelectItem>
														<SelectItem value="active">
															<span className="flex items-center gap-2">
																<span className="w-2 h-2 rounded-full bg-secondary" />
																Active
															</span>
														</SelectItem>
														<SelectItem value="archived">
															<span className="flex items-center gap-2">
																<span className="w-2 h-2 rounded-full bg-muted/80" />
																Archived
															</span>
														</SelectItem>
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>
								</Card>

								<Card className="p-6">
									<FormField
										control={form.control}
										name="isFeatured"
										render={({ field }) => (
											<FormItem className="flex flex-row items-center justify-between h-full space-y-0">
												<div className="space-y-0.5">
													<FormLabel>Featured Product</FormLabel>
													<FormDescription>
														Show on homepage
													</FormDescription>
												</div>
												<FormControl>
													<Switch
														checked={field.value}
														onCheckedChange={field.onChange}
													/>
												</FormControl>
											</FormItem>
										)}
									/>
								</Card>
							</div>

							{error && (
								<div className="p-4 bg-destructive/10 border border-destructive rounded-lg text-destructive text-sm">
									{error}
								</div>
							)}
						</div>
					</div>
				);

			default:
				return null;
		}
	};

	// Product Preview Card Component
	const ProductPreview = () => {
		const primaryImage = images.find(img => img.isPrimary) || images[0];
		const hasDiscount = !!(formData.compareAtPrice && formData.price && parseFloat(formData.compareAtPrice) > parseFloat(formData.price));
		const discountPercent = hasDiscount && formData.price && formData.compareAtPrice
			? Math.round((1 - parseFloat(formData.price) / parseFloat(formData.compareAtPrice)) * 100)
			: 0;

		return (
			<div className="sticky top-6">
				<div className="mb-4">
					<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Live Preview</h3>
				</div>
				<Card className="overflow-hidden border-2 border-dashed border-border hover:border-primary/50 transition-colors">
					{/* Product Image */}
					<div className="aspect-square bg-muted relative overflow-hidden">
						{primaryImage ? (
							<img
								src={primaryImage.url}
								alt={formData.name || 'Product'}
								className="w-full h-full object-cover"
								crossOrigin="anonymous"
							/>
						) : (
							<div className="w-full h-full flex items-center justify-center">
								<div className="text-center">
									<ImageIcon className="w-12 h-12 mx-auto text-muted-foreground/80 mb-2" />
									<p className="text-xs text-muted-foreground/80">No image</p>
								</div>
							</div>
						)}
						{/* Badges */}
						<div className="absolute top-2 left-2 flex flex-col gap-1">
							{formData.isFeatured && (
								<span className="bg-accent text-white text-xs px-2 py-0.5 rounded-full font-medium">
									Featured
								</span>
							)}
							{hasDiscount && (
								<span className="bg-destructive text-white text-xs px-2 py-0.5 rounded-full font-medium">
									-{discountPercent}%
								</span>
							)}
						</div>
						{/* Status Badge */}
						<div className="absolute top-2 right-2">
							<span className={`text-xs px-2 py-0.5 rounded-full font-medium ${formData.status === 'active'
								? 'bg-secondary/10 text-secondary'
								: formData.status === 'archived'
									? 'bg-muted text-foreground/80'
									: 'bg-accent/10 text-accent'
								}`}>
								{formData.status === 'active' ? 'Active' : formData.status === 'archived' ? 'Archived' : 'Draft'}
							</span>
						</div>
					</div>

					{/* Product Info */}
					<div className="p-4 space-y-3">
						<h4 className="font-semibold text-foreground text-lg leading-tight min-h-[1.75rem]">
							{formData.name || <span className="text-muted-foreground/80 italic">Product Name</span>}
						</h4>

						{formData.shortDescription && (
							<p className="text-sm text-muted-foreground line-clamp-2">
								{formData.shortDescription}
							</p>
						)}

						{/* Price */}
						<div className="flex items-baseline gap-2">
							{formData.price && !isNaN(parseFloat(formData.price)) ? (
								<>
									<span className="text-xl font-bold text-foreground">
										${parseFloat(formData.price).toFixed(2)}
									</span>
									{hasDiscount && formData.compareAtPrice && !isNaN(parseFloat(formData.compareAtPrice)) && (
										<span className="text-sm text-muted-foreground/80 line-through">
											${parseFloat(formData.compareAtPrice).toFixed(2)}
										</span>
									)}
								</>
							) : (
								<span className="text-xl font-bold text-muted-foreground/80">$0.00</span>
							)}
						</div>

						{/* Stock Status */}
						{formData.trackInventory && (
							<div className="flex items-center gap-2 text-sm">
								{formData.stockQuantity > 0 ? (
									<>
										<span className="w-2 h-2 rounded-full bg-secondary"></span>
										<span className="text-secondary">In Stock ({formData.stockQuantity})</span>
									</>
								) : (
									<>
										<span className="w-2 h-2 rounded-full bg-destructive"></span>
										<span className="text-destructive">Out of Stock</span>
									</>
								)}
							</div>
						)}

						{/* Add to Cart Button Preview */}
						<Button className="w-full mt-2" disabled>
							Add to Cart
						</Button>
					</div>
				</Card>

				{/* Preview Info */}
				<p className="text-xs text-muted-foreground/80 text-center mt-3">
					This is how your product will appear in the marketplace
				</p>
			</div>
		);
	};

	return (
		<div className="min-h-screen bg-muted/50/50">
			<div className="max-w-6xl mx-auto p-6">
				{/* Header */}
				<div className="flex items-center gap-4 mb-8">
					<Link href="/admin/marketplace/products">
						<Button variant="ghost" size="icon">
							<ArrowLeft className="h-5 w-5" />
						</Button>
					</Link>
					<div>
						<h1 className="text-2xl font-bold text-foreground">
							{mode === 'create' ? 'Add New Product' : 'Edit Product'}
						</h1>
						<p className="text-muted-foreground">
							Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].title}
						</p>
					</div>
				</div>

				{/* Step Indicator */}
				<StepIndicator />

				{/* Two Column Layout: Form + Preview */}
				<div className="grid lg:grid-cols-3 gap-8">
					{/* Form Column */}
					<div className="lg:col-span-2">
						<Card className="p-8 mb-8 shadow-sm">
							<Form {...form}>
								<form>
									{renderStep()}
								</form>
							</Form>
						</Card>

						{/* Navigation */}
						<div className="flex justify-between">
							<Button
								type="button"
								variant="outline"
								onClick={goToPrev}
								disabled={currentStep === 0}
								className="h-12 px-6"
							>
								<ArrowLeft className="h-4 w-4 mr-2" />
								Back
							</Button>

							{currentStep < STEPS.length - 1 ? (
								<Button
									type="button"
									onClick={goToNext}
									className="h-12 px-6"
								>
									Next: {STEPS[currentStep + 1].title}
									<ArrowRight className="h-4 w-4 ml-2" />
								</Button>
							) : (
								<Button
									type="button"
									onClick={form.handleSubmit(onSubmit)}
									disabled={saving}
									className="h-12 px-8"
								>
									{saving ? (
										<>
											<Loader2 className="h-4 w-4 animate-spin mr-2" />
											{mode === 'create' ? 'Creating...' : 'Saving...'}
										</>
									) : (
										<>
											<Check className="h-4 w-4 mr-2" />
											{mode === 'create' ? 'Create Product' : 'Save Changes'}
										</>
									)}
								</Button>
							)}
						</div>
					</div>

					{/* Preview Column */}
					<div className="hidden lg:block">
						<ProductPreview />
					</div>
				</div>
			</div>
		</div>
	);
}
