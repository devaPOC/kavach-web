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
  FileText as FileTemplate,
  Clock,
  Users,
  Globe,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Settings
} from 'lucide-react'
import { useAdminAwarenessStore, type QuizTemplate } from '@/lib/stores/admin-awareness-store'
import TemplateCreateDialog from './TemplateCreateDialog'
import TemplateEditDialog from './TemplateEditDialog'
import TemplateDeleteDialog from './TemplateDeleteDialog'
import TemplatePreviewDialog from './TemplatePreviewDialog'

interface TemplateFilters {
  language?: 'en' | 'ar'
  usageCount?: 'high' | 'low' | 'unused'
}

export default function TemplateManager() {
  const {
    quizTemplates,
    isLoading,
    error,
    actions: {
      fetchTemplates,
      deleteTemplate,
      clearError
    }
  } = useAdminAwarenessStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState<TemplateFilters>({})
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  
  // Selected template for operations
  const [selectedTemplate, setSelectedTemplate] = useState<QuizTemplate | null>(null)
  const [processingTemplateId, setProcessingTemplateId] = useState<string | null>(null)

  const limit = 10

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleFilterChange = (newFilters: Partial<TemplateFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setCurrentPage(1) // Reset to first page when filters change
  }

  const handleTemplateCreated = () => {
    fetchTemplates()
    setShowCreateDialog(false)
  }

  const handleTemplateUpdated = () => {
    fetchTemplates()
    setShowEditDialog(false)
    setSelectedTemplate(null)
  }

  const handleTemplateDeleted = () => {
    fetchTemplates()
    setShowDeleteDialog(false)
    setSelectedTemplate(null)
  }

  const handleEditTemplate = (template: QuizTemplate) => {
    setSelectedTemplate(template)
    setShowEditDialog(true)
  }

  const handleDeleteTemplate = (template: QuizTemplate) => {
    setSelectedTemplate(template)
    setShowDeleteDialog(true)
  }

  const handlePreviewTemplate = (template: QuizTemplate) => {
    setSelectedTemplate(template)
    setShowPreviewDialog(true)
  }

  const handleDuplicateTemplate = async (template: QuizTemplate) => {
    if (processingTemplateId) return

    setProcessingTemplateId(template.id)
    try {
      // Create a duplicate template with modified name
      const duplicateData = {
        name: `${template.name} (Copy)`,
        description: template.description,
        templateConfig: { ...template.templateConfig }
      }

      const response = await fetch('/api/v1/admin/quiz-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify(duplicateData)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        fetchTemplates()
      } else {
        throw new Error(result.error || 'Failed to duplicate template')
      }
    } catch (err: any) {
      console.error('Failed to duplicate template:', err)
    } finally {
      setProcessingTemplateId(null)
    }
  }

  const getLanguageBadgeColor = (language: string) => {
    return language === 'ar' 
      ? 'bg-primary/10 text-primary border-primary/50'
      : 'bg-primary/10 text-primary border-primary/50'
  }

  const getUsageBadgeColor = (usageCount: number) => {
    if (usageCount === 0) return 'bg-muted text-foreground border-border'
    if (usageCount < 5) return 'bg-accent/10 text-accent border-accent/50'
    return 'bg-secondary/10 text-secondary border-secondary/50'
  }

  const getUsageLabel = (usageCount: number) => {
    if (usageCount === 0) return 'Unused'
    if (usageCount === 1) return '1 use'
    return `${usageCount} uses`
  }

  // Apply filters and search
  const filteredTemplates = quizTemplates.filter(template => {
    const matchesSearch = 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesLanguage = !filters.language || template.templateConfig.language === filters.language
    
    const matchesUsage = !filters.usageCount || 
      (filters.usageCount === 'unused' && template.usageCount === 0) ||
      (filters.usageCount === 'low' && template.usageCount > 0 && template.usageCount < 5) ||
      (filters.usageCount === 'high' && template.usageCount >= 5)
    
    return matchesSearch && matchesLanguage && matchesUsage
  })

  // Pagination
  const totalPages = Math.ceil(filteredTemplates.length / limit)
  const startIndex = (currentPage - 1) * limit
  const paginatedTemplates = filteredTemplates.slice(startIndex, startIndex + limit)

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  // Calculate statistics
  const totalTemplates = quizTemplates.length
  const unusedTemplates = quizTemplates.filter(t => t.usageCount === 0).length
  const highUsageTemplates = quizTemplates.filter(t => t.usageCount >= 5).length
  const arabicTemplates = quizTemplates.filter(t => t.templateConfig.language === 'ar').length

  if (isLoading && quizTemplates.length === 0) {
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
                <FileTemplate className="h-5 w-5" />
                Quiz Template Management
              </CardTitle>
              <CardDescription>
                Create and manage reusable quiz templates for efficient quiz creation
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Template Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-primary/10 p-4 rounded-lg border border-primary/50">
              <div className="flex items-center gap-2">
                <FileTemplate className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Total Templates</span>
              </div>
              <p className="text-2xl font-bold text-primary mt-1">{totalTemplates}</p>
            </div>
            <div className="bg-secondary/10 p-4 rounded-lg border border-secondary/50">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-secondary" />
                <span className="text-sm font-medium text-secondary">High Usage</span>
              </div>
              <p className="text-2xl font-bold text-secondary mt-1">{highUsageTemplates}</p>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground/80">Unused</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">{unusedTemplates}</p>
            </div>
            <div className="bg-accent/10 p-4 rounded-lg border border-primary/50">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-primary">Arabic Templates</span>
              </div>
              <p className="text-2xl font-bold text-primary mt-1">{arabicTemplates}</p>
            </div>
          </div>

          {/* Filters and Search */}
          <Tabs defaultValue="all" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger 
                  value="all" 
                  onClick={() => handleFilterChange({ usageCount: undefined })}
                >
                  All Templates
                </TabsTrigger>
                <TabsTrigger 
                  value="high-usage"
                  onClick={() => handleFilterChange({ usageCount: 'high' })}
                >
                  High Usage
                </TabsTrigger>
                <TabsTrigger 
                  value="unused"
                  onClick={() => handleFilterChange({ usageCount: 'unused' })}
                >
                  Unused
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/80" />
                  <Input
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button
                  variant={filters.language === 'ar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterChange({ 
                    language: filters.language === 'ar' ? undefined : 'ar' 
                  })}
                  className="flex items-center gap-2"
                >
                  <Globe className="h-4 w-4" />
                  Arabic Only
                </Button>
              </div>
            </div>

            <TabsContent value="all" className="space-y-4">
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

              {/* Templates Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedTemplates.map((template) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold text-foreground mb-1">
                            {template.name}
                          </CardTitle>
                          {template.description && (
                            <CardDescription className="text-sm text-muted-foreground line-clamp-2">
                              {template.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getLanguageBadgeColor(template.templateConfig.language)}>
                          {template.templateConfig.language === 'ar' ? 'Arabic' : 'English'}
                        </Badge>
                        <Badge className={getUsageBadgeColor(template.usageCount)}>
                          {getUsageLabel(template.usageCount)}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="space-y-2 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>{template.templateConfig.timeLimitMinutes} minutes</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3" />
                          <span>{template.templateConfig.maxAttempts} max attempts</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileTemplate className="h-3 w-3" />
                          <span>{template.templateConfig.defaultQuestionCount} questions</span>
                        </div>
                        <div className="text-xs text-muted-foreground/80">
                          Created {new Date(template.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreviewTemplate(template)}
                          className="flex-1 text-primary hover:text-primary hover:bg-primary/10"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditTemplate(template)}
                          className="flex-1 text-secondary hover:text-secondary hover:bg-secondary/10"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicateTemplate(template)}
                          disabled={processingTemplateId === template.id}
                          className="flex-1 text-accent hover:text-primary hover:bg-accent/10"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          {processingTemplateId === template.id ? 'Duplicating...' : 'Duplicate'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template)}
                          disabled={processingTemplateId === template.id}
                          className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Empty State */}
              {paginatedTemplates.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <FileTemplate className="h-12 w-12 text-muted-foreground/80 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No templates found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || Object.keys(filters).length > 0 
                      ? 'Try adjusting your search terms or filters.' 
                      : 'Get started by creating your first quiz template.'}
                  </p>
                  {!searchTerm && Object.keys(filters).length === 0 && (
                    <Button onClick={() => setShowCreateDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Template
                    </Button>
                  )}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(startIndex + limit, filteredTemplates.length)} of {filteredTemplates.length} templates
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1"
                    >
                      <ChevronLeft className="h-3 w-3" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1"
                    >
                      Next
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <TemplateCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onTemplateCreated={handleTemplateCreated}
      />

      <TemplateEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        template={selectedTemplate}
        onTemplateUpdated={handleTemplateUpdated}
      />

      <TemplateDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        template={selectedTemplate}
        onTemplateDeleted={handleTemplateDeleted}
      />

      <TemplatePreviewDialog
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
        template={selectedTemplate}
      />
    </div>
  )
}