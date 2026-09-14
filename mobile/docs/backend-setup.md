# Supabase + Cloudinary setup

The app uses Supabase for email/password accounts, the product catalog, customer profiles, carts, wishlists, preferences and orders. Cloudinary stores profile photos and serves product images. Supabase runs checkout and the authenticated image upload function, so no VPS is required.

## 1. Fill in the local app configuration

An ignored `.env.local` has been prepared in `mobile/`. Fill it in using `.env.example` as the template:

```dotenv
EXPO_PUBLIC_BACKEND=supabase
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=YOUR_CLOUD_NAME
```

Find the project URL and publishable key in Supabase's project Connect dialog/API settings. A legacy `anon` key also works. Never use a `service_role` or `sb_secret_` key in the app. Expo includes every `EXPO_PUBLIC_` value in downloaded app code.

In `mobile/supabase/.env.local`, enter the **server-only** Cloudinary values from the Cloudinary console:

```dotenv
CLOUDINARY_CLOUD_NAME=YOUR_CLOUD_NAME
CLOUDINARY_API_KEY=YOUR_API_KEY
CLOUDINARY_API_SECRET=YOUR_API_SECRET
```

The cloud name must match in both files. Both `.env.local` files are ignored by Git. No unsigned upload preset is needed. Do not copy the API secret into the public app file.

From `mobile/`, run:

```powershell
npm run backend:check
```

The checker reports missing settings without printing credential values. It does not apply SQL or deploy the function.

## 2. Create the database

In your Supabase project's **SQL Editor**, run the complete contents of each file in `supabase/migrations/` once, in filename order:

- `202609130001_store.sql` — customer tables, checkout functions, upload limits.
- `202609140001_admin_config.sql` — admin membership, shared storefront config, admin catalogue/order access.
- `202609140002_media_sync.sql` — the Cloudinary media index (`media`), the shared admin document store (`admin_data`), first-admin claim, and realtime publication for live sync.

`202609140002` also raises the upload rate limit to 200/hour for dashboard media.

It creates:

- `products`: public reads of active products; writes restricted to store administration.
- `customer_state`: each signed-in customer can read/write only their own profile, cart and preferences. Reviews are private account notes, not public reviews.
- `orders`: customers can read only their own orders. Direct customer inserts/updates are blocked.
- `place_order`: checks the user, delivery details, stock, quantities and voucher on the server. Locks inventory and creates the order in one transaction. Reusing a request ID returns the existing order.
- `cancel_order`: only the owner may cancel an order in `Placed` status. Stock is restored once.
- `media`: URL + metadata index of every file stored in Cloudinary.
- `admin_data`: one row per admin dashboard record; every admin device shares it.
- `reserve_image_upload`: per-account upload limit (200/hour).

**First admin**: the first signed-in user to open `/admin` claims super-admin membership automatically (after that, add rows to `admin_members` in the Table Editor).

To populate the original 30 sample products, review and then run `supabase/seed.sql`. These are **sample prices and stock quantities**: correct them before accepting real orders. Rerunning the seed does not overwrite existing products. `npm run backend:seed` regenerates this file from the bundled catalog.

Alternatively, use the Supabase CLI: `npx supabase login`, `npx supabase link --project-ref YOUR_PROJECT_REF`, then `npx supabase db push`. Linking/pushing may ask for the project's database password. App API keys alone do not grant deployment access.

### Admin dashboard tables

Run `supabase/migrations/202609140001_admin_config.sql` after the first
migration. It creates:

- `admin_members`: who may run the dashboard against this project, and with which role.
- `app_config`: the published storefront configuration. Everyone can read it — the app needs it to render — and only admins can change it.
- `app_config_versions`: a version per publish, so a bad change can be rolled back. Republishing identical content does not add a version.
- `admin_audit`: a server-side record of who changed what, which survives a device being wiped.
- Policies letting admins read every order, progress orders, and manage the catalogue. Deleting a product is reserved for `super_admin`.

Add yourself as an administrator, using the user id from Supabase's
Authentication → Users:

```sql
insert into public.admin_members(user_id, role)
values ('YOUR-AUTH-USER-UUID', 'super_admin');
```

Without a row here the dashboard still runs, but publishing configuration and
catalogue writes are refused by the database.

## 3. Deploy the Cloudinary media functions

From `mobile/`, after authenticating the Supabase CLI:

```powershell
npx supabase secrets set --env-file supabase/.env.local --project-ref YOUR_PROJECT_REF
npx supabase functions deploy upload-image --project-ref YOUR_PROJECT_REF --no-verify-jwt
npx supabase functions deploy cloudinary-media --project-ref YOUR_PROJECT_REF --no-verify-jwt
```

Or with a personal access token from <https://supabase.com/dashboard/account/tokens>:

```powershell
$env:SUPABASE_ACCESS_TOKEN="sbp_..."
npm run backend:deploy
```

