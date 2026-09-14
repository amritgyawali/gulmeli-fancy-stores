import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Expo reads app.config.ts first and feeds it the app.json values. We use it
// to attach provider configuration only when the matching credentials are
// actually present, so a checkout without keys still builds and runs.

const root = path.dirname(fileURLToPath(import.meta.url));
const base = JSON.parse(
  fs.readFileSync(path.join(root, "app.json"), "utf8"),
) as { expo: Record<string, any> };
const env = process.env;

const googleServices = path.join(root, "google-services.json");
const googleServiceInfo = path.join(root, "GoogleService-Info.plist");
if (fs.existsSync(googleServices))
  base.expo.android.googleServicesFile = "./google-services.json";
if (fs.existsSync(googleServiceInfo))
  base.expo.ios.googleServicesFile = "./GoogleService-Info.plist";

// Only wire the Sentry upload plugin when an org/project pair is configured.
const plugins = base.expo.plugins as unknown[];
const sentryIndex = plugins.findIndex(
  (p) =>
    Array.isArray(p) &&
    typeof p[0] === "string" &&
    p[0].startsWith("@sentry/react-native"),
);
if (sentryIndex >= 0 && env.SENTRY_ORG && env.SENTRY_PROJECT) {
  const url = env.SENTRY_URL || "https://sentry.io/";
  plugins[sentryIndex] = [
    "@sentry/react-native/expo",
    { url, organization: env.SENTRY_ORG, project: env.SENTRY_PROJECT },
  ];
} else if (sentryIndex >= 0) {
  plugins.splice(sentryIndex, 1);
}

// With an EAS project id, Expo CLI signs the dev manifest for the owner's
// account and Expo Go refuses anyone else. EXPO_GO_PUBLIC=1 drops the id so a
// shared tunnel can be opened by any Expo Go user (push tokens stay inert).
if (env.EXPO_GO_PUBLIC === "1" && base.expo.extra?.eas) {
  delete base.expo.extra.eas;
}

// OTA updates need an EAS project id; keep the fallback policy inert without it.
const easProjectId = env.EAS_PROJECT_ID || base.expo.extra?.eas?.projectId;
if (easProjectId) {
  base.expo.extra ??= {};
  base.expo.extra.eas = { projectId: easProjectId };
  base.expo.updates = {
    url: `https://u.expo.dev/${easProjectId}`,
    fallbackToCacheTimeout: 0,
  };
  base.expo.runtimeVersion = { policy: "appVersion" };
}
if (env.EXPO_PUBLIC_MAPBOX_TOKEN) {
  base.expo.extra ??= {};
  base.expo.extra.mapboxAccessToken = env.EXPO_PUBLIC_MAPBOX_TOKEN;
}

export default base;
