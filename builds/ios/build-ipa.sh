#!/bin/bash
# Build the iOS app for devices on a Mac (Xcode + CocoaPods required).
# Output: ../output/gulmeli-fancy-store (run via TestFlight, Xcode, or Apple Configurator).
set -euo pipefail
cd "$(dirname "$0")/.."        # -> mobile/

echo "[1/4] Installing dependencies..."
npm install

echo "[2/4] Generating the iOS project (expo prebuild)..."
npx expo prebuild --platform ios --no-install

echo "[3/4] Installing pods..."
(cd ios && pod install)

echo "[4/4] Open Xcode to build/run on a device:"
echo "   xed ios"
echo "  Then: signing (your Apple ID) -> destination = your iPhone -> Run."
echo "  For TestFlight: Product > Archive, then Distribute App."
echo "  Or skip all of this and run: eas build -p ios --profile production"
echo "  (uses ../builds/eas.json; copy it into mobile/ first)."
