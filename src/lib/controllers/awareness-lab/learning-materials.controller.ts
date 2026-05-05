import { NextRequest, NextResponse } from 'next/server';
import { BaseController } from '../auth/auth.controller';
import { learningService } from '@/lib/services/awareness-lab/learning.service';
import { logger } from '@/infrastructure/logging/logger';
import {
  learningModuleSchema,
  learningModuleUpdateSchema,
  moduleMaterialSchema,
  type LearningModuleData,
  type LearningModuleUpdateData,
  type ModuleMaterialData
} from '@/lib/validation/awareness-lab-schemas';

/**
 * Learning materials controller handling module and material management endpoints
 */
export class LearningMaterialsController extends BaseController {

  // ===== ADMIN MODULE MANAGEMENT =====

  /**
   * Create a new learning module (admin only)
   */
  async createModule(request: NextRequest): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Parse and validate request body
      const body = await this.parseBody<LearningModuleData>(request);
      if (!body) {
        return this.error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
      }

      // Validate using Zod schema
      const validationResult = learningModuleSchema.safeParse(body);
      if (!validationResult.success) {
        const errors = validationResult.error.issues.map(err =>
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        return this.error(`Validation failed: ${errors}`, 'VALIDATION_ERROR', 400);
      }

      // Create module using service
      const result = await learningService.createModule(session.userId!, validationResult.data);

      if (!result.success) {
        return this.error(result.error || 'Failed to create module', result.code, 400);
      }

      return this.success(result.data, 'Learning module created successfully', 201);
    } catch (error: any) {
      logger.error('Failed to create learning module:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Get all learning modules for admin with filtering and pagination
   */
  async getModules(request: NextRequest): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Parse query parameters
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Max 100 per page
      const category = searchParams.get('category') || undefined;
      const isPublished = searchParams.get('isPublished');
      const createdBy = searchParams.get('createdBy') || undefined;
      const search = searchParams.get('search') || undefined;

      // Calculate offset
      const offset = (page - 1) * limit;

      // Build filters
      const filters: any = {};
      if (category) filters.category = category;
      if (isPublished !== null) filters.isPublished = isPublished === 'true';
      if (createdBy) filters.createdBy = createdBy;
      if (search) filters.search = search;

      // Get modules using service
      const result = await learningService.getModulesForAdmin(filters, limit, offset);

      if (!result.success) {
        return this.error(result.error || 'Failed to fetch modules', result.code, 400);
      }

      // Get total count for pagination
      const totalResult = await learningService.getModulesCount(filters);
      const total = totalResult.success ? totalResult.data : 0;
      const totalPages = Math.ceil(total / limit);

      // Add pagination metadata
      const response = {
        modules: result.data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages
        },
        filters
      };

      return this.success(response, 'Learning modules retrieved successfully');
    } catch (error: any) {
      logger.error('Failed to get learning modules:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Get learning module by ID (admin only)
   */
  async getModuleById(request: NextRequest, moduleId: string): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Validate module ID format
      if (!moduleId || typeof moduleId !== 'string') {
        return this.error('Invalid module ID', 'INVALID_MODULE_ID', 400);
      }

      // Get module using service (this will get module with materials)
      const result = await learningService.getModuleForCustomer(moduleId, session.userId!);

      if (!result.success) {
        const statusCode = result.code === 'MODULE_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to fetch module', result.code, statusCode);
      }

      return this.success(result.data, 'Learning module retrieved successfully');
    } catch (error: any) {
      logger.error('Failed to get learning module by ID:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Update learning module (admin only)
   */
  async updateModule(request: NextRequest, moduleId: string): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Validate module ID format
      if (!moduleId || typeof moduleId !== 'string') {
        return this.error('Invalid module ID', 'INVALID_MODULE_ID', 400);
      }

      // Parse and validate request body
      const body = await this.parseBody<Partial<LearningModuleUpdateData>>(request);
      if (!body) {
        return this.error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
      }

      // Check if there's actually data to update
      if (Object.keys(body).length === 0) {
        return this.error('No update data provided', 'NO_UPDATE_DATA', 400);
      }

      // Validate using partial Zod schema
      const validationResult = learningModuleUpdateSchema.safeParse(body);
      if (!validationResult.success) {
        const errors = validationResult.error.issues.map(err =>
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        return this.error(`Validation failed: ${errors}`, 'VALIDATION_ERROR', 400);
      }

      // Update module using service
      const result = await learningService.updateModule(moduleId, validationResult.data, session.userId!);

      if (!result.success) {
        const statusCode = result.code === 'MODULE_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to update module', result.code, statusCode);
      }

      return this.success(result.data, 'Learning module updated successfully');
    } catch (error: any) {
      logger.error('Failed to update learning module:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Delete learning module (admin only)
   */
  async deleteModule(request: NextRequest, moduleId: string): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Validate module ID format
      if (!moduleId || typeof moduleId !== 'string') {
        return this.error('Invalid module ID', 'INVALID_MODULE_ID', 400);
      }

      // Delete module using service
      const result = await learningService.deleteModule(moduleId, session.userId!);

      if (!result.success) {
        const statusCode = result.code === 'MODULE_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to delete module', result.code, statusCode);
      }

      return this.success({ deleted: true }, 'Learning module deleted successfully');
    } catch (error: any) {
      logger.error('Failed to delete learning module:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Publish or unpublish a learning module (admin only)
   */
  async setModulePublished(request: NextRequest, moduleId: string): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Validate module ID format
      if (!moduleId || typeof moduleId !== 'string') {
        return this.error('Invalid module ID', 'INVALID_MODULE_ID', 400);
      }

      // Parse request body for published status
      const body = await this.parseBody<{ isPublished: boolean }>(request);
      if (!body || typeof body.isPublished !== 'boolean') {
        return this.error('Invalid request body - isPublished boolean required', 'INVALID_REQUEST_BODY', 400);
      }

      // Update published status using service
      const result = await learningService.setModulePublished(moduleId, body.isPublished, session.userId!);

      if (!result.success) {
        const statusCode = result.code === 'MODULE_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to update module status', result.code, statusCode);
      }

      const action = body.isPublished ? 'published' : 'unpublished';
      return this.success(result.data, `Learning module ${action} successfully`);
    } catch (error: any) {
      logger.error('Failed to set module published status:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  // ===== MATERIAL MANAGEMENT =====

  /**
   * Add material to a learning module (admin only)
   */
  async addMaterial(request: NextRequest, moduleId: string): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Validate module ID format
      if (!moduleId || typeof moduleId !== 'string') {
        return this.error('Invalid module ID', 'INVALID_MODULE_ID', 400);
      }

      // Parse and validate request body
      const body = await this.parseBody<ModuleMaterialData>(request);
      if (!body) {
        return this.error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
      }

      // Validate using Zod schema
      const validationResult = moduleMaterialSchema.safeParse(body);
      if (!validationResult.success) {
        const errors = validationResult.error.issues.map(err =>
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        return this.error(`Validation failed: ${errors}`, 'VALIDATION_ERROR', 400);
      }

      // Add material using service
      const result = await learningService.addMaterial(moduleId, validationResult.data, session.userId!);

      if (!result.success) {
        const statusCode = result.code === 'MODULE_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to add material', result.code, statusCode);
      }

      return this.success(result.data, 'Material added successfully', 201);
    } catch (error: any) {
      logger.error('Failed to add material:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Update a material (admin only)
   */
  async updateMaterial(request: NextRequest, materialId: string): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Validate material ID format
      if (!materialId || typeof materialId !== 'string') {
        return this.error('Invalid material ID', 'INVALID_MATERIAL_ID', 400);
      }

      // Parse and validate request body
      const body = await this.parseBody<Partial<ModuleMaterialData>>(request);
      if (!body) {
        return this.error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
      }

      console.log('Update Material Controller - Received body:', JSON.stringify(body, null, 2));
      console.log('Update Material Controller - materialData type:', typeof body.materialData);
      if (body.materialData?.duration) {
        console.log('Update Material Controller - Duration value:', body.materialData.duration);
        console.log('Update Material Controller - Duration type:', typeof body.materialData.duration);
      }

      // Check if there's actually data to update
      if (Object.keys(body).length === 0) {
        return this.error('No update data provided', 'NO_UPDATE_DATA', 400);
      }

      // Validate using partial Zod schema
      const validationResult = moduleMaterialSchema.partial().safeParse(body);
      if (!validationResult.success) {
        const errors = validationResult.error.issues.map(err =>
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        return this.error(`Validation failed: ${errors}`, 'VALIDATION_ERROR', 400);
      }

      // Update material using service
      const result = await learningService.updateMaterial(materialId, validationResult.data, session.userId!);

      if (!result.success) {
        const statusCode = result.code === 'MATERIAL_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to update material', result.code, statusCode);
      }

      return this.success(result.data, 'Material updated successfully');
    } catch (error: any) {
      logger.error('Failed to update material:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Delete a material (admin only)
   */
  async deleteMaterial(request: NextRequest, materialId: string): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Validate material ID format
      if (!materialId || typeof materialId !== 'string') {
        return this.error('Invalid material ID', 'INVALID_MATERIAL_ID', 400);
      }

      // Delete material using service
      const result = await learningService.deleteMaterial(materialId, session.userId!);

      if (!result.success) {
        const statusCode = result.code === 'MATERIAL_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to delete material', result.code, statusCode);
      }

      return this.success({ deleted: true }, 'Material deleted successfully');
    } catch (error: any) {
      logger.error('Failed to delete material:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Reorder materials in a module (admin only)
   */
  async reorderMaterials(request: NextRequest, moduleId: string): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Validate module ID format
      if (!moduleId || typeof moduleId !== 'string') {
        return this.error('Invalid module ID', 'INVALID_MODULE_ID', 400);
      }

      // Parse request body for reorder data
      const body = await this.parseBody<{
        materialIds?: string[];
        draggedMaterialId?: string;
        targetMaterialId?: string;
      }>(request);
      logger.info('Parsed request body for reorder:', { body, bodyType: typeof body });

      if (!body) {
        return this.error('Invalid request body - failed to parse JSON', 'INVALID_REQUEST_BODY', 400);
      }

      let materialIds: string[];

      // Handle two formats: legacy materialIds array or new drag-and-drop format
      if (body.materialIds && Array.isArray(body.materialIds)) {
        // Legacy format: direct array of material IDs in order
        if (body.materialIds.length === 0) {
          return this.error('Material IDs array cannot be empty', 'EMPTY_MATERIAL_IDS', 400);
        }
        materialIds = body.materialIds;
      } else if (body.draggedMaterialId && body.targetMaterialId) {
        // New drag-and-drop format: need to compute the new order
        const draggedId = body.draggedMaterialId;
        const targetId = body.targetMaterialId;

        if (typeof draggedId !== 'string' || typeof targetId !== 'string') {
          return this.error('Invalid material IDs - must be strings', 'INVALID_MATERIAL_IDS', 400);
        }

        // Get current materials to compute new order
        const reorderResult = await learningService.computeReorderFromDrag(moduleId, draggedId, targetId);
        if (!reorderResult.success) {
          const statusCode = reorderResult.code === 'MODULE_NOT_FOUND' ? 404 : 400;
          return this.error(reorderResult.error || 'Failed to compute reorder', reorderResult.code, statusCode);
        }
        materialIds = reorderResult.data!;
      } else {
        return this.error(
          'Invalid request body - must provide either materialIds array or draggedMaterialId/targetMaterialId',
          'INVALID_REQUEST_BODY',
          400
        );
      }

      // Reorder materials using service
      const result = await learningService.reorderMaterials(moduleId, materialIds, session.userId!);

      if (!result.success) {
        const statusCode = result.code === 'MODULE_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to reorder materials', result.code, statusCode);
      }

      return this.success({ reordered: true }, 'Materials reordered successfully');
    } catch (error: any) {
      logger.error('Failed to reorder materials:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  // ===== CATEGORY MANAGEMENT =====

  /**
   * Get available categories (admin only)
   */
  async getCategories(request: NextRequest): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Get categories using service
      const result = await learningService.getCategories();

      if (!result.success) {
        return this.error(result.error || 'Failed to fetch categories', result.code, 400);
      }

      return this.success(result.data, 'Categories retrieved successfully');
    } catch (error: any) {
      logger.error('Failed to get categories:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  // ===== EXPERT MODULE MANAGEMENT =====

  /**
   * Get learning modules for expert (expert role only)
   */
  async getLearningModulesForExpert(request: NextRequest): Promise<NextResponse> {
    try {
      // Validate expert session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'expert') {
        return this.error('Expert access required', 'EXPERT_ACCESS_REQUIRED', 403);
      }

      // Parse query parameters
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
      const category = searchParams.get('category') || undefined;
      const isPublished = searchParams.get('published') === 'true' ? true :
        searchParams.get('published') === 'false' ? false : undefined;

      // Calculate offset
      const offset = (page - 1) * limit;

      // Build filters for expert-targeted modules
      const filters = {
        category,
        isPublished,
        targetAudience: 'expert' as const,
        createdBy: session.userId // Only show modules created by this expert
      };

      // Get modules using service
      const result = await learningService.getModulesForAdmin(filters, limit, offset);

      if (!result.success) {
        return this.error(result.error || 'Failed to fetch modules', result.code, 400);
      }

      // Add pagination metadata
      const response = {
        modules: result.data,
        pagination: {
          page,
          limit,
          total: result.data?.length || 0,
          hasMore: (result.data?.length || 0) === limit
        },
        filters
      };

      return this.success(response, 'Expert learning modules retrieved successfully');
    } catch (error: any) {
      logger.error('Failed to get learning modules for expert:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Create a new learning module for expert (expert role only)
   */
  async createLearningModuleForExpert(request: NextRequest): Promise<NextResponse> {
    try {
      // Validate expert session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'expert') {
        return this.error('Expert access required', 'EXPERT_ACCESS_REQUIRED', 403);
      }

      // Parse and validate request body
      const body = await this.parseBody<LearningModuleData>(request);
      if (!body) {
        return this.error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
      }

      // Validate using Zod schema
      const validationResult = learningModuleSchema.safeParse(body);
      if (!validationResult.success) {
        const errors = validationResult.error.issues.map(err =>
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        return this.error(`Validation failed: ${errors}`, 'VALIDATION_ERROR', 400);
      }

      // Ensure targetAudience is set to expert
      const moduleData = {
        ...validationResult.data,
        targetAudience: 'expert' as const
      };

      // Create module using service
      const result = await learningService.createModule(session.userId!, moduleData);

      if (!result.success) {
        return this.error(result.error || 'Failed to create learning module', result.code, 400);
      }

      return this.success(result.data, 'Learning module created successfully');
    } catch (error: any) {
      logger.error('Failed to create learning module for expert:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Get module by ID for expert (expert role only)
   */
  async getModuleByIdForExpert(request: NextRequest, moduleId: string): Promise<NextResponse> {
    try {
      // Validate expert session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'expert') {
        return this.error('Expert access required', 'EXPERT_ACCESS_REQUIRED', 403);
      }

      // Validate module ID format
      if (!moduleId || typeof moduleId !== 'string') {
        return this.error('Invalid module ID', 'INVALID_MODULE_ID', 400);
      }

      // Get module using service
      const result = await learningService.getModuleForCustomer(moduleId, session.userId!);

      if (!result.success) {
        const statusCode = result.code === 'MODULE_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to fetch module', result.code, statusCode);
      }

      // Verify the module belongs to this expert and targets experts
      if (!result.data?.createdBy || result.data.createdBy !== session.userId) {
        return this.error('Module not found or access denied', 'MODULE_ACCESS_DENIED', 404);
      }

      if (result.data?.targetAudience !== 'expert') {
        return this.error('Module not found or access denied', 'MODULE_ACCESS_DENIED', 404);
      }

      return this.success(result.data, 'Module retrieved successfully');
    } catch (error: any) {
      logger.error('Failed to get module by ID for expert:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Update module for expert (expert role only)
   */
  async updateModuleForExpert(request: NextRequest, moduleId: string): Promise<NextResponse> {
    try {
      // Validate expert session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'expert') {
        return this.error('Expert access required', 'EXPERT_ACCESS_REQUIRED', 403);
      }

      // Validate module ID format
      if (!moduleId || typeof moduleId !== 'string') {
        return this.error('Invalid module ID', 'INVALID_MODULE_ID', 400);
      }

      // Verify module exists and belongs to this expert
      const existingModule = await learningService.getModuleForCustomer(moduleId, session.userId!);
      if (!existingModule.success || !existingModule.data?.createdBy || existingModule.data.createdBy !== session.userId || existingModule.data?.targetAudience !== 'expert') {
        return this.error('Module not found or access denied', 'MODULE_ACCESS_DENIED', 404);
      }

      // Parse and validate request body
      const body = await this.parseBody<LearningModuleUpdateData>(request);
      if (!body) {
        return this.error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
      }

      // Validate using Zod schema
      const validationResult = learningModuleUpdateSchema.safeParse(body);
      if (!validationResult.success) {
        const errors = validationResult.error.issues.map(err =>
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        return this.error(`Validation failed: ${errors}`, 'VALIDATION_ERROR', 400);
      }

      // Ensure targetAudience is set to expert
      const updateData = {
        ...validationResult.data,
        targetAudience: 'expert' as const
      };

      // Update module using service
      const result = await learningService.updateModule(moduleId, updateData, session.userId!);

      if (!result.success) {
        const statusCode = result.code === 'MODULE_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to update module', result.code, statusCode);
      }

      return this.success(result.data, 'Module updated successfully');
    } catch (error: any) {
      logger.error('Failed to update module for expert:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Delete module for expert (expert role only)
   */
  async deleteModuleForExpert(request: NextRequest, moduleId: string): Promise<NextResponse> {
    try {
      // Validate expert session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'expert') {
        return this.error('Expert access required', 'EXPERT_ACCESS_REQUIRED', 403);
      }

      // Validate module ID format
      if (!moduleId || typeof moduleId !== 'string') {
        return this.error('Invalid module ID', 'INVALID_MODULE_ID', 400);
      }

      // Verify module exists and belongs to this expert
      const existingModule = await learningService.getModuleForCustomer(moduleId, session.userId!);
      if (!existingModule.success || !existingModule.data?.createdBy || existingModule.data.createdBy !== session.userId || existingModule.data?.targetAudience !== 'expert') {
        return this.error('Module not found or access denied', 'MODULE_ACCESS_DENIED', 404);
      }

      // Delete module using service
      const result = await learningService.deleteModule(moduleId, session.userId!);

      if (!result.success) {
        const statusCode = result.code === 'MODULE_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to delete module', result.code, statusCode);
      }

      return this.success(null, 'Module deleted successfully');
    } catch (error: any) {
      logger.error('Failed to delete module for expert:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Archive module for expert (expert role only)
   */
  async archiveModuleForExpert(request: NextRequest, moduleId: string): Promise<NextResponse> {
    try {
      // Validate expert session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'expert') {
        return this.error('Expert access required', 'EXPERT_ACCESS_REQUIRED', 403);
      }

      // Validate module ID format
      if (!moduleId || typeof moduleId !== 'string') {
        return this.error('Invalid module ID', 'INVALID_MODULE_ID', 400);
      }

      // Verify module exists and belongs to this expert
      const existingModule = await learningService.getModuleForCustomer(moduleId, session.userId!);
      if (!existingModule.success || !existingModule.data?.createdBy || existingModule.data.createdBy !== session.userId || existingModule.data?.targetAudience !== 'expert') {
        return this.error('Module not found or access denied', 'MODULE_ACCESS_DENIED', 404);
      }

      // Archive module using service
      const result = await learningService.archiveModule(moduleId, session.userId!);

      if (!result.success) {
        const statusCode = result.code === 'MODULE_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to archive module', result.code, statusCode);
      }

      return this.success(null, 'Module archived successfully');
    } catch (error: any) {
      logger.error('Failed to archive module for expert:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Check if module can be deleted or should be archived (expert role only)
   */
  async canModuleBeDeletedForExpert(request: NextRequest, moduleId: string): Promise<NextResponse> {
    try {
      // Validate expert session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'expert') {
        return this.error('Expert access required', 'EXPERT_ACCESS_REQUIRED', 403);
      }

      // Validate module ID format
      if (!moduleId || typeof moduleId !== 'string') {
        return this.error('Invalid module ID', 'INVALID_MODULE_ID', 400);
      }

      // Verify module exists and belongs to this expert
      const existingModule = await learningService.getModuleForCustomer(moduleId, session.userId!);
      if (!existingModule.success || !existingModule.data?.createdBy || existingModule.data.createdBy !== session.userId || existingModule.data?.targetAudience !== 'expert') {
        return this.error('Module not found or access denied', 'MODULE_ACCESS_DENIED', 404);
      }

      // Check if module can be deleted
      const result = await learningService.canModuleBeDeleted(moduleId);

      if (!result.success) {
        return this.error(result.error || 'Failed to check module deletion status', result.code, 400);
      }

      return this.success(result.data, 'Module deletion status checked successfully');
    } catch (error: any) {
      logger.error('Failed to check module deletion status for expert:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  // ===== CUSTOMER LEARNING MATERIALS =====

  /**
   * Get user's global learning progress across all modules
   */
  async getGlobalProgress(request: NextRequest): Promise<NextResponse> {
    try {
      // Validate session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }

      // Get progress for all modules
      const result = await learningService.getUserAllModulesProgress(session.userId!);

      if (!result.success) {
        return this.error(result.error || 'Failed to fetch progress', result.code, 400);
      }

      return this.success({ progress: result.data }, 'Learning progress retrieved successfully');
    } catch (error: any) {
      logger.error('Failed to get global learning progress:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Mark a specific material as complete
   */
  async markMaterialComplete(request: NextRequest, moduleId: string, materialId: string): Promise<NextResponse> {
    try {
      // Validate session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }

      // Validate IDs
      if (!moduleId || typeof moduleId !== 'string') {
        return this.error('Invalid module ID', 'INVALID_MODULE_ID', 400);
      }
      if (!materialId || typeof materialId !== 'string') {
        return this.error('Invalid material ID', 'INVALID_MATERIAL_ID', 400);
      }

      // Mark material as completed
      const result = await learningService.markMaterialCompleted(session.userId!, moduleId, materialId);

      if (!result.success) {
        const statusCode = result.code === 'MODULE_NOT_FOUND' || result.code === 'MATERIAL_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to mark material complete', result.code, statusCode);
      }

      return this.success(result.data, 'Material marked as complete');
    } catch (error: any) {
      logger.error('Failed to mark material complete:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Get published learning modules for all authenticated users (customers and experts)
   */
  async getPublishedModules(request: NextRequest): Promise<NextResponse> {
    try {
      // Validate session (works for both customers and experts)
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }

      // Parse query parameters
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Increased limit for experts
      const category = searchParams.get('category') || undefined;

      // Calculate offset
      const offset = (page - 1) * limit;

      // Get published modules using service
      const result = await learningService.getPublishedModules(category, limit, offset);

      if (!result.success) {
        return this.error(result.error || 'Failed to fetch learning modules', result.code, 400);
      }

      // Add pagination metadata
      const response = {
        modules: result.data,
        pagination: {
          page,
          limit,
          total: result.data?.length || 0,
          hasMore: (result.data?.length || 0) === limit
        },
        userRole: session.role // Include user role for frontend adaptation
      };

      return this.success(response, 'Published learning modules retrieved successfully');
    } catch (error: any) {
      logger.error('Failed to get published learning modules:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Get learning module by ID for all authenticated users (customers and experts) with progress tracking
   */
  async getModuleForCustomer(request: NextRequest, moduleId: string): Promise<NextResponse> {
    try {
      // Validate session (works for both customers and experts)
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }

      // Validate module ID format
      if (!moduleId || typeof moduleId !== 'string') {
        return this.error('Invalid module ID', 'INVALID_MODULE_ID', 400);
      }

      // Get module for user using service (includes progress tracking)
      const result = await learningService.getModuleForCustomer(moduleId, session.userId!);

      if (!result.success) {
        const statusCode = result.code === 'MODULE_NOT_FOUND' ? 404 :
          result.code === 'MODULE_NOT_PUBLISHED' ? 403 : 400;
        return this.error(result.error || 'Failed to fetch learning module', result.code, statusCode);
      }

      // Track module access
      await learningService.trackMaterialAccess(session.userId!, moduleId, moduleId);

      // Add user role to response for frontend adaptation
      const responseData = {
        ...result.data,
        userRole: session.role
      };

      return this.success(responseData, 'Learning module retrieved successfully');
    } catch (error: any) {
      logger.error('Failed to get learning module for user:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Update progress for learning materials
   */
  async updateProgress(request: NextRequest, moduleId: string): Promise<NextResponse> {
    try {
      // Validate customer session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }

      // Validate module ID format
      if (!moduleId || typeof moduleId !== 'string') {
        return this.error('Invalid module ID', 'INVALID_MODULE_ID', 400);
      }

      // Parse and validate request body
      const body = await this.parseBody<{
        materialId?: string;
        action?: 'access' | 'complete';
        isCompleted?: boolean;
      }>(request);

      if (!body) {
        return this.error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
      }

      // Determine material ID (can be optional for module-level progress)
      const materialId = body.materialId || moduleId;

      // Determine action based on either the action field or isCompleted field
      let action: 'access' | 'complete';
      if (body.action) {
        // New format: explicit action
        if (!['access', 'complete'].includes(body.action)) {
          return this.error('Action must be "access" or "complete"', 'INVALID_ACTION', 400);
        }
        action = body.action;
      } else if (typeof body.isCompleted === 'boolean') {
        // Legacy format: isCompleted boolean
        action = body.isCompleted ? 'complete' : 'access';
      } else {
        return this.error('Either action ("access" or "complete") or isCompleted (boolean) must be provided', 'INVALID_ACTION', 400);
      }

      let result;
      if (action === 'access') {
        // Track material access
        result = await learningService.trackMaterialAccess(session.userId!, moduleId, materialId);
      } else {
        // Mark material as completed
        result = await learningService.markMaterialCompleted(session.userId!, moduleId, materialId);
      }

      if (!result.success) {
        const statusCode = result.code === 'MODULE_NOT_FOUND' || result.code === 'MATERIAL_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to update progress', result.code, statusCode);
      }

      const message = action === 'access' ? 'Material access tracked successfully' : 'Material marked as completed';
      return this.success(result.data, message);
    } catch (error: any) {
      logger.error('Failed to update learning progress:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }
}

// Export singleton instance
export const learningMaterialsController = new LearningMaterialsController();
