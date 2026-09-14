---
name: Daraz Nepal Marketplace
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1b1c1c'
  on-surface-variant: '#5b4137'
  inverse-surface: '#303030'
  inverse-on-surface: '#f3f0ef'
  outline: '#8f7065'
  outline-variant: '#e4beb2'
  surface-tint: '#aa3700'
  primary: '#a63600'
  on-primary: '#ffffff'
  primary-container: '#cf4500'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb59b'
  secondary: '#735c00'
  on-secondary: '#ffffff'
  secondary-container: '#fccc19'
  on-secondary-container: '#6e5700'
  tertiary: '#006578'
  on-tertiary: '#ffffff'
  tertiary-container: '#008097'
  on-tertiary-container: '#f9fdff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbcf'
  primary-fixed-dim: '#ffb59b'
  on-primary-fixed: '#380d00'
  on-primary-fixed-variant: '#822800'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#f0c100'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#aeecff'
  tertiary-fixed-dim: '#68d5f1'
  on-tertiary-fixed: '#001f26'
  on-tertiary-fixed-variant: '#004e5d'
  background: '#fcf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e5e2e1'
typography:
  headline-xl:
    fontFamily: Roboto Flex
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-xl-mobile:
    fontFamily: Roboto Flex
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-lg:
    fontFamily: Roboto Flex
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-lg-mobile:
    fontFamily: Roboto Flex
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  headline-md:
    fontFamily: Roboto Flex
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  headline-sm:
    fontFamily: Roboto Flex
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  price-hero:
    fontFamily: Roboto Flex
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  price-card:
    fontFamily: Roboto Flex
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
  price-strikethrough:
    fontFamily: Roboto Flex
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  body-lg:
    fontFamily: Roboto Flex
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Roboto Flex
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Roboto Flex
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Roboto Flex
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
  label-sm:
    fontFamily: Roboto Flex
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
  badge-micro:
    fontFamily: Roboto Flex
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-desktop: 1rem
  margin: 0.75rem
  margin-desktop: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

The design system is structured for a high-velocity, high-density South Asian digital marketplace. It bridges accessibility, trust, and transactional efficiency across an extensive catalog ranging from FMCG to consumer electronics. 

The aesthetic is functional, modern retail commerce characterized by:
- High data density optimized for rapid scanning, category browsing, and price comparisons.
- High-contrast visual triggers (vibrant promotional badges, distinct checkout CTAs, stock urgency tickers).
- A clean, layered architecture where structured white card surfaces float above an off-white, light gray canvas to demarcate distinct vendor, product, and transactional zones.
- Cultural and local grounding built around Nepali Rupee (Rs.) formatting, localized delivery timelines, cash-on-delivery trust markers, and merchant verification indicators.

## Colors

The palette establishes an actionable visual hierarchy calibrated for conversion, promotional clarity, and operational readability:

- **Primary (`#F85606`)**: The core brand orange. Reserved for primary purchase triggers ("Buy Now", "Add to Cart"), active pagination highlights, flash-sale tags, and key promotional banners.
- **Secondary (`#FACA15`)**: A rich golden yellow used strictly for customer review star ratings, official coin rewards, loyalty point markers, and secondary flash-deal accents.
- **Tertiary / Action Blue (`#1A9CB7`)**: A crisp marketplace blue designated for non-destructive transactional links, "Chat with Seller", verified store tags, policy links, and delivery tracking steps.
- **Neutral Primary (`#212121`)**: Deep charcoal black used for item titles, main price figures, critical tabular specifications, and header text.
- **Neutral Secondary (`#757575`)**: Medium gray used for secondary labels, original strike-through prices, sold count metrics, and breadcrumb trails.
- **Surface Canvas (`#EFF0F5`)**: The global page foundation providing subtle separation between product modules and sidebars.
- **Card Surface (`#FFFFFF`)**: Pure white reserved for product containers, review threads, search inputs, and sticky action docks.
- **Border Neutral (`#E0E0E0`)**: Low-contrast boundary lines for modular division without visual clutter.
- **Semantic Success (`#00A65A`) & Alert (`#D32F2F`)**: Dedicated utility colors for free-shipping indicators, return-guarantee ticks, and stock-out alerts.

## Typography

The typography uses Roboto Flex to deliver compact data density, fast tabular rendering, and legibility across dense grid layouts.

- **Currency Rules**: The Nepali Rupee sign (`Rs.`) must precede every price without spaces in catalog badges (`Rs.1,299`) and with a non-breaking space on primary product sheets (`Rs. 1,299`).
- **Strike-Through Formats**: Strike-through pricing strictly relies on `price-strikethrough` set to `#757575` with an aligned horizontal line and immediate proximity to the active discount badge.
- **Product Title Line Clamping**: Product cards in listings are clamped to a strict 2-line limit (`line-clamp: 2`) using `body-md` to maintain uniform horizontal baseline balance across product rows.

## Layout & Spacing

The layout is built on a fixed-width container desktop system scaling to a responsive fluid grid on mobile devices.

- **Desktop Framework**: 12-column grid constrained to a maximum width of `1200px`, centered on the canvas with `margin-desktop` (24px) gutters. The desktop layout divides the main product detail page into a structured multi-column arrangement: 400px fixed image gallery column, fluid primary specification block, and a 320px fixed vendor/delivery rail.
- **Catalog Grids**: Desktop search results and recommendation trays use a 6-column modular card row with `gutter-desktop` (16px). Tablet transitions to 4 columns, and mobile drops to a 2-column card arrangement with `gutter` (12px).
- **Component Compactness**: Core components utilize 8px (`space-sm`) and 12px (`space-md`) paddings to maximize above-the-fold catalog visibility and reduce scroll fatigue.

