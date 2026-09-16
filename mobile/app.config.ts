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

// Distributed builds must embed the shared backend connection. A user's phone
// does not read the developer's .env.local or need a developer machine running.
if (
  env.EAS_BUILD_PROFILE === "preview" ||
  env.EAS_BUILD_PROFILE === "production"
) {
  if (
    env.EXPO_PUBLIC_BACKEND !== "supabase" ||
    !env.EXPO_PUBLIC_SUPABASE_URL?.startsWith("https://") ||
    !env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    !env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME
  ) {
    throw new Error(
      "Release backend configuration is incomplete. Run npm run backend:release-config before building.",
    );
  }
}

// Installed launcher icons and native splash assets are selected at build time.
const releaseFile = path.join(root, "assets/branding/release.json");
if (fs.existsSync(releaseFile)) {
  const branding = JSON.parse(fs.readFileSync(releaseFile, "utf8"));
  if (branding.name) base.expo.name = branding.name;
  if (branding.appIcon) {
    base.expo.icon = branding.appIcon;
    base.expo.ios.icon = branding.appIcon;
    base.expo.android.icon = branding.appIcon;
    base.expo.android.adaptiveIcon.foregroundImage = branding.appIcon;
  }
  if (branding.primaryColor)
    base.expo.android.adaptiveIcon.backgroundColor = branding.primaryColor;
  if (branding.favicon) base.expo.web.favicon = branding.favicon;
  const splash = base.expo.plugins.find(
    (p: unknown) => Array.isArray(p) && p[0] === "expo-splash-screen",
  );
  if (splash) {
    if (branding.splashLogo) splash[1].image = branding.splashLogo;
    if (branding.backgroundColor)
      splash[1].backgroundColor = branding.backgroundColor;
  }
}
base.expo.userInterfaceStyle = "automatic";
base.expo.orientation = "default";

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
