import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session-helpers';
import { resourcesService } from '@/lib/services/resources.service';

// GET - List all resources (including unpublished)
export async function GET(request: NextRequest) {
	const authResult = await requireRole(request, 'admin');

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	try {
		const result = await resourcesService.getAllResources();
		return NextResponse.json(result);
	} catch (error) {
		console.error('Failed to fetch resources:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to fetch resources' },
			{ status: 500 }
		);
	}
}

// POST - Create new resource
export async function POST(request: NextRequest) {
	const authResult = await requireRole(request, 'admin');

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	try {
		const data = await request.json();
		const result = await resourcesService.createResource(
			data,
			authResult.session.userId
		);

		if (!result.success) {
			return NextResponse.json(result, { status: 400 });
		}

		return NextResponse.json(result);
	} catch (error) {
		console.error('Failed to create resource:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to create resource' },
			{ status: 500 }
		);
	}
}

// PATCH - Update resource
export async function PATCH(request: NextRequest) {
	const authResult = await requireRole(request, 'admin');

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	try {
		const { id, ...data } = await request.json();

		if (!id) {
			return NextResponse.json(
				{ success: false, error: 'Resource ID is required' },
				{ status: 400 }
			);
		}

		const result = await resourcesService.updateResource(id, data);

		if (!result.success) {
			return NextResponse.json(result, { status: 400 });
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

// DELETE - Delete resource
export async function DELETE(request: NextRequest) {
	const authResult = await requireRole(request, 'admin');

	if (authResult instanceof NextResponse) {
		return authResult;
	}

	try {
		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');

		if (!id) {
			return NextResponse.json(
				{ success: false, error: 'Resource ID is required' },
				{ status: 400 }
			);
		}

		const result = await resourcesService.deleteResource(id);

		if (!result.success) {
			return NextResponse.json(result, { status: 400 });
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
