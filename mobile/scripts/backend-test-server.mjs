import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
const existingBundle = process.env.GULMELI_BACKEND_TEST_BUNDLE;
if (existingBundle && !existsSync(resolve(existingBundle, "index.html"))) {
  throw new Error("The requested backend test bundle has no index.html.");
}
if (!existingBundle) {
  const result = spawnSync(
    process.execPath,
    [
      require.resolve("expo/bin/cli"),
      "export",
      "--clear",
      "--platform",
      "web",
      "--max-workers",
      "2",
      "--output-dir",
      "dist-backend-test",
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        CI: "1",
        EXPO_PUBLIC_BACKEND: "supabase",
        EXPO_PUBLIC_SUPABASE_URL: "https://store-test.supabase.co",
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_only",
        EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME: "store-test",
      },
    },
  );
  if (result.status !== 0) process.exit(result.status || 1);
}
process.env.PORT = "8084";
process.env.PREVIEW_ROOT = existingBundle || "dist-backend-test";
await import("./serve-preview.cjs");
