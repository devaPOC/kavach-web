import { BaseService, ServiceResult, serviceSuccess, serviceError } from './base.service';
import { awarenessSessionRepository } from '@/lib/database/repositories/awareness-session-repository';
import { userRepository } from '@/lib/database/repositories/user-repository';
import { db } from '@/lib/database/connection';
import { awarenessSessionRequests, awarenessSessionStatusHistory, users } from '@/lib/database/schema';
import { eq, and, or, desc, asc, sql, gte, lte, count, avg } from 'drizzle-orm';
import type {
  AwarenessSessionStatus,
  AudienceType,
  SessionDuration,
  SessionMode
} from '@/types/awareness-session';

export interface AnalyticsDateRange {
  startDate: Date;
  endDate: Date;
}

export interface RequestVolumeMetrics {
  totalRequests: number;
  requestsByStatus: Record<AwarenessSessionStatus, number>;
  requestsByMonth: Array<{
    month: string;
    year: number;
    count: number;
  }>;
  requestsByWeek: Array<{
    week: string;
    count: number;
  }>;
  averageRequestsPerDay: number;
}

export interface ExpertUtilizationMetrics {
  totalExperts: number;
  activeExperts: number;
  expertAssignments: Array<{
    expertId: string;
    expertName: string;
    expertEmail: string;
    totalAssigned: number;
    totalConfirmed: number;
    totalDeclined: number;
    acceptanceRate: number;
    averageResponseTime: number; // in hours
  }>;
  unassignedRequests: number;
  reassignmentRate: number;
}

export interface SessionAnalytics {
  sessionsByDuration: Record<SessionDuration, number>;
  sessionsByMode: Record<SessionMode, number>;
  sessionsByAudienceType: Record<AudienceType, number>;
  averageAudienceSize: number;
  totalAudienceReached: number;
  popularTopics: Array<{
    topic: string;
    count: number;
  }>;
  locationDistribution: Array<{
    location: string;
    count: number;
  }>;
}

export interface TrendAnalysis {
  requestTrends: Array<{
    period: string;
    requests: number;
    confirmed: number;
    rejected: number;
    conversionRate: number;
  }>;
  seasonalPatterns: Array<{
    month: number;
    monthName: string;
    averageRequests: number;
    peakYear: number;
  }>;
  statusTransitionTimes: Record<string, number>; // Average time in hours for each transition
}

export interface ComprehensiveAnalytics {
  dateRange: AnalyticsDateRange;
  requestVolume: RequestVolumeMetrics;
  expertUtilization: ExpertUtilizationMetrics;
  sessionAnalytics: SessionAnalytics;
  trendAnalysis: TrendAnalysis;
  generatedAt: Date;
}

export interface ExportOptions {
  format: 'csv' | 'pdf';
  includeDetails: boolean;
  dateRange: AnalyticsDateRange;
  filters?: {
    status?: AwarenessSessionStatus[];
    expertIds?: string[];
    audienceTypes?: AudienceType[];
  };
}

/**
 * Service for awareness session analytics and reporting
 */
export class AwarenessSessionAnalyticsService extends BaseService {
  /**
   * Get comprehensive analytics for awareness sessions
   */
  async getAnalytics(dateRange: AnalyticsDateRange): Promise<ServiceResult<ComprehensiveAnalytics>> {
    try {
      this.validateRequired(dateRange.startDate, 'startDate');
      this.validateRequired(dateRange.endDate, 'endDate');

      if (dateRange.startDate >= dateRange.endDate) {
        return serviceError('Start date must be before end date', 'INVALID_DATE_RANGE');
      }

      const [
        requestVolume,
        expertUtilization,
        sessionAnalytics,
        trendAnalysis
      ] = await Promise.all([
        this.getRequestVolumeMetrics(dateRange),
        this.getExpertUtilizationMetrics(dateRange),
        this.getSessionAnalytics(dateRange),
        this.getTrendAnalysis(dateRange)
      ]);

      // Check if all service calls were successful
      if (!requestVolume.success) {
        return serviceError(`Failed to get request volume metrics: ${requestVolume.error}`, 'ANALYTICS_ERROR');
      }
      if (!expertUtilization.success) {
        return serviceError(`Failed to get expert utilization metrics: ${expertUtilization.error}`, 'ANALYTICS_ERROR');
      }
      if (!sessionAnalytics.success) {
        return serviceError(`Failed to get session analytics: ${sessionAnalytics.error}`, 'ANALYTICS_ERROR');
      }
      if (!trendAnalysis.success) {
        return serviceError(`Failed to get trend analysis: ${trendAnalysis.error}`, 'ANALYTICS_ERROR');
      }

      const analytics: ComprehensiveAnalytics = {
        dateRange,
        requestVolume: requestVolume.data,
        expertUtilization: expertUtilization.data,
        sessionAnalytics: sessionAnalytics.data,
        trendAnalysis: trendAnalysis.data,
        generatedAt: new Date()
      };

      this.audit({
        event: 'awareness.session.analytics.generated' as any,
        userId: 'system',
        resource: 'analytics',
        action: 'analytics_generated',
        metadata: {
          dateRange,
          totalRequests: analytics.requestVolume.totalRequests,
        },
      });

      return serviceSuccess(analytics);
    } catch (error) {
      this.logger.error('Failed to generate analytics', { error, dateRange });
      return serviceError('Failed to generate analytics', 'INTERNAL_ERROR');
    }
  }

