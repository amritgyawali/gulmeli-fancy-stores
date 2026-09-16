import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState, useColorScheme } from "react-native";
import { resolveAppearance } from "@/admin/core/appearance";
import { supabase } from "@/services/supabase";
import { defaultConfig, type StorefrontConfig } from "@/admin/core/config";
import { isLive } from "@/admin/core/publishing";
import {
  refreshPublishedConfig,
  subscribePublishedConfig,
} from "@/services/storefront-config";

interface StorefrontValue {
  config: StorefrontConfig;
  /** Where the configuration came from: the shared backend, this device, or the defaults. */
  source: "remote" | "local" | "default";
  loaded: boolean;
  error: string;
  refresh(): Promise<void>;
  /** Feature switches, so screens can hide what the owner turned off. */
  feature(name: keyof StorefrontConfig["features"]): boolean;
  /** Editable wording, so copy changes do not need a release. */
  label(name: keyof StorefrontConfig["text"]): string;
  /** The announcement bar, only while it is enabled and inside its window. */
  announcement: StorefrontConfig["announcement"] | null;
  maintenance: { active: boolean; message: string; eta: string };
}

const fallback: StorefrontValue = {
  config: defaultConfig,
  source: "default",
  loaded: false,
  error: "",
  refresh: async () => undefined,
  feature: (name) => defaultConfig.features[name],
  label: (name) => defaultConfig.text[name],
  announcement: null,
  maintenance: { active: false, message: "", eta: "" },
};

const StorefrontContext = createContext<StorefrontValue>(fallback);

/**
 * Serves the published storefront configuration to the customer app.
 *
 * Colours, wording, contact details, feature switches and the announcement bar
 * all come from here, so the admin dashboard can change them without a release.
 */
export function StorefrontProvider({ children }: PropsWithChildren) {
  const [config, setConfig] = useState<StorefrontConfig>(defaultConfig);
  const [source, setSource] = useState<StorefrontValue["source"]>("default");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    await refreshPublishedConfig();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribePublishedConfig((value) => {
      setConfig(value.config);
      setSource(value.source);
      setError(value.error);
      setLoaded(true);
    });
    // Pick up a publish that happened while the app was in the background.
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshPublishedConfig();
    });
    const channel = supabase
      ?.channel("gulmeli-settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_config" },
        () => {
          void refreshPublishedConfig();
        },
      )
      .subscribe();
    const poll = supabase
      ? setInterval(() => {
          void refreshPublishedConfig();
        }, 30000)
      : null;
    return () => {
      if (channel) void supabase?.removeChannel(channel);
      if (poll) clearInterval(poll);
      unsubscribe();
      subscription.remove();
    };
  }, []);

  const value = useMemo<StorefrontValue>(() => {
    const announcement = config.announcement;
    const withinWindow = isLive({
      status: announcement.enabled ? "published" : "draft",
      publishAt: announcement.startsAt || null,
      unpublishAt: announcement.endsAt || null,
    });
    return {
      config,
      source,
      loaded,
      error,
      refresh: load,
      feature: (name) => config.features[name],
      label: (name) => config.text[name] || defaultConfig.text[name],
      announcement: withinWindow && announcement.text ? announcement : null,
      maintenance: {
        active: config.app.maintenanceMode,
        message: config.app.maintenanceMessage,
        eta: config.app.maintenanceEta,
      },
    };
  }, [config, source, loaded, error, load]);

  return (
    <StorefrontContext.Provider value={value}>
      {children}
    </StorefrontContext.Provider>
  );
}

export function useStorefront(): StorefrontValue {
  return useContext(StorefrontContext);
}

/** The published palette, ready to spread into styles. */
export function useStorefrontTheme() {
  const { config } = useStorefront();
  const system = useColorScheme();
  return useMemo(
    () => resolveAppearance(config, system === "dark"),
    [config, system],
  );
}

/** Uses the actual storefront components with an unpublished appearance draft. */
export function StorefrontPreviewProvider({
  config,
  children,
}: PropsWithChildren<{ config: StorefrontConfig }>) {
  const value = useMemo<StorefrontValue>(
    () => ({
      ...fallback,
      config,
      loaded: true,
      feature: (name) => config.features[name],
      label: (name) => config.text[name],
    }),
    [config],
  );
  return (
    <StorefrontContext.Provider value={value}>
      {children}
    </StorefrontContext.Provider>
  );
}
