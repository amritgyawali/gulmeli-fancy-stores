import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";
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
    return () => {
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
  const dark = config.theme.colorScheme === "dark" && config.darkTheme.enabled;
  return useMemo(
    () => ({
      primary: config.theme.primaryColor,
      secondary: config.theme.secondaryColor,
      accent: config.theme.accentColor,
      background: dark
        ? config.darkTheme.backgroundColor
        : config.theme.backgroundColor,
      surface: dark ? config.darkTheme.surfaceColor : config.theme.surfaceColor,
      text: dark ? config.darkTheme.textColor : config.theme.textColor,
      muted: dark
        ? config.darkTheme.mutedTextColor
        : config.theme.mutedTextColor,
      border: dark ? config.darkTheme.borderColor : config.theme.borderColor,
      buttonColor: config.theme.buttonColor,
      buttonTextColor: config.theme.buttonTextColor,
      buttonRadius: config.theme.buttonRadius,
      cardRadius: config.theme.cardRadius,
      headerBackground: config.header.backgroundColor,
      headerText: config.header.textColor,
      dark,
    }),
    [config, dark],
  );
}
