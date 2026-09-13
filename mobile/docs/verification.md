# Stitch integration report

## Screens and routes

All 10 supplied HTML exports and 24 screenshots were inventoried. The six Account exports represent successive states of one screen; all usable interactions are consolidated in Account. The 14 screenshot-only references show these same screens and their scroll/data states.

| Screen | Route | Source |
| --- | --- | --- |
| Home | `/` | `daraz_app_home_screen` |
| Messages | `/messages` | `daraz_app_messages_screen` |
| Buy More Save More | `/offers` | `daraz_buy_more_save_more_offer_screen` |
| Cart | `/cart` | `daraz_app_cart_screen` |
| Account | `/account` | Account `_1`, `_2`, `_with_swipe_tabs`, `_with_pull_to_refresh`, `_with_shimmer_refresh`, `_with_dynamic_refresh_updates` |

There are five application routes. Expo's generated sitemap and fallback are framework output. No product, checkout, authentication or other replacement screens were designed. Original source files remain unchanged. See [screen inventory](screen-inventory.md) and [source manifest](screen-manifest.json).

## Navigation and interaction

Bottom navigation connects the supplied screens. Home and Account Buy More Save More controls open Offers; its cart summary opens Cart. Account's To Pay action returns to Home. Offers search/category/filter controls operate within its supplied grid. Home feed tabs filter its products.

Account supports all five order summaries, horizontal paging, selected tabs/dots, pull-to-refresh and the supplied shimmer state. Refresh calls an isolated local fixture service and preserves the selected summary. Messages supports local read status and feed filters. Home voucher collection is persistent and idempotent.

Missing destinations retain their original controls and show a brief unavailable alert. No visible back button was supplied; navigation history uses Expo Router. Hardware back and native back gestures still require device testing. The [interaction audit](interaction-audit.md) records each group of controls.

## Shared components and state

Shared components include `BottomNavigation`, `ProductCard`, `ProductVisual`, `StitchImage`, `MessageArtwork`, `AccountShimmer`, `SourceIcon`, `FontIcon`, text, buttons, rows, checkboxes, badges and section titles. Theme tokens preserve the source palette and system font stacks.

The shared typed catalog and cart store connect products across Offers and Cart. Quantity changes, stock limits, individual/group/all selection, selected totals, cart badges and removal update together. AsyncStorage persists cart lines/selection, message read status and collected vouchers. Hydration validates stale or malformed records. Four domain tests cover consolidation, invalid quantities, totals and restoration.

Profile, orders, wishlist count and followed stores are local source fixtures. There is no fabricated login session or wishlist management flow. Voucher entry accepts text, but validation requires a backend contract. Shipping and promotion copy remain source fixtures; production totals need server authority.

## Assets

All 30 image references are bundled locally with source URLs, file hashes and provenance in [asset-manifest.json](asset-manifest.json). Image decoding succeeded for every bundled asset. Original SVGs were extracted; Font Awesome glyphs are packaged locally. The source supplies system font stacks rather than custom font files. CSS illustrations were translated into native Views, gradients and SVGs. Simulated clock/battery rows use the actual native system area, and demo refresh controls use gestures.

## Missing designs

Only destinations referenced by the supplied UI are listed in [missing-designs.md](missing-designs.md): product details; checkout/address/payment; Home search results, visual search and digital goods; wishlist/followed stores/vouchers/settings/profile editing; full orders/tracking/reviews/returns; chats; promotional games/services/campaigns; seller/similar products; support/pickup/payment options; offer menu; and recent history. These destinations were not invented.

## Verification results

| Check | Result | Evidence and scope |
| --- | --- | --- |
| TypeScript | PASS | `npm run typecheck`, strict project checking |
| Lint | PASS | `npm run lint`, application and tests |
| Domain tests | PASS | `npm test`, 4 tests |
| Expo diagnostics | PASS | `npx expo-doctor`, 21/21 checks |
| Navigation audit | PASS | 4 Playwright browser journeys; all supplied routes and tab navigation, Offers search/add, cart selection/quantity/removal/reload persistence, Account tabs/paging/refresh, missing-destination feedback, Messages read persistence, sticky feed tabs |
| Asset audit | PASS | 30 local references decode; 10 original HTML hashes unchanged; browser image checks pass |
| Visual fidelity audit | PASS, browser review | Compared all five screens to the supplied references and HTML rendered at 390 px; reviewed screenshots at 320/390/430 px, lower content, sticky tabs and shimmer; no horizontal page overflow |
| Android/iOS/web export | PASS | `npm run export` produces both native Hermes bundles and static web output |
| Browser runtime errors | PASS | No page or console errors across the 15 route/width combinations |

The visual result is a manual browser comparison, not pixel-diff certification or native-device approval. OS font rendering, safe-area insets, keyboard handling, touch gestures and hardware back must still be checked on Android and iOS. This Windows environment has no configured Android device/emulator, and cannot run the iOS simulator. Native exports validate bundling, not installation or runtime behavior; no signed APK/IPA was produced.

The [asset audit](asset-audit.json) retains the source-integrity results. Generated verification images have been removed from the source tree; `tests/browser.spec.ts` reproduces route/width, sticky-tab and shimmer captures under the ignored `test-results/` directory. Run `npm run export` before `npm run test:e2e` after changing app code. Original visual references remain under `designs/` at the project root.

## Remaining backend and release requirements

Provide catalog/pricing/stock APIs, authenticated profile/session contracts, cart synchronization, voucher validation, shipping calculation, orders/checkout APIs and payment-provider integration. Replace the local account service with the supplied API contract when available. Production credentials are not guessed or stored in this implementation. Authentication needs its missing design and secure credential storage.

Provide approved launcher artwork before a store build. Run the app on both mobile platforms and validate native interactions before release. See [README](../README.md) for development and preview commands.
