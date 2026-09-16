import { projectRef, supabaseCli, mobileRoot } from "./backend-env.mjs";
import { existsSync } from "node:fs";
import path from "node:path";
const file = process.argv[2];
if (
  !file ||
  !/^[a-zA-Z0-9_./-]+\.sql$/.test(file) ||
  !existsSync(path.resolve(mobileRoot, file))
)
  throw Error("Usage: npm run backend:sql -- supabase/migrations/FILE.sql");
supabaseCli([
  "db",
  "query",
  "--linked",
  "--project-ref",
  projectRef(),
  "--file",
  file,
]);
