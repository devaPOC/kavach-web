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
  FileText,
  Clock,
  Users,
  Globe,
  CheckCircle,
  XCircle,
  MoreHorizontal
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import QuizCreateDialog from './QuizCreateDialog'
import QuizEditDialog from './QuizEditDialog'
import QuizDeleteDialog from './QuizDeleteDialog'
import QuizPreviewDialog from './QuizPreviewDialog'
import QuizDuplicateDialog from './QuizDuplicateDialog'
import Pagination from '@/components/ui/pagination'
import { usePagination } from '@/hooks/usePagination'

interface Quiz {
  id: string
  title: string
  description?: string
  language: 'en' | 'ar'
  timeLimitMinutes: number
  maxAttempts: number
  isPublished: boolean
  questionCount: number
  createdBy: string
  createdAt: string
  updatedAt: string
  templateId?: string
}

interface QuizFilters {
  language?: 'en' | 'ar'
  isPublished?: boolean
  createdBy?: string
}

export default function QuizManager() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [totalQuizzes, setTotalQuizzes] = useState(0)
  const [filters, setFilters] = useState<QuizFilters>({})

  // Pagination hook
  const pagination = usePagination({
    initialPage: 1,
    initialPageSize: 10,
    totalItems: totalQuizzes, // Initialize with current total
    onPageChange: (page) => {
      fetchQuizzes(page)
    }
  })

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)

  // Selected quiz for operations
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)
  const [processingQuizId, setProcessingQuizId] = useState<string | null>(null)

  const fetchQuizzes = async (page: number = 1) => {
    try {
      setLoading(true)
      setError('')

      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.pageSize.toString()
      })

      // Add search term to API query
      if (searchTerm.trim()) params.append('search', searchTerm.trim())

      if (filters.language) params.append('language', filters.language)
      if (filters.isPublished !== undefined) params.append('published', filters.isPublished.toString())
      if (filters.createdBy) params.append('createdBy', filters.createdBy)

      const response = await fetch(`/api/v1/admin/quizzes?${params}`, {
        credentials: 'same-origin'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()


      if (result.success && result.data) {
        setQuizzes(result.data.quizzes || [])
        // Try multiple ways to get the total count
        const total = result.data.pagination?.total ||
          result.data.total ||
          result.data.totalCount ||
          (result.data.quizzes?.length === pagination.pageSize ? 100 : result.data.quizzes?.length) || 0

        setTotalQuizzes(total)
        pagination.setTotalItems(total)
      } else {
        setError(result.error || 'Failed to fetch quizzes')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch quizzes')
    } finally {
      setLoading(false)
    }
  }

  // Debounce search to avoid excessive API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchQuizzes(pagination.currentPage)
    }, searchTerm ? 300 : 0) // 300ms debounce for search, immediate for other changes

    return () => clearTimeout(timeoutId)
  }, [pagination.currentPage, pagination.pageSize, filters, searchTerm])

  const handleFilterChange = (newFilters: Partial<QuizFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    pagination.setCurrentPage(1) // Reset to first page when filters change
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    pagination.setCurrentPage(1) // Reset to first page when searching
  }

  const handleQuizCreated = () => {
    fetchQuizzes(pagination.currentPage)
    setShowCreateDialog(false)
  }

  const handleQuizUpdated = () => {
    fetchQuizzes(pagination.currentPage)
    setShowEditDialog(false)
    setSelectedQuiz(null)
  }

  const handleQuizDeleted = () => {
    fetchQuizzes(pagination.currentPage)
    setShowDeleteDialog(false)
    setSelectedQuiz(null)
  }

  const handleQuizDuplicated = () => {
    fetchQuizzes(pagination.currentPage)
    setShowDuplicateDialog(false)
    setSelectedQuiz(null)
  }

  const handleEditQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz)
    setShowEditDialog(true)
  }

  const handleDeleteQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz)
    setShowDeleteDialog(true)
  }

  const handlePreviewQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz)
    setShowPreviewDialog(true)
  }

  const handleDuplicateQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz)
    setShowDuplicateDialog(true)
  }

  const handlePublishToggle = async (quiz: Quiz) => {
    if (processingQuizId) return

    setProcessingQuizId(quiz.id)
    try {
      const response = await fetch(`/api/v1/admin/quizzes/${quiz.id}/publish`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({ isPublished: !quiz.isPublished })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        fetchQuizzes(pagination.currentPage)
      } else {
        setError(result.error || 'Failed to update quiz publish status')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update quiz publish status')
    } finally {
      setProcessingQuizId(null)
    }
  }

  const getLanguageBadgeColor = (language: string) => {
    return language === 'ar'
      ? 'bg-purple-100 text-purple-800 border-purple-200'
      : 'bg-blue-100 text-blue-800 border-blue-200'
  }

  const getStatusBadgeColor = (isPublished: boolean) => {
    return isPublished
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-gray-100 text-gray-800 border-gray-200'
  }

  // Server-side filtering - no need to filter here since API handles it
  const displayedQuizzes = quizzes

  if (loading && quizzes.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
                <FileText className="h-5 w-5" />
                Quiz Management
              </CardTitle>
              <CardDescription>
                Create and manage cybersecurity awareness quizzes
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Quiz
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quiz Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Total Quizzes</span>
              </div>
              <p className="text-2xl font-bold text-blue-800 mt-1">{totalQuizzes}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Published</span>
              </div>
              <p className="text-2xl font-bold text-green-800 mt-1">
                {loading ? '-' : quizzes.filter(q => q.isPublished).length}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Drafts</span>
              </div>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {loading ? '-' : quizzes.filter(q => !q.isPublished).length}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">Arabic Quizzes</span>
              </div>
              <p className="text-2xl font-bold text-purple-800 mt-1">
                {loading ? '-' : quizzes.filter(q => q.language === 'ar').length}
              </p>
            </div>
          </div>

          {/* Filters and Search */}
          <Tabs defaultValue="all" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger
                  value="all"
                  onClick={() => handleFilterChange({ isPublished: undefined })}
                >
                  All Quizzes
                </TabsTrigger>
                <TabsTrigger
                  value="published"
                  onClick={() => handleFilterChange({ isPublished: true })}
                >
                  Published
                </TabsTrigger>
                <TabsTrigger
                  value="drafts"
                  onClick={() => handleFilterChange({ isPublished: false })}
                >
                  Drafts
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search quizzes..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
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
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Quizzes Table */}
              <div className="border rounded-lg overflow-hidden relative">
                {loading && (
                  <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quiz
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Language
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Settings
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {displayedQuizzes.map((quiz) => (
                        <tr key={quiz.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {quiz.title}
                              </div>
                              {quiz.description && (
                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                  {quiz.description}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-400">
                                  {quiz.questionCount} questions
                                </span>
                                {quiz.templateId && (
                                  <Badge variant="outline" className="text-xs">
                                    From Template
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <Badge className={getLanguageBadgeColor(quiz.language)}>
                              {quiz.language === 'ar' ? 'Arabic' : 'English'}
                            </Badge>
                          </td>
                          <td className="px-4 py-4">
                            <Badge className={getStatusBadgeColor(quiz.isPublished)}>
                              {quiz.isPublished ? 'Published' : 'Draft'}
                            </Badge>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {quiz.timeLimitMinutes}min
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {quiz.maxAttempts} attempts
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500">
                            {new Date(quiz.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  disabled={processingQuizId === quiz.id}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Open menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={() => handlePreviewQuiz(quiz)}
                                  className="flex items-center gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  Preview Quiz
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleEditQuiz(quiz)}
                                  className="flex items-center gap-2"
                                >
                                  <Edit className="h-4 w-4" />
                                  Edit Quiz
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDuplicateQuiz(quiz)}
                                  className="flex items-center gap-2"
                                >
                                  <Copy className="h-4 w-4" />
                                  Duplicate Quiz
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handlePublishToggle(quiz)}
                                  disabled={processingQuizId === quiz.id}
                                  className="flex items-center gap-2"
                                >
                                  {quiz.isPublished ? (
                                    <>
                                      <XCircle className="h-4 w-4" />
                                      {processingQuizId === quiz.id ? 'Processing...' : 'Unpublish Quiz'}
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="h-4 w-4" />
                                      {processingQuizId === quiz.id ? 'Processing...' : 'Publish Quiz'}
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteQuiz(quiz)}
                                  disabled={processingQuizId === quiz.id}
                                  variant="destructive"
                                  className="flex items-center gap-2"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete Quiz
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Empty State */}
              {displayedQuizzes.length === 0 && !loading && (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No quizzes found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating your first quiz.'}
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setShowCreateDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Quiz
                    </Button>
                  )}
                </div>
              )}

              {/* Enhanced Pagination */}
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={totalQuizzes}
                pageSize={pagination.pageSize}
                onPageChange={pagination.setCurrentPage}
                onPageSizeChange={pagination.setPageSize}
                showPageSizeSelector={true}
                pageSizeOptions={[5, 10, 20, 50]}
                showGoToPage={true}
                showKeyboardHints={true}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <QuizCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onQuizCreated={handleQuizCreated}
      />

      <QuizEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        quiz={selectedQuiz}
        onQuizUpdated={handleQuizUpdated}
      />

      <QuizDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        quiz={selectedQuiz}
        onQuizDeleted={handleQuizDeleted}
      />

      <QuizPreviewDialog
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
        quiz={selectedQuiz}
      />

      <QuizDuplicateDialog
        open={showDuplicateDialog}
        onOpenChange={setShowDuplicateDialog}
        quiz={selectedQuiz}
        onQuizDuplicated={handleQuizDuplicated}
      />
    </div>
  )
}