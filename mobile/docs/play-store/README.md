# Publishing Gulmeli Fancy Stores on Google Play

Everything the Play Console asks for, in the order it asks for it. App-side
configuration is already done; the steps marked **You** need your Google
account.

| Item | Value |
| --- | --- |
| Package name (permanent) | `com.gulmeli.fancystore` |
| App name | Gulmeli Fancy Stores |
| Category | Shopping |
| Contact email | amritgyawali999@gmail.com |
| Website | https://gulmeli-fancy-stores.vercel.app |
| Privacy policy | https://gulmeli-fancy-stores.vercel.app/privacy |
| Account deletion | https://gulmeli-fancy-stores.vercel.app/delete-account |
| Terms of use | https://gulmeli-fancy-stores.vercel.app/terms |

## What is configured in the code

- `eas.json` → `production` builds a signed **Android App Bundle (.aab)** with
  the live Supabase/Cloudinary settings, Node 24, OTA channel `production` and a
  remotely auto-incremented `versionCode`. `production-apk` builds the same app
  as an installable APK for testing on phones.
- `eas.json` → `submit.production` uploads to the **internal testing** track as
  a draft, using `play-service-account.json` (git- and EAS-ignored).
- `app.json` → only the permissions the app uses are requested: Internet,
  Camera (photos), Biometric (optional app lock), Vibrate and Notifications.
  Location, microphone, storage/media and overlay permissions are explicitly
  removed, so no permission declaration forms are needed in the Console.
  The unused `expo-location` package was removed.
- In-app **account deletion**: Account → Settings → Delete account. Backed by
  the `delete_my_account()` database function
  (`supabase/migrations/202610090001_account_deletion.sql`, tested in
  `tests/account-deletion.test.ts`).
- Privacy policy and terms links in Settings; policy pages live in
  `web/public/` and deploy with the website.
- Store graphics in this folder: `icon-512.png`, `feature-graphic-1024x500.png`
  and six 1080×1920 phone screenshots in `screenshots/`.

## 1. Before every release

```powershell
cd mobile
npm run check                      # typecheck, lint, unit + database tests
npm run backend:check -- --remote  # live backend reachable
```

The Supabase project must be **active**. Free-tier projects pause after a week
without traffic and a paused project makes the published app unusable — use the
Pro plan (or at least restore it and keep traffic flowing) before going live.

## 2. Build the app bundle

```powershell
cd mobile
npx eas-cli build -p android --profile production
```

On the first production build EAS creates the **upload key** and stores it on
Expo's servers. Back it up once: `npx eas-cli credentials -p android` →
*Download credentials*. Keep the file somewhere safe and never commit it.

Download the `.aab` from the link the build prints (also on expo.dev).

## 3. Create the app in Play Console — **You**

1. https://play.google.com/console → pay the one-time US$25 developer fee and
   verify your identity if you have not already.
2. **Create app** → name *Gulmeli Fancy Stores*, language English (or Nepali),
   **App**, **Free**, accept the declarations.

> **Personal developer accounts created after 13 Nov 2023** must run a
> **closed test with at least 12 testers opted in for 14 consecutive days**
> before Google allows a production release. Start the closed test as early as
> possible (step 6). Organisation accounts can skip this.

## 4. App content (Policy → App content) — **You**

| Section | Answer |
| --- | --- |
| Privacy policy | https://gulmeli-fancy-stores.vercel.app/privacy |
| App access | *All or some functionality is restricted* → add a test customer account (email + password) and the note: "Browse without signing in. Sign in on the Account tab to test cart, checkout (cash on delivery), orders and account deletion." Create this account in the app first. |
| Ads | **No**, the app does not contain ads |
| Content rating | Run the IARC questionnaire: category **Shopping / commerce**; no violence, sexual content, drugs, gambling or profanity; users can post reviews visible to others; no location sharing; no digital purchases. Expected rating: Everyone / PEGI 3. |
| Target audience | **18 and over** (keeps the app outside the Families policy) |
| News app | No |
| COVID-19 tracing | No |
| Data safety | See the table below |
| Government app | No |
| Financial features | None (cash on delivery only) |
| Health | None |

### Data safety answers

- Does the app collect or share user data? **Yes**
- Is all data encrypted in transit? **Yes**
- Can users request deletion? **Yes** — deletion URL
  https://gulmeli-fancy-stores.vercel.app/delete-account
- Data is **not shared** with third parties (service providers acting for you —
  Supabase, Cloudinary, Expo/Firebase — do not count as sharing).

