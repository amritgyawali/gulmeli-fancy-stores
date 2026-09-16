# Live backend integration

## Current verification status

**Deployed and verified on 16 September 2026.** The app and local Supabase CLI are connected to project `mebobqjfoexyhheupjuf`. All **29 active products have database photo URLs**, and **40 assets are hosted in Cloudinary**. Sources are recorded in `src/data/hosted-media.json`.

The database migrations, catalog photo import, Cloudinary secrets, `cloudinary-media`, and `upload-image` functions are deployed. Every remote health check passes. Preview and production build profiles contain the matching public connection settings.

Live verification passed: admin CRUD and stale-edit protection, customer isolation, authoritative checkout and idempotent retries, cancellation and stock reconciliation, dashboard inventory, and support isolation. The database verification uses a transaction and rolls back every test change. A temporary Auth account also passed real sign-in, authenticated avatar upload and delivery, customer library restrictions, and admin media upload/deletion; that account and its images were removed.

Latest local verification passed mobile type checking and lint, 85 unit/database tests, seven browser service flows, Android/iOS/web bundle exports, and the separate website build. The three exported bundles were checked for the configured live Supabase connection and absence of test credentials. Browser service flows use mocked responses; physical-phone validation remains to be done with a new installable build.

Live app and website previews loaded the hosted catalogue, banner photos and category images without JavaScript errors. All three previously empty banner images were filled from existing Cloudinary media. Dashboard publication tests cover primary colour, store name, logo and favicon; customer layout refresh and dark/phone/landscape rendering were also checked.

The existing APK in the repository predates these changes. Source changes and exported bundles do not update an already installed APK by themselves.

## Repeat deployment when needed

From `mobile/`:

```powershell
npx supabase login --agent no --output-format text
npx supabase link --project-ref mebobqjfoexyhheupjuf
npm run backend:setup
```

The login must have access to `mebobqjfoexyhheupjuf`. `backend:setup` prepares and applies missing database stages, fills missing product image URLs, indexes Cloudinary media, deploys both authenticated media functions, and checks the public endpoints. It uses the project URL in `.env.local`; there is no separate hardcoded deployment target. It does not reset your catalog or create fake customer orders.

Alternatively, run `supabase/deploy.sql` and then `supabase/catalog-photos.sql` in the project's SQL Editor, followed by `npm run backend:deploy` from an authorized CLI session.

### Store-owner account

The existing app account `amritgyawali999@gmail.com` already has `super_admin` membership. Existing staff memberships were preserved. Supabase dashboard login and customer/app login are separate accounts.

To add another owner, create and confirm that person's normal account in the app first. In Supabase SQL Editor, replace the email below with the intended store owner's confirmed email:

```sql
insert into public.admin_members(user_id,role)
select id,'super_admin' from auth.users
where lower(email)=lower('OWNER_EMAIL_HERE') and email_confirmed_at is not null
on conflict(user_id) do update set role=excluded.role;
```

Opening `/admin` never grants admin access automatically. Membership is separate from customer signup. Existing members are retained. Staff must use their own authenticated accounts; changing the preview actor cannot grant production access.

## Create an installable release

```powershell
npm run backend:check -- --remote
npm run backend:release-config
npx eas-cli build --platform android --profile preview
```

Use the `production` profile for store distribution. EAS/Android signing still requires your Expo account. The preview and production profiles embed only the four public connection values. Supabase and Cloudinary server secrets are excluded from EAS uploads and app bundles.

Installed users need an internet connection to the hosted services. They do not need your computer, Metro, a local backend, or their own Supabase/Cloudinary accounts. Store accounts are ordinary Supabase Auth users. Prices, stock, photos, orders, support replies and published settings are fetched at runtime; changing those records does not require rebuilding the app. Changing the project URL/public key does require a new bundle/release.

## Data flow

Appearance and homepage controls are connected to the customer app. See [Store appearance](store-appearance.md) for publishing colours, logos, favicon, layouts and preparing native icon/splash assets. The `202609160001` and `202609160002` storefront migrations are deployed. Category/brand visibility uses the actual enabled fields, and product sale metadata is projected to the customer catalogue.

