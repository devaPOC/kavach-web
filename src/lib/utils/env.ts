import { z } from 'zod';

const booleanString = z
  .string()
  .transform(v => v.trim().toLowerCase())
  .refine(v => ['true', 'false', '1', '0', ''].includes(v), 'Invalid boolean value')
  .transform(v => ['true', '1'].includes(v));

const numberFromString = z
  .string()
  .refine(v => /^\d+$/.test(v), 'Must be an integer')
  .transform(v => parseInt(v, 10));

const EnvSchema = z.object({
  NODE_ENV: z.string().default('development'),
  JWT_SECRET: z.string().min(30, 'JWT_SECRET must be at least 30 characters'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),
  EMAIL_USER: z.string().email('EMAIL_USER must be a valid email'),
  EMAIL_PASSWORD: z.string().min(4, 'EMAIL_PASSWORD required'),
  SMTP_HOST: z.string().min(1, 'SMTP_HOST required'),
  SMTP_PORT: numberFromString.default('587' as any), // pass string then transform -> number
  SMTP_SECURE: booleanString.default('false' as any),
  SMTP_FROM: z.string().optional(),
});

export type AppEnv = z.infer<typeof EnvSchema>;

let cached: AppEnv | null = null;

export function loadEnv(): AppEnv {
  if (cached) return cached;
  const raw: Record<string, string | undefined> = {
    NODE_ENV: process.env.NODE_ENV,
    JWT_SECRET: process.env.JWT_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_FROM: process.env.SMTP_FROM,
  } as any;

  const parsed = EnvSchema.parse(raw);
  cached = parsed;
  return cached;
}

if (process.env.DISABLE_ENV_VALIDATION !== 'true' && process.env.NODE_ENV !== 'test') {
  loadEnv();
}

export function getEnv(): AppEnv { return loadEnv(); }

// Test-only utility to clear cached parsed env (used in env.test.ts)
export function __resetEnvCacheForTests() { cached = null; }
