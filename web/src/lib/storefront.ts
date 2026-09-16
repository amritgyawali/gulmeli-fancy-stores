import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { usePublishedConfig } from "./config-api";
import { resolveAppearance } from "../../../mobile/src/admin/core/appearance";
export {
  defaultSections,
  sectionVisible,
  safeStoreLink,
  plainText,
} from "../../../mobile/src/admin/core/storefront-content";
export type ContentRecord = Record<string, unknown> & { id: string };
export function useTheme() {
  const config = usePublishedConfig();
  const [dark, setDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const change = () => setDark(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  return resolveAppearance(config, dark);
}
export function useContent() {
  const [rows, setRows] = useState<
    { collection: string; id: string; document: ContentRecord }[]
  >([]);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const { data, error } = await supabase.rpc("storefront_content");
        if (active && !error && Array.isArray(data)) setRows(data);
      } catch {
        /* retain last content offline */
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 15000);
    const stream = supabase
      .channel("web-layout")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "storefront_revision" },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      active = false;
      clearInterval(timer);
      void supabase.removeChannel(stream);
    };
  }, []);
  return (collection: string): ContentRecord[] =>
    rows
      .filter((r) => r.collection === collection)
      .map((r) => ({ ...r.document, id: r.id }));
}
