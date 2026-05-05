'use client'
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Copy,
  BookOpen,
  Link,
  Video,
  FileText,
  GripVertical,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  ExternalLink,
  Play,
  ArrowUp,
  ArrowDown,
  Settings
} from 'lucide-react'
import { FilterToolbar } from '@/app/components/filters/FilterToolbar'
import { useAdminAwarenessStore } from '@/lib/stores/admin-awareness-store'
import { type LearningModule, type ModuleMaterial } from '@/lib/stores/awareness-lab-store'
import MaterialCreateDialog from './MaterialCreateDialog'
import MaterialEditDialog from './MaterialEditDialog'
import MaterialDeleteDialog from './MaterialDeleteDialog'
import MaterialPreviewDialog from './MaterialPreviewDialog'
import ModuleCreateDialog from './ModuleCreateDialog'
import ModuleEditDialog from './ModuleEditDialog'
import ModuleDeleteDialog from './ModuleDeleteDialog'
import Pagination from '@/components/ui/pagination'
import { usePagination } from '@/hooks/usePagination'

interface MaterialFilters {
  category?: string
  isPublished?: boolean
  materialType?: 'link' | 'video' | 'document'
}

interface DragState {
  draggedItem: { type: 'module' | 'material'; id: string; moduleId?: string } | null
  dragOverItem: { type: 'module' | 'material'; id: string; moduleId?: string } | null
}

