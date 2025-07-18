@echo off
echo 🚀 Quick Android Setup for C:\project
echo ================================================================
echo.

cd /d "C:\project"

echo ✅ Directory: %CD%
echo.

echo 📦 Installing dependencies...
npm install

echo 🔨 Building web app...
npm run build

echo 📱 Creating Android platform...
npx cap add android

echo 📋 Copying assets...
npx cap copy android
npx cap sync android

echo ✅ Android folder created!
echo 📂 Checking android folder:
if exist "android" (
    echo ✅ SUCCESS - Android folder exists!
    dir android /b
) else (
    echo ❌ Android folder not created
)

echo.
echo 🎯 Opening Android Studio...
npx cap open android

echo.
echo 📋 Next steps in Android Studio:
echo 1. Wait for Gradle sync
echo 2. Build → Build Bundle(s) / APK(s) → Build APK(s)
echo 3. Find APK at: android\app\build\outputs\apk\debug\app-debug.apk
echo.
pause