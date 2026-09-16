import { useSyncExternalStore } from "react";
import { configErrors } from "../../../mobile/src/admin/core/config-validation";
import { supabase } from "./supabase";
import {
  defaultConfig,
  restoreConfig,
  type StorefrontConfig,
} from "../../../mobile/src/admin/core/config";
export type { StorefrontConfig };
export const fallbackConfig = defaultConfig;
let current = defaultConfig;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let channel: ReturnType<typeof supabase.channel> | undefined;
let pending: Promise<StorefrontConfig> | null = null;
export async function loadPublishedConfig(): Promise<StorefrontConfig> {
  const { data, error } = await supabase
    .from("app_config")
    .select("published")
    .eq("id", "storefront")
    .maybeSingle();
  if (error) throw Error(error.message);
  return restoreConfig(data?.published);
}
async function refresh() {
  if (pending) return pending;
  pending = loadPublishedConfig()
    .then((next) => {
      if (JSON.stringify(next) !== JSON.stringify(current)) {
        current = next;
        listeners.forEach((fn) => fn());
      }
      return next;
    })
    .catch(() => current)
    .finally(() => {
      pending = null;
    });
  return pending;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    void refresh();
    timer = setInterval(() => void refresh(), 15000);
    channel = supabase
      .channel("web-published-config")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_config" },
        () => void refresh(),
      )
      .subscribe();
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      clearInterval(timer);
      if (channel) void supabase.removeChannel(channel);
      channel = undefined;
    }
  };
}
export function usePublishedConfig() {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => defaultConfig,
  );
}
export async function publishConfig(config: StorefrontConfig) {
  const errors = configErrors(config);
  if (errors.length) throw Error(errors[0].message);
  const { error } = await supabase
    .from("app_config")
    .upsert({
      id: "storefront",
      published: config,
      published_at: new Date().toISOString(),
    });
  if (error) throw Error(error.message);
  await refresh();
}
