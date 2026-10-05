import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@quickdialog': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  test: {
    environment: 'node',
    include: ['test/unit/**/*.spec.ts', 'test/integration/**/*.spec.ts'],
    // Integration specs share one Testcontainers database.
    // Do not run those files in parallel.
    fileParallelism: false,
    globalSetup: ['./test/setup/integration-global.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/main.ts',
        'src/generated/**',
        'src/**/*.module.ts',
        'src/**/*.type.ts',
        'src/swagger/examples/**',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
