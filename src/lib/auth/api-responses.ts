import { NextResponse } from 'next/server';
import { AUTH_ERROR_CODES } from './error-codes';

interface SuccessBody<T> { success: true; data?: T; message?: string; }
interface ErrorBody { success: false; error: string; errorCode: string; details?: any;[k: string]: any }

export function apiSuccess<T>(data?: T, message?: string, status = 200) {
  return NextResponse.json<SuccessBody<T>>({ success: true, data, message }, { status });
}

export function apiCreated<T>(data?: T, message?: string) {
  return apiSuccess<T>(data, message, 201);
}

export function apiError(error: string, errorCode: string = AUTH_ERROR_CODES.UNKNOWN, status = 400, extra?: Record<string, any>) {
  return NextResponse.json<ErrorBody>({ success: false, error, errorCode, ...extra }, { status });
}

export function validationError(issues: any[]) {
  return apiError('Validation failed', AUTH_ERROR_CODES.VALIDATION_FAILED, 400, {
    details: issues.map(i => ({ field: Array.isArray(i.path) ? i.path.join('.') : '', message: i.message }))
  });
}

export function rateLimitError(error: string, resetTime: number, remaining: number) {
  return apiError(error, AUTH_ERROR_CODES.RATE_LIMITED, 429, {
    rateLimitInfo: { remaining, resetTime }
  });
}
