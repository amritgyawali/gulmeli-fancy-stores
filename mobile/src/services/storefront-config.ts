import AsyncStorage from "@react-native-async-storage/async-storage";
import { restoreConfig, type StorefrontConfig } from "@/admin/core/config";
import {
  initialConfigState,
  restoreConfigState,
  type ConfigState,
} from "@/admin/core/publishing";
import type { Snapshot } from "@/admin/core/store";
import { backendConfig } from "./backend-config";
import { supabase } from "./supabase";

export const CONFIG_STORAGE_KEY = "gulmeli:config:v1";
export const ADMIN_STORAGE_KEY = "gulmeli:admin:v1";

/** The single row the storefront reads its published configuration from. */
const CONFIG_ROW_ID = "storefront";

function parse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const configStorage = {
  async load(): Promise<ConfigState> {
    return restoreConfigState(
      parse(await AsyncStorage.getItem(CONFIG_STORAGE_KEY)),
    );
  },
  async save(state: ConfigState): Promise<void> {
    await AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(state));
  },
};

export const adminStorage = {
  async load(): Promise<Snapshot | null> {
    return parse<Snapshot>(await AsyncStorage.getItem(ADMIN_STORAGE_KEY));
  },
  async save(snapshot: Snapshot): Promise<void> {
    await AsyncStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(snapshot));
  },
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(ADMIN_STORAGE_KEY);
  },
};

/**
 * Reads the published configuration the customer app should render with.
 *
 * With Supabase configured this is the shared row every device sees, so an
 * admin edit reaches customers without a release. Without it, the device's own
 * copy is used, which is what local preview mode expects.
 */
export async function loadPublishedConfig(): Promise<{
  config: StorefrontConfig;
  source: "remote" | "local" | "default";
  error: string;
}> {
  if (backendConfig.live && supabase) {
    const { data, error } = await supabase
      .from("app_config")
      .select("published")
      .eq("id", CONFIG_ROW_ID)
      .maybeSingle();
    if (!error && data?.published) {
      return {
        config: restoreConfig(data.published),
        source: "remote",
        error: "",
      };
    }
    if (error && error.code !== "PGRST116") {
      const local = await configStorage.load();
      return { config: local.published, source: "local", error: error.message };
    }
  }
  const raw = await AsyncStorage.getItem(CONFIG_STORAGE_KEY);
  if (!raw)
    return {
      config: initialConfigState().published,
      source: "default",
      error: "",
    };
  return {
    config: restoreConfigState(parse(raw)).published,
    source: "local",
    error: "",
  };
}

/**
 * Pushes the published document to the shared row. Only admins pass the row's
 * write policy, so a failure here is reported rather than silently swallowed.
 */
export async function publishConfigRemotely(
  config: StorefrontConfig,
): Promise<void> {
  if (!backendConfig.live || !supabase) return;
  const { error } = await supabase
    .from("app_config")
    .upsert({
      id: CONFIG_ROW_ID,
      published: config,
      published_at: new Date().toISOString(),
    });
  if (error) throw new Error(error.message);
}

export interface PublishedConfigSnapshot {
  config: StorefrontConfig;
  source: "remote" | "local" | "default";
  error: string;
}

let snapshot: PublishedConfigSnapshot | null = null;
let inFlight: Promise<PublishedConfigSnapshot> | null = null;
const listeners = new Set<(value: PublishedConfigSnapshot) => void>();

/** Re-reads the published document and tells every subscriber. */
export async function refreshPublishedConfig(): Promise<PublishedConfigSnapshot> {
  inFlight =
    inFlight ??
    loadPublishedConfig()
      .catch(() => ({
        config: initialConfigState().published,
        source: "default" as const,
        error:
          "The store settings could not be loaded, so the built-in defaults are being used.",
      }))
      .then((value) => {
        snapshot = value;
        inFlight = null;
        for (const listener of [...listeners]) listener(value);
        return value;
      });
  return inFlight;
}

/**
 * Subscribes to the published configuration. The listener is always called
 * asynchronously, so React components only ever set state from a callback.
 */
export function subscribePublishedConfig(
  listener: (value: PublishedConfigSnapshot) => void,
): () => void {
  listeners.add(listener);
  const current = snapshot;
  if (current)
    void Promise.resolve().then(
      () => listeners.has(listener) && listener(current),
    );
  else void refreshPublishedConfig();
  return () => {
    listeners.delete(listener);
  };
}
