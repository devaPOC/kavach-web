'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, Star, Loader2, ImageIcon, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImageCropper } from './ImageCropper';

interface ProductImage {
	id: string;
	url: string;
	altText: string | null;
	isPrimary: boolean;
	sortOrder: number;
}

interface ProductImageUploaderProps {
	productId: string;
	images: ProductImage[];
	onImagesChange: (images: ProductImage[]) => void;
}

export function ProductImageUploader({
	productId,
	images,
	onImagesChange,
}: ProductImageUploaderProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [error, setError] = useState('');
	const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
	const [pendingFile, setPendingFile] = useState<File | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
	}, []);

	const handleDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		setError('');

		const files = Array.from(e.dataTransfer.files);
		const imageFile = files.find((f) => f.type.startsWith('image/'));

		if (imageFile) {
			openCropper(imageFile);
		}
	}, []);

	const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setError('');
		const file = e.target.files?.[0];
		if (file) {
			openCropper(file);
		}
		// Reset input so the same file can be selected again
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	}, []);

	const openCropper = (file: File) => {
		const reader = new FileReader();
		reader.onload = () => {
			setCropImageSrc(reader.result as string);
			setPendingFile(file);
		};
		reader.readAsDataURL(file);
	};

	const handleCropComplete = async (croppedBlob: Blob) => {
		if (!pendingFile) return;

		setIsUploading(true);
		setError('');

		try {
			const formData = new FormData();
			// Create a new file from the cropped blob
			const croppedFile = new File([croppedBlob], pendingFile.name, {
				type: 'image/jpeg',
			});
			formData.append('image', croppedFile);
			formData.append('isPrimary', images.length === 0 ? 'true' : 'false');

			const res = await fetch(`/api/v1/admin/marketplace/products/${productId}/images`, {
				method: 'POST',
				body: formData,
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Failed to upload image');
			}

			onImagesChange([...images, data.image]);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Upload failed');
		} finally {
			setIsUploading(false);
			setCropImageSrc(null);
			setPendingFile(null);
		}
	};

	const handleDelete = async (imageId: string) => {
		setDeletingId(imageId);
		setError('');

		try {
			const res = await fetch(
				`/api/v1/admin/marketplace/products/${productId}/images/${imageId}`,
				{ method: 'DELETE' }
			);

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Failed to delete image');
			}

			// Remove from local state
			const deletedImage = images.find((img) => img.id === imageId);
			let newImages = images.filter((img) => img.id !== imageId);

			// If deleted image was primary, set first remaining as primary
			if (deletedImage?.isPrimary && newImages.length > 0) {
				newImages = newImages.map((img, idx) => ({
					...img,
					isPrimary: idx === 0,
				}));
			}

			onImagesChange(newImages);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Delete failed');
		} finally {
			setDeletingId(null);
		}
	};

	const handleSetPrimary = async (imageId: string) => {
		setSettingPrimaryId(imageId);
		setError('');

		try {
			const res = await fetch(
				`/api/v1/admin/marketplace/products/${productId}/images/${imageId}`,
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ isPrimary: true }),
				}
			);

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Failed to update image');
			}

			// Update local state
			onImagesChange(
				images.map((img) => ({
					...img,
					isPrimary: img.id === imageId,
				}))
			);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Update failed');
		} finally {
			setSettingPrimaryId(null);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<ImageIcon className="h-5 w-5" />
					Product Images
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Upload Area */}
				<div
					className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${isDragging
						? 'border-primary/50 bg-primary/10'
						: 'border-border hover:border-border/80'
						} ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					onClick={() => fileInputRef.current?.click()}
				>
					<input
						ref={fileInputRef}
						type="file"
						accept="image/jpeg,image/png,image/webp,image/gif"
						onChange={handleFileSelect}
						className="hidden"
					/>
					{isUploading ? (
						<div className="flex flex-col items-center gap-2">
							<Loader2 className="h-8 w-8 animate-spin text-muted-foreground/80" />
							<p className="text-muted-foreground">Uploading...</p>
						</div>
					) : (
						<div className="flex flex-col items-center gap-2">
							<Upload className="h-8 w-8 text-muted-foreground/80" />
							<p className="text-muted-foreground font-medium">
								Drop an image here or click to upload
							</p>
							<p className="text-sm text-muted-foreground/80">
								JPEG, PNG, WebP, or GIF (max 5MB)
							</p>
						</div>
					)}
				</div>

				{/* Error Message */}
				{error && (
					<p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2">
						{error}
					</p>
				)}

				{/* Image Gallery */}
				{images.length > 0 && (
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
						{images.map((image) => (
							<div
								key={image.id}
								className={`relative group rounded-lg overflow-hidden border-2 ${image.isPrimary ? 'border-accent/50' : 'border-border'
									}`}
							>
								<div className="aspect-square bg-muted">
									<img
										src={image.url}
										alt={image.altText || 'Product image'}
										className="w-full h-full object-cover"
										crossOrigin="anonymous"
									/>
								</div>

								{/* Primary Badge */}
								{image.isPrimary && (
									<div className="absolute top-2 left-2 bg-accent text-accent px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1">
										<Star className="h-3 w-3" />
										Primary
									</div>
								)}

								{/* Overlay with actions */}
								<div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
									{!image.isPrimary && (
										<Button
											size="sm"
											variant="secondary"
											onClick={() => handleSetPrimary(image.id)}
											disabled={settingPrimaryId === image.id}
										>
											{settingPrimaryId === image.id ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												<Star className="h-4 w-4" />
											)}
										</Button>
									)}
									<Button
										size="sm"
										variant="destructive"
										onClick={() => handleDelete(image.id)}
										disabled={deletingId === image.id}
									>
										{deletingId === image.id ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Trash2 className="h-4 w-4" />
										)}
									</Button>
								</div>
							</div>
						))}
					</div>
				)}

				{/* Empty State */}
				{images.length === 0 && !isUploading && (
					<p className="text-center text-muted-foreground/80 text-sm py-4">
						No images uploaded yet
					</p>
				)}

				{/* Cropper Modal */}
				{cropImageSrc && (
					<ImageCropper
						imageSrc={cropImageSrc}
						open={!!cropImageSrc}
						onClose={() => {
							setCropImageSrc(null);
							setPendingFile(null);
						}}
						onCropComplete={handleCropComplete}
						aspectRatio={1}
					/>
				)}
			</CardContent>
		</Card>
	);
}
