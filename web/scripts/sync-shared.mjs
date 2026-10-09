// Copies the storefront logic the website shares with the mobile app into
// src/shared/, so web/ builds on its own (Vercel can deploy just this folder).
// The mobile app stays the source of truth: edit the files there, and this
// script refreshes the copies before every local dev/build. When ../mobile is
// absent (a standalone deploy), the committed copies are used unchanged.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const web = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = join(web, "..");
const files = {
  "mobile/src/services/product-media.ts": "mobile/services/product-media.ts",
  "mobile/src/data/hosted-media.json": "mobile/data/hosted-media.json",
  "mobile/src/admin/core/appearance.ts": "mobile/admin/core/appearance.ts",
  "mobile/src/admin/core/config.ts": "mobile/admin/core/config.ts",
  "mobile/src/admin/core/config-schema.ts": "mobile/admin/core/config-schema.ts",
  "mobile/src/admin/core/config-validation.ts": "mobile/admin/core/config-validation.ts",
  "mobile/src/admin/core/fields.ts": "mobile/admin/core/fields.ts",
  "mobile/src/admin/core/storefront-content.ts": "mobile/admin/core/storefront-content.ts",
  "shared/admin-sync.ts": "admin-sync.ts",
};

if (!existsSync(join(repo, "mobile/src"))) {
  console.log("sync-shared: ../mobile not found, using committed copies.");
  process.exit(0);
}
let changed = 0;
for (const [source, target] of Object.entries(files)) {
  const from = join(repo, source);
  if (!existsSync(from)) throw Error(`sync-shared: missing ${source}`);
  const header = source.endsWith(".json")
    ? ""
    : `// Copied from ${source} by web/scripts/sync-shared.mjs. Edit the source, not this file.\n`;
  const content = header + readFileSync(from, "utf8");
  const to = join(web, "src/shared", target);
  if (existsSync(to) && readFileSync(to, "utf8") === content) continue;
  mkdirSync(dirname(to), { recursive: true });
  writeFileSync(to, content);
  changed++;
}
console.log(`sync-shared: ${changed} file(s) updated.`);
