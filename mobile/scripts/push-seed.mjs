// Parses supabase/seed.sql and upserts its product rows into the project's REST API.
// Usage: SUPABASE_URL=... SUPABASE_SECRET_KEY=... node scripts/push-seed.mjs
import { readFileSync } from "node:fs";

const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SECRET_KEY.");
  process.exit(1);
}

const sql = readFileSync(new URL("../supabase/seed.sql", import.meta.url), "utf8");
const start = sql.indexOf("values") + "values".length;
const end = sql.indexOf("on conflict", start);
if (start < 7 || end < 0) {
  console.error("seed.sql does not look like the generated insert.");
  process.exit(1);
}
const body = sql.slice(start, end).trim().replace(/;+$/, "");

// Split "(...), (...)" into per-field string arrays at top level, honouring
// '' escapes inside strings. Returns one array of 9 raw fields per row.
function parseTuples(b) {
  const rows = [];
  let cur = "", fields = [], inStr = false, depth = 0;
  const push = () => { fields.push(cur.trim()); cur = ""; };
  for (let i = 0; i < b.length; i++) {
    const c = b[i];
    if (inStr) {
      cur += c;
      if (c === "'") {
        if (b[i + 1] === "'") i++; else inStr = false; // '' is one literal quote
      }
      continue;
    }
    if (c === "'") { cur += c; inStr = true; continue; }
    if (c === "(") {
      depth++;
      if (depth > 1) cur += c;
      continue;
    }
    if (c === ")") {
      depth--;
      if (depth === 0) { push(); rows.push(fields); fields = []; }
      else cur += c;
      continue;
    }
    if (c === "," && depth === 1) { push(); continue; }
    if (depth === 0) continue; // separator whitespace between tuples
    cur += c;
  }
  if (inStr || depth !== 0 || fields.length || cur.trim())
    throw new Error("Unbalanced quotes/parens in seed.sql");
  return rows;
}

function value(field) {
  if (field === "null") return null;
  if (field.startsWith("'")) {
    const raw = field.slice(1, -1).replaceAll("''", "'");
    if (/^[{[]/.test(raw)) return JSON.parse(raw);
    return raw;
  }
  return Number(field);
}

const rows = parseTuples(body).map((f) => {
  if (f.length !== 9)
    throw new Error(`Expected 9 fields, got ${f.length}: (${f.join(", ").slice(0, 60)}`);
  const v = f.map(value);
  return {
    id: v[0],
    name: v[1],
    price: v[2],
    stock: v[3],
    category: v[4],
    product_group: v[5],
    image_url: v[6],
    details: v[7] ?? {},
    sort_order: v[8],
  };
});
console.log(`Parsed ${rows.length} product rows from seed.sql.`);

const res = await fetch(`${url}/rest/v1/products`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  },
  body: JSON.stringify(rows),
});
console.log(res.status, res.ok ? "Seed upserted." : await res.text());
process.exit(res.ok ? 0 : 1);
