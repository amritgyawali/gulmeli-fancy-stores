# Integration & Credential Guide

Every service below is already installed and wired in code. The app runs
without any of them. Add keys when you are ready — nothing else changes.

All client-side keys go in **`mobile/.env.local`** (already git-ignored).
Restart `npx expo start -c` after editing. Server-side secrets go into
Supabase Edge Function secrets via `npx supabase secrets set`, never in `.env.local`.

Quick check anytime: `npm run backend:check`.

---

## Already working (configured)

| Service | Where it lives | Status |
|---|---|---|
| Supabase (DB + Auth) | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | configured |
| Cloudinary | `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` + function secrets | configured |

Supabase keys: dashboard → Project → **Settings → API** (URL + `sb_publishable_…` key).
Never paste the `secret`/service-role key into the app.
Cloudinary: console.cloudinary.com → **Dashboard → API Keys** (cloud name is public; key/secret go to functions).
Deploy/refresh backend after changes: `npm run backend:deploy` (needs `SUPABASE_ACCESS_TOKEN`).

## Zustand — global state
Installed and wired (`src/store/prefs.ts`). **No key needed.**

## TanStack Query — server state
Installed and wired (catalog cache in `src/services/queries.ts`). **No key needed.**

## React Hook Form + Zod — forms/validation
Installed and wired on the sign-in screen (`src/app/auth.tsx`). **No key needed.**

## expo-sqlite — offline storage
Installed and wired (`src/services/offline-db.ts`; catalog + account cache, swipe delete uses gestures separately). **No key needed.**

## expo-secure-store — secure token storage
Installed and wired (Clerk token cache, install id). **No key needed.**

## expo-linking — deep links
Already in use by expo-router. Scheme is `gulmeli://`. Links like
`https://yourdomain.com/...` with **Associated Domains** (iOS) / **Android App Links**
point into the app. For custom scheme testing: `npx expo linking`. **No key needed**
for the app itself; you need your web host to serve the assetlinks/APPLE links files.

## expo-local-authentication — biometrics
Installed and wired (`src/components/AppLock.tsx`). Customer enables "App lock"
in Settings. Works with device Face ID/Touch ID/fingerprint — **no key needed.**

## expo-camera / expo-image-picker — camera
Wired for review photos and visual-search references. Permissions strings are in
`app.json`. **No key needed.**

## expo-notifications — push notifications
Installed and wired (`src/services/notifications.ts`; tokens saved to `device_tokens` —
apply migration `supabase/migrations/202609140003_push_tokens.sql`).
- **Expo push works with EAS build only** (no extra key). Get `projectId` via `eas init`
  and set `EAS_PROJECT_ID` in the environment when building (see EAS below).
- **Firebase FCM (native channel)** — for reliable background delivery on Android:
  1. console.firebase.google.com → Create project (name: gulmeli-fancy-store).
  2. Add Android app, package `com.gulmeli.fancystore` → download **google-services.json**,
     put it in `mobile/`. iOS: bundle id `com.gulmeli.fancystore` →
     **GoogleService-Info.plist** into `mobile/`. (app.config.ts picks them up automatically.)
  3. Enable Cloud Messaging (default on). FCM server keys are no longer needed.
  4. EAS Build required (`eas build -p android`).

## expo-updates (EAS Update) + EAS Build
`eas.json` and `expo-updates` are ready.
1. `npm i -g eas-cli` (already a dev dependency) → `eas login` (create account: expo.dev).
2. `eas init` → writes `extra.eas.projectId` (or set `EAS_PROJECT_ID=…` env — app.config.ts injects update URL + runtimeVersion automatically).
3. Build: `eas build -p android --profile preview` / `-p ios`.
4. Ship OTA without store release: `eas update --channel preview`.
iOS builds need an Apple Developer account ($99/yr) and `eas credentials`.

## Sentry — crash reporting
Installed and wired (`src/services/telemetry.ts`).
1. sentry.io → New Project → **React Native** → copy the **DSN**.
2. `EXPO_PUBLIC_SENTRY_DSN=https://…@sentry.io/…` in `.env.local`.
3. For symbol/upload at build time also set `SENTRY_ORG` and `SENTRY_PROJECT`
   env vars when running `eas build` (app.config.ts enables the upload plugin only then).

## PostHog — analytics
Installed and wired (`src/services/telemetry.ts` — `identifyUser`, `track`,
feature flags). Events already sent: sign-in, order placed.
1. posthog.com (US or EU cloud) → Create project → **Project API key** (`phc_…`) and **host** (`https://us.i.posthog.com` / `https://eu.i.posthog.com`).
2. `.env.local`: `EXPO_PUBLIC_POSTHOG_KEY`, `EXPO_PUBLIC_POSTHOG_HOST`.

