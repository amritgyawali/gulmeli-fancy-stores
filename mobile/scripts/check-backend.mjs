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
  const url = app.EXPO_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  const headers = { apikey: publicKey, "Content-Type": "application/json" };
  async function remote(
    label,
    endpoint,
    options = {},
    valid = (response) => response.ok,
  ) {
    try {
      const response = await fetch(url + endpoint, {
        ...options,
        headers,
        signal: AbortSignal.timeout(15000),
      });
      check(label, valid(response));
      return response;
    } catch {
      check(label, false);
      return null;
    }
  }
  const catalog = await remote(
    "Public catalog API",
    "/rest/v1/products?select=id,image_url&active=eq.true&limit=1000",
  );
  if (catalog?.ok) {
    const rows = await catalog.json();
    console.log(
      `Catalog: ${rows.length} products, ${rows.filter((p) => p.image_url).length} database photo URLs.`,
    );
    check("Catalog has products", rows.length > 0);
  }
  await remote(
    "Published settings table",
    "/rest/v1/app_config?select=id&limit=1",
  );
  await remote(
    "Public content RPC (live migration)",
    "/rest/v1/rpc/storefront_content",
    { method: "POST", body: "{}" },
  );
  for (const [name, body] of [
    ["save_admin_changes", { p_changes: [] }],
    ["quote_order", { p_items: [], p_voucher: "" }],
    ["my_support_tickets", {}],
  ]) {
    await remote(
      `${name} exists and rejects anonymous access`,
      "/rest/v1/rpc/" + name,
      { method: "POST", body: JSON.stringify(body) },
      (r) => r.status === 401 || r.status === 403,
    );
  }
  for (const name of ["cloudinary-media", "upload-image"]) {
    await remote(
      `${name} deployed and requires sign-in`,
      "/functions/v1/" + name,
      { method: "POST", body: "{}" },
      (r) => r.status === 401,
    );
  }
}
console.log(
  "Credential values are never printed. This check does not deploy services or verify authenticated checkout/uploads.",
);
process.exitCode = failed ? 1 : 0;
