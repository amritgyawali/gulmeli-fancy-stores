# Gulmeli Fancy Stores — website

Vite + React storefront, plus the static policy pages the Google Play listing
links to.

| Page | URL | File |
| --- | --- | --- |
| Storefront | `/` | `src/` |
| Privacy policy | `/privacy` | `public/privacy.html` |
| Account deletion | `/delete-account` | `public/delete-account.html` |
| Terms of use | `/terms` | `public/terms.html` |
| Support / contact | `/support` | `public/support.html` |

The policy pages are plain HTML (no JavaScript), so they load for Google's
reviewers and crawlers even if the backend is down. `vercel.json` serves them
without the `.html` extension.

## Run locally

```powershell
npm install
npm run dev        # http://localhost:5173
npm run build      # output in dist/
```

`.env.production` holds the public Supabase/Cloudinary connection used by
production builds. Create `.env.local` (see `.env.example`) to point local
development somewhere else. Never put secrets in either file — everything in
them is shipped to the browser.

## Deploy to Vercel

The folder deploys as-is; no environment variables need to be set.

**From the dashboard (recommended, redeploys on every push):**

1. vercel.com → *Add New… → Project* → import `amritgyawali/gulmeli-fancy-stores`.
2. Project name: `gulmeli-fancy-stores` (gives
   `https://gulmeli-fancy-stores.vercel.app`, the address the app and the Play
   listing use).
3. **Root Directory: `web`**. Framework, build and output settings come from
   `vercel.json`.
4. Deploy. Under *Settings → Git*, set the production branch to the branch you
   release from.

**From this folder with the CLI:**

```powershell
cd web
npx vercel login
npx vercel link --yes --project gulmeli-fancy-stores
npx vercel --prod
```

After deploying, check that https://gulmeli-fancy-stores.vercel.app/privacy and
https://gulmeli-fancy-stores.vercel.app/delete-account open. If you end up with
a different address, update `mobile/src/services/legal.ts` and the URLs in
`mobile/docs/play-store/README.md`.
