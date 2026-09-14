# Mobile builds — Google Play & App Store

Two folders, two targets:

- `android/` — produces the **APK** (runs directly on phones) and the **AAB** (what Google Play requires).
- `ios/` — produces the **.ipa** (TestFlight / App Store).

The app already reads its Supabase/Cloudinary config from `mobile/.env.local`, and
`builds/eas.json` bakes the same public values into production builds.

## Easiest route (works from this Windows machine, no Android Studio needed): EAS cloud

```powershell
cd ..\mobile
npm install -g eas-cli
eas login                          # free Expo account
eas build-config-name production   # already set in ../builds/eas.json, copied below
# copy the eas.json next to package.json so Expo picks it up:
copy ..\builds\eas.json eas.json
eas build -p android --profile preview    # returns a download link for the APK
eas build -p ios     --profile production # needs an Apple Developer account ($99/yr)
```

- Android cloud build needs no extra setup. EAS signs the APK with a demo key
  (`--profile preview`). For Play Store uploads use
  `eas build -p android --profile production` (AAB, cloud signing via
  `eas credentials`).
- iOS cloud build requires an Apple ID with a developer program membership;
  `eas build -p ios` will generate the signing certs automatically.

## Local Android build (APK on this PC)

Requires **Android Studio** (SDK) and JDK 17. Then:

```powershell
android\build-apk.cmd
```

Output: `builds\output\gulmeli-fancy-store.apk` — copy to any phone and install
(enable "Install unknown apps"). For Google Play instead, run
`gradlew bundleRelease` in `mobile/android/app/...` (the script explains) or use the
EAS command above — Play only accepts **.aab**.

## Local iOS build

A Mac with Xcode is mandatory (no workaround — Apple's toolchain). On a Mac:

```bash
cd mobile
npx expo prebuild --platform ios
cd ios && pod install
xcodebuild -workspace *.xcworkspace -scheme gulmelifancystore \
  -configuration Release -sdk iphoneos -allowProvisioningUpdates \
  CODE_SIGN_STYLE=Automatic build
```
Then Archive in Xcode → Organizer → "Distribute App" (TestFlight or App Store),
or just use `eas build -p ios` from the cloud route above.

## Before going live (checklist)
- `app.json`: set a unique `slug`/`name`, real `icon`, `splash`, and the
  `ios.bundleIdentifier` / `android.package` you own.
- Supabase: enable email provider + your SMTP (signup emails).
- Play Store requires a privacy policy URL; your data lives in Supabase/Cloudinary.
- `GULMELI10` voucher and Rs. 0 shipping are server-enforced rules — adjust SQL if terms change.
- Store credentials: `eas credentials` uploads/creates signing keys; never commit keystore files.
