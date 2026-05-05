import { NextRequest, NextResponse } from 'next/server';
import { superAdminAuthService } from '@/lib/services/super-admin/super-admin-auth.service';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'super_admin_token';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { email, code } = body;

		if (!email || !code) {
			return NextResponse.json(
				{ success: false, message: 'Email and OTP code are required' },
				{ status: 400 }
			);
		}

		const result = await superAdminAuthService.verifyOtp(email, code);

		if (!result.success) {
			return NextResponse.json(result, { status: 401 });
		}

		// Set httpOnly cookie for the session token
		const response = NextResponse.json({
			success: true,
			message: result.message,
			superAdmin: result.superAdmin,
		});

		response.cookies.set(COOKIE_NAME, result.token!, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: COOKIE_MAX_AGE,
			path: '/',
		});

		return response;
	} catch (error) {
		console.error('Error verifying OTP:', error);
		return NextResponse.json(
			{ success: false, message: 'Internal server error' },
			{ status: 500 }
		);
	}
}
