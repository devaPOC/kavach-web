'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect } from 'react'
import { usePagination, UsePaginationProps } from './usePagination'

export interface UsePaginationWithUrlProps extends Omit<UsePaginationProps, 'onPageChange'> {
  pageParam?: string
  pageSizeParam?: string
  onPageChange?: (page: number, pageSize: number) => void
}

export function usePaginationWithUrl({
  pageParam = 'page',
  pageSizeParam = 'pageSize',
  initialPage = 1,
  initialPageSize = 20,
  onPageChange,
  ...props
}: UsePaginationWithUrlProps = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get initial values from URL
  const urlPage = parseInt(searchParams.get(pageParam) || initialPage.toString())
  const urlPageSize = parseInt(searchParams.get(pageSizeParam) || initialPageSize.toString())

  const pagination = usePagination({
    ...props,
    initialPage: urlPage,
    initialPageSize: urlPageSize,
    onPageChange: useCallback((page: number, pageSize: number) => {
      // Update URL
      const params = new URLSearchParams(searchParams.toString())
      params.set(pageParam, page.toString())
      params.set(pageSizeParam, pageSize.toString())
      
      router.push(`?${params.toString()}`, { scroll: false })
      
      // Call the original callback
      onPageChange?.(page, pageSize)
    }, [router, searchParams, pageParam, pageSizeParam, onPageChange])
  })

  // Sync with URL changes
  useEffect(() => {
    const urlPage = parseInt(searchParams.get(pageParam) || '1')
    const urlPageSize = parseInt(searchParams.get(pageSizeParam) || '20')
    
    if (urlPage !== pagination.currentPage) {
      pagination.setCurrentPage(urlPage)
    }
    if (urlPageSize !== pagination.pageSize) {
      pagination.setPageSize(urlPageSize)
    }
  }, [searchParams, pageParam, pageSizeParam])

  return pagination
}

export default usePaginationWithUrl