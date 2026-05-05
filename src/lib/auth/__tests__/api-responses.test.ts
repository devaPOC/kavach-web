import { describe, it, expect } from 'vitest';
import { apiSuccess, apiCreated, apiError, validationError, rateLimitError } from '../api-responses';
import { AUTH_ERROR_CODES } from '../error-codes';

async function parse(res: Response) { return await (res as any).json(); }

describe('api-responses helpers', () => {
  it('apiSuccess returns success body and default 200', async () => {
    const res: any = apiSuccess({ foo: 'bar' }, 'ok');
    const body = await parse(res);
    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, data: { foo: 'bar' }, message: 'ok' });
  });

  it('apiCreated uses 201 status', async () => {
    const res: any = apiCreated({ id: 1 }, 'created');
    const body = await parse(res);
    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ id: 1 });
  });

  it('apiError returns proper shape and code', async () => {
    const res: any = apiError('Bad', AUTH_ERROR_CODES.INVALID_CREDENTIALS, 401, { meta: 1 });
    const body = await parse(res);
    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
    expect(body.meta).toBe(1);
  });

  it('validationError maps issues path and message', async () => {
    const issues = [{ path: ['email'], message: 'Invalid email' }, { path: ['password'], message: 'Too short' }];
    const res: any = validationError(issues as any);
    const body = await parse(res);
    expect(body.errorCode).toBe(AUTH_ERROR_CODES.VALIDATION_FAILED);
    expect(body.details).toHaveLength(2);
    expect(body.details[0]).toEqual({ field: 'email', message: 'Invalid email' });
  });

  it('rateLimitError includes rateLimitInfo', async () => {
    const res: any = rateLimitError('Slow down', Date.now() + 1000, 3);
    const body = await parse(res);
    expect(res.status).toBe(429);
    expect(body.errorCode).toBe(AUTH_ERROR_CODES.RATE_LIMITED);
    expect(body.rateLimitInfo.remaining).toBe(3);
  });
});