  /**
   * Get request volume metrics
   */
  async getRequestVolumeMetrics(dateRange: AnalyticsDateRange): Promise<ServiceResult<RequestVolumeMetrics>> {
    try {
      // Total requests in date range
      const [totalResult] = await db
        .select({ count: sql`count(*)` })
        .from(awarenessSessionRequests)
        .where(and(
          gte(awarenessSessionRequests.createdAt, dateRange.startDate),
          lte(awarenessSessionRequests.createdAt, dateRange.endDate)
        ));

      const totalRequests = parseInt(totalResult?.count as string || '0');

      // Requests by status
      const statusResults = await db
        .select({
          status: awarenessSessionRequests.status,
          count: sql`count(*)`
        })
        .from(awarenessSessionRequests)
        .where(and(
          gte(awarenessSessionRequests.createdAt, dateRange.startDate),
          lte(awarenessSessionRequests.createdAt, dateRange.endDate)
        ))
        .groupBy(awarenessSessionRequests.status);

      const requestsByStatus: Record<AwarenessSessionStatus, number> = {
        'pending_admin_review': 0,
        'forwarded_to_expert': 0,
        'confirmed': 0,
        'rejected': 0,
        'expert_declined': 0,
      };

      statusResults.forEach((result: any) => {
        if (result.status in requestsByStatus) {
          requestsByStatus[result.status as AwarenessSessionStatus] = parseInt(result.count as string);
        }
      });

      // Requests by month
      const monthlyResults = await db
        .select({
          month: sql`EXTRACT(MONTH FROM ${awarenessSessionRequests.createdAt})`,
          year: sql`EXTRACT(YEAR FROM ${awarenessSessionRequests.createdAt})`,
          count: sql`count(*)`
        })
        .from(awarenessSessionRequests)
        .where(and(
          gte(awarenessSessionRequests.createdAt, dateRange.startDate),
          lte(awarenessSessionRequests.createdAt, dateRange.endDate)
        ))
        .groupBy(
          sql`EXTRACT(YEAR FROM ${awarenessSessionRequests.createdAt})`,
          sql`EXTRACT(MONTH FROM ${awarenessSessionRequests.createdAt})`
        )
        .orderBy(
          sql`EXTRACT(YEAR FROM ${awarenessSessionRequests.createdAt})`,
          sql`EXTRACT(MONTH FROM ${awarenessSessionRequests.createdAt})`
        );

      const requestsByMonth = monthlyResults.map((result: any) => ({
        month: new Date(0, parseInt(result.month) - 1).toLocaleString('default', { month: 'long' }),
        year: parseInt(result.year),
        count: parseInt(result.count)
      }));

      // Requests by week (last 12 weeks)
      const weeklyResults = await db
        .select({
          week: sql`DATE_TRUNC('week', ${awarenessSessionRequests.createdAt})`,
          count: sql`count(*)`
        })
        .from(awarenessSessionRequests)
        .where(and(
          gte(awarenessSessionRequests.createdAt, dateRange.startDate),
          lte(awarenessSessionRequests.createdAt, dateRange.endDate)
        ))
        .groupBy(sql`DATE_TRUNC('week', ${awarenessSessionRequests.createdAt})`)
        .orderBy(sql`DATE_TRUNC('week', ${awarenessSessionRequests.createdAt})`);

      const requestsByWeek = weeklyResults.map((result: any) => ({
        week: new Date(result.week).toISOString().split('T')[0],
        count: parseInt(result.count)
      }));

      // Average requests per day
      const daysDiff = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
      const averageRequestsPerDay = daysDiff > 0 ? totalRequests / daysDiff : 0;

      const metrics: RequestVolumeMetrics = {
        totalRequests,
        requestsByStatus,
        requestsByMonth,
        requestsByWeek,
        averageRequestsPerDay
      };

      return serviceSuccess(metrics);
    } catch (error) {
      this.logger.error('Failed to get request volume metrics', { error, dateRange });
      return serviceError('Failed to get request volume metrics', 'INTERNAL_ERROR');
    }
  }

