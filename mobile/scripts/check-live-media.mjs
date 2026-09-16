// Requires a CLI login with project-owner access. Creates and removes one test
// account and its images. Credentials and sessions stay in memory, never logs.
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { appEnv, serverEnv, projectRef } from "./backend-env.mjs";

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  [
    "supabase",
    "projects",
    "api-keys",
    "--project-ref",
    projectRef(),
    "--reveal",
    "--output-format",
    "json",
  ],
  { shell: process.platform === "win32", encoding: "utf8", windowsHide: true },
);
if (result.status !== 0)
  throw Error(
    "Unable to read verification credentials through the authorized CLI.",
  );
const keys = JSON.parse(result.stdout);
function findKey(value) {
  if (!value || typeof value !== "object") return null;
  if (value.name === "service_role") return value.api_key || value.key;
  for (const child of Object.values(value)) {
    const found = findKey(child);
    if (found) return found;
  }
  return null;
}
const serviceKey = findKey(keys);
if (!serviceKey)
  throw Error(
    "No service-role key available for the isolated verification account.",
  );
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(
  appEnv.EXPO_PUBLIC_SUPABASE_URL,
  serviceKey,
  options,
);
const client = createClient(
  appEnv.EXPO_PUBLIC_SUPABASE_URL,
  appEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  options,
);
const unique = randomUUID();
const password = randomUUID() + randomUUID();
const email = `gulmeli-verification-${unique}@example.com`;
const pixel =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP1sAAAAASUVORK5CYII=";
let userId;
let token;
const assets = new Set();
async function invoke(body) {
  const response = await fetch(
    `${appEnv.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/cloudinary-media`,
    {
      method: "POST",
      headers: {
        apikey: appEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90000),
    },
  );
  return { status: response.status, body: await response.json() };
}
try {
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user)
    throw Error("Verification account creation failed.");
  userId = created.data.user.id;
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.session)
    throw Error("Live customer sign-in failed.");
  token = signedIn.data.session.access_token;
  console.log("PASS: live Supabase Auth sign-in.");
  const avatarId = `gulmeli/avatars/${userId}`;
  assets.add(avatarId);
  const avatar = await invoke({ action: "upload", image: pixel });
  if (avatar.status !== 200 || avatar.body.publicId !== avatarId)
    throw Error(`Customer avatar upload failed (HTTP ${avatar.status}).`);
  const delivered = await fetch(avatar.body.url, {
    signal: AbortSignal.timeout(30000),
  });
  if (
    !delivered.ok ||
    !delivered.headers.get("content-type")?.startsWith("image/")
  )
    throw Error("Hosted avatar delivery failed.");
  console.log(
    "PASS: authenticated Edge Function upload and Cloudinary image delivery.",
  );
  const libraryId = `gulmeli/verification/${unique}`;
  assets.add(libraryId);
  const denied = await invoke({
    action: "upload",
    dataUri: pixel,
    publicId: libraryId,
  });
  if (denied.status !== 403)
    throw Error("A customer was not blocked from library uploads.");
  console.log("PASS: customer cannot overwrite store library media.");
  const membership = await service
    .from("admin_members")
    .insert({ user_id: userId, role: "super_admin" });
  if (membership.error)
    throw Error("Unable to provision temporary verification membership.");
  const library = await invoke({
    action: "upload",
    dataUri: pixel,
    publicId: libraryId,
  });
  if (library.status !== 200 || library.body.publicId !== libraryId)
    throw Error(`Admin media upload failed (HTTP ${library.status}).`);
  for (const publicId of assets) {
    const deleted = await invoke({ action: "delete", publicId });
    if (deleted.status !== 200)
      throw Error(`Admin media deletion failed (HTTP ${deleted.status}).`);
    assets.delete(publicId);
  }
  console.log("PASS: authenticated admin library upload and deletion.");
} finally {
  // Fallback cleanup also runs if an Edge Function fails mid-test.
  for (const publicId of assets) {
    const params = {
      public_id: publicId,
      timestamp: String(Math.floor(Date.now() / 1000)),
      invalidate: "true",
    };
    const signature = createHash("sha1")
      .update(
        Object.keys(params)
          .sort()
          .map((k) => `${k}=${params[k]}`)
          .join("&") + serverEnv.CLOUDINARY_API_SECRET,
      )
      .digest("hex");
    const form = new URLSearchParams({
      ...params,
      signature,
      api_key: serverEnv.CLOUDINARY_API_KEY,
    });
    const cleanup = await fetch(
      `https://api.cloudinary.com/v1_1/${serverEnv.CLOUDINARY_CLOUD_NAME}/image/destroy`,
      { method: "POST", body: form, signal: AbortSignal.timeout(30000) },
    );
    if (!cleanup.ok) {
      console.error("Test image cleanup failed:", publicId);
      process.exitCode = 1;
    }
  }
  if (userId) {
    const deleted = await service.auth.admin.deleteUser(userId);
    if (deleted.error) {
      console.error("Temporary account cleanup failed:", userId);
      process.exitCode = 1;
    } else console.log("Temporary verification account removed.");
  }
}