## Elevation & Depth

Visual hierarchy is maintained via surface-layer contrast rather than deep, floating shadows.

- **Layer 0 (Canvas)**: `#EFF0F5` creates a uniform, low-fatigue base background.
- **Layer 1 (Card & Module Foundation)**: Pure `#FFFFFF` flat surfaces delineated by a 1px solid `#E0E0E0` border. No drop shadows in static state.
- **Layer 2 (Hover / Card Elevation)**: Interactive product cards elevate on cursor hover using an ambient drop shadow: `0 2px 8px rgba(0, 0, 0, 0.08)` accompanied by a border color shift to `#D0D0D0`.
- **Layer 3 (Sticky Menus & Checkout Rails)**: Sticky header navigations, persistent bottom action bars on mobile, and floating chat utilities use `0 2px 12px rgba(0, 0, 0, 0.12)`.
- **Layer 4 (Modals & Lightboxes)**: Product quick-views and gallery zooms utilize a scrim overlay (`rgba(0, 0, 0, 0.6)`) with a focused modal shadow: `0 8px 24px rgba(0, 0, 0, 0.2)`.

## Shapes

The design system implements a subtle rounded shape style (`roundedness: 1`) to balance an efficient enterprise look with modern accessibility.

- **Base Radius (2px to 4px / `0.25rem`)**: Standard for product cards, form inputs, primary CTA buttons, tabular pills, and specification tables.
- **Micro Badges (2px)**: Discount percentage chips, voucher borders, and stock status tags use minimal corner smoothing to ensure text remains sharp inside tight badge heights.
- **Pills / Radii (16px to Full)**: Restricted solely to customer service live-chat floating launchers and quick-filter category pills.

## Components

### Buttons
- **Primary ("Buy Now")**: Solid `#F85606` background, `#FFFFFF` bold text, uppercase tracking, height 44px (desktop) / 40px (mobile), 4px border radius. Hover: `#D94500`.
- **Secondary ("Add to Cart")**: Solid `#FFEEE8` background, `#F85606` border (1px solid), `#F85606` bold text. Hover: `#FDE2D7`.
- **Tertiary ("Chat / Seller Store")**: Ghost button with 1px border `#1A9CB7`, `#1A9CB7` text, and subtle transparent hover state.

### Product Card
- **Structure**: Pure white container, 1px border `#E0E0E0`.
- **Media**: 1:1 square aspect ratio image container with neutral image placeholder fallback.
- **Title**: Two-line clamped `body-md` in `#212121`.
- **Price Block**: Prominent `price-card` in `#F85606`, followed by horizontal layout of original price with strike-through (`#757575`) and a `-XX%` discount chip (`#F85606` text or solid orange badge).
- **Social Proof**: Star ratings in `#FACA15`, followed by a numeric review count and total sold metric in `#757575`.

### Badges & Vouchers
- **Discount Percentage**: Background `#F85606`, text `#FFFFFF`, font `badge-micro`, padding `2px 4px`, rounded `2px`.
- **Store Voucher**: Dashed border `1px dashed #F85606`, background `#FFF5F1`, text `#F85606`, font `label-sm`, with semi-circular notch cutouts on left and right edges.
- **Daraz Verified / Mall Badge**: Solid `#1A9CB7` or deep maroon identifier, white text, placed immediately before or above the product title.

### Input Fields & Controls
- **Search Bar**: 40px height, 2px solid `#F85606` border wrapper containing a clean white input, secondary placeholder `#757575`, and an integrated square primary orange submit button with a white magnifying glass icon.
- **Quantity Selector**: 3-piece connected stepper (minus button, input display, plus button) with 1px solid `#E0E0E0` borders, 32px height, disabled styling on zero floor.

### Seller Info Card
- Compact side-panel card (`#FFFFFF`, border `#E0E0E0`, 16px padding).
- Displays seller name in `headline-sm`, positive seller ratings (percentage scale), on-time shipment rate, and chat response rate with green/orange status icons.
- Two action links: "VISIT STORE" and "CHAT NOW" rendered using action blue `#1A9CB7`.

### Delivery & Services Estimation Panel
- Layered light background (`#FAFAFA`) inside product sheets.
- Outlines delivery location picker with postal code edit action.
- Uses delivery truck icon alongside dynamic timeframe ("Standard Delivery: 2 - 4 Days") and cost breakdown ("Rs. 75").
- Clear badges for "Cash on Delivery Available" and "7 Days Return / Warranty Guarantees".

### Product Image Gallery
- Large main preview box (400x400px on desktop) with hover loupe/zoom capability.
- Horizontal thumbnail track below with 5 visible thumbnail slots (each 60x60px). Active thumbnail highlighted with a 2px solid `#F85606` border.

### Specifications & Reviews Tabs
- Horizontal sticky bar header over product content.
- Tab triggers display 14px uppercase text; active tab exhibits an explicit `#F85606` bottom bar (2px height) and bold weight.
- Tab panels use alternating zebra-striping (`#FFFFFF` and `#F9FAFB`) for dense key-value pairs in specifications.
- Customer reviews display aggregate rating bar charts, user image gallery thumbnails, and verified purchase timestamps.