  /**
   * Get expert utilization metrics
   */
  async getExpertUtilizationMetrics(dateRange: AnalyticsDateRange): Promise<ServiceResult<ExpertUtilizationMetrics>> {
    try {
      // Total and active experts
      const [totalExpertsResult] = await db
        .select({ count: sql`count(*)` })
        .from(users)
        .where(eq(users.role, 'expert'));

      const totalExperts = parseInt(totalExpertsResult?.count as string || '0');

      const [activeExpertsResult] = await db
        .select({ count: sql`count(DISTINCT ${awarenessSessionRequests.assignedExpertId})` })
        .from(awarenessSessionRequests)
        .where(and(
          gte(awarenessSessionRequests.createdAt, dateRange.startDate),
          lte(awarenessSessionRequests.createdAt, dateRange.endDate),
          sql`${awarenessSessionRequests.assignedExpertId} IS NOT NULL`
        ));

      const activeExperts = parseInt(activeExpertsResult?.count as string || '0');

      // Expert assignments with performance metrics
      const expertAssignmentResults = await db
        .select({
          expertId: awarenessSessionRequests.assignedExpertId,
          expertFirstName: users.firstName,
          expertLastName: users.lastName,
          expertEmail: users.email,
          totalAssigned: sql`count(*)`,
          totalConfirmed: sql`count(CASE WHEN ${awarenessSessionRequests.status} = 'confirmed' THEN 1 END)`,
          totalDeclined: sql`count(CASE WHEN ${awarenessSessionRequests.status} = 'expert_declined' THEN 1 END)`,
          avgResponseTime: sql`AVG(EXTRACT(EPOCH FROM (${awarenessSessionRequests.updatedAt} - ${awarenessSessionRequests.reviewedAt})) / 3600)`
        })
        .from(awarenessSessionRequests)
        .innerJoin(users, eq(awarenessSessionRequests.assignedExpertId, users.id))
        .where(and(
          gte(awarenessSessionRequests.createdAt, dateRange.startDate),
          lte(awarenessSessionRequests.createdAt, dateRange.endDate),
          sql`${awarenessSessionRequests.assignedExpertId} IS NOT NULL`
        ))
        .groupBy(
          awarenessSessionRequests.assignedExpertId,
          users.firstName,
          users.lastName,
          users.email
        );

      const expertAssignments = expertAssignmentResults.map((result: any) => {
        const totalAssigned = parseInt(result.totalAssigned);
        const totalConfirmed = parseInt(result.totalConfirmed);
        const totalDeclined = parseInt(result.totalDeclined);
        const acceptanceRate = totalAssigned > 0 ? (totalConfirmed / totalAssigned) * 100 : 0;
        const averageResponseTime = parseFloat(result.avgResponseTime || '0');

        return {
          expertId: result.expertId,
          expertName: `${result.expertFirstName} ${result.expertLastName}`,
          expertEmail: result.expertEmail,
          totalAssigned,
          totalConfirmed,
          totalDeclined,
          acceptanceRate: Math.round(acceptanceRate * 100) / 100,
          averageResponseTime: Math.round(averageResponseTime * 100) / 100
        };
      });

      // Unassigned requests
      const [unassignedResult] = await db
        .select({ count: sql`count(*)` })
        .from(awarenessSessionRequests)
        .where(and(
          gte(awarenessSessionRequests.createdAt, dateRange.startDate),
          lte(awarenessSessionRequests.createdAt, dateRange.endDate),
          sql`${awarenessSessionRequests.assignedExpertId} IS NULL`,
          eq(awarenessSessionRequests.status, 'pending_admin_review')
        ));

      const unassignedRequests = parseInt(unassignedResult?.count as string || '0');

      // Reassignment rate (requests that were declined and reassigned)
      const [reassignedResult] = await db
        .select({ count: sql`count(*)` })
        .from(awarenessSessionStatusHistory)
        .where(and(
          gte(awarenessSessionStatusHistory.createdAt, dateRange.startDate),
          lte(awarenessSessionStatusHistory.createdAt, dateRange.endDate),
          eq(awarenessSessionStatusHistory.previousStatus, 'expert_declined'),
          eq(awarenessSessionStatusHistory.newStatus, 'forwarded_to_expert')
        ));

      const reassignedCount = parseInt(reassignedResult?.count as string || '0');
      const totalDeclined = expertAssignments.reduce((sum, expert) => sum + expert.totalDeclined, 0);
      const reassignmentRate = totalDeclined > 0 ? (reassignedCount / totalDeclined) * 100 : 0;

      const metrics: ExpertUtilizationMetrics = {
        totalExperts,
        activeExperts,
        expertAssignments,
        unassignedRequests,
        reassignmentRate: Math.round(reassignmentRate * 100) / 100
      };

      return serviceSuccess(metrics);
    } catch (error) {
      this.logger.error('Failed to get expert utilization metrics', { error, dateRange });
      return serviceError('Failed to get expert utilization metrics', 'INTERNAL_ERROR');
    }
  }

