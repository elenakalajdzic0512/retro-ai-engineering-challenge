import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: 'tactical-security.spec.js',
  outputDir: './node_modules/.cache/playwright-w08-results',
  workers: 1,
  use: { browserName: 'chromium', headless: true },
});