Both functions validate the bearer token with `auth.getUser()` before accepting anything. `cloudinary-media` handles the dashboard media library: signed uploads (images, video, PDFs, documents — any file type routed to the right Cloudinary endpoint, 10 MB cap) and admin-only deletions. It applies the database rate limit and signs every Cloudinary request on the server. It does not use a service-role key, and the Cloudinary API secret never reaches the app.

Profile images use `gulmeli/avatars/<user-id>`; dashboard uploads use `gulmeli/media/`. Removing a file from the dashboard deletes the Cloudinary asset too (only for files this app uploaded).

## How sync works

With Supabase configured, the admin dashboard and the customer app share one source of truth:

- **Text/data → Supabase.** Every dashboard record (products, orders, customers, banners, coupons, pages, …) is mirrored to `admin_data`; each device pulls it on load and follows changes over realtime plus a 3-second safety poll. Customer carts, profiles, wishlists and orders live in `customer_state`/`orders` as before.
- **Media → Cloudinary.** All uploaded files live in Cloudinary; `media` (Supabase) is the searchable index of URLs and metadata. Product records store Cloudinary URLs directly.
- **Storefront catalog.** Published admin products are written to the public `products` table (stock changes are merged, never clobbered), and every open customer app reloads it through the realtime subscription.
- **Customer orders** appear on the admin Orders board automatically; status changes made there sync back.

Changes typically land on other devices within about a second over realtime (the poll only covers dropped connections).

## 4. Configure email authentication

Enable the Email provider in Supabase Authentication. Keep email confirmation enabled. Set the Auth Site URL to a page you control: the confirmation email opens that page after confirming, and the customer then returns to the app and signs in with their password. This app does not require a deep-link callback for that flow.

Configure custom SMTP before inviting customers; Supabase's built-in mail service is intended for restricted testing. See [Supabase SMTP setup](https://supabase.com/docs/guides/auth/auth-smtp). Password reset UI and social/phone login are not included in this integration.

## 5. Start and verify

```powershell
npm run backend:check -- --remote
npx expo start --clear
```

Restart Expo after changing `.env.local`. The npm start/export scripts clear the bundle cache so public values from a different test environment cannot be reused. Set the same public variables in your build environment when creating native builds or web exports; changing them later requires a new bundle/build.

Verify with your project:

1. Create an account, confirm its email, and sign in.
2. Edit the profile, choose a small JPEG/PNG/WebP image, and save. Wait for `Account saved`, then reload and check that it is restored.
3. Add a product to the cart, check out with valid delivery details, and verify the order in Supabase's `orders` table and the reduced product stock.
4. Cancel the order and check stock is restored once.
5. Sign out and sign in as another customer; the first customer's profile, cart and orders must not appear.

The connected app never falls back to local order creation on a network error. Customer changes show a save status and a retry button on failure. Signed-in carts are saved with the account; guest carts last for the current app session. Wait for `Account saved` before closing the app. Simultaneous edits on multiple devices use the last saved customer snapshot; order/stock integrity is handled separately in SQL.

## Store administration and current scope

Day-to-day administration happens in the app's own dashboard at `/admin` — see
[docs/admin-dashboard.md](admin-dashboard.md). Supabase's Table Editor remains
available for direct database work.

Upload product photos in Cloudinary's Media Library and paste their HTTPS `secure_url` into `products.image_url`, or add them from the dashboard's media library. The app displays that URL before any bundled sample image. `product_group` controls placement: `home`, `offer`, `choice`, `recommendation` or `unavailable`. Set `active=false` to hide a product. Refresh Account or restart the app to reload catalog changes.

Orders currently use cash on delivery and **Rs. 0 shipping**. `GULMELI10` gives 10% off orders of at least Rs. 500, capped at Rs. 100; this rule is enforced in the SQL function. Adjust the server rule and checkout display together if store terms change. The dashboard's coupon and shipping screens describe the intended rules and drive the storefront, but the authoritative checkout maths stays in `place_order`: change both together. A merchant can progress an order from the dashboard or by updating `orders.document.status` in the Table Editor; customers cannot change it directly.

Support messages remain drafts, reviews remain private, games have no cash value, and automatic visual search, online payments, push notifications and courier tracking are not connected by this setup.

## Development checks

```powershell
npm run check
npm run test:backend:e2e
```

`npm run check` includes SQL migration tests in PGlite (PostgreSQL compiled to WASM), covering access rules, transaction rollback, authoritative totals, duplicate requests, cancellation and upload limits. Browser backend tests build against fake public configuration and intercept service requests; they do not touch your project or replace a real credential-based smoke test.

For the existing offline-preview browser suite, export with `EXPO_PUBLIC_BACKEND=local` and `--clear`, then run `npm run test:e2e`. Keep the normal `.env.local` set to `supabase` for live work.
