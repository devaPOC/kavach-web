import { NextRequest, NextResponse } from 'next/server';
import { superAdminAuthService } from '@/lib/services/super-admin/super-admin-auth.service';
import { superAdminAdminService } from '@/lib/services/super-admin/super-admin-admin.service';

const COOKIE_NAME = 'super_admin_token';

export async function GET(request: NextRequest) {
	try {
		const token = request.cookies.get(COOKIE_NAME)?.value;
		if (!token) {
			return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
		}

		const superAdmin = await superAdminAuthService.validateSession(token);
		if (!superAdmin) {
			return NextResponse.json({ success: false, message: 'Session expired' }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const page = parseInt(searchParams.get('page') || '1');
		const limit = parseInt(searchParams.get('limit') || '20');
		const search = searchParams.get('search') || undefined;
		const isActive = searchParams.get('isActive') === 'true' ? true :
			searchParams.get('isActive') === 'false' ? false : undefined;
		const sortBy = (searchParams.get('sortBy') as any) || 'createdAt';
		const sortOrder = (searchParams.get('sortOrder') as any) || 'desc';

		const result = await superAdminAdminService.listAdmins({
			page,
			limit,
			search,
			isActive,
			sortBy,
			sortOrder,
		});

		return NextResponse.json({ success: true, ...result });
	} catch (error) {
		console.error('Error listing admins:', error);
		return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	try {
		const token = request.cookies.get(COOKIE_NAME)?.value;
		if (!token) {
			return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
		}

		const superAdmin = await superAdminAuthService.validateSession(token);
		if (!superAdmin) {
			return NextResponse.json({ success: false, message: 'Session expired' }, { status: 401 });
		}

		const body = await request.json();
		const { email, password, firstName, lastName, role } = body;

		if (!email || !firstName || !lastName) {
			return NextResponse.json(
				{ success: false, message: 'Email, first name, and last name are required' },
				{ status: 400 }
			);
		}

		const result = await superAdminAdminService.createAdmin(
			{ email, password, firstName, lastName, role },
			superAdmin.id
		);

		return NextResponse.json(result, { status: result.success ? 201 : 400 });
	} catch (error) {
		console.error('Error creating admin:', error);
		return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
	}
}
