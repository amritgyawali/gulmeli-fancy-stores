import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!url || !key) {
  // Surface configuration problems loudly during development.
  console.error(
    "Supabase is not configured. Copy .env.example to .env.local in web/.",
  );
}

export const cloudName =
  (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined) ?? "";

export const supabase = createClient(url ?? "", key ?? "", {
  auth: {
    storageKey: "gulmeli:auth:v1",
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
