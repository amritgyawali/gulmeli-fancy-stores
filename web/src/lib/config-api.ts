// Reads the published storefront config the admin dashboard publishes from
// either surface (app_config row id 'storefront'); subscribes to realtime so a
// publish lands without a reload.
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export interface StorefrontConfig {
  theme: {
    primaryColor: string;
    buttonColor: string;
    backgroundColor: string;
    textColor: string;
    [key: string]: unknown;
  };
  branding: { companyName: string; tagline: string; logo: string; [key: string]: unknown };
  [key: string]: unknown;
}

export const fallbackConfig: StorefrontConfig = {
  theme: {
    primaryColor: "#f85606",
    buttonColor: "#f85606",
    backgroundColor: "#f4f4f4",
    textColor: "#212121",
  },
  branding: {
    companyName: "Gulmeli Fancy Stores",
    tagline: "Everything you need, delivered",
    logo: "",
  },
};

export async function loadPublishedConfig(): Promise<StorefrontConfig> {
  const { data, error } = await supabase
    .from("app_config")
    .select("published")
    .eq("id", "storefront")
    .maybeSingle();
  if (error || !data?.published) return fallbackConfig;
  const raw = data.published as Partial<StorefrontConfig>;
  return {
    ...fallbackConfig,
    ...raw,
    theme: { ...fallbackConfig.theme, ...(raw.theme ?? {}) },
    branding: { ...fallbackConfig.branding, ...(raw.branding ?? {}) },
  };
}

export function usePublishedConfig() {
  const [config, setConfig] = useState<StorefrontConfig>(fallbackConfig);
  useEffect(() => {
    void loadPublishedConfig().then(setConfig).catch(() => undefined);
    const channel = supabase
      .channel("gulmeli-web-config")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "app_config" },
        (payload) => {
          const raw = (payload.new as { published?: Partial<StorefrontConfig> })
            ?.published;
          if (raw)
            setConfig({
              ...fallbackConfig,
              ...raw,
              theme: { ...fallbackConfig.theme, ...(raw.theme ?? {}) },
              branding: { ...fallbackConfig.branding, ...(raw.branding ?? {}) },
            });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);
  return config;
}

/** Admin side: publish a draft so both clients pick it up. */
export async function publishConfig(config: StorefrontConfig) {
  const { error } = await supabase
    .from("app_config")
    .upsert({
      id: "storefront",
      published: config,
      published_at: new Date().toISOString(),
    });
  if (error) throw new Error(error.message);
}
