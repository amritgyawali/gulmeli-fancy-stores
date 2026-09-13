import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import { backendConfig } from "./backend-config";

// Static web exports render in Node, where AsyncStorage has no window.
const runtimeAvailable = Platform.OS !== "web" || typeof window !== "undefined";
export const supabase =
  runtimeAvailable && backendConfig.live && !backendConfig.error
    ? createClient(backendConfig.url, backendConfig.key, {
        auth: {
          storage: AsyncStorage,
          storageKey: "gulmeli:auth:v1",
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

export function requireSupabase() {
  if (!supabase)
    throw new Error(
      backendConfig.error || "The store is in local preview mode.",
    );
  return supabase;
}
