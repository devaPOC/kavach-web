import { eq, and, or, desc, asc, sql, inArray, gte, lte } from 'drizzle-orm';
import { db } from '../connection';
import { awarenessSessionRequests, awarenessSessionStatusHistory } from '../schema';
import type { Transaction } from '../transaction-service';
import type {
  AwarenessSessionRequest,
  AwarenessSessionStatusHistory,
  AwarenessSessionStatus,
  CreateAwarenessSessionData,
  UpdateAwarenessSessionData,
  AudienceType,
  SessionMode
} from '@/types/awareness-session';

export interface CreateAwarenessSessionRepositoryData extends CreateAwarenessSessionData {
  requesterId: string;
}

export interface AwarenessSessionFilters {
  status?: AwarenessSessionStatus;
  requesterId?: string;
  assignedExpertId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  audienceTypes?: AudienceType[];
  sessionMode?: SessionMode;
  search?: string; // subject/organizationName/location
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: 'createdAt' | 'sessionDate' | 'updatedAt';
  orderDirection?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class AwarenessSessionRepository {
  constructor(private readonly database: any = db) { }

  /**
   * Create a new awareness session request
   */
  async create(data: CreateAwarenessSessionRepositoryData): Promise<AwarenessSessionRequest> {
    try {
      const [sessionRequest] = await this.database
        .insert(awarenessSessionRequests)
        .values({
          ...data,
          status: 'pending_admin_review' as AwarenessSessionStatus,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!sessionRequest) {
        throw new Error('Failed to create awareness session request');
      }

      return this.mapDatabaseToEntity(sessionRequest);
    } catch (error) {
      throw new Error(`Failed to create awareness session request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new awareness session request within a transaction
   */
  async createInTransaction(tx: Transaction, data: CreateAwarenessSessionRepositoryData): Promise<AwarenessSessionRequest> {
    try {
      const insertData = {
        ...data,
        status: 'pending_admin_review' as AwarenessSessionStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const [sessionRequest] = await tx
        .insert(awarenessSessionRequests)
        .values(insertData)
        .returning();

      if (!sessionRequest) {
        throw new Error('Failed to create awareness session request');
      }

      return this.mapDatabaseToEntity(sessionRequest);
    } catch (error) {
      throw new Error(`Failed to create awareness session request in transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find awareness session request by ID
   */
  async findById(id: string): Promise<AwarenessSessionRequest | null> {
    try {
      const [sessionRequest] = await this.database
        .select()
        .from(awarenessSessionRequests)
        .where(eq(awarenessSessionRequests.id, id))
        .limit(1);

      return sessionRequest ? this.mapDatabaseToEntity(sessionRequest) : null;
    } catch (error) {
      throw new Error(`Failed to find awareness session request by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find awareness session request by ID within a transaction
   */
  async findByIdInTransaction(tx: Transaction, id: string): Promise<AwarenessSessionRequest | null> {
    try {
      const [sessionRequest] = await tx
        .select()
        .from(awarenessSessionRequests)
        .where(eq(awarenessSessionRequests.id, id))
        .limit(1);

      return sessionRequest ? this.mapDatabaseToEntity(sessionRequest) : null;
    } catch (error) {
      throw new Error(`Failed to find awareness session request by ID in transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find awareness session requests by requester ID
   */
  async findByRequesterId(requesterId: string, options: PaginationOptions = {}): Promise<PaginatedResult<AwarenessSessionRequest>> {
    try {
      const { page = 1, limit = 20, orderBy = 'createdAt', orderDirection = 'desc' } = options;
      const offset = (page - 1) * limit;

      // Get orderBy column safely
      let orderColumn;
      switch (orderBy) {
        case 'createdAt':
          orderColumn = awarenessSessionRequests.createdAt;
          break;
        case 'sessionDate':
          orderColumn = awarenessSessionRequests.sessionDate;
          break;
        case 'updatedAt':
          orderColumn = awarenessSessionRequests.updatedAt;
          break;
        default:
          throw new Error(`Invalid orderBy column: ${orderBy}`);
      }
      const orderFn = orderDirection === 'asc' ? asc : desc;

      // Get total count
      const [countResult] = await this.database
        .select({ count: sql`count(*)` })
        .from(awarenessSessionRequests)
        .where(eq(awarenessSessionRequests.requesterId, requesterId));

      const total = parseInt(countResult?.count || '0');

      // Get paginated data
      const sessionRequests = await this.database
        .select()
        .from(awarenessSessionRequests)
        .where(eq(awarenessSessionRequests.requesterId, requesterId))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset);

      return {
        data: sessionRequests.map((req: any) => this.mapDatabaseToEntity(req)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new Error(`Failed to find awareness session requests by requester ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find awareness session requests by status
   */
  async findByStatus(status: AwarenessSessionStatus, options: PaginationOptions = {}): Promise<PaginatedResult<AwarenessSessionRequest>> {
    try {
      const { page = 1, limit = 20, orderBy = 'createdAt', orderDirection = 'desc' } = options;
      const offset = (page - 1) * limit;

      // Get orderBy column safely
      let orderColumn;
      switch (orderBy) {
        case 'createdAt':
          orderColumn = awarenessSessionRequests.createdAt;
          break;
        case 'sessionDate':
          orderColumn = awarenessSessionRequests.sessionDate;
          break;
        case 'updatedAt':
          orderColumn = awarenessSessionRequests.updatedAt;
          break;
        default:
          throw new Error(`Invalid orderBy column: ${orderBy}`);
      }
      const orderFn = orderDirection === 'asc' ? asc : desc;

      // Get total count
      const [countResult] = await this.database
        .select({ count: sql`count(*)` })
        .from(awarenessSessionRequests)
        .where(eq(awarenessSessionRequests.status, status));

      const total = parseInt(countResult?.count || '0');

      // Get paginated data
      const sessionRequests = await this.database
        .select()
        .from(awarenessSessionRequests)
        .where(eq(awarenessSessionRequests.status, status))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset);

      return {
        data: sessionRequests.map((req: any) => this.mapDatabaseToEntity(req)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new Error(`Failed to find awareness session requests by status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find awareness session requests by assigned expert ID
   */
  async findByExpertId(expertId: string, options: PaginationOptions = {}): Promise<PaginatedResult<AwarenessSessionRequest>> {
    try {
      const { page = 1, limit = 20, orderBy = 'createdAt', orderDirection = 'desc' } = options;
      const offset = (page - 1) * limit;

      // Get orderBy column safely
      let orderColumn;
      switch (orderBy) {
        case 'createdAt':
          orderColumn = awarenessSessionRequests.createdAt;
          break;
        case 'sessionDate':
          orderColumn = awarenessSessionRequests.sessionDate;
          break;
        case 'updatedAt':
          orderColumn = awarenessSessionRequests.updatedAt;
          break;
        default:
          throw new Error(`Invalid orderBy column: ${orderBy}`);
      }
      const orderFn = orderDirection === 'asc' ? asc : desc;

      // Get total count
      const [countResult] = await this.database
        .select({ count: sql`count(*)` })
        .from(awarenessSessionRequests)
        .where(eq(awarenessSessionRequests.assignedExpertId, expertId));

      const total = parseInt(countResult?.count || '0');

      // Get paginated data
      const sessionRequests = await this.database
        .select()
        .from(awarenessSessionRequests)
        .where(eq(awarenessSessionRequests.assignedExpertId, expertId))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset);

      return {
        data: sessionRequests.map((req: any) => this.mapDatabaseToEntity(req)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new Error(`Failed to find awareness session requests by expert ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find awareness session requests with filters
   */
  async findWithFilters(filters: AwarenessSessionFilters, options: PaginationOptions = {}): Promise<PaginatedResult<AwarenessSessionRequest>> {
    try {
      const { page = 1, limit = 20, orderBy = 'createdAt', orderDirection = 'desc' } = options;
      const offset = (page - 1) * limit;

      // Get orderBy column safely
      let orderColumn;
      switch (orderBy) {
        case 'createdAt':
          orderColumn = awarenessSessionRequests.createdAt;
          break;
        case 'sessionDate':
          orderColumn = awarenessSessionRequests.sessionDate;
          break;
        case 'updatedAt':
          orderColumn = awarenessSessionRequests.updatedAt;
          break;
        default:
          throw new Error(`Invalid orderBy column: ${orderBy}`);
      }
      const orderFn = orderDirection === 'asc' ? asc : desc;

      // Build where conditions
      const conditions = [];

      if (filters.status) {
        conditions.push(eq(awarenessSessionRequests.status, filters.status));
      }

      if (filters.requesterId) {
        conditions.push(eq(awarenessSessionRequests.requesterId, filters.requesterId));
      }

      if (filters.assignedExpertId) {
        conditions.push(eq(awarenessSessionRequests.assignedExpertId, filters.assignedExpertId));
      }

      if (filters.dateFrom) {
        conditions.push(gte(awarenessSessionRequests.sessionDate, filters.dateFrom));
      }

      if (filters.dateTo) {
        conditions.push(lte(awarenessSessionRequests.sessionDate, filters.dateTo));
      }

      if (filters.audienceTypes && filters.audienceTypes.length > 0) {
        // For JSONB array containment check
        const audienceConditions = filters.audienceTypes.map(type =>
          sql`${awarenessSessionRequests.audienceTypes} @> ${JSON.stringify([type])}::jsonb`
        );
        conditions.push(or(...audienceConditions));
      }

      if (filters.sessionMode) {
        conditions.push(eq(awarenessSessionRequests.sessionMode, filters.sessionMode));
      }

      if (filters.search && filters.search.trim()) {
        const term = `%${filters.search.trim()}%`;
        conditions.push(
          or(
            sql`${awarenessSessionRequests.subject} ILIKE ${term}`,
            sql`${awarenessSessionRequests.organizationName} ILIKE ${term}`,
            sql`${awarenessSessionRequests.location} ILIKE ${term}`
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const [countResult] = await this.database
        .select({ count: sql`count(*)` })
        .from(awarenessSessionRequests)
        .where(whereClause);

      const total = parseInt(countResult?.count || '0');

      // Get paginated data
      const sessionRequests = await this.database
        .select()
        .from(awarenessSessionRequests)
        .where(whereClause)
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset);

      return {
        data: sessionRequests.map((req: any) => this.mapDatabaseToEntity(req)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new Error(`Failed to find awareness session requests with filters: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get counts by status for an expert with optional additional filters (excluding status)
   */
  async getStatusCountsForExpert(
    filters: Omit<AwarenessSessionFilters, 'status'> & { assignedExpertId: string }
  ): Promise<Record<AwarenessSessionStatus, number>> {
    try {
      const conditions = [] as any[];

      // Scope to expert
      conditions.push(eq(awarenessSessionRequests.assignedExpertId, filters.assignedExpertId));

      // Optional filters (exclude status on purpose)
      if (filters.requesterId) {
        conditions.push(eq(awarenessSessionRequests.requesterId, filters.requesterId));
      }

      if (filters.dateFrom) {
        conditions.push(gte(awarenessSessionRequests.sessionDate, filters.dateFrom));
      }

      if (filters.dateTo) {
        conditions.push(lte(awarenessSessionRequests.sessionDate, filters.dateTo));
      }

      if (filters.audienceTypes && filters.audienceTypes.length > 0) {
        const audienceConditions = filters.audienceTypes.map(type =>
          sql`${awarenessSessionRequests.audienceTypes} @> ${JSON.stringify([type])}::jsonb`
        );
        conditions.push(or(...audienceConditions));
      }

      if (filters.sessionMode) {
        conditions.push(eq(awarenessSessionRequests.sessionMode, filters.sessionMode));
      }

      if (filters.search && filters.search.trim()) {
        const term = `%${filters.search.trim()}%`;
        conditions.push(
          or(
            sql`${awarenessSessionRequests.subject} ILIKE ${term}`,
            sql`${awarenessSessionRequests.organizationName} ILIKE ${term}`,
            sql`${awarenessSessionRequests.location} ILIKE ${term}`
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await this.database
        .select({
          status: awarenessSessionRequests.status,
          count: sql`count(*)`
        })
        .from(awarenessSessionRequests)
        .where(whereClause)
        .groupBy(awarenessSessionRequests.status);

      const counts: Record<AwarenessSessionStatus, number> = {
        'pending_admin_review': 0,
        'forwarded_to_expert': 0,
        'confirmed': 0,
        'rejected': 0,
        'expert_declined': 0,
      };

      results.forEach((row: any) => {
        if (row.status in counts) {
          counts[row.status as AwarenessSessionStatus] = parseInt(row.count as string);
        }
      });

      return counts;
    } catch (error) {
      throw new Error(`Failed to get status counts for expert: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get counts by status for a requester with optional additional filters (excluding status)
   */
  async getStatusCountsForRequester(
    filters: Omit<AwarenessSessionFilters, 'status'> & { requesterId: string }
  ): Promise<Record<AwarenessSessionStatus, number>> {
    try {
      const conditions = [] as any[];

      // Scope to requester
      conditions.push(eq(awarenessSessionRequests.requesterId, filters.requesterId));

      // Optional filters (exclude status on purpose)
      if (filters.assignedExpertId) {
        conditions.push(eq(awarenessSessionRequests.assignedExpertId, filters.assignedExpertId));
      }

      if (filters.dateFrom) {
        conditions.push(gte(awarenessSessionRequests.sessionDate, filters.dateFrom));
      }

      if (filters.dateTo) {
        conditions.push(lte(awarenessSessionRequests.sessionDate, filters.dateTo));
      }

      if (filters.audienceTypes && filters.audienceTypes.length > 0) {
        const audienceConditions = filters.audienceTypes.map(type =>
          sql`${awarenessSessionRequests.audienceTypes} @> ${JSON.stringify([type])}::jsonb`
        );
        conditions.push(or(...audienceConditions));
      }

      if (filters.sessionMode) {
        conditions.push(eq(awarenessSessionRequests.sessionMode, filters.sessionMode));
      }

      if (filters.search && filters.search.trim()) {
        const term = `%${filters.search.trim()}%`;
        conditions.push(
          or(
            sql`${awarenessSessionRequests.subject} ILIKE ${term}`,
            sql`${awarenessSessionRequests.organizationName} ILIKE ${term}`,
            sql`${awarenessSessionRequests.location} ILIKE ${term}`
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await this.database
        .select({
          status: awarenessSessionRequests.status,
          count: sql`count(*)`
        })
        .from(awarenessSessionRequests)
        .where(whereClause)
        .groupBy(awarenessSessionRequests.status);

      const counts: Record<AwarenessSessionStatus, number> = {
        'pending_admin_review': 0,
        'forwarded_to_expert': 0,
        'confirmed': 0,
        'rejected': 0,
        'expert_declined': 0,
      };

      results.forEach((row: any) => {
        if (row.status in counts) {
          counts[row.status as AwarenessSessionStatus] = parseInt(row.count as string);
        }
      });

      return counts;
    } catch (error) {
      throw new Error(`Failed to get status counts for requester: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get counts by status for admin scope with optional filters (excluding status and user scoping)
   */
  async getStatusCountsForAdmin(
    filters: Omit<AwarenessSessionFilters, 'status' | 'requesterId' | 'assignedExpertId'>
  ): Promise<Record<AwarenessSessionStatus, number>> {
    try {
      const conditions = [] as any[];

      if (filters.dateFrom) {
        conditions.push(gte(awarenessSessionRequests.sessionDate, filters.dateFrom));
      }

      if (filters.dateTo) {
        conditions.push(lte(awarenessSessionRequests.sessionDate, filters.dateTo));
      }

      if (filters.audienceTypes && filters.audienceTypes.length > 0) {
        const audienceConditions = filters.audienceTypes.map(type =>
          sql`${awarenessSessionRequests.audienceTypes} @> ${JSON.stringify([type])}::jsonb`
        );
        conditions.push(or(...audienceConditions));
      }

      if (filters.sessionMode) {
        conditions.push(eq(awarenessSessionRequests.sessionMode, filters.sessionMode));
      }

      if (filters.search && filters.search.trim()) {
        const term = `%${filters.search.trim()}%`;
        conditions.push(
          or(
            sql`${awarenessSessionRequests.subject} ILIKE ${term}`,
            sql`${awarenessSessionRequests.organizationName} ILIKE ${term}`,
            sql`${awarenessSessionRequests.location} ILIKE ${term}`
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await this.database
        .select({
          status: awarenessSessionRequests.status,
          count: sql`count(*)`
        })
        .from(awarenessSessionRequests)
        .where(whereClause)
        .groupBy(awarenessSessionRequests.status);

      const counts: Record<AwarenessSessionStatus, number> = {
        'pending_admin_review': 0,
        'forwarded_to_expert': 0,
        'confirmed': 0,
        'rejected': 0,
        'expert_declined': 0,
      };

      results.forEach((row: any) => {
        if (row.status in counts) {
          counts[row.status as AwarenessSessionStatus] = parseInt(row.count as string);
        }
      });

      return counts;
    } catch (error) {
      throw new Error(`Failed to get status counts for admin: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update awareness session request
   */
  async update(id: string, data: UpdateAwarenessSessionData): Promise<AwarenessSessionRequest | null> {
    try {
      const updateData: any = {
        ...data,
        updatedAt: new Date(),
      };

      const [sessionRequest] = await this.database
        .update(awarenessSessionRequests)
        .set(updateData)
        .where(eq(awarenessSessionRequests.id, id))
        .returning();

      return sessionRequest ? this.mapDatabaseToEntity(sessionRequest) : null;
    } catch (error) {
      throw new Error(`Failed to update awareness session request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update awareness session request within a transaction
   */
  async updateInTransaction(tx: Transaction, id: string, data: UpdateAwarenessSessionData): Promise<AwarenessSessionRequest | null> {
    try {
      const updateData: any = {
        ...data,
        updatedAt: new Date(),
      };

      const [sessionRequest] = await tx
        .update(awarenessSessionRequests)
        .set(updateData)
        .where(eq(awarenessSessionRequests.id, id))
        .returning();

      return sessionRequest ? this.mapDatabaseToEntity(sessionRequest) : null;
    } catch (error) {
      throw new Error(`Failed to update awareness session request in transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update status of awareness session request
   */
  async updateStatus(id: string, status: AwarenessSessionStatus, notes?: string): Promise<AwarenessSessionRequest | null> {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      // Set timestamp fields based on status
      if (status === 'forwarded_to_expert' || status === 'rejected') {
        updateData.reviewedAt = new Date();
      }

      if (status === 'confirmed') {
        updateData.confirmedAt = new Date();
      }

      // Add notes to appropriate field based on context
      if (notes) {
        if (status === 'rejected') {
          updateData.rejectionReason = notes;
        } else if (status === 'forwarded_to_expert') {
          updateData.adminNotes = notes;
        } else if (status === 'confirmed' || status === 'expert_declined') {
          updateData.expertNotes = notes;
        }
      }

      const [sessionRequest] = await this.database
        .update(awarenessSessionRequests)
        .set(updateData)
        .where(eq(awarenessSessionRequests.id, id))
        .returning();

      return sessionRequest ? this.mapDatabaseToEntity(sessionRequest) : null;
    } catch (error) {
      throw new Error(`Failed to update awareness session request status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update status of awareness session request within a transaction
   */
  async updateStatusInTransaction(tx: Transaction, id: string, status: AwarenessSessionStatus, notes?: string): Promise<AwarenessSessionRequest | null> {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      // Set timestamp fields based on status
      if (status === 'forwarded_to_expert' || status === 'rejected') {
        updateData.reviewedAt = new Date();
      }

      if (status === 'confirmed') {
        updateData.confirmedAt = new Date();
      }

      // Add notes to appropriate field based on context
      if (notes) {
        if (status === 'rejected') {
          updateData.rejectionReason = notes;
        } else if (status === 'forwarded_to_expert') {
          updateData.adminNotes = notes;
        } else if (status === 'confirmed' || status === 'expert_declined') {
          updateData.expertNotes = notes;
        }
      }

      const [sessionRequest] = await tx
        .update(awarenessSessionRequests)
        .set(updateData)
        .where(eq(awarenessSessionRequests.id, id))
        .returning();

      return sessionRequest ? this.mapDatabaseToEntity(sessionRequest) : null;
    } catch (error) {
      throw new Error(`Failed to update awareness session request status in transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Assign expert to awareness session request
   */
  async assignExpert(id: string, expertId: string, notes?: string): Promise<AwarenessSessionRequest | null> {
    try {
      const updateData: any = {
        assignedExpertId: expertId,
        status: 'forwarded_to_expert' as AwarenessSessionStatus,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      };

      if (notes) {
        updateData.adminNotes = notes;
      }

      const [sessionRequest] = await this.database
        .update(awarenessSessionRequests)
        .set(updateData)
        .where(eq(awarenessSessionRequests.id, id))
        .returning();

      return sessionRequest ? this.mapDatabaseToEntity(sessionRequest) : null;
    } catch (error) {
      throw new Error(`Failed to assign expert to awareness session request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Assign expert to awareness session request within a transaction
   */
  async assignExpertInTransaction(tx: Transaction, id: string, expertId: string, notes?: string): Promise<AwarenessSessionRequest | null> {
    try {
      const updateData: any = {
        assignedExpertId: expertId,
        status: 'forwarded_to_expert' as AwarenessSessionStatus,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      };

      if (notes) {
        updateData.adminNotes = notes;
      }

      const [sessionRequest] = await tx
        .update(awarenessSessionRequests)
        .set(updateData)
        .where(eq(awarenessSessionRequests.id, id))
        .returning();

      return sessionRequest ? this.mapDatabaseToEntity(sessionRequest) : null;
    } catch (error) {
      throw new Error(`Failed to assign expert to awareness session request in transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete awareness session request
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.database
        .delete(awarenessSessionRequests)
        .where(eq(awarenessSessionRequests.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      throw new Error(`Failed to delete awareness session request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add status history entry
   */
  async addStatusHistory(
    sessionRequestId: string,
    previousStatus: AwarenessSessionStatus | null,
    newStatus: AwarenessSessionStatus,
    changedBy: string,
    notes?: string
  ): Promise<AwarenessSessionStatusHistory> {
    try {
      const [historyEntry] = await this.database
        .insert(awarenessSessionStatusHistory)
        .values({
          sessionRequestId,
          previousStatus,
          newStatus,
          changedBy,
          notes,
          createdAt: new Date(),
        })
        .returning();

      if (!historyEntry) {
        throw new Error('Failed to create status history entry');
      }

      return this.mapDatabaseToHistoryEntity(historyEntry);
    } catch (error) {
      throw new Error(`Failed to add status history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add status history entry within a transaction
   */
  async addStatusHistoryInTransaction(
    tx: Transaction,
    sessionRequestId: string,
    previousStatus: AwarenessSessionStatus | null,
    newStatus: AwarenessSessionStatus,
    changedBy: string,
    notes?: string
  ): Promise<AwarenessSessionStatusHistory> {
    try {
      const [historyEntry] = await tx
        .insert(awarenessSessionStatusHistory)
        .values({
          sessionRequestId,
          previousStatus,
          newStatus,
          changedBy,
          notes,
          createdAt: new Date(),
        })
        .returning();

      if (!historyEntry) {
        throw new Error('Failed to create status history entry');
      }

      return this.mapDatabaseToHistoryEntity(historyEntry);
    } catch (error) {
      throw new Error(`Failed to add status history in transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get status history for a session request
   */
  async getStatusHistory(sessionRequestId: string): Promise<AwarenessSessionStatusHistory[]> {
    try {
      const historyEntries = await this.database
        .select()
        .from(awarenessSessionStatusHistory)
        .where(eq(awarenessSessionStatusHistory.sessionRequestId, sessionRequestId))
        .orderBy(desc(awarenessSessionStatusHistory.createdAt));

      return historyEntries.map((entry: any) => this.mapDatabaseToHistoryEntity(entry));
    } catch (error) {
      throw new Error(`Failed to get status history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Count awareness session requests by status
   */
  async countByStatus(status?: AwarenessSessionStatus): Promise<number> {
    try {
      const whereClause = status ? eq(awarenessSessionRequests.status, status) : undefined;

      const [result] = await this.database
        .select({ count: sql`count(*)` })
        .from(awarenessSessionRequests)
        .where(whereClause);

      return parseInt(result?.count || '0');
    } catch (error) {
      throw new Error(`Failed to count awareness session requests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get statistics for awareness session requests
   */
  async getStatistics(): Promise<Record<AwarenessSessionStatus, number>> {
    try {
      const results = await this.database
        .select({
          status: awarenessSessionRequests.status,
          count: sql`count(*)`
        })
        .from(awarenessSessionRequests)
        .groupBy(awarenessSessionRequests.status);

      const statistics: Record<AwarenessSessionStatus, number> = {
        'pending_admin_review': 0,
        'forwarded_to_expert': 0,
        'confirmed': 0,
        'rejected': 0,
        'expert_declined': 0,
      };

      results.forEach((result: any) => {
        if (result.status in statistics) {
          statistics[result.status as AwarenessSessionStatus] = parseInt(result.count as string);
        }
      });

      return statistics;
    } catch (error) {
      throw new Error(`Failed to get awareness session statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map database row to entity
   */
  private mapDatabaseToEntity(row: any): AwarenessSessionRequest {
    return {
      id: row.id,
      requesterId: row.requesterId,
      sessionDate: row.sessionDate,
      location: row.location,
      duration: row.duration,
      subject: row.subject,
      audienceSize: row.audienceSize,
      audienceTypes: row.audienceTypes || [],
      sessionMode: row.sessionMode,
      specialRequirements: row.specialRequirements,
      organizationName: row.organizationName,
      contactEmail: row.contactEmail,
      contactPhone: row.contactPhone,
      status: row.status,
      assignedExpertId: row.assignedExpertId,
      adminNotes: row.adminNotes,
      expertNotes: row.expertNotes,
      rejectionReason: row.rejectionReason,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      reviewedAt: row.reviewedAt,
      confirmedAt: row.confirmedAt,
    };
  }

  /**
   * Map database row to history entity
   */
  private mapDatabaseToHistoryEntity(row: any): AwarenessSessionStatusHistory {
    return {
      id: row.id,
      sessionRequestId: row.sessionRequestId,
      previousStatus: row.previousStatus,
      newStatus: row.newStatus,
      changedBy: row.changedBy,
      notes: row.notes,
      createdAt: row.createdAt,
    };
  }
}

// Export singleton instance
export const awarenessSessionRepository = new AwarenessSessionRepository();
