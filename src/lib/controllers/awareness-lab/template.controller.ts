import { NextRequest, NextResponse } from 'next/server';
import { BaseController } from '../auth/auth.controller';
import { templateService } from '@/lib/services/awareness-lab/template.service';
import { logger } from '@/infrastructure/logging/logger';
import { 
  quizTemplateSchema,
  type QuizTemplateData 
} from '@/lib/validation/awareness-lab-schemas';

/**
 * Template controller handling quiz template management endpoints
 */
export class TemplateController extends BaseController {
  
  // ===== ADMIN TEMPLATE MANAGEMENT =====

  /**
   * Create a new quiz template (admin only)
   */
  async createTemplate(request: NextRequest): Promise<NextResponse> {
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
      const body = await this.parseBody<QuizTemplateData>(request);
      if (!body) {
        return this.error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
      }

      // Validate using Zod schema
      const validationResult = quizTemplateSchema.safeParse(body);
      if (!validationResult.success) {
        const errors = validationResult.error.issues.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        return this.error(`Validation failed: ${errors}`, 'VALIDATION_ERROR', 400);
      }

      // Create template using service
      const result = await templateService.createTemplate(session.userId!, validationResult.data);

      if (!result.success) {
        return this.error(result.error || 'Failed to create template', result.code, 400);
      }

      return this.success(result.data, 'Template created successfully', 201);
    } catch (error: any) {
      logger.error('Failed to create template:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Get all templates for admin with filtering and pagination
   */
  async getTemplates(request: NextRequest): Promise<NextResponse> {
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
      const language = searchParams.get('language') as 'en' | 'ar' | null;
      const createdBy = searchParams.get('createdBy') || undefined;
      const nameSearch = searchParams.get('search') || undefined;
      const includeUsageStats = searchParams.get('includeUsageStats') === 'true';

      // Calculate offset
      const offset = (page - 1) * limit;

      // Build filters
      const filters = {
        language: language || undefined,
        createdBy,
        nameSearch
      };

      // Get templates using service
      const result = await templateService.getTemplates(filters, limit, offset);

      if (!result.success) {
        return this.error(result.error || 'Failed to fetch templates', result.code, 400);
      }

      // Enhance with usage statistics if requested
      let enhancedTemplates = result.data;
      if (includeUsageStats && result.data) {
        enhancedTemplates = await Promise.all(
          result.data.map(async (template) => {
            const usageResult = await templateService.getTemplateUsageStats(template.id);
            return {
              ...template,
              usageStats: usageResult.success ? usageResult.data : null
            };
          })
        );
      }

      // Get total count for pagination
      const countResult = await templateService.getTemplateCount(filters);
      const totalCount = countResult.success ? countResult.data : 0;

      // Add pagination metadata
      const response = {
        templates: enhancedTemplates,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasMore: (offset + (result.data?.length || 0)) < totalCount
        },
        filters
      };

      return this.success(response, 'Templates retrieved successfully');
    } catch (error: any) {
      logger.error('Failed to get templates:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Get template by ID (admin only)
   */
  async getTemplateById(request: NextRequest, templateId: string): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Validate template ID format
      if (!templateId || typeof templateId !== 'string') {
        return this.error('Invalid template ID', 'INVALID_TEMPLATE_ID', 400);
      }

      // Check if usage statistics are requested
      const { searchParams } = new URL(request.url);
      const includeUsageStats = searchParams.get('includeUsageStats') === 'true';

      // Get template using service
      const result = includeUsageStats 
        ? await templateService.getTemplateWithUsage(templateId)
        : await templateService.getTemplate(templateId);

      if (!result.success) {
        const statusCode = result.code === 'TEMPLATE_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to fetch template', result.code, statusCode);
      }

      return this.success(result.data, 'Template retrieved successfully');
    } catch (error: any) {
      logger.error('Failed to get template by ID:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Update template (admin only)
   */
  async updateTemplate(request: NextRequest, templateId: string): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Validate template ID format
      if (!templateId || typeof templateId !== 'string') {
        return this.error('Invalid template ID', 'INVALID_TEMPLATE_ID', 400);
      }

      // Parse and validate request body
      const body = await this.parseBody<Partial<QuizTemplateData>>(request);
      if (!body) {
        return this.error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
      }

      // Check if there's actually data to update
      if (Object.keys(body).length === 0) {
        return this.error('No update data provided', 'NO_UPDATE_DATA', 400);
      }

      // Validate using partial Zod schema
      const validationResult = quizTemplateSchema.partial().safeParse(body);
      if (!validationResult.success) {
        const errors = validationResult.error.issues.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        return this.error(`Validation failed: ${errors}`, 'VALIDATION_ERROR', 400);
      }

      // Update template using service
      const result = await templateService.updateTemplate(templateId, validationResult.data, session.userId!);

      if (!result.success) {
        const statusCode = result.code === 'TEMPLATE_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to update template', result.code, statusCode);
      }

      return this.success(result.data, 'Template updated successfully');
    } catch (error: any) {
      logger.error('Failed to update template:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Delete template (admin only)
   */
  async deleteTemplate(request: NextRequest, templateId: string): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Validate template ID format
      if (!templateId || typeof templateId !== 'string') {
        return this.error('Invalid template ID', 'INVALID_TEMPLATE_ID', 400);
      }

      // Delete template using service
      const result = await templateService.deleteTemplate(templateId, session.userId!);

      if (!result.success) {
        const statusCode = result.code === 'TEMPLATE_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to delete template', result.code, statusCode);
      }

      return this.success({ deleted: true }, 'Template deleted successfully');
    } catch (error: any) {
      logger.error('Failed to delete template:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Duplicate template (admin only)
   */
  async duplicateTemplate(request: NextRequest, templateId: string): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Validate template ID format
      if (!templateId || typeof templateId !== 'string') {
        return this.error('Invalid template ID', 'INVALID_TEMPLATE_ID', 400);
      }

      // Parse request body for new name (optional)
      const body = await this.parseBody<{ name?: string }>(request);
      const newName = body?.name;

      // Duplicate template using service
      const result = await templateService.duplicateTemplate(templateId, session.userId!, newName);

      if (!result.success) {
        const statusCode = result.code === 'TEMPLATE_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to duplicate template', result.code, statusCode);
      }

      return this.success(result.data, 'Template duplicated successfully', 201);
    } catch (error: any) {
      logger.error('Failed to duplicate template:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Get template usage statistics (admin only)
   */
  async getTemplateUsageStats(request: NextRequest, templateId: string): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Validate template ID format
      if (!templateId || typeof templateId !== 'string') {
        return this.error('Invalid template ID', 'INVALID_TEMPLATE_ID', 400);
      }

      // Get usage statistics using service
      const result = await templateService.getTemplateUsageStats(templateId);

      if (!result.success) {
        const statusCode = result.code === 'TEMPLATE_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to fetch usage statistics', result.code, statusCode);
      }

      return this.success(result.data, 'Usage statistics retrieved successfully');
    } catch (error: any) {
      logger.error('Failed to get template usage stats:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Use template for quiz creation (admin only)
   */
  async useTemplate(request: NextRequest, templateId: string): Promise<NextResponse> {
    try {
      // Validate admin session
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Validate template ID format
      if (!templateId || typeof templateId !== 'string') {
        return this.error('Invalid template ID', 'INVALID_TEMPLATE_ID', 400);
      }

      // Use template and get configuration
      const result = await templateService.useTemplate(templateId, session.userId!);

      if (!result.success) {
        const statusCode = result.code === 'TEMPLATE_NOT_FOUND' ? 404 : 400;
        return this.error(result.error || 'Failed to use template', result.code, statusCode);
      }

      return this.success(result.data, 'Template configuration retrieved successfully');
    } catch (error: any) {
      logger.error('Failed to use template:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Search templates (admin only)
   */
  async searchTemplates(request: NextRequest): Promise<NextResponse> {
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
      const searchTerm = searchParams.get('q') || '';
      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

      if (!searchTerm.trim()) {
        return this.error('Search term is required', 'SEARCH_TERM_REQUIRED', 400);
      }

      // Calculate offset
      const offset = (page - 1) * limit;

      // Search templates using service
      const result = await templateService.searchTemplates(searchTerm, limit, offset);

      if (!result.success) {
        return this.error(result.error || 'Failed to search templates', result.code, 400);
      }

      // Add pagination metadata
      const response = {
        templates: result.data,
        pagination: {
          page,
          limit,
          hasMore: (result.data?.length || 0) === limit
        },
        searchTerm
      };

      return this.success(response, 'Template search completed successfully');
    } catch (error: any) {
      logger.error('Failed to search templates:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  /**
   * Get popular templates (admin only)
   */
  async getPopularTemplates(request: NextRequest): Promise<NextResponse> {
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
      const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

      // Get popular templates using service
      const result = await templateService.getPopularTemplates(limit);

      if (!result.success) {
        return this.error(result.error || 'Failed to fetch popular templates', result.code, 400);
      }

      return this.success(result.data, 'Popular templates retrieved successfully');
    } catch (error: any) {
      logger.error('Failed to get popular templates:', error);
      return this.error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }
}

// Export singleton instance
export const templateController = new TemplateController();