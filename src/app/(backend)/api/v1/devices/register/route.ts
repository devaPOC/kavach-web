import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/database';
import { deviceTokens } from '@/lib/database/schema';
import { cookieManager } from '@/lib/auth/unified-session-manager';
import { createSuccessNextResponse, createGenericErrorNextResponse, createValidationErrorNextResponse } from '@/lib/errors/response-utils';
import { ErrorCode } from '@/lib/errors/error-types';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Validation schema for device registration
const registerDeviceSchema = z.object({
	expoPushToken: z.string().min(1, 'Push token is required'),
	deviceType: z.enum(['ios', 'android']),
	deviceName: z.string().optional(),
	deviceModel: z.string().optional(),
	osVersion: z.string().optional(),
	appVersion: z.string().optional(),
});

/**
 * POST /api/v1/devices/register
 * Register a device for push notifications
 */
export async function POST(request: NextRequest) {
	const correlationId = uuidv4();

	try {
		// Verify authentication
		const sessionResult = await cookieManager.getSessionFromCookies(request);
		if (!sessionResult) {
			return createGenericErrorNextResponse('Authentication required', ErrorCode.UNAUTHORIZED, 401, correlationId);
		}

		// Parse and validate request body
		const body = await request.json();
		const validationResult = registerDeviceSchema.safeParse(body);

		if (!validationResult.success) {
			const validationErrors = validationResult.error.issues.map(err => ({
				field: err.path.join('.'),
				message: err.message
			}));
			return createValidationErrorNextResponse(validationErrors, correlationId);
		}

		const { expoPushToken, deviceType, deviceName, deviceModel, osVersion, appVersion } = validationResult.data;
		const userId = sessionResult.userId;

		// Check if token already exists
		const existingToken = await db
			.select()
			.from(deviceTokens)
			.where(eq(deviceTokens.expoPushToken, expoPushToken))
			.limit(1);

		if (existingToken.length > 0) {
			// Update existing token
			const updated = await db
				.update(deviceTokens)
				.set({
					userId, // Update owner if token moved to different user
					deviceName: deviceName || null,
					deviceModel: deviceModel || null,
					osVersion: osVersion || null,
					appVersion: appVersion || null,
					isActive: true,
					lastUsedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(deviceTokens.expoPushToken, expoPushToken))
				.returning();

			logger.info('Device token updated', { userId, deviceType, correlationId });

			return createSuccessNextResponse(
				{ id: updated[0].id, message: 'Device token updated successfully' },
				'Device updated',
				correlationId
			);
		}

		// Create new token
		const newToken = await db
			.insert(deviceTokens)
			.values({
				userId,
				expoPushToken,
				deviceType,
				deviceName: deviceName || null,
				deviceModel: deviceModel || null,
				osVersion: osVersion || null,
				appVersion: appVersion || null,
				lastUsedAt: new Date(),
			})
			.returning();

		logger.info('Device token registered', { userId, deviceType, correlationId });

		return createSuccessNextResponse(
			{ id: newToken[0].id, message: 'Device registered successfully' },
			'Device registered',
			correlationId,
			201
		);

	} catch (error) {
		logger.error('Device registration error:', { error, correlationId });
		return createGenericErrorNextResponse('Failed to register device', ErrorCode.INTERNAL_SERVER_ERROR, 500, correlationId);
	}
}

/**
 * DELETE /api/v1/devices/register
 * Unregister a device (remove push token)
 */
export async function DELETE(request: NextRequest) {
	const correlationId = uuidv4();

	try {
		const sessionResult = await cookieManager.getSessionFromCookies(request);
		if (!sessionResult) {
			return createGenericErrorNextResponse('Authentication required', ErrorCode.UNAUTHORIZED, 401, correlationId);
		}

		const { searchParams } = new URL(request.url);
		const token = searchParams.get('token');

		if (!token) {
			return createGenericErrorNextResponse('Token parameter required', ErrorCode.INVALID_INPUT, 400, correlationId);
		}

		// Soft delete - mark as inactive
		await db
			.update(deviceTokens)
			.set({ isActive: false, updatedAt: new Date() })
			.where(
				and(
					eq(deviceTokens.expoPushToken, token),
					eq(deviceTokens.userId, sessionResult.userId)
				)
			);

		logger.info('Device token unregistered', { userId: sessionResult.userId, correlationId });

		return createSuccessNextResponse(
			{ message: 'Device unregistered successfully' },
			'Device unregistered',
			correlationId
		);

	} catch (error) {
		logger.error('Device unregistration error:', { error, correlationId });
		return createGenericErrorNextResponse('Failed to unregister device', ErrorCode.INTERNAL_SERVER_ERROR, 500, correlationId);
	}
}
