// Verify that Metro did not reuse a bundle from the mocked-backend tests.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { parseEnv } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const local = path.join(root, ".env.local");
const env = { ...(existsSync(local) ? parseEnv(readFileSync(local, "utf8")) : {}), ...process.env };
if (env.EXPO_PUBLIC_BACKEND !== "supabase") {
  console.log("Local preview export; no live backend validation requested.");
  process.exit(0);
}
const expected = [env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY];
if (expected.some(value => !value)) throw Error("Public backend configuration is missing.");
for (const platform of ["android", "ios", "web"]) {
  const directory = path.join(root, "dist/_expo/static/js", platform);
  const bundles = readdirSync(directory).filter(name => /\.(js|hbc)$/.test(name)).map(name => readFileSync(path.join(directory, name)));
  for (const value of expected) {
    if (!bundles.some(bundle => bundle.includes(value))) throw Error(`${platform}: configured backend was not found. Export with --clear.`);
  }
  if (bundles.some(bundle => bundle.includes("https://store-test.supabase.co") || bundle.includes("sb_publishable_test_only"))) {
    throw Error(`${platform}: test credentials were found in the release bundle. Export with --clear.`);
  }
  console.log(`${platform}: verified the configured live backend; no test credentials.`);
}
