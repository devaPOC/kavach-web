import { NextRequest, NextResponse } from 'next/server';
import { adminAuthService } from '@/lib/services/admin/admin-auth.service';
import { cookieManager } from '@/lib/auth/unified-session-manager';

export async function POST(request: NextRequest) {
	try {
		const session = await cookieManager.getSessionFromCookies(request);

		if (!session || session.role !== 'admin') {
			return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const { currentPassword, newPassword } = body;

		if (!currentPassword || !newPassword) {
			return NextResponse.json(
				{ success: false, message: 'Current and new passwords are required' },
				{ status: 400 }
			);
		}

		// Enforce 10-char password strength
		if (newPassword.length < 10) {
			return NextResponse.json(
				{ success: false, message: 'Password must be at least 10 characters long' },
				{ status: 400 }
			);
		}

		const result = await adminAuthService.changePassword(session.userId, currentPassword, newPassword);

		if (!result.success) {
			return NextResponse.json({ success: false, message: result.error }, { status: 400 });
		}

		return NextResponse.json({ success: true, message: 'Password updated successfully' });
	} catch (error) {
		console.error('Error changing admin password:', error);
		return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
	}
}
