import Constants from "expo-constants";
import { Platform } from "react-native";

// Every optional provider the app can talk to is configured here, and every
// value is optional: an empty string means "not configured", and the matching
// feature stays inert (never initialised, never bundled at runtime). Public
// keys are safe in the app bundle; secrets stay in Edge Function secrets.
// Expo only substitutes EXPO_PUBLIC_* variables that are referenced statically.

const raw = {
  clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
  posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY,
  posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST,
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN,
  stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  r2PublicUrl: process.env.EXPO_PUBLIC_R2_PUBLIC_URL,
};

const trim = (value: string | undefined) => value?.trim() || "";

export const integrations = {
  /** Clerk — social/enterprise auth UI. Needs a publishable key (pk_test_/pk_live_). */
  clerkPublishableKey: trim(raw.clerkPublishableKey),
  clerkEnabled:
    !!trim(raw.clerkPublishableKey) && Platform.OS !== "web",
  /** PostHog — product analytics. */
  posthogKey: trim(raw.posthogKey),
  posthogHost: trim(raw.posthogHost) || "https://us.i.posthog.com",
  posthogEnabled: !!trim(raw.posthogKey),
  /** Sentry — crash and error reporting. */
  sentryDsn: trim(raw.sentryDsn),
  sentryEnabled: !!trim(raw.sentryDsn),
  /** Mapbox — native maps. */
  mapboxToken: trim(raw.mapboxToken),
  mapboxEnabled: !!trim(raw.mapboxToken) && Platform.OS !== "web",
  /** Stripe — in-app card payments (server side needs the secret key). */
  stripePublishableKey: trim(raw.stripePublishableKey),
  stripeEnabled: !!trim(raw.stripePublishableKey),
  /** Cloudflare R2 — optional public mirror for media. */
  r2PublicUrl: trim(raw.r2PublicUrl),
  /** Firebase Cloud Messaging — present once the native config files exist. */
  firebaseEnabled:
    Platform.OS !== "web" &&
    !!Constants.expoConfig?.android?.googleServicesFile,
};

export type Integrations = typeof integrations;
