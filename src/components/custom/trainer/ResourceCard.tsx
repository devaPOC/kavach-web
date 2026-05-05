'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Video, BookOpen, GraduationCap, ExternalLink, Download, Loader2, File } from 'lucide-react';
import type { TrainerResource } from '../../../../types/resource';

interface ResourceCardProps {
	resource: TrainerResource;
	onView: (resource: TrainerResource) => void;
	onDownload?: (resource: TrainerResource) => Promise<void>;
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getResourceIcon(resource: TrainerResource) {
	// If it's a file-based resource, use file type icons
	if (resource.r2Key && resource.fileType) {
		if (resource.fileType.startsWith('video/')) {
			return Video;
		}
		if (resource.fileType === 'application/pdf') {
			return FileText;
		}
		if (resource.fileType.includes('word') || resource.fileType.includes('document')) {
			return FileText;
		}
		if (resource.fileType.includes('powerpoint') || resource.fileType.includes('presentation')) {
			return FileText;
		}
		return File;
	}

	// Fallback to resource type icons
	const icons = {
		document: FileText,
		video: Video,
		article: BookOpen,
		course: GraduationCap,
	};
	return icons[resource.resourceType] || FileText;
}

function getIconColor(resource: TrainerResource) {
	if (resource.r2Key && resource.fileType) {
		if (resource.fileType.startsWith('video/')) return 'text-accent';
		if (resource.fileType === 'application/pdf') return 'text-destructive';
		if (resource.fileType.includes('word')) return 'text-primary';
		if (resource.fileType.includes('powerpoint')) return 'text-accent';
		return 'text-muted-foreground';
	}
	return 'text-accent';
}

export function ResourceCard({ resource, onView, onDownload }: ResourceCardProps) {
	const [isDownloading, setIsDownloading] = useState(false);
	const Icon = getResourceIcon(resource);
	const iconColor = getIconColor(resource);

	const handleDownload = async () => {
		if (onDownload) {
			setIsDownloading(true);
			try {
				await onDownload(resource);
			} finally {
				setIsDownloading(false);
			}
		}
	};

	const isFileResource = resource.r2Key && resource.fileName;

	return (
		<Card className="hover:shadow-lg transition-shadow">
			<CardHeader>
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-2">
						<Icon className={`w-5 h-5 ${iconColor}`} />
						<CardTitle className="text-lg">{resource.title}</CardTitle>
					</div>
					{!resource.isPublished && (
						<Badge variant="secondary">Draft</Badge>
					)}
				</div>
				{resource.description && (
					<CardDescription>{resource.description}</CardDescription>
				)}
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{/* File info for file-based resources */}
					{isFileResource && (
						<div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-2">
							<div className="flex items-center justify-between">
								<span className="truncate mr-2">{resource.fileName}</span>
								{resource.fileSize && (
									<span className="text-xs whitespace-nowrap">{formatFileSize(resource.fileSize)}</span>
								)}
							</div>
						</div>
					)}

					<div className="flex items-center justify-between">
						<div className="flex gap-2 flex-wrap">
							{resource.category && (
								<Badge variant="outline">{resource.category}</Badge>
							)}
							{resource.tags?.map((tag) => (
								<Badge key={tag} variant="secondary" className="text-xs">
									{tag}
								</Badge>
							))}
						</div>

						<div className="flex gap-2">
							{/* Download button for file-based resources */}
							{isFileResource && onDownload && (
								<Button
									size="sm"
									onClick={handleDownload}
									disabled={isDownloading}
								>
									{isDownloading ? (
										<Loader2 className="w-4 h-4 animate-spin" />
									) : (
										<>
											<Download className="w-4 h-4 mr-2" />
											Download
										</>
									)}
								</Button>
							)}
							{/* View button for URL-based resources */}
							{!isFileResource && resource.contentUrl && (
								<Button size="sm" onClick={() => onView(resource)}>
									<ExternalLink className="w-4 h-4 mr-2" />
									View
								</Button>
							)}
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
