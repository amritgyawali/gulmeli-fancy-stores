# Publish Gulmeli Fancy Stores on Google Play — step by step

Follow the parts in order. Tick each box as you go. Everything you need to
copy and paste is in this file.

The code is already prepared: the app has **no online payments** (cash on
delivery only), asks only for Camera, Biometric and Notification permissions,
targets Android 16 (API 36) and has in-app account deletion. Do not change
those things before publishing.

| You will need | Value |
| --- | --- |
| Package name (cannot change later) | `com.gulmeli.fancystore` |
| App name | Gulmeli Fancy Stores |
| Category | Shopping |
| Contact email | amritgyawali999@gmail.com |
| Website | https://gulmeli-fancy-stores.vercel.app |
| Privacy policy | https://gulmeli-fancy-stores.vercel.app/privacy |
| Account deletion page | https://gulmeli-fancy-stores.vercel.app/delete-account |
| Icon | `docs/play-store/icon-512.png` |
| Feature graphic | `docs/play-store/feature-graphic-1024x500.png` |

---

## Part 1 — Before you start (your PC)

- [ ] At least **5 GB free** on drive C:. Builds fail when the disk is full.
- [ ] The website pages above open in a browser.
- [ ] The Supabase project is **active**. Free-tier projects pause after a week
      without visitors, and a paused backend makes the app look broken to
      Google's reviewers. Check at https://supabase.com/dashboard, or run:

```powershell
cd mobile
npm run check
npm run backend:check -- --remote
```

Both commands must finish without errors.

- [ ] If you do not own the Gulmeli Fancy Stores shop yourself, get the shop
      owner's written permission to publish under your developer account
      ("MeritByte"). Without it, Play can treat the app as impersonation.

## Part 2 — Build the app bundle (.aab)

```powershell
cd mobile
git add -A
git commit -m "Play Store release"
npx eas-cli build -p android --profile production
```

- [ ] Wait for the build to finish (10–30 minutes). It prints a link.
- [ ] Open the link and **download the `.aab` file**.
- [ ] Back up the signing key once:
      `npx eas-cli credentials -p android` → *Download credentials*. Keep the
      file somewhere safe (not in git). You need it if you ever leave Expo.

## Part 3 — Finish your Play Console account

On https://play.google.com/console → **Home**, complete everything it asks:

- [ ] Identity verification.
- [ ] Contact email and phone verification.
- [ ] **Android developer verification** (left menu).
- [ ] *Verify access to a physical Android device*: install the **Google Play
      Console** app on your Android phone and sign in with the same account.

## Part 4 — Create the app

**Home → Create app**

- [ ] App name: `Gulmeli Fancy Stores`
- [ ] Default language: English (United States)
- [ ] App or game: **App**
- [ ] Free or paid: **Free**
- [ ] Tick *Developer Program Policies* and *US export laws* → **Create app**

## Part 5 — Test login for Google's reviewers

Reviewers sign in with the store owner account:

- Email: `amritgyawali999@gmail.com`
- Password: the one you set for review (kept out of this file because the
  repository is public).

- [ ] Sign in once in the app and check that the profile has a name, phone
      number and delivery address.
- [ ] Do not change that password while the app is in review.

Sign-up needs no email confirmation (turned off in Supabase on
14 October 2026, because Supabase's built-in mailer does not deliver to
customers). New accounts work immediately, so reviewers can also create their
own customer account.

Staff accounts cannot delete themselves in the app (the store owner closes
them), so the App access note below tells reviewers to test
*Delete account* with a new customer account.

## Part 6 — App content (Policy → App content)

Answer every section until each one shows a green tick.

| Section | What to choose |
| --- | --- |
| Privacy policy | `https://gulmeli-fancy-stores.vercel.app/privacy` |
| App access | **All or some functionality is restricted** → add the test login from Part 5. Instructions: `Browse without signing in. Sign in on the Account tab with the login above to test cart, cash-on-delivery checkout and orders. To test Settings > Delete account, create a new account on the Account tab (sign-up is instant, no email confirmation) and delete that one; the login above is the store owner account and cannot delete itself.` |
| Ads | **No, my app does not contain ads** |
| Advertising ID | **No** |
| Content rating | Start questionnaire → email → category **All other app types** (or *Shopping* if listed). Answer **No** to violence, sexual content, language, drugs, gambling. **Yes** to "users can interact / share user-generated content" (product reviews and customer-care messages). **No** to sharing location. **No** to buying digital goods. |
| Target audience | **18 and over** only |
| News app | **No** |
| Health apps | **My app does not have any health features** |
| Financial features | **My app doesn't provide any financial features** |
| Government app | **No** |
| Data safety | See the table below |

### Data safety

First questions:

- Does your app collect or share user data? **Yes**
- Is all user data encrypted in transit? **Yes**
- Do you provide a way for users to request data deletion? **Yes** →
  URL `https://gulmeli-fancy-stores.vercel.app/delete-account`
- Account creation method: **Username and password** (email + password)

Then tick only these data types. For each one: **Collected = Yes**,
**Shared = No**, **Processed ephemerally = No**.

| Data type | Required or optional | Purposes |
| --- | --- | --- |
| Personal info → Name | Required | App functionality, Account management |
| Personal info → Email address | Required | App functionality, Account management |
| Personal info → User IDs | Required | Account management |
| Personal info → Address | Required | App functionality |
| Personal info → Phone number | Required | App functionality |
| Financial info → Purchase history | Required | App functionality |
| Photos and videos → Photos | Optional | App functionality |
| Messages → Other in-app messages | Optional | App functionality, Customer support |
| App activity → App interactions | Required | App functionality, Personalization |
| App activity → Other user-generated content | Optional | App functionality |
| Device or other IDs | Optional | App functionality |

