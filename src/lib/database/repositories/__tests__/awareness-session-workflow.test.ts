import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AwarenessSessionWorkflow } from '../awareness-session-workflow';
import { transactionService } from '../../transaction-service';
import { awarenessSessionRepository } from '../awareness-session-repository';
import type { CreateAwarenessSessionData, AudienceType } from '@/types/awareness-session';

// Mock the dependencies
vi.mock('../../transaction-service');
vi.mock('../awareness-session-repository');

const mockTransactionService = vi.mocked(transactionService);
const mockRepository = vi.mocked(awarenessSessionRepository);

describe('AwarenessSessionWorkflow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('createRequest', () => {
        it('should create request with status history in transaction', async () => {
            const mockData: CreateAwarenessSessionData = {
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

            const mockSessionRequest = {
                id: 'session-123',
                requesterId: 'user-123',
                ...mockData,
                status: 'pending_admin_review' as const,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockTransactionService.executeInTransaction.mockResolvedValue({
                success: true,
                data: mockSessionRequest,
            });

            const result = await AwarenessSessionWorkflow.createRequest('user-123', mockData);

            expect(mockTransactionService.executeInTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                'create-awareness-session-request'
            );
            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockSessionRequest);
        });

        it('should handle transaction failure', async () => {
            const mockData: CreateAwarenessSessionData = {
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

            mockTransactionService.executeInTransaction.mockResolvedValue({
                success: false,
                error: 'Database error',
            });

            const result = await AwarenessSessionWorkflow.createRequest('user-123', mockData);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Database error');
        });
    });

    describe('updateStatus', () => {
        it('should update status with history tracking', async () => {
            const mockCurrentSession = {
                id: 'session-123',
                status: 'pending_admin_review' as const,
                requesterId: 'user-123',
                sessionDate: new Date(),
                location: 'Test Location',
                duration: '2_hours' as const,
                subject: 'Test',
                audienceSize: 50,
                audienceTypes: ['adults'] as AudienceType[],
                sessionMode: 'on_site' as const,
                organizationName: 'Test Org',
                contactEmail: 'test@example.com',
                contactPhone: '+1234567890',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockUpdatedSession = {
                ...mockCurrentSession,
                status: 'forwarded_to_expert' as const,
                reviewedAt: new Date(),
            };

            // Mock the transaction execution to call the actual function
            mockTransactionService.executeInTransaction.mockImplementation(async (fn) => {
                // Mock findById inside the transaction
                mockRepository.findById.mockResolvedValue(mockCurrentSession);
                mockRepository.updateStatusInTransaction.mockResolvedValue(mockUpdatedSession);
                mockRepository.addStatusHistoryInTransaction.mockResolvedValue({} as any);

                const result = await fn({} as any);
                return { success: true, data: result };
            });

            const result = await AwarenessSessionWorkflow.updateStatus(
                'session-123',
                'forwarded_to_expert',
                'admin-123',
                'Approved by admin'
            );

            expect(mockTransactionService.executeInTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                'update-awareness-session-status'
            );
            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockUpdatedSession);
        });

        it('should handle session not found', async () => {
            mockRepository.findById.mockResolvedValue(null);
            mockTransactionService.executeInTransaction.mockResolvedValue({
                success: false,
                error: 'Awareness session request not found',
            });

            const result = await AwarenessSessionWorkflow.updateStatus(
                'nonexistent-id',
                'forwarded_to_expert',
                'admin-123'
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Awareness session request not found');
        });
    });

    describe('assignExpert', () => {
        it('should assign expert with history tracking', async () => {
            const mockCurrentSession = {
                id: 'session-123',
                status: 'pending_admin_review' as const,
                requesterId: 'user-123',
                sessionDate: new Date(),
                location: 'Test Location',
                duration: '2_hours' as const,
                subject: 'Test',
                audienceSize: 50,
                audienceTypes: ['adults'] as AudienceType[],
                sessionMode: 'on_site' as const,
                organizationName: 'Test Org',
                contactEmail: 'test@example.com',
                contactPhone: '+1234567890',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockUpdatedSession = {
                ...mockCurrentSession,
                status: 'forwarded_to_expert' as const,
                assignedExpertId: 'expert-456',
                reviewedAt: new Date(),
            };

            mockRepository.findById.mockResolvedValue(mockCurrentSession);
            mockTransactionService.executeInTransaction.mockResolvedValue({
                success: true,
                data: mockUpdatedSession,
            });

            const result = await AwarenessSessionWorkflow.assignExpert(
                'session-123',
                'expert-456',
                'admin-123',
                'Assigned to expert'
            );

            expect(mockRepository.findById).toHaveBeenCalledWith('session-123');
            expect(mockTransactionService.executeInTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                'assign-expert-to-awareness-session'
            );
            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockUpdatedSession);
        });
    });

    describe('expertResponse', () => {
        it('should handle expert accept response', async () => {
            const mockCurrentSession = {
                id: 'session-123',
                status: 'forwarded_to_expert' as const,
                assignedExpertId: 'expert-456',
                requesterId: 'user-123',
                sessionDate: new Date(),
                location: 'Test Location',
                duration: '2_hours' as const,
                subject: 'Test',
                audienceSize: 50,
                audienceTypes: ['adults'] as AudienceType[],
                sessionMode: 'on_site' as const,
                organizationName: 'Test Org',
                contactEmail: 'test@example.com',
                contactPhone: '+1234567890',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockUpdatedSession = {
                ...mockCurrentSession,
                status: 'confirmed' as const,
                confirmedAt: new Date(),
            };

            mockRepository.findById.mockResolvedValue(mockCurrentSession);
            mockTransactionService.executeInTransaction.mockResolvedValue({
                success: true,
                data: mockUpdatedSession,
            });

            const result = await AwarenessSessionWorkflow.expertResponse(
                'session-123',
                'expert-456',
                'accept',
                'Accepted by expert'
            );

            expect(mockRepository.findById).toHaveBeenCalledWith('session-123');
            expect(mockTransactionService.executeInTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                'expert-response-to-awareness-session'
            );
            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockUpdatedSession);
        });

        it('should handle expert decline response', async () => {
            const mockCurrentSession = {
                id: 'session-123',
                status: 'forwarded_to_expert' as const,
                assignedExpertId: 'expert-456',
                requesterId: 'user-123',
                sessionDate: new Date(),
                location: 'Test Location',
                duration: '2_hours' as const,
                subject: 'Test',
                audienceSize: 50,
                audienceTypes: ['adults'] as AudienceType[],
                sessionMode: 'on_site' as const,
                organizationName: 'Test Org',
                contactEmail: 'test@example.com',
                contactPhone: '+1234567890',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockUpdatedSession = {
                ...mockCurrentSession,
                status: 'expert_declined' as const,
            };

            mockRepository.findById.mockResolvedValue(mockCurrentSession);
            mockTransactionService.executeInTransaction.mockResolvedValue({
                success: true,
                data: mockUpdatedSession,
            });

            const result = await AwarenessSessionWorkflow.expertResponse(
                'session-123',
                'expert-456',
                'decline',
                'Not available'
            );

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockUpdatedSession);
        });

        it('should handle expert not assigned error', async () => {
            const mockCurrentSession = {
                id: 'session-123',
                status: 'forwarded_to_expert' as const,
                assignedExpertId: 'different-expert',
                requesterId: 'user-123',
                sessionDate: new Date(),
                location: 'Test Location',
                duration: '2_hours' as const,
                subject: 'Test',
                audienceSize: 50,
                audienceTypes: ['adults'] as AudienceType[],
                sessionMode: 'on_site' as const,
                organizationName: 'Test Org',
                contactEmail: 'test@example.com',
                contactPhone: '+1234567890',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockRepository.findById.mockResolvedValue(mockCurrentSession);
            mockTransactionService.executeInTransaction.mockResolvedValue({
                success: false,
                error: 'Expert is not assigned to this awareness session request',
            });

            const result = await AwarenessSessionWorkflow.expertResponse(
                'session-123',
                'expert-456',
                'accept'
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Expert is not assigned to this awareness session request');
        });
    });

    describe('adminReview', () => {
        it('should handle admin approval with expert assignment', async () => {
            const mockCurrentSession = {
                id: 'session-123',
                status: 'pending_admin_review' as const,
                requesterId: 'user-123',
                sessionDate: new Date(),
                location: 'Test Location',
                duration: '2_hours' as const,
                subject: 'Test',
                audienceSize: 50,
                audienceTypes: ['adults'] as AudienceType[],
                sessionMode: 'on_site' as const,
                organizationName: 'Test Org',
                contactEmail: 'test@example.com',
                contactPhone: '+1234567890',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockUpdatedSession = {
                ...mockCurrentSession,
                status: 'forwarded_to_expert' as const,
                assignedExpertId: 'expert-456',
                reviewedAt: new Date(),
            };

            mockRepository.findById.mockResolvedValue(mockCurrentSession);
            mockTransactionService.executeInTransaction.mockResolvedValue({
                success: true,
                data: mockUpdatedSession,
            });

            const result = await AwarenessSessionWorkflow.adminReview(
                'session-123',
                'admin-123',
                'approve',
                'Approved',
                'expert-456'
            );

            expect(mockRepository.findById).toHaveBeenCalledWith('session-123');
            expect(mockTransactionService.executeInTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                'admin-review-awareness-session'
            );
            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockUpdatedSession);
        });

        it('should handle admin rejection', async () => {
            const mockCurrentSession = {
                id: 'session-123',
                status: 'pending_admin_review' as const,
                requesterId: 'user-123',
                sessionDate: new Date(),
                location: 'Test Location',
                duration: '2_hours' as const,
                subject: 'Test',
                audienceSize: 50,
                audienceTypes: ['adults'] as AudienceType[],
                sessionMode: 'on_site' as const,
                organizationName: 'Test Org',
                contactEmail: 'test@example.com',
                contactPhone: '+1234567890',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockUpdatedSession = {
                ...mockCurrentSession,
                status: 'rejected' as const,
                rejectionReason: 'Not suitable',
                reviewedAt: new Date(),
            };

            mockRepository.findById.mockResolvedValue(mockCurrentSession);
            mockTransactionService.executeInTransaction.mockResolvedValue({
                success: true,
                data: mockUpdatedSession,
            });

            const result = await AwarenessSessionWorkflow.adminReview(
                'session-123',
                'admin-123',
                'reject',
                'Not suitable'
            );

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockUpdatedSession);
        });

        it('should require expert ID when approving', async () => {
            const mockCurrentSession = {
                id: 'session-123',
                status: 'pending_admin_review' as const,
                requesterId: 'user-123',
                sessionDate: new Date(),
                location: 'Test Location',
                duration: '2_hours' as const,
                subject: 'Test',
                audienceSize: 50,
                audienceTypes: ['adults'] as AudienceType[],
                sessionMode: 'on_site' as const,
                organizationName: 'Test Org',
                contactEmail: 'test@example.com',
                contactPhone: '+1234567890',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockRepository.findById.mockResolvedValue(mockCurrentSession);
            mockTransactionService.executeInTransaction.mockResolvedValue({
                success: false,
                error: 'Expert ID is required when approving a request',
            });

            const result = await AwarenessSessionWorkflow.adminReview(
                'session-123',
                'admin-123',
                'approve',
                'Approved'
                // Missing expertId
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Expert ID is required when approving a request');
        });
    });

    describe('getRequestWithHistory', () => {
        it('should return request with status history', async () => {
            const mockRequest = {
                id: 'session-123',
                status: 'confirmed' as const,
                requesterId: 'user-123',
                sessionDate: new Date(),
                location: 'Test Location',
                duration: '2_hours' as const,
                subject: 'Test',
                audienceSize: 50,
                audienceTypes: ['adults'] as AudienceType[],
                sessionMode: 'on_site' as const,
                organizationName: 'Test Org',
                contactEmail: 'test@example.com',
                contactPhone: '+1234567890',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockHistory = [
                {
                    id: 'history-1',
                    sessionRequestId: 'session-123',
                    previousStatus: undefined,
                    newStatus: 'pending_admin_review' as const,
                    changedBy: 'user-123',
                    createdAt: new Date(),
                },
                {
                    id: 'history-2',
                    sessionRequestId: 'session-123',
                    previousStatus: 'pending_admin_review' as const,
                    newStatus: 'forwarded_to_expert' as const,
                    changedBy: 'admin-123',
                    createdAt: new Date(),
                },
            ];

            mockRepository.findById.mockResolvedValue(mockRequest);
            mockRepository.getStatusHistory.mockResolvedValue(mockHistory);

            const result = await AwarenessSessionWorkflow.getRequestWithHistory('session-123');

            expect(mockRepository.findById).toHaveBeenCalledWith('session-123');
            expect(mockRepository.getStatusHistory).toHaveBeenCalledWith('session-123');
            expect(result.request).toEqual(mockRequest);
            expect(result.history).toEqual(mockHistory);
        });

        it('should return empty history when request not found', async () => {
            mockRepository.findById.mockResolvedValue(null);

            const result = await AwarenessSessionWorkflow.getRequestWithHistory('nonexistent-id');

            expect(mockRepository.findById).toHaveBeenCalledWith('nonexistent-id');
            expect(mockRepository.getStatusHistory).not.toHaveBeenCalled();
            expect(result.request).toBeNull();
            expect(result.history).toEqual([]);
        });
    });
});