import { NextRequest, NextResponse } from 'next/server';
import { BaseController } from '../auth/auth.controller';
import { ArchiveService } from '@/lib/services/archive.service';
import { logger } from '@/lib/utils/logger';

export class ArchiveController extends BaseController {

  /**
   * Get archived service requests with filtering (admin only)
   */
  async getArchivedServiceRequests(request: NextRequest): Promise<NextResponse> {
    let filters: any = {};

    try {
      // Verify admin access
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Get URL parameters for filtering
      const url = new URL(request.url);
      filters = {
        page: parseInt(url.searchParams.get('page') || '1'),
        limit: Math.min(parseInt(url.searchParams.get('limit') || '20'), 50),
        status: url.searchParams.get('status') || undefined,
        priority: url.searchParams.get('priority') || undefined,
        archiveReason: url.searchParams.get('archiveReason') || undefined,
        serviceType: url.searchParams.get('serviceType') || undefined,
        dateFrom: url.searchParams.get('dateFrom') ? new Date(url.searchParams.get('dateFrom')!) : undefined,
        dateTo: url.searchParams.get('dateTo') ? new Date(url.searchParams.get('dateTo')!) : undefined,
        search: url.searchParams.get('search') || undefined,
      };

      const result = await ArchiveService.getArchivedServiceRequests(filters);

      return this.success(result.data);

    } catch (error: any) {
      logger.error('Failed to get archived service requests:', {
        error: error instanceof Error ? error.message : String(error),
        filters
      });
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Archive completed service requests older than 1 day (admin only)
   */
  async archiveCompletedRequests(request: NextRequest): Promise<NextResponse> {
    try {
      // Verify admin access
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      const archivedCount = await ArchiveService.archiveCompletedServiceRequests();

      return this.success({
        message: `Successfully archived ${archivedCount} completed service requests`,
        archivedCount
      });

    } catch (error: any) {
      logger.error('Failed to archive completed requests:', {
        error: error instanceof Error ? error.message : String(error)
      });
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Delete archived service request permanently (admin only)
   */
  async deleteArchivedRequest(request: NextRequest, archivedId: string): Promise<NextResponse> {
    try {
      // Verify admin access
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      const success = await ArchiveService.deleteArchivedServiceRequest(archivedId);

      if (success) {
        return this.success({
          message: 'Archived service request deleted permanently',
          deletedId: archivedId
        });
      } else {
        return this.error('Failed to delete archived service request', undefined, 400);
      }

    } catch (error: any) {
      logger.error('Failed to delete archived request:', {
        error: error instanceof Error ? error.message : String(error),
        archivedId
      });
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Get archive statistics (admin only)
   */
  async getArchiveStats(request: NextRequest): Promise<NextResponse> {
    try {
      // Verify admin access
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      const result = await ArchiveService.getArchiveStats();

      return this.success(result.data);

    } catch (error: any) {
      logger.error('Failed to get archive stats:', {
        error: error instanceof Error ? error.message : String(error)
      });
      return this.error('Internal server error', undefined, 500);
    }
  }
}

export const archiveController = new ArchiveController();
