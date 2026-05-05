import { NextRequest, NextResponse } from 'next/server';
import { superAdminAuthService } from '@/lib/services/super-admin/super-admin-auth.service';

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { email } = body;

		if (!email) {
			return NextResponse.json(
				{ success: false, message: 'Email is required' },
				{ status: 400 }
			);
		}

		const result = await superAdminAuthService.sendOtp(email);

		return NextResponse.json(result, { status: result.success ? 200 : 500 });
	} catch (error) {
		console.error('Error sending OTP:', error);
		return NextResponse.json(
			{ success: false, message: 'Internal server error' },
			{ status: 500 }
		);
	}
}
