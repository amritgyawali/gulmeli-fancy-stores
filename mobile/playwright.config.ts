import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "browser.spec.ts",
  timeout: 60000,
  use: {
    baseURL: "http://localhost:8082",
    viewport: { width: 390, height: 844 },
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/serve-preview.cjs",
    url: "http://localhost:8082",
    reuseExistingServer: true,
  },
  reporter: "list",
  workers: 1,
});
