# Gulmeli Fancy Stores mobile app

Expo SDK 57 / React Native shopping app with Supabase accounts, catalog and orders, plus Cloudinary image uploads. An explicit local preview mode is also available.

**Admin dashboard:** [control-centre guide](docs/admin-dashboard.md). Open `/admin` in the app, or tap the gauge icon in the Account header.

**Current integration:** [Live backend setup, verified behavior and deployment status](docs/live-backend-handoff.md). This is the authoritative guide for the Supabase/Cloudinary integration.

**Backend setup:** [Supabase + Cloudinary guide](docs/backend-setup.md). Fill in `.env.local` and `supabase/.env.local`, apply the SQL migration and deploy the upload function. Run `npm run backend:check` to check the settings without printing secrets.

## Run

```powershell
npm install
npm start
```

For an exported browser preview, run `npm run export`, then `npm run preview` and open http://localhost:8082.

## Working flows

- Home campaigns and search open catalog listings with category and price/rating filters.
- Product cards open the matching product with stock information, cart actions, wishlist and reviews.
- Cart supports selection, quantity limits, removal, vouchers and checkout.
- Checkout validates contact/address fields, calculates the local total and creates a saved local order. Order history supports cancellation and buying again.
- Account supports name, profile photo, phone/address, notification preferences, wishlist, followed sellers, actual browsing history and reviews.
- GULMELI10 discounts local orders over Rs. 500 by 10%, capped at Rs. 100. Daily check-in and Candy games work locally; gems have no cash value.
- Help Center has expandable answers; customer care and chat pages save message drafts locally. Affiliate tools open the device share sheet and save invitation notes.
- Photo search opens the camera/library and supports manual category/text filtering using the photo as a reference.
- Missing digital inventory and pickup locations have explicit empty states and useful next actions.

## Admin dashboard

`/admin` is the shop's control centre: orders, products, categories, collections,
inventory, customers, returns, payments, shipping, discounts, marketing, reviews,
support, content, the homepage builder, appearance, notifications, analytics,
reports, finance, suppliers, media, users and roles, integrations, automation,
audit logs, system and settings.

Its rule is that business-controlled information is data, not code. Colours,
logos, wording, menus, banners, homepage sections, delivery charges, payment
methods, policies, SEO and feature switches live in a configuration document the
customer app reads at runtime, so changing them is an admin edit rather than a
release. Edits are made against a draft, previewed, then published — and any
earlier version can be restored. Read [docs/admin-dashboard.md](docs/admin-dashboard.md)
for the architecture, how to add a new managed entity, and what is deliberately
not connected yet.

The root app uses `src/store/ShopProvider.tsx` and AsyncStorage for persistence. `src/store/commerce.ts` validates checkout and restored commerce data. `src/services/navigation.ts` connects existing controls to `src/screens/FeatureScreen.tsx` through the `/feature` route. No unavailable-alert handlers remain.

## Verification

```powershell
npm run check
npm run export
npm run test:e2e
```

Unit tests cover cart bounds, stock changes, checkout validation, voucher math and saved-data validation, plus the dashboard's store, configuration document, publishing and rollback, metrics, reports, CSV handling, permissions, automation, schema registry and SQL policies. Browser tests cover navigation, small phone widths, product-to-order journeys, saved profiles/reviews/wishlists, rewards and support drafts, and every dashboard screen — including publishing an appearance change and seeing it on the storefront. Native exports verify bundling; camera permissions and native share sheets still need physical-device verification.

## Live service connections

With `EXPO_PUBLIC_BACKEND=supabase`, the app loads the shared catalog, authenticates customers, saves their profile/cart/preferences and submits cash-on-delivery orders to Supabase. Checkout verifies prices and stock transactionally on the server. Cloudinary profile uploads use an authenticated Supabase function; its API secret is never part of the app bundle. Product images can use Cloudinary URLs.

With `EXPO_PUBLIC_BACKEND=local` (or no backend configuration in a fresh checkout), the original local preview flows above remain available. Local orders are not sent to a store. The two modes do not share saved customer data.

See the [setup guide](docs/backend-setup.md) for deployment, authentication, product management, tests and remaining feature limits. Real service operation requires your credentials and deployed database/function; no external project has been provisioned by the code alone.

Original Stitch HTML/screenshots remain in `../designs/` as design reference material.
