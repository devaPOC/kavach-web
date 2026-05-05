import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useServerPagination } from '../useServerPagination'

describe('useServerPagination', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	it('calls onFetch on mount and when page changes', () => {
		const onFetch = vi.fn()
		const { result } = renderHook(() => useServerPagination({
			initialPage: 1,
			deps: [],
			onFetch,
		}))

		// initial fetch on mount
		expect(onFetch).toHaveBeenCalledWith(1)
		onFetch.mockClear()

		// next page triggers fetch immediately
		act(() => result.current.next())
		expect(onFetch).toHaveBeenCalledWith(2)

		// prev page triggers fetch immediately
		onFetch.mockClear()
		act(() => result.current.prev())
		expect(onFetch).toHaveBeenCalledWith(1)
	})

	it('debounces when deps change and resets to page 1', () => {
		let deps = ['a']
		const onFetch = vi.fn()
		const { rerender } = renderHook(() => useServerPagination({
			initialPage: 3,
			debounceMs: 300,
			deps,
			onFetch,
		}))

		// mount triggers immediate fetch at page 3
		expect(onFetch).toHaveBeenCalledWith(3)
		onFetch.mockClear()

		// change deps triggers debounce + reset to 1
		deps = ['b']
		rerender()
		expect(onFetch).not.toHaveBeenCalled()
		act(() => {
			vi.advanceTimersByTime(300)
		})
		expect(onFetch).toHaveBeenCalledWith(1)
	})

	it('guards next() by totalPages when provided', () => {
		const onFetch = vi.fn()
		const { result, rerender } = renderHook(
			({ totalPages }) => useServerPagination({ initialPage: 1, deps: [], onFetch, totalPages }),
			{ initialProps: { totalPages: 2 } }
		)

		expect(onFetch).toHaveBeenCalledWith(1)
		onFetch.mockClear()

		// Go to page 2
		act(() => result.current.next())
		expect(onFetch).toHaveBeenCalledWith(2)

		// Try to go beyond total pages
		onFetch.mockClear()
		act(() => result.current.next())
		// Should remain at page 2
		expect(onFetch).toHaveBeenCalledWith(2)

		// Increase total pages and try next again
		onFetch.mockClear()
		rerender({ totalPages: 3 })
		act(() => result.current.next())
		expect(onFetch).toHaveBeenCalledWith(3)
	})
})