  /**
   * Get session analytics
   */
  async getSessionAnalytics(dateRange: AnalyticsDateRange): Promise<ServiceResult<SessionAnalytics>> {
    try {
      // Sessions by duration
      const durationResults = await db
        .select({
          duration: awarenessSessionRequests.duration,
          count: sql`count(*)`
        })
        .from(awarenessSessionRequests)
        .where(and(
          gte(awarenessSessionRequests.createdAt, dateRange.startDate),
          lte(awarenessSessionRequests.createdAt, dateRange.endDate)
        ))
        .groupBy(awarenessSessionRequests.duration);

      const sessionsByDuration: Record<SessionDuration, number> = {
        '1_hour': 0,
        '2_hours': 0,
        'half_day': 0,
        'full_day': 0
      };

      durationResults.forEach((result: any) => {
        if (result.duration in sessionsByDuration) {
          sessionsByDuration[result.duration as SessionDuration] = parseInt(result.count);
        }
      });

      // Sessions by mode
      const modeResults = await db
        .select({
          sessionMode: awarenessSessionRequests.sessionMode,
          count: sql`count(*)`
        })
        .from(awarenessSessionRequests)
        .where(and(
          gte(awarenessSessionRequests.createdAt, dateRange.startDate),
          lte(awarenessSessionRequests.createdAt, dateRange.endDate)
        ))
        .groupBy(awarenessSessionRequests.sessionMode);

      const sessionsByMode: Record<SessionMode, number> = {
        'on_site': 0,
        'online': 0
      };

      modeResults.forEach((result: any) => {
        if (result.sessionMode in sessionsByMode) {
          sessionsByMode[result.sessionMode as SessionMode] = parseInt(result.count);
        }
      });

      // Sessions by audience type (need to parse JSON)
      const audienceResults = await db
        .select({
          audienceTypes: awarenessSessionRequests.audienceTypes
        })
        .from(awarenessSessionRequests)
        .where(and(
          gte(awarenessSessionRequests.createdAt, dateRange.startDate),
          lte(awarenessSessionRequests.createdAt, dateRange.endDate)
        ));

      const sessionsByAudienceType: Record<AudienceType, number> = {
        'women': 0,
        'kids': 0,
        'adults': 0,
        'mixed': 0,
        'corporate_staff': 0,
        'students': 0
      };

      audienceResults.forEach((result: any) => {
        try {
          const types = (result.audienceTypes || []) as AudienceType[];
          types.forEach(type => {
            if (type in sessionsByAudienceType) {
              sessionsByAudienceType[type]++;
            }
          });
        } catch (e) {
          // Skip invalid data
        }
      });

      // Average audience size and total reached
      const [audienceSizeResult] = await db
        .select({
          avgSize: sql`AVG(${awarenessSessionRequests.audienceSize})`,
          totalSize: sql`SUM(${awarenessSessionRequests.audienceSize})`
        })
        .from(awarenessSessionRequests)
        .where(and(
          gte(awarenessSessionRequests.createdAt, dateRange.startDate),
          lte(awarenessSessionRequests.createdAt, dateRange.endDate),
          eq(awarenessSessionRequests.status, 'confirmed')
        ));

      const averageAudienceSize = Math.round(parseFloat(audienceSizeResult?.avgSize as string || '0'));
      const totalAudienceReached = parseInt(audienceSizeResult?.totalSize as string || '0');

      // Popular topics
      const topicResults = await db
        .select({
          subject: awarenessSessionRequests.subject,
          count: sql`count(*)`
        })
        .from(awarenessSessionRequests)
        .where(and(
          gte(awarenessSessionRequests.createdAt, dateRange.startDate),
          lte(awarenessSessionRequests.createdAt, dateRange.endDate)
        ))
        .groupBy(awarenessSessionRequests.subject)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

      const popularTopics = topicResults.map((result: any) => ({
        topic: result.subject,
        count: parseInt(result.count)
      }));

      // Location distribution
      const locationResults = await db
        .select({
          location: awarenessSessionRequests.location,
          count: sql`count(*)`
        })
        .from(awarenessSessionRequests)
        .where(and(
          gte(awarenessSessionRequests.createdAt, dateRange.startDate),
          lte(awarenessSessionRequests.createdAt, dateRange.endDate)
        ))
        .groupBy(awarenessSessionRequests.location)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

      const locationDistribution = locationResults.map((result: any) => ({
        location: result.location,
        count: parseInt(result.count)
      }));

      const analytics: SessionAnalytics = {
        sessionsByDuration,
        sessionsByMode,
        sessionsByAudienceType,
        averageAudienceSize,
        totalAudienceReached,
        popularTopics,
        locationDistribution
      };

      return serviceSuccess(analytics);
    } catch (error) {
      this.logger.error('Failed to get session analytics', { error, dateRange });
      return serviceError('Failed to get session analytics', 'INTERNAL_ERROR');
    }
  }

