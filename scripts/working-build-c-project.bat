@echo off
echo 🚀 Working Build Script for C:\project
echo ================================================================
echo.

echo 📍 Step 1: Navigating to C:\project...
cd /d "C:\project"

echo ✅ Current directory: %CD%
echo.

echo 📂 Directory contents:
dir /b
echo.

echo 📋 Step 2: Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is NOT installed
    echo 📥 Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
) else (
    echo ✅ Node.js is installed
    node --version
)

echo.
echo 📋 Step 3: Installing dependencies...
if not exist "node_modules" (
    echo 📦 Installing npm dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
) else (
    echo ✅ Dependencies already installed
)

echo.
echo 📋 Step 4: Building web application...
echo 🔨 Running npm run build...
npm run build
if errorlevel 1 (
    echo ❌ Web build failed
    pause
    exit /b 1
)
echo ✅ Web build completed

echo.
echo 📋 Step 5: Setting up Capacitor...
if not exist "capacitor.config.ts" (
    echo 🔧 Initializing Capacitor...
    npx cap init "Work Schedule" "com.narayya.workschedule"
    if errorlevel 1 (
        echo ❌ Capacitor initialization failed
        pause
        exit /b 1
    )
) else (
    echo ✅ Capacitor already configured
)

echo.
echo 📋 Step 6: Adding Android platform...
if not exist "android" (
    echo 📱 Adding Android platform...
    npx cap add android
    if errorlevel 1 (
        echo ❌ Failed to add Android platform
        pause
        exit /b 1
    )
) else (
    echo ✅ Android platform already added
)

echo.
echo 📋 Step 7: Copying assets and syncing...
echo 📋 Copying web assets to Android...
npx cap copy android
if errorlevel 1 (
    echo ❌ Failed to copy assets
    pause
    exit /b 1
)

echo 🔄 Syncing Capacitor...
npx cap sync android
if errorlevel 1 (
    echo ❌ Failed to sync Capacitor
    pause
    exit /b 1
)

echo ✅ All setup completed successfully!
echo.

echo 📋 Step 8: Opening Android Studio...
echo 📱 Opening Android Studio...
npx cap open android

echo.
echo 🎉 Setup completed!
echo.
echo 📱 In Android Studio:
echo 1. Wait for Gradle sync to complete
echo 2. Go to Build → Build Bundle(s) / APK(s) → Build APK(s)
echo 3. Find your APK in: android\app\build\outputs\apk\debug\
echo.
echo 📁 APK will be at: C:\project\android\app\build\outputs\apk\debug\app-debug.apk
echo.
pause