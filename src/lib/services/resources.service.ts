import { db } from '@/lib/database/connection';
import { trainerResources } from '@/lib/database/schema/trainer-resources';
import { eq, desc, and } from 'drizzle-orm';
import type { TrainerResource, CreateResourceData, UpdateResourceData } from '../../../types/resource';

interface ServiceResult<T> {
	success: boolean;
	data?: T;
	error?: string;
	code?: string;
}

function serviceSuccess<T>(data: T): ServiceResult<T> {
	return { success: true, data };
}

function serviceError(error: string, code: string): ServiceResult<never> {
	return { success: false, error, code };
}

export class ResourcesService {
	/**
	 * Get all published resources (for trainers)
	 */
	async getPublishedResources(): Promise<ServiceResult<TrainerResource[]>> {
		try {
			const resources = await db
				.select()
				.from(trainerResources)
				.where(eq(trainerResources.isPublished, true))
				.orderBy(desc(trainerResources.createdAt));

			return serviceSuccess(resources as TrainerResource[]);
		} catch (error) {
			console.error('Failed to fetch published resources:', error);
			return serviceError('Failed to fetch resources', 'FETCH_ERROR');
		}
	}

	/**
	 * Get all resources including unpublished (for admins)
	 */
	async getAllResources(): Promise<ServiceResult<TrainerResource[]>> {
		try {
			const resources = await db
				.select()
				.from(trainerResources)
				.orderBy(desc(trainerResources.createdAt));

			return serviceSuccess(resources as TrainerResource[]);
		} catch (error) {
			console.error('Failed to fetch all resources:', error);
			return serviceError('Failed to fetch resources', 'FETCH_ERROR');
		}
	}

	/**
	 * Get a single resource by ID
	 */
	async getResourceById(id: string): Promise<ServiceResult<TrainerResource>> {
		try {
			const [resource] = await db
				.select()
				.from(trainerResources)
				.where(eq(trainerResources.id, id))
				.limit(1);

			if (!resource) {
				return serviceError('Resource not found', 'NOT_FOUND');
			}

			return serviceSuccess(resource as TrainerResource);
		} catch (error) {
			console.error('Failed to fetch resource:', error);
			return serviceError('Failed to fetch resource', 'FETCH_ERROR');
		}
	}

	/**
	 * Get resources by category
	 */
	async getResourcesByCategory(category: string): Promise<ServiceResult<TrainerResource[]>> {
		try {
			const resources = await db
				.select()
				.from(trainerResources)
				.where(
					and(
						eq(trainerResources.category, category),
						eq(trainerResources.isPublished, true)
					)
				)
				.orderBy(desc(trainerResources.createdAt));

			return serviceSuccess(resources as TrainerResource[]);
		} catch (error) {
			console.error('Failed to fetch resources by category:', error);
			return serviceError('Failed to fetch resources', 'FETCH_ERROR');
		}
	}

	/**
	 * Create a new resource (admin only)
	 */
	async createResource(data: CreateResourceData, adminId: string): Promise<ServiceResult<TrainerResource>> {
		try {
			// Ensure resourceType has a value, default to 'document' if not provided
			const resourceType = data.resourceType || 'document';

			const [resource] = await db
				.insert(trainerResources)
				.values({
					...data,
					resourceType,
					createdBy: adminId,
					isPublished: data.isPublished ?? false,
				})
				.returning();

			return serviceSuccess(resource as TrainerResource);
		} catch (error) {
			console.error('Failed to create resource:', error);
			return serviceError('Failed to create resource', 'CREATE_ERROR');
		}
	}

	/**
	 * Update a resource (admin only)
	 */
	async updateResource(id: string, data: UpdateResourceData): Promise<ServiceResult<TrainerResource>> {
		try {
			const [resource] = await db
				.update(trainerResources)
				.set({
					...data,
					updatedAt: new Date()
				})
				.where(eq(trainerResources.id, id))
				.returning();

			if (!resource) {
				return serviceError('Resource not found', 'NOT_FOUND');
			}

			return serviceSuccess(resource as TrainerResource);
		} catch (error) {
			console.error('Failed to update resource:', error);
			return serviceError('Failed to update resource', 'UPDATE_ERROR');
		}
	}

	/**
	 * Delete a resource (admin only)
	 * Also cleans up the file from R2 storage if it exists
	 */
	async deleteResource(id: string): Promise<ServiceResult<void>> {
		try {
			// First, get the resource to check if it has an R2 file
			const [resource] = await db
				.select({ r2Key: trainerResources.r2Key })
				.from(trainerResources)
				.where(eq(trainerResources.id, id))
				.limit(1);

			// If resource has an R2 file, delete it
			if (resource?.r2Key) {
				const { deleteFile } = await import('@/lib/services/r2.service');
				const deleteResult = await deleteFile(resource.r2Key);
				if (!deleteResult.success) {
					console.warn('Failed to delete R2 file:', deleteResult.error);
					// Continue with database deletion even if R2 deletion fails
				}
			}

			// Delete the database record
			await db.delete(trainerResources).where(eq(trainerResources.id, id));
			return serviceSuccess(undefined);
		} catch (error) {
			console.error('Failed to delete resource:', error);
			return serviceError('Failed to delete resource', 'DELETE_ERROR');
		}
	}

	/**
	 * Publish/unpublish a resource (admin only)
	 */
	async togglePublishStatus(id: string, isPublished: boolean): Promise<ServiceResult<TrainerResource>> {
		try {
			const [resource] = await db
				.update(trainerResources)
				.set({
					isPublished,
					updatedAt: new Date()
				})
				.where(eq(trainerResources.id, id))
				.returning();

			if (!resource) {
				return serviceError('Resource not found', 'NOT_FOUND');
			}

			return serviceSuccess(resource as TrainerResource);
		} catch (error) {
			console.error('Failed to toggle publish status:', error);
			return serviceError('Failed to update resource status', 'UPDATE_ERROR');
		}
	}
}

export const resourcesService = new ResourcesService();