| Data type | Collected | Optional? | Purposes |
| --- | --- | --- | --- |
| Personal info → Name | Yes | Required for orders | App functionality, Account management |
| Personal info → Email address | Yes | Required for an account | Account management, App functionality |
| Personal info → Phone number | Yes | Required for orders | App functionality |
| Personal info → Address | Yes | Required for orders | App functionality |
| Personal info → User IDs | Yes | Required for an account | Account management |
| Financial info → Purchase history | Yes | Required | App functionality |
| Photos and videos → Photos | Yes | Optional (profile photo) | App functionality |
| Messages → Other in-app messages | Yes | Optional (customer care) | App functionality, Customer support |
| App activity → App interactions | Yes | Required (viewed products, wishlist, cart) | App functionality, Personalisation |
| App activity → Other user-generated content | Yes | Optional (reviews) | App functionality |
| Device or other IDs | Yes | Optional (push notification token) | App functionality |

Not collected: location, contacts, calendar, SMS/call logs, files, audio,
health, web browsing, advertising ID, crash logs/diagnostics (no analytics or
crash SDK is configured in production). If you later add PostHog or Sentry
keys, add *App activity → App interactions (Analytics)* and *App info and
performance → Crash logs / Diagnostics* here and in the privacy policy.

## 5. Store listing (Grow → Store presence → Main store listing) — **You**

**App name** (30): `Gulmeli Fancy Stores`

**Short description** (80):
`Shop fashion, electronics & groceries with cash on delivery across Nepal.`

**Full description** (4000):

```
Gulmeli Fancy Stores brings everyday fancy goods to your door with cash on delivery across Nepal.

SHOP EVERYTHING IN ONE PLACE
• Fashion, electronics, groceries, jewellery and lifestyle products
• Search by name or category, filter by price and rating
• Clear prices in rupees, live stock and genuine customer reviews

DEALS EVERY DAY
• Offers page with the biggest savings first
• Vouchers applied at checkout
• Free delivery on larger orders

EASY, SAFE CHECKOUT
• Pay cash on delivery — no card needed
• Prices and stock confirmed by the store when you order
• Track your orders and cancel before they ship

YOUR ACCOUNT, YOUR WAY
• Wishlist and followed stores sync across your devices
• Save your delivery address once
• Optional fingerprint or face unlock
• Order updates by notification

HELP WHEN YOU NEED IT
• Message customer care from the app
• Help centre with quick answers

Your privacy matters: we never sell your data, and you can delete your account at any time from Settings.

Questions? Email amritgyawali999@gmail.com
```

**Graphics** (files in this folder):

- App icon: `icon-512.png` (512×512)
- Feature graphic: `feature-graphic-1024x500.png`
- Phone screenshots: `screenshots/01-home.png` … `06-account.png` (1080×1920).
  These were captured from the app's preview build. Before launch, replacing
  them with screenshots from a real phone running the production build (with
  your live catalogue) gives the best result. Play needs 2–8; 4+ are
  recommended.

**Contact details**: email amritgyawali999@gmail.com, website
https://gulmeli-fancy-stores.vercel.app.

## 6. Upload and test — **You**

1. **Testing → Internal testing** → *Create new release* → upload the `.aab`
   from step 2. Accept **Play App Signing** (Google holds the app signing key;
   EAS keeps your upload key). Release notes: "First release."
2. Add yourself as an internal tester, install from the opt-in link and run
   through: browse → product → add to cart → checkout → order appears →
   Settings → Delete account (with a throwaway account).
3. **Testing → Closed testing** → create a track, upload the same bundle (or
   promote it), add at least 12 testers (Google Group or email list) and keep
   them opted in for 14 days (personal accounts only).
4. **Production** → *Apply for production access* when eligible → create a
   release → countries: Nepal (plus any others you deliver to) → **Send for
   review**. First reviews usually take a few days.

## 7. Later releases (automated upload)

The very first bundle must be uploaded by hand (step 6). After that:

1. Google Cloud console → create a service account → JSON key → save it as
   `mobile/play-service-account.json` (ignored by git and EAS).
2. Play Console → *Users and permissions* → invite the service account email →
   grant *Release to testing tracks* (and *Release to production* if wanted).
3. Ship:

```powershell
cd mobile
npx eas-cli build -p android --profile production --auto-submit
```

This uploads a draft to the internal track; promote it in the Console.
`versionCode` increments automatically. Bump `"version"` in `app.json`
(e.g. 1.0.1) for user-visible releases — the OTA `runtimeVersion` follows it.

JavaScript-only fixes can go out without a store release:
`npx eas-cli update --branch production --message "Fix ..."`.

## Push notifications on Android (optional)

Order notifications on Android need Firebase Cloud Messaging: create a Firebase
project for `com.gulmeli.fancystore`, download `google-services.json` into
`mobile/`, and upload the FCM V1 service-account key with
`npx eas-cli credentials -p android` → *Push Notifications*. Without it the app
works normally; it just cannot receive pushes. See `docs/integrations.md`.
