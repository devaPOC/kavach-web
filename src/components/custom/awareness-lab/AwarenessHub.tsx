'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import { Alert, AlertDescription } from '@/components/ui'
import {
  BookOpen,
  Search,
  Filter,
  Grid3X3,
  List,
  CheckCircle,
  Clock,
  ExternalLink,
  Play,
  FileText,
  ArrowLeft,
  RotateCcw,
  AlertCircle
} from 'lucide-react'
import {
  useAwarenessLabStore,
  useAwarenessLabActions,
  useAwarenessLabLoading,
  useAwarenessLabError,
  type LearningModule,
  type ModuleMaterial
} from '@/lib/stores/awareness-lab-store'

interface MaterialViewerProps {
  material: ModuleMaterial
  onComplete: () => void
  isCompleted: boolean
}

const MaterialViewer: React.FC<MaterialViewerProps> = ({ material, onComplete, isCompleted }) => {
  const [isLoading, setIsLoading] = useState(false)

  const handleComplete = async () => {
    if (isCompleted) return

    setIsLoading(true)
    try {
      await onComplete()
    } finally {
      setIsLoading(false)
    }
  }

  const renderMaterialContent = () => {
    switch (material.materialType) {
      case 'video':
        return (
          <div className="space-y-4">
            {material.materialData.url ? (
              <div className="p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <Play className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Watch this video content</p>
                  <a
                    href={material.materialData.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    <Play className="h-4 w-4" />
                    <span>Watch Video</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <div className="mt-3 text-sm text-gray-500 break-all">
                    {material.materialData.url}
                  </div>
                </div>
              </div>
            ) : null}

            {material.materialData.duration && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>Duration: {Math.floor(material.materialData.duration / 60)}:{(material.materialData.duration % 60).toString().padStart(2, '0')}</span>
              </div>
            )}
          </div>
        )

      case 'link':
        return (
          <div className="space-y-4">
            <div className="p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <ExternalLink className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">This material contains an external link</p>
                <a
                  href={material.materialData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  <span>Open Link</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        )

      case 'document':
        return (
          <div className="space-y-4">
            <div className="p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Document material</p>
                {material.materialData.fileUrl && (
                  <a
                    href={material.materialData.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    <span>View Document</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div className="p-6 bg-gray-50 rounded-lg">
            <p className="text-gray-600">Material type not supported</p>
          </div>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{material.title}</h3>
          {material.description && (
            <p className="text-gray-600">{material.description}</p>
          )}
        </div>

        {isCompleted ? (
          <Badge variant="default" className="bg-green-500 flex items-center space-x-1">
            <CheckCircle className="h-3 w-3" />
            <span>Completed</span>
          </Badge>
        ) : (
          <Button
            onClick={handleComplete}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Marking...' : 'Mark Complete'}
          </Button>
        )}
      </div>

      {renderMaterialContent()}
    </div>
  )
}

interface ModuleViewerProps {
  module: LearningModule
  onBack: () => void
}

const ModuleViewer: React.FC<ModuleViewerProps> = ({ module, onBack }) => {
  const { userProgress } = useAwarenessLabStore()
  const { markMaterialComplete } = useAwarenessLabActions()
  const [selectedMaterialIndex, setSelectedMaterialIndex] = useState(0)

  const materials = module.materials || []
  const selectedMaterial = materials[selectedMaterialIndex]

  // Calculate progress
  const completedMaterials = materials.filter(material => {
    const progressKey = `${module.id}-${material.id}`
    return userProgress[progressKey]?.isCompleted
  }).length

  const progressPercentage = materials.length > 0 ? Math.round((completedMaterials / materials.length) * 100) : 0

  const handleMaterialComplete = async () => {
    if (selectedMaterial) {
      await markMaterialComplete(module.id, selectedMaterial.id)
    }
  }

  const isMaterialCompleted = (material: ModuleMaterial) => {
    const progressKey = `${module.id}-${material.id}`
    return userProgress[progressKey]?.isCompleted || false
  }

  if (materials.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack} className="flex items-center space-x-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Modules</span>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{module.title}</CardTitle>
            {module.description && (
              <p className="text-gray-600">{module.description}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No materials available in this module yet.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack} className="flex items-center space-x-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Modules</span>
          </Button>
        </div>

        <Badge variant="outline" className="text-sm">
          {module.category}
        </Badge>
      </div>

      {/* Module Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{module.title}</CardTitle>
              {module.description && (
                <p className="text-gray-600 mt-2">{module.description}</p>
              )}
            </div>

            {progressPercentage === 100 ? (
              <Badge variant="default" className="bg-green-500 flex items-center space-x-1">
                <CheckCircle className="h-3 w-3" />
                <span>Completed</span>
              </Badge>
            ) : (
              <Badge variant="secondary">
                {progressPercentage}% Complete
              </Badge>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Progress</span>
              <span className="text-sm text-gray-600">
                {completedMaterials}/{materials.length} materials
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Materials List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Materials</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {materials.map((material, index) => (
                  <button
                    key={material.id}
                    onClick={() => setSelectedMaterialIndex(index)}
                    className={`w-full text-left p-3 hover:bg-gray-50 transition-colors border-l-4 ${selectedMaterialIndex === index
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-transparent'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {material.materialType === 'video' && <Play className="h-4 w-4 text-gray-500" />}
                        {material.materialType === 'link' && <ExternalLink className="h-4 w-4 text-gray-500" />}
                        {material.materialType === 'document' && <FileText className="h-4 w-4 text-gray-500" />}
                        <span className="text-sm font-medium truncate">{material.title}</span>
                      </div>
                      {isMaterialCompleted(material) && (
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Material Content */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-6">
              {selectedMaterial && (
                <MaterialViewer
                  material={selectedMaterial}
                  onComplete={handleMaterialComplete}
                  isCompleted={isMaterialCompleted(selectedMaterial)}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

interface ModuleCardProps {
  module: LearningModule
  progress: Record<string, any>
  onViewModule: (module: LearningModule) => void
  viewMode: 'grid' | 'list'
}

const ModuleCard: React.FC<ModuleCardProps> = ({ module, progress, onViewModule, viewMode }) => {
  const totalMaterials = module.materials?.length || 0

  // Calculate completed materials
  const completedMaterials = module.materials?.filter((material: any) => {
    const progressKey = `${module.id}-${material.id}`
    return progress && progress[progressKey]?.isCompleted
  }).length || 0

  const isCompleted = completedMaterials === totalMaterials && totalMaterials > 0
  const progressPercentage = totalMaterials > 0 ? Math.round((completedMaterials / totalMaterials) * 100) : 0

  if (viewMode === 'list') {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-start space-x-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">{module.title}</h3>
                  {module.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mt-1">{module.description}</p>
                  )}
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                      <BookOpen className="h-4 w-4" />
                      <span>{totalMaterials} materials</span>
                    </div>
                    {module.category && (
                      <Badge variant="outline" className="text-xs">
                        {module.category}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">
                      {completedMaterials}/{totalMaterials}
                    </div>
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  {isCompleted ? (
                    <Badge variant="default" className="bg-green-500 flex items-center space-x-1">
                      <CheckCircle className="h-3 w-3" />
                      <span>Completed</span>
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      {progressPercentage}%
                    </Badge>
                  )}

                  <Button
                    onClick={() => onViewModule(module)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isCompleted ? 'Review' : 'Continue'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
              {module.title}
            </CardTitle>
            {module.description && (
              <p className="text-sm text-gray-600 line-clamp-3">
                {module.description}
              </p>
            )}
          </div>
          {isCompleted ? (
            <Badge variant="default" className="bg-green-500 flex items-center space-x-1 ml-2">
              <CheckCircle className="h-3 w-3" />
              <span>Completed</span>
            </Badge>
          ) : (
            <Badge variant="secondary" className="ml-2">
              {progressPercentage}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Module Info */}
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <BookOpen className="h-4 w-4" />
              <span>{totalMaterials} materials</span>
            </div>
            {module.category && (
              <Badge variant="outline" className="text-xs">
                {module.category}
              </Badge>
            )}
          </div>

          {/* Progress Bar */}
          {totalMaterials > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Progress</span>
                <span className="text-sm text-gray-600">
                  {completedMaterials}/{totalMaterials}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <Button
              onClick={() => onViewModule(module)}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isCompleted ? 'Review Module' : 'Continue Learning'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface AwarenessHubProps {
  user?: {
    id: string;
    role: 'customer' | 'expert' | 'trainer' | 'admin';
    firstName: string;
    lastName: string;
  } | null;
}

export const AwarenessHub: React.FC<AwarenessHubProps> = ({ user }) => {
  const { learningModules, userProgress, currentModule } = useAwarenessLabStore()
  const { fetchLearningModules, setCurrentModule, clearError } = useAwarenessLabActions()
  const isLoading = useAwarenessLabLoading()
  const error = useAwarenessLabError()

  // Role-based functionality
  const isExpert = user?.role === 'expert'
  const isCustomer = user?.role === 'customer'
  const isAdmin = user?.role === 'admin'

  // Local state for filtering and view
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Load modules on mount
  useEffect(() => {
    fetchLearningModules()
  }, [fetchLearningModules])

  // Get unique categories
  const categories = Array.from(new Set(Array.isArray(learningModules) ? learningModules.map(module => module.category).filter(Boolean) : []))

  // Filter modules based on role and search criteria
  const filteredModules = Array.isArray(learningModules) ? learningModules.filter(module => {
    // Only show published modules
    if (!module.isPublished) return false;

    const matchesSearch = module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (module.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    const matchesCategory = selectedCategory === 'all' || module.category === selectedCategory

    return matchesSearch && matchesCategory
  }) : []

  // Role-specific welcome message for the hub
  const getHubWelcomeMessage = () => {
    if (isExpert) {
      return 'Explore learning materials to enhance your expertise and help customers'
    } else if (isCustomer) {
      return 'Explore learning materials to enhance your cybersecurity knowledge'
    }
    return 'Explore learning materials to enhance your cybersecurity knowledge'
  }

  const handleViewModule = (module: LearningModule) => {
    setCurrentModule(module)
  }

  const handleBackToModules = () => {
    setCurrentModule(null)
  }

  // If viewing a specific module, show the module viewer
  if (currentModule) {
    return (
      <ModuleViewer
        module={currentModule}
        onBack={handleBackToModules}
      />
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <button
            onClick={clearError}
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold text-gray-900">Awareness Hub</h2>
            {isExpert && (
              <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50">
                Expert
              </Badge>
            )}
          </div>
          <p className="text-gray-600">{getHubWelcomeMessage()}</p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search modules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="sm:w-48">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {filteredModules.length} of {Array.isArray(learningModules) ? learningModules.length : 0} modules
          {searchTerm && ` matching "${searchTerm}"`}
          {selectedCategory !== 'all' && ` in ${selectedCategory}`}
        </span>

        {(searchTerm || selectedCategory !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm('')
              setSelectedCategory('all')
            }}
            className="flex items-center space-x-1"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Clear filters</span>
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className={`grid gap-4 ${viewMode === 'grid'
          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          : 'grid-cols-1'
          }`}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredModules.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || selectedCategory !== 'all'
                ? 'No modules found'
                : 'No learning modules available'
              }
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedCategory !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : isExpert
                  ? 'Learning modules will appear here once they are published. As an expert, you can help create content.'
                  : 'Learning modules will appear here once they are published.'
              }
            </p>
            {(searchTerm || selectedCategory !== 'all') && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setSelectedCategory('all')
                }}
              >
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className={`grid gap-4 ${viewMode === 'grid'
          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          : 'grid-cols-1'
          }`}>
          {filteredModules.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              progress={userProgress}
              onViewModule={handleViewModule}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default AwarenessHub
