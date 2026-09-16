import { projectRef, supabaseCli } from "./backend-env.mjs";
const ref = projectRef();
console.log("Deploying media services to configured project:", ref);
supabaseCli([
  "secrets",
  "set",
  "--env-file",
  "supabase/.env.local",
  "--project-ref",
  ref,
]);
for (const name of ["cloudinary-media", "upload-image"])
  supabaseCli([
    "functions",
    "deploy",
    name,
    "--project-ref",
    ref,
    "--no-verify-jwt",
    "--use-api",
  ]);
console.log("Media functions deployed. Run backend:check -- --remote.");
