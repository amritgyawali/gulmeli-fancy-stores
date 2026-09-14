@echo off
REM ============================================================
REM Gulmeli Fancy Stores - build the Play Store / sideload .APK
REM Requires: Android Studio (SDK + JDK 17) installed, OR use
REM the cloud route in README.md instead.
REM ============================================================
cd /d "%~dp0\..\mobile"

echo [1/4] Installing dependencies...
call npm install || goto :fail

echo [2/4] Generating the Android project (expo prebuild)...
call npx expo prebuild --platform android --no-install || goto :fail

echo [3/4] Building the release APK...
cd android
if exist local.properties goto :gradle
echo # Created by build-apk.cmd: set ANDROID_HOME or sdk.dir below.
echo sdk.dir=%LOCALAPPDATA%\Android\Sdk> local.properties
:gradle
call gradlew.bat assembleRelease || goto :fail
cd ..

echo [4/4] Copying result...
if not exist "android\app\build\outputs\apk\release\app-release.apk" (
  echo APK not found - check the Gradle errors above.
  goto :fail
)
copy /y "android\app\build\outputs\apk\release\app-release.apk" "%~dp0output\gulmeli-fancy-store.apk" >nul
echo.
echo DONE: builds\output\gulmeli-fancy-store.apk
echo Install on a phone: enable "unknown sources", copy the APK, open it.
echo For Play Store: use builds\output\ or re-run with bundleRelease (see README).
goto :eof

:fail
echo Build failed. See README.md in this folder for the cloud alternative.
exit /b 1
