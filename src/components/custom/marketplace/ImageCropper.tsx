'use client';

import { useState, useRef, useCallback } from 'react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ImageCropperProps {
	imageSrc: string;
	open: boolean;
	onClose: () => void;
	onCropComplete: (croppedBlob: Blob) => void;
	aspectRatio?: number;
}

function centerAspectCrop(
	mediaWidth: number,
	mediaHeight: number,
	aspect: number
): Crop {
	return centerCrop(
		makeAspectCrop(
			{
				unit: '%',
				width: 90,
			},
			aspect,
			mediaWidth,
			mediaHeight
		),
		mediaWidth,
		mediaHeight
	);
}

export function ImageCropper({
	imageSrc,
	open,
	onClose,
	onCropComplete,
	aspectRatio = 1,
}: ImageCropperProps) {
	const [crop, setCrop] = useState<Crop>();
	const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
	const [isProcessing, setIsProcessing] = useState(false);
	const imgRef = useRef<HTMLImageElement>(null);

	const onImageLoad = useCallback(
		(e: React.SyntheticEvent<HTMLImageElement>) => {
			const { width, height } = e.currentTarget;
			setCrop(centerAspectCrop(width, height, aspectRatio));
		},
		[aspectRatio]
	);

	const getCroppedImage = useCallback(async (): Promise<Blob | null> => {
		if (!imgRef.current || !completedCrop) return null;

		const image = imgRef.current;
		const scaleX = image.naturalWidth / image.width;
		const scaleY = image.naturalHeight / image.height;

		// Create canvas
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		if (!ctx) return null;

		// Set canvas size to the cropped dimensions
		const cropWidth = completedCrop.width * scaleX;
		const cropHeight = completedCrop.height * scaleY;
		canvas.width = cropWidth;
		canvas.height = cropHeight;

		// Draw cropped image
		ctx.drawImage(
			image,
			completedCrop.x * scaleX,
			completedCrop.y * scaleY,
			cropWidth,
			cropHeight,
			0,
			0,
			cropWidth,
			cropHeight
		);

		// Convert to blob
		return new Promise((resolve) => {
			canvas.toBlob(
				(blob) => resolve(blob),
				'image/jpeg',
				0.9
			);
		});
	}, [completedCrop]);

	const handleApply = async () => {
		setIsProcessing(true);
		try {
			const blob = await getCroppedImage();
			if (blob) {
				onCropComplete(blob);
				onClose();
			}
		} finally {
			setIsProcessing(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Crop Image</DialogTitle>
				</DialogHeader>

				<div className="flex items-center justify-center bg-gray-100 rounded-lg p-4 min-h-[300px] max-h-[60vh] overflow-auto">
					<ReactCrop
						crop={crop}
						onChange={(_, percentCrop) => setCrop(percentCrop)}
						onComplete={(c) => setCompletedCrop(c)}
						aspect={aspectRatio}
					>
						<img
							ref={imgRef}
							src={imageSrc}
							alt="Crop preview"
							onLoad={onImageLoad}
							style={{ maxHeight: '50vh' }}
						/>
					</ReactCrop>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={isProcessing}>
						Cancel
					</Button>
					<Button onClick={handleApply} disabled={isProcessing || !completedCrop}>
						{isProcessing ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin mr-2" />
								Processing...
							</>
						) : (
							'Apply Crop'
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
