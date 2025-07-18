@echo off
echo 🔍 Check and Create Android Platform
echo ================================================================
echo.

echo 📍 Current directory: %CD%
echo.

echo 📂 Current contents:
dir /b
echo.

echo 🔍 Checking for android folder...
if exist "android" (
    echo ✅ Android folder EXISTS
    echo 📂 Contents of android folder:
    dir android /b
) else (
    echo ❌ Android folder does NOT exist
    echo 🔧 This is normal - we need to create it
)

echo.
echo 📋 Checking other required files...
if exist "package.json" echo ✅ package.json found
if exist "src" echo ✅ src folder found  
if exist "index.html" echo ✅ index.html found
if exist "capacitor.config.ts" (
    echo ✅ capacitor.config.ts found
) else (
    echo ⚠️ capacitor.config.ts not found (will be created)
)

echo.
echo 🎯 Ready to create Android platform!
echo.
set /p continue="Press Enter to create Android platform, or Ctrl+C to cancel..."

echo.
echo 📦 Installing dependencies...
npm install

echo 🔨 Building web app...
npm run build

echo 🔧 Initializing Capacitor...
npx cap init "Work Schedule" "com.narayya.workschedule"

echo 📱 Adding Android platform...
npx cap add android

echo 📋 Copying assets...
npx cap copy android
npx cap sync android

echo.
echo 🔍 Verifying android folder was created...
if exist "android" (
    echo ✅ SUCCESS! Android folder created
    echo 📂 Contents:
    dir android /b
    echo.
    echo 🎯 Android platform is ready!
    echo 📱 You can now build your APK in Android Studio
) else (
    echo ❌ FAILED! Android folder was not created
    echo 🔧 Check for errors above
)

echo.
pause