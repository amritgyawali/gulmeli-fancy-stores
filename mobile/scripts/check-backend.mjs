import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

const values = (path) =>
  existsSync(path) ? parseEnv(readFileSync(path, "utf8")) : {};
const app = { ...values(".env.local"), ...process.env };
const secrets = { ...values("supabase/.env.local"), ...process.env };
let failed = false;
function check(label, valid) {
  console.log(`${valid ? "OK" : "MISSING/INVALID"}: ${label}`);
  if (!valid) failed = true;
}
check("App is configured for Supabase", app.EXPO_PUBLIC_BACKEND === "supabase");
check(
  "Supabase project URL",
  /^https:\/\/[^/]+\/?$/.test(app.EXPO_PUBLIC_SUPABASE_URL || ""),
);
let publicKey = app.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
let legacyRole = "";
try {
  legacyRole = JSON.parse(
    Buffer.from(publicKey.split(".")[1], "base64url").toString(),
  ).role;
} catch {
  /* New publishable keys are not JWTs. */
}
check(
  "Supabase publishable/anon key (not a secret)",
  publicKey.startsWith("sb_publishable_") || legacyRole === "anon",
);
check("Cloudinary cloud name", !!app.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME);
check(
  "Server Cloudinary cloud name matches app",
  !!secrets.CLOUDINARY_CLOUD_NAME &&
    secrets.CLOUDINARY_CLOUD_NAME === app.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME,
);
check("Server Cloudinary API key", !!secrets.CLOUDINARY_API_KEY);
check("Server Cloudinary API secret", !!secrets.CLOUDINARY_API_SECRET);
check(
  "No secrets exposed as EXPO_PUBLIC variables",
  !Object.keys(app).some(
    (key) =>
      key.startsWith("EXPO_PUBLIC_") && /SECRET|SERVICE_ROLE|PRIVATE/.test(key),
  ),
);
if (process.argv.includes("--remote") && !failed) {
  const response = await fetch(
    `${app.EXPO_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/rest/v1/products?select=id&limit=1`,
    {
      headers: { apikey: publicKey },
      signal: AbortSignal.timeout(15000),
    },
  );
  check("Public catalog API is reachable", response.ok);
  if (response.ok)
    console.log(
      (await response.json()).length
        ? "Catalog contains products."
        : "Catalog is empty. Add products or run the sample seed SQL.",
    );
}
console.log(
  "Credential values are never printed. This check does not deploy services or verify authenticated checkout/uploads.",
);
process.exitCode = failed ? 1 : 0;