export default function MaterialsManager() {
  const {
    adminModules,
    totalModules,
    isLoading,
    error,
    actions: {
      fetchAdminModules,
      createModule,
      updateModule,
      deleteModule,
      publishModule,
      unpublishModule,
      reorderModules,
      clearError
    }
  } = useAdminAwarenessStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<MaterialFilters>({})

  // Pagination hook
  const pagination = usePagination({
    initialPage: 1,
    initialPageSize: 10,
    totalItems: totalModules,
    onPageChange: (page) => {
      fetchAdminModules(page, pagination.pageSize, filters)
    }
  })
  const [dragState, setDragState] = useState<DragState>({
    draggedItem: null,
    dragOverItem: null
  })

  // Dialog states
  const [showModuleCreateDialog, setShowModuleCreateDialog] = useState(false)
  const [showModuleEditDialog, setShowModuleEditDialog] = useState(false)
  const [showModuleDeleteDialog, setShowModuleDeleteDialog] = useState(false)
  const [showMaterialCreateDialog, setShowMaterialCreateDialog] = useState(false)
  const [showMaterialEditDialog, setShowMaterialEditDialog] = useState(false)
  const [showMaterialDeleteDialog, setShowMaterialDeleteDialog] = useState(false)
  const [showMaterialPreviewDialog, setShowMaterialPreviewDialog] = useState(false)

  // Selected items for operations
  const [selectedModule, setSelectedModule] = useState<LearningModule | null>(null)
  const [selectedMaterial, setSelectedMaterial] = useState<ModuleMaterial | null>(null)
  const [processingModuleId, setProcessingModuleId] = useState<string | null>(null)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set())

  const limit = 10

  useEffect(() => {
    fetchAdminModules(pagination.currentPage, pagination.pageSize, filters)
  }, [pagination.currentPage, pagination.pageSize, filters])

  const handleFilterChange = (newFilters: Partial<MaterialFilters>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)
    pagination.setCurrentPage(1) // Reset to first page when filters change
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    pagination.setCurrentPage(1) // Reset to first page when searching
  }

  // Debounce search to improve performance
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState(searchTerm)

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const handleModuleCreated = () => {
    fetchAdminModules(pagination.currentPage, pagination.pageSize, filters)
    setShowModuleCreateDialog(false)
  }

  const handleModuleUpdated = () => {
    fetchAdminModules(pagination.currentPage, pagination.pageSize, filters)
    setShowModuleEditDialog(false)
    setSelectedModule(null)
  }

  const handleModuleDeleted = () => {
    fetchAdminModules(pagination.currentPage, pagination.pageSize, filters)
    setShowModuleDeleteDialog(false)
    setSelectedModule(null)
  }

  const handleMaterialCreated = () => {
    fetchAdminModules(pagination.currentPage, pagination.pageSize, filters)
    setShowMaterialCreateDialog(false)
  }

  const handleMaterialUpdated = () => {
    fetchAdminModules(pagination.currentPage, pagination.pageSize, filters)
    setShowMaterialEditDialog(false)
    setSelectedMaterial(null)
  }

  const handleMaterialDeleted = () => {
    fetchAdminModules(pagination.currentPage, pagination.pageSize, filters)
    setShowMaterialDeleteDialog(false)
    setSelectedMaterial(null)
  }

  const handleEditModule = (module: LearningModule) => {
    setSelectedModule(module)
    setShowModuleEditDialog(true)
  }

  const handleDeleteModule = (module: LearningModule) => {
    setSelectedModule(module)
    setShowModuleDeleteDialog(true)
  }

  const handleEditMaterial = (material: ModuleMaterial) => {
    setSelectedMaterial(material)
    setShowMaterialEditDialog(true)
  }

  const handleDeleteMaterial = (material: ModuleMaterial) => {
    setSelectedMaterial(material)
    setShowMaterialDeleteDialog(true)
  }

  const handlePreviewMaterial = (material: ModuleMaterial) => {
    setSelectedMaterial(material)
    setShowMaterialPreviewDialog(true)
  }

  const handlePublishToggle = async (module: LearningModule) => {
    if (processingModuleId) return

    setProcessingModuleId(module.id)
    try {
      if (module.isPublished) {
        await unpublishModule(module.id)
      } else {
        await publishModule(module.id)
      }
    } finally {
      setProcessingModuleId(null)
    }
  }

  const toggleModuleExpansion = (moduleId: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev)
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId)
      } else {
        newSet.add(moduleId)
      }
      return newSet
    })
  }

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, type: 'module' | 'material', id: string, moduleId?: string) => {
    console.log('Drag start:', { type, id, moduleId })
    setDragState({
      draggedItem: { type, id, moduleId },
      dragOverItem: null
    })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', '') // Required for some browsers
  }

  const handleDragOver = (e: React.DragEvent, type: 'module' | 'material', id: string, moduleId?: string) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setDragState(prev => ({
      ...prev,
      dragOverItem: { type, id, moduleId }
    }))
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only clear dragOverItem if we're leaving the current target
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragState(prev => ({
        ...prev,
        dragOverItem: null
      }))
    }
  }

  const handleDragEnd = () => {
    console.log('Drag end')
    setDragState({ draggedItem: null, dragOverItem: null })
  }

  const handleDrop = async (e: React.DragEvent, type: 'module' | 'material', targetId: string, targetModuleId?: string) => {
    e.preventDefault()
    e.stopPropagation()

    const { draggedItem } = dragState
    console.log('Drop:', { draggedItem, type, targetId, targetModuleId })

    if (!draggedItem || draggedItem.id === targetId) {
      console.log('Early return: no draggedItem or same target')
      setDragState({ draggedItem: null, dragOverItem: null })
      return
    }

    try {
      if (draggedItem.type === 'module' && type === 'module') {
        console.log('Reordering modules')
        // Reorder modules
        const moduleIds = adminModules
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map(m => m.id)

        const draggedIndex = moduleIds.indexOf(draggedItem.id)
        const targetIndex = moduleIds.indexOf(targetId)

        console.log('Module indices:', { draggedIndex, targetIndex, moduleIds })

        if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
          const newOrder = [...moduleIds]
          newOrder.splice(draggedIndex, 1)
          newOrder.splice(targetIndex, 0, draggedItem.id)

          console.log('New module order:', newOrder)
          await reorderModules(newOrder)
        }
      } else if (draggedItem.type === 'material' && type === 'material' && draggedItem.moduleId === targetModuleId) {
        console.log('Reordering materials')
        // Reorder materials within the same module
        if (draggedItem.id !== targetId) {
          await reorderMaterials(draggedItem.moduleId!, draggedItem.id, targetId)
        }
      }
    } catch (error) {
      console.error('Failed to reorder items:', error)
    } finally {
      setDragState({ draggedItem: null, dragOverItem: null })
    }
  }

  const reorderMaterials = async (moduleId: string, draggedMaterialId: string, targetMaterialId: string) => {
    try {
      const response = await fetch(`/api/v1/admin/learning-modules/${moduleId}/materials/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          draggedMaterialId,
          targetMaterialId
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to reorder materials')
      }

      // Refresh modules to get updated order
      await fetchAdminModules(pagination.currentPage, pagination.pageSize, filters)
    } catch (error) {
      console.error('Failed to reorder materials:', error)
    }
  }

  const validateUrl = (url: string): { isValid: boolean; type: 'youtube' | 'vimeo' | 'link' | 'unknown' } => {
    try {
      const urlObj = new URL(url)

      if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
        return { isValid: true, type: 'youtube' }
      }

      if (urlObj.hostname.includes('vimeo.com')) {
        return { isValid: true, type: 'vimeo' }
      }

      return { isValid: true, type: 'link' }
    } catch {
      return { isValid: false, type: 'unknown' }
    }
  }

  const getStatusBadgeColor = (isPublished: boolean) => {
    return isPublished
      ? 'bg-secondary/10 text-secondary border-secondary/50'
      : 'bg-muted text-foreground border-border'
  }

  const getMaterialTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />
      case 'link':
        return <Link className="h-4 w-4" />
      case 'document':
        return <FileText className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getMaterialTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'video':
        return 'bg-destructive/10 text-destructive border-destructive'
      case 'link':
        return 'bg-primary/10 text-primary border-primary/50'
      case 'document':
        return 'bg-secondary/10 text-secondary border-secondary/50'
      default:
        return 'bg-muted text-foreground border-border'
    }
  }

  // Server-side filtering - no need to filter here since API handles it
  const displayedModules = adminModules.sort((a, b) => a.orderIndex - b.orderIndex)

  // Get unique categories for filtering (this could be moved to server-side too)
  const categories = Array.from(new Set(adminModules.map(m => m.category).filter(Boolean))).sort()

  // Update pagination total when totalModules changes
  React.useEffect(() => {
    pagination.setTotalItems(totalModules)
  }, [totalModules])

  // Update filters when search term changes (debounced)
  React.useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) return
    const updatedFilters = { ...filters, search: debouncedSearchTerm || undefined }
    setFilters(updatedFilters)
    pagination.setCurrentPage(1)
  }, [debouncedSearchTerm])



  // Calculate statistics (these are for current page only, could be moved to server-side)
  const publishedModules = adminModules.filter(m => m.isPublished).length
  const totalMaterials = adminModules.reduce((sum, m) => sum + (m.materials?.length || 0), 0)
  const videoMaterials = adminModules.reduce((sum, m) =>
    sum + (m.materials?.filter(mat => mat.materialType === 'video')?.length || 0), 0
  )

  if (isLoading && adminModules.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary/50"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Learning Materials Management
              </CardTitle>
              <CardDescription>
                Create and manage learning modules and educational content
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowModuleCreateDialog(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Module
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-primary/10 p-4 rounded-lg border border-primary/50">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Total Modules</span>
              </div>
              <p className="text-2xl font-bold text-primary mt-1">{totalModules}</p>
            </div>
            <div className="bg-secondary/10 p-4 rounded-lg border border-secondary/50">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-secondary" />
                <span className="text-sm font-medium text-secondary">Published</span>
              </div>
              <p className="text-2xl font-bold text-secondary mt-1">{publishedModules}</p>
            </div>
            <div className="bg-accent/10 p-4 rounded-lg border border-primary/50">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-primary">Total Materials</span>
              </div>
              <p className="text-2xl font-bold text-primary mt-1">{totalMaterials}</p>
            </div>
            <div className="bg-destructive/10 p-4 rounded-lg border border-destructive">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">Video Content</span>
              </div>
              <p className="text-2xl font-bold text-destructive mt-1">{videoMaterials}</p>
            </div>
          </div>

          {/* Filters and Search */}
          {/* Filters and Search using FilterToolbar */}
          <div className="mb-6">
            <FilterToolbar
              searchValue={searchTerm}
              onSearchChange={handleSearchChange}
              placeholder="Search modules..."

              filterValues={{
                status: filters.isPublished === true ? 'published' : filters.isPublished === false ? 'drafts' : 'all',
                category: filters.category || 'all'
              }}

              onFilterChange={(id, value) => {
                if (id === 'status') {
                  handleFilterChange({
                    isPublished: value === 'published' ? true : value === 'drafts' ? false : undefined
                  });
                }
                if (id === 'category') {
                  handleFilterChange({ category: value === 'all' ? undefined : value });
                }
              }}

              filters={[
                {
                  id: 'status',
                  label: 'Status',
                  type: 'chips',
                  options: [
                    { value: 'published', label: 'Published', icon: <CheckCircle className="h-3 w-3 text-secondary" /> },
                    { value: 'drafts', label: 'Drafts', icon: <XCircle className="h-3 w-3 text-muted-foreground/80" /> },
                  ]
                },
                {
                  id: 'category',
                  label: 'Category',
                  type: 'select',
                  options: categories.map(c => ({ value: c, label: c }))
                }
              ]}

              onClearAll={() => {
                handleFilterChange({ isPublished: undefined, category: undefined });
                handleSearchChange('');
              }}
            />
          </div>

          <div className="space-y-4">
            {/* Error Display */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
                <p className="text-sm text-destructive">{error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearError}
                  className="mt-2 text-destructive hover:text-destructive"
                >
                  Dismiss
                </Button>
              </div>
            )}

            {/* Modules List */}
            <div className="space-y-4 relative">
              {isLoading && (
                <div className="absolute inset-0 bg-card/50 flex items-center justify-center z-10">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary/50"></div>
                </div>
              )}
              {displayedModules.map((module) => (
                <Card
                  key={module.id}
                  className={`transition-all duration-200 ${dragState.dragOverItem?.type === 'module' && dragState.dragOverItem.id === module.id
                    ? 'border-primary/50 bg-primary/10'
                    : 'hover:shadow-md'
                    } ${dragState.draggedItem?.type === 'module' && dragState.draggedItem.id === module.id
                      ? 'opacity-50'
                      : ''}`}
                  onDragOver={(e) => handleDragOver(e, 'module', module.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, 'module', module.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div
                          className="cursor-move mt-1 p-1 rounded hover:bg-muted transition-colors"
                          draggable
                          onDragStart={(e) => handleDragStart(e, 'module', module.id)}
                          onDragEnd={handleDragEnd}
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground/80" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-lg font-semibold text-foreground">
                              {module.title}
                            </CardTitle>
                            <Badge className={getStatusBadgeColor(module.isPublished)}>
                              {module.isPublished ? 'Published' : 'Draft'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {module.category}
                            </Badge>
                          </div>
                          {module.description && (
                            <CardDescription className="text-sm text-muted-foreground mb-2">
                              {module.description}
                            </CardDescription>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{module.materials?.length || 0} materials</span>
                            <span>Order: {module.orderIndex}</span>
                            <span>Created {new Date(module.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleModuleExpansion(module.id)}
                          className="flex items-center gap-1"
                        >
                          {expandedModules.has(module.id) ?
                            <ArrowUp className="h-3 w-3" /> :
                            <ArrowDown className="h-3 w-3" />
                          }
                          {expandedModules.has(module.id) ? 'Collapse' : 'Expand'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditModule(module)}
                          className="flex items-center gap-1 text-secondary hover:text-secondary hover:bg-secondary/10"
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePublishToggle(module)}
                          disabled={processingModuleId === module.id}
                          className={`flex items-center gap-1 ${module.isPublished
                            ? 'text-accent hover:text-accent hover:bg-accent/10'
                            : 'text-secondary hover:text-secondary hover:bg-secondary/10'
                            }`}
                        >
                          {module.isPublished ? <XCircle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                          {processingModuleId === module.id ? 'Processing...' :
                            module.isPublished ? 'Unpublish' : 'Publish'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteModule(module)}
                          disabled={processingModuleId === module.id}
                          className="flex items-center gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Materials Section */}
                  {expandedModules.has(module.id) && (
                    <CardContent className="pt-0">
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-foreground/80">Materials ({module.materials?.length || 0})</h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedModule(module)
                              setShowMaterialCreateDialog(true)
                            }}
                            className="flex items-center gap-1 text-primary hover:text-primary hover:bg-primary/10"
                          >
                            <Plus className="h-3 w-3" />
                            Add Material
                          </Button>
                        </div>

                        {(!module.materials || module.materials.length === 0) ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/80" />
                            <p className="text-sm">No materials yet</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedModule(module)
                                setShowMaterialCreateDialog(true)
                              }}
                              className="mt-2 text-primary hover:text-primary"
                            >
                              Add the first material
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {(module.materials || [])
                              .sort((a, b) => a.orderIndex - b.orderIndex)
                              .map((material) => (
                                <div
                                  key={material.id}
                                  className={`flex items-center gap-3 p-3 border rounded-lg transition-all duration-200 ${dragState.dragOverItem?.type === 'material' &&
                                    dragState.dragOverItem.id === material.id
                                    ? 'border-primary/50 bg-primary/10'
                                    : 'hover:bg-muted/50'
                                    } ${dragState.draggedItem?.type === 'material' && dragState.draggedItem.id === material.id
                                      ? 'opacity-50'
                                      : ''
                                    }`}
                                  onDragOver={(e) => handleDragOver(e, 'material', material.id, module.id)}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => handleDrop(e, 'material', material.id, module.id)}
                                >
                                  <div
                                    className="cursor-move p-1 rounded hover:bg-muted/80 transition-colors"
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, 'material', material.id, module.id)}
                                    onDragEnd={handleDragEnd}
                                  >
                                    <GripVertical className="h-3 w-3 text-muted-foreground/80" />
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {getMaterialTypeIcon(material.materialType)}
                                    <Badge className={getMaterialTypeBadgeColor(material.materialType)}>
                                      {material.materialType}
                                    </Badge>
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm text-foreground truncate">{material.title}</div>
                                    {material.description && (
                                      <div className="text-xs text-muted-foreground">
                                        {material.description.length > 100 ? (
                                          <>
                                            <p className={expandedDescriptions.has(material.id) ? '' : 'line-clamp-2'}>
                                              {expandedDescriptions.has(material.id)
                                                ? material.description
                                                : `${material.description.substring(0, 100)}...`
                                              }
                                            </p>
                                            <button
                                              className="text-primary hover:text-primary underline text-xs mt-1"
                                              onClick={() => {
                                                const newExpanded = new Set(expandedDescriptions);
                                                if (expandedDescriptions.has(material.id)) {
                                                  newExpanded.delete(material.id);
                                                } else {
                                                  newExpanded.add(material.id);
                                                }
                                                setExpandedDescriptions(newExpanded);
                                              }}
                                            >
                                              {expandedDescriptions.has(material.id) ? 'Show less' : 'Show more'}
                                            </button>
                                          </>
                                        ) : (
                                          <p className="line-clamp-2">{material.description}</p>
                                        )}
                                      </div>
                                    )}
                                    {material.materialData.url && (
                                      <div className="text-xs text-primary truncate">
                                        {validateUrl(material.materialData.url).type === 'youtube' && 'YouTube'}
                                        {validateUrl(material.materialData.url).type === 'vimeo' && 'Vimeo'}
                                        {validateUrl(material.materialData.url).type === 'link' && 'External Link'}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {material.materialData.url && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handlePreviewMaterial(material)}
                                        className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
                                      >
                                        {material.materialType === 'video' ? (
                                          <Play className="h-3 w-3" />
                                        ) : (
                                          <ExternalLink className="h-3 w-3" />
                                        )}
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditMaterial(material)}
                                      className="h-8 w-8 p-0 text-secondary hover:text-secondary hover:bg-secondary/10"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteMaterial(material)}
                                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>

            {/* Empty State */}
            {displayedModules.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground/80 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No modules found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || Object.keys(filters).length > 0
                    ? 'Try adjusting your search terms or filters.'
                    : 'Get started by creating your first learning module.'}
                </p>
                {!searchTerm && Object.keys(filters).length === 0 && (
                  <Button onClick={() => setShowModuleCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Module
                  </Button>
                )}
              </div>
            )}

            {/* Enhanced Pagination */}
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={totalModules}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setCurrentPage}
              onPageSizeChange={pagination.setPageSize}
              showPageSizeSelector={true}
              pageSizeOptions={[5, 10, 20, 50]}
              showGoToPage={true}
              showKeyboardHints={true}
            />
          </div>
        </CardContent >
      </Card >

      {/* Dialogs */}
      < ModuleCreateDialog
        open={showModuleCreateDialog}
        onOpenChange={setShowModuleCreateDialog}
        onModuleCreated={handleModuleCreated}
      />

      <ModuleEditDialog
        open={showModuleEditDialog}
        onOpenChange={setShowModuleEditDialog}
        module={selectedModule}
        onModuleUpdated={handleModuleUpdated}
      />

      <ModuleDeleteDialog
        open={showModuleDeleteDialog}
        onOpenChange={setShowModuleDeleteDialog}
        module={selectedModule}
        onModuleDeleted={handleModuleDeleted}
      />

      <MaterialCreateDialog
        open={showMaterialCreateDialog}
        onOpenChange={setShowMaterialCreateDialog}
        module={selectedModule}
        onMaterialCreated={handleMaterialCreated}
      />

      <MaterialEditDialog
        open={showMaterialEditDialog}
        onOpenChange={setShowMaterialEditDialog}
        material={selectedMaterial}
        onMaterialUpdated={handleMaterialUpdated}
      />

      <MaterialDeleteDialog
        open={showMaterialDeleteDialog}
        onOpenChange={setShowMaterialDeleteDialog}
        material={selectedMaterial}
        onMaterialDeleted={handleMaterialDeleted}
      />

      <MaterialPreviewDialog
        open={showMaterialPreviewDialog}
        onOpenChange={setShowMaterialPreviewDialog}
        material={selectedMaterial}
      />
    </div >
  )
}
