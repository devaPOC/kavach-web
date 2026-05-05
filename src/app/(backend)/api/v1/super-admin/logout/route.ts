import { NextRequest, NextResponse } from 'next/server';
import { superAdminAuthService } from '@/lib/services/super-admin/super-admin-auth.service';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'super_admin_token';

export async function POST(request: NextRequest) {
	try {
		const token = request.cookies.get(COOKIE_NAME)?.value;

		if (token) {
			await superAdminAuthService.logout(token);
		}

		// Clear the cookie
		const response = NextResponse.json({
			success: true,
			message: 'Logged out successfully',
		});

		response.cookies.delete(COOKIE_NAME);

		return response;
	} catch (error) {
		console.error('Error during logout:', error);
		return NextResponse.json(
			{ success: false, message: 'Internal server error' },
			{ status: 500 }
		);
	}
}
