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
    include: ['test/integration/**/*.spec.ts'],
    globalSetup: ['./test/setup/integration-global.ts'],
    fileParallelism: false,
  },
});
