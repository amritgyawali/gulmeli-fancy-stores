import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "backend.browser.spec.ts",
  timeout: 60000,
  expect: { timeout: 15000 },
  use: {
    baseURL: "http://localhost:8084",
    viewport: { width: 390, height: 844 },
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/backend-test-server.mjs",
    url: "http://localhost:8084",
    timeout: 180000,
    reuseExistingServer: false,
  },
  reporter: "list",
  workers: 1,
});
