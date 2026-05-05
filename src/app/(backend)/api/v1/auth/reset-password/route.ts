import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/database';
import { users } from '@/lib/database/schema';
import { eq, and, gt } from 'drizzle-orm';
import { createSuccessNextResponse, createGenericErrorNextResponse, createValidationErrorNextResponse } from '@/lib/errors/response-utils';
import { hashPassword } from '@/lib/auth/password-utils';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = resetPasswordSchema.parse(body);

    // Find user with valid reset token
    const user = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.passwordResetToken, token),
          gt(users.passwordResetExpires, new Date())
        )
      )
      .limit(1);

    if (user.length === 0) {
      return createGenericErrorNextResponse(
        'Invalid or expired reset token',
        undefined,
        400
      );
    }

    const userData = user[0];

    // Hash the new password
    const hashedPassword = await hashPassword(password);

    // Update user password and clear reset token
    await db
      .update(users)
      .set({
        passwordHash: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userData.id));

    return createSuccessNextResponse({
      message: 'Password has been reset successfully',
    });

  } catch (error) {
    console.error('Reset password error:', error);

    if (error instanceof z.ZodError) {
      const validationErrors = error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      return createValidationErrorNextResponse(validationErrors);
    }

    return createGenericErrorNextResponse(
      'Failed to reset password',
      undefined,
      500
    );
  }
}