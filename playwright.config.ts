import { defineConfig, devices } from '@playwright/test';

// Not Vite's default preview port, so a running `npm start` never collides with a test run.
const baseURL = 'http://localhost:4319';

// Integration tests exercise the production build, never the dev server: the web server
// command rebuilds `dist/` before serving it, however Playwright is invoked.
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: true,
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run build && npm run preview -- --port ${new URL(baseURL).port} --strictPort`,
    url: baseURL,
  },
});
