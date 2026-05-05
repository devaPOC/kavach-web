'use client'

import React, { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Edit, Trash2, Eye, EyeOff, FileText, Video, File, Link as LinkIcon, Download } from 'lucide-react'
import { TrainerResource } from '../../../../../types/resource'
import { ResourceFileUploader } from '@/components/custom/trainer/ResourceFileUploader'

interface UploadedFile {
	fileName: string;
	fileSize: number;
	fileType: string;
	r2Key: string;
	contentUrl: string;
	category: 'image' | 'document' | 'video';
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getResourceIcon(resource: TrainerResource) {
	if (resource.r2Key) {
		if (resource.fileType?.startsWith('video/')) {
			return <Video className="h-5 w-5 text-purple-500" />;
		}
		if (resource.fileType === 'application/pdf') {
			return <FileText className="h-5 w-5 text-red-500" />;
		}
		if (resource.fileType?.includes('word') || resource.fileType?.includes('document')) {
			return <FileText className="h-5 w-5 text-blue-500" />;
		}
		if (resource.fileType?.includes('powerpoint') || resource.fileType?.includes('presentation')) {
			return <FileText className="h-5 w-5 text-orange-500" />;
		}
		return <File className="h-5 w-5 text-gray-500" />;
	}
	return <LinkIcon className="h-5 w-5 text-gray-500" />;
}

export default function AdminTrainerResourcesPage() {
	const [resources, setResources] = useState<TrainerResource[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string>('')
	const [showCreateDialog, setShowCreateDialog] = useState(false)
	const [showEditDialog, setShowEditDialog] = useState(false)
	const [selectedResource, setSelectedResource] = useState<TrainerResource | null>(null)
	const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file')
	const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
	const [formData, setFormData] = useState({
		title: '',
		description: '',
		contentUrl: '',
		isPublished: false
	})

	useEffect(() => {
		fetchResources()
	}, [])

	const fetchResources = async () => {
		try {
			setLoading(true)
			const result = await apiClient.admin.getTrainerResources()
			if (result.success && result.data) {
				setResources(result.data)
			} else {
				setError(result.error || 'Failed to fetch resources')
			}
		} catch (err: any) {
			setError(err.message || 'Failed to fetch resources')
		} finally {
			setLoading(false)
		}
	}

	const handleCreate = async () => {
		try {
			// Prepare data based on upload mode
			const createData: any = {
				title: formData.title,
				description: formData.description,
				isPublished: formData.isPublished,
				resourceType: uploadedFile?.category === 'video' ? 'video' : 'document',
			}

			if (uploadMode === 'file' && uploadedFile) {
				createData.fileName = uploadedFile.fileName
				createData.fileSize = uploadedFile.fileSize
				createData.fileType = uploadedFile.fileType
				createData.r2Key = uploadedFile.r2Key
				createData.contentUrl = uploadedFile.contentUrl
			} else if (uploadMode === 'url') {
				createData.contentUrl = formData.contentUrl
			}

			const result = await apiClient.admin.createTrainerResource(createData)
			if (result.success) {
				fetchResources()
				setShowCreateDialog(false)
				resetForm()
			} else {
				setError(result.error || 'Failed to create resource')
			}
		} catch (err: any) {
			setError(err.message || 'Failed to create resource')
		}
	}

	const handleEdit = async () => {
		if (!selectedResource) return

		try {
			const updateData: any = {
				title: formData.title,
				description: formData.description,
				isPublished: formData.isPublished,
			}

			// If there's a new file upload
			if (uploadedFile) {
				updateData.fileName = uploadedFile.fileName
				updateData.fileSize = uploadedFile.fileSize
				updateData.fileType = uploadedFile.fileType
				updateData.r2Key = uploadedFile.r2Key
				updateData.contentUrl = uploadedFile.contentUrl
				updateData.resourceType = uploadedFile.category === 'video' ? 'video' : 'document'
			} else if (uploadMode === 'url') {
				updateData.contentUrl = formData.contentUrl
			}

			const result = await apiClient.admin.updateTrainerResource(selectedResource.id, updateData)
			if (result.success) {
				fetchResources()
				setShowEditDialog(false)
				setSelectedResource(null)
				resetForm()
			} else {
				setError(result.error || 'Failed to update resource')
			}
		} catch (err: any) {
			setError(err.message || 'Failed to update resource')
		}
	}

	const handleDelete = async (id: string) => {
		if (!confirm('Are you sure you want to delete this resource?')) return

		try {
			const result = await apiClient.admin.deleteTrainerResource(id)
			if (result.success) {
				fetchResources()
			} else {
				setError(result.error || 'Failed to delete resource')
			}
		} catch (err: any) {
			setError(err.message || 'Failed to delete resource')
		}
	}

	const handleTogglePublish = async (resource: TrainerResource) => {
		try {
			const result = await apiClient.admin.updateTrainerResource(resource.id, {
				isPublished: !resource.isPublished
			})
			if (result.success) {
				fetchResources()
			} else {
				setError(result.error || 'Failed to toggle publish status')
			}
		} catch (err: any) {
			setError(err.message || 'Failed to toggle publish status')
		}
	}

	const openEditDialog = (resource: TrainerResource) => {
		setSelectedResource(resource)
		setFormData({
			title: resource.title,
			description: resource.description ?? '',
			contentUrl: resource.contentUrl ?? '',
			isPublished: resource.isPublished
		})
		// Set upload mode based on whether resource has a file
		setUploadMode(resource.r2Key ? 'file' : 'url')
		// Set uploaded file info if exists
		if (resource.r2Key && resource.fileName && resource.fileSize && resource.fileType) {
			setUploadedFile({
				fileName: resource.fileName,
				fileSize: resource.fileSize,
				fileType: resource.fileType,
				r2Key: resource.r2Key,
				contentUrl: resource.contentUrl || '',
				category: resource.fileType.startsWith('video/') ? 'video' : 'document'
			})
		} else {
			setUploadedFile(null)
		}
		setShowEditDialog(true)
	}

	const resetForm = () => {
		setFormData({
			title: '',
			description: '',
			contentUrl: '',
			isPublished: false
		})
		setUploadMode('file')
		setUploadedFile(null)
		setError('')
	}

	const openCreateDialog = () => {
		resetForm()
		setShowCreateDialog(true)
	}

	return (
		<div className="p-4 lg:p-8">
			<div className="mb-8 flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900 mb-2">Trainer Resources</h1>
					<p className="text-gray-600">
						Upload and manage exclusive resources for trainers
					</p>
				</div>
				<Button onClick={openCreateDialog}>
					<Plus className="h-4 w-4 mr-2" />
					Add Resource
				</Button>
			</div>

			{error && (
				<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
					<p className="text-sm text-red-600">{error}</p>
					<button onClick={() => setError('')} className="text-xs text-red-500 underline mt-1">
						Dismiss
					</button>
				</div>
			)}

			{loading ? (
				<div className="text-center py-12">
					<p className="text-gray-600">Loading resources...</p>
				</div>
			) : resources.length === 0 ? (
				<Card>
					<CardContent className="py-12 text-center">
						<FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
						<p className="text-gray-600 mb-4">No resources created yet</p>
						<Button onClick={openCreateDialog}>
							<Plus className="h-4 w-4 mr-2" />
							Add First Resource
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{resources.map((resource) => (
						<Card key={resource.id}>
							<CardHeader>
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-1">
											{getResourceIcon(resource)}
											<CardTitle className="text-lg">{resource.title}</CardTitle>
										</div>
										<CardDescription className="mt-2">
											{resource.description}
										</CardDescription>
									</div>
									<Badge variant={resource.isPublished ? 'default' : 'secondary'}>
										{resource.isPublished ? 'Published' : 'Draft'}
									</Badge>
								</div>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									{resource.r2Key ? (
										<div className="text-sm text-gray-600">
											<span className="font-medium">File:</span> {resource.fileName}
											<br />
											<span className="text-xs text-gray-500">
												{resource.fileSize && formatFileSize(resource.fileSize)}
											</span>
										</div>
									) : (
										<p className="text-sm text-gray-600 truncate">
											<span className="font-medium">URL:</span> {resource.contentUrl}
										</p>
									)}
									<p className="text-xs text-gray-500">
										Created {new Date(resource.createdAt).toLocaleDateString()}
									</p>
									<div className="flex gap-2 pt-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => openEditDialog(resource)}
										>
											<Edit className="h-3 w-3" />
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleTogglePublish(resource)}
											title={resource.isPublished ? 'Unpublish' : 'Publish'}
										>
											{resource.isPublished ? (
												<EyeOff className="h-3 w-3" />
											) : (
												<Eye className="h-3 w-3" />
											)}
										</Button>
										{resource.contentUrl && (
											<Button
												variant="outline"
												size="sm"
												asChild
											>
												<a href={resource.contentUrl} target="_blank" rel="noopener noreferrer">
													<Download className="h-3 w-3" />
												</a>
											</Button>
										)}
										<Button
											variant="destructive"
											size="sm"
											onClick={() => handleDelete(resource.id)}
										>
											<Trash2 className="h-3 w-3" />
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* Create Dialog */}
			<Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Add Trainer Resource</DialogTitle>
						<DialogDescription>
							Upload a file or add a link to an external resource
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div>
							<label className="text-sm font-medium">Title</label>
							<Input
								value={formData.title}
								onChange={(e) => setFormData({ ...formData, title: e.target.value })}
								placeholder="Resource title"
							/>
						</div>
						<div>
							<label className="text-sm font-medium">Description</label>
							<Textarea
								value={formData.description}
								onChange={(e) => setFormData({ ...formData, description: e.target.value })}
								placeholder="Brief description"
								rows={3}
							/>
						</div>

						<Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as 'file' | 'url')}>
							<TabsList className="grid w-full grid-cols-2">
								<TabsTrigger value="file">Upload File</TabsTrigger>
								<TabsTrigger value="url">External URL</TabsTrigger>
							</TabsList>
							<TabsContent value="file" className="mt-4">
								<ResourceFileUploader
									onUploadComplete={(file) => {
										setUploadedFile(file)
										setError('')
									}}
									onUploadError={(err) => setError(err)}
									currentFile={uploadedFile}
									onRemoveFile={() => setUploadedFile(null)}
								/>
							</TabsContent>
							<TabsContent value="url" className="mt-4">
								<div>
									<label className="text-sm font-medium">Content URL</label>
									<Input
										value={formData.contentUrl}
										onChange={(e) => setFormData({ ...formData, contentUrl: e.target.value })}
										placeholder="https://example.com/file.pdf"
									/>
									<p className="text-xs text-muted-foreground mt-1">
										Link to an external resource (Google Drive, YouTube, etc.)
									</p>
								</div>
							</TabsContent>
						</Tabs>

						<div className="flex items-center gap-2">
							<input
								type="checkbox"
								id="isPublished"
								checked={formData.isPublished}
								onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
								className="rounded"
							/>
							<label htmlFor="isPublished" className="text-sm font-medium">
								Publish immediately
							</label>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowCreateDialog(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleCreate}
							disabled={!formData.title || (uploadMode === 'file' && !uploadedFile) || (uploadMode === 'url' && !formData.contentUrl)}
						>
							Add Resource
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Edit Dialog */}
			<Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Edit Trainer Resource</DialogTitle>
						<DialogDescription>
							Update resource information
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div>
							<label className="text-sm font-medium">Title</label>
							<Input
								value={formData.title}
								onChange={(e) => setFormData({ ...formData, title: e.target.value })}
								placeholder="Resource title"
							/>
						</div>
						<div>
							<label className="text-sm font-medium">Description</label>
							<Textarea
								value={formData.description}
								onChange={(e) => setFormData({ ...formData, description: e.target.value })}
								placeholder="Brief description"
								rows={3}
							/>
						</div>

						<Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as 'file' | 'url')}>
							<TabsList className="grid w-full grid-cols-2">
								<TabsTrigger value="file">Upload File</TabsTrigger>
								<TabsTrigger value="url">External URL</TabsTrigger>
							</TabsList>
							<TabsContent value="file" className="mt-4">
								<ResourceFileUploader
									onUploadComplete={(file) => {
										setUploadedFile(file)
										setError('')
									}}
									onUploadError={(err) => setError(err)}
									currentFile={uploadedFile}
									onRemoveFile={() => setUploadedFile(null)}
								/>
							</TabsContent>
							<TabsContent value="url" className="mt-4">
								<div>
									<label className="text-sm font-medium">Content URL</label>
									<Input
										value={formData.contentUrl}
										onChange={(e) => setFormData({ ...formData, contentUrl: e.target.value })}
										placeholder="https://example.com/file.pdf"
									/>
									<p className="text-xs text-muted-foreground mt-1">
										Link to an external resource (Google Drive, YouTube, etc.)
									</p>
								</div>
							</TabsContent>
						</Tabs>

						<div className="flex items-center gap-2">
							<input
								type="checkbox"
								id="edit-isPublished"
								checked={formData.isPublished}
								onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
								className="rounded"
							/>
							<label htmlFor="edit-isPublished" className="text-sm font-medium">
								Published
							</label>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowEditDialog(false)}>
							Cancel
						</Button>
						<Button onClick={handleEdit}>Save Changes</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