  /**
   * Get trend analysis
   */
  async getTrendAnalysis(dateRange: AnalyticsDateRange): Promise<ServiceResult<TrendAnalysis>> {
    try {
      // Request trends by month
      const trendResults = await db
        .select({
          month: sql`DATE_TRUNC('month', ${awarenessSessionRequests.createdAt})`,
          totalRequests: sql`count(*)`,
          confirmed: sql`count(CASE WHEN ${awarenessSessionRequests.status} = 'confirmed' THEN 1 END)`,
          rejected: sql`count(CASE WHEN ${awarenessSessionRequests.status} = 'rejected' THEN 1 END)`
        })
        .from(awarenessSessionRequests)
        .where(and(
          gte(awarenessSessionRequests.createdAt, dateRange.startDate),
          lte(awarenessSessionRequests.createdAt, dateRange.endDate)
        ))
        .groupBy(sql`DATE_TRUNC('month', ${awarenessSessionRequests.createdAt})`)
        .orderBy(sql`DATE_TRUNC('month', ${awarenessSessionRequests.createdAt})`);

      const requestTrends = trendResults.map((result: any) => {
        const requests = parseInt(result.totalRequests);
        const confirmed = parseInt(result.confirmed);
        const rejected = parseInt(result.rejected);
        const conversionRate = requests > 0 ? (confirmed / requests) * 100 : 0;

        return {
          period: new Date(result.month).toISOString().split('T')[0],
          requests,
          confirmed,
          rejected,
          conversionRate: Math.round(conversionRate * 100) / 100
        };
      });

      // Seasonal patterns (average by month across all years)
      const seasonalResults = await db
        .select({
          month: sql`EXTRACT(MONTH FROM ${awarenessSessionRequests.createdAt})`,
          year: sql`EXTRACT(YEAR FROM ${awarenessSessionRequests.createdAt})`,
          count: sql`count(*)`
        })
        .from(awarenessSessionRequests)
        .groupBy(
          sql`EXTRACT(MONTH FROM ${awarenessSessionRequests.createdAt})`,
          sql`EXTRACT(YEAR FROM ${awarenessSessionRequests.createdAt})`
        );

      // Process seasonal data
      const monthlyData: Record<number, { counts: number[], years: number[] }> = {};
      seasonalResults.forEach((result: any) => {
        const month = parseInt(result.month);
        const year = parseInt(result.year);
        const count = parseInt(result.count);

        if (!monthlyData[month]) {
          monthlyData[month] = { counts: [], years: [] };
        }
        monthlyData[month].counts.push(count);
        monthlyData[month].years.push(year);
      });

      const seasonalPatterns = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const data = monthlyData[month] || { counts: [0], years: [new Date().getFullYear()] };
        const averageRequests = data.counts.reduce((sum, count) => sum + count, 0) / data.counts.length;
        const maxIndex = data.counts.indexOf(Math.max(...data.counts));
        const peakYear = data.years[maxIndex] || new Date().getFullYear();

        return {
          month,
          monthName: new Date(0, month - 1).toLocaleString('default', { month: 'long' }),
          averageRequests: Math.round(averageRequests * 100) / 100,
          peakYear
        };
      });

