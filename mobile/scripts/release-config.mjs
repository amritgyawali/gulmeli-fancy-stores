import { readFileSync, writeFileSync } from "node:fs";
import { appEnv, mobileRoot } from "./backend-env.mjs";
import path from "node:path";
const keys = [
  "EXPO_PUBLIC_BACKEND",
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME",
];
const publicEnv = Object.fromEntries(keys.map((key) => [key, appEnv[key]]));
if (
  publicEnv.EXPO_PUBLIC_BACKEND !== "supabase" ||
  keys.some((key) => !publicEnv[key])
)
  throw Error("Missing public backend settings.");
const key = publicEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
let isAnon = false;
try {
  isAnon =
    JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role ===
    "anon";
} catch {
  /* publishable keys are opaque */
}
if (!key.startsWith("sb_publishable_") && !isAnon)
  throw Error("Refusing to put a private key in a release.");
const file = path.join(mobileRoot, "eas.json");
const eas = JSON.parse(readFileSync(file, "utf8"));
for (const profile of ["preview", "production"])
  eas.build[profile].env = { ...eas.build[profile].env, ...publicEnv };
writeFileSync(file, JSON.stringify(eas, null, 2) + "\n");
console.log(
  "Preview and production builds now embed the four public backend settings. No server secrets copied.",
);
