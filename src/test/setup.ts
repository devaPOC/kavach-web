import { vi } from 'vitest';
import { config } from 'dotenv';
import '@testing-library/jest-dom';

// Load test environment variables
config({ path: '.env.test' });

// Mock environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only';
process.env.SESSION_SECRET = 'test-session-secret-key-for-testing';
process.env.EMAIL_USER = 'test@gmail.com';
process.env.EMAIL_PASSWORD = 'test-app-password';
process.env.SMTP_HOST = 'smtp.gmail.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_SECURE = 'false';
process.env.SMTP_FROM = 'Test App <test@gmail.com>';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.DISABLE_ENV_VALIDATION = 'true';
import '@/lib/utils/env';
process.env.DISABLE_ENV_VALIDATION = 'true';
import '@/lib/utils/env';

// Global test utilities
global.console = {
  ...console,
  // Suppress console.error in tests unless explicitly needed
  error: vi.fn(),
  warn: vi.fn(),
};

// Mock Next.js modules that might be imported
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => '/'),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));