      // Status transition times
      const transitionResults = await db
        .select({
          previousStatus: awarenessSessionStatusHistory.previousStatus,
          newStatus: awarenessSessionStatusHistory.newStatus,
          avgTime: sql`AVG(EXTRACT(EPOCH FROM (${awarenessSessionStatusHistory.createdAt} - ${awarenessSessionRequests.createdAt})) / 3600)`
        })
        .from(awarenessSessionStatusHistory)
        .innerJoin(awarenessSessionRequests, eq(awarenessSessionStatusHistory.sessionRequestId, awarenessSessionRequests.id))
        .where(and(
          gte(awarenessSessionStatusHistory.createdAt, dateRange.startDate),
          lte(awarenessSessionStatusHistory.createdAt, dateRange.endDate)
        ))
        .groupBy(
          awarenessSessionStatusHistory.previousStatus,
          awarenessSessionStatusHistory.newStatus
        );

      const statusTransitionTimes: Record<string, number> = {};
      transitionResults.forEach((result: any) => {
        const key = `${result.previousStatus || 'initial'}_to_${result.newStatus}`;
        statusTransitionTimes[key] = Math.round(parseFloat(result.avgTime || '0') * 100) / 100;
      });

      const analysis: TrendAnalysis = {
        requestTrends,
        seasonalPatterns,
        statusTransitionTimes
      };

