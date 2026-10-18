import { defineConfig } from '@playwright/test';

// Takes the landing page's pictures from the demo stack: `make landing-shots`.
const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5373';

export default defineConfig({
  testDir: './screenshots',
  workers: 1,
  timeout: 90_000,
  reporter: [['list']],
  use: {
    baseURL,
    locale: 'cs-CZ',
    colorScheme: 'light',
    viewport: { width: 1280, height: 820 },
    deviceScaleFactor: 2,
  },
});
