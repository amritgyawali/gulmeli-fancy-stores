// Deploys the Cloudinary media edge function and sets its secrets.
// Needs a Supabase personal access token from
// https://supabase.com/dashboard/account/tokens
// Put it in SUPABASE_ACCESS_TOKEN before running:
//   $env:SUPABASE_ACCESS_TOKEN="sbp_..."   (PowerShell)
#   export SUPABASE_ACCESS_TOKEN="sbp_..."  (bash)
// then: node scripts/deploy-functions.mjs
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error(
    "Set SUPABASE_ACCESS_TOKEN to a Supabase personal access token first " +
      "(https://supabase.com/dashboard/account/tokens).",
  );
  process.exit(1);
}
const REF = "mebobqjfoexyhheupjuf";

const env = {};
for (const line of readFileSync(
  new URL("../supabase/.env.local", import.meta.url),
  "utf8",
).split(/\r?\n/)) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match && match[2]) env[match[1]] = match[2];
}

console.log("Setting Edge Function secrets (values not printed)...");
execFileSync(
  "npx",
  [
    "supabase",
    "secrets",
    "set",
    ...Object.entries(env).map(([key, value]) => `${key}=${value}`),
    "--project-ref",
    REF,
  ],
  { stdio: "inherit", shell: true },
);

console.log("Deploying upload-image (avatars)...");
execFileSync(
  "npx",
  ["supabase", "functions", "deploy", "upload-image", "--project-ref", REF, "--no-verify-jwt"],
  { stdio: "inherit", shell: true },
);

console.log("Deploying cloudinary-media (full media CRUD)...");
execFileSync(
  "npx",
  [
    "supabase",
    "functions",
    "deploy",
    "cloudinary-media",
    "--project-ref",
    REF,
    "--no-verify-jwt",
    "--use-api",
  ],
  { stdio: "inherit", shell: true },
);

console.log("Done. Both media functions are live.");