Do **not** tick: payment info, location, contacts, calendar, SMS, call logs,
files, audio, health, web history, crash logs, diagnostics, advertising ID.
The app collects none of them.

## Part 7 — Internal testing (only you)

**Test and release → Testing → Internal testing**

- [ ] *Testers* tab → create an email list with your own Gmail → save.
- [ ] *Create new release* → **upload the `.aab`** from Part 2.
- [ ] Accept **Play App Signing** when asked.
- [ ] Release name: `1.0.0`. Release notes: `First release.`
- [ ] *Next* → *Save and publish*.
- [ ] Open the tester link on your phone, accept, install from Play.
- [ ] Test it: browse → open a product → add to cart → sign in → place a
      cash-on-delivery order → see it in My orders → cancel it.
- [ ] Take **4–8 phone screenshots** of: home, a product, offers, cart,
      checkout, account. Use these for Part 8. Do not use the old files in
      `screenshots/`; they show demo ratings the real app does not have.

## Part 8 — Store listing (Grow users → Store presence → Main store listing)

- [ ] **App name**: `Gulmeli Fancy Stores`
- [ ] **Short description** (max 80 characters):

```
Shop fashion, electronics & groceries with cash on delivery across Nepal.
```

- [ ] **Full description**:

```
Gulmeli Fancy Stores brings everyday fancy goods to your door with cash on delivery across Nepal.

SHOP EVERYTHING IN ONE PLACE
• Fashion, electronics, groceries, jewellery and lifestyle products
• Search by name or category, filter by price and rating
• Clear prices in rupees, live stock and customer reviews

DEALS EVERY DAY
• Offers page with the biggest savings first
• Vouchers applied at checkout
• Free delivery on larger orders

EASY, SAFE CHECKOUT
• Pay cash on delivery — no card needed
• Prices and stock confirmed by the store when you order
• Track your orders and cancel before they ship

YOUR ACCOUNT, YOUR WAY
• Wishlist and followed stores sync across your devices
• Save your delivery address once
• Optional fingerprint or face unlock
• Order updates by notification

HELP WHEN YOU NEED IT
• Message customer care from the app
• Help centre with quick answers

Your privacy matters: we never sell your data, and you can delete your account at any time from Settings.

Questions? Email amritgyawali999@gmail.com
```

- [ ] **App icon**: upload `icon-512.png`
- [ ] **Feature graphic**: upload `feature-graphic-1024x500.png`
- [ ] **Phone screenshots**: upload the 4–8 you took in Part 7
- [ ] **Store settings**: Category **Shopping**, email
      `amritgyawali999@gmail.com`, website
      `https://gulmeli-fancy-stores.vercel.app`
- [ ] Save.

Listing rules: no "#1", "best", "free download", emojis in the name,
or other apps' names. Screenshots must show the real app.

## Part 9 — Closed testing (required: 12 testers × 14 days)

Personal developer accounts must do this before Google allows production.

- [ ] **Testing → Closed testing → Create track** (or use *Alpha*).
- [ ] *Testers*: add **at least 12 people's Gmail addresses** (friends,
      family, customers). Add 15–20 in case some drop out.
- [ ] *Create new release* → add the same `.aab` (from the library) →
      *Save and publish*.
- [ ] Send everyone the **opt-in link**. Each tester must click *Become a
      tester* and install the app from Play.
- [ ] Keep at least 12 testers opted in for **14 days in a row**. Ask them to
      open the app and try it on several days. Counting restarts if you drop
      below 12.
- [ ] Note any problems they report.

## Part 10 — Apply for production

After 14 days, **Dashboard → Apply for production** becomes available.

- [ ] Answer the questions honestly: how you recruited testers, what they
      tested, what feedback you got and what you changed, and that the app is
      ready.
- [ ] Wait for approval (usually up to 7 days).

## Part 11 — Release to production

- [ ] **Production → Countries/regions** → add **Nepal** (and any country you
      actually deliver to).
- [ ] **Create new release** → add the `.aab` → release notes `First release.`
- [ ] **Publishing overview** → **Send for review**.
- [ ] First review normally takes 1–7 days. You get an email either way.

If it is rejected, the email names the policy. Fix only that, rebuild
(Part 2) and resubmit.

## Rules to keep after launch

- **No online payments.** Every order stays cash on delivery. Adding eSewa,
  Khalti, cards or a wallet later requires updating Data safety and the
  privacy policy before release.
- **No adult, weapon, drug, tobacco/vape or fake-brand products** in the
  catalogue. Use your own product photos where you can; many current photos
  were copied from other websites.
- **Keep the backend running** and the privacy / delete-account pages online.
- **Answer account-deletion emails** within 7 days, as the delete-account page
  promises.
- Keep the target Android version current. Google raises the minimum every
  August; updating Expo usually covers it.

## Releasing an update

1. Change `"version"` in `mobile/app.json` (e.g. `1.0.1`). The build number
   increases automatically.
2. `npx eas-cli build -p android --profile production`
3. Upload the new `.aab` to *Internal testing*, test it, then **Promote
   release → Production**.

JavaScript-only fixes can skip the store:
`npx eas-cli update --branch production --message "Fix ..."`.
Do not use this to add features Google has not reviewed.

More detail: [README.md](README.md) in this folder.
