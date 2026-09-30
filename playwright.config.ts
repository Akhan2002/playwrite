import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

// Optional local overrides (BASE_URL, TEST_USERNAME, TEST_PASSWORD) without a dotenv dependency.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,

  timeout: 30_000,
  expect: { timeout: 10_000 },

  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: process.env.BASE_URL ?? 'https://create-asana-like-pr-39y5.bolt.host/',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
