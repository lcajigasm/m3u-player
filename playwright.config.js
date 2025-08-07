// Playwright config for Electron E2E
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 0,
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true
  },
  projects: [
    {
      name: 'Electron',
      use: { ...require('@playwright/test').devices['Desktop Chrome'] }
    }
  ]
});
