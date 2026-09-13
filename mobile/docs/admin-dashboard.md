# Admin dashboard

The dashboard is the control centre for the shop. It lives in the same Expo app
as the storefront, at `/admin`, and it is reachable from the gauge icon in the
Account screen header.

Its governing rule: **business-controlled information is data, not code.** A
logo, brand colour, homepage banner, delivery charge, promotional line, product
order, payment method, footer link, policy page or feature switch is changed in
the dashboard and picked up by the customer app without a rebuild.

## Where things live

| Path | What it holds |
| --- | --- |
| `src/admin/core/` | Pure TypeScript: the store, the schema registry, metrics, reports, RBAC, automation, publishing and the configuration document. No React, so it is unit-tested with the repo's `node --test` runner. |
| `src/admin/ui/` | The dashboard's design system: shell, data table, form controls, SVG charts. |
| `src/admin/screens/` | One screen per area, plus the two generic screens that serve most resources. |
| `src/app/admin/` | Expo Router routes. |
| `src/store/StorefrontProvider.tsx` | Serves the published configuration to the customer app. |
| `supabase/migrations/202609140001_admin_config.sql` | Shared configuration table, admin membership, versions and the server-side audit trail. |

## The two moving parts

### 1. Records — `src/admin/core/store.ts`

`AdminStore` is a small document store. Every collection gets the same
behaviour, so no screen has to reimplement it:

- create, read, update, duplicate
- soft delete into a trash, restore, permanent delete, and an age-based cleanup
- a restorable version per save (change history)
- an audit entry per write, with the field-level before and after values
- explicit `sortOrder` control for reordering
- bulk edits under a single audit entry

Persistence is delegated to the caller, so the same store backs the local
adapter today and a server-backed one later.

### 2. Configuration — `src/admin/core/config.ts`

`StorefrontConfig` is one typed document covering theme, dark mode, branding,
contact details, social links, the announcement bar, header, footer, feature
switches, checkout rules, SEO, localisation, the app and website settings, live
chat, invoices, security policy, authentication, personalisation, catalogue
display and every user-facing string.

`src/admin/core/publishing.ts` wraps it in a draft/published pair plus a version
history, which is what makes preview, scheduled publishing and rollback work.
`mergeConfig` accepts a stored document only where it matches the shape of the
defaults, so an old or partly written document can never break the storefront.

`src/admin/core/config-schema.ts` describes the same document as editable field
groups, so the Appearance and Settings screens render themselves from the source
of truth the storefront reads. A unit test asserts that every field in the
schema points at a real path in the document.

## Adding an area

Most screens are generated. To add a new managed entity:

1. Describe it in `src/admin/core/resources/` — fields, list columns, filters,
   searchable fields and which lifecycle features apply.
2. Add it to the registry and, if it needs its own sidebar entry, to
   `NAVIGATION` in `src/admin/core/resources/index.ts`.

It then has a list with search, filters, sorting, pagination, selection, bulk
actions, CSV import and export, trash, and an editor with tabs, validation,
version history and its own audit trail. The schema tests check the new
resource for consistency automatically.

Purpose-built screens (Overview, Orders board, Inventory, Homepage Builder,
Appearance, Analytics, Reports, Finance, Media, Roles, Automation, SEO, Trash,
System, Settings) sit alongside the generic ones.

## Permissions

`src/admin/core/rbac.ts` defines eight roles — super admin, manager, product
manager, order manager, support, marketing, accountant, warehouse — as a grid of
module against action (view, create, edit, delete, export, publish, refund).
Roles are records, so they can be edited or added in the dashboard. The sidebar,
the buttons on each screen and the generic list and editor all consult the same
`can()` check. Users & Roles has a "sign in as" switcher for checking what a
role actually sees.

## Publishing

Appearance and Settings write to the **draft**. The Preview & publishing panel
shows the storefront rendered from the draft next to the published version, and
offers Publish now, Schedule, Discard, and Restore for any earlier version.

Publishing writes the document to `app_config` when Supabase is configured, so
every customer device picks it up; without Supabase it stays on the device,
which is what local preview mode expects. `StorefrontProvider` re-reads the
published document on publish and whenever the app returns to the foreground.

## Data and the backend

| Area | Where it is stored today |
| --- | --- |
| Storefront configuration | `app_config` in Supabase when configured, otherwise this device. Read by every customer. |
| Products and orders | Supabase, with the policies in the admin migration. The dashboard also keeps its own working copy on the device. |
| Everything else the dashboard manages | This device, through the same `AdminStore` contract. |

Run `supabase/migrations/202609140001_admin_config.sql` after the first
migration, then add yourself:

```sql
insert into public.admin_members(user_id, role)
values ('YOUR-AUTH-USER-UUID', 'super_admin');
```

Only rows in `admin_members` can publish configuration, manage the catalogue or
read every order. Deleting a product is reserved for `super_admin`.

## What is deliberately not connected

These are real limits, not oversights — say so rather than assuming they work:

- **Sending** email, SMS and push. Templates, audiences, scheduling and the
  history are all managed here, and the provider keys live under Integrations,
  but no message is dispatched until a provider is wired up.
- **AI features** run on the device with deterministic rules
  (`src/admin/core/assist.ts`): descriptions, SEO titles and meta descriptions,
  alt text, tag suggestions, support replies, review and sales summaries,
  reorder forecasting, fraud signals and the natural-language analytics box.
  `setAssistProvider` is the seam for a hosted model; nothing leaves the device
  until one is configured.
- **Automation** evaluates its rules against live data and applies the actions
  that change records (tagging, VIP, admin notifications). Message delivery
  again waits on a provider, and there is no server-side scheduler.
- **PDF and Excel export.** Reports export as CSV and as a printable page the
  browser can save as a PDF; invoices, packing slips and shipping labels do the
  same.
- **Backups** are a JSON snapshot you copy out of Settings, not a managed
  database backup.
- The **error, webhook and search logs** display what the app records; they are
  not connected to server-side monitoring.

## Verification

```powershell
npm run check      # typecheck, lint, unit and SQL tests
npm run export     # web bundle, including every dashboard route
npm run preview    # serve the export on http://localhost:8082
npm run test:e2e   # storefront and dashboard browser tests
```

`tests/admin-*.test.ts` cover the store, the configuration document, publishing
and rollback, metrics, reports, CSV, permissions, automation, the schema
registry and the SQL policies. `tests/admin.browser.spec.ts` drives the real
build: every screen renders, a product edit and a coupon survive a reload, the
dashboard works at phone width, global search finds records and screens, and an
appearance change published in the dashboard shows up on the storefront.
