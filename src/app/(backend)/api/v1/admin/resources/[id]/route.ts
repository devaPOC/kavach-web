import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session-helpers';
import { resourcesService } from '@/lib/services/resources.service';

// GET - Get single resource by ID
export async function GET(
	request: NextRequest,
	props: { params: Promise<{ id: string }> }
) {
	const params = await props.params;
	const authResult = await requireRole(request, 'admin');

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	try {
		const result = await resourcesService.getResourceById(params.id);

		if (!result.success) {
			return NextResponse.json(result, { status: result.code === 'NOT_FOUND' ? 404 : 400 });
		}

		return NextResponse.json(result);
	} catch (error) {
		console.error('Failed to fetch resource:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to fetch resource' },
			{ status: 500 }
		);
	}
}

// PATCH - Update resource by ID
export async function PATCH(
	request: NextRequest,
	props: { params: Promise<{ id: string }> }
) {
	const params = await props.params;
	const authResult = await requireRole(request, 'admin');

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	try {
		const data = await request.json();
		const result = await resourcesService.updateResource(params.id, data);

		if (!result.success) {
			return NextResponse.json(result, { status: result.code === 'NOT_FOUND' ? 404 : 400 });
		}

		return NextResponse.json(result);
	} catch (error) {
		console.error('Failed to update resource:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to update resource' },
			{ status: 500 }
		);
	}
}

// DELETE - Delete resource by ID
export async function DELETE(
	request: NextRequest,
	props: { params: Promise<{ id: string }> }
) {
	const params = await props.params;
	const authResult = await requireRole(request, 'admin');

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	try {
		const result = await resourcesService.deleteResource(params.id);

		if (!result.success) {
			return NextResponse.json(result, { status: result.code === 'NOT_FOUND' ? 404 : 400 });
		}

		return NextResponse.json(result);
	} catch (error) {
		console.error('Failed to delete resource:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to delete resource' },
			{ status: 500 }
		);
	}
}
