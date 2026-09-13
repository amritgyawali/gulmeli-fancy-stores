export function isPublicSupabaseKey(key: string) {
  if (key.startsWith("sb_publishable_")) return true;
  try {
    const payload = JSON.parse(
      atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    return payload.role === "anon";
  } catch {
    return false;
  }
}

export function readBackendConfig(values: {
  mode?: string;
  url?: string;
  key?: string;
  cloudName?: string;
}) {
  const live = values.mode === "supabase";
  const url = values.url?.trim() || "";
  const key = values.key?.trim() || "";
  const cloudName = values.cloudName?.trim() || "";
  let error = "";
  if (live && (!url || !key))
    error =
      "Supabase configuration is incomplete. Add the project URL and publishable key to .env.local.";
  else if (live && !/^https:\/\/[^/]+\/?$/.test(url))
    error = "Use your HTTPS Supabase project URL, without an API path.";
  else if (live && !isPublicSupabaseKey(key))
    error = "Use a Supabase publishable key, never a secret key in the app.";
  else if (values.mode && !["local", "supabase"].includes(values.mode))
    error = "EXPO_PUBLIC_BACKEND must be local or supabase.";
  return { live, url, key, cloudName, error };
}

// Expo substitutes only statically referenced EXPO_PUBLIC variables.
export const backendConfig = readBackendConfig({
  mode: process.env.EXPO_PUBLIC_BACKEND,
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  key: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  cloudName: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME,
});
