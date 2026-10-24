import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './specs',
  outputDir: '../../test-results/playwright-seo',
  testMatch: ['seo-foundation.spec.ts', 'homepage.spec.ts', 'stage3-pages.spec.ts', 'stage4-pages.spec.ts', 'stage5-site.spec.ts', 'launch-maker.spec.ts', 'analytics.spec.ts'],
  workers: 1,
  reporter: 'list',
  use: { baseURL: process.env.SEO_TEST_BASE_URL || 'http://localhost:7001', channel: 'msedge' },
})
