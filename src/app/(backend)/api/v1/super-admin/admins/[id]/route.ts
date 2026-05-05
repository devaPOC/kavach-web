import { NextRequest, NextResponse } from 'next/server';
import { superAdminAuthService } from '@/lib/services/super-admin/super-admin-auth.service';
import { superAdminAdminService } from '@/lib/services/super-admin/super-admin-admin.service';

const COOKIE_NAME = 'super_admin_token';

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const token = request.cookies.get(COOKIE_NAME)?.value;
		if (!token) {
			return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
		}

		const superAdmin = await superAdminAuthService.validateSession(token);
		if (!superAdmin) {
			return NextResponse.json({ success: false, message: 'Session expired' }, { status: 401 });
		}

		const { id } = await params;
		const admin = await superAdminAdminService.getAdminById(id);

		if (!admin) {
			return NextResponse.json({ success: false, message: 'Admin not found' }, { status: 404 });
		}

		return NextResponse.json({ success: true, admin });
	} catch (error) {
		console.error('Error getting admin:', error);
		return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
	}
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const token = request.cookies.get(COOKIE_NAME)?.value;
		if (!token) {
			return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
		}

		const superAdmin = await superAdminAuthService.validateSession(token);
		if (!superAdmin) {
			return NextResponse.json({ success: false, message: 'Session expired' }, { status: 401 });
		}

		const { id } = await params;
		const body = await request.json();

		const result = await superAdminAdminService.updateAdmin(id, body, superAdmin.id);

		return NextResponse.json(result, { status: result.success ? 200 : 400 });
	} catch (error) {
		console.error('Error updating admin:', error);
		return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const token = request.cookies.get(COOKIE_NAME)?.value;
		if (!token) {
			return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
		}

		const superAdmin = await superAdminAuthService.validateSession(token);
		if (!superAdmin) {
			return NextResponse.json({ success: false, message: 'Session expired' }, { status: 401 });
		}

		const { id } = await params;
		const result = await superAdminAdminService.deleteAdmin(id, superAdmin.id);

		return NextResponse.json(result, { status: result.success ? 200 : 400 });
	} catch (error) {
		console.error('Error deleting admin:', error);
		return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
	}
}
