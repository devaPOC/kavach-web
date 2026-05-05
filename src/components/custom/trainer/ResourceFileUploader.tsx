'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, Loader2, FileText, Video, File } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UploadedFile {
	fileName: string;
	fileSize: number;
	fileType: string;
	r2Key: string;
	contentUrl: string;
	category: 'image' | 'document' | 'video';
}

interface ResourceFileUploaderProps {
	onUploadComplete: (file: UploadedFile) => void;
	onUploadError: (error: string) => void;
	currentFile?: UploadedFile | null;
	onRemoveFile?: () => void;
}

const ACCEPTED_TYPES = [
	// Documents
	'application/pdf',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/vnd.ms-powerpoint',
	'application/vnd.openxmlformats-officedocument.presentationml.presentation',
	// Videos
	'video/mp4',
	'video/quicktime',
	'video/webm',
];

const ACCEPT_STRING = '.pdf,.doc,.docx,.ppt,.pptx,.mp4,.mov,.webm';

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getFileIcon(fileType: string) {
	if (fileType.startsWith('video/')) {
		return <Video className="h-8 w-8 text-purple-500" />;
	}
	if (fileType === 'application/pdf') {
		return <FileText className="h-8 w-8 text-red-500" />;
	}
	if (fileType.includes('word') || fileType.includes('document')) {
		return <FileText className="h-8 w-8 text-blue-500" />;
	}
	if (fileType.includes('powerpoint') || fileType.includes('presentation')) {
		return <FileText className="h-8 w-8 text-orange-500" />;
	}
	return <File className="h-8 w-8 text-gray-500" />;
}

export function ResourceFileUploader({
	onUploadComplete,
	onUploadError,
	currentFile,
	onRemoveFile,
}: ResourceFileUploaderProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
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

		const files = Array.from(e.dataTransfer.files);
		const file = files[0];

		if (file) {
			uploadFile(file);
		}
	}, []);

	const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			uploadFile(file);
		}
		// Reset input so the same file can be selected again
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	}, []);

	const uploadFile = async (file: File) => {
		// Validate file type
		if (!ACCEPTED_TYPES.includes(file.type)) {
			onUploadError('Invalid file type. Please upload PDF, Word, PowerPoint, or video files.');
			return;
		}

		// Check file size (50MB for docs, 500MB for videos)
		const maxSize = file.type.startsWith('video/') ? 500 * 1024 * 1024 : 50 * 1024 * 1024;
		if (file.size > maxSize) {
			const maxSizeMB = maxSize / (1024 * 1024);
			onUploadError(`File too large. Maximum size: ${maxSizeMB}MB`);
			return;
		}

		setIsUploading(true);
		setUploadProgress(0);

		try {
			const formData = new FormData();
			formData.append('file', file);

			const response = await fetch('/api/v1/admin/resources/upload', {
				method: 'POST',
				body: formData,
			});

			const data = await response.json();

			if (!response.ok || !data.success) {
				throw new Error(data.error || 'Upload failed');
			}

			onUploadComplete(data.data);
		} catch (error) {
			onUploadError(error instanceof Error ? error.message : 'Upload failed');
		} finally {
			setIsUploading(false);
			setUploadProgress(0);
		}
	};

	// Show current file if already uploaded
	if (currentFile) {
		return (
			<div className="border rounded-lg p-4 bg-gray-50">
				<div className="flex items-center gap-3">
					{getFileIcon(currentFile.fileType)}
					<div className="flex-1 min-w-0">
						<p className="font-medium text-gray-900 truncate">{currentFile.fileName}</p>
						<p className="text-sm text-gray-500">{formatFileSize(currentFile.fileSize)}</p>
					</div>
					{onRemoveFile && (
						<Button
							variant="ghost"
							size="sm"
							onClick={onRemoveFile}
							className="text-gray-500 hover:text-red-500"
						>
							<X className="h-4 w-4" />
						</Button>
					)}
				</div>
			</div>
		);
	}

	return (
		<div
			className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${isDragging
					? 'border-purple-500 bg-purple-50'
					: 'border-gray-300 hover:border-gray-400'
				} ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
			onClick={() => fileInputRef.current?.click()}
		>
			<input
				ref={fileInputRef}
				type="file"
				accept={ACCEPT_STRING}
				onChange={handleFileSelect}
				className="hidden"
			/>
			{isUploading ? (
				<div className="flex flex-col items-center gap-2">
					<Loader2 className="h-8 w-8 animate-spin text-purple-500" />
					<p className="text-gray-600">Uploading...</p>
				</div>
			) : (
				<div className="flex flex-col items-center gap-2">
					<Upload className="h-8 w-8 text-gray-400" />
					<p className="text-gray-600 font-medium">
						Drop a file here or click to upload
					</p>
					<p className="text-sm text-gray-400">
						PDF, Word, PowerPoint (max 50MB) or Video (max 500MB)
					</p>
				</div>
			)}
		</div>
	);
}
