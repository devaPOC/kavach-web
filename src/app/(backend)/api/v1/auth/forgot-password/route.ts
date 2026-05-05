import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/database';
import { users } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import { createSuccessNextResponse, createGenericErrorNextResponse, createValidationErrorNextResponse } from '@/lib/errors/response-utils';
import { generateSecureToken } from '@/lib/auth/token-utils';
import { sendPasswordResetEmail } from '@/lib/email/password-reset';
import { logger } from '@/lib/utils/logger';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    // Find user by email
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    // Always return success to prevent email enumeration attacks
    // But only send email if user exists
    if (user.length > 0) {
      logger.info('Forgot password request: user found, preparing reset email', {
        email: email.toLowerCase(),
        requestId: request.headers.get('x-request-id') || undefined
      });
      const userData = user[0];

      // Generate password reset token (expires in 1 hour)
      const resetToken = generateSecureToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store reset token in database
      await db
        .update(users)
        .set({
          passwordResetToken: resetToken,
          passwordResetExpires: expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userData.id));

      // Send password reset email
      try {
        await sendPasswordResetEmail(email, resetToken, userData.firstName);
        logger.info('Password reset email sent (or queued) successfully', {
          email: email.toLowerCase(),
          userId: userData.id
        });
      } catch (e) {
        // We still return success to caller to avoid enumeration; log internal failure
        logger.error('Password reset email failed to send', {
          email: email.toLowerCase(),
          error: e instanceof Error ? e.message : String(e)
        });
      }
    }
    else {
      logger.info('Forgot password request: user not found, skipping email send', {
        email: email.toLowerCase(),
        requestId: request.headers.get('x-request-id') || undefined
      });
    }

    return createSuccessNextResponse({
      message: 'If an account with that email exists, we have sent a password reset link.',
    });

  } catch (error) {
    logger.error('Forgot password route error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    if (error instanceof z.ZodError) {
      const validationErrors = error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      return createValidationErrorNextResponse(validationErrors);
    }

    return createGenericErrorNextResponse(
      'Failed to process password reset request',
      undefined,
      500
    );
  }
}
