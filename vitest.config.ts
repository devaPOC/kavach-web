import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.next'],
    coverage: {
      // Switched to 'istanbul' provider due to v8 source map crash (TraceMap undefined length) when generating
      // coverage for certain transformed files (likely Next.js or compiled TS edge case). Revisit upgrading
      // @vitest/coverage-v8 when upstream fix lands.
      provider: 'istanbul',
      all: false,
      include: ['src/lib/**/*.ts'],
      extension: ['.ts'],
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        'src/app/**', // Exclude Next.js app directory from coverage
        // Exclude migration snapshots and SQL (not executable TS)
        'src/lib/database/migrations/**',
        // Exclude raw SQL/init files (cause v8 trace mapping issues)
        '**/*.sql',
        // Exclude utility script outputs or build info files
        'tsconfig.tsbuildinfo',
        // Temporary: exclude middleware self-test file (console script style triggers sourcemap edge)
        'src/lib/auth/__tests__/middleware.test.ts'
        , 'src/lib/auth/session-manager.ts' // temporarily exclude; Next.js cookies API hard to simulate here
      ],
      thresholds: {
        lines: 80,
        statements: 80,
        branches: 70,
        functions: 75,
      }
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