      return serviceSuccess(analysis);
    } catch (error) {
      this.logger.error('Failed to get trend analysis', { error, dateRange });
      return serviceError('Failed to get trend analysis', 'INTERNAL_ERROR');
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(options: ExportOptions): Promise<ServiceResult<{ data: string; filename: string; mimeType: string }>> {
    try {
      this.validateRequired(options.format, 'format');
      this.validateRequired(options.dateRange, 'dateRange');

      const analyticsResult = await this.getAnalytics(options.dateRange);
      if (!analyticsResult.success || !analyticsResult.data) {
        return serviceError('Failed to generate analytics for export', 'ANALYTICS_ERROR');
      }

      const analytics = analyticsResult.data;

      if (options.format === 'csv') {
        const csvData = this.generateCSVExport(analytics, options);
        const filename = `awareness-session-analytics-${analytics.dateRange.startDate.toISOString().split('T')[0]}-to-${analytics.dateRange.endDate.toISOString().split('T')[0]}.csv`;

        return serviceSuccess({
          data: csvData,
          filename,
          mimeType: 'text/csv'
        });
      } else if (options.format === 'pdf') {
        // For PDF, we'll return structured data that the frontend can use to generate PDF
        const pdfData = this.generatePDFData(analytics, options);
        const filename = `awareness-session-analytics-${analytics.dateRange.startDate.toISOString().split('T')[0]}-to-${analytics.dateRange.endDate.toISOString().split('T')[0]}.json`;

        return serviceSuccess({
          data: JSON.stringify(pdfData, null, 2),
          filename,
          mimeType: 'application/json'
        });
      }

      return serviceError('Unsupported export format', 'INVALID_FORMAT');
    } catch (error) {
      this.logger.error('Failed to export analytics', { error, options });
      return serviceError('Failed to export analytics', 'INTERNAL_ERROR');
    }
  }

  /**
   * Generate CSV export data
   */
  private generateCSVExport(analytics: ComprehensiveAnalytics, options: ExportOptions): string {
    const lines: string[] = [];

    // Header
    lines.push('Awareness Session Analytics Report');
    lines.push(`Generated: ${analytics.generatedAt.toISOString()}`);
    lines.push(`Date Range: ${analytics.dateRange.startDate.toISOString().split('T')[0]} to ${analytics.dateRange.endDate.toISOString().split('T')[0]}`);
    lines.push('');

    // Request Volume Summary
    lines.push('REQUEST VOLUME SUMMARY');
    lines.push('Metric,Value');
    lines.push(`Total Requests,${analytics.requestVolume.totalRequests}`);
    lines.push(`Average Requests Per Day,${analytics.requestVolume.averageRequestsPerDay}`);
    lines.push('');

    // Requests by Status
    lines.push('REQUESTS BY STATUS');
    lines.push('Status,Count');
    Object.entries(analytics.requestVolume.requestsByStatus).forEach(([status, count]) => {
      lines.push(`${status},${count}`);
    });
    lines.push('');

    // Expert Utilization
    lines.push('EXPERT UTILIZATION');
    lines.push('Expert Name,Email,Total Assigned,Confirmed,Declined,Acceptance Rate %,Avg Response Time (hours)');
    analytics.expertUtilization.expertAssignments.forEach(expert => {
      lines.push(`"${expert.expertName}","${expert.expertEmail}",${expert.totalAssigned},${expert.totalConfirmed},${expert.totalDeclined},${expert.acceptanceRate},${expert.averageResponseTime}`);
    });
    lines.push('');

    // Session Analytics
    lines.push('SESSION ANALYTICS');
    lines.push('Duration,Count');
    Object.entries(analytics.sessionAnalytics.sessionsByDuration).forEach(([duration, count]) => {
      lines.push(`${duration},${count}`);
    });
    lines.push('');

    lines.push('Mode,Count');
    Object.entries(analytics.sessionAnalytics.sessionsByMode).forEach(([mode, count]) => {
      lines.push(`${mode},${count}`);
    });
    lines.push('');

    // Popular Topics
    lines.push('POPULAR TOPICS');
    lines.push('Topic,Count');
    analytics.sessionAnalytics.popularTopics.forEach(topic => {
      lines.push(`"${topic.topic}",${topic.count}`);
    });

    return lines.join('\n');
  }

  /**
   * Generate PDF data structure
   */
  private generatePDFData(analytics: ComprehensiveAnalytics, options: ExportOptions) {
    return {
      title: 'Awareness Session Analytics Report',
      generatedAt: analytics.generatedAt.toISOString(),
      dateRange: {
        start: analytics.dateRange.startDate.toISOString().split('T')[0],
        end: analytics.dateRange.endDate.toISOString().split('T')[0]
      },
      summary: {
        totalRequests: analytics.requestVolume.totalRequests,
        averageRequestsPerDay: analytics.requestVolume.averageRequestsPerDay,
        totalExperts: analytics.expertUtilization.totalExperts,
        activeExperts: analytics.expertUtilization.activeExperts,
        totalAudienceReached: analytics.sessionAnalytics.totalAudienceReached
      },
      charts: {
        requestsByStatus: analytics.requestVolume.requestsByStatus,
        requestsByMonth: analytics.requestVolume.requestsByMonth,
        sessionsByDuration: analytics.sessionAnalytics.sessionsByDuration,
        sessionsByMode: analytics.sessionAnalytics.sessionsByMode,
        expertPerformance: analytics.expertUtilization.expertAssignments,
        popularTopics: analytics.sessionAnalytics.popularTopics.slice(0, 5),
        trendAnalysis: analytics.trendAnalysis.requestTrends
      },
      includeDetails: options.includeDetails
    };
  }
}

// Export singleton instance
export const awarenessSessionAnalyticsService = new AwarenessSessionAnalyticsService();
