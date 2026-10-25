import { defineConfig, devices } from '@playwright/test';
import { appUrl } from './e2e/urls';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  timeout: 45000,
  expect: { timeout: 10000 },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --port 4173',
    url: appUrl(),
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium-iphone',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
    {
      name: 'webkit-iphone',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'webkit' },
    },
    {
      name: 'chromium-ipad',
      use: { ...devices['iPad Pro 11'], defaultBrowserType: 'chromium' },
    },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
});
