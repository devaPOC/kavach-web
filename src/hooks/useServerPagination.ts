'use client'
import { useEffect, useState, useRef } from 'react'

interface UseServerPaginationOptions {
	initialPage?: number
	debounceMs?: number
	// Optional: total pages to clamp next() navigation
	totalPages?: number
	// Change these to trigger a debounced refetch + page reset
	deps: any[]
	// Called immediately when page changes, and after debounce when deps change (with page=1)
	onFetch: (page: number) => void | Promise<void>
}

interface UseServerPaginationReturn {
	page: number
	setPage: (p: number) => void
	next: () => void
	prev: () => void
}

export function useServerPagination({
	initialPage = 1,
	debounceMs = 300,
	totalPages,
	deps,
	onFetch,
}: UseServerPaginationOptions): UseServerPaginationReturn {
	const [page, setPage] = useState(initialPage)
	const mountedRef = useRef(false)

	// Fetch whenever page changes (no debounce)
	useEffect(() => {
		onFetch(page)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [page])

	// Debounce on filter deps: reset to page 1 and fetch
	useEffect(() => {
		if (!mountedRef.current) {
			// First render: mark mounted and run initial fetch at current page
			mountedRef.current = true
			onFetch(page)
			return
		}

		const t = setTimeout(() => {
			setPage(1)
			onFetch(1)
		}, debounceMs)
		return () => clearTimeout(t)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps)

	return {
		page,
		setPage,
		next: () => setPage((p) => {
			const max = typeof totalPages === 'number' && totalPages > 0 ? totalPages : Number.POSITIVE_INFINITY
			const nextPage = Math.min(p + 1, max)
			// If we're already at the last page and clamped, still trigger a fetch for UX consistency
			if (nextPage === p) {
				onFetch(p)
				return p
			}
			return nextPage
		}),
		prev: () => setPage((p) => {
			const prevPage = Math.max(1, p - 1)
			// If we're already at the first page, still trigger a fetch for UX consistency
			if (prevPage === p) {
				onFetch(p)
				return p
			}
			return prevPage
		}),
	}
}

export default useServerPagination
