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

In your Supabase project's **SQL Editor**, run the complete contents of `supabase/migrations/202609130001_store.sql` once. It creates:

- `products`: public reads of active products; writes restricted to store administration.
- `customer_state`: each signed-in customer can read/write only their own profile, cart and preferences. Reviews are private account notes, not public reviews.
- `orders`: customers can read only their own orders. Direct customer inserts/updates are blocked.
- `place_order`: checks the user, delivery details, stock, quantities and voucher on the server. Locks inventory and creates the order in one transaction. Reusing a request ID returns the existing order.
- `cancel_order`: only the owner may cancel an order in `Placed` status. Stock is restored once.
- `reserve_image_upload`: limits each account to 10 upload attempts per hour.

To populate the original 30 sample products, review and then run `supabase/seed.sql`. These are **sample prices and stock quantities**: correct them before accepting real orders. Rerunning the seed does not overwrite existing products. `npm run backend:seed` regenerates this file from the bundled catalog.

Alternatively, use the Supabase CLI: `npx supabase login`, `npx supabase link --project-ref YOUR_PROJECT_REF`, then `npx supabase db push`. Linking/pushing may ask for the project's database password. App API keys alone do not grant deployment access.

## 3. Deploy the Cloudinary upload function

From `mobile/`, after authenticating the Supabase CLI:

```powershell
npx supabase secrets set --env-file supabase/.env.local --project-ref YOUR_PROJECT_REF
npx supabase functions deploy upload-image --project-ref YOUR_PROJECT_REF --no-verify-jwt
```

`--no-verify-jwt` disables the gateway's legacy JWT check. The function itself requires a bearer access token and validates it with `auth.getUser()` before accepting any image. It applies a size limit and the database rate limit, then signs the Cloudinary request on the server. It does not use a service-role key.

Dashboard alternative: add the three Cloudinary values under Edge Function secrets, create `upload-image` using `supabase/functions/upload-image/index.ts`, disable the gateway's legacy JWT verification toggle, and deploy. Keep the authentication checks in the supplied function intact.

Profile images use `gulmeli/avatars/<user-id>` and are overwritten on subsequent uploads. Their delivery URLs are public. Removing a profile photo clears the profile reference; it does not delete the Cloudinary asset.

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

Use Supabase's Table Editor to manage products and view orders. Upload product photos in Cloudinary's Media Library and paste their HTTPS `secure_url` into `products.image_url`. The app displays that URL before any bundled sample image. `product_group` controls placement: `home`, `offer`, `choice`, `recommendation` or `unavailable`. Set `active=false` to hide a product. Refresh Account or restart the app to reload catalog changes.

Orders currently use cash on delivery and **Rs. 0 shipping**. `GULMELI10` gives 10% off orders of at least Rs. 500, capped at Rs. 100; this rule is enforced in the SQL function. Adjust the server rule and checkout display together if store terms change. A merchant can update `orders.document.status` to `Shipped` or `Delivered` in the Table Editor; customers cannot change it directly. There is no dedicated merchant dashboard yet.

Support messages remain drafts, reviews remain private, games have no cash value, and automatic visual search, online payments, push notifications and courier tracking are not connected by this setup.

## Development checks

```powershell
npm run check
npm run test:backend:e2e
```

`npm run check` includes SQL migration tests in PGlite (PostgreSQL compiled to WASM), covering access rules, transaction rollback, authoritative totals, duplicate requests, cancellation and upload limits. Browser backend tests build against fake public configuration and intercept service requests; they do not touch your project or replace a real credential-based smoke test.

For the existing offline-preview browser suite, export with `EXPO_PUBLIC_BACKEND=local` and `--clear`, then run `npm run test:e2e`. Keep the normal `.env.local` set to `supabase` for live work.
