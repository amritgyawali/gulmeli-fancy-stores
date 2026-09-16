# Supabase + Cloudinary setup

See the current [live backend setup and verification guide](live-backend-handoff.md).

The app uses the configured Supabase project for authentication, data, admin CRUD, checkout rules, orders and customer support, and Cloudinary for media. No separate VPS is required.

From `mobile/`, sign in with the Supabase account that owns the configured project, then run:

```powershell
npx supabase login --agent no --output-format text
npm run backend:setup
```

The existing app account `amritgyawali999@gmail.com` has store-owner membership. Use the SQL in the linked guide to add another owner. Customers cannot claim admin access by opening the dashboard. After successful remote checks, build and install a new release; the old repository APK does not contain these changes.
