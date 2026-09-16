import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { hostedPhotos } from "./product-media";
let urls: Record<string, string> = {};
const listeners = new Set<() => void>();
let stop: (() => void) | undefined;
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1 && supabase) {
    const client = supabase;
    let active = true;
    const refresh = () => {
      void client
        .from("media")
        .select("id,name,url")
        .then(({ data, error }) => {
          if (!active || error || !data) return;
          urls = Object.fromEntries(
            data.map((row) => [
              row.id.startsWith("photo-") ? row.id.slice(6) : row.name,
              row.url,
            ]),
          );
          for (const notify of listeners) notify();
        });
    };
    refresh();
    const channel = client
      .channel("gulmeli-public-media")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "media" },
        refresh,
      )
      .subscribe();
    const timer = setInterval(refresh, 30000);
    stop = () => {
      active = false;
      clearInterval(timer);
      void client.removeChannel(channel);
    };
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      stop?.();
      stop = undefined;
    }
  };
}
export function useMediaUrl(key: string) {
  return useSyncExternalStore(
    subscribe,
    () => urls[key] ?? hostedPhotos[key]?.url,
    () => hostedPhotos[key]?.url,
  );
}
