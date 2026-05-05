import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AwarenessSessionRepository } from '../awareness-session-repository';
import type { 
  AwarenessSessionRequest, 
  AwarenessSessionStatus,
  CreateAwarenessSessionData,
  AudienceType
} from '@/types/awareness-session';

// Mock database
const mockDatabase = {
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

// Mock transaction
const mockTransaction = {
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

describe('AwarenessSessionRepository', () => {
  let repository: AwarenessSessionRepository;

  beforeEach(() => {
    repository = new AwarenessSessionRepository(mockDatabase);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('create', () => {
    it('should create a new awareness session request', async () => {
      const mockData: CreateAwarenessSessionData & { requesterId: string } = {
        requesterId: 'user-123',
        sessionDate: new Date('2024-12-01'),
        location: 'Test Location',
        duration: '2_hours',
        subject: 'Cybersecurity Basics',
        audienceSize: 50,
        audienceTypes: ['adults', 'corporate_staff'] as AudienceType[],
        sessionMode: 'on_site',
        specialRequirements: 'Projector needed',
        organizationName: 'Test Organization',
        contactEmail: 'test@example.com',
        contactPhone: '+1234567890',
      };

      const mockResult = {
        id: 'session-123',
        ...mockData,
        audienceTypes: JSON.stringify(mockData.audienceTypes),
        status: 'pending_admin_review',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDatabase.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockResult])
        })
      });

      const result = await repository.create(mockData);

      expect(mockDatabase.insert).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        id: 'session-123',
        requesterId: 'user-123',
        status: 'pending_admin_review',
        audienceTypes: ['adults', 'corporate_staff'],
      }));
    });

    it('should throw error when creation fails', async () => {
      const mockData: CreateAwarenessSessionData & { requesterId: string } = {
        requesterId: 'user-123',
        sessionDate: new Date('2024-12-01'),
        location: 'Test Location',
        duration: '2_hours',
        subject: 'Cybersecurity Basics',
        audienceSize: 50,
        audienceTypes: ['adults'] as AudienceType[],
        sessionMode: 'on_site',
        organizationName: 'Test Organization',
        contactEmail: 'test@example.com',
        contactPhone: '+1234567890',
      };

      mockDatabase.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([])
        })
      });

      await expect(repository.create(mockData)).rejects.toThrow('Failed to create awareness session request');
    });
  });

  describe('findById', () => {
    it('should find awareness session request by ID', async () => {
      const mockResult = {
        id: 'session-123',
        requesterId: 'user-123',
        sessionDate: new Date('2024-12-01'),
        location: 'Test Location',
        duration: '2_hours',
        subject: 'Cybersecurity Basics',
        audienceSize: 50,
        audienceTypes: JSON.stringify(['adults', 'corporate_staff']),
        sessionMode: 'on_site',
        organizationName: 'Test Organization',
        contactEmail: 'test@example.com',
        contactPhone: '+1234567890',
        status: 'pending_admin_review',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDatabase.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockResult])
          })
        })
      });

      const result = await repository.findById('session-123');

      expect(mockDatabase.select).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        id: 'session-123',
        audienceTypes: ['adults', 'corporate_staff'],
      }));
    });

    it('should return null when session request not found', async () => {
      mockDatabase.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      });

      const result = await repository.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update status and set appropriate timestamps', async () => {
      const mockResult = {
        id: 'session-123',
        requesterId: 'user-123',
        status: 'forwarded_to_expert',
        reviewedAt: new Date(),
        updatedAt: new Date(),
        audienceTypes: JSON.stringify(['adults']),
      };

      mockDatabase.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockResult])
          })
        })
      });

      const result = await repository.updateStatus('session-123', 'forwarded_to_expert', 'Admin notes');

      expect(mockDatabase.update).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        id: 'session-123',
        status: 'forwarded_to_expert',
      }));
    });

    it('should set confirmedAt when status is confirmed', async () => {
      const mockResult = {
        id: 'session-123',
        status: 'confirmed',
        confirmedAt: new Date(),
        updatedAt: new Date(),
        audienceTypes: JSON.stringify(['adults']),
      };

      mockDatabase.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockResult])
          })
        })
      });

      const result = await repository.updateStatus('session-123', 'confirmed');

      expect(result?.status).toBe('confirmed');
      expect(result?.confirmedAt).toBeDefined();
    });
  });

  describe('assignExpert', () => {
    it('should assign expert and update status', async () => {
      const mockResult = {
        id: 'session-123',
        assignedExpertId: 'expert-456',
        status: 'forwarded_to_expert',
        reviewedAt: new Date(),
        updatedAt: new Date(),
        adminNotes: 'Assigned to expert',
        audienceTypes: JSON.stringify(['adults']),
      };

      mockDatabase.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockResult])
          })
        })
      });

      const result = await repository.assignExpert('session-123', 'expert-456', 'Assigned to expert');

      expect(mockDatabase.update).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        id: 'session-123',
        assignedExpertId: 'expert-456',
        status: 'forwarded_to_expert',
        adminNotes: 'Assigned to expert',
      }));
    });
  });

  describe('addStatusHistory', () => {
    it('should add status history entry', async () => {
      const mockResult = {
        id: 'history-123',
        sessionRequestId: 'session-123',
        previousStatus: 'pending_admin_review',
        newStatus: 'forwarded_to_expert',
        changedBy: 'admin-123',
        notes: 'Approved by admin',
        createdAt: new Date(),
      };

      mockDatabase.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockResult])
        })
      });

      const result = await repository.addStatusHistory(
        'session-123',
        'pending_admin_review',
        'forwarded_to_expert',
        'admin-123',
        'Approved by admin'
      );

      expect(mockDatabase.insert).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        id: 'history-123',
        sessionRequestId: 'session-123',
        previousStatus: 'pending_admin_review',
        newStatus: 'forwarded_to_expert',
        changedBy: 'admin-123',
        notes: 'Approved by admin',
      }));
    });
  });

  describe('getStatistics', () => {
    it('should return statistics for all statuses', async () => {
      const mockResults = [
        { status: 'pending_admin_review', count: '5' },
        { status: 'forwarded_to_expert', count: '3' },
        { status: 'confirmed', count: '10' },
        { status: 'rejected', count: '2' },
      ];

      mockDatabase.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockResolvedValue(mockResults)
        })
      });

      const result = await repository.getStatistics();

      expect(mockDatabase.select).toHaveBeenCalled();
      expect(result).toEqual({
        'pending_admin_review': 5,
        'forwarded_to_expert': 3,
        'confirmed': 10,
        'rejected': 2,
        'expert_declined': 0,
      });
    });
  });

  describe('findWithFilters', () => {
    it('should find requests with status filter', async () => {
      const mockResults = [{
        id: 'session-123',
        status: 'pending_admin_review',
        audienceTypes: JSON.stringify(['adults']),
        createdAt: new Date(),
      }];

      const mockCountResult = [{ count: '1' }];

      mockDatabase.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockCountResult)
          })
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue(mockResults)
                })
              })
            })
          })
        });

      const result = await repository.findWithFilters(
        { status: 'pending_admin_review' },
        { page: 1, limit: 20 }
      );

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('transaction methods', () => {
    it('should create awareness session request in transaction', async () => {
      const mockData: CreateAwarenessSessionData & { requesterId: string } = {
        requesterId: 'user-123',
        sessionDate: new Date('2024-12-01'),
        location: 'Test Location',
        duration: '2_hours',
        subject: 'Cybersecurity Basics',
        audienceSize: 50,
        audienceTypes: ['adults'] as AudienceType[],
        sessionMode: 'on_site',
        organizationName: 'Test Organization',
        contactEmail: 'test@example.com',
        contactPhone: '+1234567890',
      };

      const mockResult = {
        id: 'session-123',
        ...mockData,
        audienceTypes: JSON.stringify(mockData.audienceTypes),
        status: 'pending_admin_review',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTransaction.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockResult])
        })
      });

      const result = await repository.createInTransaction(mockTransaction as any, mockData);

      expect(mockTransaction.insert).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        id: 'session-123',
        requesterId: 'user-123',
        status: 'pending_admin_review',
      }));
    });

    it('should add status history in transaction', async () => {
      const mockResult = {
        id: 'history-123',
        sessionRequestId: 'session-123',
        previousStatus: null,
        newStatus: 'pending_admin_review',
        changedBy: 'user-123',
        createdAt: new Date(),
      };

      mockTransaction.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockResult])
        })
      });

      const result = await repository.addStatusHistoryInTransaction(
        mockTransaction as any,
        'session-123',
        null,
        'pending_admin_review',
        'user-123'
      );

      expect(mockTransaction.insert).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        id: 'history-123',
        sessionRequestId: 'session-123',
        newStatus: 'pending_admin_review',
      }));
    });
  });
});