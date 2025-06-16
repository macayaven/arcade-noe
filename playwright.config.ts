// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: { // Optional: if we want playwright to start the dev server
    command: 'task dev', // Or 'pnpm dev' if that's the combined dev command
    url: 'http://localhost:3000', // Vite frontend default port
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  use: {
    baseURL: 'http://localhost:3000', // Base URL for page.goto('/')
  }
});
