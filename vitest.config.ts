import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    exclude: ['e2e/**', 'node_modules/**'],
    env: {
      NEXT_PUBLIC_BASE_URL: 'http://localhost:3000',
      NEXT_PUBLIC_ENV_NAME: 'Test Environment',
      NEXT_PUBLIC_ENV_COLOR_SCHEME: 'teal',
      NEXT_PUBLIC_IS_DEMO: 'false',
    },
    testTimeout: 60000,
    hookTimeout: 60000,
    teardownTimeout: 60000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
