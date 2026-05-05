import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import AdminAwarenessSessionDashboard from '../AdminAwarenessSessionDashboard'

// Mock fetch globally
global.fetch = vi.fn()

// Mock the dialog components
vi.mock('../AwarenessSessionReviewDialog', () => ({
  default: () => <div data-testid="review-dialog">Review Dialog</div>
}))

vi.mock('../AwarenessSessionDetailsDialog', () => ({
  default: () => <div data-testid="details-dialog">Details Dialog</div>
}))

vi.mock('../AwarenessSessionExpertAssignDialog', () => ({
  default: () => <div data-testid="assign-dialog">Assign Dialog</div>
}))

vi.mock('../AwarenessSessionBulkActions', () => ({
  default: () => <div data-testid="bulk-actions">Bulk Actions</div>
}))

describe('AdminAwarenessSessionDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the dashboard with loading state initially', () => {
    // Mock fetch to return pending promise
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockImplementation(() => new Promise(() => {}))

    render(<AdminAwarenessSessionDashboard />)

    expect(screen.getByText('Awareness Session Requests')).toBeInTheDocument()
    expect(screen.getByText('Manage and review cybersecurity awareness session requests')).toBeInTheDocument()
    
    // Should show loading spinner
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders requests data when fetch succeeds', async () => {
    const mockRequests = [
      {
        id: '1',
        organizationName: 'Test Organization',
        subject: 'Cybersecurity Basics',
        sessionDate: '2024-12-01T10:00:00Z',
        location: 'Conference Room A',
        duration: '2_hours' as const,
        audienceSize: 25,
        audienceTypes: ['corporate_staff' as const],
        sessionMode: 'on_site' as const,
        contactEmail: 'test@example.com',
        contactPhone: '+1234567890',
        status: 'pending_admin_review' as const,
        createdAt: '2024-11-01T10:00:00Z',
        updatedAt: '2024-11-01T10:00:00Z',
        requesterId: 'user1'
      }
    ]

    const mockExperts = [
      {
        id: 'expert1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      }
    ]

    // Mock successful API responses
    const mockFetch = vi.mocked(fetch)
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            requests: mockRequests,
            total: 1,
            totalPages: 1
          }
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockExperts
        })
      } as Response)

    render(<AdminAwarenessSessionDashboard />)

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test Organization')).toBeInTheDocument()
    })

    expect(screen.getByText('Cybersecurity Basics')).toBeInTheDocument()
    expect(screen.getByText('25 people')).toBeInTheDocument()
    expect(screen.getByText('Pending Admin Review')).toBeInTheDocument()
  })

  it('renders error state when fetch fails', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<AdminAwarenessSessionDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument()
    })
  })

  it('renders statistics correctly', async () => {
    const mockRequests = [
      {
        id: '1',
        organizationName: 'Test Org 1',
        subject: 'Test Subject 1',
        sessionDate: '2024-12-01T10:00:00Z',
        location: 'Location 1',
        duration: '2_hours' as const,
        audienceSize: 25,
        audienceTypes: ['corporate_staff' as const],
        sessionMode: 'on_site' as const,
        contactEmail: 'test1@example.com',
        contactPhone: '+1234567890',
        status: 'pending_admin_review' as const,
        createdAt: '2024-11-01T10:00:00Z',
        updatedAt: '2024-11-01T10:00:00Z',
        requesterId: 'user1'
      },
      {
        id: '2',
        organizationName: 'Test Org 2',
        subject: 'Test Subject 2',
        sessionDate: '2024-12-02T10:00:00Z',
        location: 'Location 2',
        duration: '1_hour' as const,
        audienceSize: 15,
        audienceTypes: ['students' as const],
        sessionMode: 'online' as const,
        contactEmail: 'test2@example.com',
        contactPhone: '+1234567891',
        status: 'confirmed' as const,
        createdAt: '2024-11-02T10:00:00Z',
        updatedAt: '2024-11-02T10:00:00Z',
        requesterId: 'user2'
      }
    ]

    const mockFetch = vi.mocked(fetch)
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            requests: mockRequests,
            total: 2,
            totalPages: 1
          }
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: []
        })
      } as Response)

    render(<AdminAwarenessSessionDashboard />)

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument() // Total requests
    })

    // Check statistics
    expect(screen.getByText('1')).toBeInTheDocument() // Pending review
    expect(screen.getByText('1')).toBeInTheDocument() // Confirmed
  })
})