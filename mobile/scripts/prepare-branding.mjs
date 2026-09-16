// Downloads published branding for the NEXT native build. Only public config
// is read. Live in-app appearance does not depend on these generated assets.
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";
const root = new URL("../", import.meta.url);
const local = new URL(".env.local", root);
const env = {
  ...(existsSync(local) ? parseEnv(readFileSync(local, "utf8")) : {}),
  ...process.env,
};
const url = env.EXPO_PUBLIC_SUPABASE_URL;
if (!url || !env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  throw Error("Set the public Supabase connection before preparing branding.");
const response = await fetch(
  url + "/rest/v1/app_config?select=published&id=eq.storefront",
  {
    headers: { apikey: env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
    signal: AbortSignal.timeout(20000),
  },
);
if (!response.ok)
  throw Error("Could not read published branding. The build was not updated.");
const config = (await response.json())[0]?.published ?? {};
const branding = config.branding ?? {};
const dir = new URL("assets/branding/", root);
mkdirSync(dir, { recursive: true });
const release = {
  name: branding.companyName,
  backgroundColor: config.theme?.backgroundColor,
  primaryColor: config.theme?.primaryColor,
  generatedAt: new Date().toISOString(),
};
for (const [field, size] of [
  ["appIcon", 1024],
  ["splashLogo", 512],
  ["favicon", 64],
]) {
  if (!branding[field]) continue;
  const source = new URL(branding[field]);
  if (
    source.protocol !== "https:" ||
    source.hostname !== "res.cloudinary.com" ||
    !source.pathname.includes("/image/upload/")
  )
    throw Error(
      `${field}: upload this asset through the Cloudinary media library before building.`,
    );
  source.pathname = source.pathname.replace(
    "/image/upload/",
    `/image/upload/c_pad,w_${size},h_${size},b_white,f_png/`,
  );
  const asset = await fetch(source, { signal: AbortSignal.timeout(30000) });
  if (!asset.ok) throw Error(`Unable to download ${field}.`);
  const bytes = Buffer.from(await asset.arrayBuffer());
  if (
    bytes.length > 10000000 ||
    bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
  )
    throw Error(`Invalid PNG returned for ${field}.`);
  writeFileSync(new URL(field + ".png", dir), bytes);
  release[field] = `./assets/branding/${field}.png`;
}
writeFileSync(
  new URL("release.json", dir),
  JSON.stringify(release, null, 2) + "\n",
);
console.log(
  "Published branding prepared for the next Android/iOS build:",
  fileURLToPath(new URL("release.json", dir)),
);
