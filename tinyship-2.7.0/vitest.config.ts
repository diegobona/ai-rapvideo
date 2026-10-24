import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/api/**', 'node_modules/**'],
  },
  resolve: {
    alias: {
      // This route-level test exercises the real TanStack server-owned prompt.
      '@/lib/dance-template': resolve(__dirname, './apps/tanstack-app/src/lib/dance-template.ts'),
      '@': resolve(__dirname, './apps/tanstack-app/src'),
      '@config': resolve(__dirname, './config.ts'),
      '@libs': resolve(__dirname, './libs'),
      '@tests': resolve(__dirname, './tests'),
    },
  },
});
