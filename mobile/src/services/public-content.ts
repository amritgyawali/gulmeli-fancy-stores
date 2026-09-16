import { useSyncExternalStore, useMemo } from "react";
import { AppState } from "react-native";
import { supabase } from "./supabase";
import { adminStorage } from "./storefront-config";
import { isLive } from "@/admin/core/publishing";
export interface PublicContent {
  collection: string;
  id: string;
  document: Record<string, unknown>;
}
const empty: PublicContent[] = [];
let rows: PublicContent[] = empty;
let timer: ReturnType<typeof setInterval> | undefined;
let foreground: ReturnType<typeof AppState.addEventListener> | undefined;
let stream: ReturnType<NonNullable<typeof supabase>["channel"]> | undefined;
let pending = false;
const listeners = new Set<() => void>();
export async function refreshPublicContent() {
  if (pending) return;
  pending = true;
  try {
    let next: PublicContent[];
    if (supabase) {
      const { data, error } = await supabase.rpc("storefront_content");
      if (error || !Array.isArray(data)) return;
      next = data;
    } else {
      const snapshot = (await adminStorage.load()) ?? {};
      next = Object.entries(snapshot).flatMap(([collection, records]) =>
        records
          .filter(
            (r) =>
              !r.deletedAt &&
              (collection === "homepage_sections"
                ? r.enabled !== false
                : isLive(r)),
          )
          .map((document) => ({ collection, id: document.id, document })),
      );
      next.push({
        collection: "homepage_config",
        id: "layout",
        document: { configured: !!snapshot.homepage_sections?.length },
      });
    }
    if (JSON.stringify(next) !== JSON.stringify(rows)) {
      rows = next;
      listeners.forEach((fn) => fn());
    }
  } catch {
    /* Keep the last successful content while offline. */
  } finally {
    pending = false;
  }
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    void refreshPublicContent();
    timer = setInterval(() => void refreshPublicContent(), 15000);
    foreground = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshPublicContent();
    });
    stream = supabase
      ?.channel("gulmeli-public-content")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "storefront_revision" },
        () => void refreshPublicContent(),
      )
      .subscribe();
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      clearInterval(timer);
      foreground?.remove();
      if (stream) void supabase?.removeChannel(stream);
      stream = undefined;
    }
  };
}
export function usePublicContent(
  collection: string,
): (Record<string, unknown> & { id: string })[] {
  const data = useSyncExternalStore(
    subscribe,
    () => rows,
    () => empty,
  );
  return useMemo(
    () =>
      data
        .filter((r) => r.collection === collection)
        .map((r) => ({ ...r.document, id: r.id })),
    [data, collection],
  );
}
