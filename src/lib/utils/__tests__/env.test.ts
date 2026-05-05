import { describe, it, expect, beforeEach } from 'vitest';
import { loadEnv, __resetEnvCacheForTests } from '../env';

const baseVars: Record<string, string> = {
  JWT_SECRET: 'test-jwt-secret-key-for-testing-purposes-only',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
  EMAIL_USER: 'tester@example.com',
  EMAIL_PASSWORD: 'testpw',
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false'
};

function apply(vars: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
}

describe('env validation', () => {
  beforeEach(() => {
    apply(baseVars);
    process.env.DISABLE_ENV_VALIDATION = 'true'; // prevent auto-parse on import
  });

  it('throws when required vars missing', () => {
    delete process.env.JWT_SECRET;
    __resetEnvCacheForTests();
    expect(() => loadEnv()).toThrow();
  });

  it('parses and caches', () => {
    __resetEnvCacheForTests();
    const first = loadEnv();
    const second = loadEnv();
    expect(first).toBe(second);
  });
});
