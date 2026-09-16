# Manage the store from the dashboard

## Branding and colours

1. Sign in with a store admin account and open **Account → Admin dashboard → Appearance**.
2. Choose a palette or enter a six-digit hex colour, such as `#2563eb`.
3. Edit typography, card/button shape, spacing, light/dark/device mode, and header/footer settings.
4. Open **Branding** to change the name, tagline, logos and browser favicon. Upload images from your device to Cloudinary, or use an existing hosted image URL.
5. Review the real storefront preview, then select **Publish now**. Customers continue seeing the published version while you edit the draft.

The app reads shared settings from Supabase, including after restart and foreground/resume. Realtime delivers changes; periodic recovery reads handle a missed connection. Invalid colours and out-of-range sizes are rejected on publication. Text contrast is adjusted automatically for readability.

The separate web dashboard has the same shared branding fields under **Store appearance**. Its configuration is the same document used by the installed app.

## Homepage layout

Use **Homepage Builder** to add, reorder, edit or hide sections. Section edits save directly to the shared store. Use the visibility switch and start/end dates to control when customers see them.

- Product sections support grid, horizontal carousel and list layouts, explicit products, collections and item limits.
- Mobile and desktop visibility can differ; grid columns are set under **Settings → Catalog**.
- Hero/banner sections use uploaded Cloudinary images and product/category or HTTPS link targets.
- Categories, brands, text, blog, social links and video links read their dashboard content.
- Newsletter sections require a button link to your signup service; an unconfigured signup section is hidden.
- Custom HTML is displayed as plain text in the native app. Website-only CSS is a separate advanced setting.

Public content is filtered by the database. Private admin notes are never sent to customers. A public revision signal refreshes layout changes without granting customers access to dashboard records.

## Launcher icon and splash screen

Browser favicons and in-app logos change after publication. Android/iOS launcher icons and native launch artwork are packaged into the installed application and require a new build.

Upload square **App icon** and **Splash-screen logo** images through Cloudinary, publish, then run:

```powershell
npm run branding:prepare
npm run export
```

The branding script downloads the published assets into `assets/branding` and `app.config.ts` selects them for the next native release. The EAS post-install hook also prepares branding. It does not silently replace installed launcher icons on existing devices.

`npm run export` clears Metro's cache and validates the exported Android/iOS/web bundles against the configured Supabase project. This prevents a previous mocked-backend test bundle from being reused as a live build.

## Verification limits

Bundle exports and browser tests do not install an Android APK or iOS app. Before distributing a new native release, test it on actual Android and iOS devices, including two-device updates, keyboard entry, background/resume, offline recovery and photo permissions.

Scheduled configuration publication currently requires the dashboard to remain open; section start/end visibility is evaluated by the hosted database. External payment, courier, newsletter, email and push providers still need their own setup.