## Clerk — alternative auth (tier)
Installed and wired (`src/services/clerk-auth.tsx`, social buttons on sign-in screen).
1. clerk.com → Create application (Social + Email) → copy the **publishable key** (`pk_test_…`/`pk_live_…`).
2. `.env.local`: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=…` (native builds only; web keeps Supabase auth).
3. Google OAuth: Clerk → SSO integrations → Google (Client ID/secret from Google Cloud Console → OAuth consent).
4. Apple: requires an Apple Developer Account key uploaded to Clerk.
Clerk tokens are stored in expo-secure-store automatically.

## Stripe — payments (SDK wired)
Installed. Checkout keeps **Cash on delivery** as default; card option appears
when configured (server side).
1. stripe.com → Developers → API keys: **publishable key** (`pk_test_…`) and **secret key** (`sk_test_…`).
2. `.env.local`: `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=…` (enables native payment sheet).
3. Secret (server only): `npx supabase secrets set STRIPE_SECRET_KEY=sk_…` —
   the `stripe-payment-intent` function then issues PaymentIntents (deploy via `npm run backend:deploy`).
4. Webhook for order fulfilment later: Stripe dashboard → Webhooks → point at your Edge Function URL.
Nepal note: Stripe does not settle to Nepali banks directly; connect it to a supported
account (e.g. US/HK entity) or keep COD/eSewa/Khalti as primary.

## Cloudflare R2 — file storage (tier)
Cloudinary remains the active media store; R2 is the optional public mirror.
1. dash.cloudflare.com → R2 → Create bucket (`gulmeli-media`) → copy the **bucket public URL** (or connect a custom domain).
2. `.env.local`: `EXPO_PUBLIC_R2_PUBLIC_URL=https://pub-….r2.dev`.
3. For uploads: R2 → Manage R2 API Tokens → create token (Object Read & Write);
   `npx supabase secrets set R2_ACCOUNT_ID=… R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=…`
   and extend an Edge Function to presign PUTs (pattern: `cloudinary-media`).

## Upstash Redis — API cache (tier)
Server-side only (supplements Supabase; nothing to change in the app).
1. upstash.com → Create database (Rest API) → copy REST URL + token.
2. `npx supabase secrets set UPSTASH_REDIS_REST_URL=… UPSTASH_REDIS_REST_TOKEN=…`
   and use it inside Edge Functions (`fetch` to the REST endpoint — no npm client needed on Deno).

## Inngest — background jobs (tier)
Server-side only (emails/tasks/queues).
1. inngest.com → Create app → copy the **Event Key URL** (`https://inngs…/e/…`).
2. `npx supabase secrets set INNGEST_EVENT_KEY=… INNGEST_SIGNING_KEY=…` and POST events
   from functions (e.g. order placed → send confirmation email).

## Mapbox — maps (tier)
Installed (`@rnmapbox/maps`).
1. account.mapbox.com → Tokens → create a **public** token (`sk.…` or legacy `pk.…`) —
   restrict to Android/iOS bundle ids.
2. `.env.local`: `EXPO_PUBLIC_MAPBOX_TOKEN=pk.…` (app.config.ts also injects it into
   `extra.mapboxAccessToken` for native builds). Requires EAS/dev build (not Expo Go).

## Maestro — mobile E2E testing
Installed as tooling: config lives at `.maestro/` (see below). **No key needed.**
1. Install: github.com/mobile-dev-inc/maestro#installation (or `npm i -g @maestro`/brew).
2. Start the app: `npm run android` (device/emulator).
3. Run: `maestro .maestro`.

## .env.local reference

```dotenv
# Existing (required for live mode)
EXPO_PUBLIC_BACKEND=supabase
EXPO_PUBLIC_SUPABASE_URL=…
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=…
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=…

# Optional providers — leave blank/absent until you have the key
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=
EXPO_PUBLIC_POSTHOG_KEY=
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
EXPO_PUBLIC_SENTRY_DSN=
EXPO_PUBLIC_MAPBOX_TOKEN=
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=
EXPO_PUBLIC_R2_PUBLIC_URL=

# Build-time (PowerShell: $env:NAME="value")
# EAS_PROJECT_ID=…  SENTRY_ORG=…  SENTRY_PROJECT=…  SUPABASE_ACCESS_TOKEN=…
```
