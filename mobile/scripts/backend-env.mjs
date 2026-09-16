import { readFileSync, existsSync } from "node:fs";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
export const mobileRoot = fileURLToPath(new URL("../", import.meta.url));
export function readEnv(relative) {
  const file = new URL("../" + relative, import.meta.url);
  return existsSync(file) ? parseEnv(readFileSync(file, "utf8")) : {};
}
export const appEnv = { ...readEnv(".env.local"), ...process.env };
export const serverEnv = { ...readEnv("supabase/.env.local"), ...process.env };
export function projectRef() {
  const host = new URL(appEnv.EXPO_PUBLIC_SUPABASE_URL).hostname;
  const match = host.match(/^([a-z0-9]+)\.supabase\.co$/);
  if (!match) throw Error("Expected the configured Supabase project URL.");
  return match[1];
}
export function supabaseCli(args) {
  // These arguments contain validated identifiers/local paths, never credentials.
  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["supabase", ...args],
    {
      cwd: mobileRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
      env: process.env,
    },
  );
  if (result.error || result.status !== 0)
    throw Error("Supabase command failed. Check CLI login and project access.");
}