| Data | Storage and behavior |
| --- | --- |
| Accounts and sessions | Supabase Auth; sessions persist on the device and refresh when the app returns to the foreground. |
| Catalog and inventory | Supabase `products`; public active-product reads. Admin changes project from `admin_data` inside the same database transaction. Purchases and cancellations update dashboard inventory. Stale product edits are rejected; inventory changes use transactional deltas. |
| All dashboard resource records | `admin_data`; only changed records are saved through `save_admin_changes`. A stale edit is rejected instead of overwriting another device's work. Soft deletion hides products; restore republishes them. |
| Customer profile, cart, wishlist, history, preferences, private review notes and drafts | Per-account `customer_state`, protected by row-level security. Devices follow remote changes when they have no pending local edits. |
| Orders | Server-validated, transactional `place_order`; retry request IDs prevent duplicate orders. Orders appear in admin records without an admin app being open. Staff status changes reach customer order history. Cancellation restores inventory once. |
| Checkout rules | `quote_order` and `place_order` share shipping fees, free-shipping thresholds, order/COD limits, and coupon calculations. The settings must be published. |
| Coupon records | Enabled state, dates, minimum purchase, percent/fixed/free-shipping/buy-X-get-Y rules, product/category/collection targeting, specific customers, first-order and usage limits are evaluated in SQL. Birthday/group eligibility requires store verification and is rejected automatically until that verification exists. |
| Published appearance/settings | Shared `app_config`, with server version history. Settings refresh over Realtime, on foreground, and by periodic recovery reads. |
| Published banners | Sanitized `storefront_content` RPC; home banners render in the app and website. Other public content types are exposed for their screen integrations. Private admin fields are omitted. |
| Customer care | `send_support_message` creates a ticket. Admins edit the ticket's conversation history to reply as `agent`; the customer's conversation refreshes in app/web. Internal staff notes stay private. |
| Product photos, banners, artwork, uploads | Cloudinary; Supabase stores URL/metadata. Customer avatar uploads are fixed to their own user ID; only admins can replace/delete library files. |

Catalog, order, settings, and media changes use Supabase Realtime with foreground/poll recovery. Support replies refresh every 5 seconds and public banners every 15 seconds. Offline catalogs may be displayed from cache; an unavailable backend never creates a fake successful live order.

## Photos

`backend:photos` is resumable and records each uploaded Cloudinary asset. Original artwork remains available, and missing product photographs were sourced from internet product pages. `scripts/photo-sources.json` and `src/data/hosted-media.json` record sources. Generic model/packaging substitutions are marked **Illustrative photo** in the storefront. Replace these with your exact inventory photos through the product editor. Source attribution is not a grant of commercial image rights.

`supabase/catalog-photos.sql` fills only missing photos and preserves product prices/stock. Admin edits to product galleries use hosted HTTPS URLs. Files uploaded through the app can be deleted with the corrected signed Cloudinary API.

## Verification commands

```powershell
npm run check
npm run test:backend:e2e
npm run export
node scripts/check-cloudinary.mjs
npm run backend:sql -- supabase/verify-live.sql
node scripts/check-live-media.mjs
npm run backend:check -- --remote
```

For a previously exported live web bundle, you can avoid rebuilding it for the browser tests:

```powershell
$env:GULMELI_BACKEND_TEST_BUNDLE="dist"
npm run test:backend:e2e
Remove-Item Env:GULMELI_BACKEND_TEST_BUNDLE
```

These browser tests intercept Supabase HTTP and WebSocket connections and use test records. The existing bundle must match your public environment configuration.

Database tests use real PostgreSQL semantics in PGlite and test repeatable setup, permissions, stock changes, stale edits, order cancellation, coupon/shipping totals, and support isolation. Browser service tests mock Supabase responses; they are not a replacement for testing the deployed project on two signed-in devices.

For the physical-phone release, verify: edit a product/photo on one admin device; see it on another customer device; place and cancel a test COD order; send a support message and reply; sign out and sign in as another customer; publish a banner/settings change. Confirm background/resume and a temporary network interruption on a physical phone.

## Boundaries

Supabase and Cloudinary provide hosted data, authentication, server functions and media. Payment processing, actual courier delivery, email/SMS campaigns and push delivery still require their respective provider credentials and implementations. This change does not activate those services. Checkout offers COD, and games/reward counters do not represent money. Customer review notes remain private. Simultaneous unsaved edits to the same customer snapshot still use last-write-wins; admin record conflicts are detected separately. The backend is deployed and its live checks pass. A new installable release and physical-device end-to-end verification remain pending.
