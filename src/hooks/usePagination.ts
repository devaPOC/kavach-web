'use client'
import { useState, useEffect, useCallback } from 'react'

export interface UsePaginationProps {
  initialPage?: number
  initialPageSize?: number
  totalItems?: number
  onPageChange?: (page: number, pageSize: number) => void
  enableKeyboardNavigation?: boolean
}

export interface UsePaginationReturn {
  currentPage: number
  pageSize: number
  totalPages: number
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void
  setTotalItems: (total: number) => void
  goToNextPage: () => void
  goToPreviousPage: () => void
  goToFirstPage: () => void
  goToLastPage: () => void
  canGoNext: boolean
  canGoPrevious: boolean
}

export function usePagination({
  initialPage = 1,
  initialPageSize = 20,
  totalItems = 0,
  onPageChange,
  enableKeyboardNavigation = true
}: UsePaginationProps = {}): UsePaginationReturn {
  const [currentPage, setCurrentPageState] = useState(initialPage)
  const [pageSize, setPageSizeState] = useState(initialPageSize)
  const [totalItemsState, setTotalItemsState] = useState(totalItems)

  const totalPages = Math.ceil(totalItemsState / pageSize)
  const canGoNext = currentPage < totalPages
  const canGoPrevious = currentPage > 1

  const setCurrentPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPageState(page)
      onPageChange?.(page, pageSize)
    }
  }, [totalPages, pageSize, onPageChange])

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size)
    // Reset to first page when changing page size
    const newPage = 1
    setCurrentPageState(newPage)
    onPageChange?.(newPage, size)
  }, [onPageChange])

  const setTotalItems = useCallback((total: number) => {
    setTotalItemsState(total)
    // Adjust current page if it's beyond the new total pages
    const newTotalPages = Math.ceil(total / pageSize)
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages)
    }
  }, [currentPage, pageSize, setCurrentPage])

  const goToNextPage = useCallback(() => {
    if (canGoNext) {
      setCurrentPage(currentPage + 1)
    }
  }, [canGoNext, currentPage, setCurrentPage])

  const goToPreviousPage = useCallback(() => {
    if (canGoPrevious) {
      setCurrentPage(currentPage - 1)
    }
  }, [canGoPrevious, currentPage, setCurrentPage])

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1)
  }, [setCurrentPage])

  const goToLastPage = useCallback(() => {
    if (totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, setCurrentPage])

  // Keyboard navigation
  useEffect(() => {
    if (!enableKeyboardNavigation) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'ArrowLeft':
            event.preventDefault()
            goToPreviousPage()
            break
          case 'ArrowRight':
            event.preventDefault()
            goToNextPage()
            break
          case 'Home':
            event.preventDefault()
            goToFirstPage()
            break
          case 'End':
            event.preventDefault()
            goToLastPage()
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enableKeyboardNavigation, goToNextPage, goToPreviousPage, goToFirstPage, goToLastPage])

  return {
    currentPage,
    pageSize,
    totalPages,
    setCurrentPage,
    setPageSize,
    setTotalItems,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    canGoNext,
    canGoPrevious
  }
}

export default usePagination