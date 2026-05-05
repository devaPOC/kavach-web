import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import UserManagement from '../UserManagement'

// Basic smoke test for layout elements
vi.mock('@/lib/api/client', () => ({
	adminApi: {
		getUsers: vi.fn().mockResolvedValue({ success: true, data: { users: [], total: 0, page: 1 } }),
		getUserCounts: vi.fn().mockResolvedValue({ success: true, data: { totalUsers: 0, locked: 0, banned: 0, paused: 0, pendingApprovalExperts: 0, verified: 0 } }),
		banExpert: vi.fn(),
		unbanExpert: vi.fn(),
		pauseCustomer: vi.fn(),
		unpauseCustomer: vi.fn(),
		approveExpert: vi.fn(),
		rejectExpert: vi.fn(),
		unlockUserAccount: vi.fn(),
	}
}))

describe('UserManagement layout', () => {
	it('renders header, filters, and empty state', async () => {
		render(<UserManagement />)
		expect(await screen.findByText('User Management')).toBeInTheDocument()
		expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument()
		expect(await screen.findByText('No users match your filters')).toBeInTheDocument()
	})
})
