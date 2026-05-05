'use client'

import React from 'react'
import { Button } from '@/components/ui'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { useLanguage } from '@/lib/contexts/LanguageContext'

interface QuizPaginationProps {
  currentPage: number
  totalPages: number
  hasMore: boolean
  isLoading: boolean
  onPageChange: (page: number) => void
  onLoadMore: () => void
  className?: string
}

export const QuizPagination: React.FC<QuizPaginationProps> = ({
  currentPage,
  totalPages,
  hasMore,
  isLoading,
  onPageChange,
  onLoadMore,
  className = ''
}) => {
  const { language } = useLanguage()

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push('ellipsis')
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i)
        }
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis')
      }

      // Always show last page if more than 1 page
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  if (totalPages <= 1 && !hasMore) {
    return null
  }

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* Page info */}
      <div className="text-sm text-gray-600">
        {language === 'ar' 
          ? `الصفحة ${currentPage} من ${totalPages}`
          : `Page ${currentPage} of ${totalPages}`
        }
      </div>

      {/* Pagination controls */}
      <div className="flex items-center space-x-2">
        {/* Previous button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isLoading}
          className="flex items-center space-x-1"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">
            {language === 'ar' ? 'السابق' : 'Previous'}
          </span>
        </Button>

        {/* Page numbers */}
        <div className="hidden md:flex items-center space-x-1">
          {getPageNumbers().map((page, index) => (
            page === 'ellipsis' ? (
              <div key={`ellipsis-${index}`} className="px-2">
                <MoreHorizontal className="h-4 w-4 text-gray-400" />
              </div>
            ) : (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(page)}
                disabled={isLoading}
                className="min-w-[2.5rem]"
              >
                {page}
              </Button>
            )
          ))}
        </div>

        {/* Next button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || isLoading}
          className="flex items-center space-x-1"
        >
          <span className="hidden sm:inline">
            {language === 'ar' ? 'التالي' : 'Next'}
          </span>
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Load more button (alternative to pagination) */}
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoading}
            className="ml-4"
          >
            {isLoading 
              ? (language === 'ar' ? 'جاري التحميل...' : 'Loading...')
              : (language === 'ar' ? 'تحميل المزيد' : 'Load More')
            }
          </Button>
        )}
      </div>
    </div>
  )
}

export default QuizPagination