import { defineConfig, devices } from '@playwright/test';

// Runs against the demo stack: `COINBOOK_SEED_DEMO=true make up` in coin-book-local, then this suite
// starts `vite preview` (or reuses a running one). It tests the real API, not a mock.
const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5373';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: [['list']],
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', testIgnore: /mobile\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', testMatch: /mobile\.spec\.ts/, use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: 'pnpm build && pnpm preview', url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});
