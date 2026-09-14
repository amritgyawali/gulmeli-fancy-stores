import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: ["browser.spec.ts", "admin.browser.spec.ts"],
  timeout: 60000,
  use: {
    baseURL: "http://localhost:8082",
    viewport: { width: 390, height: 844 },
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    // The storefront journeys verify the local demo data and device-only
    // persistence, so they run against a fresh local-mode export built from
    // the current source.
    command:
      "npx expo export --platform web --output-dir dist-local-test --clear && node scripts/serve-preview.cjs",
    url: "http://localhost:8082",
    timeout: 300_000,
    reuseExistingServer: true,
    env: { EXPO_PUBLIC_BACKEND: "local", PREVIEW_ROOT: "dist-local-test" },
  },
  reporter: "list",
  workers: 1,
});
