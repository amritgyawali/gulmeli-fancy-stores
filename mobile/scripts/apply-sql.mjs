// Applies a SQL file to the linked Supabase project through the management
// API, using the CLI's stored access token (never printed).
// Usage: node scripts/apply-sql.mjs <relative-sql-path> [project-ref]
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const [, , file, ref = "mebobqjfoexyhheupjuf"] = process.argv;
if (!file) {
  console.error("Usage: node scripts/apply-sql.mjs <sql-file> [project-ref]");
  process.exit(1);
}
function cleanToken(value) {
  const stripped = (value || "").replace(/\[[0-9;]*m/g, "");
  return (
    stripped.match(/(?:eyJ|sba[p]?_[A-Za-z0-9._-]+)/)?.[0] ?? stripped.trim()
  );
}

let token = cleanToken(process.env.SUPABASE_ACCESS_TOKEN);
if (!token) {
  try {
    token = cleanToken(
      readFileSync(path.join(os.homedir(), ".supabase", "access-token"), "utf8"),
    );
  } catch {
    /* fall back to the CLI below */
  }
}
if (!token) {
  try {
    const { execSync } = await import("node:child_process");
    token = cleanToken(
      execSync("npx supabase access-token", { encoding: "utf8", shell: true }),
    );
  } catch {
    /* fall through */
  }
}
if (!token) {
  console.error("No Supabase CLI token. Run: npx supabase login");
  process.exit(1);
}
const sql = readFileSync(path.resolve(file), "utf8");
const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: sql }),
});
const text = await res.text();
console.log(res.status, res.ok ? "SQL applied." : text.slice(0, 500));
process.exit(res.ok ? 0 : 1);
