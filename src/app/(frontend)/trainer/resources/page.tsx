'use client';

import { useEffect, useState } from 'react';
import { ResourceCard } from '@/components/custom/trainer/ResourceCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Filter, ExternalLink, Download, CheckCircle } from 'lucide-react';
import type { TrainerResource } from '../../../../../types/resource';

export default function TrainerResourcesPage() {
	const [resources, setResources] = useState<TrainerResource[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [filterType, setFilterType] = useState<string>('all');
	const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

	useEffect(() => {
		fetchResources();
	}, []);

	const fetchResources = async () => {
		try {
			const response = await fetch('/api/v1/trainer/resources');
			const data = await response.json();

			if (data.success) {
				setResources(data.data);
			} else {
				console.error('Failed to fetch resources:', data.error);
			}
		} catch (error) {
			console.error('Failed to fetch resources:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleDownload = async (resource: TrainerResource) => {
		try {
			// Fetch download URL from API
			const response = await fetch(`/api/v1/trainer/resources/${resource.id}/download`);
			const data = await response.json();

			if (!data.success) {
				throw new Error(data.error || 'Failed to get download URL');
			}

			// Open download URL in new tab or trigger download
			if (data.data.isFileDownload) {
				// For file downloads, create a temporary link and click it
				const link = document.createElement('a');
				link.href = data.data.downloadUrl;
				link.download = data.data.fileName || 'download';
				link.target = '_blank';
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);

				// Show success feedback
				setDownloadSuccess(resource.title);
				setTimeout(() => setDownloadSuccess(null), 3000);
			} else {
				// For external URLs, open in new tab
				window.open(data.data.downloadUrl, '_blank');
			}
		} catch (error) {
			console.error('Failed to download resource:', error);
			alert('Failed to download resource. Please try again.');
		}
	};

	const filteredResources = resources.filter(resource => {
		const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			resource.description?.toLowerCase().includes(searchTerm.toLowerCase());

		let matchesType = true;
		if (filterType !== 'all') {
			if (filterType === 'file') {
				matchesType = !!resource.r2Key;
			} else if (filterType === 'link') {
				matchesType = !resource.r2Key && !!resource.contentUrl;
			} else {
				matchesType = resource.resourceType === filterType;
			}
		}

		return matchesSearch && matchesType;
	});

	const [selectedResource, setSelectedResource] = useState<TrainerResource | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);

	const handleViewResource = (resource: TrainerResource) => {
		setSelectedResource(resource);
		setIsModalOpen(true);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[50vh]">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
			</div>
		);
	}

	return (
		<>
			{/* Success notification */}
			{downloadSuccess && (
				<div className="fixed top-4 right-4 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg z-50 flex items-center gap-2">
					<CheckCircle className="h-5 w-5 text-green-600" />
					<span className="text-green-800">Downloaded: {downloadSuccess}</span>
				</div>
			)}

			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Kavach Trainer Resources</h1>
				<p className="text-muted-foreground">
					Exclusive training materials, courses, and documentation provided by Kavach for conducting awareness sessions
				</p>
			</div>

			<div className="flex gap-4 mb-6 flex-col sm:flex-row">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
					<Input
						placeholder="Search resources..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="pl-10"
					/>
				</div>
				<Select value={filterType} onValueChange={setFilterType}>
					<SelectTrigger className="w-full sm:w-[180px]">
						<SelectValue placeholder="Filter by type" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Types</SelectItem>
						<SelectItem value="file">Downloadable Files</SelectItem>
						<SelectItem value="link">External Links</SelectItem>
						<SelectItem value="document">Documents</SelectItem>
						<SelectItem value="video">Videos</SelectItem>
						<SelectItem value="article">Articles</SelectItem>
						<SelectItem value="course">Courses</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{filteredResources.length === 0 ? (
				<div className="text-center py-12">
					<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 mb-4">
						<Filter className="w-8 h-8 text-purple-600" />
					</div>
					<h3 className="text-lg font-semibold mb-2">No resources found</h3>
					<p className="text-muted-foreground mb-4">
						{searchTerm || filterType !== 'all'
							? 'Try adjusting your search or filters'
							: 'Check back later for new content'}
					</p>
					{(searchTerm || filterType !== 'all') && (
						<Button
							variant="outline"
							onClick={() => {
								setSearchTerm('');
								setFilterType('all');
							}}
						>
							Clear Filters
						</Button>
					)}
				</div>
			) : (
				<>
					<div className="mb-4 text-sm text-muted-foreground">
						Showing {filteredResources.length} of {resources.length} resources
					</div>
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{filteredResources.map((resource) => (
							<ResourceCard
								key={resource.id}
								resource={resource}
								onView={handleViewResource}
								onDownload={resource.r2Key ? handleDownload : undefined}
							/>
						))}
					</div>
				</>
			)}

			<Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>View Resource</DialogTitle>
						<DialogDescription>
							Access the external resource content below.
						</DialogDescription>
					</DialogHeader>
					{selectedResource && (
						<div className="py-4">
							<h3 className="font-medium text-lg mb-2">{selectedResource.title}</h3>
							<p className="text-sm text-gray-500 mb-4">{selectedResource.description}</p>

							<div className="bg-gray-50 p-4 rounded-md break-all">
								<p className="text-xs font-medium text-gray-500 mb-1">Resource Link:</p>
								<div className="flex items-center gap-2">
									<a
										href={selectedResource.contentUrl || '#'}
										target="_blank"
										rel="noopener noreferrer"
										className="text-purple-600 hover:text-purple-800 underline text-sm"
									>
										{selectedResource.contentUrl}
									</a>
									<ExternalLink className="w-3 h-3 text-purple-600" />
								</div>
							</div>
						</div>
					)}
					<DialogFooter>
						<Button
							type="button"
							variant="secondary"
							onClick={() => setIsModalOpen(false)}
						>
							Close
						</Button>
						<Button asChild>
							<a
								href={selectedResource?.contentUrl || '#'}
								target="_blank"
								rel="noopener noreferrer"
								onClick={() => setIsModalOpen(false)}
							>
								Open Resource
							</a>
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
